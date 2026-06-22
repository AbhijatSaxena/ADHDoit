export interface Todo {
  id: string
  text: string
  order: number
  done: boolean
  archived?: boolean
  commentCount?: number
  dependsOn?: string[]  // IDs of todos that must be completed first
  focusMs?: number      // total ms spent in focus across all sessions
}

export interface TodoComment {
  id: string
  text: string
  authorName: string
  createdAt: number  // epoch ms
}
