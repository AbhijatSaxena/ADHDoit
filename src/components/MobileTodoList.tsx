import { useState } from 'react'
import {
  Box, Typography, Paper, Drawer, Button,
  TextField, IconButton, Divider, CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import type { Todo } from '../types'
import { useTodoStore } from '../store/todoStore'
import { getPendingBlockers } from '../utils/todoUtils'
import { confirm } from './ConfirmDialog'

interface Props {
  todos: Todo[]
}

export default function MobileTodoList({ todos }: Props) {
  const { add, update, archive, remove } = useTodoStore()

  const [newText, setNewText]           = useState('')
  const [adding, setAdding]             = useState(false)
  const [selected, setSelected]         = useState<Todo | null>(null)
  const [showBlocked, setShowBlocked]   = useState(false)
  const [newBlockerText, setNewBlockerText] = useState('')
  const [addingBlocker, setAddingBlocker]   = useState(false)

  const activeTodos  = todos.filter(t => !t.done)
  const readyTodos   = activeTodos.filter(t => getPendingBlockers(t, todos).length === 0)
  const blockedTodos = activeTodos.filter(t => getPendingBlockers(t, todos).length > 0)
  const doneTodos    = todos.filter(t => t.done)

  // Always read selected from latest store state
  const selectedFresh   = selected ? (todos.find(t => t.id === selected.id) ?? null) : null
  const selectedBlockerIds = selectedFresh ? getPendingBlockers(selectedFresh, todos) : []
  const selectedBlockers   = selectedBlockerIds
    .map(id => todos.find(t => t.id === id))
    .filter((t): t is Todo => !!t)

  async function handleAdd() {
    const text = newText.trim()
    if (!text) return
    setAdding(true)
    await add(text)
    setNewText('')
    setAdding(false)
  }

  async function handleToggleDone(todo: Todo) {
    await update({ ...todo, done: !todo.done })
    if (!todo.done) setSelected(null)
  }

  async function handleArchive(todo: Todo) {
    const ok = await confirm({ title: 'Archive todo', message: `Archive "${todo.text}"?`, confirmLabel: 'Archive', danger: false })
    if (!ok) return
    await archive(todo.id)
    setSelected(null)
  }

  async function handleDelete(todo: Todo) {
    const ok = await confirm({ title: 'Delete todo', message: `Permanently delete "${todo.text}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await remove(todo.id)
    setSelected(null)
  }

  async function handleAddBlocker() {
    const text = newBlockerText.trim()
    if (!text || !selectedFresh) return
    setAddingBlocker(true)
    const newTodo = await add(text)
    const updated = { ...selectedFresh, dependsOn: [...new Set([...(selectedFresh.dependsOn ?? []), newTodo.id])] }
    await update(updated)
    setNewBlockerText('')
    setAddingBlocker(false)
  }

  function openDetail(todo: Todo) {
    setSelected(todo)
    setNewBlockerText('')
  }

  function TodoCard({ todo }: { todo: Todo }) {
    const blockers  = getPendingBlockers(todo, todos)
    const isBlocked = blockers.length > 0
    const accent    = isBlocked ? '#f87171' : '#22c55e'
    const bg        = isBlocked ? '#1c0a0a' : '#052e16'
    const border    = isBlocked ? '#7f1d1d' : '#166534'
    const text      = isBlocked ? '#e5e7eb' : '#d1fae5'

    return (
      <Paper
        onClick={() => openDetail(todo)}
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: '10px',
          bgcolor: bg,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${accent}`,
          mb: 1,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          '&:active': { opacity: 0.8 },
        }}
      >
        <Box sx={{ flex: 1, p: '9px 11px' }}>
          <Typography sx={{ fontSize: 13, color: text, lineHeight: 1.4 }}>
            {todo.text}
          </Typography>
          {isBlocked && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <LockOutlinedIcon sx={{ fontSize: 10, color: '#fca5a5' }} />
              <Typography sx={{ fontSize: 10, color: '#fca5a5', fontWeight: 600 }}>
                {blockers.length} blocker{blockers.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Add todo */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="New todo… (press Enter)"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          disabled={adding}
        />
        <IconButton onClick={handleAdd} disabled={adding || !newText.trim()} color="primary" size="small">
          {adding ? <CircularProgress size={18} /> : <AddIcon />}
        </IconButton>
      </Box>

      {/* Ready section */}
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
        ● Ready ({readyTodos.length})
      </Typography>
      {readyTodos.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2, pl: 0.5 }}>
          All caught up or everything is blocked.
        </Typography>
      ) : (
        readyTodos.map(t => <TodoCard key={t.id} todo={t} />)
      )}

      {/* Blocked section */}
      {blockedTodos.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box
            onClick={() => setShowBlocked(v => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔒 Blocked ({blockedTodos.length})
            </Typography>
            {showBlocked
              ? <ExpandLessIcon sx={{ fontSize: 15, color: '#fca5a5' }} />
              : <ExpandMoreIcon sx={{ fontSize: 15, color: '#fca5a5' }} />}
          </Box>
          {showBlocked && blockedTodos.map(t => <TodoCard key={t.id} todo={t} />)}
        </Box>
      )}

      {/* Completed count */}
      {doneTodos.length > 0 && (
        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
            {doneTodos.length} completed todo{doneTodos.length !== 1 ? 's' : ''} hidden
          </Typography>
        </Box>
      )}

      {/* Detail bottom sheet */}
      <Drawer
        anchor="bottom"
        open={!!selectedFresh}
        onClose={() => setSelected(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px 16px 0 0',
              bgcolor: '#111827',
              maxHeight: '82vh',
            },
          },
        }}
      >
        {selectedFresh && (
          <Box sx={{ overflow: 'auto', p: 2.5 }}>
            {/* Drag handle */}
            <Box sx={{ width: 36, height: 4, bgcolor: '#374151', borderRadius: 2, mx: 'auto', mb: 2 }} />

            {/* Title row */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
              <Typography sx={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                {selectedFresh.text}
              </Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: 'text.secondary', mt: -0.25 }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Primary action */}
            <Button
              fullWidth
              variant="contained"
              color={selectedFresh.done ? 'inherit' : 'success'}
              onClick={() => handleToggleDone(selectedFresh)}
              sx={{ mb: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px', py: 1.25 }}
            >
              {selectedFresh.done ? 'Unmark done' : '✓  Mark as done'}
            </Button>

            {/* Secondary actions */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              <Button
                fullWidth variant="outlined" color="inherit"
                startIcon={<InventoryOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleArchive(selectedFresh)}
                sx={{ textTransform: 'none', fontSize: 13, color: 'text.secondary', borderColor: '#374151', borderRadius: '10px' }}
              >
                Archive
              </Button>
              <Button
                fullWidth variant="outlined" color="error"
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleDelete(selectedFresh)}
                sx={{ textTransform: 'none', fontSize: 13, borderRadius: '10px' }}
              >
                Delete
              </Button>
            </Box>

            <Divider sx={{ mb: 2, borderColor: '#1f2937' }} />

            {/* Blockers */}
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
              Blockers
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField
                size="small" fullWidth
                placeholder="Add a new blocker…"
                value={newBlockerText}
                onChange={e => setNewBlockerText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBlocker()}
                disabled={addingBlocker}
                sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
              />
              <IconButton size="small" onClick={handleAddBlocker} disabled={!newBlockerText.trim() || addingBlocker} color="primary">
                {addingBlocker ? <CircularProgress size={16} /> : <AddIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>

            {selectedBlockers.length > 0
              ? selectedBlockers.map(b => (
                <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', py: 0.75, borderBottom: '1px solid #1f2937' }}>
                  <LockOutlinedIcon sx={{ fontSize: 12, color: '#fca5a5', mr: 1, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, color: '#e5e7eb', flex: 1 }}>{b.text}</Typography>
                </Box>
              ))
              : (
                <Typography sx={{ fontSize: 12, color: 'text.disabled', py: 1 }}>
                  No blockers — this todo is ready.
                </Typography>
              )
            }
          </Box>
        )}
      </Drawer>
    </Box>
  )
}
