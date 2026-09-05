import { useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import Draggable from 'react-draggable'
import { PDFDocument, rgb } from 'pdf-lib'
import { uploadSignedPdf } from '../services/documentService'
import { useAuth } from '../context/AuthContext'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PdfSigner() {
  const { user, profile } = useAuth()
  const [pdfFile, setPdfFile] = useState(null)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [signatureText, setSignatureText] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedPdfUrl, setSignedPdfUrl] = useState('')

  const [coords, setCoords] = useState({ x: 20, y: 20 })
  const nodeRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPdfFile(e.target.files[0])
      setSignedPdfUrl('')
      setPageNumber(1)
      setCoords({ x: 20, y: 20 })
    }
  }

  const handleStop = (e, data) => {
    setCoords({ x: data.x, y: data.y })
  }

const handleSignAndSave = async () => {
    if (!pdfFile || !signatureText) {
      alert('Por favor selecciona un PDF e ingresa la firma.')
      return
    }

    setLoading(true)
    try {
      const fileArrayBuffer = await pdfFile.arrayBuffer()
      const pdfDoc = await PDFDocument.load(fileArrayBuffer)

      const pages = pdfDoc.getPages()
      const currentPage = pages[pageNumber - 1]
      const { height } = currentPage.getSize()

      const pdfX = Math.max(10, coords.x)
      // Ajuste de altura para que el texto quede SOBRE la línea elegida
      const pdfY = Math.max(10, height - coords.y + 10)

      const fechaActual = new Date().toLocaleString('es-CL', {
        dateStyle: 'short',
        timeStyle: 'medium'
      })

      const lineasTexto = [
        `Firmado por: ${signatureText} (${profile?.email || user?.email})`,
        `Cargo: ${profile?.perfil || ''} ${profile?.subperfil_iso ? `[${profile.subperfil_iso}]` : ''}`,
        `Fecha: ${fechaActual}`
      ]

      lineasTexto.forEach((linea, index) => {
        currentPage.drawText(linea, {
          x: pdfX,
          y: pdfY - (index * 11),
          size: 8,
          color: rgb(0, 0.3, 0.8),
        })
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })

      const nombreUnico = `${Date.now()}_${pdfFile.name}`
      const publicUrl = await uploadSignedPdf(blob, nombreUnico, user.id)
      
      setSignedPdfUrl(publicUrl)
      alert('¡Documento firmado y guardado con éxito!')

    } catch (error) {
      console.error('Error al firmar PDF:', error)
      alert('Error al procesar la firma en el archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h3>Módulo de Firma Digital Interactiva</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        
        <input 
          type="text" 
          placeholder="Nombre del Firmante" 
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {pdfFile && (
        <div>
          <p style={{ fontSize: '13px', color: '#666' }}>
            🖱️ **Arrastra el recuadro azul** hacia el lugar exacto del PDF donde deseas colocar la firma:
          </p>

          <div 
            style={{ 
              position: 'relative', 
              border: '2px dashed #bbb', 
              display: 'inline-block',
              backgroundColor: '#f5f5f5'
            }}
          >
            <Draggable nodeRef={nodeRef} bounds="parent" onStop={handleStop} defaultPosition={{ x: 20, y: 20 }}>
              <div 
                ref={nodeRef}
                style={{
                  position: 'absolute',
                  padding: '6px 10px',
                  backgroundColor: '#0066cc',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'grab',
                  zIndex: 999,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  userSelect: 'none'
                }}
              >
                ✍️ {signatureText || 'Tu Firma Aquí'}
              </div>
            </Draggable>

            <Document 
              file={pdfFile} 
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>

          {numPages > 1 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>Anterior</button>
              <span>Página {pageNumber} de {numPages}</span>
              <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}>Siguiente</button>
            </div>
          )}

          <button 
            onClick={handleSignAndSave} 
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
            {loading ? 'Procesando y Guardando...' : 'Estampar Firma y Guardar'}
          </button>
        </div>
      )}

      {signedPdfUrl && (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>¡Documento guardado con éxito!</p>
          <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
            📄 Abrir Documento Firmado en Supabase Storage
          </a>
        </div>
      )}
    </div>
  )
}