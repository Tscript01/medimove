# MediMove UI audit — Step 1 (audit only)

**Status:** audit complete. **No implementation files were changed.** No commits were made.

**Requested handoff:** `C:\Users\T_script\Downloads\MediMove_Claude_Engineering_Handoff.txt` was not present under `docs/` in this repo; it was read from the Downloads path and used as the product/safety baseline. The existing backend handoff at `C:\Users\T_script\Desktop\interbackend\docs\AI_FRONTEND_HANDOFF.md` was also reviewed earlier.

This audit covers only UI and interaction. It does **not** propose changing business logic, API calls, route names, or data. Cost ratings are relative implementation/runtime cost, not measured benchmarks; no real-device profiling was done.

---

## 1. Environment and dependency baseline

From `package.json`:

| Item | Version / status |
|---|---|
| Expo SDK | `~58.0.26` |
| Expo Router | `~58.0.32` |
| React Native | `0.88.1` |
| React | `19.3.0` |
| UI kit | No Paper/Material You/NativeBase. `@expo/ui ~58.0.29` is installed but currently unused. |
| Icons | `@expo/vector-icons ^15.1.1` (Ionicons only in source), `expo-symbols ~58.0.5` installed but unused. |
| Animation | `react-native-reanimated 4.7.1`, `react-native-worklets 0.13.0`, `react-native-gesture-handler ~3.3.0` installed but unused. |
| Native chrome | `react-native-screens ~4.30.1`, `react-native-safe-area-context ~5.11.1`, `expo-status-bar ~58.0.5`, `expo-system-ui ~58.0.7`. |
| Feedback | `expo-haptics ~58.0.8` used in app code; not in shared primitives. |
| Materials | `expo-glass-effect ~58.0.5` installed but unused; `expo-blur` not installed. |
| Maps | `@rnmapbox/maps 10.3.19`, `@rnmapbox/navigation ^0.1.2`. |
| Other | `axios`, `zustand`, `expo-font`, `expo-image`, `expo-location`, `expo-secure-store`, `expo-web-browser`. |
| Config | `app.json:9` forces `userInterfaceStyle: "light"`; `app.json:20` disables Android predictive back; `app.json:6` locks portrait. |

**Dependency decision:** no new package is required for the native-feeling work in this audit. Already-installed APIs cover native tabs, native sheet presentations, SF Symbols/Material Symbols, platform colors, native controls, reduced motion, haptics, and safe areas. Optional packages that would need approval first: `expo-blur`, `expo-navigation-bar`, `react-native-keyboard-controller`, and any custom font package. Their bundle cost has not been measured and is deliberately excluded here.

---

## 2. Screen inventory

Expo Route groups `(auth)` and `(tabs)` do not appear in the URL. There are **20 route/layout files** under `src/app`.

| File | Route | Role / container |
|---|---|---|
| `src/app/_layout.tsx` | `/` root stack | Global header config, modal presentations, safe area/theme/bootstrap/status bar wrappers. |
| `src/app/index.tsx` | `/` | Auth redirect gate; no UI. |
| `src/app/(auth)/_layout.tsx` | `(auth)` | Headerless stack, `slide_from_right` on both platforms. |
| `src/app/(auth)/welcome.tsx` | `/welcome` | Onboarding, hero and two CTAs. |
| `src/app/(auth)/login.tsx` | `/login` | Sign-in form. |
| `src/app/(auth)/register.tsx` | `/register` | Registration form. |
| `src/app/(auth)/verify.tsx` | `/verify` | OTP verification. |
| `src/app/(tabs)/_layout.tsx` | `(tabs)` | Five-tab navigator with custom tab bar. |
| `src/app/(tabs)/index.tsx` | `/` tab root | Home: map, pickup, emergency CTA, active request, transport sheet. |
| `src/app/(tabs)/bookings.tsx` | `/bookings` | Activity list. |
| `src/app/(tabs)/wallet.tsx` | `/wallet` | Balance, top-up, transactions. |
| `src/app/(tabs)/vault.tsx` | `/vault` | HMO eligibility, savings goals. |
| `src/app/(tabs)/profile.tsx` | `/profile` | Identity, preferences, support, sign out. |
| `src/app/request/[mode].tsx` | `/request/[mode]` | Transport request form (`emergency`/`urgent`/`routine`). |
| `src/app/journey/setup.tsx` | `/journey/setup` | Device-local journey setup. |
| `src/app/journey/live.tsx` | `/journey/live` | Device-local journey tracking. |
| `src/app/booking/[id].tsx` | `/booking/[id]` | Live ambulance tracking, status panel, confirmations. |
| `src/app/booking/checkout.tsx` | `/booking/checkout` | Payment method chooser; router `presentation: 'modal'`. |
| `src/app/location-picker.tsx` | `/location-picker` | Search/GPS/pin pickup; router `presentation: 'modal'`. |
| `src/app/test-api.tsx` | `/test-api` | Diagnostics screen reachable from Profile. |

