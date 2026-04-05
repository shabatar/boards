'use client'

import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { deleteBoard } from '@/app/(app)/dashboard/actions'
import type { Board } from '@/lib/types/database'
import toast from 'react-hot-toast'
import { track } from '@/lib/analytics'

interface BoardCardProps {
  board: Board
  isOwner: boolean
  ownerName?: string
}

export function BoardCard({ board, isOwner, ownerName }: BoardCardProps) {
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const result = await deleteBoard(board.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    track('board_deleted')
  }

  return (
    <Link
      href={`/boards/${board.id}`}
      className="group block rounded-2xl border border-border bg-bg-elevated p-5 shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-text">{board.title}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {new Date(board.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {!isOwner && ownerName && (
              <span className="text-xs text-text-muted">
                · by {ownerName}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              onClick={(e) => e.preventDefault()}
              className="rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-bg-surface hover:text-text-secondary group-hover:opacity-100"
            >
              <MoreHorizontal size={16} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[140px] rounded-xl border border-border bg-bg-elevated p-1 shadow-xl"
                align="end"
                sideOffset={4}
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive outline-none hover:bg-accent-subtle"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </Link>
  )
}
