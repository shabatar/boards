import { ThemeToggle } from '@/app/components/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-8 shadow-lg transition-colors">
        {children}
      </div>
    </div>
  )
}
