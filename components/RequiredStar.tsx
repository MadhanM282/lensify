import { StyleSheet, Text, type TextStyle } from 'react-native';

type Props = { style?: TextStyle };

/** Red asterisk for required field labels (use inside a parent `<Text>` or standalone). */
export function RequiredStar({ style }: Props) {
  return (
    <Text style={[styles.star, style]} accessibilityLabel="required">
      *
    </Text>
  );
}

export const REQUIRED_ASTERISK_COLOR = '#dc2626';

const styles = StyleSheet.create({
  star: {
    color: REQUIRED_ASTERISK_COLOR,
    fontWeight: '700',
    fontSize: 14,
  },
});
