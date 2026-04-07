'use client'

import { useEffect, useState } from 'react'

/**
 * Tiny localStorage-backed value with a pub/sub so multiple readers stay
 * in sync without pulling in a store. Returns a get/set pair plus a hook.
 */
export function createPersistedValue<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T = (raw) => JSON.parse(raw) as T,
  serialize: (value: T) => string = (v) => JSON.stringify(v),
) {
  const subscribers = new Set<() => void>()

  function get(): T {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      return raw == null ? defaultValue : parse(raw)
    } catch {
      return defaultValue
    }
  }

  function set(value: T) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, serialize(value))
    } catch {
      // ignore quota / private mode errors
    }
    subscribers.forEach((fn) => fn())
  }

  function useValue(): T {
    const [value, setValue] = useState<T>(defaultValue)
    useEffect(() => {
      setValue(get())
      const update = () => setValue(get())
      subscribers.add(update)
      return () => {
        subscribers.delete(update)
      }
    }, [])
    return value
  }

  return { get, set, useValue }
}
