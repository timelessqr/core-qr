# 🌥️ Configuración de Cloudflare R2 - Lazos de Vida

## 🎯 Qué es Cloudflare R2

Cloudflare R2 es un servicio de almacenamiento de objetos compatible con S3 que ofrece:

- **🚀 Sin costos de transferencia**: No pagas por el ancho de banda
- **🌍 Distribución global**: CDN integrado con Cloudflare
- **💰 Precios competitivos**: Más económico que AWS S3
- **⚡ Alto rendimiento**: Red global de Cloudflare
- **🔒 Seguridad**: Cifrado automático y control de acceso

## 📋 Requisitos Previos

1. **Cuenta de Cloudflare**: [Registrarse aquí](https://dash.cloudflare.com/sign-up)
2. **Plan R2 activado**: Disponible en planes Workers pagos
3. **Acceso a R2**: Desde el dashboard de Cloudflare

## 🛠️ Configuración Paso a Paso

### 1. Crear un Bucket R2

1. Ir al dashboard de Cloudflare
2. Navegar a **R2 Object Storage**
3. Hacer clic en **Create bucket**
4. Nombrar el bucket: `lazos-de-vida-media`
5. Seleccionar región (recomendado: auto)
6. Configurar como **Público** para servir archivos directamente

### 2. Configurar Dominio Personalizado (Opcional)

1. En la configuración del bucket, ir a **Settings**
2. Configurar **Custom Domain**: `media.lazosdevida.com`
3. Agregar registro DNS en Cloudflare:
   ```
   Type: CNAME
   Name: media
   Content: {bucket-id}.r2.cloudflarestorage.com
   ```

### 3. Crear Token API

1. Ir a **R2** → **Manage R2 API tokens**
2. Hacer clic en **Create API token**
3. Configurar permisos:
   - **Permission**: Object Read & Write
   - **Zone resources**: Include - All zones
   - **Account resources**: Include - All accounts
4. Copiar las credenciales generadas

### 4. Configurar Variables de Entorno

Agregar las siguientes variables al archivo `.env`:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=tu_account_id_aqui
R2_ACCESS_KEY_ID=tu_access_key_aqui
R2_SECRET_ACCESS_KEY=tu_secret_key_aqui
R2_BUCKET_NAME=lazos-de-vida-media
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

**Dónde encontrar cada valor:**

- **R2_ACCOUNT_ID**: Dashboard → Right sidebar → Account ID
- **R2_ACCESS_KEY_ID**: Al crear el API token
- **R2_SECRET_ACCESS_KEY**: Al crear el API token
- **R2_BUCKET_NAME**: Nombre del bucket creado
- **R2_PUBLIC_URL**: URL pública del bucket (opcional si usas dominio personalizado)

### 5. Ejemplo de Configuración Completa

```bash
# .env
# Cloudflare R2 - Configuración de Producción
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
R2_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef12345678
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef12
R2_BUCKET_NAME=lazos-de-vida-media
R2_PUBLIC_URL=https://media.lazosdevida.com
```

## 🚀 Verificar Configuración

### 1. Restart del Servidor

```bash
npm run dev
```

### 2. Verificar Provider

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/media/storage/info
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "provider": "Cloudflare R2",
    "features": {
      "presignedUrls": true,
      "cdn": true,
      "globalDistribution": true,
      "autoBackup": true
    },
    "config": {
      "bucket": "lazos-de-vida-media",
      "publicUrl": "https://media.lazosdevida.com"
    }
  }
}
```

### 3. Test de Upload

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test-image.jpg" \
  -F "seccion=galeria_fotos" \
  http://localhost:3000/api/media/upload/PROFILE_ID
```

## 📊 Ventajas del Sistema Híbrido

### 🔧 Desarrollo Local
- **Storage**: Local (uploads/)
- **Velocidad**: Máxima para desarrollo
- **Costo**: $0
- **Setup**: Inmediato

### ☁️ Producción con R2
- **Storage**: Cloudflare R2
- **Velocidad**: Global CDN
- **Costo**: ~$0.015/GB/mes
- **Escalabilidad**: Ilimitada

### 🔄 Migración Automática

El sistema detecta automáticamente si R2 está configurado:

```javascript
// Si R2 está configurado
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID) {
  // Usar Cloudflare R2
} else {
  // Usar storage local
}
```

## 🛡️ Configuración de Seguridad

### 1. CORS Policy

Configurar CORS en el bucket R2:

```json
[
  {
    "AllowedOrigins": ["https://tu-dominio.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lazos-de-vida-media/*"
    }
  ]
}
```

### 3. Variables de Entorno Seguras

```bash
# ⚠️ NUNCA hacer commit de estas variables
# Usar .env.local o variables de entorno del servidor

# Desarrollo
R2_ACCOUNT_ID=dev_account_id
R2_BUCKET_NAME=lazos-de-vida-dev

# Producción
R2_ACCOUNT_ID=prod_account_id
R2_BUCKET_NAME=lazos-de-vida-prod
```

## 📈 Monitoreo y Métricas

### 1. Dashboard de R2

- **Storage utilizado**: GB almacenados
- **Requests**: GET, PUT, DELETE
- **Bandwidth**: Transferencias
- **Costos**: Estimación mensual

### 2. API Endpoints para Métricas

```bash
# Estadísticas generales
GET /api/media/storage/stats

# Uso por usuario
GET /api/media/stats/:profileId

# Listado de archivos
GET /api/media/storage/list?limit=100
```

## 🚨 Troubleshooting

### Error: "Access Denied"
```bash
# Verificar credenciales
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
echo $R2_ACCOUNT_ID
```

### Error: "Bucket not found"
```bash
# Verificar nombre del bucket
echo $R2_BUCKET_NAME
```

### Error: "Region not supported"
```bash
# R2 usa region 'auto' por defecto
# No configurar región específica
```

### Files no accesibles públicamente
1. Verificar configuración de bucket como público
2. Verificar CORS policy
3. Verificar R2_PUBLIC_URL

## 💡 Tips y Mejores Prácticas

### 1. Organización de Archivos

```
bucket/
├── media/
│   ├── {mediaId}/
│   │   ├── original.jpg
│   │   ├── thumbnail.jpg
│   │   ├── medium.jpg
│   │   └── large.jpg
├── users/
│   └── {userId}/
│       └── uploads/
└── temp/
    └── processing/
```

### 2. Optimización de Costos

- **Lifecycle rules**: Eliminar archivos temporales automáticamente
- **Compresión**: Usar WebP para imágenes
- **CDN caching**: Configurar headers de cache apropiados
- **Backup selectivo**: Solo archivos importantes

### 3. Performance

- **Parallel uploads**: Subir múltiples archivos simultáneamente
- **Presigned URLs**: Upload directo desde frontend
- **Image optimization**: Múltiples tamaños automáticos
- **CDN**: Distribución global automática

### 4. Seguridad

- **User isolation**: Cada usuario en su directorio
- **Token rotation**: Rotar keys periódicamente
- **Access logs**: Monitorear accesos sospechosos
- **Rate limiting**: Prevenir abuso

## 🎯 Próximos Pasos

1. **✅ Configurar R2**: Seguir esta guía
2. **🧪 Testing**: Probar uploads y accesos
3. **📊 Monitoring**: Configurar alertas
4. **🔄 Migration**: Planificar migración de archivos existentes
5. **📈 Scaling**: Configurar CDN y optimizaciones

---

¡Con esta configuración tendrás un sistema de almacenamiento profesional y escalable! 🚀