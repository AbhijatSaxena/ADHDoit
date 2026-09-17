import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

export interface SpaceOption {
  id: string
  name: string
  count: number
}

interface Props {
  options: SpaceOption[]
  selectedId: string
  onSelect: (id: string) => void
  onPrev: () => void
  onNext: () => void
}

export default function SpaceSwitcher({ options, selectedId, onSelect, onPrev, onNext }: Props) {
  if (options.length <= 2) return null // just "All" + one real tree — nothing to switch between

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
      <Tooltip title="Previous space (Ctrl+Alt+←)" arrow>
        <IconButton
          size="small"
          onClick={onPrev}
          sx={{ color: 'text.secondary', border: '1px solid #1f2937', borderRadius: 1.5, p: '4px', '&:hover': { color: 'primary.main', borderColor: 'primary.main' } }}
        >
          <ChevronLeftIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', flex: 1, py: 0.25, '&::-webkit-scrollbar': { height: 4 } }}>
        {options.map(opt => {
          const active = opt.id === selectedId
          return (
            <Box
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(opt.id) } }}
              sx={{
                flexShrink: 0,
                px: 1.5, py: 0.5,
                borderRadius: '999px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'white' : 'text.secondary',
                border: '1px solid',
                borderColor: active ? 'primary.main' : '#1f2937',
                '&:hover': { borderColor: active ? 'primary.main' : '#374151', color: active ? 'white' : 'text.primary' },
                '&:focus-visible': { outline: '2px solid #60a5fa', outlineOffset: 1 },
              }}
            >
              {opt.name}{opt.count > 0 ? ` (${opt.count})` : ''}
            </Box>
          )
        })}
      </Box>

      <Tooltip title="Next space (Ctrl+Alt+→)" arrow>
        <IconButton
          size="small"
          onClick={onNext}
          sx={{ color: 'text.secondary', border: '1px solid #1f2937', borderRadius: 1.5, p: '4px', '&:hover': { color: 'primary.main', borderColor: 'primary.main' } }}
        >
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
