import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText, Badge, Button, Card, Screen } from '@/components/ui'
import { http } from '@/services/api'
import { getAccessToken } from '@/services/tokenStorage'
import { useAppTheme } from '@/theme'

type TestStatus = 'idle' | 'pending' | 'ok' | 'error'

interface TestResult {
  name: string
  endpoint: string
  status: TestStatus
  latencyMs?: number
  detail?: string
  error?: string
}

const INITIAL: TestResult[] = [
  { name: 'Fleet lookup (public)', endpoint: 'GET /ambulances?lat=…&lng=…', status: 'idle' },
  { name: 'Stored session token', endpoint: 'SecureStore', status: 'idle' },
  { name: 'Authenticated session', endpoint: 'GET /auth/me', status: 'idle' },
  { name: 'Wallet balance', endpoint: 'GET /wallet/balance', status: 'idle' },
  { name: 'Savings goals', endpoint: 'GET /savings', status: 'idle' },
  { name: 'Hospital directory', endpoint: 'GET /hospitals', status: 'idle' },
]

export default function ApiTestScreen() {
  const t = useAppTheme()
  const [results, setResults] = useState<TestResult[]>(INITIAL)
  const [running, setRunning] = useState(false)

  const update = (index: number, patch: Partial<TestResult>) => {
    setResults((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const runRequest = async (index: number, request: () => Promise<unknown>) => {
    update(index, { status: 'pending' })
    const start = Date.now()
    try {
      const data = await request()
      const summary =
        data && typeof data === 'object'
          ? Object.keys(data as Record<string, unknown>).slice(0, 5).join(', ')
          : String(data)
      update(index, { status: 'ok', latencyMs: Date.now() - start, detail: summary })
    } catch (err) {
      update(index, { status: 'error', latencyMs: Date.now() - start, error: (err as Error).message })
    }
  }

  const runAll = async () => {
    setRunning(true)
    setResults(INITIAL.map((item) => ({ ...item, status: 'pending' })))

    await runRequest(0, () => http.get('/ambulances?lat=7.6211&lng=5.2215'))

    const start = Date.now()
    try {
      const token = await getAccessToken()
      update(1, {
        status: 'ok',
        latencyMs: Date.now() - start,
        detail: token ? 'Present (value hidden)' : 'No token — sign in first',
      })
    } catch (err) {
      update(1, { status: 'error', error: (err as Error).message })
    }

    await runRequest(2, () => http.get('/auth/me'))
    await runRequest(3, () => http.get('/wallet/balance'))
    await runRequest(4, () => http.get('/savings'))
    await runRequest(5, () => http.get('/hospitals'))

    setRunning(false)
  }

  const tones = { idle: 'neutral', pending: 'info', ok: 'success', error: 'danger' } as const

  return (
    <Screen scroll>
      <AppText variant="display">Diagnostics</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Check connectivity and authentication against the MediMove API.
      </AppText>

      <Button label={running ? 'Running…' : 'Run checks'} onPress={() => void runAll()} loading={running} icon="flash-outline" />

      <View style={styles.list}>
        {results.map((result, index) => (
          <Card key={result.name} style={styles.card}>
            <View style={styles.cardTop}>
              <AppText variant="bodyStrong" style={styles.name}>
                {result.name}
              </AppText>
              <Badge label={result.status} tone={tones[result.status]} />
            </View>
            <AppText variant="caption" color="textFaint">
              {result.endpoint}
            </AppText>
            {result.latencyMs != null ? (
              <AppText variant="caption" color="textMuted">
                {result.latencyMs} ms
              </AppText>
            ) : null}
            {result.detail ? (
              <View style={[styles.detailBox, { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.sm }]}>
                <AppText variant="caption" color="textMuted">
                  {result.detail}
                </AppText>
              </View>
            ) : null}
            {result.error ? (
              <View style={[styles.detailBox, { backgroundColor: t.colors.emergencySoft, borderRadius: t.radius.sm }]}>
                <AppText variant="caption" color="emergency">
                  {result.error}
                </AppText>
              </View>
            ) : null}
            <AppText variant="micro" color="textFaint" style={styles.index}>
              {index + 1} / {results.length}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 4, marginBottom: 18 },
  list: { gap: 10, marginTop: 18 },
  card: { gap: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1 },
  detailBox: { padding: 9, marginTop: 4 },
  index: { marginTop: 2 },
})
