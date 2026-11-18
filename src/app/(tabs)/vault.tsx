import { useEffect, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { vaultService } from '../../../src/services/vault.service'
import { SavingsGoal } from '../../../src/types'

export default function VaultScreen() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [hmoNumber, setHmoNumber] = useState('')
  const [hmoVerified, setHmoVerified] = useState(false)

  useEffect(() => {
    vaultService.getGoals().then(setGoals).catch(() => {})
  }, [])

  const handleVerifyHMO = async () => {
    if (!hmoNumber) return
    try {
      const res = await vaultService.verifyHmoPolicy('Hygeia HMO', hmoNumber)
      if (res.eligible) {
        setHmoVerified(true)
        Alert.alert('HMO Active', `Eligible for ${res.discountPercentage}% automated direct co-pay!`)
      }
    } catch {
      Alert.alert('Verification Failed', 'Invalid policy number')
    }
  }

  return (
    <View style={styles.container}>
      {/* HMO Verification Banner */}
      <View style={styles.hmoCard}>
        <Text style={styles.hmoTitle}>HMO Direct Co-Pay Engine</Text>
        <Text style={styles.hmoSub}>Link your policy (Hygeia, Reliance, AXA) for 80% instant coverage</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Policy No. (e.g., HYG-8820)"
            placeholderTextColor="#64748B"
            value={hmoNumber}
            onChangeText={setHmoNumber}
          />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyHMO}>
            <Text style={styles.verifyBtnText}>{hmoVerified ? 'ACTIVE' : 'VERIFY'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Savings Goals */}
      <Text style={styles.sectionTitle}>Emergency Health Reserves</Text>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const progress = Math.min(100, Math.round((item.currentAmountKobo / item.targetAmountKobo) * 100))
          return (
            <View style={styles.goalCard}>
              <Text style={styles.goalTitle}>{item.title}</Text>
              <Text style={styles.goalAmount}>
                ₦{(item.currentAmountKobo / 100).toLocaleString()} / ₦{(item.targetAmountKobo / 100).toLocaleString()}
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16', padding: 16, paddingTop: 60 },
  hmoCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', marginBottom: 24 },
  hmoTitle: { color: '#3B82F6', fontSize: 14, fontWeight: 'bold' },
  hmoSub: { color: '#94A3B8', fontSize: 11, marginVertical: 4 },
  inputRow: { flexDirection: 'row', marginTop: 8 },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#FFF', borderRadius: 8, paddingHorizontal: 12, height: 40, marginRight: 8 },
  verifyBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  verifyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  goalCard: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  goalTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  goalAmount: { color: '#10B981', fontSize: 12, marginVertical: 6 },
  progressBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981' },
})