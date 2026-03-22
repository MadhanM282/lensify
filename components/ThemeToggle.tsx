import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text } from 'react-native';
import Colors from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  /** Show a short label next to the icon (e.g. on wide headers) */
  showLabel?: boolean;
};

export function ThemeToggle({ showLabel = false }: Props) {
  const { colorScheme, toggleTheme } = useTheme();
  const c = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={toggleTheme}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <FontAwesome name={isDark ? 'sun-o' : 'moon-o'} size={20} color={c.primary} />
      {showLabel ? (
        <Text style={[styles.label, { color: c.text }]}>{isDark ? 'Light' : 'Dark'}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, fontWeight: '600' },
});
