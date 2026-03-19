import { useLensStorage } from '@/context/LensStorageContext';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { LENS_COLORS, type LensColor } from '@/types';
import {
  baseCurveFromK1K2,
  convertSpectacleRxToContact,
  diameterFromHvidMm,
  formatPower,
  VERTEX_DISTANCE_M,
} from '@/utils/powerConversion';

export default function LensDetailsScreen() {
  const { addRecord } = useLensStorage();
  const [patientName, setPatientName] = useState('');
  const [hvid, setHvid] = useState('');
  const [diameter, setDiameter] = useState('');
  const [k1, setK1] = useState('');
  const [k2, setK2] = useState('');
  const [baseCurve, setBaseCurve] = useState('');
  const [sphere, setSphere] = useState('');
  const [cylinder, setCylinder] = useState('');
  const [axis, setAxis] = useState('');
  const [conversionResult, setConversionResult] = useState('');
  const [conversionError, setConversionError] = useState('');
  const [lensType, setLensType] = useState<'clear' | 'tint'>('clear');
  const [lensColor, setLensColor] = useState<LensColor | ''>('');
  const [notes, setNotes] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const handleHvidChange = (text: string) => {
    setHvid(text);
    const n = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(n)) {
      const dia = diameterFromHvidMm(n);
      setDiameter(dia !== null ? dia.toFixed(1) : '');
    } else if (text.trim() === '') {
      setDiameter('');
    }
  };

  const updateBaseCurveFromK = (a: string, b: string) => {
    const x = parseFloat(a.replace(',', '.'));
    const y = parseFloat(b.replace(',', '.'));
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    const bc = baseCurveFromK1K2(x, y);
    // Your protocol expects (K1+K2)/2 - 1 then rounded to nearest whole.
    if (Number.isFinite(bc)) setBaseCurve(Math.round(bc).toFixed(0));
  };

  const handleK1Change = (text: string) => {
    setK1(text);
    updateBaseCurveFromK(text, k2);
  };

  const handleK2Change = (text: string) => {
    setK2(text);
    updateBaseCurveFromK(k1, text);
  };

  const handleConvertToContactLens = () => {
    setConversionError('');
    setConversionResult('');

    const sph = parseFloat(sphere.replace(',', '.'));
    if (Number.isNaN(sph)) {
      setConversionError('Enter a valid sphere value.');
      return;
    }
    const cylNum = cylinder.trim() === '' ? 0 : parseFloat(cylinder.replace(',', '.'));
    if (Number.isNaN(cylNum)) {
      setConversionError('Enter a valid cylinder value.');
      return;
    }

    const converted = convertSpectacleRxToContact(sph, cylNum);
    if (!converted) {
      setConversionError('Cannot convert.');
      return;
    }

    const axisValue = axis.trim() === '' ? '0' : axis.trim();
    setConversionResult(`${formatPower(converted.sphere)} / ${formatPower(converted.cylinder)} x ${axisValue}`);
  };

  const clearForm = () => {
    setPatientName('');
    setHvid('');
    setDiameter('');
    setK1('');
    setK2('');
    setBaseCurve('');
    setSphere('');
    setCylinder('');
    setAxis('');
    setConversionResult('');
    setConversionError('');
    setLensType('clear');
    setLensColor('');
    setNotes('');
  };

  const handleSave = async () => {
    const name = patientName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter patient name.');
      return;
    }
    if (!sphere.trim()) {
      Alert.alert('Required', 'Please enter spherical power.');
      return;
    }

    const sphereNum = parseFloat(sphere.replace(',', '.'));
    if (Number.isNaN(sphereNum)) {
      Alert.alert('Required', 'Please enter a valid spherical power.');
      return;
    }
    const computedPowerType: 'minus' | 'plus' = sphereNum < 0 ? 'minus' : 'plus';

    try {
      await addRecord({
        patientId: 'p-' + Date.now(),
        patientName: name,
        hvid: hvid.trim() || '',
        diameter: diameter.trim() || '',
        baseCurve: baseCurve.trim() || '',
        power: sphere.trim(), // backend compatibility
        powerType: computedPowerType, // backend compatibility
        sphere: sphere.trim(),
        cylinder: cylinder.trim() || undefined,
        axis: axis.trim() || undefined,
        lensType: lensType === 'clear' ? undefined : lensType,
        lensColor: lensColor || undefined,
        notes: notes.trim() || undefined,
      });
      clearForm();
      Alert.alert('Saved', 'Contact lens details have been saved.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save. Is the server running?');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Contact lens details</Text>

          <Text style={[styles.label, { color: c.text }]}>Patient name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={patientName}
            onChangeText={setPatientName}
          />

          <Text style={[styles.label, { color: c.text }]}>HVID</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={hvid}
            onChangeText={handleHvidChange}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: c.text }]}>Diameter</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={diameter}
            onChangeText={setDiameter}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: c.text }]}>K1</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={k1}
            onChangeText={handleK1Change}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: c.text }]}>K2</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={k2}
            onChangeText={handleK2Change}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, { color: c.text }]}>Base curve</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={baseCurve}
            onChangeText={setBaseCurve}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: c.text }]}>Lens type</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: lensType === 'clear' ? c.primary : c.background },
              ]}
              onPress={() => { setLensType('clear'); setLensColor(''); }}
            >
              <Text style={[styles.optionText, { color: lensType === 'clear' ? '#fff' : c.text }]}>Clear</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: lensType === 'tint' ? c.primary : c.background },
              ]}
              onPress={() => setLensType('tint')}
            >
              <Text style={[styles.optionText, { color: lensType === 'tint' ? '#fff' : c.text }]}>Tint</Text>
            </Pressable>
          </View>

          {lensType === 'tint' && (
            <>
              <Text style={[styles.label, { color: c.text }]}>Color</Text>
              <View style={styles.colorRow}>
                {LENS_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { borderColor: c.border, backgroundColor: lensColor === color ? c.primary : c.background },
                    ]}
                    onPress={() => setLensColor(color)}
                  >
                    <Text style={[styles.colorOptionText, { color: lensColor === color ? '#fff' : c.text }]}>
                      {color}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.label, { color: c.text }]}>Spherical (sphere) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={sphere}
            onChangeText={setSphere}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: c.text }]}>Cylindrical (cyl)</Text>
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

          <View style={styles.convertRow}>
            <Pressable
              style={({ pressed }) => [
                styles.convertButton,
                { backgroundColor: c.primary },
                pressed && styles.buttonPressed,
              ]}
              onPress={handleConvertToContactLens}
            >
              <Text style={styles.convertButtonText}>Convert</Text>
            </Pressable>
            {conversionResult ? (
              <Text
                style={[styles.conversionInlineResult, { color: c.primary }]}
              >
                {conversionResult}
              </Text>
            ) : null}
          </View>
          {conversionError ? <Text style={[styles.conversionError, { color: '#dc2626' }]}>{conversionError}</Text> : null}

          <Text style={[styles.conversionNote, { color: c.placeholder }]}>Minus (−): distance vision, Plus (+): near vision.</Text>
          <Text style={[styles.conversionNote, { color: c.placeholder }]}>Up to ±4.00: no change. Above ±4.00: vertex correction (d = 0.012).</Text>

          <Text style={[styles.label, { color: c.text }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder=""
            placeholderTextColor={c.placeholder}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: c.primary }, pressed && styles.buttonPressed]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Save lens details</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  optionSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  optionText: { fontSize: 13, fontWeight: '500' },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  colorOptionText: { fontSize: 13, fontWeight: '500' },
  button: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  convertRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  convertButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  convertButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  conversionInlineResult: { fontSize: 16, fontWeight: '700', flex: 1, flexWrap: 'wrap' },
  conversionError: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  conversionNote: { marginTop: 6, fontSize: 12 },
});
