import { supabase } from './supabaseClient'

// Registrar un nuevo usuario mandando el perfil y subperfil_iso en la metadata
export const signUpUser = async ({ email, password, perfil, subperfil_iso }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        perfil,
        subperfil_iso: subperfil_iso || null,
      },
    },
  })
  if (error) throw error
  return data
}

// Iniciar sesión
export const signInUser = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// Cerrar sesión
export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Obtener el perfil completo de la tabla "profiles" para el usuario activo
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}