import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import {
  AppInput,
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { crewService } from '@/services/crew.service'
import { useAuthStore } from '@/store/authStore'
import { useAppTheme } from '@/theme'
import type { CrewDocumentStatus, CrewProfile } from '@/types'
import { formatDate, formatDateTime, titleCase } from '@/utils/format'

const DOCUMENT_TYPES = [
  'IDENTITY',
  'DRIVERS_LICENSE',
  'MEDICAL_LICENSE',
  'CERTIFICATION',
  'VEHICLE_REGISTRATION',
  'VEHICLE_INSURANCE',
  'ROADWORTHINESS',
] as const

const DOC_TONES: Record<CrewDocumentStatus, 'success' | 'warning' | 'danger'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}

/** Keyed on `crew.id`, so it initialises from the server profile without an effect. */
function CrewDetailsCard({
  crew,
  onSaved,
  onNotice,
}: {
  crew: CrewProfile | null
  onSaved: (crew: CrewProfile) => void
  onNotice: (message: string) => void
}) {
  const [licenseNumber, setLicenseNumber] = useState(crew?.licenseNumber ?? '')
  const [yearsExperience, setYearsExperience] = useState(
    crew?.yearsExperience != null ? String(crew.yearsExperience) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const experience = yearsExperience.trim() ? Number(yearsExperience) : null
      if (experience != null && !Number.isInteger(experience)) {
        throw new Error('Years of experience must be a whole number.')
      }
      const result = await crewService.updateMe({
        licenseNumber: licenseNumber.trim() || null,
        yearsExperience: experience,
      })
      onSaved(result.crew)
      onNotice('Crew details updated. Verification status is unchanged.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setError((err as Error).message || 'Details could not be updated.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <AppText variant="heading">Crew details</AppText>
      <AppText variant="caption" color="textMuted">
        Verification is controlled by an administrator. Editing these details cannot verify your account.
      </AppText>
      {error ? <Notice tone="danger" text={error} /> : null}
      <AppInput
        label="License number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        placeholder={crew?.licenseNumber ?? 'Not provided'}
        maxLength={60}
      />
      <AppInput
        label="Years of experience"
        value={yearsExperience}
        onChangeText={setYearsExperience}
        placeholder={crew?.yearsExperience != null ? String(crew.yearsExperience) : 'Not provided'}
        keyboardType="number-pad"
      />
      <PrimaryButton
        label="Save details"
        onPress={() => void save()}
        loading={saving}
        disabled={saving || !crew}
      />
    </Card>
  )
}

export default function CrewProfileScreen() {
  const t = useAppTheme()
  const navigation = useSafeNavigation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const profileState = useAsync(() => crewService.me(), [])
  const documentsState = useAsync(() => crewService.documents(), [])
  const crew = profileState.data?.crew ?? null
  const documents = documentsState.data?.documents ?? []

  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [docType, setDocType] = useState<(typeof DOCUMENT_TYPES)[number]>('IDENTITY')
  const [fileUrl, setFileUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  const refreshAll = () => {
    profileState.refresh()
    documentsState.refresh()
  }

  const submitDocument = async () => {
    if (!/^https?:\/\//i.test(fileUrl.trim())) {
      setDocError('Enter a valid http(s) URL for the document.')
      return
    }
    setSubmitting(true)
    setDocError(null)
    try {
      await crewService.submitDocument({ type: docType, fileUrl: fileUrl.trim() })
      setFileUrl('')
      documentsState.refresh()
      setFormNotice('Document submitted. It stays PENDING until an administrator reviews it.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setDocError((err as Error).message || 'Document could not be submitted.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again as crew.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          navigation.replace('/(auth)/login')
        },
      },
    ])
  }

  const error = profileState.error ?? documentsState.error

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={profileState.refreshing || documentsState.refreshing}
          onRefresh={refreshAll}
        />
      }
      contentStyle={styles.content}
    >
      <Card>
        <AppText variant="heading">{user?.fullName ?? 'Crew member'}</AppText>
        <AppText variant="caption" color="textMuted">
          {user?.email ?? ''}
        </AppText>
        <View style={styles.badges}>
          <Badge
            label={crew ? titleCase(crew.status) : 'Status unknown'}
            tone={crew?.status === 'ACTIVE' ? 'success' : 'warning'}
          />
          <Badge
            label={crew ? titleCase(crew.verificationStatus) : 'Verification unknown'}
            tone={crew?.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
            icon={crew?.verificationStatus === 'VERIFIED' ? 'checkmark-circle-outline' : 'time-outline'}
          />
          <Badge
            label={crew ? titleCase(crew.availability) : 'Availability unknown'}
            tone={crew?.availability === 'AVAILABLE' || crew?.availability === 'ON_DUTY' ? 'primary' : 'neutral'}
          />
        </View>
        {crew?.crewRole ? (
          <AppText variant="caption" color="textMuted" style={styles.spaced}>
            Role: {titleCase(crew.crewRole)}
          </AppText>
        ) : null}
      </Card>

      {profileState.loading || documentsState.loading ? (
        <LoadingState message="Loading crew profile…" />
      ) : null}
      {error ? <ErrorState message={error} actionLabel="Try again" onAction={refreshAll} /> : null}
      {docError ? <Notice tone="danger" text={docError} /> : null}
      {formNotice ? <Notice tone="success" text={formNotice} /> : null}

      <CrewDetailsCard
        key={crew?.id ?? 'loading'}
        crew={crew}
        onSaved={(updated) => profileState.setData({ success: true, crew: updated })}
        onNotice={setFormNotice}
      />

      <Card>
        <AppText variant="heading">Documents</AppText>
        <AppText variant="caption" color="textMuted">
          Submission sets status to PENDING. Only an administrator can approve a document.
        </AppText>
        <View style={styles.docTypes}>
          {DOCUMENT_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setDocType(type)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Select ${titleCase(type)} document type`}
              accessibilityState={{ selected: docType === type }}
              android_ripple={{ color: t.colors.primarySoft, borderless: true }}
              style={[
                styles.docChip,
                {
                  backgroundColor: docType === type ? t.colors.primary : t.colors.surfaceAlt,
                  borderRadius: t.radius.sm,
                },
              ]}
            >
              <AppText
                variant="micro"
                color={docType === type ? 'onPrimary' : 'textMuted'}
                numberOfLines={1}
              >
                {titleCase(type)}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppInput
          label={`${titleCase(docType)} file URL`}
          value={fileUrl}
          onChangeText={setFileUrl}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <SecondaryButton
          label="Submit document"
          icon="cloud-upload-outline"
          onPress={() => void submitDocument()}
          loading={submitting}
          disabled={submitting || !crew}
        />

        <View style={styles.documents}>
          {documents.map((document) => (
            <View key={document.id} style={styles.documentRow}>
              <View style={styles.documentHead}>
                <AppText variant="label">{titleCase(document.type)}</AppText>
                <Badge
                  label={titleCase(document.status)}
                  tone={DOC_TONES[document.status] ?? 'warning'}
                />
              </View>
              <AppText variant="micro" color="textFaint" numberOfLines={1}>
                {document.fileUrl}
              </AppText>
              {document.rejectionReason ? (
                <AppText variant="micro" color="textMuted">
                  Reason: {document.rejectionReason}
                </AppText>
              ) : null}
              <AppText variant="micro" color="textFaint">
                Added {formatDate(document.createdAt)}
                {document.expiresAt ? ` · Expires ${formatDate(document.expiresAt)}` : ''}
                {document.reviewedAt ? ` · Reviewed ${formatDateTime(document.reviewedAt)}` : ''}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  spaced: { marginTop: 8 },
  docTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  docChip: { paddingHorizontal: 10, paddingVertical: 7, maxWidth: '48%' },
  documents: { gap: 10, marginTop: 16 },
  documentRow: { gap: 4, paddingVertical: 8 },
  documentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
})
