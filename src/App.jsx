import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

function MainContent() {
  const { user, loading } = useAuth()

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando...</p>

  return user ? <Dashboard /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}