---

## 3. Shared component inventory

There are **26 files** in `src/components/ui` (25 component/helper modules plus `index.ts`). Current prop APIs are recorded so they can be preserved where possible.

| File | Purpose | Current prop API shape (summary) |
|---|---|---|
| `AppText.tsx` | Themed text, variant/color/center; default `maxFontSizeMultiplier=1.6`. | `TextProps` + `variant`, `color`, `center`, `style`. |
| `AppHeader.tsx` | In-screen title bar with optional back, subtitle, right slot. | `title`, `subtitle?`, `showBack?`, `onBack?`, `right?`, `compact?`, `hideDivider?`. |
| `Screen.tsx` | Safe-area screen shell with optional scroll/header/footer/keyboard/refresh. | `header?`, `footer?`, `scroll?`, `padded?`, `safeTop?`, `safeBottom?`, `avoidKeyboard?`, `refreshControl?`, content styles, scroll refs/handlers. |
| `Divider.tsx` | Themed horizontal rule. | `spacing?: 'sm' | 'md' | 'lg'`. |
| `SectionHeader.tsx` | Section label, subtitle, text action. | `title`, `subtitle?`, `actionLabel?`, `onAction?`, `icon?`. |
| `Card.tsx` | Rounded surface; pressable when handlers supplied. | `elevation?`, `onPress?`, `onLongPress?`, `borderColor?`, `background?`, `padded?`, `style?`, `accessibilityLabel?`. |
| `ListRow.tsx` | Settings/detail row; also exports `ListGroup`. | `icon?`, `title`, `value?`, `detail?`, `right?`, `onPress?`, `last?`, `destructive?`, `accessibilityLabel?`; `ListGroup` takes `style?`. |
| `Button.tsx` | Pressable action with variants, sizes, loading/disabled, icons. | `label`, `onPress`, `variant?`, `size?`, `icon?`, `iconEnd?`, `loading?`, `disabled?`, `fullWidth?`, `accessibilityLabel?`, `style?`. |
| `SemanticButtons.tsx` | `PrimaryButton`, `SecondaryButton`, `EmergencyButton` wrappers. | `Omit<ButtonProps,'variant'>`; `EmergencyButton` defaults `size='lg'`, `icon='medical'`. |
| `TextField.tsx` | Themed input with label/helper/error/icon/secure reveal/right slot. | `Omit<TextInputProps,'accessibilityLabel'>` + `label?`, `helper?`, `error?`, `icon?`, `secure?`, `right?`, `containerStyle?`, `accessibilityLabel?`, `inputRef?`. |
| `AppInput.tsx` | Semantic alias for `TextField`. | `TextFieldProps`. |
| `CodeInput.tsx` | Six-box OTP input over one hidden native input. | `value`, `onChange`, `length?`, `autoFocus?`, `disabled?`, `accessibilityLabel?`, `onSubmitEditing?`. |
| `ProgressBar.tsx` | Determinate progress bar with tone. | `value`, `tone?`, `height?`. |
| `BottomSheet.tsx` | Custom RN `Modal` sheet with scrim, grabber, header, scroll view. | `visible`, `onClose`, `title?`, `subtitle?`, `children`, `headerRight?`. |
| `ConfirmationSheet.tsx` | `BottomSheet` specialized for confirm/cancel. | `BottomSheetProps` minus children/headerRight + `message?`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `loading?`, `onConfirm`, `onCancel?`. |
| `Spinner.tsx` | `ActivityIndicator` wrapper. | `size?`, `color?`. |
| `Skeleton.tsx` | Pulsing placeholder; `SkeletonCard` composes lines. | `Skeleton`: `width?`, `height?`, `rounded?`; `SkeletonCard`: `lines?`. |
| `LoadingState.tsx` | First-load skeleton stack with caption. | `message?`, `lines?`, `compact?`. |
| `EmptyState.tsx` | Icon/title/message/optional action. | `icon?`, `title`, `message?`, `actionLabel?`, `onAction?`, `compact?`. |
| `ErrorState.tsx` | `EmptyState` with error defaults. | `Omit<EmptyStateProps,'title'> & { title?: string }`. |
| `Notice.tsx` | Inline status/feedback banner with optional action. | `text`, `tone?`, `actionLabel?`, `onAction?`. |
| `Avatar.tsx` | Initials circle; exports `initials()`. | `name`, `size?`. |
| `Badge.tsx` | Uppercase status chip. | `label`, `tone?`, `icon?`. |
| `StatusBadge.tsx` | Maps backend status to `Badge`. | `status`, `kind?`, `label?`, `tone?`, `icon?`. |
| `DomainCards.tsx` | `LocationCard`, `AmbulanceStatusCard`, `TripSummaryCard`. | Label/value/detail/action props; status and selection props; trip summary fields and `footer`. |
| `index.ts` | Barrel export. | No runtime props. |

