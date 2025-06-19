# 🎨 Módulo Dashboard - Lazos de Vida

## 🎯 Funcionalidades Implementadas

### ✅ Configuración Completa de Memoriales
- **🎨 Temas**: Clásico, Moderno, Elegante
- **🎨 Personalización**: Colores, fuentes, tamaños
- **📱 Secciones**: Configurables y reordenables
- **🔒 Privacidad**: Control de acceso público/privado
- **🚀 SEO**: Optimización para motores de búsqueda

### ✅ Gestión Avanzada
- **✨ Preview en tiempo real**: Vista previa sin guardar
- **📤 Import/Export**: Backup y compartir configuraciones
- **🔄 Duplicación**: Copiar configuración entre perfiles
- **⚙️ Reset**: Restablecer a valores por defecto
- **📊 Templates**: Configuraciones prediseñadas

### ✅ Validaciones Inteligentes
- **📋 Límites por plan**: Respeta restricciones del usuario
- **🛡️ Validación de datos**: Entrada segura y consistente
- **🎨 Colores válidos**: Validación de códigos hexadecimales
- **📝 Límites de texto**: Control de longitud de contenido

---

## 🚀 Endpoints Disponibles

### 📋 Gestión Básica

#### Obtener Dashboard
```http
GET /api/dashboard/:profileId
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "profileId": "507f1f77bcf86cd799439011",
    "profileName": "Juan Pérez",
    "dashboard": {
      "id": "507f1f77bcf86cd799439012",
      "secciones": [...],
      "configuracion": {...},
      "privacidad": {...},
      "seo": {...}
    }
  }
}
```

#### Crear Dashboard por Defecto
```http
POST /api/dashboard/:profileId
Authorization: Bearer {token}
```

### 🎨 Configuración y Personalización

#### Actualizar Configuración General
```http
PUT /api/dashboard/:profileId/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "tema": "moderno",
  "colorPrimario": "#2c3e50",
  "colorSecundario": "#ffffff",
  "colorAccento": "#3498db",
  "fuente": "sans-serif",
  "tamanoFuente": "mediano",
  "permitirCondolencias": true,
  "mostrarEstadisticas": false,
  "mostrarFechas": true,
  "reproduccionAutomatica": false,
  "efectosAnimacion": true
}
```

#### Cambiar Tema
```http
PUT /api/dashboard/:profileId/theme
Authorization: Bearer {token}
Content-Type: application/json

{
  "tema": "elegante",
  "configuracion": {
    "colorPrimario": "#1a1a1a",
    "colorSecundario": "#f8f9fa",
    "colorAccento": "#d4af37"
  }
}
```

### 📋 Gestión de Secciones

#### Actualizar Secciones
```http
PUT /api/dashboard/:profileId/sections
Authorization: Bearer {token}
Content-Type: application/json

{
  "secciones": [
    {
      "tipo": "biografia",
      "activa": true,
      "orden": 0,
      "contenido": {
        "titulo": "Su Historia",
        "descripcion": "Biografía personalizada",
        "icono": "user"
      },
      "configuracion": {
        "tipo": "text",
        "mostrarTitulos": true
      }
    },
    {
      "tipo": "galeria_fotos",
      "activa": true,
      "orden": 1,
      "contenido": {
        "titulo": "Galería de Recuerdos",
        "descripcion": "Momentos especiales en imágenes"
      },
      "configuracion": {
        "tipo": "grid",
        "columnas": 3,
        "mostrarTitulos": true
      }
    }
  ]
}
```

#### Reordenar Secciones
```http
PUT /api/dashboard/:profileId/sections/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
  "sectionsOrder": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439015"
  ]
}
```

### 🔒 Configuración de Privacidad

#### Actualizar Privacidad
```http
PUT /api/dashboard/:profileId/privacy
Authorization: Bearer {token}
Content-Type: application/json

{
  "publico": true,
  "requierePassword": false,
  "password": "",
  "mensajeBienvenida": "Bienvenidos al memorial de Juan Pérez"
}
```

### 🚀 Configuración SEO

#### Actualizar SEO
```http
PUT /api/dashboard/:profileId/seo
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Memorial Juan Pérez - Recuerdos Eternos",
  "descripcion": "Memorial digital dedicado a Juan Pérez. Recuerdos, fotos y testimonios de una vida extraordinaria.",
  "palabrasClave": ["memorial", "juan perez", "recuerdos", "familia", "homenaje"]
}
```

### 🌍 Acceso Público

#### Obtener Configuración Pública
```http
GET /api/dashboard/public/:profileId
# Sin autenticación requerida
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "perfil": {
      "nombre": "Juan",
      "apellido": "Pérez"
    },
    "secciones": [...],
    "configuracion": {...},
    "seo": {...},
    "css": ":root { --color-primary: #2c3e50; ... }"
  }
}
```

#### Obtener Templates
```http
GET /api/dashboard/templates
# Sin autenticación requerida
```

### 🔧 Funciones Avanzadas

