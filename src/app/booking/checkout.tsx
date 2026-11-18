import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { walletService } from '../../../src/services/wallet.service'

export default function CheckoutModal() {
  const { bookingId, amountNaira, providerName } = useLocalSearchParams()
  const [loading, setLoading] = useState(false)
  const [webPayUrl, setWebPayUrl] = useState<string | null>(null)
  const router = useRouter()

  const fareAmount = Number(amountNaira) || 10
  const amountKobo = fareAmount * 100

  const handlePayWithWallet = async () => {
    setLoading(true)
    try {
      await walletService.payWithWallet(bookingId as string, amountKobo)
      Alert.alert('Success', 'Payment completed via Emergency Wallet!', [
{ text: 'Track Ambulance', onPress: () => router.replace(`/booking/${bookingId}` as any) },
      ])
    } catch (err: any) {
      Alert.alert('Wallet Error', err.message || 'Insufficient wallet balance')
    } finally {
      setLoading(false)
    }
  }

  const handleInitWebPay = async () => {
    setLoading(true)
    try {
      const res = await walletService.initiateTopup(amountKobo)
      setWebPayUrl(res.paymentUrl || 'https://newwebpay.interswitchng.com/demo')
    } catch {
      Alert.alert('Interswitch Error', 'Unable to initiate WebPay gateway')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dispatch Checkout</Text>
      <Text style={styles.sub}>{providerName}</Text>

      <View style={styles.amountBox}>
        <Text style={styles.label}>Total Fare Due</Text>
        <Text style={styles.amount}>₦{fareAmount}.00</Text>
      </View>

      <TouchableOpacity style={styles.walletBtn} onPress={handlePayWithWallet} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Pay with In-App Wallet</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.webpayBtn} onPress={handleInitWebPay} disabled={loading}>
        <Text style={styles.btnText}>Pay via Interswitch WebPay</Text>
      </TouchableOpacity>

      {/* Interswitch WebView Gateway Modal */}
      {webPayUrl && (
        <Modal visible animationType="slide">
          <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#000' }}>
            <TouchableOpacity style={{ padding: 12 }} onPress={() => setWebPayUrl(null)}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Close Payment</Text>
            </TouchableOpacity>
            <WebView
              source={{ uri: webPayUrl }}
              onNavigationStateChange={(navState) => {
                if (navState.url.includes('callback') || navState.url.includes('success')) {
                  setWebPayUrl(null)
        router.replace(`/booking/${bookingId}` as any)
                }
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  sub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  amountBox: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 12 },
  amount: { color: '#10B981', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  walletBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  webpayBtn: { backgroundColor: '#0284C7', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
})