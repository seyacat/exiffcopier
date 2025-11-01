# EXIFCopy - Aplicación de Gestión de Metadatos y Video 360

Una aplicación Electron para copiar metadatos EXIF entre archivos de video y agregar metadata 3D espacial para videos 360°.

## Características Principales

### 1. Gestión de Metadatos EXIF
- **Copia selectiva**: Selecciona qué metadatos copiar entre archivos
- **Filtrado inteligente**: Evita copiar metadatos problemáticos automáticamente
- **Visualización completa**: Muestra todos los metadatos disponibles en ambos archivos
- **Template 360**: Carga metadatos predefinidos para videos 360°

### 2. Conversión a Video 360°
- **Stereoscopic3D**: Soporte para modos estereoscópicos:
  - **Top-Bottom**: Video 3D con vistas superior e inferior
  - **Left-Right**: Video 3D con vistas izquierda y derecha
- **Monoscopic**: Video 360° monoscópico estándar
- **Integración con spatial-media**: Utiliza la librería de Google para metadata espacial

### 3. Interfaz de Usuario
- **Selector de archivos**: Interfaz gráfica para seleccionar archivos fuente y destino
- **Lista de metadatos**: Visualización organizada de todos los metadatos disponibles
- **Checkbox de selección**: Permite seleccionar metadatos individuales
- **Procesamiento en tiempo real**: Muestra el progreso y resultados del procesamiento

## Requisitos del Sistema

- **Node.js** (versión 14 o superior)
- **Python** (para ejecutar spatial-media)
- **Git** (para descargar spatial-media automáticamente)

## Instalación

1. Clona o descarga el proyecto
2. Instala las dependencias:
   ```bash
   npm install
   ```

## Uso

### Aplicación Gráfica
```bash
npm start
```

### Línea de Comandos
```bash
# Para agregar metadata 3D espacial
node add_spatial_3d.js [input_video] [output_video] [stereo_mode]

# Ejemplos:
node add_spatial_3d.js test.mp4 test_3d.mp4 top-bottom
node add_spatial_3d.js test.mp4 test_3d_left_right.mp4 left-right
node add_spatial_3d.js test.mp4 test_360_mono.mp4 none
```

### Modos Estereoscópicos Disponibles

- **top-bottom**: Video Stereoscopic3D con vistas superior e inferior
- **left-right**: Video Stereoscopic3D con vistas izquierda y derecha  
- **none**: Video Monoscopic 360° (sin estereoscopía)

## Estructura del Proyecto

```
exifcopy/
├── main.js              # Proceso principal de Electron
├── renderer.js          # Lógica de la interfaz de usuario
├── index.html           # Interfaz gráfica
├── add_spatial_3d.js    # Script para metadata 3D espacial
├── package.json         # Configuración del proyecto
└── README.md           # Este archivo
```

## Dependencias Principales

- **electron**: Framework para aplicaciones de escritorio
- **exiftool-vendored**: Lectura y escritura de metadatos EXIF
- **spatial-media**: Librería de Google para metadata 3D espacial

## Funcionalidades Técnicas

### Procesamiento de Metadatos
- Lectura de más de 80 propiedades EXIF diferentes
- Conversión automática de tipos de datos
- Manejo de arrays y objetos complejos
- Filtrado de metadatos problemáticos

### Metadata 3D Espacial
- Inyección de metadata MP4 v2 para videos 360°
- Soporte para proyección equirectangular
- Configuración de modos estereoscópicos
- Verificación de metadata agregado

### Manejo de Errores
- Validación de archivos de entrada
- Manejo de errores de Python/spatial-media
- Verificación de archivos de salida
- Logs detallados del proceso

## Formatos Soportados

- **Video**: MP4, MOV
- **Metadatos**: EXIF, XMP, IPTC
- **360°**: Metadata espacial MP4 v2

## Notas Importantes

- La aplicación requiere conexión a internet para descargar spatial-media la primera vez
- Los archivos de video deben ser compatibles con MP4 para metadata 360°
- Se recomienda hacer copias de seguridad antes de procesar archivos importantes

## Licencia

Este proyecto utiliza herramientas de código abierto incluyendo spatial-media de Google.