import { useAuth } from '../context/AuthContext'
import { signOutUser } from '../services/authService'
import { PdfSigner } from '../components/PdfSigner'

export function Dashboard() {
  const { profile } = useAuth()

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Bienvenido al Sistema</h1>
      <p><strong>Correo:</strong> {profile?.email}</p>
      <p><strong>Perfil Principal:</strong> {profile?.perfil}</p>
      <p><strong>Subperfil ISO:</strong> {profile?.subperfil_iso || 'Ninguno'}</p>

      {profile?.subperfil_iso && (
        <div style={{ background: '#e0f7fa', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
          🔒 **Módulo ISO Habilitado:** Tienes permisos como {profile.subperfil_iso}.
        </div>
      )}

      {/* Componente para firmar PDF */}
      <PdfSigner />

      <button onClick={signOutUser} style={{ marginTop: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        Cerrar Sesión
      </button>
    </div>
  )
}