**Platform code today:** only `src/components/MapCanvas.native.tsx` uses a platform-extension file. There are no `.ios.tsx` or `.android.tsx` files. `Platform.select` exists only in `theme/tokens.ts:236-245` for elevation. `Platform.OS` checks appear in `Screen`, `BottomSheet`, `AppHeader`, `Button`, `Card`, `ListRow`, `ThemeProvider`, and the tab layout. `@expo/ui`, `expo-symbols`, Reanimated, and Gesture Handler have zero source imports.

---

## 4. Native-fit findings by area

Cost key: **Low** = style/token/label change; **Medium** = component internals or navigator option migration; **High** = broad theming/system-chrome migration.

| Area | Current behavior / non-native issue | Conceptual fix, preserving routes/logic | Cost |
|---|---|---|---|
| Navigation / stack | Native `Stack` headers exist in `src/app/_layout.tsx:10-15,31-58`, but auth uses `slide_from_right` on Android (`(auth)/_layout.tsx:11`), and modal presentations are generic (`_layout.tsx:37,41`). No iOS large-title collapse configuration, no platform-specific transition. | Keep Expo Router stack. Use iOS large titles with scroll collapse where a native header owns the title; use platform-specific transition (`slide_from_right` iOS, fade/slide_from_bottom per Android convention). Use router `presentation: 'formSheet'`/`'modal'` where appropriate; keep native back button and swipe-back. | Medium |
| Android back | `app.json:20` sets `predictiveBackGestureEnabled: false`. | Enable predictive back for Android 14+ after checking sheet/stack behavior. | Low |
| Tabs | JS tab bar with custom height math, Ionicons filled/outline, capped 12px labels, Android active pill, haptic on every tab press (`(tabs)/_layout.tsx:12-24,29-37,45-109`). Labels do not really grow with font scale. | Use installed `expo-router/native-tabs` for iOS `UITabBar` and Android M3 navigation bar semantics; keep the same five routes. Use `NativeTabs.Trigger.Icon sf/md`. Note Android max 5 tabs, no nested tabs. | Medium |
| Headers | Several screens combine native stack headers with `Screen` default `safeTop`, adding extra inset (`booking/checkout.tsx:123`, `test-api.tsx:81`). Custom `AppHeader` appears inside the location-picker modal (`location-picker.tsx:300-309`), giving double chrome. Modal headers lack explicit dismiss actions. | Derive header typography fully from tokens; make `Screen` aware of native-header context; give modal screens a standard dismiss/close action; reserve `AppHeader` for headerless screens. | Low–Medium |
| Lists | All lists are `ScrollView + .map()`; no `FlatList`/`SectionList`. Examples: `bookings.tsx:136,143`, `wallet.tsx:219`, `vault.tsx:232-298`, `location-picker.tsx:393-403`, `request/[mode].tsx:427,471`. | Use virtualized lists for unbounded/growing collections while keeping the same card visuals and item order. Keep section headers as list section headers where possible. | Low–Medium |
| Forms | Always-visible labels, bordered fields, custom secure reveal (`TextField.tsx:43-52,74-87,102-110`); no native clear button, floating label, focused indicator, or invalid semantics. OTP uses six boxes over hidden input (`CodeInput.tsx:47-65,89-105`). | Keep prop APIs; update internals to platform-appropriate field treatments (iOS grouped/inset style, Android M3 outlined field) and add `accessibilityState.invalid`/error linking. Keep OTP autofill. | Medium |
| Buttons | One 44/56/58px rounded rect with border, full-width default, iOS opacity, Android ripple (`Button.tsx:52,63-88,92-95`). Not iOS filled/tinted nor M3 40dp/fully-rounded state-layer buttons. `EmergencyButton` is full-width filled red (`SemanticButtons.tsx:15-18`). | Keep props; add a platform adapter inside `Button`: iOS opacity/tint styles, Android M3 shapes/state layers; default `fullWidth=false` only if call sites are updated. Keep emergency red reserved. | Low–Medium |
| Sheets | Custom RN `Modal` with `animationType="slide"`, full-screen scrim, custom grabber, no detents/drag (`BottomSheet.tsx:35-42,56-70,103-118`). Used on Home, live journey, booking. | Keep `BottomSheetProps` as a facade; use router `formSheet` for navigation-sized flows and installed `@expo/ui` universal `BottomSheet` for detents/drag/scrim. | Medium |
| Alerts / confirmations | `Alert.alert` only in Profile (`profile.tsx:53,57-67`); all other confirmations are full-width red custom sheets (`ConfirmationSheet.tsx:36-61`). Inconsistent dialog language. | Use native iOS action sheet/confirmation dialog and Android `AlertDialog` via `@expo/ui` or RN `Alert` behind the existing `ConfirmationSheetProps`. Keep destructive styling and accessible labels. | Medium |
| Typography / Dynamic Type | Manrope forced everywhere (`tokens.ts:193-226`, loaded in `AppBootstrap.tsx:20-25`); global cap 1.6 (`AppText.tsx:24`), tab cap 1.4 (`(tabs)/_layout.tsx:14,75`); fixed line heights; JS-uppercased badges (`Badge.tsx:31-35`). | **Decision required:** user rules request system fonts; existing product rules require Manrope/light-only. If approved, use SF Pro/Roboto by default, real `dynamicTypeRamp`, higher/sensible cap (e.g. ~1.5–2.0), `textTransform: 'uppercase'`, and a declared fallback family. | Low–Medium; High if brand override rejected |
| Icons | Ionicons only; hardcoded 12–27px sizes; SF Symbols/Material Symbols installed but unused. | Add a single `Icon` adapter using `expo-symbols` with `ios`/`android`/`web` names; keep Ionicons only as web fallback if needed. Use `NativeTabs.Trigger.Icon sf/md`. | Low–Medium |
| Spacing / radii / shadows | Consistent 4pt spacing and custom radii (`tokens.ts:161-191`), but `elevation sm/md` are no-ops, only `lg` casts shadow, every card has a 1px border, and `HIT_SLOP`/`MIN_TAP` are unused (`tokens.ts:234-250`). | Use meaningful elevation presets on iOS/Android, M3 tonal surfaces instead of hairlines where appropriate, and consume `HIT_SLOP`/`MIN_TAP` for small controls. No blur/heavy shadows on Android. | Low |
| Motion / reduce motion | No Reanimated usage. Skeleton pulses forever (`Skeleton.tsx:14-25`); map camera easing and JS marker interpolation run at ~60fps (`MapCanvas.native.tsx:66-89,162-173,210-232,260-307`); RN Modal slide and auth slide transitions. No reduce-motion listener. | Use installed Reanimated `useReducedMotion()` and/or `AccessibilityInfo.reduceMotionChanged`. Animate transform/opacity only; static fallback for skeleton and map camera when reduced motion is on. | Low–Medium |
| Keyboard | `Screen` uses `behavior='padding'` iOS / `'height'` Android with fixed offset 8 (`Screen.tsx:90-99`); registration uses manual `measureLayout` reveal (`useKeyboardAwareScroll.ts:28-77`); `autoFocus` on Wallet, Location Picker, Verify can cover content. | Prefer Expo guidance: `behavior='padding'` iOS, avoid Android `height` double-adjust, use `useHeaderHeight()` for offset, delay/remove immediate `autoFocus`, add native Done affordance where helpful. | Low–Medium |
| Safe areas / status bar | Manual insets in `Screen`; footer can double bottom inset (`Screen.tsx:54-58,103-106`). Status bar always `style="dark"` (`_layout.tsx:21`). Native tabs automatically handle bottom insets and first `ScrollView` content inset. | Remove duplicate bottom padding when a native header/tab bar exists; use `StatusBar style="auto"` when appearance-aware theming is enabled. | Low |
| Dark mode / system colors | Forced light at config/theme/native-chrome level (`app.json:9`, `ThemeProvider.tsx:10-20`, `tokens.ts:14`, `_layout.tsx:21`). No `useColorScheme`, `PlatformColor`, or `DynamicColorIOS`. | **Decision required:** user rules request automatic dark mode; existing product rules require light-only. If approved, set `userInterfaceStyle: "automatic"`, add dark token set, resolve scheme in `useAppTheme`, use `StatusBar style="auto"`, and apply `PlatformColor`/`DynamicColorIOS` to native chrome. | Medium for native chrome; High for full dark palette |
| Haptics | Used in tab bar and ~11 screens, absent from shared `Button`, `Card`, `CodeInput`, `Notice`, `ConfirmationSheet`. Haptic on every tab press is non-standard. | Add restrained haptics at shared boundaries: selection, success, warning, destructive confirm, emergency. Remove per-tab haptic unless intentional. | Low |
| Accessibility | Generally decent labels, but gaps: `Badge` uppercases text in JS, `Notice` uses `role='alert'` for static content, `CodeInput` double labelling, `TextField` lacks invalid state, `Spinner`/progress lack full semantics, map markers mostly unlabelled, `BottomSheet` title not programmatically associated. | Normalize labels/roles/hints/values; use `textTransform` for visual uppercase; link `aria-labelledby`/`accessibilityLabelledBy` where available; label map markers as accessible actions. Preserve existing labels. | Low–Medium |
| WebView payment | `InterswitchGateway.tsx:27-50,78-81` injects/auto-submits HTML and takes over the whole screen. | Out of scope for pure UI pass; note as high cost and leave untouched. Do not change payment logic. | High |

