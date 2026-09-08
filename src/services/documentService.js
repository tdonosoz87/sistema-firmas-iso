import { supabase } from './supabaseClient'

const BUCKET_NAME = 'documentos-firmados'

// Sanitiza el nombre de archivo para evitar errores "Invalid key" en Supabase Storage / S3
const sanitizarNombreArchivo = (str) => {
  if (!str) return 'documento_sin_nombre.pdf'
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
}

// Subir archivos a Supabase Storage con sanitización previa
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

// Alias para compatibilidad
export const uploadSignedPdf = async (fileBlob, fileName, userId) => {
  return uploadPdfToStorage(fileBlob, fileName, userId)
}

// Crear nueva solicitud de firma (Firma 1)
export const crearSolicitudFirma = async ({ nombreArchivo, urlParcial, creadorId, coordsFirma1, emailCreador }) => {
  const { data, error } = await supabase
    .from('documentos')
    .insert([{
      nombre_archivo: nombreArchivo,
      url_pdf_parcial: urlParcial,
      creador_id: creadorId,
      estado: 'PENDIENTE_SEGUNDA_FIRMA',
      firma_1_info: { 
        coords: coordsFirma1, 
        email: emailCreador,
        fecha: new Date().toISOString()
      }
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Obtener documentos pendientes de aprobación
export const obtenerDocumentosPendientes = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'PENDIENTE_SEGUNDA_FIRMA')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Finalizar segunda firma, aprobar (Firma 2) y actualizar nombre si aplica
export const aprobarYFinalizarDocumento = async ({ documentoId, urlFinal, aprobadorId, coordsFirma2, nuevoNombre, emailAprobador }) => {
  const updateData = {
    url_pdf_final: urlFinal,
    aprobador_id: aprobadorId,
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

// Obtener todos los documentos completados
export const obtenerDocumentosCompletados = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'COMPLETADO')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Eliminar un documento por su ID
export const eliminarDocumentoCompletado = async (documentoId) => {
  const { data, error } = await supabase
    .from('documentos')
    .delete()
    .eq('id', documentoId)

  if (error) throw error
  return data
}

// Obtener registros de auditoría resolviendo correos de forma inmutable
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