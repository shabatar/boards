'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Share2, X, UserMinus, Link2, Check, Copy } from 'lucide-react'
import {
  addMember,
  removeMember,
  getMembers,
  getOrCreateShareToken,
  type MemberWithProfile,
} from '@/app/(app)/boards/[boardId]/actions'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  boardId: string
  isOwner: boolean
}

export function ShareDialog({ boardId, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [pending, setPending] = useState(false)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      getMembers(boardId).then(setMembers)
    }
  }, [open, boardId])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setShareLink(null)
      setCopied(false)
    }
  }

  async function handleGetLink() {
    const result = await getOrCreateShareToken(boardId, shareRole)
    if ('error' in result) { toast.error(result.error); return }
    const url = `${window.location.origin}/shared/${result.token}`
    setShareLink(url)
  }

  async function handleCopy() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Link copied!', { duration: 1500 })
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setPending(true)
    const result = await addMember(boardId, email, role)
    setPending(false)
    if ('error' in result) { toast.error(result.error); return }
    toast.success('Member added')
    setEmail('')
    getMembers(boardId).then(setMembers)
  }

  async function handleRemove(userId: string) {
    const result = await removeMember(boardId, userId)
    if ('error' in result) { toast.error(result.error); return }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent">
        <Share2 size={14} />
        Share
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text">Share board</Dialog.Title>
            <Dialog.Close aria-label="Close" className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Share this board via link or invite by email</Dialog.Description>

          {/* ── Share link section ── */}
          {isOwner && (
            <div className="mb-5 rounded-xl border border-border bg-bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                <Link2 size={12} />
                Share link
              </div>
              <div className="mb-2 flex items-center gap-2">
                <select
                  value={shareRole}
                  onChange={(e) => { setShareRole(e.target.value as 'editor' | 'viewer'); setShareLink(null) }}
                  className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text-secondary outline-none"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">View only</option>
                </select>
                {shareLink ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <input
                      readOnly
                      value={shareLink}
                      className="flex-1 truncate rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text-secondary outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGetLink}
                    className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg hover:text-text"
                  >
                    Generate link
                  </button>
                )}
              </div>
              <p className="text-[10px] text-text-muted">
                Anyone with this link can join as {shareRole === 'editor' ? 'an editor' : 'a viewer'}
              </p>
            </div>
          )}

          {/* ── Invite by email ── */}
          {isOwner && (
            <form onSubmit={handleInvite} className="mb-5">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                Invite by email
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1 rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                  className="rounded-lg border border-border bg-bg-surface px-2 py-2 text-xs text-text-secondary outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {pending ? '…' : 'Invite'}
                </button>
              </div>
            </form>
          )}

          {/* ── Members list ── */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Members
            </div>
            <div className="space-y-1">
              {members.length === 0 ? (
                <p className="py-3 text-center text-sm text-text-muted">No members yet</p>
              ) : (
                members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-bg-surface">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{m.display_name || m.email}</p>
                      {m.display_name && <p className="truncate text-xs text-text-muted">{m.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        m.role === 'editor' ? 'bg-accent-subtle text-accent' : 'bg-bg-surface text-text-muted',
                      )}>
                        {m.role}
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleRemove(m.user_id)}
                          className="rounded-lg p-1 text-text-muted transition-colors hover:bg-accent-subtle hover:text-destructive"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
