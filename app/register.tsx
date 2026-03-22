import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RequiredStar } from '@/components/RequiredStar';
import { ThemeToggle } from '@/components/ThemeToggle';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);
    if (result.ok) {
      router.replace('/(tabs)');
    } else {
      setError(result.error ?? 'Registration failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: c.background }]}
    >
      <View style={[styles.themeRow, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ flex: 1 }} />
        <ThemeToggle showLabel />
      </View>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: c.primary }]}>Lensify</Text>
        <Text style={[styles.subtitle, { color: c.text }]}>Contact lens records</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Create account</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={[styles.fieldLabel, { color: c.text }]}>
          Full name <RequiredStar />
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Full name"
          placeholderTextColor={c.placeholder}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
        <Text style={[styles.fieldLabel, { color: c.text }]}>
          Email <RequiredStar />
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Email"
          placeholderTextColor={c.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <Text style={[styles.fieldLabel, { color: c.text }]}>
          Password <RequiredStar />
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={c.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: c.primary }, pressed && styles.buttonPressed]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/login')}>
          <Text style={[styles.link, { color: c.primary }]}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: -8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 15,
  },
});
