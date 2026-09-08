import { supabase } from './supabaseClient'

// Función genérica para subir archivos a Supabase Storage con nombre limpio
export const uploadPdfToStorage = async (fileBlob, fileName, folder = 'firmas') => {
  const filePath = `${folder}/${fileName}`
  
  const { error } = await supabase.storage
    .from('documentos-firmados')
    .upload(filePath, fileBlob, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from('documentos-firmados')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

// Alias para compatibilidad
export const uploadSignedPdf = async (fileBlob, fileName, userId) => {
  return await uploadPdfToStorage(fileBlob, fileName, userId)
}

// Crear nueva solicitud de firma (Firma 1) guardando el correo del creador
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

  if (error) throw error
  return data[0]
}

// Obtener documentos pendientes de aprobación
export const obtenerDocumentosPendientes = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'PENDIENTE_SEGUNDA_FIRMA')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Finalizar segunda firma, aprobar (Firma 2) y guardar el correo del aprobador
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

  if (nuevoNombre && nuevoNombre.trim() !== '') {
    updateData.nombre_archivo = nuevoNombre.trim()
  }

  const { data, error } = await supabase
    .from('documentos')
    .update(updateData)
    .eq('id', documentoId)
    .select()

  if (error) throw error
  return data[0]
}

// Obtener todos los documentos completados
export const obtenerDocumentosCompletados = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'COMPLETADO')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
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

// Obtener registros de auditoría leyendo datos inmutables de firma
export const obtenerRegistroAuditoria = async () => {
  const { data: documentos, error: errorDocs } = await supabase
    .from('documentos')
    .select('*')
    .order('created_at', { ascending: false })

  if (errorDocs) throw errorDocs
  if (!documentos) return []

  return documentos.map(doc => ({
    ...doc,
    // Extrae el correo guardado en la firma, o una etiqueta de respaldo
    email_creador_resuelto: doc.firma_1_info?.email || 'td@empresa.com', 
    email_aprobador_resuelto: doc.firma_2_info?.email || 'td1@empresa.com'
  }))
}