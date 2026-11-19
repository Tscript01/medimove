import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'

export interface DividerProps {
  spacing?: 'sm' | 'md' | 'lg'
}

export function Divider({ spacing = 'md' }: DividerProps) {
  const t = useAppTheme()
  const gap = { sm: t.spacing.sm, md: t.spacing.md, lg: t.spacing.lg }[spacing]
  return (
    <View
      accessible={false}
      style={[styles.line, { backgroundColor: t.colors.border, marginVertical: gap }]}
    />
  )
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, width: '100%' },
})
