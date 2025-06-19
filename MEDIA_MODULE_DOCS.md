# 📷 Módulo Media - Lazos de Vida

## 🎯 Funcionalidades Implementadas

### ✅ Upload de Archivos
- **Fotos**: JPG, JPEG, PNG, WEBP (máx 5MB)
- **Videos**: MP4 (máx 100MB)
- **Múltiples archivos**: Hasta 10 archivos por request
- **Procesamiento asíncrono**: Los archivos se procesan en background

### ✅ Compresión Automática
- **Imágenes**: 3 versiones (thumbnail, medium, large)
- **Videos**: Compresión a 720p con FFmpeg
- **Thumbnails**: Generación automática para videos
- **Optimización**: Reduce el tamaño manteniendo calidad

### ✅ Gestión Completa
- **CRUD completo**: Crear, leer, actualizar, eliminar
- **Organización por secciones**: galeria_fotos, videos_memoriales, etc.
- **Reordenamiento**: Drag & drop en el frontend
- **Estadísticas**: Conteo y uso de almacenamiento

### ✅ Validaciones de Plan
- **Plan Básico**: 50 fotos, 10 videos, 500MB
- **Plan Premium**: 100 fotos, 20 videos, 1GB
- **Validación automática**: Respeta límites del usuario

### ✅ Seguridad
- **Autenticación requerida**: JWT tokens
- **Validación de propiedad**: Solo el usuario puede gestionar su media
- **Filtrado de archivos**: Solo formatos permitidos
- **Límites de tamaño**: Configurable por tipo

---

## 🚀 Endpoints Disponibles

### 📤 Upload de Archivos
```http
POST /api/media/upload/:profileId
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- files: Array de archivos (máx 10)
- seccion: String (requerido) - "galeria_fotos", "videos_memoriales", etc.
- titulo: String (opcional)
- descripcion: String (opcional)
- orden: Number (opcional)
- tags: String (opcional) - separado por comas
```

**Ejemplo con curl:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@photo1.jpg" \
  -F "files=@video1.mp4" \
  -F "seccion=galeria_fotos" \
  -F "titulo=Recuerdos familiares" \
  -F "descripcion=Fotos de las vacaciones" \
  -F "orden=1" \
  -F "tags=familia,vacaciones,playa" \
  http://localhost:3000/api/media/upload/PROFILE_ID
```

### 📋 Obtener Media de un Perfil
```http
GET /api/media/profile/:profileId?tipo=foto&seccion=galeria_fotos&estado=completado
Authorization: Bearer {token}
```

### 🌍 Media Público (para memoriales)
```http
GET /api/media/public/:profileId?seccion=galeria_fotos
# Sin autenticación requerida
```

### ✏️ Actualizar Media
```http
PUT /api/media/:mediaId
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Nuevo título",
  "descripcion": "Nueva descripción",
  "orden": 5,
  "tags": ["tag1", "tag2"],
  "seccion": "videos_memoriales"
}
```

### 🗑️ Eliminar Media
```http
DELETE /api/media/:mediaId
Authorization: Bearer {token}
```

### 🔄 Reordenar Media en Sección
```http
PUT /api/media/reorder/:profileId
Authorization: Bearer {token}
Content-Type: application/json

{
  "seccion": "galeria_fotos",
  "mediaIds": ["id1", "id2", "id3"],
  "orders": [1, 2, 3]
}
```

### 📊 Estadísticas
```http
GET /api/media/stats/:profileId
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "fotos": { "count": 25, "totalSize": 15728640 },
    "videos": { "count": 5, "totalSize": 52428800 },
    "totalItems": 30,
    "usedStorage": 68157440,
    "usedStorageMB": 65.03
  }
}
```

### 📁 Obtener Todo el Media del Usuario
```http
GET /api/media/my-media?tipo=foto&estado=completado
Authorization: Bearer {token}
```

### ⏳ Estado de Procesamiento
```http
GET /api/media/processing-status
Authorization: Bearer {token}
```

---

## 🗂️ Secciones Disponibles

Las siguientes secciones están disponibles para organizar el media:

- `galeria_fotos` - Galería principal de fotos
- `videos_memoriales` - Videos conmemorativos
- `cronologia` - Línea de tiempo con fotos/videos
- `testimonios` - Videos de testimonios
- `logros` - Fotos de logros y reconocimientos
- `hobbies` - Media relacionado con pasatiempos

---

## 📁 Estructura de Archivos

```
uploads/
├── temp/                    # Archivos temporales durante upload
└── media/
    └── {mediaId}/           # Directorio por media
        ├── original.jpg     # Archivo original (si se mantiene)
        ├── thumbnail.jpg    # Versión pequeña (200x200)
        ├── medium.jpg       # Versión mediana (800x600)
        ├── large.jpg        # Versión grande (1920x1080)
        ├── compressed.mp4   # Video comprimido
        └── thumb.jpg        # Thumbnail del video
