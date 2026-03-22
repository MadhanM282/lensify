import { useLensStorage } from '@/context/LensStorageContext';
import { exportLensRecordPdf } from '@/utils/exportLensRecordsPdf';
import { formatPower } from '@/utils/powerConversion';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ContactLensDetails, type EyeLensSide, type PatientGender } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';

function formatGenderLabel(g: PatientGender | string | null | undefined): string | null {
  if (g == null || g === '') return null;
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'other') return 'Other';
  return String(g);
}

/** Matches API fields `age` + `gender` for list display near the name. */
function patientAgeGenderText(item: ContactLensDetails): string | null {
  const parts: string[] = [];
  const g = formatGenderLabel(item.gender);
  if (g) parts.push(g);
  const ageStr = item.age != null ? String(item.age).trim() : '';
  if (ageStr) parts.push(`${ageStr} yrs`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function parseDiopter(s: string | undefined | null): number | null {
  if (s == null || String(s).trim() === '') return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Formatted Rx line e.g. +5.00 / +0.75 × 80° */
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

export default function PatientsScreen() {
  const { records, deleteRecord, refresh, error } = useLensStorage();
  const [refreshing, setRefreshing] = useState(false);
  const [exportingRecordId, setExportingRecordId] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleExportOnePdf = useCallback(async (item: ContactLensDetails) => {
    setExportingRecordId(item.id);
    try {
      await exportLensRecordPdf(item);
    } catch {
      // exportLensRecordPdf → exportLensRecordsPdf already alerts on failure
    } finally {
      setExportingRecordId(null);
    }
  }, []);

  const handleDelete = (item: ContactLensDetails) => {
    Alert.alert(
      'Delete record',
      `Delete lens record for ${item.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecord(item.id);
            } catch {
              Alert.alert('Error', 'Could not delete. Is the server running?');
            }
          },
        },
      ]
    );
  };

  const eyeHasData = (e: EyeLensSide | undefined | null) => {
    if (!e) return false;
    return Object.values(e).some((v) => v != null && String(v).trim() !== '');
  };

  const fmt = (v: string | number | undefined | null, suffix = '') => {
    if (v == null || (typeof v === 'string' && v.trim() === '')) return '—';
    return String(v).trim() + suffix;
  };

  /** One eye: Rx headline + each measurement on its own row */
  const renderEyeSection = (
    title: string,
    e: EyeLensSide | undefined | null,
    accentColor: string
  ) => {
    const has = eyeHasData(e);
    const x = e ?? {};
    const rxLine = rxSummaryLine(e);
    return (
      <View
        style={[
          styles.eyeBlock,
          { borderTopColor: c.border, borderLeftColor: accentColor, backgroundColor: c.background, paddingRight: 12 },
        ]}
      >
        <Text style={[styles.eyeTitle, { color: c.primary }]}>{title}</Text>
        {has ? (
          <Text style={[styles.rxHeadline, { color: c.text }]}>{rxLine}</Text>
        ) : (
          <Text style={[styles.emptyEye, { color: c.placeholder }]}>No values saved for this eye</Text>
        )}
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>HVID</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.hvid, ' mm')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Diameter (DIA)</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.diameter, ' mm')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Base curve (BC)</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.baseCurve)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>K1</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.k1)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>K2</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.k2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Sphere</Text>
          <Text style={[styles.value, { color: c.primary, fontWeight: '600' }]}>
            {parseDiopter(x.sphere) !== null ? `${formatPower(parseDiopter(x.sphere)!)} D` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Cylinder</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {parseDiopter(x.cylinder) !== null ? `${formatPower(parseDiopter(x.cylinder)!)} D` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Axis</Text>
          <Text style={[styles.value, { color: c.text }]}>{fmt(x.axis, '°')}</Text>
        </View>
        {(x.lensType === 'tint' || x.lensType === 'colored') && x.lensColor ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.placeholder }]}>Lens</Text>
            <Text style={[styles.value, { color: c.text }]}>
              {x.lensType === 'tint' ? 'Tint' : 'Colored'} – {x.lensColor}
            </Text>
          </View>
        ) : null}
        {x.notes ? (
          <Text style={[styles.notes, { color: c.placeholder }]} numberOfLines={4}>
            {x.notes}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }: { item: ContactLensDetails }) => {
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
      item.fittingType === 'soft' ||
      item.fittingType === 'hard' ||
      od != null ||
      os != null;

    const odAccent = '#0d9488';
    const osAccent = '#2563eb';
    const ageGenderLine = patientAgeGenderText(item);

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleBlock}>
            <Text style={styles.patientNameRow} numberOfLines={2}>
              <Text style={[styles.patientName, { color: c.text }]}>{item.patientName}</Text>
              {ageGenderLine ? (
                <Text style={[styles.patientNameMeta, { color: c.placeholder }]}>
                  {' · '}
                  {ageGenderLine}
                </Text>
              ) : null}
            </Text>
          </View>
          <View style={styles.cardHeaderActions}>
            <Pressable
              onPress={() => handleExportOnePdf(item)}
              disabled={exportingRecordId === item.id}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Download record as PDF for ${item.patientName}`}
            >
              {exportingRecordId === item.id ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <FontAwesome name="download" size={20} color={c.primary} />
              )}
            </Pressable>
            <Pressable onPress={() => handleDelete(item)} hitSlop={12} accessibilityLabel="Delete record">
              <FontAwesome name="trash-o" size={20} color={c.placeholder} />
            </Pressable>
          </View>
        </View>

        {fittingLabel ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.tint }]}>Lens fitting</Text>
            <Text
              style={[
                styles.value,
                styles.fittingValue,
                { color: c.tabIconSelected, backgroundColor: c.background },
              ]}
            >
              {fittingLabel}
            </Text>
          </View>
        ) : null}

        {showPerEye && (eyeHasData(od) || eyeHasData(os)) ? (
          <View style={[styles.summaryStrip, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.summaryTitle, { color: c.placeholder }]}>Rx summary</Text>
            {eyeHasData(od) ? (
              <Text style={[styles.summaryLine, { color: c.text }]}>
                <Text style={{ fontWeight: '700', color: odAccent }}>OD </Text>
                {rxSummaryLine(od)}
              </Text>
            ) : null}
            {eyeHasData(os) ? (
              <Text style={[styles.summaryLine, { color: c.text }]}>
                <Text style={{ fontWeight: '700', color: osAccent }}>OS </Text>
                {rxSummaryLine(os)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showPerEye ? (
          <View style={styles.eyesWrap}>
            {/* <Text style={[styles.eyesHeading, { color: c.text }]}>By eye (matches API od / os)</Text> */}
            {renderEyeSection('Right eye (OD)', od, odAccent)}
            {renderEyeSection('Left eye (OS)', os, osAccent)}
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, { color: c.placeholder }]}>HVID</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.hvid || '–'} mm</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: c.placeholder }]}>DIA</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.diameter || '–'} mm</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: c.placeholder }]}>BC</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.baseCurve || '–'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: c.placeholder }]}>Rx</Text>
              <Text style={[styles.value, { color: c.primary, fontWeight: '600' }]}>
                {item.sphere ?? item.power} D
                {item.cylinder ? ` / ${item.cylinder} @ ${item.axis ?? ''}` : ''}
              </Text>
            </View>
            {(item.lensType === 'tint' || item.lensType === 'colored') && item.lensColor ? (
              <View style={styles.row}>
                <Text style={[styles.label, { color: c.placeholder }]}>Lens</Text>
                <Text style={[styles.value, { color: c.text }]}>
                  {item.lensType === 'tint' ? 'Tint' : 'Colored'} – {item.lensColor}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {item.spectaclePower ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: c.placeholder }]}>From spectacle</Text>
            <Text style={[styles.value, { color: c.text }]}>{item.spectaclePower} D</Text>
          </View>
        ) : null}
        {item.notes ? (
          <Text style={[styles.notes, { color: c.placeholder }]} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
        {timestamp ? (
          <View style={[styles.row, { paddingTop: 12 }]}>
            <Text style={[styles.label, { color: c.placeholder }]}>Saved on</Text>
            <Text style={[styles.value, { color: c.text }]}>{new Date(timestamp).toLocaleString()}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.placeholder }]}>No lens records yet.</Text>
          <Text style={[styles.emptySub, { color: c.placeholder }]}>Add details from the Lens Details tab.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
}

function inferFittingTypeFromHvidAndDia(hvid: string | undefined, diameter: string | undefined) {
  const h = hvid ? parseFloat(hvid.replace(',', '.')) : NaN;
  const d = diameter ? parseFloat(diameter.replace(',', '.')) : NaN;
  if (!Number.isFinite(h) || !Number.isFinite(d)) return null;

  // We stored diameter with `toFixed(1)`, so small float differences are possible.
  const epsilon = 0.25;
  if (Math.abs(d - (h + 2)) <= epsilon) return 'Soft';
  if (Math.abs(d - (h - 2)) <= epsilon) return 'Hard';
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorBanner: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  patientNameRow: {
    flexShrink: 1,
  },
  patientNameMeta: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 13 },
  value: { fontSize: 14 },
  fittingValue: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 15,
    fontWeight: '700',
  },
  notes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryStrip: {
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryLine: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  eyesWrap: {
    marginTop: 4,
  },
  eyesHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  eyeBlock: {
    marginTop: 10,
    paddingTop: 12,
    paddingLeft: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  eyeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  rxHeadline: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyEye: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: { fontSize: 16 },
  emptySub: { fontSize: 14, marginTop: 8 },
});