---

## 5. Emergency UX audit

**Strengths found**
- Primary emergency action is pinned in the Home thumb-zone footer (`(tabs)/index.tsx:326-335`) and request footer (`request/[mode].tsx:275-298`).
- Emergency tap uses warning haptic, duplicate-request guard, and explicit confirmation (`(tabs)/index.tsx:148-155,397-410`).
- Clear “call local emergency number now” guidance on emergency screens (`request/[mode].tsx:322-327,627-629`).
- Dispatch callback phone required before submit (`request/[mode].tsx:204-207,549-557`).
- Assigned crew has a 44×44 `tel:` call action (`booking/[id].tsx:517-528`).
- Status copy tells user to stay at pickup and keep phone nearby (`booking/[id].tsx:83-90`).

**Gaps and fixes**

| Gap | Evidence | Fix | Cost |
|---|---|---|---|
| Dispatcher/crew call is not persistent during `REQUESTED`/`OFFERED`; only an “assigning…” message appears. | `booking/[id].tsx:338-362,507-534` | Add a persistent, visible call/support affordance on the tracking header/sheet from request creation, reusing existing phone data. No new contact data. | Low |
| Urgent/routine require sheet → form while emergency is one tap. | `(tabs)/index.tsx:337-395` | Give urgent/routine equal thumb-zone primary treatment through the existing sheet flow. Do not bypass confirmation. | Low |
| Red is diluted by routine network/validation errors and terminal statuses. | `wallet.tsx:199-205`, `checkout.tsx:147-153`, `vault.tsx:182-186,272-275`, `booking/[id].tsx:319,538-540`, `test-api.tsx:113-119` | Reserve red for emergency/destructive; use neutral/warning tones for ordinary validation and non-emergency failures. Keep color as one of several signals (icon/text). | Low |
| Medical ID / Emergency Contacts are placeholders while labelled “responders see first”. | `profile.tsx:121-133` | Make the placeholder copy explicit (“Not set up yet”) and avoid implying responder-visible data exists. No data change. | Low |
| Moving-pickup sharing consent sits mid-scroll and only works while the booking screen is open. | `booking/[id].tsx:413-469,620-632` | Surface the consent action as a pinned/near-header control while active, preserving the same explicit confirmation and foreground-only behavior. | Low |
| No native emergency-call shortcut from tracking header. | `booking/[id].tsx:338-362` | Reuse existing `tel:` action in a native header action/menu if available. Verify local emergency number before release. | Low |

