import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/* ---------------------------- Mock data (UI only) ---------------------------- */
type Provider = { id: string; name: string; vehicleType: string; proximityKm: number; x: number; y: number }
const HOSPITALS = [
  { id: 'h1', name: 'Ekiti State University Teaching Hospital' },
  { id: 'h2', name: 'Ado General Hospital' },
]
const PROVIDERS: Provider[] = [
  { id: 'p1', name: 'Ekiti Rapid Response', vehicleType: 'ICU', proximityKm: 1.2, x: 0.68, y: 0.3 },
  { id: 'p2', name: 'Ado Medic Unit', vehicleType: 'Basic', proximityKm: 2.0, x: 0.24, y: 0.3 },
  { id: 'p3', name: 'Red Cross Ekiti', vehicleType: 'Basic', proximityKm: 3.1, x: 0.8, y: 0.9 },
]
const USER = { x: 0.48, y: 0.62 }

/* -------------------------------- Design tokens ------------------------------- */
const palette = {
  light: {
    canvas: '#E9EFF4', surface: '#FFFFFF', ink: '#0B1B2B', muted: '#47586B', line: '#C5D0DA', handle: '#B3BFCB',
    danger: '#C8102E', onDanger: '#FFFFFF', select: '#0B5FA5', selectBg: '#E3F0FB', basic: '#1D5FBF', icu: '#C8102E',
    map: '#EEF1F4', road: '#FFFFFF', park: '#D3EBD5', water: '#BFDDF2', ok: '#15803D',
  },
  dark: {
    canvas: '#0A111C', surface: '#142033', ink: '#F2F6FA', muted: '#A9B8CA', line: '#2C3B52', handle: '#3A4B63',
    danger: '#D7263D', onDanger: '#FFFFFF', select: '#6CB6FF', selectBg: '#16304D', basic: '#6CA8FF', icu: '#FF6B7A',
    map: '#101A28', road: '#1D2B40', park: '#12301F', water: '#10304A', ok: '#4ADE80',
  },
}
type Theme = typeof palette.light

const etaMinutes = (p: Provider) => Math.max(1, Math.round((p.proximityKm / 30) * 60))
const fareFor = (p: Provider) => {
  const mult = p.vehicleType.toLowerCase().includes('icu') ? 1.4 : 1
  return Math.min(200, Math.max(10, Math.round((10 + p.proximityKm * 4 + 3.2 * 7) * mult)))
}

/* ---------------------------- Placeholder map (no Mapbox) ---------------------------- */
function FakeMap({ t, selected, top }: { t: Theme; selected: Provider; top: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const px = (p: { x: number; y: number }) => ({ left: p.x * size.w, top: p.y * size.h })
  const road = (extra: object) => <View style={[{ position: 'absolute', backgroundColor: t.road }, extra]} />
  const routeW = 5

  return (
    <View
      style={{ flex: 1, backgroundColor: t.map, overflow: 'hidden' }}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <>
          <View style={{ position: 'absolute', left: 0, top: '62%', width: '34%', height: '38%', backgroundColor: t.park }} />
          <View style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '48%', backgroundColor: t.water, borderBottomLeftRadius: 120 }} />
          {road({ left: 0, right: 0, top: '30%', height: 12 })}
          {road({ left: 0, right: 0, top: '62%', height: 12 })}
          {road({ left: 0, right: 0, top: '90%', height: 12 })}
          {road({ top: 0, bottom: 0, left: '22%', width: 12 })}
          {road({ top: 0, bottom: 0, left: '48%', width: 12 })}
          {road({ top: '40%', bottom: 0, left: '80%', width: 12 })}

          {/* Route: ambulance -> patient */}
          <View style={{ position: 'absolute', backgroundColor: t.select, width: routeW, left: selected.x * size.w - routeW / 2, top: Math.min(selected.y, USER.y) * size.h, height: Math.abs(USER.y - selected.y) * size.h }} />
          <View style={{ position: 'absolute', backgroundColor: t.select, height: routeW, top: USER.y * size.h - routeW / 2, left: Math.min(selected.x, USER.x) * size.w, width: Math.abs(USER.x - selected.x) * size.w }} />

          {/* Patient */}
          <View style={{ position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, left: px(USER).left - 13, top: px(USER).top - 13 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: t.select }} />
          </View>

          {/* Ambulances */}
          {PROVIDERS.map((p) => {
            const active = p.id === selected.id
            const s = active ? 46 : 34
            return (
              <View
                key={p.id}
                style={{
                  position: 'absolute', width: s, height: s, borderRadius: s / 2,
                  left: px(p).left - s / 2, top: px(p).top - s / 2,
                  backgroundColor: active ? t.danger : t.surface, borderWidth: 2.5,
                  borderColor: active ? t.surface : t.danger, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="medical" size={active ? 24 : 18} color={active ? t.onDanger : t.danger} />
              </View>
            )
          })}
        </>
      )}
      <View style={{ height: top }} pointerEvents="none" />
    </View>
  )
}

