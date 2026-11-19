import type { PropsWithChildren, ReactElement, ReactNode, Ref } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../../theme'

export interface ScreenProps {
  header?: ReactNode
  footer?: ReactNode
  scroll?: boolean
  padded?: boolean
  safeTop?: boolean
  safeBottom?: boolean
  avoidKeyboard?: boolean
  refreshControl?: ReactElement
  contentContainerStyle?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  /** Lets forms reveal the focused input without leaving the screen shell. */
  scrollViewRef?: Ref<ScrollViewInstance>
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

/** Shared screen shell: safe areas, optional header/footer, and scroll behavior. */
export function Screen({
  children,
  header,
  footer,
  scroll = false,
  padded = true,
  safeTop = true,
  safeBottom = true,
  avoidKeyboard = false,
  refreshControl,
  contentContainerStyle,
  contentStyle,
  style,
  scrollViewRef,
  onScroll,
}: PropsWithChildren<ScreenProps>) {
  const t = useAppTheme()
  const insets = useSafeAreaInsets()

  const pad: ViewStyle = {
    paddingTop: safeTop && !header ? insets.top : 0,
    paddingBottom: safeBottom ? insets.bottom : 0,
    paddingHorizontal: padded ? t.sizes.screenPadding : 0,
  }

  const body = scroll ? (
    <ScrollView
      ref={scrollViewRef}
      style={styles.flex}
      contentContainerStyle={[
        pad,
        {
          paddingBottom: safeBottom
            ? insets.bottom + t.spacing.xxxxl
            : scroll && !safeBottom ? t.spacing.xl : 0,
        },
        contentContainerStyle,
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad, contentStyle]}>{children}</View>
  )

  return (
    <View style={[styles.root, { backgroundColor: t.colors.bg }, style]}>
      {header ? <View style={[styles.header, { paddingTop: insets.top, paddingHorizontal: padded ? t.sizes.screenPadding : 0 }]}>{header}</View> : null}
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          // Android already uses adjustResize; 'height' keeps the ScrollView
          // inside the remaining space instead of leaving it under the keypad.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + t.spacing.sm, paddingHorizontal: padded ? t.sizes.screenPadding : 0 }]}>
          {footer}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { backgroundColor: 'transparent' },
  footer: { borderTopWidth: 0 },
})