Per the handoff, the UI must never claim a dispatch was sent without backend acknowledgement, never show stale location as live, never silently substitute a default location, and never promise an arrival time without reliable provider/routing data. These rules were preserved in the audit.

---

## 6. Low-end Android and performance

| Concern | Evidence | Fix / mitigation | Cost |
|---|---|---|---|
| Mapbox vector tiles, 3D buildings, pitched follow camera, and 1200ms easing on the live emergency screen. | `MapCanvas.native.tsx:162-173,210-232,260-307`; `booking/[id].tsx:326-337` | Gate decorative extras (3D buildings, camera easing/pitch) behind a simple device/quality or reduce-motion check; keep the map and polling intact. | Low–Medium |
| Per-frame JS marker interpolation via `requestAnimationFrame`. | `MapCanvas.native.tsx:66-89` | Use Reanimated/native driver for transform/opacity, or reduce update frequency; keep UI-thread work out of the render loop. | Medium |
| 3s tracking poll and 10s active-request poll cause repeated map/route recomputation. | `booking/[id].tsx:56,164-171,182-240`; `(tabs)/index.tsx:117-121` | Memoize derived map props and only recompute route/focus when coordinates actually change. Do not change polling intervals or data. | Medium |
| All lists are unvirtualized. | See section 4 “Lists” | Use `FlatList`/`SectionList` for growing collections; preserve card visuals. | Low–Medium |
| Skeleton pulse creates one animation per line. | `Skeleton.tsx:14-25` | Share one animation driver or respect reduce motion; no visual redesign needed. | Low |
| WebView payment takeover reparses/injects HTML and loads remote gateway. | `InterswitchGateway.tsx:25-50,78-81` | Leave unchanged in this UI pass; flag as high memory cost and out of scope. | High |
| Blocking `LoadingState` on live-tracking entry. | `booking/[id].tsx:298-303` | Replace with skeleton that keeps map/status context visible. | Low |
| Font gate holds splash until Manrope loads. | `AppBootstrap.tsx:20-42` | If system fonts are approved, remove/reduce this gate; otherwise keep but confirm fallback. | Low |
| Insurer chips ~32px tall. | `vault.tsx:148-169,312` | Raise to at least 48dp or add `hitSlop`. | Low |
| Positive: no blur/glass use, no large local images, `lg` shadows unused, most primary controls ≥44px. | `tokens.ts:234-245`; `Button.tsx:52`; `ListRow.tsx:115` | Preserve these constraints during implementation. | — |

