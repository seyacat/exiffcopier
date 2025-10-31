const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Set Content Security Policy to fix security warning
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline'"]
      }
    });
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('read-metadata', async (event, filePath) => {
  try {
    const { exiftool } = require('exiftool-vendored');
    
    console.log(`Leyendo metadatos del archivo: ${filePath}`);
    const tags = await exiftool.read(filePath);
    
    const metadata = {};
    for (const [key, value] of Object.entries(tags)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          metadata[key] = value.join(', ');
        } else if (typeof value === 'object') {
          metadata[key] = JSON.stringify(value);
        } else {
          metadata[key] = value.toString();
        }
      }
    }
    
    console.log(`Metadatos leídos exitosamente: ${Object.keys(metadata).length} propiedades`);
    return { success: true, metadata };
  } catch (error) {
    console.error(`Error al leer metadatos de ${filePath}:`, error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-metadata', async (event, { sourcePath, targetPath, selectedMetadata }) => {
  try {
    const { exiftool } = require('exiftool-vendored');
    
    console.log(`Iniciando copia de metadatos de ${sourcePath} a ${targetPath}`);
    console.log(`Metadatos seleccionados: ${selectedMetadata.join(', ')}`);
    
    const sourceTags = await exiftool.read(sourcePath);
    const targetTags = await exiftool.read(targetPath);
    
    const result = {
      copied: [],
      failed: [],
      sourceMetadata: {},
      targetMetadata: {}
    };
    
    const updates = {};
    
    // Only filter truly problematic metadata keys that are known to cause issues
    const problematicKeys = [
        'ExifToolVersion', 'FileAccessDate', 'FileName', 'FileSize', 'FileType',
        'FileTypeExtension', 'MIMEType', 'Megapixels', 'SourceFile', 'errors'
    ];
    
    
    for (const key of selectedMetadata) {
        if (sourceTags[key] !== null && sourceTags[key] !== undefined) {
            const sourceValue = sourceTags[key];
            const targetValue = targetTags[key] !== null && targetTags[key] !== undefined ? targetTags[key] : 'No disponible';
            
            result.sourceMetadata[key] = Array.isArray(sourceValue) ? sourceValue.join(', ') : sourceValue.toString();
            result.targetMetadata[key] = Array.isArray(targetValue) ? targetValue.join(', ') : targetValue.toString();
            
            // Skip only truly problematic metadata keys
            if (problematicKeys.includes(key)) {
                console.log(`Saltando metadato problemático: ${key}`);
                result.failed.push(key);
                continue;
            }
            
            
            // Recode metadata values for better compatibility
            let recodedValue;
            
            if (typeof sourceValue === 'boolean') {
                recodedValue = sourceValue.toString();
            } else if (Array.isArray(sourceValue)) {
                recodedValue = sourceValue.join(', ');
            } else if (typeof sourceValue === 'object' && sourceValue !== null) {
                recodedValue = JSON.stringify(sourceValue);
            } else if (typeof sourceValue === 'number') {
                // Convert numbers to strings to avoid precision issues
                recodedValue = sourceValue.toString();
            } else {
                recodedValue = sourceValue;
            }
            
            updates[key] = recodedValue;
            result.copied.push(key);
        } else {
            result.failed.push(key);
        }
    }
    
    if (Object.keys(updates).length > 0) {
        console.log(`Escribiendo ${Object.keys(updates).length} metadatos al archivo destino`);
        try {
            await exiftool.write(targetPath, updates, ['-overwrite_original']);
            console.log('Metadatos escritos exitosamente');
        } catch (writeError) {
            console.error('Error al escribir metadatos:', writeError.message);
            // If write fails, mark all attempted tags as failed
            result.failed = [...result.failed, ...Object.keys(updates)];
            result.copied = [];
        }
    } else {
        console.log('No hay metadatos para escribir');
    }
    
    console.log(`Resultado: ${result.copied.length} copiados, ${result.failed.length} fallados`);
    return { success: true, result };
  } catch (error) {
    console.error(`Error al copiar metadatos:`, error.message);
    return { success: false, error: error.message };
  }
});

// Handler for running spatial 360 process
ipcMain.handle('run-spatial-360', async (event, { targetPath }) => {
    try {
        console.log(`Ejecutando proceso spatial 360 en: ${targetPath}`);
        
        // Import the SpatialMediaInjector class
        const SpatialMediaInjector = require('./add_spatial_3d.js');
        const injector = new SpatialMediaInjector();
        
        // Create a temporary output path
        const path = require('path');
        const tempOutputPath = targetPath.replace(/\.[^/.]+$/, '') + '_360_temp.mp4';
        
        // Run spatial media injection for mono (360 video)
        await injector.injectSpatialMetadata(targetPath, tempOutputPath, 'mono');
        
        // Replace original file with the processed one
        const fs = require('fs');
        fs.unlinkSync(targetPath);
        fs.renameSync(tempOutputPath, targetPath);
        
        console.log('Proceso spatial 360 completado exitosamente');
        return { success: true };
        
    } catch (error) {
        console.error(`Error en proceso spatial 360:`, error.message);
        return { success: false, error: error.message };
    }
});
