import { useColorScheme } from 'react-native'
import { useThemeStore } from '../store/themeStore'
import {
  componentSizes,
  elevation,
  getColors,
  radius,
  spacing,
  typography,
  type ColorSchemeName,
  type Elevation,
  type TextVariant,
  type ThemeColors,
} from './tokens'

export interface AppTheme {
  scheme: ColorSchemeName
  colors: ThemeColors
  spacing: typeof spacing
  radius: typeof radius
  sizes: typeof componentSizes
  typography: typeof typography
  elevation: (level: Elevation) => ReturnType<typeof elevation>
  text: (variant: TextVariant) => (typeof typography)[TextVariant]
}

/**
 * Resolve the active scheme from the saved preference and the device setting.
 * A preference of 'system' always defers to the OS; an explicit choice wins.
 */
export function useResolvedColorScheme(): ColorSchemeName {
  const system = useColorScheme()
  const preference = useThemeStore((state) => state.preference)

  if (preference === 'system') {
    return system === 'dark' ? 'dark' : 'light'
  }
  return preference
}

/** Theming hook consumed by every themed component in the app. */
export function useAppTheme(): AppTheme {
  const scheme = useResolvedColorScheme()
  const colors = getColors(scheme)

  return {
    scheme,
    colors,
    spacing,
    radius,
    sizes: componentSizes,
    typography,
    elevation: (level) => elevation(level, scheme),
    text: (variant) => typography[variant],
  }
}
