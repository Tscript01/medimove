import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { walletService } from '../../../src/services/wallet.service'
import { Payment } from '../../../src/types'

export default function WalletScreen() {
  const [balanceKobo, setBalanceKobo] = useState(0)
  const [transactions, setTransactions] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(),
      ])
      setBalanceKobo(balRes.walletBalanceKobo)
      setTransactions(txRes)
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch wallet information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Wallet Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.cardTitle}>Emergency Health Wallet</Text>
        <Text style={styles.balanceText}>₦{(balanceKobo / 100).toFixed(2)}</Text>
        <TouchableOpacity style={styles.topupBtn} onPress={() => Alert.alert('Top Up', 'Initiating Interswitch WebPay...')}>
          <Text style={styles.topupText}>+ Top Up Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions History */}
      <Text style={styles.historyTitle}>Transaction History</Text>
      {loading ? (
        <ActivityIndicator color="#10B981" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.txItem}>
              <View>
                <Text style={styles.txRef}>{item.transactionRef}</Text>
                <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, item.status === 'SUCCESSFUL' ? styles.txSuccess : styles.txFailed]}>
                ₦{(item.amountKobo / 100).toFixed(2)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16', padding: 16, paddingTop: 60 },
  balanceCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 24 },
  cardTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  balanceText: { color: '#10B981', fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  topupBtn: { backgroundColor: '#10B981', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  topupText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  historyTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  txItem: { backgroundColor: '#0F172A', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  txRef: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#64748B', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
  txSuccess: { color: '#10B981' },
  txFailed: { color: '#EF4444' },
})