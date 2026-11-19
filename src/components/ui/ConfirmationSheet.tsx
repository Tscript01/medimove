import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { BottomSheet, type BottomSheetProps } from './BottomSheet'
import { AppText } from './AppText'
import { Button } from './Button'

export interface ConfirmationSheetProps
  extends Omit<BottomSheetProps, 'children' | 'headerRight'> {
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

/** A bottom sheet for one clear decision, such as cancelling a request. */
export function ConfirmationSheet({
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
  ...sheetProps
}: ConfirmationSheetProps) {
  const t = useAppTheme()
  const handleCancel = () => {
    if (onCancel) onCancel()
    else onClose()
  }

  return (
    <BottomSheet {...sheetProps} onClose={handleCancel}>
      <View style={styles.content}>
        {message ? (
          <AppText variant="body" color="textMuted">
            {message}
          </AppText>
        ) : null}

        <View style={[styles.actions, { marginTop: t.spacing.xl }]}>
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
          />
          <Button
            label={cancelLabel}
            variant="secondary"
            onPress={handleCancel}
            disabled={loading}
          />
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  actions: { gap: 12 },
})
