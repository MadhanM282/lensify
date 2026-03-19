import { convertSpectacleRxToContact, formatPower } from '@/utils/powerConversion';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PowerConverterScreen() {
  const [sphere, setSphere] = useState('');
  const [cylinder, setCylinder] = useState('');
  const [axis, setAxis] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const parse = (v: string) => (v.trim() === '' ? null : parseFloat(v.replace(',', '.')));
  const sph = parse(sphere);
  const hasSphere = sph !== null && !Number.isNaN(sph);
  const cyl = parse(cylinder);
  const hasValidCylinder = cyl === null || !Number.isNaN(cyl);
  const converted = hasSphere && hasValidCylinder ? convertSpectacleRxToContact(sph!, cyl ?? 0) : null;
  const conversionFailed = hasSphere && (!hasValidCylinder || !converted);
  const clSphere = converted?.sphere ?? null;
  const clCylinder = converted?.cylinder ?? null;
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
            Spectacle power = Sphere / Cylinder x Axis
          </Text>
          <Text style={[styles.textBlock, { color: c.text }]}>
            Contact lens power = Spectacle power / (1 - d * Spectacle power)
          </Text>
          <Text style={[styles.textBlock, { color: c.text }]}>
            d = vertex distance, standard value is 12 mm = 0.012
          </Text>

          <Text style={[styles.label, { color: c.text }]}>Sphere</Text>
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

          {conversionFailed ? <Text style={[styles.errorBox, { color: '#dc2626' }]}>Cannot convert.</Text> : null}
          {hasSphere && clSphere !== null && clCylinder !== null && !conversionFailed ? (
            <View style={[styles.result, { backgroundColor: c.background, borderColor: c.primary }]}>
              <Text style={[styles.resultLabel, { color: c.text }]}>Contact lens power</Text>
              <Text style={[styles.resultValue, { color: c.primary }]}>
                {formatPower(clSphere)} / {formatPower(clCylinder)}
                {axisPart}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.rulesCard, { backgroundColor: c.card, borderColor: c.border }]}>
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
  result: {
    marginTop: 20,
    borderRadius: 10,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
  },
  resultLabel: { fontSize: 14, marginBottom: 4 },
  resultValue: { fontSize: 28, fontWeight: '700' },
  errorBox: { fontSize: 14, marginTop: 16, fontWeight: '600' },
  rulesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
  },
  warning: { fontSize: 13, fontWeight: '600', marginTop: 14 },
});
