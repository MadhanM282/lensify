import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const TRIAL_COUNT = 3;
const FINAL_FIT_STORAGE_KEY = '@contactlens/fitting-final-fit';
const LENS_ASSESSMENT_STORAGE_KEY = '@contactlens/fitting-lens-assessment';
const FITTING_RESULT_REPORT_KEY = '@contactlens/fitting-full-result-report';

export type FitCategory = 'optimum' | 'steep' | 'flat';

type EyeParams = {
  bozr: string;
  diameter: string;
  power: string;
};

type FinalEyeParams = {
  baseCurveMm: string;
  diameterMm: string;
  power: string;
  designType: string;
};

type TrialState = {
  fitType: FitCategory | null;
  od: EyeParams;
  os: EyeParams;
};

type TopTab = 'trials' | 'parameters' | 'assessment' | 'result';

type AssessmentSubTab = 'dynamic' | 'static';

type DynamicEyeAssessment = {
  centrationHorizontalMm: string;
  centrationVerticalMm: string;
  momentWithBlinkMm: string;
  momentType: string;
  momentSpeed: string;
};

type StaticEyeAssessment = {
  centralFluoresceinPattern: string;
  midPeripheralFluoresceinPattern: string;
  edgeNasalPatternMm: string;
  edgeTemporalPatternMm: string;
  superiorMm: string;
  inferiorMm: string;
  edgeClearanceOneMm: string;
  edgeClearanceTwoMm: string;
};

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'trials', label: 'Trials' },
  { key: 'parameters', label: 'Parameters' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'result', label: 'Result' },
];

function emptyTrial(): TrialState {
  return {
    fitType: null,
    od: { bozr: '', diameter: '', power: '' },
    os: { bozr: '', diameter: '', power: '' },
  };
}

function emptyFinalEye(): FinalEyeParams {
  return { baseCurveMm: '', diameterMm: '', power: '', designType: '' };
}

function emptyDynamicEye(): DynamicEyeAssessment {
  return {
    centrationHorizontalMm: '',
    centrationVerticalMm: '',
    momentWithBlinkMm: '',
    momentType: '',
    momentSpeed: '',
  };
}

function emptyStaticEye(): StaticEyeAssessment {
  return {
    centralFluoresceinPattern: '',
    midPeripheralFluoresceinPattern: '',
    edgeNasalPatternMm: '',
    edgeTemporalPatternMm: '',
    superiorMm: '',
    inferiorMm: '',
    edgeClearanceOneMm: '',
    edgeClearanceTwoMm: '',
  };
}

function emptyLensAssessmentPayload() {
  return {
    dynamic: { od: emptyDynamicEye(), os: emptyDynamicEye() },
    static: { od: emptyStaticEye(), os: emptyStaticEye() },
  };
}

const FIT_OPTIONS: { key: FitCategory; label: string }[] = [
  { key: 'optimum', label: 'Optimum fit' },
  { key: 'steep', label: 'Steep fit' },
  { key: 'flat', label: 'Flat fit' },
];

function fitLabel(t: FitCategory | null): string {
  if (!t) return '—';
  return FIT_OPTIONS.find((o) => o.key === t)?.label ?? t;
}

