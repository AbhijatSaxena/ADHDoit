import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, Chip, CircularProgress, Paper, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemText, Button, TextField, InputBase, Divider,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import AddIcon from '@mui/icons-material/Add'
import {
  fetchAllSessions, revokeSession, deleteRevokedSessions, fetchAllUsers, fetchTodos, fetchArchivedTodos,
  saveTodo, deleteTodo, deleteUserAccount,
} from '../services/firebase'
import type { Session, UserRecord } from '../services/firebase'
import type { Todo } from '../types'
import {
  fetchHubs, createHub, deleteHub,
  fetchHubTasks, addHubTask, completeHubTask, uncompleteHubTask, renameHubTask, deleteHubTask,
} from '../services/hubService'
import type { Hub, HubTask } from '../services/hubService'
import { useAuthStore } from '../store/authStore'
import { confirm } from '../components/ConfirmDialog'

function parseUA(ua: string): string {
  if (/iPhone|iPad/.test(ua)) return '📱 iOS'
  if (/Android/.test(ua)) return '📱 Android'
  if (/Windows/.test(ua)) return '🖥 Windows'
  if (/Mac/.test(ua)) return '🖥 Mac'
  if (/Linux/.test(ua)) return '🖥 Linux'
  return '🌐 Browser'
}

function formatTime(ts: { seconds: number } | null): string {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })
}

