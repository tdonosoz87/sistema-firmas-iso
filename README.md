# 📑 Sistema de Gestión Documental & Firma Digital (Cumplimiento ISO)

Sistema de gestión documental, firma digital interactiva y trazabilidad de auditoría diseñado bajo los lineamientos de la norma **ISO 27001**. Ofrece una arquitectura de "cero almacenamiento costoso" al permitir la liberación de espacio en la nube reteniendo evidencia criptográfica e inmutable mediante **Hashes SHA-256**.

---

## 🚀 Características Principales

* **Flujo de Firma en 2 Instancias:**
  * **Firma 1 (Creador / Analista):** Estampado visual de firma y generación de Hash SHA-256 de origen.
  * **Firma 2 (Aprobador / Gerente / SGSI):** Validación final con segundo sello e impresión de Hash SHA-256 definitivo.
* **Integridad Criptográfica:** Cálculo y registro de huellas digitales SHA-256 en ambas etapas para prevenir alteraciones de documentos.
* **Estrategia Zero-Storage (Optimización de Costos):** Posibilidad de borrar el archivo PDF físico de la nube manteniendo intacto el registro de auditoría y su evidencia en la base de datos.
* **Trazabilidad & Auditoría ISO:** Módulo de reporte con exportación a **CSV (Excel)** incluyendo fechas, correos resueltos, ID inmutables y Hashes de ambas instancias.
* **Navegación y Sanitización:** Soporte nativo para lectura multipágina con `pdfjs-dist` y sanitización automática de nombres de archivos para evitar fallos de Storage (S3/Key errors).

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React + Vite
* **Librerías PDF:** `pdf-lib` (manipulación e impresión de sellos) y `react-pdf` (renderizado local)
* **Interactividad:** `react-draggable` (posicionamiento interactivo de sellos)
* **Backend / Base de Datos:** Supabase (PostgreSQL + Storage S3)
* **Seguridad:** API Nativa `crypto.subtle` (Cálculo de Hash SHA-256)

---

## ⚙️ Configuración del Entorno Local

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
   cd tu-repositorio

Instalar dependencias:

Bash
npm install
Crear un archivo .env en la raíz del proyecto con las credenciales de Supabase:

Fragmento de código
VITE_SUPABASE_URL=[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
Iniciar en entorno de desarrollo:

Bash
npm run dev
🗄️ Estructura de la Base de Datos (SQL Supabase)
El sistema opera sobre una tabla principal llamada documentos y un Bucket de almacenamiento en Supabase Storage (documentos-firmados):

SQL
-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_archivo TEXT NOT NULL,
  url_pdf_parcial TEXT,
  url_pdf_final TEXT,
  creador_id UUID REFERENCES auth.users(id),
  aprobador_id UUID REFERENCES auth.users(id),
  estado TEXT DEFAULT 'PENDIENTE_SEGUNDA_FIRMA',
  hash_documento TEXT,
  firma_1_info JSONB,
  firma_2_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columna de Hash SHA-256
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS hash_documento TEXT;

🔄 Guía de Migración / Cambio de Servidor o Backend
Si en el futuro el proyecto se transfiere a otro servidor, servicio de Storage (como AWS S3) o a un entorno backend distinto:

1. Cambiar las Variables de Entorno (Frontend)
En la plataforma de hosting (Vercel, Netlify, Render, etc.) o en el archivo .env, actualiza las claves del nuevo entorno:

Fragmento de código
VITE_SUPABASE_URL=[https://NUEVO-PROYECTO.supabase.co](https://NUEVO-PROYECTO.supabase.co)
VITE_SUPABASE_ANON_KEY=NUEVA_CLAVE_ANONIMA
2. Capa Desacoplada de Servicios (documentService.js)
Toda la interacción con el backend está centralizada en src/services/documentService.js. Si migras de Supabase a otro servicio (por ejemplo, AWS S3 + Node.js/Express):

Storage: Modifica únicamente las funciones uploadPdfToStorage y liberarAlmacenamientoPDF.

Base de Datos: Modifica las funciones crearSolicitudFirma, aprobarYFinalizarDocumento y obtenerRegistroAuditoria para apuntar a tus nuevos endpoints API REST.

Componentes React: No requieren cambios en la interfaz ni en la lógica visual, ya que consumen de forma transparente las funciones expuestas por documentService.js.

-------------------------------------FIN DOCUMENTO----TOMAS DONOSO ZAMUDIO-----------------------------------------------------