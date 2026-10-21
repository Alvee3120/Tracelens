# TraceLens

Trace any reference image onto real paper. TraceLens shows your rear camera full screen and
overlays a semi-transparent reference on top, so you follow the ghost lines with a real pencil
while the drawing ends up on paper, not on glass.

No AR libraries, no WebXR, no plane detection — just a live camera `<video>` plus a transformable
image layer. Fully offline and private: **images never leave the device.**

---

## Architecture at a glance

- **Camera** (`components/camera/`) owns the `MediaStream` and every device capability (torch,
  zoom, focus). The stream is torn down on unmount, on route change, and when the tab hides.
- **Overlay** (`components/overlay/`) is a gesture surface plus a transformable image layer. The
  live transform is owned imperatively and written straight to the DOM, so a gesture frame causes
  **zero React renders**; only the commit at gesture end is persisted.
- **Transform math** (`lib/transformMath.ts`) stores the transform in *normalized* coordinates
  (fractions of the viewport) so rotation and resize never drift. All of it is pure and unit tested.
- **Image pipeline** (`lib/edgeDetector.ts` + `workers/edgeDetector.worker.ts`) runs grayscale →
  Gaussian blur → Sobel → threshold → dilation off the main thread, returning tinted line art with
  a transparent background. Buffers are transferred, and results live in a small LRU cache.
- **State** is split: `useSettingsStore` (localStorage, lightweight preferences only) and
  `useTraceStore` (in-memory session). Durable state — images, recent thumbnails, the last session
  — lives in IndexedDB via `idb`.
- **Services** (`lib/wakeLock.ts`, `lib/haptics.ts`, camera hook) sit behind thin interfaces so
  Capacitor plugins can replace the web implementations later without touching call sites.
- **Capability detection** (`lib/capabilities.ts`) is the single source of truth; the UI only ever
  renders controls the device actually supports.
- **Strings** are centralized in `lib/strings.ts` for future localization.

---

## Requirements

- Node.js 20+ (developed on 22)
- npm 10+

## Install and run

```bash
npm install
npm run dev            # http://localhost:5173
```

`localhost` is a secure context, so the camera works immediately in development.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run dev:https` | Dev server over HTTPS with a locally trusted cert (for LAN phone testing) |
| `npm run build` | Typecheck (`tsc -b`) then production build into `dist/` |
| `npm run preview` | Serve `dist/` on http://localhost:4173 |
| `npm run typecheck` | TypeScript only |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run icons` | Regenerate the PWA PNG icon set (zero-dependency script) |

---

## Testing on a real phone

`getUserMedia` requires a **secure context**. `http://192.168.x.x` will not work — you need HTTPS or
a tunnel.

### Option A — vite-plugin-mkcert (recommended, same Wi-Fi)

```bash
npm run dev:https
```

This generates a locally trusted certificate (the first run installs a local CA into your system
trust store). Then open the `https://<your-lan-ip>:5173` URL printed by Vite on the phone.

> The phone must trust the same CA. On Android install `certs/rootCA.pem` under
> *Settings → Security → Encryption & credentials → Install a certificate → CA certificate*.
> On iOS, AirDrop/imail the CA, then *Settings → General → VPN & Device Management* and enable full
> trust under *Settings → General → About → Certificate Trust Settings*.

### Option B — Cloudflare Tunnel (no cert setup)

```bash
npm run dev
npx cloudflared tunnel --url http://localhost:5173
```

Open the printed `https://*.trycloudflare.com` URL on the phone.

### Option C — ngrok

```bash
npm run dev
ngrok http 5173
```

Open the printed `https://*.ngrok-free.app` URL.

### Testing the production build on a phone

```bash
npm run build
npm run preview
npx cloudflared tunnel --url http://localhost:4173
```

---

## Deployment (free HTTPS)

The app is a static SPA; `dist/` is the whole artifact. All three hosts below give HTTPS, which is
what the camera needs.

### Vercel

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