/* ---------------------------------- Screen ---------------------------------- */
export default function DispatchScreen() {
  const scheme = useColorScheme()
  const t = palette[scheme === 'dark' ? 'dark' : 'light']
  const styles = useMemo(() => makeStyles(t), [t])
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()

  const [hospital, setHospital] = useState(HOSPITALS[0])
  const [provider, setProvider] = useState(PROVIDERS[0])
  const fare = fareFor(provider)

  const pickHospital = (h: (typeof HOSPITALS)[number]) => { Haptics.selectionAsync(); setHospital(h) }
  const pickProvider = (p: Provider) => { Haptics.selectionAsync(); setProvider(p) }
  const onDispatch = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

  const pressedStyle = (pressed: boolean) => (pressed && Platform.OS === 'ios' ? { opacity: 0.7 } : null)

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={{ height: height * 0.46 }}>
        <FakeMap t={t} selected={provider} top={0} />
        <View style={[styles.statusPill, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
          <View style={styles.statusDot} />
          <Text style={styles.statusText} maxFontSizeMultiplier={1.4}>{PROVIDERS.length} ambulances nearby</Text>
        </View>
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} accessible={false} importantForAccessibility="no" />
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.5}>Take me to</Text>
          <View accessibilityRole="radiogroup" style={styles.group}>
            {HOSPITALS.map((h) => {
              const active = hospital.id === h.id
              return (
                <Pressable
                  key={h.id}
                  onPress={() => pickHospital(h)}
                  accessibilityRole="radio"
                  accessibilityLabel={h.name}
                  accessibilityState={{ checked: active }}
                  android_ripple={{ color: t.selectBg }}
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressedStyle(pressed)]}
                >
                  <View style={[styles.rowIcon, active && { backgroundColor: t.select }]}>
                    <Ionicons name="business" size={20} color={active ? t.surface : t.muted} />
                  </View>
                  <Text style={styles.rowTitle} numberOfLines={2} maxFontSizeMultiplier={1.5}>{h.name}</Text>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={active ? t.select : t.line} />
                </Pressable>
              )
            })}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            Choose an ambulance
          </Text>
          <View accessibilityRole="radiogroup" style={styles.group}>
            {PROVIDERS.map((p) => {
              const active = provider.id === p.id
              const band = p.vehicleType.toLowerCase().includes('icu') ? t.icu : t.basic
              const eta = etaMinutes(p)
              return (
                <Pressable
                  key={p.id}
                  onPress={() => pickProvider(p)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${p.name}, ${p.vehicleType}, about ${eta} minutes away, ${p.proximityKm} kilometres`}
                  accessibilityState={{ checked: active }}
                  android_ripple={{ color: t.selectBg }}
                  style={({ pressed }) => [styles.tag, active && styles.rowActive, pressedStyle(pressed)]}
                >
                  <View style={[styles.tagBand, { backgroundColor: band }]} />
                  <View style={styles.tagBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} maxFontSizeMultiplier={1.5}>{p.name}</Text>
                    <View style={styles.tagMeta}>
                      <View style={[styles.typeBadge, { borderColor: band }]}>
                        <Text style={[styles.typeBadgeText, { color: band }]} maxFontSizeMultiplier={1.4}>{p.vehicleType}</Text>
                      </View>
                      <Text style={styles.metaText} maxFontSizeMultiplier={1.4}>{p.proximityKm} km</Text>
                    </View>
                  </View>
                  <View style={styles.etaBlock}>
                    <Text style={styles.etaNumber} maxFontSizeMultiplier={1.3}>{eta}</Text>
                    <Text style={styles.etaUnit} maxFontSizeMultiplier={1.3}>min</Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={active ? t.select : t.line} />
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        {/* Pinned action bar */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel} maxFontSizeMultiplier={1.4}>Estimated fare</Text>
            <Text style={styles.fareValue} maxFontSizeMultiplier={1.4}>₦{fare.toLocaleString()}</Text>
          </View>
          <Pressable
            onPress={onDispatch}
            accessibilityRole="button"
            accessibilityLabel={`Dispatch ${provider.name} to take you to ${hospital.name}. Estimated fare ${fare} naira.`}
            android_ripple={{ color: '#00000033' }}
            style={({ pressed }) => [styles.dispatchBtn, pressed && Platform.OS === 'ios' && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
          >
            <Ionicons name="medical" size={24} color={t.onDanger} />
            <Text style={styles.dispatchBtnText} maxFontSizeMultiplier={1.3}>Dispatch ambulance</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

/* ---------------------------------- Styles ---------------------------------- */
const makeStyles = (t: Theme) => {
  const shadow = Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 6 },
  })
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.canvas },
    statusPill: {
      position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, ...shadow,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.ok },
    statusText: { color: t.ink, fontSize: 15, fontWeight: '600' },
    userDotOuter: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', ...shadow },
    sheet: {
      flex: 1, marginTop: -28, backgroundColor: t.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      overflow: 'hidden', ...shadow,
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.handle, marginTop: 10 },
    sheetContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
    sectionTitle: { color: t.ink, fontSize: 20, fontWeight: '700', marginBottom: 10 },
    group: { gap: 10 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: t.surface, borderRadius: 16, borderWidth: 2, borderColor: t.line,
    },
    rowActive: { borderColor: t.select, backgroundColor: t.selectBg },
    rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.canvas, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { flex: 1, color: t.ink, fontSize: 17, fontWeight: '600' },
    tag: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingRight: 14,
      backgroundColor: t.surface, borderRadius: 16, borderWidth: 2, borderColor: t.line, overflow: 'hidden',
    },
    tagBand: { alignSelf: 'stretch', width: 10 },
    tagBody: { flex: 1, paddingVertical: 12, gap: 6 },
    tagMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    typeBadge: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    typeBadgeText: { fontSize: 13, fontWeight: '700' },
    metaText: { color: t.muted, fontSize: 15 },
    etaBlock: { alignItems: 'center', minWidth: 48 },
    etaNumber: { color: t.ink, fontSize: 30, fontWeight: '800', lineHeight: 34, fontVariant: ['tabular-nums'] },
    etaUnit: { color: t.muted, fontSize: 13, fontWeight: '600' },
    footer: {
      paddingHorizontal: 16, paddingTop: 12, backgroundColor: t.surface,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line, gap: 10,
    },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    fareLabel: { color: t.muted, fontSize: 16 },
    fareValue: { color: t.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    dispatchBtn: {
      minHeight: 64, borderRadius: 18, backgroundColor: t.danger, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    dispatchBtnText: { color: t.onDanger, fontSize: 20, fontWeight: '800' },
  })
}