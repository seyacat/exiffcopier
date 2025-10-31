const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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
    
    for (const key of selectedMetadata) {
        if (sourceTags[key] !== null && sourceTags[key] !== undefined) {
            const sourceValue = sourceTags[key];
            const targetValue = targetTags[key] !== null && targetTags[key] !== undefined ? targetTags[key] : 'No disponible';
            
            result.sourceMetadata[key] = Array.isArray(sourceValue) ? sourceValue.join(', ') : sourceValue.toString();
            result.targetMetadata[key] = Array.isArray(targetValue) ? targetValue.join(', ') : targetValue.toString();
            
            // Convert boolean values to strings to avoid IPC serialization issues
            if (typeof sourceValue === 'boolean') {
                updates[key] = sourceValue.toString();
            } else {
                updates[key] = sourceValue;
            }
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
            
            // If there's a write error, try to write each tag individually
            // to identify which specific tags are causing issues
            const successfulTags = [];
            const failedTags = [];
            
            for (const [tagKey, tagValue] of Object.entries(updates)) {
                try {
                    await exiftool.write(targetPath, { [tagKey]: tagValue }, ['-overwrite_original']);
                    successfulTags.push(tagKey);
                } catch (individualError) {
                    console.warn(`No se pudo escribir el tag ${tagKey}:`, individualError.message);
                    failedTags.push(tagKey);
                }
            }
            
            // Update the result to reflect individual tag successes/failures
            result.copied = result.copied.filter(tag => successfulTags.includes(tag));
            result.failed = [...result.failed, ...failedTags];
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