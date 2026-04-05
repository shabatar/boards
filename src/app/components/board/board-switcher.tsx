'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronsUpDown, LayoutDashboard } from 'lucide-react'
import { getUserBoards } from '@/app/(app)/boards/[boardId]/actions'

interface BoardSwitcherProps {
  currentBoardId: string
  currentTitle: string
}

export function BoardSwitcher({ currentBoardId, currentTitle }: BoardSwitcherProps) {
  const [boards, setBoards] = useState<Array<{ id: string; title: string }>>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) getUserBoards().then(setBoards)
  }, [open])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-text transition-colors hover:bg-bg-surface">
        {currentTitle}
        <ChevronsUpDown size={12} className="text-text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] max-w-[280px] rounded-xl border border-border bg-bg-elevated p-1 shadow-xl"
          sideOffset={8}
          align="start"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Switch board
          </DropdownMenu.Label>

          {boards.map((b) => (
            <DropdownMenu.Item
              key={b.id}
              className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-text outline-none transition-colors hover:bg-accent-subtle hover:text-accent data-[highlighted]:bg-accent-subtle data-[highlighted]:text-accent"
              onSelect={() => {
                if (b.id !== currentBoardId) router.push(`/boards/${b.id}`)
              }}
            >
              <span className="truncate">{b.title}</span>
              {b.id === currentBoardId && (
                <span className="ml-auto text-[10px] text-text-muted">current</span>
              )}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary outline-none transition-colors hover:bg-accent-subtle hover:text-accent data-[highlighted]:bg-accent-subtle data-[highlighted]:text-accent"
            onSelect={() => router.push('/dashboard')}
          >
            <LayoutDashboard size={14} />
            All boards
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
