import { useMemo, useRef, useState, useEffect } from 'react'
import { Box, Paper, Typography, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined'
import * as dagre from '@dagrejs/dagre'
import type { Todo } from '../types'
import { getPendingBlockers } from '../utils/todoUtils'

const NODE_W = 220
const NODE_H = 90

interface LayoutNode {
  todo: Todo
  x: number
  y: number
  blocked: boolean
  pendingDepsCount: number
}

interface Edge {
  source: string
  target: string
  done: boolean
  points: { x1: number; y1: number; x2: number; y2: number }
}

function wouldCreateCycle(todos: Todo[], blockerId: string, blockedId: string): boolean {
  if (blockerId === blockedId) return true
  const visited = new Set<string>()
  const stack = [blockerId]
  while (stack.length) {
    const id = stack.pop()!
    if (id === blockedId) return true
    if (visited.has(id)) continue
    visited.add(id)
    const todo = todos.find(t => t.id === id)
    if (todo) (todo.dependsOn ?? []).forEach(d => stack.push(d))
  }
  return false
}

function buildLayout(todos: Todo[]): { nodes: LayoutNode[]; edges: Edge[]; width: number; height: number } {
  const activeTodos = todos.filter(t => !t.done)
  const doneTodos   = todos.filter(t => t.done)

  const activeDepsSet = new Set(activeTodos.flatMap(t => t.dependsOn ?? []))
  const pendingDone  = doneTodos.filter(t => activeDepsSet.has(t.id))
  const orphanDone   = doneTodos.filter(t => !activeDepsSet.has(t.id))
  const dagreTodos   = [...activeTodos, ...pendingDone]

  const activeHasDeps = new Set(
    activeTodos.filter(t => (t.dependsOn ?? []).some(id => activeTodos.some(x => x.id === id))).map(t => t.id)
  )
  const activeIsDep = new Set(
    activeTodos.filter(t => activeTodos.some(x => (x.dependsOn ?? []).includes(t.id))).map(t => t.id)
  )
  const connectedActiveIds = new Set([...activeHasDeps, ...activeIsDep])
  const connectedActive    = activeTodos.filter(t => connectedActiveIds.has(t.id))
  const independentActive  = activeTodos.filter(t => !connectedActiveIds.has(t.id))

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'BT', ranksep: 80, nodesep: 50, marginx: 40, marginy: 40 })

  dagreTodos.forEach(t => g.setNode(t.id, { width: NODE_W, height: NODE_H }))
  dagreTodos.forEach(t =>
    (t.dependsOn ?? []).forEach(depId => {
      if (dagreTodos.find(x => x.id === depId)) g.setEdge(depId, t.id)
    })
  )

  if (connectedActive.length > 0 && independentActive.length > 0) {
    g.setNode('__sep__', { width: 1, height: 1 })
    connectedActive.forEach(t => {
      if (!activeTodos.some(x => (x.dependsOn ?? []).includes(t.id)))
        g.setEdge(t.id, '__sep__')
    })
    independentActive.forEach(t => g.setEdge('__sep__', t.id))
  }

  dagre.layout(g)

  const dagreNodes: LayoutNode[] = dagreTodos.map(t => {
    const pos = g.node(t.id)
    const pending = getPendingBlockers(t, todos)
    return { todo: t, x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2, blocked: pending.length > 0, pendingDepsCount: pending.length }
  })

  const dagreMaxY = dagreNodes.length > 0 ? Math.max(...dagreNodes.map(n => n.y + NODE_H)) : 0
  const dagreMaxX = dagreNodes.length > 0 ? Math.max(...dagreNodes.map(n => n.x + NODE_W)) + 40 : 600

  const orphanStartY = dagreMaxY + (dagreTodos.length > 0 ? 80 : 40)
  const orphanPerRow = Math.max(1, Math.floor(Math.max(dagreMaxX, 600) / (NODE_W + 30)))

  const orphanNodes: LayoutNode[] = orphanDone.map((t, i) => ({
    todo: t,
    x: 40 + (i % orphanPerRow) * (NODE_W + 30),
    y: orphanStartY + Math.floor(i / orphanPerRow) * (NODE_H + 30),
    blocked: false,
    pendingDepsCount: 0,
  }))

  const nodes = [...dagreNodes, ...orphanNodes]
  const allMaxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + NODE_H)) + 40 : 400
  const allMaxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + NODE_W)) + 40 : 600

  const edges: Edge[] = todos.flatMap(t =>
    (t.dependsOn ?? []).flatMap(depId => {
      const src = nodes.find(n => n.todo.id === depId)
      const tgt = nodes.find(n => n.todo.id === t.id)
      if (!src || !tgt) return []
      const depDone = todos.find(x => x.id === depId)?.done ?? false
      return [{
        source: depId,
        target: t.id,
        done: depDone,
        points: {
          x1: src.x + NODE_W / 2,
          y1: src.y,
          x2: tgt.x + NODE_W / 2,
          y2: tgt.y + NODE_H,
        },
      }]
    })
  )

  return { nodes, edges, width: Math.max(allMaxX, 600), height: Math.max(allMaxY, 400) }
}

