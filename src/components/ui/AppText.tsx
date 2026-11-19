import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native'
import { useAppTheme, type TextVariant } from '../../theme'
import type { ThemeColors } from '../../theme/tokens'

export interface AppTextProps extends TextProps {
  /** Type-scale variant. Defaults to `body`. */
  variant?: TextVariant
  /** Semantic colour token. Defaults to `text`. */
  color?: keyof ThemeColors
  center?: boolean
  style?: StyleProp<TextStyle>
}

/**
 * Themed text. Every string in the app goes through this so type scale, colour
 * and Dynamic Type behaviour stay consistent. `maxFontSizeMultiplier` is capped
 * by default so very large system fonts don't break layouts.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  center,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: AppTextProps) {
  const t = useAppTheme()
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[t.text(variant), { color: t.colors[color] }, center ? { textAlign: 'center' } : null, style]}
      {...rest}
    />
  )
}
