import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, IconButton, CircularProgress,
  Paper, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useHubStore } from '../store/hubStore'
import { confirm } from '../components/ConfirmDialog'

export default function TaskHubPage() {
  const { hubs, loading, loadHubs, addHub, removeHub } = useHubStore()
  const [newName, setNewName] = useState('')
  const [adding, setAdding]   = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadHubs() }, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await addHub(name)
    setNewName('')
    setAdding(false)
  }

  async function handleDelete(hubId: string, hubName: string) {
    const ok = await confirm({
      title: `Delete "${hubName}"?`,
      message: 'This will permanently delete the hub and all its tasks.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    await removeHub(hubId)
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: 18 }}>
        Task Hub
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
        Organise tasks by category. Each hub gets its own queue and completion history.
      </Typography>

      {/* Create hub */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, maxWidth: 420 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="New hub name… (press Enter)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          disabled={adding}
        />
        <IconButton onClick={handleAdd} disabled={adding || !newName.trim()} color="primary" size="small">
          {adding ? <CircularProgress size={18} /> : <AddIcon />}
        </IconButton>
      </Box>

      {/* Hub list */}
      {loading ? (
        <CircularProgress size={24} />
      ) : hubs.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
          No hubs yet. Create one above to get started.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 480 }}>
          {hubs.map(hub => (
            <Paper
              key={hub.id}
              elevation={0}
              sx={{
                display: 'flex', alignItems: 'center',
                px: 2, py: 1.5,
                bgcolor: '#111827', border: '1px solid #1f2937', borderRadius: '10px',
                cursor: 'pointer',
                '&:hover': { borderColor: '#374151' },
              }}
              onClick={() => navigate(`/hub/${hub.id}`)}
            >
              <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
                {hub.name}
              </Typography>
              <Tooltip title="Delete hub">
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); handleDelete(hub.id, hub.name) }}
                  sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, mr: 0.5 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}
