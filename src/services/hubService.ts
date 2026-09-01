import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, where, updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'

export interface Hub {
  id: string
  name: string
  createdAt: number
  order: number
}

export interface HubTask {
  id: string
  text: string
  createdAt: number
  completedAt: number | null
  done: boolean
}

// Hubs and hub tasks are stored inside users/{uid}/todos with a `type` field
// so they fall under the existing Firestore rules without any changes.

function todosCol(uid: string) {
  return collection(db, 'users', uid, 'todos')
}

export async function fetchHubs(uid: string): Promise<Hub[]> {
  const snap = await getDocs(query(todosCol(uid), where('type', '==', 'hub')))
  return snap.docs
    .map(d => { const data = d.data(); return { id: d.id, name: data.hubName, createdAt: data.createdAt, order: data.order } })
    .sort((a, b) => a.order - b.order)
}

export async function createHub(uid: string, name: string, order: number): Promise<Hub> {
  const ref = await addDoc(todosCol(uid), {
    type: 'hub',
    hubName: name,
    createdAt: Date.now(),
    order,
    // stub fields so existing todo queries (which filter !archived) still ignore this
    text: `__hub__${name}`,
    done: false,
    archived: true,
  })
  return { id: ref.id, name, createdAt: Date.now(), order }
}

export async function deleteHub(uid: string, hubId: string): Promise<void> {
  // Delete all hub tasks first
  const snap = await getDocs(query(todosCol(uid), where('type', '==', 'hubTask'), where('hubId', '==', hubId)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'users', uid, 'todos', hubId))
}

export async function fetchHubTasks(uid: string, hubId: string): Promise<HubTask[]> {
  const snap = await getDocs(query(todosCol(uid), where('type', '==', 'hubTask'), where('hubId', '==', hubId)))
  return snap.docs
    .map(d => { const data = d.data(); return { id: d.id, text: data.text, createdAt: data.createdAt, completedAt: data.completedAt ?? null, done: data.done } })
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function addHubTask(uid: string, hubId: string, text: string): Promise<HubTask> {
  const now = Date.now()
  const ref = await addDoc(todosCol(uid), {
    type: 'hubTask',
    hubId,
    text,
    createdAt: now,
    completedAt: null,
    done: false,
    archived: true, // hidden from the regular todos view
    order: now,
  })
  return { id: ref.id, text, createdAt: now, completedAt: null, done: false }
}

export async function completeHubTask(uid: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'todos', taskId), { done: true, completedAt: Date.now() })
}

export async function uncompleteHubTask(uid: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'todos', taskId), { done: false, completedAt: null })
}

export async function renameHubTask(uid: string, taskId: string, text: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'todos', taskId), { text })
}

export async function deleteHubTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'todos', taskId))
}
