import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { signOutUser } from '../services/authService'
import { PdfSigner } from '../components/PdfSigner'
import { PendingApprovalList } from '../components/PendingApprovalList'
import { SignedDocumentsHistory } from '../components/SignedDocumentsHistory'

export function Dashboard() {
  const { profile } = useAuth()
  const [reloadKey, setReloadKey] = useState(0)

  // Disparar recarga del historial tras aprobar o crear
  const triggerReload = () => setReloadKey(prev => prev + 1)

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <h1>Bienvenido al Sistema</h1>
      <p><strong>Correo:</strong> {profile?.email}</p>
      <p><strong>Perfil Principal:</strong> {profile?.perfil}</p>
      <p><strong>Subperfil ISO:</strong> {profile?.subperfil_iso || 'Ninguno'}</p>

      {/* 1. Bandeja de Aprobaciones para Gerente / Encargado SGSI */}
      <PendingApprovalList onApproved={triggerReload} />

      {/* 2. Módulo de Firma Inicial */}
      <PdfSigner onSigned={triggerReload} />

      {/* 3. Historial de Documentos Completados */}
      <SignedDocumentsHistory reloadKey={reloadKey} />

      <button onClick={signOutUser} style={{ marginTop: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        Cerrar Sesión
      </button>
    </div>
  )
}