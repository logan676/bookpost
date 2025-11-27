import { useState } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

interface LoginModalProps {
  onClose: () => void
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { t } = useI18n()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = mode === 'login'
      ? await login(username, password)
      : await register(username, password)

    setLoading(false)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'An error occurred')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content login-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2>{mode === 'login' ? t.login : t.register}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t.username}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? t.loading : (mode === 'login' ? t.login : t.register)}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <span onClick={() => setMode('register')}>{t.register}</span>
          ) : (
            <span onClick={() => setMode('login')}>{t.login}</span>
          )}
        </div>
      </div>
    </div>
  )
}
