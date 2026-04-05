'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 100

export async function login(
  _prevState: { error: string; email?: string } | null,
  formData: FormData
): Promise<{ error: string; email?: string }> {
  const email = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''

  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Please enter a valid email address', email }
  }
  if (!password) {
    return { error: 'Password is required', email }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message, email }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(
  _prevState: { error: string; email?: string; displayName?: string } | null,
  formData: FormData
): Promise<{ error: string; email?: string; displayName?: string }> {
  const email = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''
  const displayName = (formData.get('displayName') as string ?? '').trim().slice(0, MAX_NAME_LENGTH)

  if (!displayName) {
    return { error: 'Name is required', email, displayName }
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Please enter a valid email address', email, displayName }
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters', email, displayName }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) {
    return { error: error.message, email, displayName }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
