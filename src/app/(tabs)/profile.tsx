import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import { useState, type ComponentProps, type ReactNode } from 'react'
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    useColorScheme,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IconName = ComponentProps<typeof Ionicons>['name']

/* ------------------- Mock data: replace with your real user/profile ------------------- */
const USER = { name: 'Adebayo Ogunleye', phone: '+234 803 555 0142' }
const MEDICAL = [
  { label: 'Blood group', value: 'O+' },
  { label: 'Genotype', value: 'AA' },
  { label: 'Allergies', value: 'Penicillin' },
]
const CONTACTS = [
  { id: 'c1', name: 'Folake Ogunleye', relation: 'Spouse', phone: '+2348035550143' },
  { id: 'c2', name: 'Dr. Tunde Bello', relation: 'Family doctor', phone: '+2348035550144' },
]

/* --------------------------- Tokens (same as Dispatch + Tabs) --------------------------- */
const palette = {
  light: {
    canvas: '#E9EFF4', surface: '#FFFFFF', ink: '#0B1B2B', muted: '#47586B', line: '#C5D0DA',
    danger: '#C8102E', onDanger: '#FFFFFF', dangerText: '#C8102E', select: '#0B5FA5', selectBg: '#E3F0FB',
  },
  dark: {
    canvas: '#0A111C', surface: '#142033', ink: '#F2F6FA', muted: '#A9B8CA', line: '#2C3B52',
    danger: '#D7263D', onDanger: '#FFFFFF', dangerText: '#FF6B7A', select: '#6CB6FF', selectBg: '#16304D',
  },
}
type Theme = typeof palette.light

const initials = (name: string) =>
  name
    .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/* ------------------------------------ Building blocks ------------------------------------ */
function Group({ title, children, s }: { title?: string; children: ReactNode; s: Styles }) {
  return (
    <View style={s.groupWrap}>
      {title ? (
        <Text style={s.groupTitle} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
      ) : null}
      <View style={s.group}>{children}</View>
    </View>
  )
}

type RowProps = {
  icon: IconName
  label: string
  value?: string
  onPress?: () => void
  right?: ReactNode
  danger?: boolean
  last?: boolean
  hint?: string
  s: Styles
  t: Theme
}

