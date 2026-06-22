import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
} from '@mui/material'
import { useAuthStore } from '../store/authStore'

export default function SignUpPage() {
  const { signUp, user } = useAuthStore()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/todos', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPwd) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await signUp(email, password)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled yet. The admin needs to enable it in the Firebase console.')
      } else {
        setError(`Could not create account. (${code || 'unknown error'})`)
      }
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 360, p: 4, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }} gutterBottom>
          ADHDoit
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your account — you'll start as a viewer until an admin grants write access.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              size="small"
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              size="small"
              fullWidth
              helperText="At least 6 characters"
            />
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              size="small"
              fullWidth
            />
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Create account'}
            </Button>
          </Box>
        </form>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: 'center', fontSize: 12 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  )
}
