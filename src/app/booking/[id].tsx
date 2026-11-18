import Mapbox from '@rnmapbox/maps'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { dispatchService } from '../../../src/services/dispatch.service'
import { Booking } from '../../../src/types'

export default function LiveTrackingScreen() {
  const { id } = useLocalSearchParams()
  const [booking, setBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (id) {
      dispatchService.getBookingDetails(id as string).then(setBooking).catch(() => {})
    }
  }, [id])

  if (!booking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10B981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera zoomLevel={14} centerCoordinate={[5.2215, 7.6211]} />
      </Mapbox.MapView>

      <View style={styles.statusBox}>
        <Text style={styles.ref}>{booking.reference}</Text>
        <Text style={styles.status}>STATUS: {booking.status}</Text>
        <Text style={styles.dest}>Destination: {booking.destAddress}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  centered: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  statusBox: { position: 'absolute', bottom: 30, left: 16, right: 16, backgroundColor: '#0F172A', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  ref: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  status: { color: '#10B981', fontWeight: 'bold', marginVertical: 4 },
  dest: { color: '#94A3B8', fontSize: 12 },
})