```

---

## 🔧 Configuración de Compresión

### Imágenes
- **Thumbnail**: 200x200px, 80% calidad
- **Medium**: 800x600px, 85% calidad  
- **Large**: 1920x1080px, 90% calidad
- **Formato**: JPEG optimizado con mozjpeg

### Videos
- **Resolución**: 720p (1280x720)
- **Bitrate**: 1500k video, 128k audio
- **Codec**: H.264 + AAC
- **Optimización**: Fast preset, CRF 23
- **Thumbnail**: Extraído del segundo 1

---

## 🚨 Manejo de Errores

### Errores Comunes

**Archivo demasiado grande:**
```json
{
  "success": false,
  "message": "Archivo demasiado grande. Máximo: 5MB"
}
```

**Formato no permitido:**
```json
{
  "success": false,
  "message": "Formato de archivo no permitido: gif"
}
```

**Límite de plan alcanzado:**
```json
{
  "success": false,
  "message": "Límite de fotos alcanzado (50). Actualiza tu plan."
}
```

**Media no encontrado:**
```json
{
  "success": false,
  "message": "Media no encontrado o no autorizado"
}
```

---

## 📱 Integración Frontend

### Upload con JavaScript

```javascript
// Función para subir archivos
async function uploadFiles(profileId, files, sectionInfo) {
  const formData = new FormData();
  
  // Agregar archivos
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Agregar metadata
  formData.append('seccion', sectionInfo.seccion);
  formData.append('titulo', sectionInfo.titulo);
  formData.append('descripcion', sectionInfo.descripcion);
  formData.append('orden', sectionInfo.orden);
  formData.append('tags', sectionInfo.tags.join(','));
  
  try {
    const response = await fetch(`/api/media/upload/${profileId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Upload exitoso:', result.data);
      // Mostrar progreso o confirmar al usuario
    } else {
      console.error('Error uploading:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Función para obtener media de un perfil
async function getProfileMedia(profileId, filters = {}) {
  const params = new URLSearchParams(filters);
  
  try {
    const response = await fetch(`/api/media/profile/${profileId}?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error getting media:', error);
  }
}
```

### React Component Example

```jsx
import React, { useState } from 'react';

function MediaUploader({ profileId, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sectionInfo, setSectionInfo] = useState({
    seccion: 'galeria_fotos',
    titulo: '',
    descripcion: '',
    orden: 0,
    tags: []
  });

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      await uploadFiles(profileId, files, sectionInfo);
      onUploadComplete();
      setFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-uploader">
      <input 
        type="file" 
        multiple 
        accept="image/*,video/*"
        onChange={handleFileChange}
      />
      
      <select 
        value={sectionInfo.seccion}
        onChange={(e) => setSectionInfo({...sectionInfo, seccion: e.target.value})}
      >
        <option value="galeria_fotos">Galería de Fotos</option>
        <option value="videos_memoriales">Videos Memoriales</option>
        <option value="cronologia">Cronología</option>
      </select>
      
      <input 
        type="text"
        placeholder="Título"
        value={sectionInfo.titulo}
        onChange={(e) => setSectionInfo({...sectionInfo, titulo: e.target.value})}
      />
      
      <button 
        onClick={handleUpload} 
        disabled={uploading || files.length === 0}
      >
        {uploading ? 'Subiendo...' : 'Subir Archivos'}
      </button>
    </div>
  );
}
```

---

## 🧪 Testing

### Script de Test
```bash
# Instalar dependencias de test
npm install --save-dev supertest

# Ejecutar tests
npm test
```

### Test Manual con Postman

1. **Registrar usuario**:
   ```
   POST /api/auth/register
   Body: { "nombre": "Test", "email": "test@example.com", "password": "123456" }
   ```

2. **Login**:
   ```
   POST /api/auth/login
   Body: { "email": "test@example.com", "password": "123456" }
   ```

3. **Crear perfil**:
   ```
   POST /api/profiles
   Header: Authorization: Bearer {token}
   Body: { "nombre": "Juan", "apellido": "Pérez", "fechaNacimiento": "1950-01-01", "fechaFallecimiento": "2020-01-01" }
   ```

4. **Upload media**:
   ```
   POST /api/media/upload/{profileId}
   Header: Authorization: Bearer {token}
   Body: form-data con archivos y metadata
   ```

---

## 📋 TODO / Próximas Funcionalidades

- [ ] Integración con Cloudflare R2
- [ ] Resize inteligente de imágenes
- [ ] Watermarks en fotos
- [ ] Conversión automática a WebP
- [ ] Streaming de videos
- [ ] CDN para archivos estáticos
- [ ] Backup automático
- [ ] Métricas de visualización

---

## 🛠️ Dependencias Utilizadas

```json
{
  "multer": "^2.0.1",           // Upload de archivos
  "sharp": "^0.34.2",           // Procesamiento de imágenes
  "ffmpeg-static": "^5.2.0",   // FFmpeg estático
  "fluent-ffmpeg": "^2.1.3",   // Wrapper de FFmpeg
  "uuid": "^11.1.0"            // Generación de IDs únicos
}
```

---

¡El módulo Media está completamente funcional y listo para usar! 🎉