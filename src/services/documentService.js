import { supabase } from './supabaseClient'

// Subir un PDF firmado a Supabase Storage
export const uploadSignedPdf = async (fileBlob, fileName, userId) => {
  const filePath = `${userId}/${Date.now()}_${fileName}`
  
  const { data, error } = await supabase.storage
    .from('documentos-firmados')
    .upload(filePath, fileBlob, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (error) throw error

  // Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from('documentos-firmados')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}