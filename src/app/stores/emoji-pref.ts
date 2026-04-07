'use client'

import { createPersistedValue } from '@/lib/persisted-value'

const emojiPref = createPersistedValue<string>(
  'boards.currentEmoji',
  '✅',
  (raw) => raw,
  (v) => v,
)

export const getCurrentEmoji = emojiPref.get
export const setCurrentEmoji = emojiPref.set
export const useCurrentEmoji = emojiPref.useValue
