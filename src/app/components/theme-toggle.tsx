'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

export function ThemeToggle() {
  const [state, setState] = useState<{ mounted: boolean; dark: boolean }>({
    mounted: false,
    dark: false,
  })

  useEffect(() => {
    // Initial read of theme state after mount — intentional one-time sync
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ mounted: true, dark: isDarkMode() })

    const observer = new MutationObserver(() => {
      setState({ mounted: true, dark: isDarkMode() })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function toggle() {
    const next = !state.dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!state.mounted) return <div className="h-8 w-8" />

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary"
      title={state.dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {state.dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  )
}
