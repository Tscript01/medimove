import { BrandMark } from '@/components/BrandMark'
import { AppText, Card, PrimaryButton, Screen, SecondaryButton } from '@/components/ui'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { useAppTheme } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'

const FEATURES = [
  { icon: 'medical', title: 'Emergency transport', detail: 'Request help from your current location.' },
  { icon: 'navigate', title: 'Live trip tracking', detail: 'Follow your ambulance and receive status updates.' },
  { icon: 'shield-checkmark-outline', title: 'Health reserve', detail: 'Manage funds and HMO benefits in one place.' },
] as const

export default function WelcomeScreen() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}>
        <BrandMark />
        <View style={styles.heroCopy}>
          <AppText variant="title">Help is closer than you think.</AppText>
          <AppText variant="body" color="textMuted">
            MediMove connects you to emergency transport, live trip updates, and your health reserve.
          </AppText>
        </View>
      </View>

      <Card style={styles.features} padded={false}>
        {FEATURES.map((feature, index) => (
          <View key={feature.title}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: t.colors.primarySoft }]}>
                <Ionicons name={feature.icon} size={20} color={t.colors.primary} />
              </View>
              <View style={styles.featureText}>
                <AppText variant="subheading">{feature.title}</AppText>
                <AppText variant="caption" color="textMuted">
                  {feature.detail}
                </AppText>
              </View>
            </View>
            {index < FEATURES.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
            ) : null}
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <PrimaryButton
          label="Create an account"
          size="lg"
          icon="person-add-outline"
          onPress={() => navigation.navigate('/(auth)/register')}
        />
        <SecondaryButton
          label="I already have an account"
          size="lg"
          onPress={() => navigation.navigate('/(auth)/login')}
        />
        <AppText variant="caption" color="textFaint" center>
          Your details are used only to coordinate transport and care.
        </AppText>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', gap: 32 },
  top: { gap: 40, alignItems: 'center' },
  heroCopy: { gap: 12, alignItems: 'center', textAlign: 'center' },
  features: { overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 3 },
  divider: { height: 1, marginLeft: 72, marginRight: 16 },
  actions: { gap: 12 },
})
