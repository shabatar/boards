import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const fontMap: Record<string, string> = {
  sans: 'var(--font-geist-sans), system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'var(--font-geist-mono), ui-monospace, monospace',
  consolas: 'Consolas, "Courier New", monospace',
}
