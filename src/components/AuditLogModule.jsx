import { useState, useEffect } from 'react'
import { obtenerRegistroAuditoria } from '../services/documentService'

export function AuditLogModule({ reloadKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)

  const cargarAuditoria = async () => {
    setLoading(true)
    try {
      const data = await obtenerRegistroAuditoria()
      setRegistros(data)
    } catch (err) {
      console.error('Error al cargar registro de auditoría:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarAuditoria()
  }, [reloadKey])

  // Función para exportar la tabla activa a CSV (compatible con Excel)
  const exportarCSV = () => {
    if (registros.length === 0) {
      alert('No hay registros para exportar.')
      return
    }

    // Encabezados del archivo
    const headers = ['ID Documento', 'Nombre Archivo', 'Estado', 'Creador (Firma 1)', 'Fecha Firma 1', 'Aprobador (Firma 2)', 'Fecha Firma 2']

    // Mapeo de filas
    const rows = registros.map(doc => [
      `"${doc.id}"`,
      `"${doc.nombre_archivo}"`,
      `"${doc.estado}"`,
      `"${doc.email_creador_resuelto || ''}"`,
      `"${doc.created_at ? new Date(doc.created_at).toLocaleString('es-CL') : ''}"`,
      `"${doc.email_aprobador_resuelto || ''}"`,
      `"${doc.firma_2_info?.fecha ? new Date(doc.firma_2_info.fecha).toLocaleString('es-CL') : ''}"`
    ])

    // Incluir BOM (\uFEFF) para garantizar la lectura correcta de tildes y caracteres especiales en Excel
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n')
    
    // Crear enlace de descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Auditoria_Firmas_ISO_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #6c757d', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#343a40', margin: 0 }}>📊 Registro y Traza de Firmantes (Auditoría ISO)</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportarCSV} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📥 Exportar CSV (Excel)
          </button>
          <button onClick={cargarAuditoria} style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
            🔄 Actualizar Traza
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: '#666' }}>Cargando registros de auditoría...</p>
      ) : registros.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666' }}>No hay registros disponibles.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '10px' }}>Documento</th>
              <th style={{ padding: '10px' }}>Firma 1 (Analista / Creador)</th>
              <th style={{ padding: '10px' }}>Firma 2 (VB Gerente / SGSI)</th>
              <th style={{ padding: '10px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>📄 {doc.nombre_archivo}</td>
                
                {/* Registro Firma 1 */}
                <td style={{ padding: '10px' }}>
                  <div><strong>{doc.email_creador_resuelto}</strong></div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleString('es-CL') : 'Sin fecha'}
                  </div>
                </td>

                {/* Registro Firma 2 */}
                <td style={{ padding: '10px' }}>
                  {doc.firma_2_info?.fecha ? (
                    <>
                      <div><strong>{doc.email_aprobador_resuelto}</strong></div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {new Date(doc.firma_2_info.fecha).toLocaleString('es-CL')}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#856404', fontStyle: 'italic' }}>Pendiente de Aprobación</span>
                  )}
                </td>

                {/* Estado */}
                <td style={{ padding: '10px' }}>
                  {doc.estado === 'COMPLETADO' ? (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Completado (2/2)</span>
                  ) : (
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>⏳ En Proceso (1/2)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}