Framework preset **Vite**, build `npm run build`, output `dist`.

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name tracelens
```

Build command `npm run build`, output directory `dist`, and add a SPA fallback rule
(`/* → /index.html`, 200).

> **SPA routing matters:** the service worker's `navigateFallback` handles `/trace` and `/settings`
> offline, but the host must still serve `index.html` for deep links on a cold load.

### Verifying PWA installability

1. Open the deployed URL in Chrome (Android/desktop).
2. DevTools → **Application → Manifest**: name `TraceLens`, `display: standalone`, and icons at
   192/512 in both `any` and `maskable` purposes should be listed with no errors.
3. **Application → Service Workers**: status *activated and is running*.
4. **Application → Cache Storage**: a `workbox-precache-*` cache with the app shell.
5. Install: an install icon appears in the address bar (or the in-app **Install app** button). iOS
   never fires `beforeinstallprompt`, so the app shows manual *Add to Home Screen* steps instead.
6. Lighthouse → PWA installable ✔; Performance/Accessibility should hit the targets below.

---

## Manual QA checklist

### Permission flows
| Case | Expected | Notes |
| --- | --- | --- |
| Allow | Preview starts, capabilities detected | Controls appear only if the track advertises them |
| Deny | Denied card + browser-specific re-enable steps + "Continue without camera" | Chrome: lock icon → Permissions → Camera. iOS: Settings → Safari → Camera |
| Dismiss | "Request dismissed" card, retry works | Chrome reports this as `NotAllowedError`; the message text is inspected to tell it apart from a hard deny |
| No camera | "No camera found" + overlay-only fallback | |
| http:// LAN URL | "Secure connection required" | Never prompts |

**Android Chrome:** tapping the paper focuses it (`focusMode: single-shot` + `pointsOfInterest`
where supported); torch and zoom sliders appear only when `getCapabilities()` reports them.
**iOS Safari:** no torch, no Fullscreen API, no `getCapabilities()` — camera extras are hidden, the
immersive button still hides the chrome, and video playback requires the `muted` + `playsInline`
combination set in a ref before `play()`.

### Gestures
- [ ] One finger drags the overlay; the image tracks the finger, no jump on touch-down.
- [ ] Two-finger pinch scales between 0.1x and 10x; the point between the fingers stays anchored.
- [ ] Two-finger twist rotates; lifting one finger continues as a drag without a jump.
- [ ] Desktop: wheel zooms at the cursor, Shift+wheel rotates.
- [ ] Arrow keys nudge, `+`/`-` scale, `R` resets.
- [ ] Rotating the device keeps the overlay's relative position (normalized transform).

### Overlay and modes
- [ ] Opacity slider 0–100% (default 50%) updates live.
- [ ] Lock: gestures stop, lock icon state is visible, no page scroll/zoom leaks through.
- [ ] Flip H / Flip V / Reset behave independently.
- [ ] Hold-to-hide works with touch **and** mouse, and with Space/Enter held.
- [ ] Original / Outline / Grayscale / Invert all render; Outline shows the processing badge first.
- [ ] Outline on a large photo (≥ 4000px) — no UI freeze; the long side is downscaled to 2048px.
- [ ] Dragging the edge-threshold slider re-processes after ~300 ms and drops stale jobs.

### Camera features
- [ ] Torch toggles and reflects the real track state (when supported).
- [ ] Zoom slider uses the capability min/max/step.
- [ ] Tap-to-focus ring appears at the tap point and the focus point lands where you touched
      (verified against `object-fit: cover` cropping).
- [ ] Focus lock freezes focus; unlocking resumes continuous AF.
- [ ] Switching cameras cycles devices; unplugging a USB camera recovers automatically.
- [ ] Backgrounding the tab releases the camera and the wake lock; returning re-acquires both.

### Rotation, offline, install, low memory
- [ ] Portrait ↔ landscape keeps the overlay where you left it.
- [ ] Airplane mode: reload still renders the app shell (service worker precache).
- [ ] "Update available" banner appears after a new deploy and refreshes on tap.
- [ ] Session restore: reload → the last image, transform, opacity, mode, tint and grid return.
- [ ] Recents keep the last 20 imports, each deletable.
- [ ] Low memory (Android Chrome): after importing ~20 large images, storage stays bounded
      (thumbnails are downscaled, only the active full image is retained) and no leaks appear over a
      long tracing session — object URLs are revoked and bitmaps closed.

### Accessibility
- [ ] Every icon button has an accessible name; focus rings are visible.
- [ ] All touch targets are ≥ 48 px (the audit in this repo checks this).
- [ ] `prefers-reduced-motion` disables the animations.

---

## Known limitations and next steps

**Current limitations**

- iOS Safari exposes no `getCapabilities()`, so torch/zoom/focus controls never appear there.
- iPhone has no Fullscreen API; immersive mode only hides the app chrome.
- The Screen Wake Lock API is unsupported on older iOS — a notice is shown instead.
- Tap-to-focus maps through the preview geometry, so on strongly cropped aspect ratios the focus
  point is approximate.
- Outline mode is a global threshold: very low-contrast photos need a low threshold and pick up
  texture. No adaptive/local thresholding yet.
- A single toast is shown at a time.
- Light theme is implemented through CSS variables plus a translucent-white bridge; a handful of
  decorative accents stay dark-first by design.
- The in-memory outline LRU is per-mount, so the very first outline of a new image is always computed.

**Next steps**

1. **Capacitor APK** — the camera, torch, wake lock, haptics and storage are already behind
   interfaces (`useCamera`, `lib/wakeLock.ts`, `lib/haptics.ts`, `db/db.ts`), so swapping in native
   plugins is additive. This unlocks torch on iOS and background wake locks.
2. **Video capture / time-lapse** of a tracing session via `MediaRecorder`.
3. **Cloud sketch library** (opt-in, explicitly not private-by-default) with community sketches.
4. **Adaptive edge detection** — local (adaptive) thresholding, Canny-style hysteresis, and
   line thinning for cleaner outlines on photos.
5. **Perspective correction** — a 4-point paper-corner calibration so the overlay can be warped to
   match the paper plane, plus optional 4-corner manual alignment.
6. **Multi-page / multi-overlay sessions** and per-image transform presets.
7. **Localization** — strings are already centralized in `lib/strings.ts`; only the language is
   missing.
8. **Drawing progress tracking** — highlight untraced regions to help beginners.

---

## License

Private project. No third-party code is vendored beyond the npm dependencies listed in
`package.json`.
