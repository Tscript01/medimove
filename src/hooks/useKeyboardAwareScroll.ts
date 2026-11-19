import { useCallback, useEffect, useRef, type ComponentRef, type RefObject } from 'react'
import {
  Keyboard,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native'

type InputRef = RefObject<ComponentRef<typeof TextInput> | null>

/**
 * Keeps focused fields visible while the keyboard is open.
 *
 * The field is revealed twice: once on focus for an already-open keyboard, and
 * again after `keyboardDidShow` so Android's adjustResize/iOS's
 * KeyboardAvoidingView layout has settled before measuring.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollViewInstance>(null)
  const scrollY = useRef(0)
  const activeInputRef = useRef<InputRef | null>(null)

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y
  }, [])

  const revealInput = useCallback((inputRef: InputRef) => {
    const scrollView = scrollRef.current
    const input = inputRef.current
    if (!scrollView || !input) return

    input.measureLayout(
      scrollView,
      (_x, y, _width, height) => {
        scrollView.measure((_sx, _sy, _scrollWidth, scrollViewHeight) => {
          const margin = 16
          const inputBottom = y + height + margin
          if (inputBottom > scrollViewHeight) {
            scrollView.scrollTo({
              y: Math.max(0, scrollY.current + inputBottom - scrollViewHeight),
              animated: true,
            })
          }
        })
      },
      () => {},
    )
  }, [])

  const revealOnFocus = useCallback(
    (inputRef: InputRef) => {
      activeInputRef.current = inputRef
      requestAnimationFrame(() => revealInput(inputRef))
    },
    [revealInput],
  )

  useEffect(() => {
    const handleKeyboardShow = () => {
      if (!activeInputRef.current) return
      requestAnimationFrame(() => {
        if (activeInputRef.current) revealInput(activeInputRef.current)
      })
    }
    const handleKeyboardHide = () => {
      activeInputRef.current = null
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow)
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [revealInput])

  return { scrollRef, onScroll, revealInput: revealOnFocus }
}
