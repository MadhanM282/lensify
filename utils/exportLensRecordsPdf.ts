import { formatPower } from '@/utils/powerConversion';
import type { ContactLensDetails, EyeLensSide, PatientGender } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDiopter(s: string | undefined | null): number | null {
  if (s == null || String(s).trim() === '') return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function rxSummaryLine(e: EyeLensSide | null | undefined): string {
  if (!e) return '—';
  const sph = parseDiopter(e.sphere);
  if (sph === null) return '—';
  let out = formatPower(sph);
  const cyl = parseDiopter(e.cylinder);
  if (cyl !== null && Math.abs(cyl) > 1e-6) out += ` / ${formatPower(cyl)}`;
  const ax = e.axis != null && String(e.axis).trim() !== '' ? String(e.axis).trim() : '';
  if (ax) out += ` × ${ax}°`;
  return out;
}

function inferFittingTypeFromHvidAndDia(hvid: string | undefined, diameter: string | undefined) {
  const h = hvid ? parseFloat(hvid.replace(',', '.')) : NaN;
  const d = diameter ? parseFloat(diameter.replace(',', '.')) : NaN;
  if (!Number.isFinite(h) || !Number.isFinite(d)) return null;
  const epsilon = 0.25;
  if (Math.abs(d - (h + 2)) <= epsilon) return 'Soft';
  if (Math.abs(d - (h - 2)) <= epsilon) return 'Hard';
  return null;
}

function eyeHasData(e: EyeLensSide | undefined | null) {
  if (!e) return false;
  return Object.values(e).some((v) => v != null && String(v).trim() !== '');
}

function fmt(v: string | number | undefined | null, suffix = '') {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return '—';
  return String(v).trim() + suffix;
}

function row(label: string, value: string): string {
  return `<div class="row"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></div>`;
}

function genderPdfLabel(g: PatientGender | string | null | undefined): string {
  if (g == null || g === '') return '';
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'other') return 'Other';
  return String(g);
}

function eyeSectionHtml(title: string, e: EyeLensSide | undefined | null, accent: string): string {
  const has = eyeHasData(e);
  const x = e ?? {};
  const rxLine = rxSummaryLine(e);
  let inner = `<div class="eye-title" style="color:${accent}">${esc(title)}</div>`;
  if (has) {
    inner += `<div class="rx-headline">${esc(rxLine)}</div>`;
  } else {
    inner += `<div class="muted italic">No values saved for this eye</div>`;
  }
  inner += row('HVID', fmt(x.hvid, ' mm'));
  inner += row('Diameter (DIA)', fmt(x.diameter, ' mm'));
  inner += row('Base curve (BC)', fmt(x.baseCurve));
  inner += row('K1', fmt(x.k1));
  inner += row('K2', fmt(x.k2));
  inner += row(
    'Sphere',
    parseDiopter(x.sphere) !== null ? `${formatPower(parseDiopter(x.sphere)!)} D` : '—'
  );
  inner += row(
    'Cylinder',
    parseDiopter(x.cylinder) !== null ? `${formatPower(parseDiopter(x.cylinder)!)} D` : '—'
  );
  inner += row('Axis', fmt(x.axis, '°'));
  if ((x.lensType === 'tint' || x.lensType === 'colored') && x.lensColor) {
    inner += row('Lens', `${x.lensType === 'tint' ? 'Tint' : 'Colored'} – ${x.lensColor}`);
  }
  if (x.notes) {
    inner += `<div class="notes">${esc(x.notes)}</div>`;
  }
  return `<div class="eye-block" style="border-left:4px solid ${accent}">${inner}</div>`;
}

