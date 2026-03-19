import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.placeholder }]}>Name</Text>
        <Text style={[styles.value, { color: c.text }]}>{user?.name ?? '–'}</Text>
        <Text style={[styles.label, { color: c.placeholder }]}>Email</Text>
        <Text style={[styles.value, { color: c.text }]}>{user?.email ?? '–'}</Text>
      </View>
      <Pressable style={[styles.logout, { borderColor: c.border }]} onPress={handleLogout}>
        <Text style={[styles.logoutText, { color: c.placeholder }]}>Sign out</Text>
      </Pressable>
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
  },
  label: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  logout: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15 },
});
