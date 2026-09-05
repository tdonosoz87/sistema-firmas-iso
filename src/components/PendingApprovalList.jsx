import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import Draggable from 'react-draggable'
import { PDFDocument, rgb } from 'pdf-lib'
import { obtenerDocumentosPendientes, uploadPdfToStorage, aprobarYFinalizarDocumento } from '../services/documentService'
import { useAuth } from '../context/AuthContext'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PendingApprovalList() {
  const { user, profile } = useAuth()
  const [pendientes, setPendientes] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState({ x: 200, y: 20 })
  const nodeRef = useRef(null)

  // Validar si el usuario actual tiene permisos de aprobación
  const esAprobador = profile?.perfil === 'Gerente' || profile?.subperfil_iso === 'Encargado SGSI'

  const cargarPendientes = async () => {
    try {
      const data = await obtenerDocumentosPendientes()
      setPendientes(data)
    } catch (err) {
      console.error('Error al cargar pendientes:', err)
    }
  }

  useEffect(() => {
    if (esAprobador) {
      cargarPendientes()
    }
  }, [profile])

  if (!esAprobador) return null

  const handleApprove = async () => {
    if (!selectedDoc) return
    setLoading(true)

    try {
      // 1. Descargar el PDF parcialmente firmado
      const response = await fetch(selectedDoc.url_pdf_parcial)
      const fileArrayBuffer = await response.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)

      const pages = pdfDoc.getPages()
      const currentPage = pages[0]
      const { height } = currentPage.getSize()

      const pdfX = Math.max(10, coords.x)
      const pdfY = Math.max(10, height - coords.y + 5)

      const fechaActual = new Date().toLocaleString('es-CL', {
        dateStyle: 'short',
        timeStyle: 'medium'
      })

      const lineasTexto = [
        `VB / APROBADO: ${profile?.email || user?.email}`,
        `Cargo: ${profile?.perfil || ''} [${profile?.subperfil_iso || 'Aprobador'}]`,
        `Fecha Aprobación: ${fechaActual}`
      ]

      lineasTexto.forEach((linea, index) => {
        currentPage.drawText(linea, {
          x: pdfX,
          y: pdfY - (index * 11),
          size: 8,
          color: rgb(0, 0.5, 0.2), // Color verde para indicar aprobación OK
        })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })

      // 2. Subir documento finalizado
      const publicUrl = await uploadPdfToStorage(blob, `FINAL_${selectedDoc.nombre_archivo}`, 'completados')

      // 3. Actualizar estado en Base de Datos
      await aprobarYFinalizarDocumento({
        documentoId: selectedDoc.id,
        urlFinal: publicUrl,
        aprobadorId: user.id,
        coordsFirma2: coords
      })

      alert('¡Documento aprobado y firmado exitosamente!')
      setSelectedDoc(null)
      cargarPendientes()
    } catch (error) {
      console.error('Error al aprobar documento:', error)
      alert('Ocurrió un error al procesar la aprobación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: '#f4fff6' }}>
      <h3 style={{ color: '#1e7e34', marginTop: 0 }}>📋 Bandeja de Aprobaciones (Gerente / Encargado SGSI)</h3>
      
      {pendientes.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#666' }}>No hay documentos pendientes de aprobación por el momento.</p>
      ) : (
        <div>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Selecciona un documento para dar Visto Bueno (OK):</label>
          <select 
            onChange={(e) => {
              const doc = pendientes.find(d => d.id === e.target.value)
              setSelectedDoc(doc || null)
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px', marginBottom: '15px' }}
          >
            <option value="">-- Seleccionar Documento --</option>
            {pendientes.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.nombre_archivo} (Creado: {new Date(doc.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>

          {selectedDoc && (
            <div>
              <p style={{ fontSize: '13px', color: '#333' }}>
                🖱️ **Arrastra el sello verde de aprobación** a la posición de la segunda firma:
              </p>

              <div style={{ position: 'relative', border: '2px dashed #28a745', display: 'inline-block', backgroundColor: '#fff' }}>
                <Draggable nodeRef={nodeRef} bounds="parent" onStop={(e, data) => setCoords({ x: data.x, y: data.y })} defaultPosition={{ x: 200, y: 20 }}>
                  <div 
                    ref={nodeRef}
                    style={{
                      position: 'absolute',
                      padding: '6px 10px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'grab',
                      zIndex: 999,
                      userSelect: 'none'
                    }}
                  >
                    ✅ VB: {profile?.email}
                  </div>
                </Draggable>

                <Document file={selectedDoc.url_pdf_parcial}>
                  <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              </div>

              <button 
                onClick={handleApprove} 
                disabled={loading}
                style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'block'
                }}
              >
                {loading ? 'Procesando Visto Bueno...' : ' Dar Visto Bueno (OK) y Generar PDF Final'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}