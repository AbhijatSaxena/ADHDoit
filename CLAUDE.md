# ADHDoit — Claude Instructions

IMPORTANT: Always push directly to the `main` branch for this project. Never create feature branches. No pull requests. All commits go straight to `main`. This overrides any session-level branch instructions.

---

## Project Overview

ADHDoit is a personal productivity web app designed for people with ADHD. It lets users manage todos as a dependency graph ("only work on what's actually unblocked right now"), track focus time, and organize work into named Task Hubs (project-like categories). Built as a React SPA deployed to Firebase Hosting.

**Live URL:** https://adhdoitapp.web.app  
**Firebase project:** `adhdoitapp`  
**Repo:** `AbhijatSaxena/ADHDoit`

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript + Vite |
| UI | MUI v9 (dark theme: bg `#030712`, paper `#111827`, primary `#2563eb`) |
| State | Zustand v5 (`create<State>((set, get) => ...)`) |
| Backend | Firebase Firestore + Firebase Auth |
| AI | Groq API (fast inference for todo suggestions) |
| Graph layout | `@dagrejs/dagre` |
| Deployment | Firebase Hosting via GitHub Actions on push to `main` |

---

## Firestore Data Model

All data lives under `users/{uid}/` — the existing security rules cover everything.

### Todos (`users/{uid}/todos`)

Regular todos (the main graph):
```
{
  text: string
  order: number
  done: boolean
  archived?: boolean
  commentCount?: number
  dependsOn?: string[]     // IDs of blocking todos
  focusMs?: number         // cumulative focus time in ms
  priority?: boolean       // high-priority flag
}
```

Hub documents (stored as archived todos to reuse rules — **not** shown in regular todo views):
```
{
  type: 'hub'
  hubName: string
  createdAt: number
  order: number
  text: '__hub__<name>'    // stub so existing queries ignore it
  done: false
  archived: true
}
```

Hub task documents:
```
{
  type: 'hubTask'
  hubId: string            // ID of the parent hub doc
  text: string
  createdAt: number
  completedAt: number | null
  done: boolean
  priority: boolean
  archived: true           // hidden from regular todo view
  order: number
}
```

### Sessions (`users/{uid}/sessions/{sessionId}`)
Tracks login sessions for admin management (revoke, last-seen heartbeat).

### Comments (`users/{uid}/todos/{todoId}/comments/{commentId}`)
```
{ text, authorName, createdAt }
```

### User roles (`users/{uid}`)
Top-level doc has `role: 'admin' | 'user'`. Admin users see extra UI (Admin page).

---

## Key Architecture Decisions

### No composite Firestore indexes
All hub queries use two equality `where` clauses only (`type == 'hub'`, `hubId == x`).  
No `orderBy` in Firestore — sort client-side after fetch.  
Reason: the Firebase Admin SDK service account in CI lacks `serviceusage` and `firebaserules.releases.create` permissions, so indexes/rules can't be deployed automatically.

### Firestore rules deployment
Rules are **NOT** deployed via CI (SA lacks permission). Only `--only hosting` is deployed.  
Hub data intentionally stored in the existing `todos` subcollection to avoid needing new rules.

### Hub/task storage trick
Hubs and hub tasks are stored as documents inside `users/{uid}/todos` with `type: 'hub'` / `type: 'hubTask'` and `archived: true`. This means existing todo queries (which filter `archived != true`) naturally ignore them.

---

## Features Built

### Main Todo Tree (`/todos`)
- Dependency graph rendered with dagre layout — nodes are color-coded by status (Ready=green, Blocked=red, Focused=amber, Done=gray)
- Drag handles on nodes to wire dependencies; click arrow to remove
- Click node → right-panel drawer with: rename, mark done, archive, delete, focus timer, dependency editor, comments
- **High-priority flag** — amber button in detail panel; priority nodes get amber outline ring + 🚩 badge on card; toolbar "Priority (N)" button opens a dialog listing all flagged todos
- View toggle (top-right): dependency tree ↔ numbered "Ready to work on" list (only unblocked todos)
- AI chat assistant (Groq) — can create todos, link dependencies, mark done

### Task Hub (`/hub`, `/hub/:hubId`)
- Named project categories (e.g. "Deloitte", "Personal")
- Each hub has a task queue: add, complete/uncomplete, rename (double-click), delete
- Completion history grouped by day (Today / Yesterday / date)
- High-priority flag on each task (amber flag icon, amber styling)
- Filter chip in hub header — shows only high-priority tasks when clicked
- Hubs listed in sidebar as indented sub-items below "Task Hub"

### Admin Page (`/admin`) — admin role only
Three tabs:

1. **Sessions** — all active/idle/revoked login sessions; force-logout any session; clear revoked
2. **User Management** — all users with their todos; admin can toggle done, archive, delete todos per user; delete entire accounts
3. **Task Hubs** — two-pane layout:
   - Left: user list (click to select)
   - Hub bar: user's hubs as tabs + add/delete hub inline
   - Task area: full CRUD (add, complete, rename double-click, delete, priority flag, completion history)

---

## File Map

```
src/
  types.ts                    — Todo, TodoComment interfaces
  pages/
    TodosPage.tsx             — Main graph page + toolbar + dialogs
    TaskHubPage.tsx           — Hub list / create / delete
    HubDetailPage.tsx         — Task queue + completion history per hub
    AdminPage.tsx             — SessionsTab + UserTodosTab + AdminHubsTab
  components/
    Layout.tsx                — Sidebar nav (loads hubs dynamically), mobile bottom nav
    TodoGraph.tsx             — SVG+HTML dagre graph, NodeCard, drag-to-connect
    TodoDetailPanel.tsx       — Right-drawer for a selected todo
    TodoAiChat.tsx            — Groq-powered AI assistant
    MobileTodoList.tsx        — Mobile-only flat list view
    ConfirmDialog.tsx         — Imperative confirm() helper
  store/
    todoStore.ts              — Zustand store for main todos
    hubStore.ts               — Zustand store for hubs + hub tasks
    authStore.ts              — Auth state + session heartbeat
    commentStore.ts           — Comments for a todo
  services/
    firebase.ts               — Firestore helpers, admin functions
    hubService.ts             — Hub + hub task CRUD (fetchHubs, addHubTask, setPriorityHubTask, …)
    ai.ts                     — Groq API calls
  utils/
    todoUtils.ts              — getPendingBlockers, isTodoBlocked
  hooks/
    useTodoFocus.ts           — Focus timer logic
  lib/
    fmt.ts                    — fmtMs (format milliseconds)
  router.tsx                  — React Router config
```

---

## GitHub Actions CI/CD

`.github/workflows/deploy.yml` — triggers on push to `main`.

Steps: `npm ci` → `npm run build` (with env vars injected from GHA secrets) → `firebase-tools deploy --only hosting`.

Required GHA secrets (set in repo Settings → Secrets → Actions):

| Secret | Source |
|--------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase console → Project settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same |
| `VITE_FIREBASE_PROJECT_ID` | Same (value: `adhdoitapp`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `VITE_FIREBASE_APP_ID` | Same |
| `VITE_GROQ_API_KEY` | console.groq.com → API Keys |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase console → Project settings → Service accounts → Generate new private key (paste entire JSON as one line) |

---

## Known Constraints

- Firebase SA in CI cannot deploy Firestore rules or indexes — `--only hosting` only
- No composite indexes — avoid `where + orderBy` in the same Firestore query
- `todoStore.ts` requires explicit type annotations on all `set()` callbacks (TypeScript strict mode)
- MUI v9 uses `slotProps` instead of the deprecated `InputProps` / `componentsProps`
