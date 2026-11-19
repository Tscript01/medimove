import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

export interface AvatarProps {
  name: string
  size?: number
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  const t = useAppTheme()
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.colors.primarySoft,
        },
      ]}
    >
      <AppText variant={size >= 56 ? 'heading' : 'label'} color="primary">
        {initials(name) || '?'}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
})
