export interface User {
  id: string;
  email: string;
  name: string;
}

export const LENS_COLORS = ['Brown', 'Hazel', 'Grey', 'Green', 'Aqua'] as const;
export type LensColor = (typeof LENS_COLORS)[number];

export interface ContactLensDetails {
  id: string;
  patientId: string;
  patientName: string;
  hvid: string;       // mm - Horizontal Visible Iris Diameter
  diameter: string;   // mm - DIA (auto: HVID − 2)
  baseCurve: string;  // (K1 + K2) / 2 − 1 when from keratometry
  power: string;     // e.g. -2.50, +1.25
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
  savedAt?: string;            // ISO timestamp when the lens details were saved
  createdAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}
