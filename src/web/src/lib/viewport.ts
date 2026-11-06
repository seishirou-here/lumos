import { useEffect, useState, type RefObject } from 'react';

/** Viewport shrinkage below this is browser chrome (URL bar), not a keyboard. */
const KEYBOARD_THRESHOLD = 120;

/** Phones dock the composer to the bottom edge; matches Tailwind's `sm` breakpoint. */
export const DOCKED_QUERY = '(max-width: 639.98px)';

export function isDockedViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DOCKED_QUERY).matches;
}

/**
 * Track the mobile virtual keyboard without re-rendering on every frame.
 *
 * - Android (interactive-widget=resizes-content) shrinks the layout viewport,
 *   so docked UI rides above the keyboard natively; we only flag it as open.
 * - iOS overlays the keyboard on the visual viewport instead, so the overlap is
 *   written to `--keyboard-inset` on the target element for CSS to consume.
 */
export function useVirtualKeyboard(targetRef: RefObject<HTMLElement | null>): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const target = targetRef.current;
    if (!viewport || !target) return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    let frame = 0;
    let baselineWidth = window.innerWidth;
    let baselineHeight = window.innerHeight;

    const measure = () => {
      frame = 0;

      // Rotation: start a fresh baseline for the new orientation.
      if (window.innerWidth !== baselineWidth) {
        baselineWidth = window.innerWidth;
        baselineHeight = window.innerHeight;
      }
      baselineHeight = Math.max(baselineHeight, window.innerHeight);

      // Pinch-zoom also shrinks the visual viewport; ignore it.
      const overlap =
        viewport.scale > 1.01 ? 0 : window.innerHeight - viewport.height - viewport.offsetTop;
      const inset = overlap > KEYBOARD_THRESHOLD ? Math.round(overlap) : 0;
      const resized = baselineHeight - window.innerHeight > KEYBOARD_THRESHOLD;

      target.style.setProperty('--keyboard-inset', `${inset}px`);
      setOpen(inset > 0 || resized);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      target.style.removeProperty('--keyboard-inset');
    };
  }, [targetRef]);

  return open;
}