function isActive(ts: { seconds: number } | null): boolean {
  if (!ts) return false
  return Date.now() - ts.seconds * 1000 < 10 * 60 * 1000
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const currentSessionId = useAuthStore(s => s.sessionId)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try { setSessions(await fetchAllSessions()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function handleClearRevoked() {
    const revokedCount = sessions.filter(s => s.revoked).length
    const ok = await confirm({
      title: 'Clear revoked sessions',
      message: `Permanently delete ${revokedCount} revoked session${revokedCount !== 1 ? 's' : ''}?`,
      confirmLabel: 'Clear',
      danger: true,
    })
    if (!ok) return
    setClearing(true)
    try {
      await deleteRevokedSessions()
      setSessions(prev => prev.filter(s => !s.revoked))
    } finally {
      setClearing(false)
    }
  }

  async function handleRevoke(session: Session) {
    if (session.id === currentSessionId) return
    setRevoking(session.id)
    try {
      await revokeSession(session.id)
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, revoked: true } : s))
    } finally {
      setRevoking(null)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {sessions.some(s => s.revoked) && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={handleClearRevoked}
            disabled={clearing}
            sx={{ fontSize: 11, textTransform: 'none', py: 0.25, px: 1.25, height: 26, borderColor: 'error.dark', '&:hover': { borderColor: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' } }}
          >
            {clearing ? <CircularProgress size={12} color="error" /> : `Clear revoked (${sessions.filter(s => s.revoked).length})`}
          </Button>
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={loadSessions} size="small" disabled={loading}>
            {loading ? <CircularProgress size={16} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ bgcolor: '#111827', border: '1px solid #1f2937', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#0f172a', borderColor: '#1f2937', fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
              <TableCell>User</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Signed in (IST)</TableCell>
              <TableCell>Last seen (IST)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.disabled', borderColor: '#1f2937' }}>
                  No sessions found.
                </TableCell>
              </TableRow>
            )}
            {sessions.map(s => {
              const isCurrent = s.id === currentSessionId
              const active = isActive(s.lastSeen as unknown as { seconds: number })
              return (
                <TableRow
                  key={s.id}
                  sx={{
                    bgcolor: isCurrent ? 'rgba(37,99,235,0.08)' : 'transparent',
                    '& td': { borderColor: '#1f2937', fontSize: 12, py: 1.25 },
                    opacity: s.revoked ? 0.4 : 1,
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400 }}>{s.email}</Typography>
                    {isCurrent && <Typography variant="caption" sx={{ color: 'primary.main', fontSize: 10 }}>This session</Typography>}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{parseUA(s.userAgent)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{formatTime(s.signedInAt as unknown as { seconds: number })}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{formatTime(s.lastSeen as unknown as { seconds: number })}</TableCell>
                  <TableCell>
                    {s.revoked ? (
                      <Chip label="Revoked" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                    ) : active ? (
                      <Chip label="Active" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />
                    ) : (
                      <Chip label="Idle" size="small" color="default" sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!s.revoked && !isCurrent && (
                      <Tooltip title="Force logout">
                        <span>
                          <IconButton size="small" onClick={() => handleRevoke(s)} disabled={revoking === s.id} sx={{ color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}>
                            {revoking === s.id ? <CircularProgress size={14} /> : <LogoutIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, fontSize: 10 }}>
        Sessions are marked Active if last heartbeat was within 10 minutes. Heartbeat updates every 5 minutes while the app is open.
      </Typography>
    </Box>
  )
}

// ─── User todos tab ───────────────────────────────────────────────────────────

interface UserTodosRowProps {
  user: UserRecord
  onDeleted: (uid: string) => void
}

function UserTodosRow({ user, onDeleted }: UserTodosRowProps) {
  const currentUid = useAuthStore(s => s.user?.uid)
  const [expanded, setExpanded] = useState(false)
  const [todos, setTodos] = useState<Todo[]>([])
  const [archived, setArchived] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  async function load() {
    if (loading) return
    setLoading(true)
    try {
      const [active, arch] = await Promise.all([fetchTodos(user.uid), fetchArchivedTodos(user.uid)])
      setTodos(active as Todo[])
      setArchived(arch as Todo[])
    } finally {
      setLoading(false)
    }
  }

  function handleExpand(_: React.SyntheticEvent, open: boolean) {
    setExpanded(open)
    if (open && todos.length === 0 && !loading) load()
  }

  async function handleToggleDone(todo: Todo) {
    const updated = { ...todo, done: !todo.done }
    await saveTodo(user.uid, updated as unknown as Record<string, unknown>)
    setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
  }

  async function handleArchive(todo: Todo) {
    const ok = await confirm({ title: 'Archive todo', message: `Archive "${todo.text}"?`, confirmLabel: 'Archive', danger: false })
    if (!ok) return
    const updated = { ...todo, archived: true }
    await saveTodo(user.uid, updated as unknown as Record<string, unknown>)
    setTodos(prev => prev.filter(t => t.id !== todo.id))
    setArchived(prev => [...prev, updated])
  }

  async function handleUnarchive(todo: Todo) {
    const updated = { ...todo, archived: false }
    await saveTodo(user.uid, updated as unknown as Record<string, unknown>)
    setArchived(prev => prev.filter(t => t.id !== todo.id))
    setTodos(prev => [...prev, updated])
  }

  async function handleDelete(todo: Todo, fromArchived = false) {
    const ok = await confirm({ title: 'Delete todo', message: `Permanently delete "${todo.text}"?`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await deleteTodo(user.uid, todo.id)
    if (fromArchived) setArchived(prev => prev.filter(t => t.id !== todo.id))
    else setTodos(prev => prev.filter(t => t.id !== todo.id))
  }

  async function handleDeleteAccount(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Delete account',
      message: `Delete ${user.email || user.uid}? This will permanently remove all their todos, sessions and account data. The Firebase Auth login will also be removed.`,
      confirmLabel: 'Delete account',
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteUserAccount(user.uid)
      onDeleted(user.uid)
    } finally {
      setDeleting(false)
    }
  }

  const active = todos.filter(t => !t.done)
  const done   = todos.filter(t => t.done)
  const total  = todos.length + archived.length

  return (
    <Accordion
      expanded={expanded}
      onChange={handleExpand}
      disableGutters
      elevation={0}
      sx={{
        bgcolor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '8px !important',
        mb: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />} sx={{ px: 2, minHeight: 48 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{user.email || user.uid}</Typography>
          <Chip label={user.role} size="small" color={user.role === 'admin' ? 'primary' : 'default'} sx={{ height: 18, fontSize: 10 }} />
          {!loading && expanded && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', mr: 1, fontSize: 11 }}>
              {active.length} active · {done.length} done · {archived.length} archived
            </Typography>
          )}
          {!expanded && total > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', mr: 1, fontSize: 11 }}>
              {total} todo{total !== 1 ? 's' : ''}
            </Typography>
          )}
          {loading && <CircularProgress size={12} sx={{ ml: 'auto', mr: 1 }} />}
          {currentUid !== user.uid && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={handleDeleteAccount}
              disabled={deleting}
              sx={{ ml: expanded || loading ? 0 : 'auto', mr: 1, fontSize: 11, py: 0.25, px: 1, minWidth: 0, height: 24, borderColor: 'error.dark', '&:hover': { borderColor: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' } }}
            >
              {deleting ? <CircularProgress size={12} color="error" /> : 'Delete'}
            </Button>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0, borderTop: '1px solid #1f2937' }}>
        {!loading && todos.length === 0 && archived.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontSize: 12 }}>
            No todos yet.
          </Typography>
        )}

        <List disablePadding>
          {active.map(todo => (
            <TodoAdminRow key={todo.id} todo={todo}
              onToggleDone={() => handleToggleDone(todo)}
              onArchive={() => handleArchive(todo)}
              onDelete={() => handleDelete(todo)}
            />
          ))}
          {done.map(todo => (
            <TodoAdminRow key={todo.id} todo={todo}
              onToggleDone={() => handleToggleDone(todo)}
              onArchive={() => handleArchive(todo)}
              onDelete={() => handleDelete(todo)}
            />
          ))}
        </List>

        {archived.length > 0 && (
          <Box sx={{ borderTop: '1px solid #1f2937' }}>
            <Box
              onClick={() => setShowArchived(v => !v)}
              sx={{ px: 2, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {showArchived ? '▾' : '▸'} Archived ({archived.length})
              </Typography>
            </Box>
            {showArchived && (
              <List disablePadding>
                {archived.map(todo => (
                  <TodoAdminRow key={todo.id} todo={todo} isArchived
                    onUnarchive={() => handleUnarchive(todo)}
                    onDelete={() => handleDelete(todo, true)}
                  />
                ))}
              </List>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

interface TodoAdminRowProps {
  todo: Todo
  isArchived?: boolean
  onToggleDone?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onDelete: () => void
}

function TodoAdminRow({ todo, isArchived, onToggleDone, onArchive, onUnarchive, onDelete }: TodoAdminRowProps) {
  return (
    <ListItem
      divider
      sx={{ px: 2, py: 0.75, '& .MuiDivider-root': { borderColor: '#1f2937' } }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {!isArchived && onToggleDone && (
            <Tooltip title={todo.done ? 'Mark undone' : 'Mark done'}>
              <IconButton size="small" onClick={onToggleDone} sx={{ color: todo.done ? 'success.main' : 'text.secondary', '&:hover': { color: 'success.main' } }}>
                <CheckCircleOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {!isArchived && onArchive && (
            <Tooltip title="Archive">
              <IconButton size="small" onClick={onArchive} sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                <InventoryOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {isArchived && onUnarchive && (
            <Tooltip title="Unarchive">
              <IconButton size="small" onClick={onUnarchive} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                <UnarchiveOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete permanently">
            <IconButton size="small" onClick={onDelete} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemText
        primary={todo.text}
        slotProps={{
          primary: {
            style: {
              fontSize: 12,
              color: isArchived ? '#4b5563' : todo.done ? '#6b7280' : undefined,
              textDecoration: todo.done || isArchived ? 'line-through' : 'none',
            },
          },
        }}
      />
    </ListItem>
  )
}

function UserTodosTab() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try { setUsers(await fetchAllUsers()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Tooltip title="Refresh">
          <IconButton onClick={loadUsers} size="small" disabled={loading}>
            {loading ? <CircularProgress size={16} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && users.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4, fontSize: 12 }}>
          No users found.
        </Typography>
      )}

      {users.map(u => (
        <UserTodosRow
          key={u.uid}
          user={u}
          onDeleted={uid => setUsers(prev => prev.filter(u => u.uid !== uid))}
        />
      ))}
    </Box>
  )
}

// ─── Admin Task Hubs tab ──────────────────────────────────────────────────────

function formatDay(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

interface AdminTaskRowProps {
  task: HubTask
  completed?: boolean
  onComplete: () => void
  onRename: (text: string) => Promise<void>
  onDelete: () => void
}

function AdminTaskRow({ task, completed, onComplete, onRename, onDelete }: AdminTaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.text)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    if (completed) return
    setDraft(task.text)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commit() {
    const text = draft.trim()
    if (!text || text === task.text) { setEditing(false); setDraft(task.text); return }
    await onRename(text)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(task.text) }
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 1.5,
      py: completed ? 0.6 : 0.75, borderRadius: '6px', mb: 0.5,
      bgcolor: completed ? '#052e16' : '#0d1117',
      border: completed ? '1px solid #166534' : '1px solid #1f2937',
      opacity: completed ? 0.85 : 1,
    }}>
      <Tooltip title={completed ? 'Mark incomplete' : 'Mark complete'}>
        <IconButton size="small" onClick={onComplete}
          sx={{ color: completed ? '#22c55e' : '#374151', '&:hover': { color: '#22c55e' }, p: '3px', flexShrink: 0 }}>
          {completed
            ? <CheckCircleIcon sx={{ fontSize: 16 }} />
            : <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>

      {editing ? (
        <InputBase
          inputRef={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          fullWidth autoFocus
          sx={{ fontSize: 12, color: '#e5e7eb', flex: 1, '& input': { p: 0 }, bgcolor: '#1f2937', borderRadius: '4px', px: 0.75 }}
        />
      ) : (
        <Tooltip title={completed ? '' : 'Double-click to rename'} placement="top" enterDelay={800}>
          <Typography onDoubleClick={startEdit} sx={{
            flex: 1, fontSize: 12,
            color: completed ? '#86efac' : '#e5e7eb',
            textDecoration: completed ? 'line-through' : 'none',
            cursor: completed ? 'default' : 'text',
            userSelect: 'none',
          }}>
            {task.text}
          </Typography>
        </Tooltip>
      )}

      {completed && (
        <Typography sx={{ fontSize: 10, color: '#4ade80', whiteSpace: 'nowrap', mr: 0.5 }}>
          {new Date(task.completedAt!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      )}

      <Tooltip title="Delete">
        <IconButton size="small" onClick={onDelete}
          sx={{ color: '#374151', '&:hover': { color: 'error.main' }, p: '3px', flexShrink: 0 }}>
          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

function AdminHubsTab() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)

  const [hubs, setHubs] = useState<Hub[]>([])
  const [loadingHubs, setLoadingHubs] = useState(false)
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null)
  const [newHubName, setNewHubName] = useState('')
  const [addingHub, setAddingHub] = useState(false)

  const [tasks, setTasks] = useState<HubTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  useEffect(() => {
    fetchAllUsers().then(u => { setUsers(u); setLoadingUsers(false) })
  }, [])

  useEffect(() => {
    if (!selectedUid) { setHubs([]); setSelectedHubId(null); return }
    setLoadingHubs(true)
    fetchHubs(selectedUid).then(h => {
      setHubs(h)
      setLoadingHubs(false)
      setSelectedHubId(prev => h.find(x => x.id === prev) ? prev : (h[0]?.id ?? null))
    })
  }, [selectedUid])

  useEffect(() => {
    if (!selectedUid || !selectedHubId) { setTasks([]); return }
    setLoadingTasks(true)
    fetchHubTasks(selectedUid, selectedHubId).then(t => { setTasks(t); setLoadingTasks(false) })
  }, [selectedUid, selectedHubId])

  async function handleAddHub() {
    if (!selectedUid || !newHubName.trim()) return
    setAddingHub(true)
    const order = hubs.length > 0 ? Math.max(...hubs.map(h => h.order)) + 1 : 0
    const hub = await createHub(selectedUid, newHubName.trim(), order)
    setHubs(prev => [...prev, hub])
    setSelectedHubId(hub.id)
    setNewHubName('')
    setAddingHub(false)
  }

  async function handleDeleteHub(hub: Hub) {
    if (!selectedUid) return
    const ok = await confirm({ title: 'Delete hub', message: `Delete hub "${hub.name}" and all its tasks?`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await deleteHub(selectedUid, hub.id)
    setHubs(prev => prev.filter(h => h.id !== hub.id))
    setSelectedHubId(prev => prev === hub.id ? (hubs.find(h => h.id !== hub.id)?.id ?? null) : prev)
    if (selectedHubId === hub.id) setTasks([])
  }

  async function handleAddTask() {
    if (!selectedUid || !selectedHubId || !newTask.trim()) return
    setAddingTask(true)
    const task = await addHubTask(selectedUid, selectedHubId, newTask.trim())
    setTasks(prev => [...prev, task])
    setNewTask('')
    setAddingTask(false)
  }

  async function handleComplete(task: HubTask) {
    if (!selectedUid) return
    if (task.done) {
      await uncompleteHubTask(selectedUid, task.id)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: false, completedAt: null } : t))
    } else {
      await completeHubTask(selectedUid, task.id)
      const completedAt = Date.now()
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true, completedAt } : t))
    }
  }

  async function handleRename(task: HubTask, text: string) {
    if (!selectedUid) return
    await renameHubTask(selectedUid, task.id, text)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, text } : t))
  }

  async function handleDeleteTask(task: HubTask) {
    if (!selectedUid) return
    const ok = await confirm({ title: 'Delete task', message: `Delete "${task.text}"?`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    await deleteHubTask(selectedUid, task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const activeTasks = tasks.filter(t => !t.done)
  const completedTasks = tasks.filter(t => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const grouped: { label: string; tasks: HubTask[] }[] = []
  for (const t of completedTasks) {
    const label = formatDay(t.completedAt!)
    const g = grouped.find(g => g.label === label)
    if (g) g.tasks.push(t)
    else grouped.push({ label, tasks: [t] })
  }

  const selectedHub = hubs.find(h => h.id === selectedHubId)
  const selectedUser = users.find(u => u.uid === selectedUid)

  return (
    <Box sx={{ display: 'flex', gap: 0, border: '1px solid #1f2937', borderRadius: 2, overflow: 'hidden', minHeight: 500 }}>

      {/* Left pane: users */}
      <Box sx={{ width: 200, flexShrink: 0, borderRight: '1px solid #1f2937', bgcolor: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ px: 1.5, py: 1.25, fontSize: 10, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #1f2937' }}>
          Users
        </Typography>
        {loadingUsers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={18} /></Box>
        ) : (
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {users.map(u => (
              <Box
                key={u.uid}
                onClick={() => setSelectedUid(u.uid)}
                sx={{
                  px: 1.5, py: 1, cursor: 'pointer', borderBottom: '1px solid #1f2937',
                  bgcolor: selectedUid === u.uid ? '#1e3a5f' : 'transparent',
                  '&:hover': { bgcolor: selectedUid === u.uid ? '#1e3a5f' : '#111827' },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: selectedUid === u.uid ? 600 : 400, color: selectedUid === u.uid ? '#93c5fd' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email || u.uid}
                </Typography>
                {u.role === 'admin' && (
                  <Typography sx={{ fontSize: 9, color: '#60a5fa' }}>admin</Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Right area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!selectedUid ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Select a user to view their task hubs</Typography>
          </Box>
        ) : (
          <>
            {/* Hub bar */}
            <Box sx={{ borderBottom: '1px solid #1f2937', bgcolor: '#0f172a', px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minHeight: 44 }}>
              {loadingHubs ? (
                <CircularProgress size={14} />
              ) : hubs.length === 0 ? (
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>No hubs yet</Typography>
              ) : (
                hubs.map(hub => (
                  <Box key={hub.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Box
                      onClick={() => setSelectedHubId(hub.id)}
                      sx={{
                        px: 1.25, py: 0.5, borderRadius: '6px', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                        bgcolor: selectedHubId === hub.id ? '#1e3a5f' : '#111827',
                        color: selectedHubId === hub.id ? '#93c5fd' : '#6b7280',
                        border: selectedHubId === hub.id ? '1px solid #2563eb' : '1px solid #1f2937',
                        '&:hover': { bgcolor: '#1e3a5f', color: '#93c5fd' },
                      }}
                    >
                      {hub.name}
                    </Box>
                    <Tooltip title="Delete hub">
                      <IconButton size="small" onClick={() => handleDeleteHub(hub)} sx={{ color: '#374151', '&:hover': { color: 'error.main' }, p: '2px' }}>
                        <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))
              )}

              {/* Add hub inline */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                <InputBase
                  placeholder="New hub…"
                  value={newHubName}
                  onChange={e => setNewHubName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddHub()}
                  disabled={addingHub}
                  sx={{ fontSize: 11, color: '#e5e7eb', bgcolor: '#111827', border: '1px solid #1f2937', borderRadius: '6px', px: 1, py: 0.5, width: 120, '& input': { p: 0 } }}
                />
                <Tooltip title="Add hub">
                  <span>
                    <IconButton size="small" onClick={handleAddHub} disabled={addingHub || !newHubName.trim()} sx={{ color: 'primary.main', p: '3px' }}>
                      {addingHub ? <CircularProgress size={14} /> : <AddIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Task area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {selectedHub && (
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
                  {selectedUser?.email} · {selectedHub.name} · {activeTasks.length} pending
                </Typography>
              )}

              {/* Add task */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 440 }}>
                <TextField
                  size="small" fullWidth placeholder="Add a task… (Enter)"
                  value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  disabled={addingTask || !selectedHubId}
                  sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
                />
                <IconButton onClick={handleAddTask} disabled={addingTask || !newTask.trim() || !selectedHubId} color="primary" size="small">
                  {addingTask ? <CircularProgress size={16} /> : <AddIcon />}
                </IconButton>
              </Box>

              {loadingTasks ? (
                <CircularProgress size={20} />
              ) : !selectedHubId ? (
                <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Select a hub above</Typography>
              ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No tasks yet</Typography>
              ) : (
                <>
                  {/* Active tasks */}
                  {activeTasks.length > 0 && (
                    <Box sx={{ mb: 2.5, maxWidth: 500 }}>
                      {activeTasks.map(task => (
                        <AdminTaskRow
                          key={task.id}
                          task={task}
                          onComplete={() => handleComplete(task)}
                          onRename={text => handleRename(task, text)}
                          onDelete={() => handleDeleteTask(task)}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Completion history */}
                  {completedTasks.length > 0 && (
                    <Box sx={{ maxWidth: 500 }}>
                      <Divider sx={{ mb: 2, borderColor: '#1f2937' }} />
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
                        Completion History
                      </Typography>
                      {grouped.map(({ label, tasks: dayTasks }) => (
                        <Box key={label} sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#4ade80', mb: 0.75 }}>
                            {label} · {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                          </Typography>
                          {dayTasks.map(task => (
                            <AdminTaskRow
                              key={task.id}
                              task={task}
                              completed
                              onComplete={() => handleComplete(task)}
                              onRename={text => handleRename(task, text)}
                              onDelete={() => handleDeleteTask(task)}
                            />
                          ))}
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>Administration</Typography>
        <Typography variant="caption" color="text.secondary">Manage users, sessions and todos</Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, minHeight: 36, borderBottom: '1px solid #1f2937', '& .MuiTab-root': { minHeight: 36, fontSize: 12, textTransform: 'none', py: 0.5 } }}
      >
        <Tab label="Sessions" />
        <Tab label="User Management" />
        <Tab label="Task Hubs" />
      </Tabs>

      {tab === 0 && <SessionsTab />}
      {tab === 1 && <UserTodosTab />}
      {tab === 2 && <AdminHubsTab />}
    </Box>
  )
}
