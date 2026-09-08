import { supabase } from './supabaseClient'

// Función genérica para subir archivos a Supabase Storage con nombre limpio
export const uploadPdfToStorage = async (fileBlob, fileName, folder = 'firmas') => {
  // Guardar el archivo en la ruta del bucket usando el nombre limpio sin prefijos numéricos
  const filePath = `${folder}/${fileName}`
  
  const { error } = await supabase.storage
    .from('documentos-firmados')
    .upload(filePath, fileBlob, {
      contentType: 'application/pdf',
      upsert: true // Permite sobrescribir si ya existe una versión previa
    })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage
    .from('documentos-firmados')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

// Mantener alias para compatibilidad con PdfSigner
export const uploadSignedPdf = async (fileBlob, fileName, userId) => {
  return await uploadPdfToStorage(fileBlob, fileName, userId)
}

// Crear nueva solicitud de firma (Firma 1)
export const crearSolicitudFirma = async ({ nombreArchivo, urlParcial, creadorId, coordsFirma1 }) => {
  const { data, error } = await supabase
    .from('documentos')
    .insert([{
      nombre_archivo: nombreArchivo,
      url_pdf_parcial: urlParcial,
      creador_id: creadorId,
      estado: 'PENDIENTE_SEGUNDA_FIRMA',
      firma_1_info: { coords: coordsFirma1 }
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

// Finalizar segunda firma, aprobar (Firma 2) y actualizar nombre si cambió
export const aprobarYFinalizarDocumento = async ({ documentoId, urlFinal, aprobadorId, coordsFirma2, nuevoNombre }) => {
  const updateData = {
    url_pdf_final: urlFinal,
    aprobador_id: aprobadorId,
    estado: 'COMPLETADO',
    firma_2_info: { coords: coordsFirma2, fecha: new Date().toISOString() }
  }

  // Si se proporcionó un nuevo nombre, lo actualizamos en el registro de la base de datos
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

// Obtener todos los documentos completados con ambas firmas
export const obtenerDocumentosCompletados = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'COMPLETADO')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
// Eliminar un documento del historial por su ID
export const eliminarDocumentoCompletado = async (documentoId) => {
  const { data, error } = await supabase
    .from('documentos')
    .delete()
    .eq('id', documentoId)

  if (error) throw error
  return data
}

// Obtener el registro y traza de auditoría sin depender de Foreign Keys rígidas
export const obtenerRegistroAuditoria = async () => {
  // 1. Obtener los documentos
  const { data: documentos, error: errorDocs } = await supabase
    .from('documentos')
    .select('*')
    .order('created_at', { ascending: false })

  if (errorDocs) throw errorDocs
  if (!documentos || documentos.length === 0) return []

  // 2. Obtener los perfiles de usuarios para cruzar emails
  const { data: perfiles, error: errorProf } = await supabase
    .from('profiles')
    .select('id, email, perfil, subperfil_iso')

  if (errorProf) console.error('Error al obtener perfiles:', errorProf)

  // Crear un mapa de perfiles para búsqueda rápida por ID
  const perfilesMap = (perfiles || []).reduce((acc, p) => {
    acc[p.id] = p
    return acc
  }, {})

  // 3. Unir la información
  return documentos.map(doc => ({
    ...doc,
    creador: perfilesMap[doc.creador_id] || null,
    aprobador: perfilesMap[doc.aprobador_id] || null
  }))
}
