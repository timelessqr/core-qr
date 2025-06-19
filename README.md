# 🎯 Core QR
**Plataforma de memoriales digitales con códigos QR**

Una solución moderna para crear memoriales digitales permanentes, accesibles a través de códigos QR únicos que conectan el mundo físico con los recuerdos digitales.

## 🚀 Características Principales

- **Memoriales Digitales**: Crea perfiles completos con biografías, fotos y videos
- **Códigos QR Únicos**: Cada memorial genera automáticamente un código QR
- **Acceso Público**: Los memoriales son accesibles sin necesidad de registro
- **Sistema de Planes**: Básico y Premium con diferentes límites de contenido
- **Estadísticas**: Tracking de visitas y escaneos en tiempo real
- **Arquitectura Escalable**: Diseño modular para futuras expansiones

## 🛠️ Tecnologías

### Backend
- **Node.js** + **Express 4.x**
- **MongoDB** + **Mongoose**
- **JWT** para autenticación
- **QRCode** + **Sharp** para generación de imágenes QR
- **Joi** para validaciones

### Arquitectura
- **Clean Architecture** (Controller → Service → Repository)
- **Módulos independientes** para escalabilidad
- **Separación de responsabilidades**

## 📁 Estructura del Proyecto

```
core-qr/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración MongoDB
│   ├── middleware/
│   │   └── auth.js              # Middleware de autenticación
│   ├── modules/
│   │   ├── auth/                # Módulo de autenticación
│   │   ├── profiles/            # Módulo de perfiles/memoriales
│   │   └── qr/                  # Módulo de códigos QR
│   ├── models/                  # Modelos de MongoDB
│   ├── utils/                   # Utilidades y helpers
│   └── routes/                  # Rutas de la API
├── package.json
├── .env
└── server.js                    # Punto de entrada
```

## 🔐 API Endpoints

**Base URL:** `http://localhost:3000`

### 🔑 Autenticación

#### Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Demo User",
  "email": "demo@coreqr.com",
  "password": "demo123456",
  "plan": "basico"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": { "id": "...", "nombre": "...", "email": "...", "plan": "basico" },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "planLimits": { "fotos": 50, "videos": 10, "almacenamiento": 524288000 }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "demo@coreqr.com",
  "password": "demo123456"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": { "id": "...", "nombre": "...", "email": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Perfil del Usuario
```http
GET /api/auth/profile
Authorization: Bearer {token}
```

### 👤 Memoriales

#### Crear Memorial (Auto-genera QR)
```http
POST /api/profiles
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Carlos Eduardo Pérez",
  "fechaNacimiento": "1950-03-15",
  "fechaFallecimiento": "2024-11-20",
  "biografia": "Un hombre excepcional...",
  "lugarNacimiento": "Buenos Aires, Argentina",
  "lugarFallecimiento": "Buenos Aires, Argentina",
  "secciones": [
    {
      "titulo": "Vida Familiar",
      "contenido": "Esposo devoto por 45 años..."
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Perfil creado exitosamente",
  "data": {
    "nombre": "Carlos Eduardo Pérez",
    "qr": "3A3D2FF375A9",
    "url": "http://localhost:3000/memorial/3A3D2FF375A9",
    "edadAlFallecer": 74,
    "isPublic": true
  }
}
```

#### Listar Mis Memoriales
```http
GET /api/profiles/my-profiles
Authorization: Bearer {token}
```

### 📱 Códigos QR

#### Listar Mis QRs
```http
GET /api/qr/my-qrs
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "code": "3A3D2FF375A9",
      "url": "http://localhost:3000/memorial/3A3D2FF375A9",
      "tipo": "profile",
      "estadisticas": {
        "vistas": 0,
        "escaneos": 0
      }
    }
  ]
}
```

#### Estadísticas del QR
```http
GET /api/qr/{code}/stats
Authorization: Bearer {token}
```

### 🌍 Acceso Público (SIN Autenticación)

#### Memorial Público
```http
GET /api/memorial/{qrCode}
```

