import { useCallback, useEffect, useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, Chip, CircularProgress, Paper, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemText, Button,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import {
  fetchAllSessions, revokeSession, fetchAllUsers, fetchTodos, fetchArchivedTodos,
  saveTodo, deleteTodo, deleteUserAccount,
} from '../services/firebase'
import type { Session, UserRecord } from '../services/firebase'
import type { Todo } from '../types'
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
  const currentSessionId = useAuthStore(s => s.sessionId)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try { setSessions(await fetchAllSessions()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
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
      </Tabs>

      {tab === 0 && <SessionsTab />}
      {tab === 1 && <UserTodosTab />}
    </Box>
  )
}
