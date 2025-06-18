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

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Perfil del usuario autenticado

### Perfiles/Memoriales
- `POST /api/profiles` - Crear memorial (auto-genera QR)
- `GET /api/profiles/my-profiles` - Listar mis memoriales
- `GET /api/profiles/:id` - Obtener memorial específico
- `PUT /api/profiles/:id` - Actualizar memorial
- `DELETE /api/profiles/:id` - Eliminar memorial

### Códigos QR
- `POST /api/qr/generate/:profileId` - Generar QR para perfil
- `GET /api/qr/my-qrs` - Listar mis códigos QR
- `GET /api/qr/:code/stats` - Estadísticas del QR
- `GET /api/memorial/:qrCode` - **Acceso público al memorial**

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