**Ejemplo:** `GET /api/memorial/3A3D2FF375A9`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "memorial": {
      "nombre": "Carlos Eduardo Pérez",
      "biografia": "Un hombre excepcional...",
      "edadAlFallecer": 74,
      "qr": {
        "code": "3A3D2FF375A9",
        "vistas": 1,
        "escaneos": 1
      }
    },
    "visitRegistered": true
  }
}
```

## 💰 Planes de Servicio

### Plan Básico
- 50 fotos
- 10 videos  
- 500MB de almacenamiento
- 5 secciones personalizables
- Biografía: 5,000 caracteres

### Plan Premium
- 100 fotos
- 20 videos
- 1GB de almacenamiento  
- 10 secciones personalizables
- Biografía: 10,000 caracteres

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (v14+)
- MongoDB
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/timelessqr/core-qr.git
cd core-qr

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar MongoDB local

# Ejecutar el servidor
npm run dev
```

### Variables de Entorno
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/core_qr
JWT_SECRET=tu_jwt_secret_aqui
NODE_ENV=development
```

## 💻 **Para Desarrolladores Frontend**

### 🔗 **Conectar con la API**

**Base URL del servidor:** `http://localhost:3000`

**Headers requeridos para endpoints autenticados:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

### 📋 **Flujo de autenticación:**

1. **Registro/Login** → Obtener `token`
2. **Guardar token** en localStorage/sessionStorage
3. **Incluir token** en headers para requests autenticadas
4. **Manejar token expirado** (renovar login)

### 🔧 **Ejemplo con Fetch:**

```javascript
// Login
const loginUser = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.data.token);
  }
  return data;
};

// Crear Memorial
const createMemorial = async (memorialData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(memorialData)
  });
  return response.json();
};

// Acceso Público (sin token)
const getPublicMemorial = async (qrCode) => {
  const response = await fetch(`http://localhost:3000/api/memorial/${qrCode}`);
  return response.json();
};
```

### 🔧 **Ejemplo con Axios:**

```javascript
import axios from 'axios';

// Configurar base URL
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uso
const createMemorial = async (data) => {
  const response = await api.post('/profiles', data);
  return response.data;
};
```

### ⚠️ **Manejo de Errores:**

```javascript
// Códigos de respuesta comunes
// 200: Éxito
// 401: No autorizado (token inválido/expirado)
// 400: Error de validación
// 404: Recurso no encontrado
// 500: Error del servidor

const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Token expirado, redirigir a login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return error.response?.data || { message: 'Error de conexión' };
};
```

### 📱 **CORS Configuration**

El servidor ya tiene CORS configurado para desarrollo. Para producción, actualizar las URLs permitidas en el backend.

## 🧪 Pruebas

El sistema incluye datos de prueba:

**Usuario de prueba:**
- Email: `test@example.com`
- Password: configurado durante el registro

**Memorial de prueba:**
- Nombre: María González
- Código QR: CC09E6DA7875
- URL: `http://localhost:3000/memorial/CC09E6DA7875`

## 📊 Características Implementadas

✅ **Sistema de autenticación completo**  
✅ **Creación de memoriales con auto-generación de QR**  
✅ **Gestión completa CRUD de perfiles y QRs**  
✅ **Endpoint público funcionando**  
✅ **Sistema de estadísticas y tracking**  
✅ **Base de datos estructurada**  
✅ **Arquitectura escalable**  

## 🔜 Roadmap

- [ ] **Módulo Media** - Upload de fotos y videos
- [ ] **Integración Cloudflare R2** - Almacenamiento en la nube
- [ ] **Dashboard de administración**
- [ ] **Compresión automática de videos**
- [ ] **Testing automatizado**
- [ ] **Notificaciones por email**
- [ ] **Backup automático**

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes preguntas o necesitas ayuda:
- Abre un issue en GitHub
- Contacta al equipo de desarrollo

---

**Core QR** - Conectando memorias, preservando legados 💙