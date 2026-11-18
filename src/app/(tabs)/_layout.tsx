import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { Platform, Text, useColorScheme, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type IconName = ComponentProps<typeof Ionicons>['name']

/* Same tokens as the Dispatch screen so the whole app feels like one product. */
const palette = {
  light: { surface: '#FFFFFF', line: '#C5D0DA', active: '#0B5FA5', inactive: '#47586B', pill: '#E3F0FB' },
  dark: { surface: '#142033', line: '#2C3B52', active: '#6CB6FF', inactive: '#A9B8CA', pill: '#16304D' },
}

/* The bar follows the phone's font-size setting (iOS Dynamic Type / Android font scale),
   but stops growing at this multiplier so the bar never swallows the screen. */
const MAX_FONT_SCALE = 1.4
const BASE_LABEL_SIZE = 12
const BASE_ICON_SIZE = 24

const TABS: { name: string; title: string; a11y: string; icon: IconName; iconOutline: IconName }[] = [
  { name: 'index', title: 'Dispatch', a11y: 'Dispatch', icon: 'navigate', iconOutline: 'navigate-outline' },
  { name: 'bookings', title: 'Activity', a11y: 'Activity', icon: 'time', iconOutline: 'time-outline' },
  { name: 'wallet', title: 'Wallet', a11y: 'Wallet', icon: 'wallet', iconOutline: 'wallet-outline' },
  // Short label so it never wraps at large text sizes; screen readers still say "Health Vault".
  { name: 'vault', title: 'Vault', a11y: 'Health Vault', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  { name: 'profile', title: 'Profile', a11y: 'Profile', icon: 'person', iconOutline: 'person-outline' },
]

export default function TabLayout() {
  const scheme = useColorScheme()
  const c = palette[scheme === 'dark' ? 'dark' : 'light']
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions() // updates live when the user changes system font size

  // Size everything from the phone's current font scale (capped).
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE)
  const labelSize = BASE_LABEL_SIZE
  const labelLineHeight = Math.ceil(labelSize * scale * 1.25)
  const iconSize = Math.round(BASE_ICON_SIZE * Math.min(scale, 1.25))
  const iconBoxHeight = Platform.OS === 'android' ? iconSize + 10 : iconSize // room for the Android pill
  const barContentHeight = 8 + iconBoxHeight + 4 + labelLineHeight + 6
  const barHeight = barContentHeight + insets.bottom

  return (
    <Tabs
      screenListeners={{ tabPress: () => Haptics.selectionAsync() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.active,
        tabBarInactiveTintColor: c.inactive,
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.line,
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
                style={{ color: String(color), fontSize: labelSize, fontWeight: '600', marginTop: 4, textAlign: 'center' }}
              >
                {children}
              </Text>
            ),
            tabBarIcon: ({ focused, color }) => {
              const icon = <Ionicons name={focused ? tab.icon : tab.iconOutline} size={iconSize} color={String(color)} />
              // iOS: plain filled/outline icon. Android: Material-style pill behind the active icon.
              if (Platform.OS !== 'android') return icon
              return (
                <View
                  style={{
                    height: iconBoxHeight,
                    width: iconSize + 32,
                    borderRadius: iconBoxHeight / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: focused ? c.pill : 'transparent',
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