interface NodeCardProps {
  node: LayoutNode
  onClick: (todo: Todo) => void
  focused: boolean
  paused: boolean
  onConnectStart: (e: React.MouseEvent, side: 'top' | 'bottom') => void
  isDropTarget: boolean
  isDragSource: boolean
  anyDrag: boolean
}

function NodeCard({ node, onClick, focused, paused, onConnectStart, isDropTarget, isDragSource, anyDrag }: NodeCardProps) {
  const [hovered, setHovered] = useState(false)
  const { todo, x, y, blocked, pendingDepsCount } = node
  const status = todo.done ? 'done' : focused ? (paused ? 'paused' : 'focused') : blocked ? 'blocked' : 'available'

  const accentColor = status === 'done' ? '#374151' : status === 'focused' ? '#d97706' : status === 'paused' ? '#b45309' : status === 'blocked' ? '#7c3f3f' : '#22c55e'
  const borderColor = status === 'done' ? '#1f2937' : status === 'focused' ? '#92400e' : status === 'paused' ? '#78350f' : status === 'blocked' ? '#3d1f1f' : '#14532d'
  const bgColor     = status === 'done' ? '#0d1117' : status === 'focused' ? '#1a1000' : status === 'paused' ? '#110e00' : status === 'blocked' ? '#0d0808' : '#031a0e'
  const textColor   = status === 'done' ? '#6b7280' : status === 'focused' ? '#fef3c7' : status === 'paused' ? '#d6b87a' : status === 'blocked' ? '#6b7280' : '#f0fdf4'
  const statusColor = status === 'done' ? '#6b7280' : status === 'focused' ? '#fbbf24' : status === 'paused' ? '#92400e' : status === 'blocked' ? '#7c3f3f' : '#4ade80'
  const statusLabel = status === 'done' ? '✓ Done' : status === 'focused' ? '⏱ Focused' : status === 'paused' ? '⏸ Paused' : status === 'blocked' ? '🔒 Blocked' : '● Ready'

  const glowStyle = status === 'available'
    ? { boxShadow: '0 0 12px rgba(34,197,94,0.18), 0 0 0 1px rgba(34,197,94,0.12)' }
    : status === 'focused'
    ? { boxShadow: '0 0 16px rgba(217,119,6,0.3), 0 0 0 1px rgba(217,119,6,0.2)' }
    : {}

  const dropRing = isDropTarget
    ? { outline: '2px solid #60a5fa', outlineOffset: '2px', boxShadow: '0 0 18px rgba(96,165,250,0.4)' }
    : isDragSource
    ? { outline: '2px solid #fbbf24', outlineOffset: '2px' }
    : {}

  const showHandle = (hovered || isDragSource) && !todo.done

  return (
    <Paper
      onClick={() => { if (!anyDrag) onClick(todo) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      elevation={0}
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        pointerEvents: 'auto',
        cursor: anyDrag ? (isDropTarget ? 'crosshair' : 'default') : 'pointer',
        border: `1.5px solid ${borderColor}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: '10px',
        bgcolor: bgColor,
        opacity: status === 'done' ? 0.65 : status === 'blocked' ? 0.7 : status === 'paused' ? 0.75 : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: '10px 12px',
        transition: 'box-shadow 0.15s, border-color 0.15s, outline 0.1s',
        ...glowStyle,
        ...dropRing,
        '&:hover': anyDrag ? {} : {
          boxShadow: status === 'available'
            ? '0 0 20px rgba(34,197,94,0.3), 0 0 0 2px rgba(34,197,94,0.4)'
            : status === 'focused'
            ? '0 0 24px rgba(217,119,6,0.45), 0 0 0 2px rgba(217,119,6,0.4)'
            : `0 0 0 2px ${accentColor}55`,
        },
        userSelect: 'none',
      }}
    >
      {/* Connector handles — drag to wire a blocker (top and bottom) */}
      {showHandle && (['top', 'bottom'] as const).map(side => (
        <Tooltip key={side} title="Drag to create dependency" placement={side} arrow>
          <Box
            onMouseDown={e => { e.stopPropagation(); onConnectStart(e, side) }}
            sx={{
              position: 'absolute',
              ...(side === 'top' ? { top: -8 } : { bottom: -8 }),
              left: '50%',
              transform: 'translateX(-50%)',
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: '#2563eb',
              border: '2px solid #93c5fd',
              cursor: 'crosshair',
              zIndex: 20,
              transition: 'transform 0.1s, background-color 0.1s',
              '&:hover': {
                bgcolor: '#60a5fa',
                transform: 'translateX(-50%) scale(1.25)',
              },
            }}
          />
        </Tooltip>
      ))}

      <Typography
        variant="body2"
        sx={{
          fontSize: 12,
          lineHeight: 1.45,
          color: textColor,
          textDecoration: todo.done ? 'line-through' : 'none',
          wordBreak: 'break-word',
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {todo.text}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: statusColor }}>
          {statusLabel}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {pendingDepsCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#a78bfa' }}>
              <LockOutlinedIcon sx={{ fontSize: 11 }} />
              <Typography sx={{ fontSize: 10, lineHeight: 1, fontWeight: 600 }}>{pendingDepsCount}</Typography>
            </Box>
          )}
          {(todo.commentCount ?? 0) > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#93c5fd' }}>
              <CommentOutlinedIcon sx={{ fontSize: 11 }} />
              <Typography sx={{ fontSize: 10, lineHeight: 1, fontWeight: 600 }}>{todo.commentCount}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  )
}

interface DragState {
  fromId: string
  fromX: number
  fromY: number
  curX: number
  curY: number
}

interface Props {
  todos: Todo[]
  onSelect: (todo: Todo) => void
  onConnect: (blockerId: string, blockedId: string) => void
  onDisconnect: (blockerId: string, blockedId: string) => void
  focusedId: string | null
  paused: boolean
}

export default function TodoGraph({ todos, onSelect, onConnect, onDisconnect, focusedId, paused }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scaledRef    = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 520 })
  const [drag, setDrag]             = useState<DragState | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [pendingConnect, setPendingConnect]       = useState<{ blockerId: string; blockedId: string } | null>(null)
  const [pendingDisconnect, setPendingDisconnect] = useState<{ blockerId: string; blockedId: string } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setContainerSize({ w: el.offsetWidth, h: window.innerHeight - 180 })
    })
    ro.observe(el)
    setContainerSize({ w: el.offsetWidth, h: window.innerHeight - 180 })
    return () => ro.disconnect()
  }, [])

  const { nodes, edges, width, height } = useMemo(() => buildLayout(todos), [todos])

  const scale = containerSize.w > 0 && width > containerSize.w
    ? containerSize.w / width
    : 1

  function toCanvas(e: React.MouseEvent): { x: number; y: number } {
    const el = scaledRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  function handleConnectStart(e: React.MouseEvent, node: LayoutNode, side: 'top' | 'bottom') {
    e.preventDefault()
    const { x, y } = toCanvas(e)
    setDrag({
      fromId: node.todo.id,
      fromX: node.x + NODE_W / 2,
      fromY: side === 'top' ? node.y : node.y + NODE_H,
      curX: x,
      curY: y,
    })
    setDropTarget(null)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!drag) return
    const { x, y } = toCanvas(e)
    setDrag(prev => prev ? { ...prev, curX: x, curY: y } : null)
    const target = nodes.find(n =>
      n.todo.id !== drag.fromId &&
      x >= n.x && x <= n.x + NODE_W &&
      y >= n.y && y <= n.y + NODE_H
    )
    setDropTarget(target?.todo.id ?? null)
  }

  function finishDrag() {
    if (drag && dropTarget) {
      const alreadyLinked = todos.find(t => t.id === dropTarget)?.dependsOn?.includes(drag.fromId)
      if (!alreadyLinked && !wouldCreateCycle(todos, drag.fromId, dropTarget)) {
        setPendingConnect({ blockerId: drag.fromId, blockedId: dropTarget })
      }
    }
    setDrag(null)
    setDropTarget(null)
  }

  // Cancel drag if mouse leaves container without releasing
  useEffect(() => {
    if (!drag) return
    const cancel = () => { setDrag(null); setDropTarget(null) }
    window.addEventListener('mouseup', cancel)
    return () => window.removeEventListener('mouseup', cancel)
  }, [!!drag])

  return (
    <Box
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={finishDrag}
      sx={{
        height: Math.max(containerSize.h, 520),
        border: '1px solid #1f2937',
        borderRadius: 2,
        bgcolor: '#030712',
        overflow: 'auto',
        position: 'relative',
        cursor: drag ? 'crosshair' : 'default',
      }}
    >
      <div style={{ width: width * scale, height: height * scale, position: 'relative', flexShrink: 0 }}>
        <div
          ref={scaledRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, width, height }}
        >
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'visible' }}
          >
            <defs>
              <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#16a34a" />
              </marker>
              <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#7c3f3f" />
              </marker>
              <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#60a5fa" />
              </marker>
            </defs>

            {edges.map(e => {
              const { x1, y1, x2, y2 } = e.points
              const mid1y = y1 + (y2 - y1) * 0.4
              const mid2y = y1 + (y2 - y1) * 0.6
              const d = `M ${x1} ${y1} C ${x1} ${mid1y}, ${x2} ${mid2y}, ${x2} ${y2}`
              const color = e.done ? '#16a34a' : '#7c3f3f'
              const key = `${e.source}-${e.target}`
              const mx = (x1 + x2) / 2
              const my = (y1 + y2) / 2
              const isHovered = hoveredEdge === key && !drag
              return (
                <g key={key}>
                  {/* Wide invisible hitbox for hover detection */}
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={14}
                    fill="none"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredEdge(key)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {/* Visible arrow */}
                  <path
                    d={d}
                    stroke={isHovered ? '#ef4444' : color}
                    strokeWidth={isHovered ? 2 : (e.done ? 1.5 : 2)}
                    fill="none"
                    strokeDasharray={e.done && !isHovered ? undefined : '5,4'}
                    markerEnd={`url(#arrow-${isHovered ? 'red' : (e.done ? 'green' : 'red')})`}
                    opacity={e.done && !isHovered ? 0.6 : 1}
                    style={{ pointerEvents: 'none', transition: 'stroke 0.1s' }}
                  />
                  {/* X button at midpoint on hover */}
                  {isHovered && (
                    <g
                      transform={`translate(${mx}, ${my})`}
                      onClick={() => { setPendingDisconnect({ blockerId: e.source, blockedId: e.target }); setHoveredEdge(null) }}
                      onMouseEnter={() => setHoveredEdge(key)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    >
                      <circle r={11} fill="#1f2937" stroke="#ef4444" strokeWidth={1.5} />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ef4444"
                        fontSize={14}
                        fontWeight="bold"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Ghost wire while dragging */}
            {drag && (() => {
              const { fromX, fromY, curX, curY } = drag
              const mid1y = fromY + (curY - fromY) * 0.4
              const mid2y = fromY + (curY - fromY) * 0.6
              const dPath = `M ${fromX} ${fromY} C ${fromX} ${mid1y}, ${curX} ${mid2y}, ${curX} ${curY}`
              return (
                <path
                  d={dPath}
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6,4"
                  markerEnd="url(#arrow-blue)"
                  style={{ pointerEvents: 'none' }}
                />
              )
            })()}
          </svg>

          <div style={{ position: 'relative', width, height, pointerEvents: 'none' }}>
            {nodes.map(node => (
              <NodeCard
                key={node.todo.id}
                node={node}
                onClick={onSelect}
                focused={node.todo.id === focusedId}
                paused={paused}
                onConnectStart={(e, side) => handleConnectStart(e, node, side)}
                isDropTarget={dropTarget === node.todo.id}
                isDragSource={drag?.fromId === node.todo.id}
                anyDrag={!!drag}
              />
            ))}
          </div>

        </div>
      </div>

      {nodes.length === 0 && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 13 }}>No todos yet</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>Add your first todo above or use the AI assistant</Typography>
        </Box>
      )}

      {/* Confirm: add dependency */}
      <Dialog open={!!pendingConnect} onClose={() => setPendingConnect(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, pb: 1 }}>Add dependency?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.6 }}>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {todos.find(t => t.id === pendingConnect?.blockerId)?.text}
            </Box>
            {' will block '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {todos.find(t => t.id === pendingConnect?.blockedId)?.text}
            </Box>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button size="small" onClick={() => setPendingConnect(null)}>Cancel</Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              if (pendingConnect) onConnect(pendingConnect.blockerId, pendingConnect.blockedId)
              setPendingConnect(null)
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm: remove dependency */}
      <Dialog open={!!pendingDisconnect} onClose={() => setPendingDisconnect(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, pb: 1 }}>Remove dependency?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.6 }}>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {todos.find(t => t.id === pendingDisconnect?.blockerId)?.text}
            </Box>
            {' will no longer block '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {todos.find(t => t.id === pendingDisconnect?.blockedId)?.text}
            </Box>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button size="small" onClick={() => setPendingDisconnect(null)}>Cancel</Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              if (pendingDisconnect) onDisconnect(pendingDisconnect.blockerId, pendingDisconnect.blockedId)
              setPendingDisconnect(null)
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
