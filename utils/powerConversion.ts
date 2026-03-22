/**
 * Spectacle ↔ Contact lens (vertex distance)
 *
 * Contact lens power (D) = Spectacle power (D) / (1 − d × Spectacle power)
 * d = vertex distance in metres; standard 12 mm = 0.012 m
 *
 * Base curve from keratometry: (K1 + K2) / 2 − 1
 */

export const VERTEX_DISTANCE_MM = 12;
export const VERTEX_DISTANCE_M = 0.012; // 12 mm

/**
 * Vertex-corrected contact lens power in diopters (full formula for all powers).
 */
export function spectacleToContactLens(spectaclePower: number): number {
  const abs = Math.abs(spectaclePower);
  if (abs <= 4.0) {
    // Power up to ±4.00: no change needed.
    return spectaclePower;
  }

  // Power above ±4.00: vertex distance correction.
  const denom = 1 - VERTEX_DISTANCE_M * spectaclePower;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return Number.NaN;

  const fContact = spectaclePower / denom;
  // Round to nearest 0.25 D (common lens step)
  return Math.round(fContact * 4) / 4;
}

export function formatPower(p: number): string {
  if (Number.isNaN(p)) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}`;
}

function vertexNoRound(spectaclePower: number): number {
  const abs = Math.abs(spectaclePower);
  if (abs <= 4.0) return spectaclePower;
  const denom = 1 - VERTEX_DISTANCE_M * spectaclePower;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return Number.NaN;
  return spectaclePower / denom;
}

function roundQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

// Clinical-style sphere rounding used in your screenshot:
// minus -> toward plus (less minus), plus -> toward minus (less plus).
function roundSphereTowardZeroQuarter(n: number): number {
  if (n < 0) return Math.ceil(n * 4) / 4;
  if (n > 0) return Math.floor(n * 4) / 4;
  return 0;
}

/**
 * Convert spectacle Rx (SPH/CYL x Axis) to contact lens Rx by converting
 * both principal meridians with vertex adjustment.
 *
 * Meridian at axis:        M_axis = SPH
 * Meridian perpendicular:  M_perp = SPH + CYL
 *
 * Convert each:
 *   C_axis = convert(M_axis)
 *   C_perp = convert(M_perp)
 *
 * Rebuild contact Rx in same cyl notation:
 *   SPH_cl = C_axis
 *   CYL_cl = C_perp - C_axis
 */
export function convertSpectacleRxToContact(
  sphere: number,
  cylinder: number
): { sphere: number; cylinder: number } | null {
  const cAxis = vertexNoRound(sphere);
  const cPerp = vertexNoRound(sphere + cylinder);
  if (Number.isNaN(cAxis) || Number.isNaN(cPerp)) return null;
  const sphereRaw = cAxis;
  const cylRaw = cPerp - cAxis;
  return {
    sphere: roundSphereTowardZeroQuarter(sphereRaw),
    cylinder: roundQuarter(cylRaw),
  };
}

/** Base curve depends on contact lens fitting type.
 *
 * Hard: DIA = HVID − 2, BC = (K1 + K2) / 2 − 1
 * Soft: DIA = HVID + 2, BC = (K1 + K2) / 2 + 1
 */
export function baseCurveFromK1K2(
  k1: number,
  k2: number,
  fittingType: 'soft' | 'hard' = 'hard'
): number {
  const avg = (k1 + k2) / 2;
  return fittingType === 'soft' ? avg + 1 : avg - 1;
}

/** Diameter (mm) depends on contact lens fitting type. */
export function diameterFromHvidMm(
  hvidMm: number,
  fittingType: 'soft' | 'hard' = 'hard'
): number | null {
  if (!Number.isFinite(hvidMm)) return null;
  return fittingType === 'soft' ? hvidMm + 2 : hvidMm - 2;
}
