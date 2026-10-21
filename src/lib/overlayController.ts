/**
 * Imperative controller for the overlay transform.
 *
 * Gesture frames must never trigger a React render, so the live transform is
 * owned by the overlay component and published here as a set of commands.
 * Buttons and keyboard shortcuts call these commands instead of dispatching
 * store updates.
 */
import type { Transform } from '@/lib/transformMath';

export interface OverlayController {
  /** Re-center, reset rotation, and scale to fit the viewport. */
  reset(): void;
  /** Move by a normalized delta (fractions of the viewport). */
  nudge(dx: number, dy: number): void;
  /** Multiply the current scale, anchored at the viewport center. */
  zoomBy(factor: number): void;
  /** Rotate by a number of degrees, anchored at the viewport center. */
  rotateBy(degrees: number): void;
  getTransform(): Transform;
  setTransform(transform: Transform): void;
}

let controller: OverlayController | null = null;

export function registerOverlayController(next: OverlayController | null): void {
  controller = next;
}

export function getOverlayController(): OverlayController | null {
  return controller;
}
