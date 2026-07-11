import { useState } from 'react'

// A one-time "drag to rotate" style hint for a touch/pointer-driven canvas.
// Shown on first render of the session, dismissed on the first pointer or touch
// interaction anywhere on the returned bind target, and never shown again for
// the rest of the tab's session (sessionStorage, so it resets on a fresh tab
// but not on every route switch back to the same page).
export function useDragHint(key) {
  const storageKey = `dragHint:${key}`
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey) !== '1'
    } catch {
      return true
    }
  })

  const dismiss = () => {
    if (!visible) return
    setVisible(false)
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      /* sessionStorage unavailable (private mode) - hint just won't persist */
    }
  }

  const bind = { onPointerDown: dismiss, onTouchStart: dismiss }
  return [visible, bind]
}