function recordCardHtml(item: ContactLensDetails): string {
  const od = item.od ?? null;
  const os = item.os ?? null;
  const fittingLabel =
    item.fittingType === 'soft'
      ? 'Soft'
      : item.fittingType === 'hard'
        ? 'Hard'
        : inferFittingTypeFromHvidAndDia(item.hvid, item.diameter);
  const timestamp = item.savedAt ?? item.createdAt;
  const showPerEye =
    item.fittingType === 'soft' || item.fittingType === 'hard' || od != null || os != null;

  const odAccent = '#0d9488';
  const osAccent = '#2563eb';

  let body = `<div class="patient-name">${esc(item.patientName)}</div>`;

  if (item.age) {
    body += row('Age', `${item.age} yrs`);
  }
  const gLabel = genderPdfLabel(item.gender);
  if (gLabel) {
    body += row('Gender', gLabel);
  }

  if (fittingLabel) {
    body += row('Lens fitting', fittingLabel);
  }

  if (showPerEye && (eyeHasData(od) || eyeHasData(os))) {
    body += `<div class="summary"><div class="summary-title">Rx summary</div>`;
    if (eyeHasData(od)) {
      body += `<div class="summary-line"><strong style="color:${odAccent}">OD</strong> ${esc(rxSummaryLine(od))}</div>`;
    }
    if (eyeHasData(os)) {
      body += `<div class="summary-line"><strong style="color:${osAccent}">OS</strong> ${esc(rxSummaryLine(os))}</div>`;
    }
    body += `</div>`;
  }

  if (showPerEye) {
    body += eyeSectionHtml('Right eye (OD)', od, odAccent);
    body += eyeSectionHtml('Left eye (OS)', os, osAccent);
  } else {
    body += row('HVID', `${item.hvid || '–'} mm`);
    body += row('DIA', `${item.diameter || '–'} mm`);
    body += row('BC', item.baseCurve || '–');
    body += row(
      'Rx',
      `${item.sphere ?? item.power} D${item.cylinder ? ` / ${item.cylinder} @ ${item.axis ?? ''}` : ''}`
    );
    if ((item.lensType === 'tint' || item.lensType === 'colored') && item.lensColor) {
      body += row('Lens', `${item.lensType === 'tint' ? 'Tint' : 'Colored'} – ${item.lensColor}`);
    }
  }

  if (item.spectaclePower) {
    body += row('From spectacle', `${item.spectaclePower} D`);
  }
  if (item.notes) {
    body += `<div class="notes">${esc(item.notes)}</div>`;
  }
  if (timestamp) {
    body += row('Saved on', new Date(timestamp).toLocaleString());
  }

  return `<div class="card">${body}</div>`;
}

function buildDocumentHtml(records: ContactLensDetails[]): string {
  const generated = new Date().toLocaleString();
  const cards = records.map(recordCardHtml).join('');
  const docTitle =
    records.length === 1
      ? `Lensify — ${esc(records[0].patientName)}`
      : 'Lensify — Lens records';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 24px; font-size: 14px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 4px 0; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #ddd; border-radius: 10px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .patient-name { font-size: 17px; font-weight: 700; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
    .label { color: #666; font-size: 13px; }
    .value { font-size: 14px; text-align: right; }
    .summary { margin: 10px 0 8px 0; padding: 12px; border: 1px solid #e5e5e5; border-radius: 10px; background: #f9fafb; }
    .summary-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 6px; }
    .summary-line { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .eye-block { margin-top: 10px; padding: 12px 12px 4px 12px; border-top: 1px solid #eee; border-radius: 8px; background: #fafafa; }
    .eye-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .rx-headline { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
    .muted { color: #888; }
    .italic { font-style: italic; }
    .notes { font-size: 12px; color: #666; font-style: italic; margin-top: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Lensify — Lens records</h1>
  <div class="meta">Generated ${esc(generated)} · ${records.length} record${records.length === 1 ? '' : 's'}</div>
  ${cards}
</body>
</html>`;
}

/**
 * Exports all lens records: native → PDF file + share sheet; web → print dialog (choose “Save as PDF”).
 */
export async function exportLensRecordsPdf(records: ContactLensDetails[]): Promise<void> {
  if (records.length === 0) {
    Alert.alert('Nothing to export', 'Add lens records first.');
    return;
  }

  const html = buildDocumentHtml(records);

  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) {
      Alert.alert('Popup blocked', 'Allow popups for this site, then try again.');
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save or share PDF',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF ready', 'Sharing is not available on this device. PDF path:\n' + uri);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    Alert.alert('Export failed', message);
    throw e;
  }
}

/** Export a single lens record as PDF (same flow as {@link exportLensRecordsPdf}). */
export async function exportLensRecordPdf(record: ContactLensDetails): Promise<void> {
  await exportLensRecordsPdf([record]);
}
