import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Redirect, Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { Platform, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/authStore'
import { FONT_FAMILY, useAppTheme } from '@/theme'

type IconName = ComponentProps<typeof Ionicons>['name']

/* The bar follows the phone's font-size setting but stops growing at this
   multiplier so it never swallows the screen. */
const MAX_FONT_SCALE = 1.4
const BASE_LABEL_SIZE = 12
const BASE_ICON_SIZE = 24

const TABS: { name: string; title: string; a11y: string; icon: IconName; iconOutline: IconName }[] = [
  { name: 'index', title: 'Home', a11y: 'Home', icon: 'navigate', iconOutline: 'navigate-outline' },
  { name: 'bookings', title: 'Activity', a11y: 'Activity', icon: 'time', iconOutline: 'time-outline' },
  { name: 'wallet', title: 'Wallet', a11y: 'Wallet', icon: 'wallet', iconOutline: 'wallet-outline' },
  { name: 'vault', title: 'Vault', a11y: 'Health Vault', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  { name: 'profile', title: 'Profile', a11y: 'Profile', icon: 'person', iconOutline: 'person-outline' },
]

export default function TabLayout() {
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions()
  const status = useAuthStore((state) => state.status)

  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE)
  const labelSize = BASE_LABEL_SIZE
  const labelLineHeight = Math.ceil(labelSize * scale * 1.25)
  const iconSize = Math.round(BASE_ICON_SIZE * Math.min(scale, 1.25))
  const iconBoxHeight = Platform.OS === 'android' ? iconSize + 10 : iconSize
  const barHeight = 8 + iconBoxHeight + 4 + labelLineHeight + 6 + insets.bottom

  // Session revoked/expired mid-use (refresh token rejected): send to login.
  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenListeners={{ tabPress: () => Haptics.selectionAsync().catch(() => {}) }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: t.colors.bgElevated,
          borderTopColor: t.colors.border,
          borderTopWidth: 0.5,
          elevation: 0,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.a11y,
            tabBarLabel: ({ color, children }) => (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={{
                  color: String(color),
                  fontFamily: FONT_FAMILY,
                  fontSize: labelSize,
                  fontWeight: t.typography.label.fontWeight,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {children}
              </Text>
            ),
            tabBarIcon: ({ focused, color }) => {
              const icon = <Ionicons name={focused ? tab.icon : tab.iconOutline} size={iconSize} color={String(color)} />
              if (Platform.OS !== 'android') return icon
              return (
                <View
                  style={{
                    height: iconBoxHeight,
                    width: iconSize + 32,
                    borderRadius: iconBoxHeight / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: focused ? t.colors.primarySoft : 'transparent',
                  }}
                >
                  {icon}
                </View>
              )
            },
          }}
        />
      ))}
    </Tabs>
  )
}
