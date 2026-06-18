import { useState, useEffect } from 'react'

export function useScreenshotProtection() {
  const [protectedActive, setProtectedActive] = useState(false)

  useEffect(() => {
    const handleBlur = () => {
      setProtectedActive(true)
    }

    const handleFocus = () => {
      setProtectedActive(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Intercept PrintScreen key
      if (e.key === 'PrintScreen') {
        setProtectedActive(true)
        // Clear clipboard buffer or replace it with warning text
        navigator.clipboard.writeText('Screenshots are disabled on this page.').catch(() => {})
      }

      // 2. Intercept Win + Shift + S or copy key combos if possible (focus loss handles this best)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        setProtectedActive(true)
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('keydown', handleKeyDown)

    // Check initially if the window does not have focus
    if (!document.hasFocus()) {
      setProtectedActive(true)
    }

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return protectedActive
}
