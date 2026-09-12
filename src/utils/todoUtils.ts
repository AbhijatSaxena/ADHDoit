import type { Todo } from '../types'

/**
 * Build an id→Todo index once, then reuse it for O(1) lookups.
 * Pass this to the *ByMap helpers when checking many todos in a loop
 * to avoid the O(n²) cost of repeated Array.find().
 */
export function indexTodos(allTodos: Todo[]): Map<string, Todo> {
  const m = new Map<string, Todo>()
  for (const t of allTodos) m.set(t.id, t)
  return m
}

/**
 * Returns dep IDs that are genuinely pending (not done).
 * Works whether `allTodos` includes done todos or not — deps absent from
 * the array are treated as already done (they were filtered out).
 */
export function getPendingBlockers(todo: Todo, allTodos: Todo[]): string[] {
  return getPendingBlockersByMap(todo, indexTodos(allTodos))
}

/** Map-backed variant — O(deps) per call. Prefer this inside loops. */
export function getPendingBlockersByMap(todo: Todo, byId: Map<string, Todo>): string[] {
  return (todo.dependsOn ?? []).filter(id => {
    const dep = byId.get(id)
    return dep !== undefined && !dep.done
  })
}

export function isTodoBlocked(todo: Todo, allTodos: Todo[]): boolean {
  return getPendingBlockers(todo, allTodos).length > 0
}

export function isTodoBlockedByMap(todo: Todo, byId: Map<string, Todo>): boolean {
  return getPendingBlockersByMap(todo, byId).length > 0
}

/**
 * True if linking `newDepId` as a blocker of `targetId` would form a cycle.
 * (i.e. targetId is already reachable by following dependsOn edges from newDepId.)
 * Single shared implementation — used by TodoGraph and TodoDetailPanel.
 */
export function wouldCreateCycle(todos: Todo[], targetId: string, newDepId: string): boolean {
  if (targetId === newDepId) return true
  const byId = indexTodos(todos)
  const visited = new Set<string>()
  const stack = [newDepId]
  while (stack.length) {
    const id = stack.pop()!
    if (id === targetId) return true
    if (visited.has(id)) continue
    visited.add(id)
    const todo = byId.get(id)
    if (todo) for (const d of todo.dependsOn ?? []) stack.push(d)
  }
  return false
}
