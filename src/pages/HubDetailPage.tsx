import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Typography, TextField, IconButton, CircularProgress,
  Tooltip, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { useHubStore } from '../store/hubStore'
import type { HubTask } from '../services/hubService'
import { confirm } from '../components/ConfirmDialog'

function formatDay(ts: number): string {
  const d = new Date(ts)
  const today    = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (sameDay(d, today))     return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function groupByDay(tasks: HubTask[]): { label: string; tasks: HubTask[] }[] {
  const map = new Map<string, HubTask[]>()
  for (const t of tasks) {
    const label = formatDay(t.completedAt!)
    const existing = map.get(label) ?? []
    map.set(label, [...existing, t])
  }
  return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }))
}

export default function HubDetailPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const { hubs, loadHubs, tasks, loadingTasks, loadTasks, addTask, completeTask, uncompleteTask, removeTask } = useHubStore()
  const [newText, setNewText] = useState('')
  const [adding, setAdding]   = useState(false)

  const hub = hubs.find(h => h.id === hubId)
  const hubTasks = hubId ? (tasks[hubId] ?? []) : []
  const isLoading = hubId ? (loadingTasks[hubId] ?? false) : false

  const activeTasks    = hubTasks.filter(t => !t.done)
  const completedTasks = hubTasks.filter(t => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  const grouped        = groupByDay(completedTasks)

  useEffect(() => {
    if (hubs.length === 0) loadHubs()
  }, [])

  useEffect(() => {
    if (hubId) loadTasks(hubId)
  }, [hubId])

  async function handleAdd() {
    const text = newText.trim()
    if (!text || !hubId) return
    setAdding(true)
    await addTask(hubId, text)
    setNewText('')
    setAdding(false)
  }

  async function handleComplete(task: HubTask) {
    if (!hubId) return
    if (task.done) await uncompleteTask(hubId, task.id)
    else await completeTask(hubId, task.id)
  }

  async function handleDelete(task: HubTask) {
    if (!hubId) return
    const ok = await confirm({
      title: 'Delete task',
      message: `Delete "${task.text}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    await removeTask(hubId, task.id)
  }

  if (!hub && !isLoading) {
    return (
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Hub not found.</Typography>
    )
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: 18 }}>
        {hub?.name ?? '…'}
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
        Task queue · {activeTasks.length} pending
      </Typography>

      {/* Add task */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, maxWidth: 480 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a task… (press Enter)"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          disabled={adding}
        />
        <IconButton onClick={handleAdd} disabled={adding || !newText.trim()} color="primary" size="small">
          {adding ? <CircularProgress size={18} /> : <AddIcon />}
        </IconButton>
      </Box>

      {/* Active queue */}
      {isLoading ? (
        <CircularProgress size={24} />
      ) : activeTasks.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 3 }}>
          Queue is empty — all tasks done!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 4, maxWidth: 560 }}>
          {activeTasks.map(task => (
            <Box
              key={task.id}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 1,
                borderRadius: '8px',
                bgcolor: '#0d1117',
                border: '1px solid #1f2937',
              }}
            >
              <Tooltip title="Mark complete">
                <IconButton
                  size="small"
                  onClick={() => handleComplete(task)}
                  sx={{ color: '#374151', '&:hover': { color: '#22c55e' }, p: '4px' }}
                >
                  <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Typography sx={{ flex: 1, fontSize: 13, color: '#e5e7eb' }}>
                {task.text}
              </Typography>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => handleDelete(task)}
                  sx={{ color: '#374151', '&:hover': { color: 'error.main' }, p: '4px' }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {/* Completion history */}
      {completedTasks.length > 0 && (
        <Box sx={{ maxWidth: 560 }}>
          <Divider sx={{ mb: 2.5, borderColor: '#1f2937' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 2 }}>
            Completion History
          </Typography>
          {grouped.map(({ label, tasks: dayTasks }) => (
            <Box key={label} sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#4ade80', mb: 1 }}>
                {label} · {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
              </Typography>
              {dayTasks.map(task => (
                <Box
                  key={task.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.75,
                    borderRadius: '8px',
                    mb: 0.5,
                    bgcolor: '#052e16',
                    border: '1px solid #166534',
                    opacity: 0.85,
                  }}
                >
                  <Tooltip title="Mark incomplete">
                    <IconButton
                      size="small"
                      onClick={() => handleComplete(task)}
                      sx={{ color: '#22c55e', '&:hover': { color: '#4ade80' }, p: '4px' }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ flex: 1, fontSize: 13, color: '#86efac', textDecoration: 'line-through' }}>
                    {task.text}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#4ade80', whiteSpace: 'nowrap' }}>
                    {new Date(task.completedAt!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task)}
                      sx={{ color: '#374151', '&:hover': { color: 'error.main' }, p: '4px' }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
