import { useAuth } from '../context/AuthContext'
import { signOutUser } from '../services/authService'
import { PdfSigner } from '../components/PdfSigner'
import { PendingApprovalList } from '../components/PendingApprovalList'

export function Dashboard() {
  const { profile } = useAuth()

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <h1>Bienvenido al Sistema</h1>
      <p><strong>Correo:</strong> {profile?.email}</p>
      <p><strong>Perfil Principal:</strong> {profile?.perfil}</p>
      <p><strong>Subperfil ISO:</strong> {profile?.subperfil_iso || 'Ninguno'}</p>

      {/* 1. Módulo para que Gerente o Encargado SGSI apruebe segundas firmas */}
      <PendingApprovalList />

      {/* 2. Módulo de Firma Inicial */}
      <PdfSigner />

      <button onClick={signOutUser} style={{ marginTop: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        Cerrar Sesión
      </button>
    </div>
  )
}