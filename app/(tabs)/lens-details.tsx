import { RequiredStar } from '@/components/RequiredStar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useLensStorage } from '@/context/LensStorageContext';
import { LENS_COLORS, type EyeLensSide, type LensColor, type PatientGender } from '@/types';
import {
  baseCurveFromK1K2,
  convertSpectacleRxToContactUnified,
  diameterFromHvidMm,
  formatPower,
  roundToQuarterDiopter,
  toricContactLensPreferredNote
} from '@/utils/powerConversion';
import { useEffect, useMemo, useRef, useState } from 'react';
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

/** When sphere is entered, HVID / Ks / cyl / axis are required for that eye. */
function validateEyeMandatoryFields(ed: EyeDetails, label: string): string | null {
  if (!ed.sphere.trim()) return null;
  const missing: string[] = [];
  if (!ed.hvid.trim()) missing.push('HVID');
  if (!ed.k1.trim()) missing.push('K1');
  if (!ed.k2.trim()) missing.push('K2');
  if (!ed.cylinder.trim()) missing.push('cylinder');
  if (!ed.axis.trim()) missing.push('axis');
  if (missing.length === 0) return null;
  return `${label}: enter ${missing.join(', ')}.`;
}

function eyeDetailsToSide(ed: EyeDetails): EyeLensSide | undefined {
  if (!ed.sphere.trim()) return undefined;
  return {
    hvid: ed.hvid.trim() || undefined,
    diameter: ed.diameter.trim() || undefined,
    baseCurve: ed.baseCurve.trim() || undefined,
    k1: ed.k1.trim() || undefined,
    k2: ed.k2.trim() || undefined,
    sphere: ed.sphere.trim(),
    cylinder: ed.cylinder.trim() || undefined,
    axis: ed.axis.trim() || undefined,
    lensType: ed.lensType === 'clear' ? undefined : ed.lensType,
    lensColor: ed.lensColor || undefined,
    notes: ed.notes.trim() || undefined,
  };
}

/** Step 1: name, gender, age. Returns `null` if valid. */
function getStep1ValidationError(
  patientName: string,
  gender: PatientGender | '',
  age: string
): string | null {
  if (!patientName.trim()) return 'Please enter the patient name.';
  if (!gender) return 'Please select a gender.';
  const ageTrim = age.trim();
  if (!ageTrim) return 'Please enter the patient age.';
  const ageNum = parseFloat(ageTrim.replace(',', '.'));
  if (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 130) {
    return 'Please enter a valid age (1–130).';
  }
  return null;
}

/** Full form for save (step 1 + both eyes + at least one complete Rx). */
function getLensSaveValidationError(
  patientName: string,
  gender: PatientGender | '',
  age: string,
  right: EyeDetails,
  left: EyeDetails
): string | null {
  const s1 = getStep1ValidationError(patientName, gender, age);
  if (s1) return s1;
  const odErr = validateEyeMandatoryFields(right, 'Right eye (OD)');
  if (odErr) return odErr;
  const osErr = validateEyeMandatoryFields(left, 'Left eye (OS)');
  if (osErr) return osErr;
  const od = eyeDetailsToSide(right);
  const os = eyeDetailsToSide(left);
  if (!od && !os) return 'Enter spherical power for at least one eye (OD and/or OS).';
  const primarySphere = (od?.sphere ?? os?.sphere ?? '').trim();
  const sphereNum = parseFloat(primarySphere.replace(',', '.'));
  if (Number.isNaN(sphereNum)) return 'Please enter a valid spherical power.';
  return null;
}

