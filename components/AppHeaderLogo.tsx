import { Image, StyleSheet, View } from 'react-native';

const LOGO = require('../assets/images/icon.png');

/**
 * Lensify mark for navigation headers (uses the same asset as the app icon).
 */
export function AppHeaderLogo() {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Lensify logo">
      <Image source={LOGO} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: '100%',
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
