import { supabase } from './supabaseClient'

const BUCKET_NAME = 'documentos-firmados'

// Función nativa para calcular el Hash SHA-256 del PDF
export const calcularHashPDF = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const sanitizarNombreArchivo = (str) => {
  if (!str) return 'documento_sin_nombre.pdf'
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
}

export const uploadPdfToStorage = async (fileBlob, fileName, folder = 'firmas') => {
  const nombreLimpio = sanitizarNombreArchivo(fileName)
  const filePath = `${folder}/${nombreLimpio}`
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBlob, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

export const uploadSignedPdf = async (fileBlob, fileName, userId) => {
  return uploadPdfToStorage(fileBlob, fileName, userId)
}

// Crear solicitud guardando Hash de origen tanto en la columna principal como en el JSON de Firma 1
export const crearSolicitudFirma = async ({ nombreArchivo, urlParcial, creadorId, coordsFirma1, emailCreador, hashDoc }) => {
  const { data, error } = await supabase
    .from('documentos')
    .insert([{
      nombre_archivo: nombreArchivo,
      url_pdf_parcial: urlParcial,
      creador_id: creadorId,
      hash_documento: hashDoc,
      estado: 'PENDIENTE_SEGUNDA_FIRMA',
      firma_1_info: { 
        coords: coordsFirma1, 
        email: emailCreador,
        fecha: new Date().toISOString(),
        hash_inicial: hashDoc
      }
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export const obtenerDocumentosPendientes = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'PENDIENTE_SEGUNDA_FIRMA')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Aprobar y actualizar el Hash al del PDF final firmado
export const aprobarYFinalizarDocumento = async ({ 
  documentoId, 
  urlFinal, 
  aprobadorId, 
  coordsFirma2, 
  nuevoNombre, 
  emailAprobador, 
  hashFinal 
}) => {
  const updateData = {
    url_pdf_final: urlFinal,
    aprobador_id: aprobadorId,
    hash_documento: hashFinal,
    estado: 'COMPLETADO',
    firma_2_info: { 
      coords: coordsFirma2, 
      fecha: new Date().toISOString(),
      email: emailAprobador
    }
  }

  if (nuevoNombre?.trim()) {
    updateData.nombre_archivo = nuevoNombre.trim()
  }

  const { data, error } = await supabase
    .from('documentos')
    .update(updateData)
    .eq('id', documentoId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const obtenerDocumentosCompletados = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'COMPLETADO')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Eliminar únicamente los archivos del Storage manteniendo intacto el registro de auditoría en la DB
export const liberarAlmacenamientoPDF = async (documentoId) => {
  const updateData = {
    url_pdf_final: null,
    url_pdf_parcial: null
  }

  const { data, error } = await supabase
    .from('documentos')
    .update(updateData)
    .eq('id', documentoId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar registro por completo si se requiere
export const eliminarDocumentoCompletado = async (documentoId) => {
  const { data, error } = await supabase
    .from('documentos')
    .delete()
    .eq('id', documentoId)

  if (error) throw error
  return data
}

export const obtenerRegistroAuditoria = async () => {
  const { data: documentos, error } = await supabase
    .from('documentos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!documentos) return []

  return documentos.map(doc => ({
    ...doc,
    email_creador_resuelto: doc.firma_1_info?.email || 'Sin correo registrado', 
    email_aprobador_resuelto: doc.firma_2_info?.email || 'Sin correo registrado'
  }))
}