Test requirement after implementation: largest font size, dark mode, and 3G throttling on a low/mid-range Android device plus a physical iPhone.

---

## 7. Expo SDK 58 capability checks (official docs)

These checks determine what can be used without new dependencies.

- **Native tabs:** supported. `import { NativeTabs } from 'expo-router/native-tabs'`. Android max 5 tabs; no nested tabs; Android 11+ required for `tabBarRespectsIMEInsets`; iOS 26+ system Liquid Glass ignores custom tab-bar background/blur/shadow props. Docs: [SDK 58 NativeTabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs.md), [native tabs guide](https://docs.expo.dev/router/advanced/native-tabs.md).
- **Native sheets/modals:** supported via `Stack.Screen options={{ presentation: 'formSheet', sheetAllowedDetents: [...], sheetInitialDetentIndex, sheetCornerRadius }}`. Other presentations: `card`, `modal`, `transparentModal`, `containedModal`, `containedTransparentModal`, `fullScreenModal`. Android form sheets do not support native stack headers or nested stacks; render headers/actions inside content. Deep-linked modals need `unstable_settings.anchor`. Docs: [modals guide](https://docs.expo.dev/router/advanced/modals.md).
- **`@expo/ui`:** installed; universal `BottomSheet`, `Button`, `Checkbox`, `Picker`, `Slider`, `Switch`, `TextInput`, `Icon`, `Host`; Jetpack `ModalBottomSheet`, `Snackbar`, `DateTimePicker`, `NavigationBar`; SwiftUI `Alert`, `ConfirmationDialog`, `DatePicker`, `ContextMenu`, `SwipeActions`. Must wrap in `Host`; Yoga/flexbox is unavailable inside the native context. Docs: [SDK 58 UI](https://docs.expo.dev/versions/v58.0.0/sdk/ui.md).
- **Fonts / Dynamic Type:** if no `fontFamily` is set, Android uses Roboto and iOS uses SF Pro. RN 0.88 `Text` supports `dynamicTypeRamp`, `allowFontScaling`, and `maxFontSizeMultiplier`. Custom fonts are bundled and add weight. Docs: [fonts](https://docs.expo.dev/develop/user-interface/fonts.md#platform-built-in-fonts), [RN 0.88 Text](https://reactnative.dev/docs/0.88/text).
- **Icons:** `expo-symbols` provides SF Symbols on iOS and Material Symbols on Android/web; plain strings are SF Symbols and iOS-only. `NativeTabs.Trigger.Icon sf/md` is preferred for tabs. `@expo/vector-icons` is deprecated but available. Docs: [SDK 58 Symbols](https://docs.expo.dev/versions/v58.0.0/sdk/symbols.md), [icons guide](https://docs.expo.dev/guides/icons.md).
- **Colors / dark mode:** RN `PlatformColor` and `DynamicColorIOS` are available. `userInterfaceStyle: "automatic"` follows the system; Android needs `expo-system-ui` (installed). `StatusBar style="auto"` follows the active scheme. Android bottom-bar customization would need `expo-navigation-bar` (not installed; approval required). Docs: [PlatformColor](https://reactnative.dev/docs/0.88/platformcolor), [DynamicColorIOS](https://reactnative.dev/docs/0.88/dynamiccolorios), [color themes](https://docs.expo.dev/develop/user-interface/color-themes.md), [SDK 58 StatusBar](https://docs.expo.dev/versions/v58.0.0/sdk/status-bar.md#style), [system bars](https://docs.expo.dev/develop/user-interface/system-bars.md).
- **Native controls:** RN core `Switch`, `Alert`, `ActivityIndicator`, `RefreshControl`, `Modal` are available without new deps. `@expo/ui` covers date/time pickers and Material/SwiftUI controls. Docs: [RN Switch](https://reactnative.dev/docs/0.88/switch), [RN Alert](https://reactnative.dev/docs/0.88/alert), [RN ActivityIndicator](https://reactnative.dev/docs/0.88/activityindicator), [RN RefreshControl](https://reactnative.dev/docs/0.88/refreshcontrol), [date-time picker](https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker.md).
- **Reduced motion:** `useReducedMotion()` from installed Reanimated; note setting changes do not trigger rerender, so use `AccessibilityInfo.reduceMotionChanged` for live updates. Docs: [useReducedMotion](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/), [AccessibilityInfo](https://reactnative.dev/docs/0.88/accessibilityinfo).
- **Keyboard:** Expo recommends `KeyboardAvoidingView behavior="padding"` on iOS; Android is edge-to-edge and does not resize. Do not combine `padding` with `softwareKeyboardLayoutMode: "pan"`. Advanced controller would need approval. Docs: [keyboard handling](https://docs.expo.dev/guides/keyboard-handling.md).
- **Glass/blur:** `expo-glass-effect` is iOS/tvOS only and requires availability/reduce-transparency checks. Prefer system-provided glass from native tabs/headers. Docs: [SDK 58 GlassEffect](https://docs.expo.dev/versions/v58.0.0/sdk/glass-effect.md).

Full index consulted: [Expo llms.txt](https://docs.expo.dev/llms.txt) and [SDK 58 index](https://docs.expo.dev/versions/v58.0.0/).

---

## 8. Decisions required before Step 2

1. **Fonts:** your new rules ask for San Francisco/Roboto system fonts; existing project rules require Manrope. Which wins? Recommended for native feel: system fonts, keeping brand only in the logo/wordmark.
2. **Appearance:** your new rules ask for automatic dark mode/system colors; existing project rules require light mode only. Which wins? Recommended for native feel: `automatic` with a full dark token set; otherwise keep light-only and still adopt native chrome behavior.
3. **Commits:** you asked for small commits one component/screen per commit during implementation. No commits have been made in this audit step. Confirm you want commits as we go (given the working tree already has many uncommitted changes).
4. **Payment WebView:** this remains untouched; it is high cost and outside UI-only native-feeling work unless you explicitly include it.

No dependency needs approval for the recommended plan. If we later need `expo-navigation-bar`, `expo-blur`, `react-native-keyboard-controller`, or custom font packages, I will ask first and report bundle cost before adding.

---

## 9. Proposed implementation order (for approval)

This maps to your requested order and keeps prop APIs unchanged where possible.

1. **Theme + adapters:** one appearance-aware theme file (pending decision), platform `Icon`, platform `Sheet`, platform `Screen header`; use installed Expo/RN primitives only.
2. **Shared components in place:** `Screen`, `AppHeader`, `Card`, `Button`/`SemanticButtons`, `TextField`/`AppInput`, `CodeInput`, `Notice`, `ListRow`/`ListGroup`, tab bar, sheets/confirmations, loading states. Update call sites only if a prop must change.
3. **Screens:** auth → Dispatch/booking → trip status → Activity → Profile → Vault → Wallet. Home/request are part of Dispatch/booking and keep emergency-first layout.

Each component/screen will be verified with `npx.cmd tsc --noEmit`, `npx.cmd expo lint`, and `npx.cmd expo export --platform web --output-dir dist` before declaring it done.

---

## 10. Verification plan after approval

**iOS (physical iPhone and simulator):**
- Large titles collapse on scroll where applicable; native back/swipe-back works once after the recent double-nav fix.
- Sheet detents/grabber/drag and action-sheet confirmations behave natively.
- Dynamic Type at largest setting: no truncation of emergency CTA, OTP, booking status, or dispatcher call.
- Dark mode (if approved): System settings light/dark while app open; native headers/tab bar/colors update; status bar remains legible.
- Haptics only on consequential actions; reduce motion disables skeleton/map/transition motion.

**Android (low/mid-range physical device + emulator):**
- Edge-to-edge with correct top app bar and bottom insets; predictive back works on Android 14+.
- M3 buttons/cards/fields show ripple/state layers; no blur/heavy shadows; primary actions still ≥48dp.
- Largest font scale: no clipped labels, especially insurer chips, tabs, and emergency footer.
- Dark mode (if approved): system dark theme applies without emergency-red contrast loss.
- 3G throttling: skeleton context stays visible, map extras degrade gracefully, polling does not freeze UI.

**Both:** double-tap modal buttons still open one screen only; one back returns cleanly; Google attribution remains visible where backend location results are shown; no fake live/arrival/availability state introduced.

---

## 11. Known gaps / limits of this audit

- No real-device testing was performed; nothing here claims native parity.
- No profiling or bundle-size measurement was performed; costs are estimates.
- `@expo/ui` native host views need careful integration; flexbox is unavailable inside them.
- Android form sheets cannot use native stack headers or nested navigators.
- Native tabs are capped at five tabs on Android (current app has exactly five) and cannot be nested.
- System-font/dark-mode work is blocked on your decision because it conflicts with existing brand rules.
- Payment WebView and backend/API behavior are explicitly out of scope.
- The requested handoff file was outside the repo; if you intended a different file, point me to it before implementation.

---

## Step 1 report

- **Files changed:** `docs/ui-audit.md` (created). No code files changed.
- **What is now more native and why:** nothing yet — this step was audit only.
- **How to test:** see section 10; device testing is required after implementation.
- **Known gaps:** see section 11.

**Awaiting your approval to start Step 2. No implementation will begin until you confirm.**
