import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box, CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemText, IconButton, Typography, Tooltip,
  TextField, InputAdornment, useMediaQuery,
} from '@mui/material'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined'
import FlagIcon from '@mui/icons-material/Flag'
import { useTodoStore } from '../store/todoStore'
import type { Todo } from '../types'
import type { TodoAction } from '../services/ai'
import TodoGraph from '../components/TodoGraph'
import TodoDetailPanel from '../components/TodoDetailPanel'
import TodoAiChat from '../components/TodoAiChat'
import MobileTodoList from '../components/MobileTodoList'
import { useTodoFocus } from '../hooks/useTodoFocus'
import { getPendingBlockersByMap, indexTodos } from '../utils/todoUtils'

export default function TodosPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { todos, archivedTodos, loading, loadingArchived, load, loadArchived, add, update, unarchive, archive, remove } = useTodoStore()
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<'tree' | 'priority'>('tree')
  const { focusedId, paused, accMs, focus, pause, resume, unfocus } = useTodoFocus()

  async function handleStop() {
    const { id, totalMs } = await unfocus()
    if (id && totalMs > 0) {
      const todo = todos.find(t => t.id === id)
      if (todo) await update({ ...todo, focusMs: (todo.focusMs ?? 0) + totalMs })
    }
  }

  async function handleAddTodo() {
    const text = newText.trim()
    if (!text) return
    setAdding(true)
    await add(text)
    setNewText('')
    setAdding(false)
  }

  async function executeAiActions(actions: TodoAction[]) {
    const tempMap: Record<string, Todo> = {}

    for (const action of actions) {
      if (action.type === 'create_todo' && action.text) {
        const todo = await add(action.text)
        if (action.tempId) tempMap[action.tempId] = todo

      } else if (action.type === 'link_dep' && action.todoId && action.dependsOnId) {
        const resolvedTodoId = tempMap[action.todoId]?.id ?? action.todoId
        const resolvedDepId  = tempMap[action.dependsOnId]?.id ?? action.dependsOnId
        const todo = tempMap[action.todoId] ?? todos.find(t => t.id === resolvedTodoId)
        if (todo) {
          const updated = { ...todo, dependsOn: [...new Set([...(todo.dependsOn ?? []), resolvedDepId])] }
          await update(updated)
          if (action.todoId in tempMap) tempMap[action.todoId] = updated
        }

      } else if (action.type === 'mark_done' && action.id) {
        const todo = todos.find(t => t.id === action.id)
        if (todo) await update({ ...todo, done: true })

      } else if (action.type === 'mark_undone' && action.id) {
        const todo = todos.find(t => t.id === action.id)
        if (todo) await update({ ...todo, done: false })

      } else if (action.type === 'archive' && action.id) {
        await archive(action.id)
      }
    }
  }

  useEffect(() => { load() }, [])

  const byId = useMemo(() => indexTodos(todos), [todos])
  const completedHidden = todos.filter(t => t.done)
  const priorityTodos  = todos.filter(t => !t.done && t.priority)
  const graphTodos = todos.filter(t => !t.done)
  const readyTodos = todos.filter(t => !t.done && getPendingBlockersByMap(t, byId).length === 0)
  // Precompute pending-blocker counts for priority rows (avoids 3× recompute per row in JSX)
  const priorityBlockerCount = useMemo(
    () => new Map(priorityTodos.map(t => [t.id, getPendingBlockersByMap(t, byId).length])),
    [priorityTodos, byId],
  )

  async function handleDepsChange(todo: Todo, deps: string[]) {
    const updated = { ...todo, dependsOn: deps }
    await update(updated)
    setSelectedTodo(updated)
  }

  const handleSelect = useCallback((todo: Todo) => setSelectedTodo(todo), [])

  async function handleConnect(blockerId: string, blockedId: string) {
    const todo = todos.find(t => t.id === blockedId)
    if (!todo) return
    const updated = { ...todo, dependsOn: [...new Set([...(todo.dependsOn ?? []), blockerId])] }
    await update(updated)
    if (selectedTodo?.id === blockedId) setSelectedTodo(updated)
  }

  async function handleDisconnect(blockerId: string, blockedId: string) {
    const todo = todos.find(t => t.id === blockedId)
    if (!todo) return
    const updated = { ...todo, dependsOn: (todo.dependsOn ?? []).filter(d => d !== blockerId) }
    await update(updated)
    if (selectedTodo?.id === blockedId) setSelectedTodo(updated)
  }

  async function handleAddBlocker(parentId: string, text: string) {
    const newTodo = await add(text)
    const parent = todos.find(t => t.id === parentId)
    if (parent) {
      const updated = { ...parent, dependsOn: [...new Set([...(parent.dependsOn ?? []), newTodo.id])] }
      await update(updated)
      if (selectedTodo?.id === parentId) setSelectedTodo(updated)
    }
  }

  function openArchived() {
    setShowArchived(true)
    loadArchived()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (isMobile) {
    return <MobileTodoList todos={todos} />
  }

  return (
    <Box sx={{ width: '100%' }}>
      {selectedTodo && (
        <TodoDetailPanel
          todo={todos.find(t => t.id === selectedTodo.id) ?? selectedTodo}
          todos={todos}
          onClose={() => setSelectedTodo(null)}
          onDepsChange={handleDepsChange}
          focusedId={focusedId}
          paused={paused}
          accMs={accMs}
          onFocus={focus}
          onPause={pause}
          onResume={resume}
          onUnfocus={handleStop}
        />
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="New todo… (press Enter)"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddTodo()}
          disabled={adding}
          slotProps={{
            input: {
              endAdornment: newText.trim() ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleAddTodo} disabled={adding} edge="end">
                    {adding ? <CircularProgress size={16} /> : <AddIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {priorityTodos.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FlagIcon sx={{ fontSize: 14, color: '#f59e0b' }} />}
            onClick={() => setShowPriority(true)}
            sx={{ fontSize: 11, textTransform: 'none', color: '#f59e0b', borderColor: '#92400e', '&:hover': { bgcolor: 'rgba(146,64,14,0.1)', borderColor: '#b45309' } }}
          >
            Priority ({priorityTodos.length})
          </Button>
        )}
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={() => setShowCompleted(true)}
          sx={{ fontSize: 11, textTransform: 'none', color: 'text.secondary', borderColor: '#374151' }}
        >
          Completed{completedHidden.length > 0 ? ` (${completedHidden.length})` : ''}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<InventoryOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={openArchived}
          sx={{ fontSize: 11, textTransform: 'none', color: 'text.secondary', borderColor: '#374151' }}
        >
          Archived{archivedTodos.length > 0 ? ` (${archivedTodos.length})` : ''}
        </Button>
        <Tooltip title={view === 'tree' ? 'Switch to priority list' : 'Switch to dependency tree'} arrow>
          <IconButton
            size="small"
            onClick={() => setView(v => v === 'tree' ? 'priority' : 'tree')}
            sx={{ color: view === 'priority' ? 'primary.main' : 'text.secondary', border: '1px solid', borderColor: view === 'priority' ? 'primary.main' : '#374151', borderRadius: 1.5, p: '4px' }}
          >
            {view === 'tree'
              ? <FormatListNumberedOutlinedIcon sx={{ fontSize: 16 }} />
              : <AccountTreeOutlinedIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {view === 'priority' ? (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
            ● Ready to work on ({readyTodos.length})
          </Typography>
          {readyTodos.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', py: 2 }}>
              No ready todos — everything is blocked or done.
            </Typography>
          ) : (
            readyTodos.map((todo, i) => (
              <Box
                key={todo.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(todo)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(todo) } }}
                sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25, px: 1.5,
                  mb: 0.75, borderRadius: '8px', cursor: 'pointer',
                  bgcolor: '#052e16', border: '1px solid #166534', borderLeft: '3px solid #22c55e',
                  '&:hover': { bgcolor: '#064a23' },
                  '&:focus-visible': { outline: '2px solid #22c55e', outlineOffset: 2 },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4ade80', minWidth: 22, mt: '1px' }}>
                  {i + 1}.
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#d1fae5', lineHeight: 1.4 }}>
                  {todo.text}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      ) : (
        <TodoGraph
          todos={graphTodos}
          onSelect={handleSelect}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onAddBlocker={handleAddBlocker}
          focusedId={focusedId}
          paused={paused}
        />
      )}

      {/* High priority todos dialog */}
      <Dialog open={showPriority} onClose={() => setShowPriority(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlagIcon sx={{ color: '#f59e0b', fontSize: 18 }} /> High Priority
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {priorityTodos.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
              No high-priority todos.
            </Typography>
          )}
          <List disablePadding>
            {priorityTodos.map(t => {
              const blockerCount = priorityBlockerCount.get(t.id) ?? 0
              return (
              <ListItem
                key={t.id}
                divider
                onClick={() => { handleSelect(t); setShowPriority(false) }}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(146,64,14,0.1)' }, borderLeft: '3px solid #f59e0b' }}
                secondaryAction={
                  <Tooltip title="Remove priority">
                    <IconButton size="small" onClick={e => { e.stopPropagation(); update({ ...t, priority: false }) }} sx={{ color: '#f59e0b', '&:hover': { color: 'text.secondary' } }}>
                      <FlagIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={t.text}
                  secondary={blockerCount > 0 ? `🔒 Blocked by ${blockerCount}` : '● Ready'}
                  slotProps={{
                    primary: { style: { fontSize: 13, color: '#fcd34d' } },
                    secondary: { style: { fontSize: 11, color: blockerCount > 0 ? '#f87171' : '#4ade80' } },
                  }}
                />
              </ListItem>
              )
            })}
          </List>
        </DialogContent>
      </Dialog>

      {/* Completed todos dialog */}
      <Dialog open={showCompleted} onClose={() => setShowCompleted(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Completed Todos</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {completedHidden.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
              No completed todos.
            </Typography>
          )}
          <List disablePadding>
            {completedHidden.map(t => (
              <ListItem
                key={t.id}
                divider
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Mark as not done">
                      <IconButton size="small" onClick={() => update({ ...t, done: false })} sx={{ color: 'text.secondary', '&:hover': { color: 'success.main' } }}>
                        <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Archive">
                      <IconButton size="small" onClick={() => archive(t.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                        <InventoryOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete permanently">
                      <IconButton size="small" onClick={() => remove(t.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={t.text}
                  slotProps={{
                    primary: { style: { fontSize: 13, textDecoration: 'line-through', color: '#6b7280' } },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Archived todos dialog */}
      <Dialog open={showArchived} onClose={() => setShowArchived(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Archived Todos
          {loadingArchived && <CircularProgress size={16} />}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {!loadingArchived && archivedTodos.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
              No archived todos.
            </Typography>
          )}
          <List disablePadding>
            {archivedTodos.map(t => (
              <ListItem
                key={t.id}
                divider
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Unarchive">
                      <IconButton size="small" onClick={() => unarchive(t.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        <UnarchiveOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete permanently">
                      <IconButton size="small" onClick={() => remove(t.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={t.text}
                  slotProps={{
                    primary: { style: { fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#6b7280' : undefined } },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <TodoAiChat todos={todos} onExecute={executeAiActions} />
    </Box>
  )
}
