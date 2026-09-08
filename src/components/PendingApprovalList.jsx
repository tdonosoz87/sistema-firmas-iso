import { useState, useEffect, useRef } from 'react'
import Draggable from 'react-draggable'
import { PDFDocument, rgb } from 'pdf-lib'
import { obtenerDocumentosPendientes, uploadPdfToStorage, aprobarYFinalizarDocumento } from '../services/documentService'
import { useAuth } from '../context/AuthContext'

import { Document, Page, pdfjs } from 'react-pdf'
// Configuración moderna y robusta del worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export function PendingApprovalList({ onApproved }) {
  const { user, profile } = useAuth()
  const [pendientes, setPendientes] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  
  // Control de páginas multipágina
  const [numPages, setNumPages] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)

  // Estado para controlar si se desea renombrar y el nuevo nombre
  const [quiereRenombrar, setQuiereRenombrar] = useState(false)
  const [customFileName, setCustomFileName] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState({ x: 200, y: 20 })
  const nodeRef = useRef(null)

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

  const handleSelectDoc = (docId) => {
    const doc = pendientes.find(d => d.id === docId)
    setSelectedDoc(doc || null)
    setPageNumber(1)
    setQuiereRenombrar(false)
    setCustomFileName(doc ? doc.nombre_archivo : '')
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const handleApprove = async () => {
    if (!selectedDoc) return
    setLoading(true)

    try {
      // 1. Descargar el PDF parcialmente firmado
      const response = await fetch(selectedDoc.url_pdf_parcial)
      const fileArrayBuffer = await response.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)

      const pages = pdfDoc.getPages()
      
      // 2. Obtener la página seleccionada actualmente (en base 0)
      const targetPageIndex = Math.max(0, Math.min(pageNumber - 1, pages.length - 1))
      const currentPage = pages[targetPageIndex]
      const { height: pdfHeight } = currentPage.getSize()

      // 3. Ajuste y protección de coordenadas para evitar errores fuera de límites
      const pdfX = Math.max(10, coords.x)
      const pdfY = Math.max(10, pdfHeight - coords.y)

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
          color: rgb(0, 0.5, 0.2),
        })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })

      // Definir el nombre final según la elección del usuario
      let nombreDefinitivo = selectedDoc.nombre_archivo
      if (quiereRenombrar && customFileName.trim() !== '') {
        nombreDefinitivo = customFileName.trim()
      }

      const nombreConExtension = nombreDefinitivo.endsWith('.pdf') ? nombreDefinitivo : `${nombreDefinitivo}.pdf`

      // 4. Subir documento finalizado
      const publicUrl = await uploadPdfToStorage(blob, `FINAL_${nombreConExtension}`, 'completados')

      // 5. Actualizar estado y nombre en Base de Datos
      await aprobarYFinalizarDocumento({
        documentoId: selectedDoc.id,
        urlFinal: publicUrl,
        aprobadorId: user.id,
        coordsFirma2: { ...coords, pagina: pageNumber },
        nuevoNombre: nombreConExtension,
        emailAprobador: profile?.email || user?.email
      })

      alert('¡Documento aprobado y firmado exitosamente!')
      setSelectedDoc(null)
      setQuiereRenombrar(false)
      setCustomFileName('')
      await cargarPendientes()

      if (onApproved) {
        onApproved()
      }
    } catch (error) {
      console.error('Error al aprobar documento:', error)
      alert(`Ocurrió un error al procesar la aprobación: ${error.message}`)
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
            value={selectedDoc?.id || ''}
            onChange={(e) => handleSelectDoc(e.target.value)}
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
              {/* Sección de decisión para renombrar */}
              <div style={{ marginBottom: '15px', backgroundColor: '#fff', padding: '12px', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333' }}>
                  <strong>Nombre de origen:</strong> <code>{selectedDoc.nombre_archivo}</code>
                </p>

                <label style={{ fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#155724' }}>
                  <input 
                    type="checkbox" 
                    checked={quiereRenombrar}
                    onChange={(e) => setQuiereRenombrar(e.target.checked)}
                  />
                  ✏️ ¿Deseas modificar el nombre de este archivo antes de finalizar?
                </label>

                {quiereRenombrar && (
                  <div style={{ marginTop: '10px' }}>
                    <input 
                      type="text" 
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="Escribe el nuevo nombre del documento..."
                      style={{ width: '97%', padding: '8px', borderRadius: '4px', border: '1px solid #28a745', fontSize: '13px' }}
                    />
                  </div>
                )}
              </div>

              {/* Selector de Navegación de Páginas */}
              {numPages > 1 && (
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    disabled={pageNumber <= 1} 
                    onClick={() => setPageNumber(prev => prev - 1)}
                    style={{ padding: '4px 8px', cursor: 'pointer' }}
                  >
                    ◀ Anterior
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    Página {pageNumber} de {numPages}
                  </span>
                  <button 
                    disabled={pageNumber >= numPages} 
                    onClick={() => setPageNumber(prev => prev + 1)}
                    style={{ padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}

              <p style={{ fontSize: '13px', color: '#333' }}>
                🖱️ **Arrastra el sello verde de aprobación** a la posición deseada en la página {pageNumber}:
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

                <Document file={selectedDoc.url_pdf_parcial} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
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