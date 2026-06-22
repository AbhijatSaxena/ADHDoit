import { useEffect, useRef, useState } from 'react'
import {
  Drawer, Box, Typography, IconButton, Tabs, Tab, TextField, Button,
  CircularProgress, Checkbox,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AdjustOutlinedIcon from '@mui/icons-material/AdjustOutlined'
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import type { Todo } from '../types'
import { isTodoBlocked } from '../utils/todoUtils'
import { fmtMs } from '../lib/fmt'
import { useCommentStore } from '../store/commentStore'
import { useTodoStore } from '../store/todoStore'
import { confirm } from './ConfirmDialog'

interface Props {
  todo: Todo
  todos: Todo[]
  onClose: () => void
  onDepsChange: (todo: Todo, deps: string[]) => void
  focusedId: string | null
  paused: boolean
  accMs: number
  onFocus: (id: string) => void
  onPause: () => void
  onResume: () => void
  onUnfocus: () => void
}

type TabId = 0 | 1

function wouldCreateCycle(todos: Todo[], targetId: string, newDepId: string): boolean {
  const visited = new Set<string>()
  function reaches(id: string): boolean {
    if (id === targetId) return true
    if (visited.has(id)) return false
    visited.add(id)
    return (todos.find(t => t.id === id)?.dependsOn ?? []).some(reaches)
  }
  return reaches(newDepId)
}

export default function TodoDetailPanel({ todo, todos, onClose, onDepsChange, focusedId, paused, accMs, onFocus, onPause, onResume, onUnfocus }: Props) {
  const [tab, setTab] = useState<TabId>(0)
  const [commentText, setCommentText] = useState('')
  const [newBlockerText, setNewBlockerText] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const { comments, loading: commentsLoading, load, add: addComment, remove: removeComment } = useCommentStore()
  const { add: addTodo, update: updateTodo, archive: archiveTodo, remove: removeTodo } = useTodoStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load(todo.id) }, [todo.id])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  function startTitleEdit() {
    setTitleDraft(todo.text)
    setEditingTitle(true)
  }

  async function commitTitleEdit() {
    const text = titleDraft.trim()
    if (text && text !== todo.text) await updateTodo({ ...todo, text })
    setEditingTitle(false)
  }

  function handleTitleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitTitleEdit()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  async function handleToggleDone() {
    await updateTodo({ ...todo, done: !todo.done })
  }

  async function handleArchive() {
    const ok = await confirm({ title: 'Archive todo', message: `Archive "${todo.text}"? It will be hidden but can be restored.`, confirmLabel: 'Archive', danger: false })
    if (!ok) return
    await archiveTodo(todo.id)
    onClose()
  }

  async function handleDelete() {
    const ok = await confirm({ title: 'Delete todo', message: `Permanently delete "${todo.text}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await removeTodo(todo.id)
    onClose()
  }

  async function handleAddComment() {
    const text = commentText.trim()
    if (!text) return
    await addComment(text)
    setCommentText('')
  }

  async function handleAddBlocker() {
    const text = newBlockerText.trim()
    if (!text) return
    const newTodo = await addTodo(text)
    onDepsChange(todo, [...(todo.dependsOn ?? []), newTodo.id])
    setNewBlockerText('')
  }

  function toggleDep(depId: string) {
    const current = new Set(todo.dependsOn ?? [])
    if (current.has(depId)) {
      current.delete(depId)
    } else {
      if (wouldCreateCycle(todos, todo.id, depId)) return
      current.add(depId)
    }
    onDepsChange(todo, Array.from(current))
  }

  const activeDeps = (todo.dependsOn ?? [])
    .map(id => todos.find(t => t.id === id))
    .filter((t): t is Todo => t !== undefined && !t.done)
  const resolvedDeps = (todo.dependsOn ?? [])
    .map(id => todos.find(t => t.id === id))
    .filter((t): t is Todo => t !== undefined && t.done)
  const linkableTodos = todos.filter(t =>
    t.id !== todo.id &&
    !t.done &&
    !(todo.dependsOn ?? []).includes(t.id) &&
    !wouldCreateCycle(todos, todo.id, t.id)
  )
  const blocked = isTodoBlocked(todo, todos)
  const isFocused = focusedId === todo.id
  const canFocus = !todo.done && !blocked
  const statusLabel = todo.done ? '✓ Done' : isFocused ? (paused ? '⏸ Paused' : '⏱ Focused') : blocked ? '🔒 Blocked' : '● Ready'
  const statusColor = todo.done ? 'text.disabled' : isFocused ? '#d97706' : blocked ? 'error.main' : 'primary.main'

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { width: { xs: '100%', sm: 400 }, bgcolor: '#111827', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid #1f2937' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: statusColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                {statusLabel}
              </Typography>
              {((todo.focusMs ?? 0) + (isFocused ? accMs : 0)) > 0 && (
                <Typography variant="caption" sx={{ fontSize: 10, color: '#78716c', fontWeight: 500 }}>
                  ⏱ {fmtMs((todo.focusMs ?? 0) + (isFocused ? accMs : 0))} invested
                </Typography>
              )}
            </Box>
            {editingTitle ? (
              <TextField
                size="small"
                fullWidth
                multiline
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={handleTitleKey}
                autoFocus
                sx={{ mt: 0.5, '& .MuiInputBase-root': { fontSize: 13 } }}
              />
            ) : (
              <Typography
                variant="subtitle2"
                onClick={startTitleEdit}
                sx={{
                  mt: 0.25,
                  color: todo.done ? 'text.disabled' : 'text.primary',
                  textDecoration: todo.done ? 'line-through' : 'none',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  cursor: 'text',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover', px: 0.5, mx: -0.5 },
                }}
              >
                {todo.text}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Button
            size="small"
            variant={todo.done ? 'outlined' : 'contained'}
            color={todo.done ? 'inherit' : 'success'}
            startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={handleToggleDone}
            sx={{ fontSize: 11, py: 0.5, textTransform: 'none', flex: 1 }}
          >
            {todo.done ? 'Unmark done' : 'Mark as done'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<InventoryOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={handleArchive}
            sx={{ fontSize: 11, py: 0.5, textTransform: 'none', flex: 1 }}
          >
            Archive
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
            onClick={handleDelete}
            sx={{ fontSize: 11, py: 0.5, textTransform: 'none', flex: 1 }}
          >
            Delete
          </Button>
        </Box>

        {canFocus && !isFocused && (
          <Button
            fullWidth size="small" variant="outlined"
            startIcon={<AdjustOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => onFocus(todo.id)}
            sx={{ mb: 1.5, fontSize: 11, py: 0.75, textTransform: 'none', fontWeight: 600,
              borderColor: '#92400e', color: '#d97706',
              '&:hover': { bgcolor: 'rgba(217,119,6,0.08)', borderColor: '#92400e' } }}
          >
            Focus on this
          </Button>
        )}

        {isFocused && (
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button
              size="small" variant="outlined" fullWidth
              startIcon={paused
                ? <AdjustOutlinedIcon sx={{ fontSize: 14 }} />
                : <PauseCircleOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={paused ? onResume : onPause}
              sx={{ fontSize: 11, py: 0.75, textTransform: 'none', fontWeight: 600,
                borderColor: '#92400e', color: '#d97706',
                '&:hover': { bgcolor: 'rgba(217,119,6,0.08)', borderColor: '#92400e' } }}
            >
              {paused ? (accMs > 0 ? `Resume  ·  ${fmtMs(accMs)}` : 'Resume') : 'Pause'}
            </Button>
            <Button
              size="small" variant="contained"
              onClick={onUnfocus}
              sx={{ fontSize: 11, py: 0.75, textTransform: 'none', fontWeight: 600, px: 2,
                bgcolor: '#7c3f3f', '&:hover': { bgcolor: '#991b1b' } }}
            >
              Stop
            </Button>
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, fontSize: 12, textTransform: 'none', py: 0.5 } }}
        >
          <Tab label={`Comments${comments.length > 0 ? ` (${comments.length})` : ''}`} />
          <Tab label={`Blockers${(todo.dependsOn ?? []).length > 0 ? ` (${(todo.dependsOn ?? []).length})` : ''}`} />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Comments tab */}
        {tab === 0 && (
          <Box>
            {commentsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            {!commentsLoading && comments.length === 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontSize: 12 }}>
                No comments yet.
              </Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {comments.map(c => (
                <Box key={c.id} sx={{ bgcolor: '#0f172a', borderRadius: 1.5, p: 1.5, border: '1px solid #1f2937' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: 10 }}>
                      {c.authorName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        {new Date(c.createdAt).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      <IconButton size="small" onClick={() => removeComment(c.id)} sx={{ color: 'text.disabled', p: 0.25, '&:hover': { color: 'error.main' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {c.text}
                  </Typography>
                </Box>
              ))}
            </Box>
            <div ref={bottomRef} />
          </Box>
        )}

        {/* Blockers tab */}
        {tab === 1 && (
          <Box>
            {activeDeps.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                  Currently blocking
                </Typography>
                {activeDeps.map(dep => (
                  <Box key={dep.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #1f2937' }}>
                    <Typography variant="body2" sx={{ flex: 1, fontSize: 12, color: 'error.light' }}>🔒 {dep.text}</Typography>
                    <IconButton size="small" onClick={() => toggleDep(dep.id)} sx={{ color: 'text.disabled', p: 0.5, '&:hover': { color: 'error.main' } }}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {resolvedDeps.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                  Resolved
                </Typography>
                {resolvedDeps.map(dep => (
                  <Box key={dep.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #1f2937' }}>
                    <Typography variant="body2" sx={{ flex: 1, fontSize: 12, color: 'text.disabled', textDecoration: 'line-through' }}>✓ {dep.text}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {linkableTodos.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                  Link existing todo
                </Typography>
                {linkableTodos.map(t => (
                  <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', py: 0.5, cursor: 'pointer' }} onClick={() => toggleDep(t.id)}>
                    <Checkbox size="small" checked={false} sx={{ p: 0.5 }} />
                    <Typography variant="body2" sx={{ fontSize: 12, ml: 0.5 }}>{t.text}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.75, display: 'block' }}>
                Create new blocker
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="New blocking todo…"
                  value={newBlockerText}
                  onChange={e => setNewBlockerText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddBlocker()}
                  sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
                />
                <IconButton size="small" onClick={handleAddBlocker} disabled={!newBlockerText.trim()} color="primary">
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            {(todo.dependsOn ?? []).length === 0 && linkableTodos.length === 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontSize: 12 }}>
                No blockers. This todo is ready to work on.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Comment input */}
      {tab === 0 && (
        <Box sx={{ p: 2, borderTop: '1px solid #1f2937' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={3}
              placeholder="Add a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
              sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
            />
            <IconButton size="small" onClick={handleAddComment} disabled={!commentText.trim()} color="primary" sx={{ alignSelf: 'flex-end' }}>
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      )}
    </Drawer>
  )
}
