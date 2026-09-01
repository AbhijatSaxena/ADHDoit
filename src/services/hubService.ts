import {
  collection, doc, addDoc, deleteDoc, getDocs,
  query, orderBy, updateDoc,
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

function hubsCol(uid: string) {
  return collection(db, 'users', uid, 'hubs')
}

function tasksCol(uid: string, hubId: string) {
  return collection(db, 'users', uid, 'hubs', hubId, 'tasks')
}

export async function fetchHubs(uid: string): Promise<Hub[]> {
  const snap = await getDocs(query(hubsCol(uid), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Hub))
}

export async function createHub(uid: string, name: string, order: number): Promise<Hub> {
  const ref = await addDoc(hubsCol(uid), { name, createdAt: Date.now(), order })
  return { id: ref.id, name, createdAt: Date.now(), order }
}

export async function deleteHub(uid: string, hubId: string): Promise<void> {
  // Delete all tasks first
  const snap = await getDocs(tasksCol(uid, hubId))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'users', uid, 'hubs', hubId))
}

export async function fetchHubTasks(uid: string, hubId: string): Promise<HubTask[]> {
  const snap = await getDocs(query(tasksCol(uid, hubId), orderBy('createdAt')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as HubTask))
}

export async function addHubTask(uid: string, hubId: string, text: string): Promise<HubTask> {
  const task: Omit<HubTask, 'id'> = { text, createdAt: Date.now(), completedAt: null, done: false }
  const ref = await addDoc(tasksCol(uid, hubId), task)
  return { id: ref.id, ...task }
}

export async function completeHubTask(uid: string, hubId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'hubs', hubId, 'tasks', taskId), {
    done: true,
    completedAt: Date.now(),
  })
}

export async function uncompleteHubTask(uid: string, hubId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'hubs', hubId, 'tasks', taskId), {
    done: false,
    completedAt: null,
  })
}

export async function deleteHubTask(uid: string, hubId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'hubs', hubId, 'tasks', taskId))
}
