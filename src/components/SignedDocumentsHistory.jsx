import { useState, useEffect } from 'react'
import { 
  obtenerDocumentosCompletados, 
  liberarAlmacenamientoPDF, 
  eliminarDocumentoCompletado 
} from '../services/documentService'

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

  // Liberar únicamente el archivo PDF del Storage manteniendo la traza de auditoría
  const handleLiberarStorage = async (id, nombre) => {
    const confirmar = window.confirm(
      `¿Deseas borrar el archivo PDF de la nube para "${nombre}"?\n\nEl registro de auditoría y su Hash SHA-256 SE CONSERVARÁN intactos.`
    )
    if (!confirmar) return

    try {
      await liberarAlmacenamientoPDF(id)
      alert('Archivo PDF eliminado del Storage. La traza de auditoría se mantiene guardada.')
      await cargarCompletados()
    } catch (err) {
      console.error('Error al liberar espacio:', err)
      alert('Ocurrió un error al intentar liberar el almacenamiento.')
    }
  }

  // Eliminar el registro por completo de la base de datos
  const handleDelete = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar DEFINITIVAMENTE "${nombre}" y su historial?`)
    if (!confirmar) return

    try {
      await eliminarDocumentoCompletado(id)
      alert('Registro eliminado exitosamente.')
      await cargarCompletados()
    } catch (err) {
      console.error('Error al eliminar registro:', err)
      alert('Ocurrió un error al intentar eliminar el registro.')
    }
  }

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
                justify: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ display: 'block', color: '#333', fontSize: '14px' }}>📄 {doc.nombre_archivo}</strong>
                <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '2px' }}>
                  Creado el: {new Date(doc.created_at).toLocaleString('es-CL')}
                </span>
                <span style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                  ✅ Estado: Completado (2/2 Firmas)
                </span>
                {doc.hash_documento && (
                  <span style={{ fontSize: '11px', color: '#0056b3', fontFamily: 'monospace', display: 'block', marginTop: '4px' }}>
                    <strong>Hash SHA-256:</strong> {doc.hash_documento.slice(0, 28)}...
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {doc.url_pdf_final ? (
                  <>
                    <a 
                      href={doc.url_pdf_final} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#0066cc',
                        color: '#fff',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      Abrir PDF ↗
                    </a>
                    <button 
                      onClick={() => handleLiberarStorage(doc.id, doc.nombre_archivo)}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Liberar Storage
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic', backgroundColor: '#e2e3e5', padding: '6px 10px', borderRadius: '4px' }}>
                    📦 Resguardo local (Storage liberado)
                  </span>
                )}

                <button 
                  onClick={() => handleDelete(doc.id, doc.nombre_archivo)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}