// Eye care hospital – clean, professional teal/blue theme
const primary = '#0d9488';   // teal-600
const primaryDark = '#0f766e';
const tintColorLight = primary;
const tintColorDark = '#5eead4'; // teal-300

export default {
  light: {
    text: '#1e293b',
    background: '#f8fafc',
    card: '#ffffff',
    tint: tintColorLight,
    primary: primary,
    primaryDark: primaryDark,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    border: '#e2e8f0',
    placeholder: '#64748b',
  },
  dark: {
    text: '#f1f5f9',
    background: '#0f172a',
    card: '#1e293b',
    tint: tintColorDark,
    primary: '#2dd4bf',
    primaryDark: '#14b8a6',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    border: '#334155',
    placeholder: '#94a3b8',
  },
};
