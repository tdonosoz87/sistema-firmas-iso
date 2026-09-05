import { useState } from 'react'
import { signInUser, signUpUser } from '../services/authService'

export function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [perfil, setPerfil] = useState('Analista')
  const [subperfilIso, setSubperfilIso] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const inputStyle = {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    backgroundColor: '#ffffff',
    color: '#333333',
    outline: 'none'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      if (isRegistering) {
        await signUpUser({
          email,
          password,
          perfil,
          subperfil_iso: subperfilIso || null
        })
        alert('Registro exitoso. Revisa tu correo o inicia sesión.')
      } else {
        await signInUser({ email, password })
      }
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '380px',
      padding: '30px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#1a1a1a' }}>
        {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
      </h2>

      {errorMsg && <p style={{ color: '#d9534f', fontSize: '14px', textAlign: 'center' }}>{errorMsg}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input 
          type="email" 
          placeholder="Correo Electrónico" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={inputStyle}
          required 
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={inputStyle}
          required 
        />

        {isRegistering && (
          <>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Perfil Principal:</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)} style={inputStyle}>
              <option value="Gerente">Gerente</option>
              <option value="Analista">Analista</option>
              <option value="Jefe Proyecto">Jefe Proyecto</option>
              <option value="Soporte">Soporte</option>
              <option value="Desarrollo">Desarrollo</option>
            </select>

            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Subperfil ISO (Opcional):</label>
            <select value={subperfilIso} onChange={(e) => setSubperfilIso(e.target.value)} style={inputStyle}>
              <option value="">Sin Subperfil ISO</option>
              <option value="Presidente">Presidente</option>
              <option value="Encargado SGSI">Encargado SGSI</option>
              <option value="Secretario">Secretario</option>
            </select>
          </>
        )}

        <button 
          type="submit" 
          style={{ 
            padding: '10px', 
            marginTop: '10px', 
            backgroundColor: '#0066cc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            cursor: 'pointer' 
          }}
        >
          {isRegistering ? 'Registrarse' : 'Ingresar'}
        </button>
      </form>

      <button 
        onClick={() => setIsRegistering(!isRegistering)} 
        style={{ 
          marginTop: '15px', 
          background: 'none', 
          border: 'none', 
          color: '#0066cc', 
          cursor: 'pointer', 
          width: '100%', 
          fontSize: '13px' 
        }}
      >
        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  )
}