import { supabase } from './supabaseClient'

// Subir archivo a Supabase Storage
export const uploadPdfToStorage = async (fileBlob, fileName, folder) => {
  const filePath = `${folder}/${Date.now()}_${fileName}`
  
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

// Crear nueva solicitud de firma (Firma 1)
export const crearSolicitudFirma = async ({ nombreArchivo, urlParcial, creadorId, coordsFirma1, paginaFirma1 }) => {
  const { data, error } = await supabase
    .from('documentos')
    .insert([{
      nombre_archivo: nombreArchivo,
      url_pdf_parcial: urlParcial,
      creador_id: creadorId,
      estado: 'PENDIENTE_SEGUNDA_FIRMA',
      firma_1_info: { coords: coordsFirma1, pagina: paginaFirma1 }
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

// Finalizar segunda firma y aprobar (Firma 2 por Gerente / Encargado SGSI)
export const aprobarYFinalizarDocumento = async ({ documentoId, urlFinal, aprobadorId, coordsFirma2 }) => {
  const { data, error } = await supabase
    .from('documentos')
    .update({
      url_pdf_final: urlFinal,
      aprobador_id: aprobadorId,
      estado: 'COMPLETADO',
      firma_2_info: { coords: coordsFirma2, fecha: new Date().toISOString() }
    })
    .eq('id', documentoId)
    .select()

  if (error) throw error
  return data[0]
}