import { useRef, type ComponentRef } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

export interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  autoFocus?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  onSubmitEditing?: () => void
}

/**
 * Six-box verification code entry. A single invisible native input remains
 * focused so autofill, paste and the numeric keyboard all work as expected.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  accessibilityLabel = 'Verification code',
  onSubmitEditing,
}: CodeInputProps) {
  const t = useAppTheme()
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  const digits = value.slice(0, length).split('')
  const activeIndex = Math.min(digits.length, length - 1)

  const handleChange = (text: string) => {
    onChange(text.replace(/\D/g, '').slice(0, length))
  }

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={styles.root}
    >
      <View style={styles.boxes}>
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index]
          const active = index === activeIndex && !disabled
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: t.colors.surface,
                  borderColor: active ? t.colors.primary : digit ? t.colors.borderStrong : t.colors.border,
                  borderRadius: t.radius.md,
                },
              ]}
            >
              <AppText variant="heading">{digit ?? ''}</AppText>
            </View>
          )
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={accessibilityLabel}
        style={styles.hiddenInput}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    height: 58,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
})
