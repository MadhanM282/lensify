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

type EyeDetails = {
  hvid: string;
  diameter: string;
  k1: string;
  k2: string;
  baseCurve: string;
  sphere: string;
  cylinder: string;
  axis: string;
  lensType: 'clear' | 'tint';
  lensColor: LensColor | '';
  notes: string;
};

export default function LensDetailsScreen() {
  const { addRecord } = useLensStorage();
  const [patientName, setPatientName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [age, setAge] = useState('');
  const [lensType, setLensType] = useState<'soft' | 'hard' | null>(null);
  const [selectedEye, setSelectedEye] = useState<'right' | 'left' | null>(null);
  const [eyeDetails, setEyeDetails] = useState<{ right: EyeDetails; left: EyeDetails }>({
    right: {
      hvid: '',
      diameter: '',
      k1: '',
      k2: '',
      baseCurve: '',
      sphere: '',
      cylinder: '',
      axis: '',
      lensType: 'clear',
      lensColor: '',
      notes: '',
    },
    left: {
      hvid: '',
      diameter: '',
      k1: '',
      k2: '',
      baseCurve: '',
      sphere: '',
      cylinder: '',
      axis: '',
      lensType: 'clear',
      lensColor: '',
      notes: '',
    },
  });
  const [conversionResult, setConversionResult] = useState('');
  const [conversionError, setConversionError] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const currentEyeData = selectedEye ? eyeDetails[selectedEye] : null;

  const updateEyeDetail = <K extends keyof EyeDetails>(key: K, value: EyeDetails[K]) => {
    if (!selectedEye) return;
    setEyeDetails((prev) => ({
      ...prev,
      [selectedEye]: { ...prev[selectedEye], [key]: value },
    }));
  };

  const handleHvidChange = (text: string) => {
    updateEyeDetail('hvid', text);
    const n = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(n)) {
      const dia = diameterFromHvidMm(n);
      updateEyeDetail('diameter', dia !== null ? dia.toFixed(1) : '');
    } else if (text.trim() === '') {
      updateEyeDetail('diameter', '');
    }
  };

  const updateBaseCurveFromK = (a: string, b: string) => {
    const x = parseFloat(a.replace(',', '.'));
    const y = parseFloat(b.replace(',', '.'));
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    const bc = baseCurveFromK1K2(x, y);
    if (Number.isFinite(bc)) updateEyeDetail('baseCurve', Math.round(bc).toFixed(0));
  };

  const handleK1Change = (text: string) => {
    updateEyeDetail('k1', text);
    updateBaseCurveFromK(text, currentEyeData?.k2 || '');
  };

  const handleK2Change = (text: string) => {
    updateEyeDetail('k2', text);
    updateBaseCurveFromK(currentEyeData?.k1 || '', text);
  };

  const handleConvertToContactLens = () => {
    if (!currentEyeData) return;
    setConversionError('');
    setConversionResult('');

    const sph = parseFloat(currentEyeData.sphere.replace(',', '.'));
    if (Number.isNaN(sph)) {
      setConversionError('Enter a valid sphere value.');
      return;
    }
    const cylNum = currentEyeData.cylinder.trim() === '' ? 0 : parseFloat(currentEyeData.cylinder.replace(',', '.'));
    if (Number.isNaN(cylNum)) {
      setConversionError('Enter a valid cylinder value.');
      return;
    }

    const converted = convertSpectacleRxToContact(sph, cylNum);
    if (!converted) {
      setConversionError('Cannot convert.');
      return;
    }

    const axisValue = currentEyeData.axis.trim() === '' ? '0' : currentEyeData.axis.trim();
    setConversionResult(`${formatPower(converted.sphere)} / ${formatPower(converted.cylinder)} x ${axisValue}`);
  };

  const clearForm = () => {
    setPatientName('');
    setGender('');
    setAge('');
    setLensType(null);
    setSelectedEye(null);
    setEyeDetails({
      right: {
        hvid: '',
        diameter: '',
        k1: '',
        k2: '',
        baseCurve: '',
        sphere: '',
        cylinder: '',
        axis: '',
        lensType: 'clear',
        lensColor: '',
        notes: '',
      },
      left: {
        hvid: '',
        diameter: '',
        k1: '',
        k2: '',
        baseCurve: '',
        sphere: '',
        cylinder: '',
        axis: '',
        lensType: 'clear',
        lensColor: '',
        notes: '',
      },
    });
    setConversionResult('');
    setConversionError('');
  };

  const handleSave = async () => {
    const name = patientName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter patient name.');
      return;
    }

    const eyesToSave = [];
    if (eyeDetails.right.sphere.trim()) eyesToSave.push({ eye: 'right', data: eyeDetails.right });
    if (eyeDetails.left.sphere.trim()) eyesToSave.push({ eye: 'left', data: eyeDetails.left });

    if (eyesToSave.length === 0) {
      Alert.alert('Required', 'Please enter spherical power for at least one eye.');
      return;
    }

    try {
      for (const { eye, data } of eyesToSave) {
        const sphereNum = parseFloat(data.sphere.replace(',', '.'));
        if (Number.isNaN(sphereNum)) {
          Alert.alert('Required', `Please enter a valid spherical power for ${eye} eye.`);
          return;
        }
        const computedPowerType: 'minus' | 'plus' = sphereNum < 0 ? 'minus' : 'plus';

        await addRecord({
          patientId: 'p-' + Date.now() + '-' + eye,
          patientName: name + ' (' + (eye === 'right' ? 'R' : 'L') + ')',
          hvid: data.hvid.trim() || '',
          diameter: data.diameter.trim() || '',
          baseCurve: data.baseCurve.trim() || '',
          power: data.sphere.trim(),
          powerType: computedPowerType,
          sphere: data.sphere.trim(),
          cylinder: data.cylinder.trim() || undefined,
          axis: data.axis.trim() || undefined,
          lensType: data.lensType === 'clear' ? undefined : data.lensType,
          lensColor: data.lensColor || undefined,
          notes: data.notes.trim() || undefined,
          savedAt: new Date().toISOString(),
        });
      }
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

          <Text style={[styles.label, { color: c.text }]}>Gender</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: gender === 'male' ? c.primary : c.background },
              ]}
              onPress={() => setGender('male')}
            >
              <Text style={[styles.optionText, { color: gender === 'male' ? '#fff' : c.text }]}>Male</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: gender === 'female' ? c.primary : c.background },
              ]}
              onPress={() => setGender('female')}
            >
              <Text style={[styles.optionText, { color: gender === 'female' ? '#fff' : c.text }]}>Female</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: gender === 'other' ? c.primary : c.background },
              ]}
              onPress={() => setGender('other')}
            >
              <Text style={[styles.optionText, { color: gender === 'other' ? '#fff' : c.text }]}>Other</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: c.text }]}>Age</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter age"
            placeholderTextColor={c.placeholder}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, { color: c.text }]}>Lens type *</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: lensType === 'soft' ? c.primary : c.background },
              ]}
              onPress={() => setLensType('soft')}
            >
              <Text style={[styles.optionText, { color: lensType === 'soft' ? '#fff' : c.text }]}>Soft</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: lensType === 'hard' ? c.primary : c.background },
              ]}
              onPress={() => setLensType('hard')}
            >
              <Text style={[styles.optionText, { color: lensType === 'hard' ? '#fff' : c.text }]}>Hard</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: c.text }]}>Eye *</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: selectedEye === 'right' ? c.primary : c.background },
              ]}
              onPress={() => setSelectedEye('right')}
            >
              <Text style={[styles.optionText, { color: selectedEye === 'right' ? '#fff' : c.text }]}>Right Eye (OD)</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: selectedEye === 'left' ? c.primary : c.background },
              ]}
              onPress={() => setSelectedEye('left')}
            >
              <Text style={[styles.optionText, { color: selectedEye === 'left' ? '#fff' : c.text }]}>Left Eye (OS)</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: c.text }]}>HVID</Text>
          <TextInput
            key={`hvid-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter HVID"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].hvid : ''}
            onChangeText={(text) => {
              if (!selectedEye) {
                Alert.alert('Required', 'Please select Right Eye (OD) or Left Eye (OS) first.');
                return;
              }
              handleHvidChange(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Diameter</Text>
          <TextInput
            key={`diameter-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Auto-calculated from HVID"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].diameter : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('diameter', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>K1</Text>
          <TextInput
            key={`k1-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter K1"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].k1 : ''}
            onChangeText={(text) => {
              if (selectedEye) handleK1Change(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>K2</Text>
          <TextInput
            key={`k2-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter K2"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].k2 : ''}
            onChangeText={(text) => {
              if (selectedEye) handleK2Change(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Base curve</Text>
          <TextInput
            key={`baseCurve-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Auto-calculated from K1 & K2"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].baseCurve : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('baseCurve', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Lens type</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: selectedEye && eyeDetails[selectedEye].lensType === 'clear' ? c.primary : c.background },
              ]}
              onPress={() => { if (selectedEye) { updateEyeDetail('lensType', 'clear'); updateEyeDetail('lensColor', ''); } }}
            >
              <Text style={[styles.optionText, { color: selectedEye && eyeDetails[selectedEye].lensType === 'clear' ? '#fff' : c.text }]}>Clear</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: selectedEye && eyeDetails[selectedEye].lensType === 'tint' ? c.primary : c.background },
              ]}
              onPress={() => { if (selectedEye) updateEyeDetail('lensType', 'tint'); }}
            >
              <Text style={[styles.optionText, { color: selectedEye && eyeDetails[selectedEye].lensType === 'tint' ? '#fff' : c.text }]}>Tint</Text>
            </Pressable>
          </View>

          {selectedEye && eyeDetails[selectedEye].lensType === 'tint' && (
            <>
              <Text style={[styles.label, { color: c.text }]}>Color</Text>
              <View style={styles.colorRow}>
                {LENS_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { borderColor: c.border, backgroundColor: eyeDetails[selectedEye].lensColor === color ? c.primary : c.background },
                    ]}
                    onPress={() => updateEyeDetail('lensColor', color)}
                  >
                    <Text style={[styles.colorOptionText, { color: eyeDetails[selectedEye].lensColor === color ? '#fff' : c.text }]}>
                      {color}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.label, { color: c.text }]}>Spherical (sphere) *</Text>
          <TextInput
            key={`sphere-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter sphere value"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].sphere : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('sphere', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Cylindrical (cyl)</Text>
          <TextInput
            key={`cylinder-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter cylinder value"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].cylinder : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('cylinder', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Axis</Text>
          <TextInput
            key={`axis-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter axis (0-180)"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].axis : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('axis', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
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
            key={`notes-${selectedEye}`}
            style={[styles.input, styles.notesInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter any additional notes"
            placeholderTextColor={c.placeholder}
            value={selectedEye ? eyeDetails[selectedEye].notes : ''}
            onChangeText={(text) => {
              if (selectedEye) updateEyeDetail('notes', text);
            }}
            multiline
            editable={true}
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
