# ADHDoit

A todo app built for ADHD brains — dependency graphs, focus mode, and AI-assisted task creation.

Live at **[adhdoitapp.web.app](https://adhdoitapp.web.app)**

## Features

- **Dependency graph** — link todos so blocked tasks are visually surfaced; uses a DAG layout via dagre
- **Focus mode** — one task at a time, with a live timer synced to Firestore so it persists across devices
- **AI task creation** — describe what you need to do and get structured todos via Groq (Llama 3.3-70b)
- **Per-task comments** — leave notes or context on any todo
- **Archive & done** — separate done from archived; archived todos stay out of the way but are recoverable
- **Session management** — see all active sessions, remotely revoke any of them
- **Admin panel** — manage all users, their todos, and sessions; delete accounts

## Stack

| Layer | Tech |
|---|---|
| UI | React 18 + TypeScript + Vite |
| Component library | MUI v9 (dark theme) |
| State | Zustand v5 |
| Database & Auth | Firebase Firestore + Firebase Auth |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Graph layout | `@dagrejs/dagre` |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your Firebase + Groq credentials
cp .env.example .env.local
# Fill in the values from Firebase Console and console.groq.com

# 3. Start dev server
npm run dev
```

## Environment variables

See `.env.example` for all required variables:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GROQ_API_KEY
```

## Deployment

Deploys automatically to Firebase Hosting on every push to `main` via GitHub Actions.

Required GitHub secrets: `FIREBASE_SERVICE_ACCOUNT`, `VITE_GROQ_API_KEY`, and all six `VITE_FIREBASE_*` vars.

To deploy manually:

```bash
npm run build
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx firebase-tools deploy --only hosting --project adhdoitapp
```

## Data model

```
users/{uid}
  role: 'admin' | 'viewer'
  email: string

  todos/{todoId}
    text: string
    order: number
    done: boolean
    archived?: boolean
    dependsOn?: string[]
    focusMs?: number
    commentCount?: number

    comments/{commentId}
      text: string
      authorName: string
      createdAt: number

sessions/{sessionId}
  userId: string
  email: string
  userAgent: string
  signedInAt: Timestamp
  lastSeen: Timestamp
  revoked: boolean

focusState/{uid}
  focusId: string | null
  focusAt: number | null
  focusAcc: number
  focusPaused: boolean
```

## Roles

- **Admin** — full access to all users' todos, sessions, and the admin panel
- **Viewer** — can manage their own todos only; no admin panel access
