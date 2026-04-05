'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, null)

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-text">Create account</h1>
      <p className="mb-6 text-sm text-text-muted">Start collaborating on Boards</p>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            autoComplete="name"
            defaultValue={state?.displayName ?? ''}
            key={`name-${state?.displayName ?? ''}`}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.email ?? ''}
            key={`email-${state?.email ?? ''}`}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
