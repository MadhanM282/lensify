/**
 * Spectacle ↔ Contact lens (vertex distance)
 *
 * Contact lens power (D) = Spectacle power (D) / (1 − d × Spectacle power)
 * d = vertex distance in metres; standard 12 mm = 0.012 m
 *
 * Spherical equivalent (low astigmatism): when |cyl| ≤ 0.75 D,
 *   SE = sphere + ½ × cylinder, then vertex rules apply to SE as a single sphere.
 *
 * Base curve from keratometry:
 * Soft: (K1 + K2) / 2 + 1
 * Hard: (K1 + K2) / 2 − 1
 */

export const VERTEX_DISTANCE_MM = 12;
export const VERTEX_DISTANCE_M = 0.012; // 12 mm

/** If |cylinder| ≤ this (D), use spherical equivalent SE = sph + cyl/2 before vertex. */
export const SPHERICAL_EQUIVALENT_MAX_ABS_CYL = 0.75;

/**
 * Spherical equivalent in diopters (spectacle plane).
 * SE = sphere + ½ × cylinder
 */
export function sphericalEquivalentDiopters(sphere: number, cylinder: number): number {
  return sphere + cylinder / 2;
}

export function shouldApplySphericalEquivalentRule(cylinder: number): boolean {
  return Math.abs(cylinder) <= SPHERICAL_EQUIVALENT_MAX_ABS_CYL + 1e-9;
}

/**
 * Clinical note: toric CL usually preferred when astigmatism is ≥ 1.00 D.
 */
export function toricContactLensPreferredNote(cylinder: number): string | null {
  if (Math.abs(cylinder) >= 1.0 - 1e-9) {
    return 'Cylinder ≥ 1.00 D: toric contact lens is usually preferred unless the patient tolerates blur with a spherical lens.';
  }
  return null;
}

export type SpectacleToContactUnifiedResult =
  | {
      mode: 'spherical_equivalent';
      seSpectacle: number;
      contactSphere: number;
    }
  | {
      mode: 'toric';
      sphere: number;
      cylinder: number;
    };

/**
 * Vertex-corrected contact lens power in diopters (full formula for all powers).
 * Always rounds to the nearest 0.25 D step.
 */
export function spectacleToContactLens(spectaclePower: number): number {
  const abs = Math.abs(spectaclePower);
  let contactPower: number;

  if (abs <= 4.0) {
    // Power up to ±4.00: contact power usually matches (no vertex change).
    contactPower = spectaclePower;
  } else {
    // Power above ±4.00: vertex distance correction.
    const denom = 1 - VERTEX_DISTANCE_M * spectaclePower;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return Number.NaN;
    contactPower = spectaclePower / denom;
  }

  // Round to nearest 0.25 D (common lens step)
  return roundToQuarterDiopter(contactPower);
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

/** Nearest 0.25 D step (standard Rx / contact lens granularity). */
export function roundToQuarterDiopter(n: number): number {
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
 *
 * All results are rounded to the nearest 0.25 D step.
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
    sphere: roundToQuarterDiopter(sphereRaw),
    cylinder: roundToQuarterDiopter(cylRaw),
  };
}

/**
 * Convert spectacle Rx to contact-lens power for the UI.
 * - |cyl| ≤ 0.75 D: SE rule + vertex on SE (±4 D rule applies to |SE|).
 * - |cyl| > 0.75 D: full toric vertex on both meridians.
 */
export function convertSpectacleRxToContactUnified(
  sphere: number,
  cylinder: number
): SpectacleToContactUnifiedResult | null {
  if (shouldApplySphericalEquivalentRule(cylinder)) {
    const se = sphericalEquivalentDiopters(sphere, cylinder);
    const contactSphere = spectacleToContactLens(se);
    if (Number.isNaN(contactSphere)) return null;
    return { mode: 'spherical_equivalent', seSpectacle: se, contactSphere };
  }
  const t = convertSpectacleRxToContact(sphere, cylinder);
  if (!t) return null;
  return { mode: 'toric', sphere: t.sphere, cylinder: t.cylinder };
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
