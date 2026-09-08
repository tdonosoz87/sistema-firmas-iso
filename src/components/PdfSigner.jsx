import { useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import Draggable from 'react-draggable'
import { PDFDocument, rgb } from 'pdf-lib'
import { uploadPdfToStorage, crearSolicitudFirma } from '../services/documentService'
import { useAuth } from '../context/AuthContext'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export function PdfSigner({ onSigned }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [numPages, setNumPages] = useState(1)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState({ x: 50, y: 50 })
  const nodeRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setPageNumber(1)
    } else {
      alert('Por favor selecciona un archivo PDF válido.')
    }
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const handleSignAndUpload = async () => {
    if (!file) return
    setLoading(true)

    try {
      const fileArrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)
      const pages = pdfDoc.getPages()

      // 1. Obtener la página donde se colocó la firma
      const targetPageIndex = Math.max(0, Math.min(pageNumber - 1, pages.length - 1))
      const currentPage = pages[targetPageIndex]
      const { height: pdfHeight } = currentPage.getSize()

      // 2. Coordenadas seguras
      const pdfX = Math.max(10, coords.x)
      const pdfY = Math.max(10, pdfHeight - coords.y)

      const fechaActual = new Date().toLocaleString('es-CL', {
        dateStyle: 'short',
        timeStyle: 'medium'
      })

      const lineasTexto = [
        `FIRMADO POR: ${user?.email}`,
        `Rol: Analista / Creador`,
        `Fecha: ${fechaActual}`
      ]

      lineasTexto.forEach((linea, index) => {
        currentPage.drawText(linea, {
          x: pdfX,
          y: pdfY - (index * 11),
          size: 8,
          color: rgb(0, 0.2, 0.8)
        })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })

      // 3. Subir archivo parcial a Storage
      const publicUrl = await uploadPdfToStorage(blob, `PARCIAL_${file.name}`, 'pendientes')

      // 4. Crear registro en base de datos
      await crearSolicitudFirma({
        nombreArchivo: file.name,
        urlParcial: publicUrl,
        creadorId: user.id,
        coordsFirma1: { ...coords, pagina: pageNumber },
        emailCreador: user?.email
      })

      alert('¡Documento firmado en 1ª instancia y enviado a aprobación!')
      setFile(null)

      if (onSigned) {
        onSigned()
      }
    } catch (error) {
      console.error('Error al firmar PDF:', error)
      alert(`Ocurrió un error al procesar el archivo: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h3>✍️ Módulo de Firma Digital Interactiva (Creación)</h3>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />

      {file && (
        <div style={{ marginTop: '15px' }}>
          {/* Navegador multipágina */}
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
            🖱️ **Arrastra el sello azul** a la ubicación donde deseas colocar tu firma en la página {pageNumber}:
          </p>

          <div style={{ position: 'relative', border: '2px dashed #007bff', display: 'inline-block', backgroundColor: '#f8f9fa' }}>
            <Draggable nodeRef={nodeRef} bounds="parent" onStop={(e, data) => setCoords({ x: data.x, y: data.y })} defaultPosition={{ x: 50, y: 50 }}>
              <div 
                ref={nodeRef}
                style={{
                  position: 'absolute',
                  padding: '6px 10px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'grab',
                  zIndex: 999,
                  userSelect: 'none'
                }}
              >
                📝 Firma: {user?.email}
              </div>
            </Draggable>

            <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
              <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>

          <button 
            onClick={handleSignAndUpload} 
            disabled={loading}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'block'
            }}
          >
            {loading ? 'Procesando y Guardando...' : 'Firmar y Enviar a Aprobación'}
          </button>
        </div>
      )}
    </div>
  )
}