#### Previsualizar Configuración
```http
POST /api/dashboard/:profileId/preview
Authorization: Bearer {token}
Content-Type: application/json

{
  "configuracion": {
    "tema": "elegante",
    "colorPrimario": "#1a1a1a"
  },
  "secciones": [...]
}
```

#### Exportar Configuración
```http
GET /api/dashboard/:profileId/export
Authorization: Bearer {token}
```

**Respuesta:** Archivo JSON descargable
```json
{
  "version": "1.0",
  "exportDate": "2025-06-19T15:30:00.000Z",
  "dashboard": {
    "secciones": [...],
    "configuracion": {...},
    "seo": {...}
  }
}
```

#### Importar Configuración
```http
POST /api/dashboard/:profileId/import
Authorization: Bearer {token}
Content-Type: application/json

{
  "dashboard": {
    "secciones": [...],
    "configuracion": {...},
    "seo": {...}
  }
}
```

#### Duplicar Configuración
```http
POST /api/dashboard/:profileId/duplicate/:sourceProfileId
Authorization: Bearer {token}
```

#### Restablecer por Defecto
```http
POST /api/dashboard/:profileId/reset
Authorization: Bearer {token}
```

---

## 🎨 Temas y Personalización

### Temas Disponibles

#### 🏛️ Clásico
- **Descripción**: Diseño tradicional y elegante
- **Colores**: Tonos neutros y sobrios
- **Fuentes**: Serif elegantes
- **Uso**: Memoriales formales y tradicionales

#### 🔲 Moderno
- **Descripción**: Estilo contemporáneo y minimalista
- **Colores**: Paleta limpia y contrastante
- **Fuentes**: Sans-serif modernas
- **Uso**: Memoriales contemporáneos

#### ✨ Elegante
- **Descripción**: Sofisticado y refinado
- **Colores**: Dorados y tonos premium
- **Fuentes**: Equilibrio entre serif y sans-serif
- **Uso**: Memoriales de lujo

### Opciones de Personalización

#### 🎨 Colores
```javascript
{
  "colorPrimario": "#2c3e50",    // Color principal del texto
  "colorSecundario": "#ffffff",   // Color de fondo
  "colorAccento": "#3498db"       // Color de enlaces y botones
}
```

#### 📝 Fuentes
- **serif**: Georgia, Times New Roman
- **sans-serif**: Arial, Helvetica
- **monospace**: Courier New, Monaco
- **cursive**: Cursive, Fantasy

#### 📏 Tamaños
- **pequeño**: 14px base
- **mediano**: 16px base (recomendado)
- **grande**: 18px base

---

## 📋 Secciones Configurables

### Tipos de Sección

| Tipo | Nombre | Configuraciones |
|------|--------|----------------|
| `biografia` | Biografía | text |
| `galeria_fotos` | Galería de Fotos | grid, carousel, masonry |
| `videos_memoriales` | Videos Memoriales | grid, list |
| `cronologia` | Cronología | timeline, list |
| `testimonios` | Testimonios | carousel, list |
| `logros` | Logros | grid, list |
| `hobbies` | Hobbies e Intereses | grid, list |
| `frases_celebres` | Frases Célebres | carousel, list |
| `datos_curiosos` | Datos Curiosos | grid, list |
| `condolencias` | Condolencias | list, grid |

### Configuraciones de Display

#### Grid Layout
```javascript
{
  "tipo": "grid",
  "columnas": 3,           // 1-6 columnas
  "mostrarTitulos": true,
  "mostrarDescripciones": false
}
```

#### Carousel Layout
```javascript
{
  "tipo": "carousel",
  "autoplay": false,
  "mostrarTitulos": true,
  "mostrarDescripciones": true
}
```

#### Timeline Layout
```javascript
{
  "tipo": "timeline",
  "mostrarFechas": true,
  "mostrarDescripciones": true
}
```

#### List Layout
```javascript
{
  "tipo": "list",
  "mostrarTitulos": false,
  "mostrarDescripciones": true
}
```

---

## 🔒 Control de Privacidad

### Opciones de Acceso

#### 🌍 Público
```javascript
{
  "publico": true,
  "requierePassword": false,
  "mensajeBienvenida": "Bienvenidos al memorial..."
}
```

#### 🔐 Protegido con Contraseña
```javascript
{
  "publico": true,
  "requierePassword": true,
  "password": "contraseña_segura",
  "mensajeBienvenida": "Memorial protegido"
}
```

#### 🔒 Completamente Privado
```javascript
{
  "publico": false,
  "requierePassword": false,
  "mensajeBienvenida": ""
}
```

---

## 🚀 Optimización SEO

### Configuración Completa
```javascript
{
  "titulo": "Memorial Juan Pérez - Recuerdos Eternos",
  "descripcion": "Memorial digital dedicado a Juan Pérez...",
  "palabrasClave": ["memorial", "juan perez", "recuerdos"]
}
```

### Mejores Prácticas

#### 📝 Título (60 caracteres máx)
- Incluir nombre completo
- Agregar palabras clave relevantes
- Ser descriptivo y emotivo

