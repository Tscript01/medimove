import { Ionicons } from '@expo/vector-icons'
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react'
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { useAppTheme, type ThemeColors } from '../../theme'
import { AppText } from './AppText'

export interface TextFieldProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label?: string
  helper?: string
  error?: string
  icon?: React.ComponentProps<typeof Ionicons>['name']
  secure?: boolean
  /** Trailing controls such as a clear button or search spinner. */
  right?: ReactNode
  containerStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>
  accessibilityLabel?: string
  /** Optional ref for keyboard focus chaining between fields. */
  inputRef?: Ref<ComponentRef<typeof TextInput>>
}

export function TextField({
  label,
  helper,
  error,
  icon,
  secure = false,
  right,
  containerStyle,
  accessibilityLabel,
  inputRef,
  onFocus,
  onBlur,
  style,
  ...rest
}: TextFieldProps) {
  const t = useAppTheme()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const borderColor: keyof ThemeColors = error ? 'emergency' : focused ? 'primary' : 'border'

  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? (
        <AppText variant="label" color="textMuted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.inputWrap, { backgroundColor: t.colors.surface, borderColor: t.colors[borderColor], borderRadius: t.radius.md }]}>
        {icon ? <Ionicons name={icon} size={20} color={t.colors.textFaint} /> : null}
        <TextInput
          ref={inputRef}
          placeholderTextColor={t.colors.textFaint}
          secureTextEntry={secure && !revealed}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[
            styles.input,
            {
              color: t.colors.text,
              fontFamily: t.typography.body.fontFamily,
              fontWeight: t.typography.body.fontWeight,
            },
            style,
          ]}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={t.colors.textFaint}
            />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error || helper ? (
        <AppText variant="caption" color={error ? 'emergency' : 'textFaint'} style={styles.helper}>
          {error || helper}
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 0 },
  label: { marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: { flex: 1, minHeight: 52, fontSize: 16, paddingVertical: 0 },
  helper: { marginTop: 8 },
})
