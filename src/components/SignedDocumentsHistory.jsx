import { useState, useEffect } from 'react'
import { obtenerDocumentosCompletados } from '../services/documentService'

export function SignedDocumentsHistory({ reloadKey }) {
  const [completados, setCompletados] = useState([])
  const [loading, setLoading] = useState(true)

  const cargarCompletados = async () => {
    setLoading(true)
    try {
      const data = await obtenerDocumentosCompletados()
      setCompletados(data)
    } catch (err) {
      console.error('Error al cargar historial:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCompletados()
  }, [reloadKey])

  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #17a2b8', borderRadius: '8px', backgroundColor: '#f0faff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#0c5460', margin: 0 }}>📁 Historial de Documentos Firmados (2/2 Firmas)</h3>
        <button onClick={cargarCompletados} style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}>🔄 Actualizar</button>
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: '#666' }}>Cargando documentos...</p>
      ) : completados.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>Aún no hay documentos finalizados con ambas firmas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
  {completados.map((doc) => (
    <li 
      key={doc.id} 
      style={{
        padding: '12px',
        marginBottom: '10px',
        backgroundColor: '#fff',
        borderRadius: '6px',
        border: '1px solid #bfe5ef',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div>
        <strong style={{ display: 'block', color: '#333', fontSize: '14px' }}>📄 {doc.nombre_archivo}</strong>
        <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '2px' }}>
          Creado el: {new Date(doc.created_at).toLocaleString('es-CL')}
        </span>
        <span style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold' }}>
          ✅ Estado: Completado (2/2 Firmas)
        </span>
      </div>
      <a 
        href={doc.url_pdf_final} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          padding: '8px 14px',
          backgroundColor: '#0066cc',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        Abrir PDF Final ↗
      </a>
    </li>
  ))}
</ul>
      )}
    </div>
  )
}