/**
 * Public theme API.
 *
 * Screens and components import from here only. Colours come from the active
 * scheme, while spacing, typography, radius and elevation stay identical in
 * light and dark mode so the product feels like one coherent interface.
 */

export * from './tokens'
export * from './useAppTheme'
export { ThemeProvider } from './ThemeProvider'
export { FontProvider } from './FontProvider'
