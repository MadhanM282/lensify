import { useAuth } from '@/context/AuthContext';
import { useLensStorage } from '@/context/LensStorageContext';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { records } = useLensStorage();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.welcome, { color: c.text }]}>Welcome, {user?.name ?? 'User'}</Text>
        <Text style={[styles.sub, { color: c.placeholder }]}>Lensify</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Quick stats</Text>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: c.placeholder }]}>Lens records</Text>
          <Text style={[styles.statValue, { color: c.primary }]}>{records.length}</Text>
        </View>
      </View>

      <View style={styles.links}>
        {/* Use router + Pressable instead of Link asChild — avoids RN Web <a> + style array crash */}
        <Pressable
          style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.push('/(tabs)/lens-details')}
        >
          <Text style={[styles.linkTitle, { color: c.primary }]}>Add lens details</Text>
          <Text style={[styles.linkSub, { color: c.placeholder }]}>HVID, DIA, BC, Power</Text>
        </Pressable>
        <Pressable
          style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.push('/(tabs)/power-converter')}
        >
          <Text style={[styles.linkTitle, { color: c.primary }]}>Power converter</Text>
          <Text style={[styles.linkSub, { color: c.placeholder }]}>Spectacle → Contact lens</Text>
        </Pressable>
        <Pressable
          style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.push('/(tabs)/patients')}
        >
          <Text style={[styles.linkTitle, { color: c.primary }]}>View records</Text>
          <Text style={[styles.linkSub, { color: c.placeholder }]}>All lens records</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
  },
  sub: {
    fontSize: 14,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { fontSize: 15 },
  statValue: { fontSize: 20, fontWeight: '700' },
  links: {
    marginTop: 8,
  },
  linkCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkSub: {
    fontSize: 13,
    marginTop: 4,
  },
  logout: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
  },
});
