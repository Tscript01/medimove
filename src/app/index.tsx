import { Redirect } from 'expo-router'
import { useAuthStore } from '../store/authStore'
import { homeForRole } from '../utils/roleRouting'

/**
 * Entry gate. Session restoration now happens in `AppBootstrap` while the
 * native splash is still visible, so this screen only needs to route by the
 * role returned by `/auth/me`.
 */
export default function RootIndex() {
  const status = useAuthStore((state) => state.status)
  const role = useAuthStore((state) => state.user?.role)

  if (status === 'authenticated') return <Redirect href={homeForRole(role)} />

  return <Redirect href="/(auth)/welcome" />
}
