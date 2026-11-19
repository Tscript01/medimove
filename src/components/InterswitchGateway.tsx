import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useAppTheme } from '../theme'
import { AppText } from './ui'
import type { InterswitchPayload } from '../types'

/**
 * Renders the Interswitch WebPay checkout by POSTing the payload the backend
 * returns. The gateway redirects back to `redirectUrl` (which the app watches
 * for); settlement itself is verified server-side — this view never marks a
 * payment successful on its own.
 *
 * Requires a development build (react-native-webview is a native module).
 */
export function InterswitchGateway({
  payload,
  onRedirect,
}: {
  payload: InterswitchPayload
  onRedirect: (url: string) => void
}) {
  const t = useAppTheme()

  const { html, baseUrl } = useMemo(() => buildCheckoutHtml(payload), [payload])

  return (
    <View style={styles.flex}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl }}
        startInLoadingState
        onShouldStartLoadWithRequest={(request) => {
          // Intercept the return to our callback URL so the app can verify.
          if (payload.redirectUrl && request.url.startsWith(payload.redirectUrl)) {
            onRedirect(request.url)
            return false
          }
          if (request.url.includes('/payments/callback')) {
            onRedirect(request.url)
            return false
          }
          return true
        }}
        renderLoading={() => (
          <View style={[styles.loading, { backgroundColor: t.colors.bg }]}>
            <AppText color="textMuted">Opening secure checkout…</AppText>
          </View>
        )}
      />
    </View>
  )
}

/** Build the auto-submitting WebPay form for the given payload. */
function buildCheckoutHtml(payload: InterswitchPayload): { html: string; baseUrl: string } {
  const isLive = String(payload.mode).toUpperCase() === 'LIVE'
  const action = isLive
    ? 'https://webpay.interswitchng.com/collections/w/pay'
    : 'https://qa.interswitchng.com/collections/w/pay'

  const fields: Record<string, string> = {
    merchant_code: payload.merchantCode,
    pay_item_id: payload.payItemId,
    txn_ref: payload.txnRef,
    amount: String(payload.amount),
    currency: String(payload.currency ?? 566),
    cust_email: payload.customerEmail,
    cust_id: payload.customerEmail,
    site_redirect_url: payload.redirectUrl,
    mode: isLive ? 'LIVE' : 'TEST',
  }

  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${escapeAttr(k)}" value="${escapeAttr(v)}" />`)
    .join('')

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body onload="document.forms[0].submit()">
<form method="POST" action="${escapeAttr(action)}">${inputs}</form>
</body></html>`

  return { html, baseUrl: action }
}

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
})