function dash(s: string): string {
  const t = s?.trim();
  return t ? t : '—';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFittingReportHtml(bodyText: string): string {
  const escaped = escapeHtml(bodyText);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body { margin:0; padding:18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:11pt; line-height:1.45; color:#111; }
  h1 { font-size:14pt; margin:0 0 14px; font-weight:700; }
  pre { margin:0; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:10pt; white-space:pre-wrap; word-wrap:break-word; }
</style></head><body><h1>Contact lens fitting report</h1><pre>${escaped}</pre></body></html>`;
}

type EyeKeyedStrings = { od: string; os: string };

type FittingReportInput = {
  fittingLensType: 'soft' | 'hard';
  trials: TrialState[];
  finalFit: { od: FinalEyeParams; os: FinalEyeParams };
  dynamicAssessment: { od: DynamicEyeAssessment; os: DynamicEyeAssessment };
  staticAssessment: { od: StaticEyeAssessment; os: StaticEyeAssessment };
  fitConclusion: EyeKeyedStrings;
  predictOverRefractionDs: EyeKeyedStrings;
  accurateSphericalOverRefractionDs: EyeKeyedStrings;
};

function buildFittingReportPayload(r: FittingReportInput, savedAtIso: string) {
  return {
    version: 1 as const,
    savedAt: savedAtIso,
    fittingLensType: r.fittingLensType,
    trials: r.trials,
    finalFit: r.finalFit,
    lensAssessment: {
      dynamic: r.dynamicAssessment,
      static: r.staticAssessment,
      fitConclusion: r.fitConclusion,
      predictOverRefractionDs: r.predictOverRefractionDs,
      accurateSphericalOverRefractionDs: r.accurateSphericalOverRefractionDs,
    },
  };
}

function fittingReportTrialsLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  r.trials.forEach((t, i) => {
    L.push(`Trial ${i + 1} — Fit: ${fitLabel(t.fitType)}`);
    L.push(
      `  OD: BOZR ${dash(t.od.bozr)} | Diameter ${dash(t.od.diameter)} mm | Power ${dash(t.od.power)} D`
    );
    L.push(
      `  OS: BOZR ${dash(t.os.bozr)} | Diameter ${dash(t.os.diameter)} mm | Power ${dash(t.os.power)} D`
    );
    L.push('');
  });
  return L;
}

function fittingReportFinalFitLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const eye = label === 'OD' ? r.finalFit.od : r.finalFit.os;
    L.push(`${label}`);
    L.push(`  BC (mm): ${dash(eye.baseCurveMm)}`);
    L.push(`  Diameter (mm): ${dash(eye.diameterMm)}`);
    L.push(`  Power (D): ${dash(eye.power)}`);
    L.push(`  Design / type: ${dash(eye.designType)}`);
    L.push('');
  });
  return L;
}

function fittingReportDynamicLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const e = label === 'OD' ? r.dynamicAssessment.od : r.dynamicAssessment.os;
    L.push(`${label}`);
    L.push(`  Centration horizontal (mm): ${dash(e.centrationHorizontalMm)}`);
    L.push(`  Centration vertical (mm): ${dash(e.centrationVerticalMm)}`);
    L.push(`  Moment with blink (mm): ${dash(e.momentWithBlinkMm)}`);
    L.push(`  Moment type: ${dash(e.momentType)}`);
    L.push(`  Moment speed: ${dash(e.momentSpeed)}`);
    L.push('');
  });
  return L;
}

function fittingReportStaticLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const e = label === 'OD' ? r.staticAssessment.od : r.staticAssessment.os;
    L.push(`${label}`);
    L.push(`  Central fluorescein: ${dash(e.centralFluoresceinPattern)}`);
    L.push(`  Mid-peripheral fluorescein: ${dash(e.midPeripheralFluoresceinPattern)}`);
    L.push(`  Edge nasal (mm): ${dash(e.edgeNasalPatternMm)} | Temporal (mm): ${dash(e.edgeTemporalPatternMm)}`);
    L.push(`  Superior (mm): ${dash(e.superiorMm)} | Inferior (mm): ${dash(e.inferiorMm)}`);
    L.push(`  Edge clearance 1 (mm): ${dash(e.edgeClearanceOneMm)} | 2 (mm): ${dash(e.edgeClearanceTwoMm)}`);
    L.push('');
  });
  return L;
}

function fittingReportConclusionLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const key = label === 'OD' ? 'od' : 'os';
    L.push(`${label}`);
    L.push(`  ${dash(r.fitConclusion[key])}`);
    L.push('');
  });
  return L;
}

function fittingReportOverRefractionLines(r: FittingReportInput): string[] {
  const L: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const key = label === 'OD' ? 'od' : 'os';
    L.push(`${label}`);
    L.push(`  Predict — DS: ${dash(r.predictOverRefractionDs[key])}`);
    L.push(`  Accurate spherical — DS: ${dash(r.accurateSphericalOverRefractionDs[key])}`);
    L.push('');
  });
  return L;
}

type FittingReportSection = {
  key: string;
  title: string;
  lines: string[];
};

function getFittingReportSections(r: FittingReportInput): FittingReportSection[] {
  return [
    {
      key: 'summary',
      title: 'Summary',
      lines: [
        `Generated: ${new Date().toLocaleString()}`,
        '',
        `Lens type: ${r.fittingLensType === 'soft' ? 'Soft' : 'Hard'} contact lens`,
      ],
    },
    { key: 'trials', title: 'Trials', lines: fittingReportTrialsLines(r) },
    { key: 'finalFit', title: 'Final fit parameters', lines: fittingReportFinalFitLines(r) },
    { key: 'dynamic', title: 'Lens fit — dynamic', lines: fittingReportDynamicLines(r) },
    { key: 'static', title: 'Lens fit — static', lines: fittingReportStaticLines(r) },
    { key: 'conclusion', title: 'Fit conclusion', lines: fittingReportConclusionLines(r) },
    { key: 'overRefraction', title: 'Over refraction', lines: fittingReportOverRefractionLines(r) },
  ];
}

function buildFittingReportText(r: FittingReportInput): string {
  const L: string[] = [];
  L.push('CONTACT LENS — FITTING REPORT');
  L.push(`Generated: ${new Date().toLocaleString()}`);
  L.push('—'.repeat(44));
  L.push('');
  L.push(`Lens type: ${r.fittingLensType === 'soft' ? 'Soft' : 'Hard'} contact lens`);
  L.push('');
  L.push('TRIALS');
  L.push(...fittingReportTrialsLines(r));
  L.push('FINAL FIT PARAMETERS');
  L.push(...fittingReportFinalFitLines(r));
  L.push('LENS FIT — DYNAMIC');
  L.push(...fittingReportDynamicLines(r));
  L.push('LENS FIT — STATIC');
  L.push(...fittingReportStaticLines(r));
  L.push('FIT CONCLUSION');
  L.push(...fittingReportConclusionLines(r));
  L.push('OVER REFRACTION');
  L.push(...fittingReportOverRefractionLines(r));
  return L.join('\n');
}

function filled(s: string): boolean {
  return (s ?? '').trim().length > 0;
}

function isEyeTrialComplete(e: EyeParams): boolean {
  return filled(e.bozr) && filled(e.diameter) && filled(e.power);
}

/** Trial skipped: no fit type and no lens data entered. */
function isTrialEmpty(t: TrialState): boolean {
  return (
    t.fitType == null &&
    !filled(t.od.bozr) &&
    !filled(t.od.diameter) &&
    !filled(t.od.power) &&
    !filled(t.os.bozr) &&
    !filled(t.os.diameter) &&
    !filled(t.os.power)
  );
}

/** Trial used: fit type + OD/OS BOZR, diameter, power. */
function isTrialComplete(t: TrialState): boolean {
  return t.fitType != null && isEyeTrialComplete(t.od) && isEyeTrialComplete(t.os);
}

/** Started but not finished — not allowed. */
function isTrialPartial(t: TrialState): boolean {
  return !isTrialEmpty(t) && !isTrialComplete(t);
}

function isFinalEyeComplete(e: FinalEyeParams): boolean {
  return (
    filled(e.baseCurveMm) && filled(e.diameterMm) && filled(e.power) && filled(e.designType)
  );
}

function isDynamicEyeComplete(e: DynamicEyeAssessment): boolean {
  return (
    filled(e.centrationHorizontalMm) &&
    filled(e.centrationVerticalMm) &&
    filled(e.momentWithBlinkMm) &&
    filled(e.momentType) &&
    filled(e.momentSpeed)
  );
}

function isStaticEyeComplete(e: StaticEyeAssessment): boolean {
  return (
    filled(e.centralFluoresceinPattern) &&
    filled(e.midPeripheralFluoresceinPattern) &&
    filled(e.edgeNasalPatternMm) &&
    filled(e.edgeTemporalPatternMm) &&
    filled(e.superiorMm) &&
    filled(e.inferiorMm) &&
    filled(e.edgeClearanceOneMm) &&
    filled(e.edgeClearanceTwoMm)
  );
}

function getTrialValidationErrors(trials: TrialState[]): string[] {
  const errors: string[] = [];
  const completeCount = trials.filter(isTrialComplete).length;
  if (completeCount === 0) {
    errors.push(
      'Trials: complete at least one trial (fit type + OD/OS BOZR, diameter, power). Other trials can be left empty to skip.'
    );
  }
  trials.forEach((t, i) => {
    if (isTrialPartial(t)) {
      errors.push(
        `Trial ${i + 1}: either skip it (leave all fields empty) or complete fit type and all OD/OS BOZR, diameter, and power.`
      );
    }
  });
  return errors;
}

function getFinalFitValidationErrors(finalFit: { od: FinalEyeParams; os: FinalEyeParams }): string[] {
  const errors: string[] = [];
  if (!isFinalEyeComplete(finalFit.od)) {
    errors.push('Parameters (OD): BC, diameter, power, and design/type are required.');
  }
  if (!isFinalEyeComplete(finalFit.os)) {
    errors.push('Parameters (OS): BC, diameter, power, and design/type are required.');
  }
  return errors;
}

function getLensAssessmentValidationErrors(
  dynamicAssessment: { od: DynamicEyeAssessment; os: DynamicEyeAssessment },
  staticAssessment: { od: StaticEyeAssessment; os: StaticEyeAssessment },
  fitConclusion: EyeKeyedStrings,
  predictOverRefractionDs: EyeKeyedStrings,
  accurateSphericalOverRefractionDs: EyeKeyedStrings
): string[] {
  const errors: string[] = [];
  (['OD', 'OS'] as const).forEach((label) => {
    const e = label === 'OD' ? dynamicAssessment.od : dynamicAssessment.os;
    if (!isDynamicEyeComplete(e)) {
      errors.push(
        `Assessment — Dynamic (${label}): centration H/V, moment with blink, moment type, and speed are required.`
      );
    }
  });
  (['OD', 'OS'] as const).forEach((label) => {
    const e = label === 'OD' ? staticAssessment.od : staticAssessment.os;
    if (!isStaticEyeComplete(e)) {
      errors.push(
        `Assessment — Static (${label}): central & mid-peripheral fluorescein, edge nasal/temporal, superior/inferior, and both edge clearances are required.`
      );
    }
  });
  (['od', 'os'] as const).forEach((eye) => {
    const label = eye === 'od' ? 'OD' : 'OS';
    if (!filled(fitConclusion[eye])) {
      errors.push(`Assessment — Static (${label}): fit conclusion is required.`);
    }
    if (!filled(predictOverRefractionDs[eye])) {
      errors.push(`Assessment — Static (${label}): predict over refraction (DS) is required.`);
    }
    if (!filled(accurateSphericalOverRefractionDs[eye])) {
      errors.push(`Assessment — Static (${label}): accurate spherical over refraction (DS) is required.`);
    }
  });
  return errors;
}

/** Full report / Result tab: trials + parameters + assessment. */
function getFittingValidationErrors(r: FittingReportInput): string[] {
  return [
    ...getTrialValidationErrors(r.trials),
    ...getFinalFitValidationErrors(r.finalFit),
    ...getLensAssessmentValidationErrors(
      r.dynamicAssessment,
      r.staticAssessment,
      r.fitConclusion,
      r.predictOverRefractionDs,
      r.accurateSphericalOverRefractionDs
    ),
  ];
}

function isFittingReportComplete(r: FittingReportInput): boolean {
  return getFittingValidationErrors(r).length === 0;
}

export default function FittingAssessmentScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const [topTab, setTopTab] = useState<TopTab>('trials');
  const [fittingLensType, setFittingLensType] = useState<'soft' | 'hard'>('soft');
  const [trials, setTrials] = useState<TrialState[]>(() =>
    Array.from({ length: TRIAL_COUNT }, () => emptyTrial())
  );
  const [trialIndex, setTrialIndex] = useState(0);
  const [selectedEye, setSelectedEye] = useState<'od' | 'os'>('od');
  const [finalFit, setFinalFit] = useState<{ od: FinalEyeParams; os: FinalEyeParams }>(() => ({
    od: emptyFinalEye(),
    os: emptyFinalEye(),
  }));
  const [finalParamEye, setFinalParamEye] = useState<'od' | 'os'>('od');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [assessmentSubTab, setAssessmentSubTab] = useState<AssessmentSubTab>('dynamic');
  const [assessmentEye, setAssessmentEye] = useState<'od' | 'os'>('od');
  const [dynamicAssessment, setDynamicAssessment] = useState<{
    od: DynamicEyeAssessment;
    os: DynamicEyeAssessment;
  }>(() => ({ od: emptyDynamicEye(), os: emptyDynamicEye() }));
  const [staticAssessment, setStaticAssessment] = useState<{
    od: StaticEyeAssessment;
    os: StaticEyeAssessment;
  }>(() => ({ od: emptyStaticEye(), os: emptyStaticEye() }));
  const [assessmentSaveNotice, setAssessmentSaveNotice] = useState<string | null>(null);
  const [fitConclusionByEye, setFitConclusionByEye] = useState<EyeKeyedStrings>(() => ({ od: '', os: '' }));
  const [predictOverRefractionDsByEye, setPredictOverRefractionDsByEye] = useState<EyeKeyedStrings>(() => ({
    od: '',
    os: '',
  }));
  const [accurateSphericalOverRefractionDsByEye, setAccurateSphericalOverRefractionDsByEye] =
    useState<EyeKeyedStrings>(() => ({ od: '', os: '' }));
  const [overRefractionSnapshot, setOverRefractionSnapshot] = useState<{
    od: { predict: string; accurate: string };
    os: { predict: string; accurate: string };
  } | null>(null);
  const [resultActionNotice, setResultActionNotice] = useState<string | null>(null);
  const [lastSavedResultLabel, setLastSavedResultLabel] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FITTING_RESULT_REPORT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const p = JSON.parse(raw) as { savedAt?: string };
          if (typeof p.savedAt === 'string') {
            setLastSavedResultLabel(new Date(p.savedAt).toLocaleString());
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FINAL_FIT_STORAGE_KEY),
      AsyncStorage.getItem(LENS_ASSESSMENT_STORAGE_KEY),
    ])
      .then(([finalRaw, lensRaw]) => {
        if (finalRaw) {
          try {
            const parsed = JSON.parse(finalRaw) as { od?: Partial<FinalEyeParams>; os?: Partial<FinalEyeParams> };
            setFinalFit({
              od: { ...emptyFinalEye(), ...parsed.od },
              os: { ...emptyFinalEye(), ...parsed.os },
            });
          } catch {
            /* ignore */
          }
        }
        if (lensRaw) {
          try {
            const p = JSON.parse(lensRaw) as {
              dynamic?: { od?: Partial<DynamicEyeAssessment>; os?: Partial<DynamicEyeAssessment> };
              static?: { od?: Partial<StaticEyeAssessment>; os?: Partial<StaticEyeAssessment> };
              fitConclusion?: string | Partial<EyeKeyedStrings>;
              predictOverRefractionDs?: string | Partial<EyeKeyedStrings>;
              accurateSphericalOverRefractionDs?: string | Partial<EyeKeyedStrings>;
            };
            const base = emptyLensAssessmentPayload();
            setDynamicAssessment({
              od: { ...base.dynamic.od, ...p.dynamic?.od },
              os: { ...base.dynamic.os, ...p.dynamic?.os },
            });
            setStaticAssessment({
              od: { ...base.static.od, ...p.static?.od },
              os: { ...base.static.os, ...p.static?.os },
            });

            const migrateEyeField = (v: string | Partial<EyeKeyedStrings> | undefined, legacy: string): EyeKeyedStrings => {
              if (typeof v === 'string') return { od: v, os: v };
              if (v && typeof v === 'object') {
                return {
                  od: typeof v.od === 'string' ? v.od : legacy,
                  os: typeof v.os === 'string' ? v.os : legacy,
                };
              }
              return { od: legacy, os: legacy };
            };

            const fcLegacy = typeof p.fitConclusion === 'string' ? p.fitConclusion : '';
            const predLegacy = typeof p.predictOverRefractionDs === 'string' ? p.predictOverRefractionDs : '';
            const accLegacy = typeof p.accurateSphericalOverRefractionDs === 'string' ? p.accurateSphericalOverRefractionDs : '';

            const fc = migrateEyeField(p.fitConclusion, fcLegacy);
            const pred = migrateEyeField(p.predictOverRefractionDs, predLegacy);
            const acc = migrateEyeField(p.accurateSphericalOverRefractionDs, accLegacy);

            setFitConclusionByEye(fc);
            setPredictOverRefractionDsByEye(pred);
            setAccurateSphericalOverRefractionDsByEye(acc);

            const hasOverRx =
              pred.od.trim() &&
              pred.os.trim() &&
              acc.od.trim() &&
              acc.os.trim();
            if (hasOverRx) {
              setOverRefractionSnapshot({
                od: { predict: pred.od, accurate: acc.od },
                os: { predict: pred.os, accurate: acc.os },
              });
            }
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, []);

  const trial = trials[trialIndex];
  const eyeKey = selectedEye;
  const currentEye = trial[eyeKey];

  const updateTrial = useCallback((patch: Partial<TrialState>) => {
    setTrials((prev) => {
      const next = [...prev];
      next[trialIndex] = { ...next[trialIndex], ...patch };
      return next;
    });
  }, [trialIndex]);

  const updateEyeField = useCallback(
    (field: keyof EyeParams, value: string) => {
      setTrials((prev) => {
        const next = [...prev];
        const t = { ...next[trialIndex] };
        t[eyeKey] = { ...t[eyeKey], [field]: value };
        next[trialIndex] = t;
        return next;
      });
    },
    [trialIndex, eyeKey]
  );

  const updateFinalField = useCallback(
    (field: keyof FinalEyeParams, value: string) => {
      setFinalFit((prev) => ({
        ...prev,
        [finalParamEye]: { ...prev[finalParamEye], [field]: value },
      }));
    },
    [finalParamEye]
  );

  const saveFinalFit = useCallback(async () => {
    const ferr = getFinalFitValidationErrors(finalFit);
    if (ferr.length > 0) {
      setSaveNotice(ferr[0]);
      setTimeout(() => setSaveNotice(null), 4000);
      return;
    }
    try {
      await AsyncStorage.setItem(FINAL_FIT_STORAGE_KEY, JSON.stringify(finalFit));
      setSaveNotice('Saved');
      setTimeout(() => setSaveNotice(null), 2200);
    } catch {
      setSaveNotice('Could not save');
      setTimeout(() => setSaveNotice(null), 2200);
    }
  }, [finalFit]);

  const currentFinalEye = finalFit[finalParamEye];

  const canAdvanceTrial = useMemo(
    () => isTrialEmpty(trial) || isTrialComplete(trial),
    [trial]
  );
  const isLastTrial = trialIndex === TRIAL_COUNT - 1;

  const goNext = () => {
    if (!canAdvanceTrial) return;
    if (isLastTrial) {
      setTopTab('assessment');
    } else {
      setTrialIndex((i) => i + 1);
      setSelectedEye('od');
    }
  };

  const goPrev = () => {
    if (trialIndex > 0) {
      setTrialIndex((i) => i - 1);
      setSelectedEye('od');
    }
  };

  const restartAssessment = () => {
    setTrials(Array.from({ length: TRIAL_COUNT }, () => emptyTrial()));
    setTrialIndex(0);
    setSelectedEye('od');
    setAssessmentEye('od');
    setAssessmentSubTab('dynamic');
    setDynamicAssessment({ od: emptyDynamicEye(), os: emptyDynamicEye() });
    setStaticAssessment({ od: emptyStaticEye(), os: emptyStaticEye() });
    setFitConclusionByEye({ od: '', os: '' });
    setPredictOverRefractionDsByEye({ od: '', os: '' });
    setAccurateSphericalOverRefractionDsByEye({ od: '', os: '' });
    setOverRefractionSnapshot(null);
    setLastSavedResultLabel(null);
    void AsyncStorage.removeItem(LENS_ASSESSMENT_STORAGE_KEY);
    void AsyncStorage.removeItem(FITTING_RESULT_REPORT_KEY);
    setTopTab('trials');
  };

  const updateDynamicField = useCallback(
    (field: keyof DynamicEyeAssessment, value: string) => {
      setDynamicAssessment((prev) => ({
        ...prev,
        [assessmentEye]: { ...prev[assessmentEye], [field]: value },
      }));
    },
    [assessmentEye]
  );

  const updateStaticField = useCallback(
    (field: keyof StaticEyeAssessment, value: string) => {
      setStaticAssessment((prev) => ({
        ...prev,
        [assessmentEye]: { ...prev[assessmentEye], [field]: value },
      }));
    },
    [assessmentEye]
  );

  const saveLensAssessment = useCallback(async () => {
    const aerr = getLensAssessmentValidationErrors(
      dynamicAssessment,
      staticAssessment,
      fitConclusionByEye,
      predictOverRefractionDsByEye,
      accurateSphericalOverRefractionDsByEye
    );
    if (aerr.length > 0) {
      setAssessmentSaveNotice(aerr[0]);
      setTimeout(() => setAssessmentSaveNotice(null), 4000);
      return;
    }
    try {
      const payload = {
        dynamic: dynamicAssessment,
        static: staticAssessment,
        fitConclusion: fitConclusionByEye,
        predictOverRefractionDs: predictOverRefractionDsByEye,
        accurateSphericalOverRefractionDs: accurateSphericalOverRefractionDsByEye,
      };
      await AsyncStorage.setItem(LENS_ASSESSMENT_STORAGE_KEY, JSON.stringify(payload));
      setOverRefractionSnapshot({
        od: {
          predict: predictOverRefractionDsByEye.od,
          accurate: accurateSphericalOverRefractionDsByEye.od,
        },
        os: {
          predict: predictOverRefractionDsByEye.os,
          accurate: accurateSphericalOverRefractionDsByEye.os,
        },
      });
      setAssessmentSaveNotice('Lens assessment saved');
      setTimeout(() => setAssessmentSaveNotice(null), 2200);
    } catch {
      setAssessmentSaveNotice('Could not save');
      setTimeout(() => setAssessmentSaveNotice(null), 2200);
    }
  }, [
    dynamicAssessment,
    staticAssessment,
    fitConclusionByEye,
    predictOverRefractionDsByEye,
    accurateSphericalOverRefractionDsByEye,
  ]);

  const currentDynamic = dynamicAssessment[assessmentEye];
  const currentStatic = staticAssessment[assessmentEye];

  const reportInput: FittingReportInput = useMemo(
    () => ({
      fittingLensType,
      trials,
      finalFit,
      dynamicAssessment,
      staticAssessment,
      fitConclusion: fitConclusionByEye,
      predictOverRefractionDs: predictOverRefractionDsByEye,
      accurateSphericalOverRefractionDs: accurateSphericalOverRefractionDsByEye,
    }),
    [
      fittingLensType,
      trials,
      finalFit,
      dynamicAssessment,
      staticAssessment,
      fitConclusionByEye,
      predictOverRefractionDsByEye,
      accurateSphericalOverRefractionDsByEye,
    ]
  );

  const fullReportText = useMemo(() => buildFittingReportText(reportInput), [reportInput]);
  const fittingResultSections = useMemo(() => getFittingReportSections(reportInput), [reportInput]);

  const fittingValidationErrors = useMemo(
    () => getFittingValidationErrors(reportInput),
    [reportInput]
  );
  const reportIsComplete = fittingValidationErrors.length === 0;

  const saveFullReportOnDevice = useCallback(async () => {
    if (!isFittingReportComplete(reportInput)) {
      setResultActionNotice('Fill all required fields in every section before saving.');
      setTimeout(() => setResultActionNotice(null), 3500);
      return;
    }
    const savedAt = new Date().toISOString();
    const payload = buildFittingReportPayload(reportInput, savedAt);
    const plainText = `${buildFittingReportText(reportInput)}\n\n—\nSnapshot saved (device): ${savedAt}`;
    try {
      await AsyncStorage.setItem(FITTING_RESULT_REPORT_KEY, JSON.stringify({ ...payload, plainText }));
      setLastSavedResultLabel(new Date(savedAt).toLocaleString());
      setResultActionNotice('Full report saved on this device');
      setTimeout(() => setResultActionNotice(null), 2800);
    } catch {
      setResultActionNotice('Could not save report');
      setTimeout(() => setResultActionNotice(null), 2800);
    }
  }, [reportInput]);

  const downloadReportAsPdf = useCallback(async () => {
    if (!isFittingReportComplete(reportInput)) {
      setResultActionNotice('Fill all required fields in every section before downloading.');
      setTimeout(() => setResultActionNotice(null), 3500);
      return;
    }
    const text = `${buildFittingReportText(reportInput)}\n\n—\nExported: ${new Date().toISOString()}`;
    const html = buildFittingReportHtml(text);

    try {
      if (Platform.OS === 'web') {
        const printWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
        if (!printWindow) {
          setResultActionNotice('Allow pop-ups, then try again to print or save as PDF.');
          setTimeout(() => setResultActionNotice(null), 4000);
          return;
        }
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          setResultActionNotice('In the print dialog, choose “Save as PDF” to download.');
          setTimeout(() => setResultActionNotice(null), 4500);
        }, 300);
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html,
        margins: { left: 48, right: 48, top: 48, bottom: 48 },
      });
      const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const pdfName = `fitting-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      let shareUri = uri;
      if (base) {
        const outUri = `${base}${pdfName}`;
        try {
          await FileSystem.copyAsync({ from: uri, to: outUri });
          shareUri = outUri;
        } catch {
          shareUri = uri;
        }
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save fitting report as PDF',
          ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' as const } : {}),
        });
        setResultActionNotice('Choose “Save to Files” or another app to store the PDF.');
      } else {
        setResultActionNotice('Sharing is not available; PDF was created in app cache.');
      }
      setTimeout(() => setResultActionNotice(null), 3500);
    } catch {
      setResultActionNotice('Could not create PDF.');
      setTimeout(() => setResultActionNotice(null), 2800);
    }
  }, [reportInput]);

  const shareFittingReport = useCallback(async () => {
    if (!isFittingReportComplete(reportInput)) {
      setResultActionNotice('Fill all required fields in every section before sharing.');
      setTimeout(() => setResultActionNotice(null), 3500);
      return;
    }
    const text = `${buildFittingReportText(reportInput)}\n\n—\nExported: ${new Date().toISOString()}`;
    const safeName = `fitting-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;

    try {
      if (Platform.OS === 'web') {
        await Share.share({ title: 'Fitting report', message: text });
        setResultActionNotice('Use your browser or system share options.');
        setTimeout(() => setResultActionNotice(null), 3500);
        return;
      }
      const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!base) {
        await Share.share({ title: 'Fitting report', message: text });
        return;
      }
      const uri = `${base}${safeName}`;
      await FileSystem.writeAsStringAsync(uri, text, { encoding: 'utf8' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          dialogTitle: 'Share fitting report',
          ...(Platform.OS === 'ios' ? { UTI: 'public.plain-text' as const } : {}),
        });
        setResultActionNotice('Choose an app to share the report.');
      } else {
        await Share.share({ title: 'Fitting report', message: text });
      }
      setTimeout(() => setResultActionNotice(null), 3500);
    } catch {
      try {
        await Share.share({ title: 'Fitting report', message: text });
      } catch {
        setResultActionNotice('Could not share report');
        setTimeout(() => setResultActionNotice(null), 2800);
      }
    }
  }, [reportInput]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.text, marginBottom: 8 }]}>Lens type</Text>
        <View style={[styles.row, { marginBottom: 14 }]}>
          <Pressable
            style={[
              styles.optionSmall,
              { borderColor: c.border, backgroundColor: fittingLensType === 'soft' ? c.primary : c.background },
            ]}
            onPress={() => setFittingLensType('soft')}
            accessibilityRole="button"
            accessibilityState={{ selected: fittingLensType === 'soft' }}
          >
            <Text style={[styles.optionText, { color: fittingLensType === 'soft' ? '#fff' : c.text }]}>Soft</Text>
          </Pressable>
          <Pressable
            style={[
              styles.optionSmall,
              { borderColor: c.border, backgroundColor: fittingLensType === 'hard' ? c.primary : c.background },
            ]}
            onPress={() => setFittingLensType('hard')}
            accessibilityRole="button"
            accessibilityState={{ selected: fittingLensType === 'hard' }}
          >
            <Text style={[styles.optionText, { color: fittingLensType === 'hard' ? '#fff' : c.text }]}>Hard</Text>
          </Pressable>
        </View>

        <View style={[styles.topTabBar, { backgroundColor: c.card, borderColor: c.border }]}>
          {TOP_TABS.map(({ key, label }) => {
            const active = topTab === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.topTab,
                  {
                    backgroundColor: active ? c.primary : 'transparent',
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
                onPress={() => setTopTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.topTabText, { color: active ? '#fff' : c.text }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {topTab === 'trials' ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.stepBadge, { color: c.primary, backgroundColor: c.background }]}>
              Trial {trialIndex + 1} of {TRIAL_COUNT}
            </Text>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Fitting trials</Text>
            <Text style={[styles.intro, { color: c.placeholder }]}>
              Complete at least one trial with fit type plus OD/OS BOZR, diameter, and power. You may leave other trials
              totally empty to skip them — use <Text style={{ fontWeight: '700' }}>Next</Text> on an empty trial to skip.
              Partially filled trials are not allowed. Then fill <Text style={{ fontWeight: '700' }}>Parameters</Text>,{' '}
              <Text style={{ fontWeight: '700' }}>Assessment</Text>, and open <Text style={{ fontWeight: '700' }}>Result</Text>{' '}
              when everything is complete.
            </Text>

            <Text style={[styles.label, { color: c.text }]}>Fit type</Text>
            <View style={styles.row}>
              {FIT_OPTIONS.map(({ key: fk, label: fl }) => (
                <Pressable
                  key={fk}
                  style={[
                    styles.optionSmall,
                    { borderColor: c.border, backgroundColor: trial.fitType === fk ? c.primary : c.background },
                  ]}
                  onPress={() => updateTrial({ fitType: fk })}
                >
                  <Text
                    style={[styles.optionText, { color: trial.fitType === fk ? '#fff' : c.text }]}
                    numberOfLines={2}
                  >
                    {fl}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: c.text }]}>Final lens parameters (this trial)</Text>
            <Text style={[styles.subLabel, { color: c.placeholder }]}>
              All three are required per eye for any trial you complete. Switch OD/OS below.
            </Text>

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.optionSmall,
                  { borderColor: c.border, backgroundColor: selectedEye === 'od' ? c.primary : c.background },
                ]}
                onPress={() => setSelectedEye('od')}
              >
                <Text style={[styles.optionText, { color: selectedEye === 'od' ? '#fff' : c.text }]}>
                  Right eye (OD)
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionSmall,
                  { borderColor: c.border, backgroundColor: selectedEye === 'os' ? c.primary : c.background },
                ]}
                onPress={() => setSelectedEye('os')}
              >
                <Text style={[styles.optionText, { color: selectedEye === 'os' ? '#fff' : c.text }]}>
                  Left eye (OS)
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { color: c.text }]}>BOZR</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Back optic zone radius"
              placeholderTextColor={c.placeholder}
              value={currentEye.bozr}
              onChangeText={(v) => updateEyeField('bozr', v)}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: c.text }]}>Diameter</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="mm"
              placeholderTextColor={c.placeholder}
              value={currentEye.diameter}
              onChangeText={(v) => updateEyeField('diameter', v)}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: c.text }]}>Power</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="D"
              placeholderTextColor={c.placeholder}
              value={currentEye.power}
              onChangeText={(v) => updateEyeField('power', v)}
              keyboardType="decimal-pad"
            />

            {isTrialPartial(trial) ? (
              <Text style={styles.trialPartialWarning}>
                Finish fit type and all OD/OS fields for this trial, or clear every field on this trial to skip it.
              </Text>
            ) : null}

            <View style={styles.navRow}>
              <Pressable
                disabled={trialIndex === 0}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  styles.navBtn,
                  { borderColor: c.primary, opacity: trialIndex === 0 ? 0.4 : 1 },
                  pressed && trialIndex > 0 && styles.pressed,
                ]}
                onPress={goPrev}
              >
                <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Previous trial</Text>
              </Pressable>
              <Pressable
                disabled={!canAdvanceTrial}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.navBtn,
                  { backgroundColor: c.primary, opacity: !canAdvanceTrial ? 0.45 : 1 },
                  canAdvanceTrial && pressed && styles.pressed,
                ]}
                onPress={goNext}
              >
                <Text style={styles.primaryBtnText}>
                  {isLastTrial
                    ? 'Finish → Assessment'
                    : isTrialEmpty(trial)
                      ? 'Skip trial'
                      : 'Next trial'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {topTab === 'parameters' ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Final fit parameters</Text>
            <Text style={[styles.intro, { color: c.placeholder }]}>
              All fields are required for both OD and OS (BC, diameter, power, design/type). Save is enabled only when
              both eyes are complete.
            </Text>

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.optionSmall,
                  {
                    borderColor: c.border,
                    backgroundColor: finalParamEye === 'od' ? c.primary : c.background,
                  },
                ]}
                onPress={() => setFinalParamEye('od')}
              >
                <Text style={[styles.optionText, { color: finalParamEye === 'od' ? '#fff' : c.text }]}>
                  OD
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionSmall,
                  {
                    borderColor: c.border,
                    backgroundColor: finalParamEye === 'os' ? c.primary : c.background,
                  },
                ]}
                onPress={() => setFinalParamEye('os')}
              >
                <Text style={[styles.optionText, { color: finalParamEye === 'os' ? '#fff' : c.text }]}>
                  OS
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { color: c.text }]}>BC (base curve)</Text>
            <Text style={[styles.unitHint, { color: c.placeholder }]}>mm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="e.g. 8.6"
              placeholderTextColor={c.placeholder}
              value={currentFinalEye.baseCurveMm}
              onChangeText={(v) => updateFinalField('baseCurveMm', v)}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: c.text }]}>Diameter</Text>
            <Text style={[styles.unitHint, { color: c.placeholder }]}>mm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="e.g. 14.2"
              placeholderTextColor={c.placeholder}
              value={currentFinalEye.diameterMm}
              onChangeText={(v) => updateFinalField('diameterMm', v)}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.label, { color: c.text }]}>Power</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="D"
              placeholderTextColor={c.placeholder}
              value={currentFinalEye.power}
              onChangeText={(v) => updateFinalField('power', v)}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.label, { color: c.text }]}>Design / type</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="e.g. spherical, toric, multifocal"
              placeholderTextColor={c.placeholder}
              value={currentFinalEye.designType}
              onChangeText={(v) => updateFinalField('designType', v)}
              multiline
            />

            {saveNotice ? (
              <Text style={[styles.saveNotice, { color: c.primary }]} accessibilityLiveRegion="polite">
                {saveNotice}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.primary, marginTop: 20 },
                pressed && styles.pressed,
              ]}
              onPress={() => void saveFinalFit()}
            >
              <Text style={styles.primaryBtnText}>Save</Text>
            </Pressable>
          </View>
        ) : null}

        {topTab === 'assessment' ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.subTabBar, { backgroundColor: c.background, borderColor: c.border }]}>
              {(
                [
                  { key: 'dynamic' as const, label: 'Dynamic' },
                  { key: 'static' as const, label: 'Static' },
                ] as const
              ).map(({ key: sk, label: sl }) => {
                const subActive = assessmentSubTab === sk;
                return (
                  <Pressable
                    key={sk}
                    style={[
                      styles.subTab,
                      {
                        backgroundColor: subActive ? c.primary : 'transparent',
                        borderColor: subActive ? c.primary : c.border,
                      },
                    ]}
                    onPress={() => setAssessmentSubTab(sk)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: subActive }}
                  >
                    <Text
                      style={[styles.subTabText, { color: subActive ? '#fff' : c.text }]}
                      numberOfLines={1}
                    >
                      {sl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.intro, { color: c.placeholder, marginBottom: 10, marginTop: 4 }]}>
              All Dynamic and Static fields are required for both OD and OS. On the Static tab, also enter fit conclusion
              and both over-refraction DS values for each eye (switch OD/OS). Lens assessment can be saved only when the
              full set is complete.
            </Text>

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.optionSmall,
                  {
                    borderColor: c.border,
                    backgroundColor: assessmentEye === 'od' ? c.primary : c.background,
                  },
                ]}
                onPress={() => setAssessmentEye('od')}
              >
                <Text style={[styles.optionText, { color: assessmentEye === 'od' ? '#fff' : c.text }]}>
                  OD
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.optionSmall,
                  {
                    borderColor: c.border,
                    backgroundColor: assessmentEye === 'os' ? c.primary : c.background,
                  },
                ]}
                onPress={() => setAssessmentEye('os')}
              >
                <Text style={[styles.optionText, { color: assessmentEye === 'os' ? '#fff' : c.text }]}>
                  OS
                </Text>
              </Pressable>
            </View>

            {assessmentSubTab === 'dynamic' ? (
              <>
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 14 }]}>
                  Lens fit assessment (Dynamic)
                </Text>
                <Text style={[styles.intro, { color: c.placeholder, marginBottom: 0 }]}>
                  Centration and lens moment with blink for the selected eye.
                </Text>

                <Text style={[styles.label, { color: c.text }]}>Centration</Text>
                <View style={styles.rowTight}>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Horizontal (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentDynamic.centrationHorizontalMm}
                      onChangeText={(v) => updateDynamicField('centrationHorizontalMm', v)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Vertical (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentDynamic.centrationVerticalMm}
                      onChangeText={(v) => updateDynamicField('centrationVerticalMm', v)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: c.text }]}>Moment with blink</Text>
                <Text style={[styles.unitHint, { color: c.placeholder }]}>mm</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  placeholder="mm"
                  placeholderTextColor={c.placeholder}
                  value={currentDynamic.momentWithBlinkMm}
                  onChangeText={(v) => updateDynamicField('momentWithBlinkMm', v)}
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.label, { color: c.text }]}>Moment type and speed</Text>
                <View style={styles.rowTight}>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Type</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="e.g. rotation, translation"
                      placeholderTextColor={c.placeholder}
                      value={currentDynamic.momentType}
                      onChangeText={(v) => updateDynamicField('momentType', v)}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Speed</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="e.g. slow, moderate"
                      placeholderTextColor={c.placeholder}
                      value={currentDynamic.momentSpeed}
                      onChangeText={(v) => updateDynamicField('momentSpeed', v)}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 14 }]}>
                  Lens fit assessment (Static)
                </Text>
                <Text style={[styles.intro, { color: c.placeholder, marginBottom: 0 }]}>
                  Fluorescein pattern and edge measurements for the selected eye.
                </Text>

                <Text style={[styles.label, { color: c.text }]}>Central fluorescein pattern</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  placeholder="Describe central pattern"
                  placeholderTextColor={c.placeholder}
                  value={currentStatic.centralFluoresceinPattern}
                  onChangeText={(v) => updateStaticField('centralFluoresceinPattern', v)}
                  multiline
                />

                <Text style={[styles.label, { color: c.text }]}>Mid-peripheral fluorescein pattern</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  placeholder="Describe mid-peripheral pattern"
                  placeholderTextColor={c.placeholder}
                  value={currentStatic.midPeripheralFluoresceinPattern}
                  onChangeText={(v) => updateStaticField('midPeripheralFluoresceinPattern', v)}
                  multiline
                />

                <Text style={[styles.label, { color: c.text }]}>Edge pattern</Text>
                <View style={styles.rowTight}>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Nasal (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.edgeNasalPatternMm}
                      onChangeText={(v) => updateStaticField('edgeNasalPatternMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Temporal (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.edgeTemporalPatternMm}
                      onChangeText={(v) => updateStaticField('edgeTemporalPatternMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: c.text }]}>Superior / inferior</Text>
                <View style={styles.rowTight}>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Superior (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.superiorMm}
                      onChangeText={(v) => updateStaticField('superiorMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Inferior (mm)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.inferiorMm}
                      onChangeText={(v) => updateStaticField('inferiorMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View> 
                </View>

                <Text style={[styles.label, { color: c.text }]}>Edge clearance</Text>
                <View style={styles.rowTight}>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Reading 1</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.edgeClearanceOneMm}
                      onChangeText={(v) => updateStaticField('edgeClearanceOneMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[styles.subLabel, { color: c.placeholder }]}>Reading 2</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                      placeholder="mm"
                      placeholderTextColor={c.placeholder}
                      value={currentStatic.edgeClearanceTwoMm}
                      onChangeText={(v) => updateStaticField('edgeClearanceTwoMm', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 22 }]}>
                  Fit conclusion and over refraction ({assessmentEye === 'od' ? 'OD' : 'OS'})
                </Text>
                <Text style={[styles.intro, { color: c.placeholder, marginBottom: 10 }]}>
                  Enter these for each eye using the OD / OS toggle above. They apply to the static assessment for that
                  eye.
                </Text>

                <Text style={[styles.label, { color: c.text }]}>Fit conclusion</Text>
                <Text style={[styles.subLabel, { color: c.placeholder }]}>
                  Describe lens fit outcome, recommendations, or follow-up for this eye.
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    styles.fitConclusionInput,
                    { backgroundColor: c.background, borderColor: c.border, color: c.text },
                  ]}
                  placeholder="e.g. Acceptable alignment; minor temporal edge lift…"
                  placeholderTextColor={c.placeholder}
                  value={fitConclusionByEye[assessmentEye]}
                  onChangeText={(v) => {
                    setFitConclusionByEye((prev) => ({ ...prev, [assessmentEye]: v }));
                    setOverRefractionSnapshot(null);
                  }}
                  multiline
                />

                <Text style={[styles.overRefBlockTitle, { color: c.text }]}>Predict the over refraction</Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  placeholder="D"
                  placeholderTextColor={c.placeholder}
                  value={predictOverRefractionDsByEye[assessmentEye]}
                  onChangeText={(v) => {
                    setPredictOverRefractionDsByEye((prev) => ({ ...prev, [assessmentEye]: v }));
                    setOverRefractionSnapshot(null);
                  }}
                  keyboardType="numbers-and-punctuation"
                />

                <Text style={[styles.overRefBlockTitle, { color: c.text }]}>Perform accurate spherical over refraction</Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  placeholder="D"
                  placeholderTextColor={c.placeholder}
                  value={accurateSphericalOverRefractionDsByEye[assessmentEye]}
                  onChangeText={(v) => {
                    setAccurateSphericalOverRefractionDsByEye((prev) => ({ ...prev, [assessmentEye]: v }));
                    setOverRefractionSnapshot(null);
                  }}
                  keyboardType="numbers-and-punctuation"
                />
              </>
            )}

            {assessmentSaveNotice ? (
              <Text style={[styles.saveNotice, { color: c.primary }]} accessibilityLiveRegion="polite">
                {assessmentSaveNotice}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.primary, marginTop: 16 },
                pressed && styles.pressed,
              ]}
              onPress={() => void saveLensAssessment()}
            >
              <Text style={styles.primaryBtnText}>Save lens assessment</Text>
            </Pressable>

            {overRefractionSnapshot ? (
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: c.background, borderColor: c.border, marginTop: 16 },
                ]}
              >
                <Text style={[styles.recordedOverRefHeading, { color: c.text }]}>Over refraction (recorded)</Text>

                <Text style={[styles.recordedEyeHeading, { color: c.text }]}>OD</Text>
                <Text style={[styles.recordedOverRefSection, { color: c.placeholder }]}>Predict the over refraction</Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <Text style={[styles.recordedOverRefValue, { color: c.text }]}>
                  {overRefractionSnapshot.od.predict.trim() ? overRefractionSnapshot.od.predict : '—'}
                </Text>
                <Text style={[styles.recordedOverRefSection, { color: c.placeholder, marginTop: 8 }]}>
                  Perform accurate spherical over refraction
                </Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <Text style={[styles.recordedOverRefValue, { color: c.text }]}>
                  {overRefractionSnapshot.od.accurate.trim() ? overRefractionSnapshot.od.accurate : '—'}
                </Text>

                <Text style={[styles.recordedEyeHeading, { color: c.text, marginTop: 14 }]}>OS</Text>
                <Text style={[styles.recordedOverRefSection, { color: c.placeholder }]}>Predict the over refraction</Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <Text style={[styles.recordedOverRefValue, { color: c.text }]}>
                  {overRefractionSnapshot.os.predict.trim() ? overRefractionSnapshot.os.predict : '—'}
                </Text>
                <Text style={[styles.recordedOverRefSection, { color: c.placeholder, marginTop: 8 }]}>
                  Perform accurate spherical over refraction
                </Text>
                <Text style={[styles.dsFieldTitle, { color: c.primary }]}>DS</Text>
                <Text style={[styles.recordedOverRefValue, { color: c.text }]}>
                  {overRefractionSnapshot.os.accurate.trim() ? overRefractionSnapshot.os.accurate : '—'}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: c.primary, marginTop: 28 },
                pressed && styles.pressed,
              ]}
              onPress={() => setTopTab('trials')}
            >
              <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Back to trials</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.primary, marginTop: 12 },
                pressed && styles.pressed,
              ]}
              onPress={restartAssessment}
            >
              <Text style={styles.primaryBtnText}>Start new assessment</Text>
            </Pressable>
          </View>
        ) : null}

        {topTab === 'result' ? (
          <>
            <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Fitting result</Text>
              <Text style={[styles.intro, { color: c.placeholder, marginBottom: 0 }]}>
                The report preview below is organized by section. It unlocks when every required field is complete: at
                least one full trial (others may be empty), both eyes in Parameters and Assessment, and on the Static
                assessment tab — fit conclusion and both over-refraction DS values for OD and OS.
              </Text>
            </View>

            <View style={[styles.section, styles.resultSectionSpacer, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.resultSubsectionTitle, { color: c.text }]}>Save and export</Text>
              <Text style={[styles.resultSubsectionHint, { color: c.placeholder }]}>
                Save keeps a JSON snapshot on this device. Download builds a PDF (on the web, choose “Save as PDF” in the
                print dialog). Share opens the plain-text report in your system share sheet.
              </Text>

              <View style={styles.resultActions}>
                <Pressable
                  disabled={!reportIsComplete}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.resultActionBtn,
                    { backgroundColor: c.primary, opacity: !reportIsComplete ? 0.45 : 1 },
                    pressed && reportIsComplete && styles.pressed,
                  ]}
                  onPress={() => void saveFullReportOnDevice()}
                >
                  <Text style={styles.primaryBtnText}>Save on device</Text>
                </Pressable>
                <View style={styles.resultIconGroup}>
                  <Pressable
                    disabled={!reportIsComplete}
                    accessibilityRole="button"
                    accessibilityLabel="Download report as PDF"
                    style={({ pressed }) => [
                      styles.resultIconBtn,
                      {
                        borderColor: c.primary,
                        backgroundColor: c.background,
                        opacity: !reportIsComplete ? 0.45 : 1,
                      },
                      pressed && reportIsComplete && styles.pressed,
                    ]}
                    onPress={() => void downloadReportAsPdf()}
                  >
                    <FontAwesome name="download" size={20} color={c.primary} />
                  </Pressable>
                  <Pressable
                    disabled={!reportIsComplete}
                    accessibilityRole="button"
                    accessibilityLabel="Share report as text"
                    style={({ pressed }) => [
                      styles.resultIconBtn,
                      {
                        borderColor: c.primary,
                        backgroundColor: c.background,
                        opacity: !reportIsComplete ? 0.45 : 1,
                      },
                      pressed && reportIsComplete && styles.pressed,
                    ]}
                    onPress={() => void shareFittingReport()}
                  >
                    <FontAwesome name="share-alt" size={20} color={c.primary} />
                  </Pressable>
                </View>
              </View>

              {lastSavedResultLabel ? (
                <Text style={[styles.subLabel, { color: c.placeholder, marginTop: 10, marginBottom: 0 }]}>
                  Last full report saved on device: {lastSavedResultLabel}
                </Text>
              ) : null}

              {resultActionNotice ? (
                <Text
                  style={[styles.saveNotice, { color: c.primary, marginTop: lastSavedResultLabel ? 8 : 10 }]}
                  accessibilityLiveRegion="polite"
                >
                  {resultActionNotice}
                </Text>
              ) : null}
            </View>

            {!reportIsComplete ? (
              <View style={[styles.section, styles.resultSectionSpacer, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.resultSubsectionTitle, { color: c.text }]}>Complete your assessment</Text>
                <Text style={[styles.resultSubsectionHint, { color: c.placeholder }]}>
                  Finish these items to unlock the section-by-section report preview and export actions.
                </Text>
                <View style={[styles.validationPanel, { borderColor: c.border, backgroundColor: c.background, marginTop: 0 }]}>
                  <Text style={[styles.validationPanelTitle, { color: c.text }]}>Missing or incomplete</Text>
                  {fittingValidationErrors.map((msg, idx) => (
                    <Text key={idx} style={[styles.validationBullet, { color: c.placeholder }]}>
                      • {msg}
                    </Text>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.resultSectionSpacer}>
                <Text style={[styles.resultSubsectionTitle, { color: c.text, marginHorizontal: 2, marginBottom: 12 }]}>
                  Report preview
                </Text>
                {fittingResultSections.map((s) => (
                  <View
                    key={s.key}
                    style={[styles.resultReportSection, { borderColor: c.border, backgroundColor: c.card }]}
                  >
                    <Text style={[styles.resultReportSectionTitle, { color: c.primary }]}>{s.title}</Text>
                    <Text style={[styles.resultReportSectionBody, { color: c.text }]} selectable>
                      {s.lines.join('\n').trimEnd()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  topTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 16,
  },
  topTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultActions: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  resultActionBtn: { flex: 1, alignItems: 'center' },
  resultIconGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  resultIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultSectionSpacer: { marginTop: 14 },
  resultSubsectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  resultSubsectionHint: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  resultReportSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  resultReportSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  resultReportSectionBody: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
    lineHeight: 18,
  },
  validationPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  validationPanelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  validationBullet: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  trialPartialWarning: {
    fontSize: 13,
    lineHeight: 19,
    color: '#b91c1c',
    fontWeight: '600',
    marginTop: 12,
  },
  subTabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 14,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rowTight: { flexDirection: 'row', gap: 10, marginTop: 4 },
  halfField: { flex: 1, minWidth: 0 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  optionSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  optionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  fitConclusionInput: { minHeight: 120 },
  overRefBlockTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 4,
  },
  dsFieldTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  recordedOverRefHeading: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  recordedEyeHeading: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  recordedOverRefSection: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  recordedOverRefValue: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  unitHint: { fontSize: 12, marginTop: -4, marginBottom: 6 },
  saveNotice: { fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  navBtn: { flex: 1, alignItems: 'center' },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.88 },
  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
});