export default function LensDetailsScreen() {
  const { addRecord } = useLensStorage();
  const scrollRef = useRef<ScrollView>(null);
  /** 0 = patient (name, gender, age); 1 = lens & Rx */
  const [formStep, setFormStep] = useState<0 | 1>(0);
  const [patientName, setPatientName] = useState('');
  const [gender, setGender] = useState<PatientGender | ''>('');
  const [age, setAge] = useState('');
  const [lensType, setLensType] = useState<'soft' | 'hard'>('soft');
  const [selectedEye, setSelectedEye] = useState<'right' | 'left'>('right');
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
  const [conversionHint, setConversionHint] = useState('');
  const [conversionError, setConversionError] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [formStep]);

  const currentEyeData = eyeDetails[selectedEye];

  const step1Complete = useMemo(
    () => getStep1ValidationError(patientName, gender, age) === null,
    [patientName, gender, age]
  );

  const canSaveLensRecord = useMemo(
    () =>
      getLensSaveValidationError(patientName, gender, age, eyeDetails.right, eyeDetails.left) === null,
    [patientName, gender, age, eyeDetails]
  );

  const goToLensStep = () => {
    const err = getStep1ValidationError(patientName, gender, age);
    if (err) {
      Alert.alert('Required', err);
      return;
    }
    setFormStep(1);
  };

  /** Recalculate DIA / BC for both eyes when soft/hard fitting changes */
  useEffect(() => {
    const fit = lensType;
    setEyeDetails((prev) => {
      const upd = (ed: EyeDetails): EyeDetails => {
        let nextD = ed.diameter;
        let nextBc = ed.baseCurve;
        const h = parseFloat(ed.hvid.replace(',', '.'));
        if (Number.isFinite(h)) {
          const dia = diameterFromHvidMm(h, fit);
          if (dia !== null) nextD = dia.toFixed(1);
        }
        const k1 = parseFloat(ed.k1.replace(',', '.'));
        const k2 = parseFloat(ed.k2.replace(',', '.'));
        if (Number.isFinite(k1) && Number.isFinite(k2)) {
          const bc = baseCurveFromK1K2(k1, k2, fit);
          if (Number.isFinite(bc)) nextBc = Math.round(bc).toFixed(0);
        }
        return { ...ed, diameter: nextD, baseCurve: nextBc };
      };
      return { right: upd(prev.right), left: upd(prev.left) };
    });
  }, [lensType]);

  const updateEyeDetail = <K extends keyof EyeDetails>(key: K, value: EyeDetails[K]) => {
    setEyeDetails((prev) => ({
      ...prev,
      [selectedEye]: { ...prev[selectedEye], [key]: value },
    }));
  };

  const handleHvidChange = (text: string) => {
    updateEyeDetail('hvid', text);
    const n = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(n)) {
      const dia = diameterFromHvidMm(n, lensType);
      updateEyeDetail('diameter', dia !== null ? dia.toFixed(1) : '');
    } else if (text.trim() === '') {
      updateEyeDetail('diameter', '');
    }
  };

  const updateBaseCurveFromK = (a: string, b: string) => {
    const x = parseFloat(a.replace(',', '.'));
    const y = parseFloat(b.replace(',', '.'));
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    const bc = baseCurveFromK1K2(x, y, lensType);
    if (Number.isFinite(bc)) updateEyeDetail('baseCurve', Math.round(bc).toFixed(0));
  };

  const handleK1Change = (text: string) => {
    updateEyeDetail('k1', text);
    updateBaseCurveFromK(text, currentEyeData.k2 || '');
  };

  const handleK2Change = (text: string) => {
    updateEyeDetail('k2', text);
    updateBaseCurveFromK(currentEyeData.k1 || '', text);
  };

  const handleConvertToContactLens = () => {
    setConversionError('');
    setConversionResult('');
    setConversionHint('');

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

    const converted = convertSpectacleRxToContactUnified(sph, cylNum);
    if (!converted) {
      setConversionError('Cannot convert.');
      return;
    }

    const axisValue = currentEyeData.axis.trim() === '' ? '0' : currentEyeData.axis.trim();
    const vertexNote =
      'Within ±4.00 D: contact power usually matches spectacle (no vertex change). Beyond ±4.00 D: vertex at 12 mm.';

    if (converted.mode === 'spherical_equivalent') {
      setConversionResult(
        `Sph = ${formatPower(roundToQuarterDiopter(converted.seSpectacle))}`
      );
      setConversionHint(
        `|Cylinder| ≤ 0.75 D: spherical equivalent rule applied.\n${vertexNote}`
      );
    } else {
      setConversionResult(`${formatPower(converted.sphere)} / ${formatPower(converted.cylinder)} x ${axisValue}`);
      const toricNote = toricContactLensPreferredNote(cylNum);
      setConversionHint([toricNote, vertexNote].filter(Boolean).join('\n\n'));
    }
  };

  const clearForm = () => {
    setPatientName('');
    setGender('');
    setAge('');
    setLensType('soft');
    setSelectedEye('right');
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
    setConversionHint('');
    setConversionError('');
    setFormStep(0);
  };

  const handleSave = async () => {
    const err = getLensSaveValidationError(patientName, gender, age, eyeDetails.right, eyeDetails.left);
    if (err) {
      Alert.alert('Required', err);
      return;
    }

    const name = patientName.trim();
    const ageTrim = age.trim();
    const od = eyeDetailsToSide(eyeDetails.right);
    const os = eyeDetailsToSide(eyeDetails.left);
    const primarySphere = (od?.sphere ?? os?.sphere ?? '').trim();
    const sphereNum = parseFloat(primarySphere.replace(',', '.'));
    const computedPowerType: 'minus' | 'plus' = sphereNum < 0 ? 'minus' : 'plus';

    try {
      await addRecord({
        patientId: 'p-' + Date.now(),
        patientName: name,
        age: ageTrim,
        gender: gender as PatientGender,
        fittingType: lensType,
        od,
        os,
        hvid: od?.hvid ?? os?.hvid ?? '',
        diameter: od?.diameter ?? os?.diameter ?? '',
        baseCurve: od?.baseCurve ?? os?.baseCurve ?? '',
        power: primarySphere,
        powerType: computedPowerType,
        sphere: primarySphere,
        cylinder: od?.cylinder ?? os?.cylinder,
        axis: od?.axis ?? os?.axis,
        lensType: od?.lensType ?? os?.lensType,
        lensColor: od?.lensColor ?? os?.lensColor,
        notes: undefined,
        savedAt: new Date().toISOString(),
      });
      const savedEyes = [od && 'right (OD)', os && 'left (OS)'].filter(Boolean);
      const eyesLine =
        savedEyes.length === 2
          ? 'Right (OD) and left (OS) are saved in one record. Open Records to see each eye separately.'
          : savedEyes.length === 1
            ? `${savedEyes[0]} saved in this record. The other eye shows as “no values” in Records until you add it.`
            : 'Record saved.';
      clearForm();
      Alert.alert('Saved', `${eyesLine} Timestamp is stored on the record.`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save. Is the server running?');
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {formStep === 0 ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.stepBadge, { color: c.primary, backgroundColor: c.background }]}>Step 1 of 2</Text>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Patient information</Text>
            <Text style={[styles.stepIntro, { color: c.placeholder }]}>
              Patient name, gender, and age are required. Tap Next to enter lens measurements.
            </Text>

            <Text style={[styles.label, { color: c.text }]}>
              Patient name <RequiredStar />
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Full name"
              placeholderTextColor={c.placeholder}
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={[styles.label, { color: c.text }]}>
              Gender <RequiredStar />
            </Text>
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

            <Text style={[styles.label, { color: c.text }]}>
              Age <RequiredStar />
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Age in years"
              placeholderTextColor={c.placeholder}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />

            <Pressable
              disabled={!step1Complete}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: c.primary },
                !step1Complete && styles.buttonDisabled,
                step1Complete && pressed && styles.buttonPressed,
              ]}
              onPress={goToLensStep}
              accessibilityState={{ disabled: !step1Complete }}
            >
              <Text style={styles.buttonText}>Next</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.backLink,
                { borderColor: c.border, backgroundColor: c.tint, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => setFormStep(0)}
              accessibilityRole="button"
              accessibilityLabel="Back to patient information"
            >
              <Text style={[styles.backLinkText, { color: c.background }]}>← Back</Text>
            </Pressable>
            <Text style={[styles.stepBadge, { color: c.primary, backgroundColor: c.background }]}>Step 2 of 2</Text>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Lens &amp; prescription</Text>
            <Text style={[styles.stepIntro, { color: c.placeholder, marginBottom: 4 }]}>
              For <Text style={{ fontWeight: '700', color: c.text }}>{patientName.trim() || 'patient'}</Text>
              {gender ? ` · ${gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other'}` : ''}
              {age.trim() ? ` · ${age.trim()} yrs` : ''}
            </Text>

            <Text style={[styles.label, { color: c.text }]}>Lens type</Text>
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

          <Text style={[styles.label, { color: c.text }]}>Eye</Text>
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

          <Text style={[styles.label, { color: c.text }]}>
            HVID (mm) <RequiredStar />
          </Text>
          <Text
            style={[
              styles.instruction,
              { color: c.placeholder, borderWidth: 0 },
            ]}
          >
            Hold a mm ruler next to the open eye. Measure the colored iris width from limbus to limbus (white-to-white
            edge).
          </Text>
          <TextInput
            key={`hvid-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter HVID"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].hvid}
            onChangeText={(text) => {
              handleHvidChange(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Diameter (DIA)</Text>
          <Text style={[styles.hint, { color: c.placeholder }]}>
            {lensType === 'soft' ? 'Soft: DIA = HVID + 2 mm' : 'Hard: DIA = HVID − 2 mm'}
          </Text>
          <TextInput
            key={`diameter-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Auto from HVID + lens type"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].diameter}
            onChangeText={(text) => {
              updateEyeDetail('diameter', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>
            K1 <RequiredStar />
          </Text>
          <TextInput
            key={`k1-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter K1"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].k1}
            onChangeText={(text) => {
              handleK1Change(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>
            K2 <RequiredStar />
          </Text>
          <TextInput
            key={`k2-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter K2"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].k2}
            onChangeText={(text) => {
              handleK2Change(text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Base curve</Text>
          <Text style={[styles.hint, { color: c.placeholder }]}>
            {lensType === 'soft' ? 'Soft: BC = (K1 + K2) / 2 + 1' : 'Hard: BC = (K1 + K2) / 2 − 1'}
          </Text>
          <TextInput
            key={`baseCurve-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Auto from K1, K2 + lens type"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].baseCurve}
            onChangeText={(text) => {
              updateEyeDetail('baseCurve', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>Lens type</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: eyeDetails[selectedEye].lensType === 'clear' ? c.primary : c.background },
              ]}
              onPress={() => {
                updateEyeDetail('lensType', 'clear');
                updateEyeDetail('lensColor', '');
              }}
            >
              <Text style={[styles.optionText, { color: eyeDetails[selectedEye].lensType === 'clear' ? '#fff' : c.text }]}>Transparent</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionSmall,
                { borderColor: c.border, backgroundColor: eyeDetails[selectedEye].lensType === 'tint' ? c.primary : c.background },
              ]}
              onPress={() => updateEyeDetail('lensType', 'tint')}
            >
              <Text style={[styles.optionText, { color: eyeDetails[selectedEye].lensType === 'tint' ? '#fff' : c.text }]}>Tint</Text>
            </Pressable>
          </View>

          {eyeDetails[selectedEye].lensType === 'tint' && (
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

          <Text style={[styles.label, { color: c.text }]}>
            Spherical (sph) <RequiredStar />
          </Text>
          <TextInput
            key={`sphere-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter sphere value"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].sphere}
            onChangeText={(text) => {
              updateEyeDetail('sphere', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>
            Cylindrical (cyl) <RequiredStar />
          </Text>
          <TextInput
            key={`cylinder-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter cylinder value"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].cylinder}
            onChangeText={(text) => {
              updateEyeDetail('cylinder', text);
            }}
            keyboardType="decimal-pad"
            editable={true}
          />

          <Text style={[styles.label, { color: c.text }]}>
            Axis <RequiredStar />
          </Text>
          <TextInput
            key={`axis-${selectedEye}`}
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter axis (0-180)"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].axis}
            onChangeText={(text) => {
              updateEyeDetail('axis', text);
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
          {conversionHint ? (
            <Text style={[styles.conversionNote, { color: c.placeholder, marginTop: 8 }]}>{conversionHint}</Text>
          ) : null}

          <Text style={[styles.conversionNote, { color: c.placeholder }]}>Minus (−): distance vision, Plus (+): near vision.</Text>
          <Text style={[styles.conversionNote, { color: c.placeholder }]}>
            |Cyl| ≤ 0.75 D: SE = sphere + ½ cylinder, then vertex on SE. |Cyl| {'>'} 0.75 D: toric vertex on both meridians.
          </Text>

          <Text style={[styles.label, { color: c.text }]}>Notes</Text>
          <TextInput
            key={`notes-${selectedEye}`}
            style={[styles.input, styles.notesInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            placeholder="Enter any additional notes"
            placeholderTextColor={c.placeholder}
            value={eyeDetails[selectedEye].notes}
            onChangeText={(text) => {
              updateEyeDetail('notes', text);
            }}
            multiline
            editable={true}
          />

          <Text style={[styles.hint, { color: c.placeholder, marginTop: 8 }]}>
            Save time is stored on the record (Records tab).
          </Text>

          <Pressable
            disabled={!canSaveLensRecord}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: c.primary },
              !canSaveLensRecord && styles.buttonDisabled,
              canSaveLensRecord && pressed && styles.buttonPressed,
            ]}
            onPress={handleSave}
            accessibilityState={{ disabled: !canSaveLensRecord }}
          >
            <Text style={styles.buttonText}>Save lens details</Text>
          </Pressable>
        </View>
        )}
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
  stepBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  stepIntro: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  backLink: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
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
  buttonDisabled: {
    opacity: 0.45,
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
  hint: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  instruction: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
