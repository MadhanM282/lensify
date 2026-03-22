export interface User {
  id: string;
  email: string;
  name: string;
}

export const LENS_COLORS = ['Brown', 'Hazel', 'Grey', 'Green', 'Aqua'] as const;
export type LensColor = (typeof LENS_COLORS)[number];

/** One eye (OD or OS) when stored in a combined record */
export interface EyeLensSide {
  hvid?: string;
  diameter?: string;
  baseCurve?: string;
  k1?: string;
  k2?: string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
  lensType?: 'clear' | 'tint' | 'colored';
  lensColor?: LensColor;
  notes?: string;
}

export type PatientGender = 'male' | 'female' | 'other';

export interface ContactLensDetails {
  id: string;
  patientId: string;
  patientName: string;
  /** Age as entered (e.g. years) */
  age?: string | null;
  gender?: PatientGender | null;
  hvid: string;       // mm - legacy / summary; prefer od/os when present
  diameter: string;   // mm - Soft: HVID+2, Hard: HVID−2
  baseCurve: string;  // Soft: (K1+K2)/2+1, Hard: (K1+K2)/2−1
  power: string;     // e.g. -2.50, +1.25 (primary eye for sorting)
  powerType: 'minus' | 'plus'; // distance vs near
  // Refraction fields (standard Rx)
  // sphere = spherical power, cylinder = cylindrical power, axis = axis in degrees (0-180)
  sphere?: string;
  cylinder?: string;
  axis?: string;
  lensType?: 'clear' | 'tint' | 'colored';
  lensColor?: LensColor;       // Brown, Hazel, Grey, Green, Aqua
  spectaclePower?: string;     // if converted from spectacle
  notes?: string;
  /** Soft vs hard CL fitting — drives DIA / BC formulas */
  fittingType?: 'soft' | 'hard';
  /** Right eye (OD) */
  od?: EyeLensSide;
  /** Left eye (OS) */
  os?: EyeLensSide;
  savedAt?: string;            // ISO timestamp when the lens details were saved
  createdAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}
