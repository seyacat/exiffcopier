# Script para Agregar Metadata 3D Espacial a Videos

Este script utiliza la librería **Google spatial-media** para agregar metadata 3D espacial a videos, permitiendo que sean reproducidos como contenido VR/360 en plataformas compatibles.

## Requisitos

1. **Python 3.x** - Debe estar instalado y disponible en el PATH
2. **Git** - Para descargar la librería spatial-media

## Instalación

El script descargará automáticamente la librería spatial-media la primera vez que se ejecute.

## Uso

### Sintaxis básica:
```bash
node add_spatial_3d.js <input_video> <output_video> [stereo_mode]
```

### Parámetros:
- `input_video`: Ruta al video de entrada (ej: `test.mp4`)
- `output_video`: Ruta donde guardar el video con metadata 3D
- `stereo_mode`: Modo estereoscópico (opcional):
  - `top-bottom` (por defecto) - Video dividido en parte superior e inferior
  - `left-right` - Video dividido en parte izquierda y derecha  
  - `mono` - Video 360 monoscópico (sin estereoscopía)

### Ejemplos:

1. **Agregar metadata 3D top-bottom al video test.mp4:**
```bash
node add_spatial_3d.js test.mp4 test_3d.mp4
```

2. **Agregar metadata 3D left-right:**
```bash
node add_spatial_3d.js test.mp4 test_3d_left_right.mp4 left-right
```

3. **Crear video 360 monoscópico:**
```bash
node add_spatial_3d.js test.mp4 test_360_mono.mp4 mono
```

## Características

- ✅ Descarga automática de spatial-media
- ✅ Verificación de dependencias (Python)
- ✅ Múltiples modos estereoscópicos
- ✅ Validación de archivos de entrada/salida
- ✅ Información detallada del proceso

## Plataformas compatibles

Los videos procesados con este script serán compatibles con:
- YouTube VR
- Facebook 360
- Oculus Video Player
- Google Cardboard
- Y otras plataformas que soporten el estándar spatial-media

## Notas

- El video de entrada debe tener la resolución adecuada para el modo estereoscópico seleccionado
- Para contenido top-bottom/left-right, la resolución debe ser al menos 3840x2160 (4K)
- El proceso puede tomar varios minutos dependiendo del tamaño del video
- Se crea una copia del video con la metadata agregada, el original no se modifica

## Solución de problemas

**Error: "Python no encontrado"**
- Instale Python desde https://python.org
- Asegúrese de que Python esté en el PATH del sistema

**Error: "Git no encontrado"**
- Instale Git desde https://git-scm.com
- O descargue spatial-media manualmente en `node_modules/spatial-media/`

**Error de permisos**
- Ejecute el script desde una terminal con permisos de administrador si es necesario