#### 📄 Descripción (160 caracteres máx)
- Resumir la vida de la persona
- Mencionar logros principales
- Incluir llamada a la acción emocional

#### 🏷️ Palabras Clave (10 máx)
- Nombre completo
- Profesión
- Lugares importantes
- Palabras relacionadas

---

## 📱 Integración Frontend

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function DashboardEditor({ profileId }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [profileId]);

  const loadDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboard/${profileId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const result = await response.json();
      setDashboard(result.data.dashboard);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configUpdates) => {
    try {
      const response = await fetch(`/api/dashboard/${profileId}/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configUpdates)
      });
      
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const changeTheme = async (tema) => {
    await updateConfig({ tema });
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="dashboard-editor">
      <div className="theme-selector">
        {['clasico', 'moderno', 'elegante'].map(tema => (
          <button 
            key={tema}
            onClick={() => changeTheme(tema)}
            className={dashboard.configuracion.tema === tema ? 'active' : ''}
          >
            {tema.charAt(0).toUpperCase() + tema.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="color-picker">
        <input 
          type="color"
          value={dashboard.configuracion.colorPrimario}
          onChange={(e) => updateConfig({ colorPrimario: e.target.value })}
        />
      </div>
      
      {/* Más configuraciones... */}
    </div>
  );
}
```

### JavaScript Vanilla Example

```javascript
class DashboardManager {
  constructor(profileId, token) {
    this.profileId = profileId;
    this.token = token;
    this.dashboard = null;
  }

  async load() {
    const response = await fetch(`/api/dashboard/${this.profileId}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    const result = await response.json();
    this.dashboard = result.data.dashboard;
    return this.dashboard;
  }

  async updateSections(sections) {
    const response = await fetch(`/api/dashboard/${this.profileId}/sections`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ secciones: sections })
    });
    return response.json();
  }

  async preview(config) {
    const response = await fetch(`/api/dashboard/${this.profileId}/preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async export() {
    const response = await fetch(`/api/dashboard/${this.profileId}/export`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    // Descargar archivo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${this.profileId}.json`;
    a.click();
  }
}
```

---

## 🧪 Testing

### Script de Test Automatizado
```bash
# Ejecutar tests del módulo dashboard
node test-dashboard-module.js
```

### Test Manual con Postman

1. **Crear dashboard**:
   ```
   POST /api/dashboard/:profileId
   Header: Authorization: Bearer {token}
   ```

2. **Cambiar tema**:
   ```
   PUT /api/dashboard/:profileId/theme
   Body: { "tema": "moderno" }
   ```

3. **Actualizar secciones**:
   ```
   PUT /api/dashboard/:profileId/sections
   Body: { "secciones": [...] }
   ```

---

## 📋 Límites por Plan

### Plan Básico
- **Secciones activas**: 5 máximo
- **Temas**: Todos disponibles
- **Personalización**: Básica
- **SEO**: Limitado

### Plan Premium
- **Secciones activas**: 10 máximo
- **Temas**: Todos + personalizados
- **Personalización**: Completa
- **SEO**: Avanzado

---

## 🛠️ Configuración CSS Generada

### CSS Variables
```css
:root {
  --color-primary: #2c3e50;
  --color-secondary: #ffffff;
  --color-accent: #3498db;
  --font-family: Arial, sans-serif;
  --font-size-base: 16px;
}

.theme-moderno {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-primary);
}
```

### Clases Disponibles
- `.theme-clasico`
- `.theme-moderno`
- `.theme-elegante`
- `.section-grid`
- `.section-carousel`
- `.section-timeline`
- `.section-list`

---

## 🚨 Manejo de Errores

### Errores Comunes

**Límite de secciones alcanzado:**
```json
{
  "success": false,
  "message": "Su plan permite máximo 5 secciones activas"
}
```

**Tema no válido:**
```json
{
  "success": false,
  "message": "Tema no válido"
}
```

**Color inválido:**
```json
{
  "success": false,
  "message": "colorPrimario debe ser un color hexadecimal válido"
}
```

---

## 💡 Tips y Mejores Prácticas

### 🎨 Diseño
1. **Contraste**: Asegurar buena legibilidad
2. **Consistencia**: Mantener estilo uniforme
3. **Accesibilidad**: Considerar usuarios con discapacidades
4. **Mobile-first**: Diseñar para dispositivos móviles

### 📱 Performance
1. **Lazy loading**: Cargar secciones bajo demanda
2. **Imágenes optimizadas**: Usar tamaños apropiados
3. **CSS minificado**: Reducir tamaño de estilos
4. **Caching**: Cachear configuraciones

### 🔒 Seguridad
1. **Validación**: Siempre validar entrada del usuario
2. **Sanitización**: Limpiar datos antes de guardar
3. **Autorización**: Verificar permisos en cada operación
4. **Rate limiting**: Limitar requests por usuario

---

¡El módulo Dashboard está completamente implementado y listo para crear memoriales hermosos y personalizados! 🎉