function Row({ icon, label, value, onPress, right, danger, last, hint, s, t }: RowProps) {
  const color = danger ? t.dangerText : t.ink
  const content = (
    <>
      <View style={[s.rowIcon, danger && { backgroundColor: t.danger }]}>
        <Ionicons name={icon} size={20} color={danger ? t.onDanger : t.select} />
      </View>
      <View style={[s.rowBody, !last && s.rowDivider]}>
        <Text style={[s.rowLabel, { color }]} maxFontSizeMultiplier={1.5}>
          {label}
        </Text>
        {value ? (
          <Text style={s.rowValue} maxFontSizeMultiplier={1.5}>
            {value}
          </Text>
        ) : null}
        {right ?? (onPress && !danger ? <Ionicons name="chevron-forward" size={20} color={t.muted} /> : null)}
      </View>
    </>
  )

  if (!onPress) return <View style={s.row}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      android_ripple={{ color: t.selectBg }}
      style={({ pressed }) => [s.row, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  )
}

/* -------------------------------------- Screen -------------------------------------- */
export default function ProfileScreen() {
  const scheme = useColorScheme()
  const t = palette[scheme === 'dark' ? 'dark' : 'light']
  const s = styleSets[scheme === 'dark' ? 'dark' : 'light']
  const insets = useSafeAreaInsets()

  const [notifications, setNotifications] = useState(true)
  const [shareLocation, setShareLocation] = useState(true)

  const toggle = (set: (v: boolean) => void) => (v: boolean) => {
    Haptics.selectionAsync()
    set(v)
  }

  const callContact = (phone: string) => {
    Haptics.selectionAsync()
    Linking.openURL(`tel:${phone}`)
  }

  const comingSoon = (what: string) => () => Alert.alert(what, 'This screen is not built yet.')

  const signOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert('Sign out?', 'You will need to sign in again to book an ambulance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          // TODO: call your auth sign-out here, then navigate to your login route
        },
      },
    ])
  }

  const switchProps = {
    trackColor: { false: t.line, true: t.select },
    ios_backgroundColor: t.line,
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.largeTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        Profile
      </Text>

      {/* Identity */}
      <View style={[s.group, s.identity]}>
        <View style={s.avatar} accessible={false}>
          <Text style={s.avatarText} maxFontSizeMultiplier={1.2}>
            {initials(USER.name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={2} maxFontSizeMultiplier={1.5}>
            {USER.name}
          </Text>
          <Text style={s.phone} maxFontSizeMultiplier={1.5}>
            {USER.phone}
          </Text>
        </View>
        <Pressable
          onPress={comingSoon('Edit profile')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          android_ripple={{ color: t.selectBg, borderless: true }}
          style={({ pressed }) => [s.editBtn, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
        >
          <Text style={s.editText} maxFontSizeMultiplier={1.4}>
            Edit
          </Text>
        </Pressable>
      </View>

      {/* Medical ID: the thing responders need first */}
      <Group title="Medical ID" s={s}>
        <View style={s.medRow}>
          {MEDICAL.map((m) => (
            <View key={m.label} style={s.medTile} accessible accessibilityLabel={`${m.label}: ${m.value}`}>
              <Text style={s.medLabel} maxFontSizeMultiplier={1.4}>
                {m.label}
              </Text>
              <Text style={s.medValue} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                {m.value}
              </Text>
            </View>
          ))}
        </View>
        <Row icon="medkit" label="Edit medical details" onPress={comingSoon('Medical details')} last s={s} t={t} />
      </Group>

      {/* Emergency contacts */}
      <Group title="Emergency contacts" s={s}>
        {CONTACTS.map((c) => (
          <View key={c.id} style={s.row}>
            <View style={s.contactAvatar} accessible={false}>
              <Text style={s.contactInitials} maxFontSizeMultiplier={1.2}>
                {initials(c.name)}
              </Text>
            </View>
            <View style={[s.rowBody, s.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel} maxFontSizeMultiplier={1.5}>
                  {c.name}
                </Text>
                <Text style={s.rowSub} maxFontSizeMultiplier={1.5}>
                  {c.relation}
                </Text>
              </View>
              <Pressable
                onPress={() => callContact(c.phone)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${c.name}, ${c.relation}`}
                android_ripple={{ color: t.selectBg, borderless: true }}
                style={({ pressed }) => [s.callBtn, pressed && Platform.OS === 'ios' && { opacity: 0.6 }]}
              >
                <Ionicons name="call" size={22} color={t.onDanger} />
              </Pressable>
            </View>
          </View>
        ))}
        <Row icon="person-add" label="Add a contact" onPress={comingSoon('Add contact')} last s={s} t={t} />
      </Group>

      {/* Preferences */}
      <Group title="Preferences" s={s}>
        <Row
          icon="notifications"
          label="Notifications"
          s={s}
          t={t}
          right={
            <Switch
              {...switchProps}
              value={notifications}
              onValueChange={toggle(setNotifications)}
              accessibilityLabel="Notifications"
            />
          }
        />
        <Row
          icon="location"
          label="Share live location with responders"
          s={s}
          t={t}
          right={
            <Switch
              {...switchProps}
              value={shareLocation}
              onValueChange={toggle(setShareLocation)}
              accessibilityLabel="Share live location with responders"
            />
          }
        />
        <Row icon="language" label="Language" value="English" onPress={comingSoon('Language')} last s={s} t={t} />
      </Group>

      {/* Support */}
      <Group title="Support" s={s}>
        <Row icon="help-circle" label="Help & support" onPress={comingSoon('Help & support')} s={s} t={t} />
        <Row icon="lock-closed" label="Privacy & terms" onPress={comingSoon('Privacy & terms')} last s={s} t={t} />
      </Group>

      <Group s={s}>
        <Row icon="log-out" label="Sign out" onPress={signOut} danger last s={s} t={t} />
      </Group>

      <Text style={s.version} maxFontSizeMultiplier={1.4}>
        Version {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  )
}

/* -------------------------------------- Styles -------------------------------------- */
const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.canvas },
    largeTitle: { color: t.ink, fontSize: 34, fontWeight: '800', paddingHorizontal: 20, marginBottom: 16 },

    groupWrap: { marginTop: 24 },
    groupTitle: { color: t.muted, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginHorizontal: 32, marginBottom: 8 },
    group: { backgroundColor: t.surface, borderRadius: 20, marginHorizontal: 16, overflow: 'hidden' },

    identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: t.onDanger, fontSize: 24, fontWeight: '800' },
    name: { color: t.ink, fontSize: 20, fontWeight: '700' },
    phone: { color: t.muted, fontSize: 16, marginTop: 2 },
    editBtn: { minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
    editText: { color: t.select, fontSize: 17, fontWeight: '600' },

    medRow: { flexDirection: 'row', gap: 10, padding: 12 },
    medTile: { flex: 1, backgroundColor: t.canvas, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, minHeight: 78, justifyContent: 'space-between' },
    medLabel: { color: t.muted, fontSize: 13, fontWeight: '600' },
    medValue: { color: t.ink, fontSize: 20, fontWeight: '800', marginTop: 6 },

    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingLeft: 16 },
    rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: t.selectBg, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, marginLeft: 14, paddingRight: 16, paddingVertical: 8 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    rowLabel: { flex: 1, color: t.ink, fontSize: 17, fontWeight: '500' },
    rowSub: { color: t.muted, fontSize: 15, marginTop: 2 },
    rowValue: { color: t.muted, fontSize: 17 },

    contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.selectBg, alignItems: 'center', justifyContent: 'center' },
    contactInitials: { color: t.select, fontSize: 15, fontWeight: '800' },
    callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.danger, alignItems: 'center', justifyContent: 'center' },

    version: { color: t.muted, fontSize: 14, textAlign: 'center', marginTop: 24 },
  })

type Styles = ReturnType<typeof makeStyles>
const styleSets = { light: makeStyles(palette.light), dark: makeStyles(palette.dark) }