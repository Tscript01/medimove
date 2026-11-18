import * as SecureStore from 'expo-secure-store'
import { useState } from 'react'
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { api } from '../../src/services/api'

interface TestResult {
  name: string
  endpoint: string
  status: 'PENDING' | 'SUCCESS' | 'ERROR'
  statusCode?: number
  latencyMs?: number
  data?: any
  error?: string
}

export default function ApiTestScreen() {
  const [testing, setTesting] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [results, setResults] = useState<TestResult[]>([])

  const runDiagnostics = async () => {
    setTesting(true)
    const currentBaseUrl =
      process.env.EXPO_PUBLIC_API_BASE_URL || 'https://medimove-backend.onrender.com/api'
    setBaseUrl(currentBaseUrl)

    const initialTests: TestResult[] = [
      { name: '1. Health & Server Ping', endpoint: '/', status: 'PENDING' },
      { name: '2. Stored Token Check', endpoint: 'SecureStore', status: 'PENDING' },
      { name: '3. Get Nearby Ambulances', endpoint: '/dispatch/ambulances?lat=7.6211&lng=5.2215', status: 'PENDING' },
      { name: '4. Get Wallet Balance', endpoint: '/wallet/balance', status: 'PENDING' },
      { name: '5. Get Hospitals', endpoint: '/dispatch/hospitals', status: 'PENDING' },
    ]

    setResults(initialTests)
    const updatedResults = [...initialTests]

    // --- Test 1: Health / Server Ping ---
    updatedResults[0] = await executeEndpointTest(
      '1. Health & Server Ping',
      '/',
      async () => await api.get('/')
    )
    setResults([...updatedResults])

    // --- Test 2: Check SecureStore Token ---
    const tokenStart = Date.now()
    try {
      const token = await SecureStore.getItemAsync('userToken')
      updatedResults[1] = {
        name: '2. Stored Token Check',
        endpoint: 'SecureStore',
        status: 'SUCCESS',
        latencyMs: Date.now() - tokenStart,
        data: token ? `Token Present (${token.substring(0, 15)}...)` : 'No Token Saved (Login required for auth routes)',
      }
    } catch (e: any) {
      updatedResults[1] = {
        name: '2. Stored Token Check',
        endpoint: 'SecureStore',
        status: 'ERROR',
        error: e.message,
      }
    }
    setResults([...updatedResults])

    // --- Test 3: Get Ambulances ---
    updatedResults[2] = await executeEndpointTest(
      '3. Get Nearby Ambulances',
      '/dispatch/ambulances',
      async () => await api.get('/dispatch/ambulances?lat=7.6211&lng=5.2215')
    )
    setResults([...updatedResults])

    // --- Test 4: Get Wallet Balance ---
    updatedResults[3] = await executeEndpointTest(
      '4. Get Wallet Balance',
      '/wallet/balance',
      async () => await api.get('/wallet/balance')
    )
    setResults([...updatedResults])

    // --- Test 5: Get Hospitals ---
    updatedResults[4] = await executeEndpointTest(
      '5. Get Hospitals',
      '/dispatch/hospitals',
      async () => await api.get('/dispatch/hospitals')
    )
    setResults([...updatedResults])

    setTesting(false)
  }

  const executeEndpointTest = async (
    name: string,
    endpoint: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> => {
    const start = Date.now()
    try {
      const data = await testFn()
      return {
        name,
        endpoint,
        status: 'SUCCESS',
        statusCode: 200,
        latencyMs: Date.now() - start,
        data,
      }
    } catch (err: any) {
      return {
        name,
        endpoint,
        status: 'ERROR',
        latencyMs: Date.now() - start,
        error: err.message || 'Request failed',
      }
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>API Health & Connectivity Test</Text>
      <Text style={styles.subtitle}>
        Target URL: <Text style={styles.highlight}>{baseUrl || 'Press Test to Inspect'}</Text>
      </Text>

      <TouchableOpacity
        style={[styles.testBtn, testing && styles.btnDisabled]}
        onPress={runDiagnostics}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.testBtnText}>RUN DIAGNOSTICS NOW</Text>
        )}
      </TouchableOpacity>

      {results.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text
              style={[
                styles.badge,
                item.status === 'SUCCESS' && styles.bgSuccess,
                item.status === 'ERROR' && styles.bgError,
                item.status === 'PENDING' && styles.bgPending,
              ]}
            >
              {item.status}
            </Text>
          </View>

          <Text style={styles.endpointText}>Endpoint: {item.endpoint}</Text>

          {item.latencyMs !== undefined && (
            <Text style={styles.metaText}>Latency: {item.latencyMs}ms</Text>
          )}

          {item.status === 'SUCCESS' && (
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                {typeof item.data === 'object'
                  ? JSON.stringify(item.data, null, 2)
                  : String(item.data)}
              </Text>
            </View>
          )}

          {item.status === 'ERROR' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>{item.error}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  content: { padding: 16, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  highlight: { color: '#10B981', fontWeight: 'bold' },
  testBtn: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.6 },
  testBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName: { color: '#E2E8F0', fontWeight: 'bold', fontSize: 14 },
  badge: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  bgSuccess: { backgroundColor: '#065F46', color: '#34D399' },
  bgError: { backgroundColor: '#991B1B', color: '#F87171' },
  bgPending: { backgroundColor: '#334155', color: '#94A3B8' },
  endpointText: { color: '#64748B', fontSize: 12 },
  metaText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  codeBox: { backgroundColor: '#1E293B', padding: 10, borderRadius: 8, marginTop: 8 },
  codeText: { color: '#A7F3D0', fontFamily: 'monospace', fontSize: 11 },
  errorBox: { backgroundColor: '#450A0A', padding: 10, borderRadius: 8, marginTop: 8 },
  errorTitle: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 11 },
  errorText: { color: '#FECACA', fontSize: 12, marginTop: 2 },
})