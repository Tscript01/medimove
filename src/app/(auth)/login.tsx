import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/authStore'

export default function LoginScreen() {
  const [email, setEmail] = useState('demo@medimove.ng')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      const response: any = await api.post('/auth/login', { email, password })
      await setAuth(response.user, response.token)
      router.replace('/')
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brandTitle}>MediMove</Text>
      <Text style={styles.subtitle}>Emergency Dispatch & Health Reserve</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="user@domain.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', padding: 24 },
  brandTitle: { fontSize: 36, fontWeight: 'bold', color: '#10B981', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 40, marginTop: 4 },
  form: { backgroundColor: '#0F172A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B' },
  label: { color: '#E2E8F0', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#1E293B', color: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
})