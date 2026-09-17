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
 * Returns the todo(s) that currently list `childId` in their dependsOn —
 * i.e. the parent(s) `childId` is blocking. By convention a child should
 * only ever have one parent; this returns all matches defensively in case
 * data ever drifts, so callers can decide how to handle it.
 */
export function findParentsOf(childId: string, todos: Todo[]): Todo[] {
  return todos.filter(t => (t.dependsOn ?? []).includes(childId))
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

export interface TodoSpace {
  id: string          // stable-ish id: a root todo id, or 'unsorted'
  name: string         // display name, derived from the tree's top node(s)
  todoIds: Set<string> // member todo ids (subset of the input array)
}

/**
 * Groups todos into independent connected "spaces" (trees) based on
 * dependsOn edges, treated as undirected. Todos with no connections at all
 * are bucketed into a single 'unsorted' space instead of getting their own.
 * Each real tree is named after its root(s) — the member(s) with no other
 * member depending on them within that component.
 */
export function computeSpaces(todos: Todo[]): TodoSpace[] {
  const byId = indexTodos(todos)

  // Union-Find over dependsOn edges (undirected)
  const parent = new Map<string, string>()
  for (const t of todos) parent.set(t.id, t.id)

  function find(x: string): string {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    while (parent.get(x) !== root) {
      const next = parent.get(x)!
      parent.set(x, root)
      x = next
    }
    return root
  }
  function union(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const t of todos) {
    for (const depId of t.dependsOn ?? []) {
      if (byId.has(depId)) union(t.id, depId)
    }
  }

  const groups = new Map<string, string[]>()
  for (const t of todos) {
    const root = find(t.id)
    const arr = groups.get(root)
    if (arr) arr.push(t.id)
    else groups.set(root, [t.id])
  }

  const spaces: TodoSpace[] = []
  const unsorted: string[] = []

  for (const memberIds of groups.values()) {
    if (memberIds.length === 1) {
      unsorted.push(memberIds[0])
      continue
    }
    const memberSet = new Set(memberIds)
    // Roots of this component: members nobody else in the component depends on
    const tops = memberIds.filter(id =>
      !memberIds.some(otherId => otherId !== id && (byId.get(otherId)?.dependsOn ?? []).includes(id))
    )
    let name: string
    if (tops.length === 1) {
      name = byId.get(tops[0])?.text ?? 'Untitled'
    } else if (tops.length > 1) {
      const names = tops.slice(0, 2).map(id => byId.get(id)?.text ?? '?')
      name = tops.length > 2 ? `${names.join(', ')} +${tops.length - 2}` : names.join(' & ')
    } else {
      name = 'Untitled'
    }
    spaces.push({ id: tops[0] ?? memberIds[0], name, todoIds: memberSet })
  }

  spaces.sort((a, b) => b.todoIds.size - a.todoIds.size)

  if (unsorted.length > 0) {
    spaces.push({ id: 'unsorted', name: 'Unsorted', todoIds: new Set(unsorted) })
  }

  return spaces
}
