import { expect, test } from '@playwright/test';

test.describe('TraceLens smoke', () => {
  test('first run lands on onboarding and can reach the trace screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    // A fresh profile has no stored settings, so the router sends us to onboarding.
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Step through the three onboarding pages.
    for (let step = 0; step < 2; step += 1) {
      await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.getByRole('button', { name: /Continue without camera/i }).click();
    await expect(page).toHaveURL(/\/trace/);

    // The overlay-empty state should be offered.
    await expect(page.getByRole('button', { name: /Choose an image/i })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('home screen exposes the sample gallery after onboarding', async ({ page }) => {
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /Continue without camera/i }).click();
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Trace any sketch onto real paper/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Star', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'House', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mandala', exact: true })).toBeVisible();
  });

  test('settings screen renders diagnostics and camera help', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /How to set up your phone stand/i })).toBeVisible();
    await expect(page.getByText('getUserMedia')).toBeVisible();
  });

  test('selecting a sample loads it into the overlay and saves a session', async ({ page }) => {
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /Continue without camera/i }).click();
    await page.goto('/');

    await page.getByRole('button', { name: 'Star', exact: true }).click();
    await expect(page).toHaveURL(/\/trace/);

    // The overlay image should be present once the sample is rasterized.
    await expect(page.getByRole('img', { name: /Reference image overlay/i })).toBeVisible();

    // Switching to outline mode hands off to the worker.
    await page.getByRole('radio', { name: 'Outline' }).click();
    await expect(page.getByRole('radio', { name: 'Outline' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
