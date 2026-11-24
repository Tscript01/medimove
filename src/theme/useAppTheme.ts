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

/** The app is light mode only, regardless of the device appearance setting. */
export function useResolvedColorScheme(): ColorSchemeName {
  return 'light'
}

/** Theming hook consumed by every themed component in the app. */
export function useAppTheme(): AppTheme {
  return {
    scheme: 'light',
    colors: getColors(),
    spacing,
    radius,
    sizes: componentSizes,
    typography,
    elevation: (level) => elevation(level),
    text: (variant) => typography[variant],
  }
}
