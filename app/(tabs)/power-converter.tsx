import {
  convertSpectacleRxToContactUnified,
  formatPower,
  roundToQuarterDiopter,
  SPHERICAL_EQUIVALENT_MAX_ABS_CYL,
  toricContactLensPreferredNote,
} from '@/utils/powerConversion';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RequiredStar } from '@/components/RequiredStar';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PowerConverterScreen() {
  const [sphere, setSphere] = useState('');
  const [cylinder, setCylinder] = useState('');
  const [axis, setAxis] = useState('');
  const [converted, setConverted] = useState<
    | { mode: 'se'; contactSphere: number; seSpectacle: number; cyl: number }
    | { mode: 'toric'; sphere: number; cylinder: number; cyl: number }
    | null
  >(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const parse = (v: string) => (v.trim() === '' ? null : parseFloat(v.replace(',', '.')));

  const handleConvert = () => {
    setError('');
    setConverted(null);
    setHint('');

    const sph = parse(sphere);
    if (sph === null || Number.isNaN(sph)) {
      setError('Please enter a valid sphere value.');
      return;
    }

    const cyl = parse(cylinder);
    if (cyl !== null && Number.isNaN(cyl)) {
      setError('Please enter a valid cylinder value.');
      return;
    }

    const cylNum = cyl ?? 0;
    const result = convertSpectacleRxToContactUnified(sph, cylNum);
    if (!result) {
      setError('Cannot convert. The power value may be too extreme.');
      return;
    }

    const vertexNote =
      'Within ±4.00 D (spectacle or SE): contact power usually matches (no vertex change). Beyond ±4.00 D: vertex formula at 12 mm.';

    if (result.mode === 'spherical_equivalent') {
      setConverted({
        mode: 'se',
        contactSphere: result.contactSphere,
        seSpectacle: result.seSpectacle,
        cyl: cylNum,
      });
      setHint(
        `|Cylinder| ≤ ${SPHERICAL_EQUIVALENT_MAX_ABS_CYL} D: spherical equivalent SE = sphere + ½×cylinder, then vertex on SE.\n\n${vertexNote}`
      );
    } else {
      setConverted({ mode: 'toric', sphere: result.sphere, cylinder: result.cylinder, cyl: cylNum });
      const tNote = toricContactLensPreferredNote(cylNum);
      setHint([tNote, vertexNote].filter(Boolean).join('\n\n'));
    }
  };

  const axisPart = axis.trim() ? ` x ${axis.trim()}` : '';


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>Spectacle → Contact lens power</Text>

          <Text style={[styles.textBlock, { color: c.text }]}>
            Spectacle Rx: Sphere / Cylinder x Axis. If |cylinder| ≤ {SPHERICAL_EQUIVALENT_MAX_ABS_CYL} D, spherical
            equivalent SE = sphere + ½×cylinder is used for a spherical CL; vertex applies to |SE|.
          </Text>
          <Text style={[styles.textBlock, { color: c.text }]}>
            If |cylinder| {'>'} {SPHERICAL_EQUIVALENT_MAX_ABS_CYL} D, toric conversion: each principal meridian uses
            contact = spectacle / (1 − d×spectacle) when |meridian| {'>'} 4 D; d = 0.012 (12 mm).
          </Text>

          <Text style={[styles.label, { color: c.text }]}>
            Sphere <RequiredStar />
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={sphere}
            onChangeText={setSphere}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: c.text }]}>Cylinder</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={cylinder}
            onChangeText={setCylinder}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: c.text }]}>Axis</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={axis}
            onChangeText={setAxis}
            keyboardType="decimal-pad"
          />

          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: c.primary }, pressed && styles.buttonPressed]}
            onPress={handleConvert}
          >
            <Text style={styles.buttonText}>Convert to Contact Lens</Text>
          </Pressable>

          {error ? <Text style={[styles.errorBox, { color: '#dc2626' }]}>{error}</Text> : null}
          {converted ? (
            <View style={[styles.result, { backgroundColor: c.background, borderColor: c.primary }]}>
              <Text style={[styles.resultLabel, { color: c.text }]}>Contact lens power</Text>
              {converted.mode === 'se' ? (
                <>
                  <Text style={[styles.resultValue, { color: c.primary }]}>{formatPower(converted.contactSphere)} D</Text>
                  <Text style={[styles.seSub, { color: c.placeholder }]}>
                    Spherical lens (SE rule). SE spectacle ={' '}
                    {formatPower(roundToQuarterDiopter(converted.seSpectacle))} D
                  </Text>
                </>
              ) : (
                <Text style={[styles.resultValue, { color: c.primary }]}>
                  {formatPower(converted.sphere)} / {formatPower(converted.cylinder)}
                  {axisPart}
                </Text>
              )}
            </View>
          ) : null}
          {hint ? (
            <Text style={[styles.hintText, { color: c.placeholder }]}>{hint}</Text>
          ) : null}
        </View>

        <View style={[styles.rulesCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.ruleLine, { color: c.text }]}>
            Cylinder ≥ 1.00 D: toric contact lens is usually preferred unless the patient accepts blur with a spherical
            lens.
          </Text>
          <Text style={[styles.warning, { color: c.primary }]}>
            Final power should always be confirmed by an eye-care professional.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  textBlock: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
  },
  button: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  result: {
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
  },
  resultLabel: { fontSize: 14, marginBottom: 4 },
  resultValue: { fontSize: 28, fontWeight: '700' },
  seSub: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  hintText: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  errorBox: { fontSize: 14, marginTop: 16, fontWeight: '600' },
  rulesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
  },
  ruleLine: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  warning: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
