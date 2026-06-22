import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  onSnapshot,
  enableIndexedDbPersistence,
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase web config is public by design — security comes from Firestore rules
const firebaseConfig = {
  apiKey:            'VITE_FIREBASE_API_KEY_PLACEHOLDER',
  authDomain:        'VITE_FIREBASE_AUTH_DOMAIN_PLACEHOLDER',
  projectId:         'adhdoitapp',
  storageBucket:     'VITE_FIREBASE_STORAGE_BUCKET_PLACEHOLDER',
  messagingSenderId: 'VITE_FIREBASE_SENDER_ID_PLACEHOLDER',
  appId:             '1:VITE_FIREBASE_SENDER_ID_PLACEHOLDER:web:82bf6a0b399730331158bc',
}

const app  = initializeApp(firebaseConfig)
export const db   = getFirestore(app)
export const auth = getAuth(app)

// Enable offline persistence (silently fails in some browser configs)
enableIndexedDbPersistence(db).catch(() => {})

export async function fetchUserRole(uid: string): Promise<'admin' | 'viewer'> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data().role as 'admin' | 'viewer') : 'viewer'
  } catch {
    return 'viewer'
  }
}

export async function createUserRole(uid: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', uid), { role: 'viewer' })
    }
  } catch {
    // ignore — might fail if user doc already exists or rules deny it
  }
}

// ─── Todos ────────────────────────────────────────────────────────────────────

function todosCol(uid: string) {
  return collection(db, 'users', uid, 'todos')
}

export async function fetchTodos(uid: string) {
  const snap = await getDocs(query(todosCol(uid), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: Record<string, unknown>) => !t.archived)
}

export async function fetchArchivedTodos(uid: string) {
  const snap = await getDocs(query(todosCol(uid), orderBy('order')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t: Record<string, unknown>) => t.archived === true)
}

export async function saveTodo(uid: string, todo: Record<string, unknown>) {
  const { id, ...data } = todo
  await setDoc(doc(db, 'users', uid, 'todos', id as string), data)
}

export async function deleteTodo(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'todos', id))
}

// ─── Todo Comments ────────────────────────────────────────────────────────────

export async function fetchComments(uid: string, todoId: string) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'todos', todoId, 'comments'), orderBy('createdAt'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addComment(uid: string, todoId: string, comment: { text: string; authorName: string; createdAt: number }) {
  const ref = await addDoc(collection(db, 'users', uid, 'todos', todoId, 'comments'), comment)
  return ref.id
}

export async function deleteComment(uid: string, todoId: string, commentId: string) {
  await deleteDoc(doc(db, 'users', uid, 'todos', todoId, 'comments', commentId))
}

export async function bumpCommentCount(uid: string, todoId: string, delta: 1 | -1) {
  await updateDoc(doc(db, 'users', uid, 'todos', todoId), { commentCount: increment(delta) })
}

export async function setCommentCount(uid: string, todoId: string, count: number) {
  await updateDoc(doc(db, 'users', uid, 'todos', todoId), { commentCount: count })
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  userId: string
  email: string
  userAgent: string
  signedInAt: Timestamp
  lastSeen: Timestamp
  revoked: boolean
}

export async function createSession(userId: string, email: string, userAgent: string): Promise<string> {
  const ref = await addDoc(collection(db, 'sessions'), {
    userId, email, userAgent,
    signedInAt: Timestamp.now(),
    lastSeen: Timestamp.now(),
    revoked: false,
  })
  return ref.id
}

export async function updateSessionLastSeen(sessionId: string) {
  await updateDoc(doc(db, 'sessions', sessionId), { lastSeen: Timestamp.now() })
}

export async function deleteSession(sessionId: string) {
  await deleteDoc(doc(db, 'sessions', sessionId))
}

export async function fetchAllSessions(): Promise<Session[]> {
  const snap = await getDocs(query(collection(db, 'sessions'), orderBy('signedInAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Session))
}

export async function revokeSession(sessionId: string) {
  await updateDoc(doc(db, 'sessions', sessionId), { revoked: true })
}

export function watchSession(sessionId: string, onRevoked: () => void): () => void {
  return onSnapshot(doc(db, 'sessions', sessionId), snap => {
    if (snap.exists() && snap.data().revoked === true) onRevoked()
  })
}

export { Timestamp }

// ─── Focus State ──────────────────────────────────────────────────────────────

export interface FocusStateDoc {
  focusId: string | null
  focusAt: number | null
  focusAcc: number
  focusPaused: boolean
}

export async function saveFocusState(uid: string, state: FocusStateDoc) {
  await setDoc(doc(db, 'focusState', uid), state)
}

export async function clearFocusState(uid: string) {
  await deleteDoc(doc(db, 'focusState', uid))
}

export function watchFocusState(uid: string, onChange: (state: FocusStateDoc | null) => void): () => void {
  return onSnapshot(doc(db, 'focusState', uid), snap => {
    onChange(snap.exists() ? (snap.data() as FocusStateDoc) : null)
  })
}
