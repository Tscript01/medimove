import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

export interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** Optional trailing action in the sheet handle row. */
  headerRight?: ReactNode
}

/**
 * Cross-platform bottom sheet. A native Modal gives Android back-button
 * dismissal via `onRequestClose`, while the sheet itself stays within the
 * existing React Native design system and works in Expo Go and on web.
 */
export function BottomSheet({ visible, onClose, title, subtitle, children, headerRight }: BottomSheetProps) {
  const t = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.overlay }]}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: t.colors.bgElevated,
                borderTopLeftRadius: t.radius.xxl,
                borderTopRightRadius: t.radius.xxl,
                paddingBottom: insets.bottom + t.spacing.lg,
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: t.colors.borderStrong }]} />
            </View>

            {title ? (
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <AppText variant="heading" numberOfLines={1}>
                    {title}
                  </AppText>
                  {subtitle ? (
                    <AppText variant="caption" color="textMuted" numberOfLines={2}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                {headerRight}
              </View>
            ) : null}

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboardAvoid: { maxHeight: '90%' },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerText: { flex: 1, gap: 2 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 4 },
})
