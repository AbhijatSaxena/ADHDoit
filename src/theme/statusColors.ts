import type { Todo } from '../types'

export type TodoStatus = 'done' | 'focused' | 'paused' | 'blocked' | 'available'

export interface StatusPalette {
  accent: string   // left border / dot accent
  border: string   // card border
  bg: string       // card background
  text: string     // primary text
  status: string   // status label text
  label: string    // status label with glyph
}

/**
 * Single source of truth for todo status colors.
 * Values match the original inline hex codes used across TodoGraph,
 * MobileTodoList, TodosPage and the priority list — keep them in sync here.
 */
export const statusColors: Record<TodoStatus, StatusPalette> = {
  done:      { accent: '#4b5563', border: '#374151', bg: '#161b24', text: '#9ca3af', status: '#9ca3af', label: '✓ Done' },
  focused:   { accent: '#f59e0b', border: '#b45309', bg: '#1c0a00', text: '#fef3c7', status: '#fbbf24', label: '⏱ Focused' },
  paused:    { accent: '#f97316', border: '#9a3412', bg: '#1c0a00', text: '#fed7aa', status: '#fb923c', label: '⏸ Paused' },
  blocked:   { accent: '#f87171', border: '#7f1d1d', bg: '#1c0a0a', text: '#e5e7eb', status: '#fca5a5', label: '🔒 Blocked' },
  available: { accent: '#22c55e', border: '#166534', bg: '#052e16', text: '#d1fae5', status: '#4ade80', label: '● Ready' },
}

export function statusOf(
  todo: Todo,
  opts: { focused?: boolean; paused?: boolean; blocked?: boolean } = {},
): TodoStatus {
  if (todo.done) return 'done'
  if (opts.focused) return opts.paused ? 'paused' : 'focused'
  if (opts.blocked) return 'blocked'
  return 'available'
}
