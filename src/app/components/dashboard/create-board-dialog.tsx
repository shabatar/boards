'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import { createBoard } from '@/app/(app)/dashboard/actions'
import toast from 'react-hot-toast'
import { track } from '@/lib/analytics'

export function CreateBoardDialog({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setPending(true)
    const result = await createBoard(formData)
    setPending(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    setOpen(false)
    track('board_created')
    router.push(`/boards/${result.id}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">
        <Plus size={16} aria-hidden />
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text">
              New board
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Create a new board</Dialog.Description>

          <form action={handleSubmit}>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              autoFocus
              placeholder="Untitled Board"
              className="mb-5 w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? 'Creating...' : 'Create board'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
