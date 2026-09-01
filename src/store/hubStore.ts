import { create } from 'zustand'
import { auth } from '../services/firebase'
import type { Hub, HubTask } from '../services/hubService'
import {
  fetchHubs, createHub, deleteHub,
  fetchHubTasks, addHubTask, completeHubTask, uncompleteHubTask, renameHubTask, deleteHubTask,
} from '../services/hubService'

function uid() {
  const u = auth.currentUser
  if (!u) throw new Error('Not authenticated')
  return u.uid
}

interface HubStore {
  hubs: Hub[]
  loading: boolean
  loadHubs: () => Promise<void>
  addHub: (name: string) => Promise<Hub>
  removeHub: (hubId: string) => Promise<void>

  tasks: Record<string, HubTask[]>
  loadingTasks: Record<string, boolean>
  loadTasks: (hubId: string) => Promise<void>
  addTask: (hubId: string, text: string) => Promise<void>
  completeTask: (hubId: string, taskId: string) => Promise<void>
  uncompleteTask: (hubId: string, taskId: string) => Promise<void>
  renameTask: (hubId: string, taskId: string, text: string) => Promise<void>
  removeTask: (hubId: string, taskId: string) => Promise<void>
}

export const useHubStore = create<HubStore>((set, get) => ({
  hubs: [],
  loading: false,
  tasks: {},
  loadingTasks: {},

  loadHubs: async () => {
    set({ loading: true })
    const hubs = await fetchHubs(uid())
    set({ hubs, loading: false })
  },

  addHub: async (name: string) => {
    const hubs = get().hubs
    const order = hubs.length > 0 ? Math.max(...hubs.map((h: Hub) => h.order)) + 1 : 0
    const hub = await createHub(uid(), name, order)
    set((s: HubStore) => ({ hubs: [...s.hubs, hub] }))
    return hub
  },

  removeHub: async (hubId: string) => {
    await deleteHub(uid(), hubId)
    set((s: HubStore) => {
      const tasks = { ...s.tasks }
      delete tasks[hubId]
      return { hubs: s.hubs.filter((h: Hub) => h.id !== hubId), tasks }
    })
  },

  loadTasks: async (hubId: string) => {
    set((s: HubStore) => ({ loadingTasks: { ...s.loadingTasks, [hubId]: true } }))
    const tasks = await fetchHubTasks(uid(), hubId)
    set((s: HubStore) => ({
      tasks: { ...s.tasks, [hubId]: tasks },
      loadingTasks: { ...s.loadingTasks, [hubId]: false },
    }))
  },

  addTask: async (hubId: string, text: string) => {
    const task = await addHubTask(uid(), hubId, text)
    set((s: HubStore) => ({ tasks: { ...s.tasks, [hubId]: [...(s.tasks[hubId] ?? []), task] } }))
  },

  completeTask: async (hubId: string, taskId: string) => {
    await completeHubTask(uid(), taskId)
    const completedAt = Date.now()
    set((s: HubStore) => ({
      tasks: {
        ...s.tasks,
        [hubId]: (s.tasks[hubId] ?? []).map((t: HubTask) =>
          t.id === taskId ? { ...t, done: true, completedAt } : t
        ),
      },
    }))
  },

  uncompleteTask: async (hubId: string, taskId: string) => {
    await uncompleteHubTask(uid(), taskId)
    set((s: HubStore) => ({
      tasks: {
        ...s.tasks,
        [hubId]: (s.tasks[hubId] ?? []).map((t: HubTask) =>
          t.id === taskId ? { ...t, done: false, completedAt: null } : t
        ),
      },
    }))
  },

  renameTask: async (hubId: string, taskId: string, text: string) => {
    await renameHubTask(uid(), taskId, text)
    set((s: HubStore) => ({
      tasks: {
        ...s.tasks,
        [hubId]: (s.tasks[hubId] ?? []).map((t: HubTask) =>
          t.id === taskId ? { ...t, text } : t
        ),
      },
    }))
  },

  removeTask: async (hubId: string, taskId: string) => {
    await deleteHubTask(uid(), taskId)
    set((s: HubStore) => ({
      tasks: {
        ...s.tasks,
        [hubId]: (s.tasks[hubId] ?? []).filter((t: HubTask) => t.id !== taskId),
      },
    }))
  },
}))
