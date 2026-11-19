import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

type IconName = ComponentProps<typeof Ionicons>['name']

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: IconName
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

/** A compact, native-feeling choice control for a small set of mutually exclusive options. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel = 'Choose an option',
  style,
}: SegmentedControlProps<T>) {
  const t = useAppTheme()

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: t.colors.surfaceAlt,
          borderColor: t.colors.border,
          borderRadius: t.radius.md,
        },
        style,
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            android_ripple={{ color: t.colors.primarySoft, borderless: true }}
            style={({ pressed }) => [
              styles.segment,
              active && {
                backgroundColor: t.colors.primary,
                borderRadius: t.radius.sm,
              },
              pressed && !active && styles.pressed,
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={16}
                color={active ? t.colors.onPrimary : t.colors.textMuted}
              />
            ) : null}
            <AppText
              variant={active ? 'button' : 'bodyStrong'}
              color={active ? 'onPrimary' : 'textMuted'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  pressed: { opacity: 0.6 },
})
