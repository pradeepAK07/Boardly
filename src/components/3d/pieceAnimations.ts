import { gsap } from 'gsap';
import type { Mesh } from 'three';

/**
 * Animates a piece move with a parabolic arc using GSAP.
 * Returns a promise that resolves when the animation completes.
 */
export function animateMove(
  meshRef: React.RefObject<Mesh | null>,
  from: [number, number, number],
  to: [number, number, number],
  duration = 0.45
): Promise<void> {
  const arcHeight = 0.7;
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    from[1] + arcHeight,
    (from[2] + to[2]) / 2,
  ];

  return new Promise((resolve) => {
    const tl = gsap.timeline();
    tl.to(meshRef.current?.position || { x: 0, y: 0, z: 0 }, {
      x: mid[0],
      y: mid[1],
      z: mid[2],
      duration: duration / 2,
      ease: 'power2.out',
    })
      .to(meshRef.current?.position || { x: 0, y: 0, z: 0 }, {
        x: to[0],
        y: to[1],
        z: to[2],
        duration: duration / 2,
        ease: 'power2.in',
        onComplete: () => resolve(),
      });
  });
}

/**
 * Snaps a piece back to its origin square (illegal move feedback).
 */
export function animateSnapBack(
  meshRef: React.RefObject<Mesh | null>,
  origin: [number, number, number],
  duration = 0.25
): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(meshRef.current?.position || { x: 0, y: 0, z: 0 }, {
      x: origin[0],
      y: origin[1],
      z: origin[2],
      duration,
      ease: 'power2.out',
      onComplete: () => resolve(),
    });
  });
}

/**
 * Animates a captured piece sliding off the board and shrinking.
 */
export function animateCapture(
  meshRef: React.RefObject<Mesh | null>,
  start: [number, number, number],
  duration = 0.4
): Promise<void> {
  const endX = start[0] > 0 ? 6 : -6;
  return new Promise((resolve) => {
    gsap.timeline()
      .to(meshRef.current?.position || { x: 0, y: 0, z: 0 }, {
        x: endX,
        y: 1.5,
        z: start[2],
        duration,
        ease: 'power2.in',
      })
      .to(meshRef.current?.scale || { x: 1, y: 1, z: 1 }, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.2,
        onComplete: () => resolve(),
      });
  });
}