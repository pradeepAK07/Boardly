import { PerspectiveCamera, Vector3 } from 'three';

/**
 * Fixed camera side: negative z looking toward +z. Together with boardMath this
 * puts White (ranks 1-2) at the bottom of the screen and the a-file on the
 * left. Flipping rotates the board group, never the camera, so the horizon
 * stays stable and the camera can never end up below the table.
 */
export const CAMERA_ELEVATION = (60 * Math.PI) / 180;

/** World-space box that has to fit in the board column: the table + the pieces. */
const HALF_TABLE = 5.2;
const LOWEST_Y = -1.3;
const HIGHEST_Y = 1.0;
const MARGIN = 0.94;

const FIT_CORNERS: Array<[number, number, number]> = [];
for (const x of [-HALF_TABLE, HALF_TABLE]) {
  for (const y of [LOWEST_Y, HIGHEST_Y]) {
    for (const z of [-HALF_TABLE, HALF_TABLE]) {
      FIT_CORNERS.push([x, y, z]);
    }
  }
}

// Captured-piece shelf on the left edge of the table, outside the main
// footprint, has to stay inside the frame too.
for (const y of [-0.9, 0.3]) {
  for (const z of [-2.35, 2.35]) {
    FIT_CORNERS.push([6.55, y, z]);
  }
}

/**
 * Smallest camera distance at which the whole table still fits the viewport.
 *
 * Projecting the table's corners is more accurate than fitting a fixed world
 * span, because at a low elevation the table is heavily foreshortened and a
 * fixed span either wastes half the column or clips the near corners.
 */
export function fitCameraDistance(
  aspect: number,
  elevation: number = CAMERA_ELEVATION,
  fov = 45,
): number {
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 200);
  const corners = FIT_CORNERS.map(([x, y, z]) => new Vector3(x, y, z));

  const fits = (distance: number) => {
    camera.position.set(
      0,
      distance * Math.sin(elevation),
      -distance * Math.cos(elevation),
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    for (const corner of corners) {
      const p = corner.clone().project(camera);
      if (Math.abs(p.x) > MARGIN || Math.abs(p.y) > MARGIN) return false;
    }
    return true;
  };

  let lo = 4;
  let hi = 120;
  if (!fits(hi)) return hi;

  // 40 iterations is far below float precision at this scale but keeps the
  // helper cheap if it is ever called per frame.
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
