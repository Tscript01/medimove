import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { useAppTheme, type ThemeColors } from '../../theme'
import { AppText } from './AppText'
import { Spinner } from './Spinner'

type IconName = ComponentProps<typeof Ionicons>['name']

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconEnd?: IconName
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  accessibilityLabel?: string
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>
}

type ColorKey = keyof ThemeColors | 'transparent'

const VARIANTS: Record<ButtonVariant, { bg: ColorKey; fg: keyof ThemeColors; border?: keyof ThemeColors }> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  secondary: { bg: 'surface', fg: 'primary', border: 'primary' },
  ghost: { bg: 'transparent', fg: 'primary' },
  danger: { bg: 'emergency', fg: 'onEmergency' },
}

/** The single pressable action primitive used across all screens. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const t = useAppTheme()
  const config = VARIANTS[variant]
  const height = size === 'sm' ? 44 : size === 'lg' ? 58 : 56
  const fg = t.colors[config.fg]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      android_ripple={{ color: variant === 'primary' || variant === 'danger' ? t.colors.onPrimary : t.colors.primarySoft }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: config.bg === 'transparent' ? 'transparent' : t.colors[config.bg],
          borderColor: config.border ? t.colors[config.border] : 'transparent',
          borderRadius: t.radius.md,
          opacity: isDisabled ? 0.55 : pressed && Platform.OS === 'ios' ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <Spinner size={19} color={fg} />
        ) : icon ? (
          <Ionicons name={icon} size={19} color={fg} />
        ) : null}
        <AppText variant="button" color={config.fg}>
          {label}
        </AppText>
        {!loading && iconEnd ? <Ionicons name={iconEnd} size={18} color={fg} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
})
