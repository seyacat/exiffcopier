const { ipcRenderer } = require('electron');

let sourceFilePath = null;
let targetFilePath = null;
let sourceMetadata = {};
let targetMetadata = {};

const selectSourceBtn = document.getElementById('selectSourceBtn');
const selectTargetBtn = document.getElementById('selectTargetBtn');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const stickyCopyBtn = document.getElementById('stickyCopyBtn');
const loadTemplateBtn = document.getElementById('loadTemplateBtn');
const make360Checkbox = document.getElementById('make360Checkbox');

if (selectSourceBtn) {
    selectSourceBtn.addEventListener('click', selectSourceFile);
}
if (selectTargetBtn) {
    selectTargetBtn.addEventListener('click', selectTargetFile);
}
if (copyBtn) {
    copyBtn.addEventListener('click', copyMetadata);
}
if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshMetadata);
}
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', toggleAllCheckboxes);
}
if (stickyCopyBtn) {
    stickyCopyBtn.addEventListener('click', copyMetadata);
}
if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener('click', load360Template);
}

async function selectSourceFile() {
    try {
        const result = await ipcRenderer.invoke('select-file', {
                title: 'Seleccionar archivo origen',
                filters: [
                    { name: 'Todos los archivos', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

        if (!result.canceled && result.filePaths.length > 0) {
            sourceFilePath = result.filePaths[0];
            const sourcePathElement = document.getElementById('sourcePath');
            if (sourcePathElement) {
                sourcePathElement.textContent = sourceFilePath;
            }
            await loadSourceMetadata();
            updateCopyButton();
        }
    } catch (error) {
        showError('Error al seleccionar archivo origen: ' + error.message);
    }
}

async function selectTargetFile() {
    try {
        const result = await ipcRenderer.invoke('select-file', {
                title: 'Seleccionar archivo destino',
                filters: [
                    { name: 'Todos los archivos', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

        if (!result.canceled && result.filePaths.length > 0) {
            targetFilePath = result.filePaths[0];
            const targetPathElement = document.getElementById('targetPath');
            if (targetPathElement) {
                targetPathElement.textContent = targetFilePath;
            }
            await loadTargetMetadata();
            updateCopyButton();
        }
    } catch (error) {
        showError('Error al seleccionar archivo destino: ' + error.message);
    }
}


async function loadSourceMetadata() {
    if (!sourceFilePath) return;

    const loadingElement = document.getElementById('metadataLoading');
    const bodyElement = document.getElementById('metadataBody');
    
    if (loadingElement && loadingElement.style) {
        loadingElement.style.display = 'table-cell';
    }
    if (bodyElement) {
        bodyElement.innerHTML = '';
    }

    try {
        const result = await ipcRenderer.invoke('read-metadata', sourceFilePath);
        
        if (result.success) {
            sourceMetadata = result.metadata;
            renderMetadataTable();
        } else {
            showError('Error al leer metadatos del origen: ' + result.error);
            sourceMetadata = {};
            renderMetadataTable();
        }
    } catch (error) {
        showError('Error al cargar metadatos del origen: ' + error.message);
        sourceMetadata = {};
        renderMetadataTable();
    } finally {
        if (loadingElement && loadingElement.style) {
            loadingElement.style.display = 'none';
        }
    }
}

async function loadTargetMetadata() {
    if (!targetFilePath) return;

    // Preserve currently selected metadata before re-rendering
    const previouslySelected = getSelectedMetadata();

    try {
        const result = await ipcRenderer.invoke('read-metadata', targetFilePath);
        
        if (result.success) {
            targetMetadata = result.metadata;
            renderMetadataTable();
            
            // Restore previously selected checkboxes after rendering
            setTimeout(() => {
                previouslySelected.forEach(key => {
                    const checkbox = document.getElementById(`meta-${key}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
                updateCopyButton();
            }, 100);
        } else {
            showError('Error al leer metadatos del destino: ' + result.error);
            targetMetadata = {};
            renderMetadataTable();
        }
    } catch (error) {
        showError('Error al cargar metadatos del destino: ' + error.message);
        targetMetadata = {};
        renderMetadataTable();
    }
}

function renderMetadataTable() {
    const bodyElement = document.getElementById('metadataBody');
    if (!bodyElement) {
        console.error('Elemento metadataBody no encontrado');
        return;
    }
    
    bodyElement.innerHTML = '';

    // Show loading message if no files are selected
    if (!sourceFilePath && !targetFilePath) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'Seleccione archivos para ver los metadatos';
        if (cell.style) {
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            cell.style.fontStyle = 'italic';
        }
        row.appendChild(cell);
        bodyElement.appendChild(row);
        return;
    }

    const allMetadataKeys = [...new Set([
        ...Object.keys(sourceMetadata),
        ...Object.keys(targetMetadata)
    ])].sort();

    if (allMetadataKeys.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No se encontraron metadatos';
        if (cell.style) {
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
        }
        row.appendChild(cell);
        bodyElement.appendChild(row);
        return;
    }

    allMetadataKeys.forEach(metadataKey => {
        const row = document.createElement('tr');
        row.className = 'metadata-row';

        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'checkbox-cell';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `meta-${metadataKey}`;
        checkbox.checked = false;
        checkbox.value = metadataKey;
        checkbox.className = 'metadata-checkbox';
        
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const nameCell = document.createElement('td');
        nameCell.className = 'metadata-name';
        nameCell.textContent = metadataKey;
        row.appendChild(nameCell);

        const sourceValueCell = document.createElement('td');
        sourceValueCell.className = 'metadata-value';
        const sourceValue = sourceMetadata[metadataKey] || 'No disponible';
        sourceValueCell.textContent = sourceValue;
        row.appendChild(sourceValueCell);

        const targetValueCell = document.createElement('td');
        targetValueCell.className = 'metadata-value';
        const targetValue = targetMetadata[metadataKey] || 'No disponible';
        targetValueCell.textContent = targetValue;
        row.appendChild(targetValueCell);

        // Highlight cells with different values or when one is "No disponible"
        if (sourceValue !== targetValue) {
            if ((sourceValue !== 'No disponible' && targetValue === 'No disponible') ||
                (sourceValue === 'No disponible' && targetValue !== 'No disponible') ||
                (sourceValue !== 'No disponible' && targetValue !== 'No disponible')) {
                sourceValueCell.classList.add('metadata-different');
                targetValueCell.classList.add('metadata-different');
            }
        }

        bodyElement.appendChild(row);
    });
    
    updateSelectAllCheckbox();
    updateCopyButton();
}

function getSelectedMetadata() {
    const checkboxes = document.querySelectorAll('#metadataBody input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function toggleAllCheckboxes() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const metadataCheckboxes = document.querySelectorAll('#metadataBody .metadata-checkbox');
    
    if (selectAllCheckbox) {
        const isChecked = selectAllCheckbox.checked;
        metadataCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateCopyButton();
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const metadataCheckboxes = document.querySelectorAll('#metadataBody .metadata-checkbox');
    
    if (selectAllCheckbox && metadataCheckboxes.length > 0) {
        const allChecked = Array.from(metadataCheckboxes).every(checkbox => checkbox.checked);
        selectAllCheckbox.checked = allChecked;
    }
}

function updateCopyButton() {
    const copyBtn = document.getElementById('copyBtn');
    if (!copyBtn) {
        console.error('Botón copyBtn no encontrado');
        return;
    }
    
    const hasSelectedMetadata = getSelectedMetadata().length > 0;
    const isEnabled = sourceFilePath && targetFilePath && hasSelectedMetadata;
    
    copyBtn.disabled = !isEnabled;
    
    // Update sticky copy button as well
    if (stickyCopyBtn) {
        stickyCopyBtn.disabled = !isEnabled;
    }
    
    // Hide loading message when not copying
    const loadingElement = document.getElementById('copyLoading');
    if (loadingElement && loadingElement.style) {
        loadingElement.style.display = 'none';
    }
}

async function refreshMetadata() {
    console.log('Actualizando vista de metadatos...');
    
    // Reload metadata for both files
    if (sourceFilePath) {
        await loadSourceMetadata();
    }
    if (targetFilePath) {
        await loadTargetMetadata();
    }
    
    // Re-render the table to show updated values
    renderMetadataTable();
    
    console.log('Vista de metadatos actualizada');
}

async function copyMetadata() {
    const selectedMetadata = getSelectedMetadata();
    if (selectedMetadata.length === 0) {
        showError('No hay metadatos seleccionados');
        return;
    }

    const loadingElement = document.getElementById('copyLoading');
    const copyBtn = document.getElementById('copyBtn');
    
    if (loadingElement && loadingElement.style) {
        loadingElement.style.display = 'block';
    }
    if (copyBtn) {
        copyBtn.disabled = true;
    }

    try {
        const result = await ipcRenderer.invoke('write-metadata', {
            sourcePath: sourceFilePath,
            targetPath: targetFilePath,
            selectedMetadata: selectedMetadata
        });

    if (result.success) {
        // Run spatial 360 process if checkbox is checked
        if (make360Checkbox && make360Checkbox.checked) {
            console.log('Ejecutando proceso spatial 360...');
            const spatialResult = await ipcRenderer.invoke('run-spatial-360', {
                targetPath: targetFilePath
            });
            
            if (spatialResult.success) {
                console.log('Proceso spatial 360 completado exitosamente');
            } else {
                console.error('Error en proceso spatial 360:', spatialResult.error);
            }
        }
        
        showResults(result.result);
        await loadTargetMetadata();
    } else {
        showError('Error al copiar metadatos: ' + result.error);
    }
    } catch (error) {
        showError('Error durante la copia: ' + error.message);
    } finally {
        if (loadingElement && loadingElement.style) {
            loadingElement.style.display = 'none';
        }
        if (copyBtn) {
            copyBtn.disabled = false;
        }
        updateCopyButton();
        
        // Refresh metadata after copying to show updated values
        if (result && result.success) {
            setTimeout(() => {
                refreshMetadata();
            }, 500);
        }
    }
}

function showResults(result) {
    const resultSection = document.getElementById('resultSection');
    const resultMessage = document.getElementById('resultMessage');
    
    if (!resultSection || !resultMessage) {
        console.error('Elementos de resultado no encontrados');
        return;
    }
    
    const copiedCount = result.copied.length;
    const failedCount = result.failed.length;
    
    resultMessage.innerHTML = `
        <p><strong>Resultado:</strong> ${copiedCount} metadatos copiados exitosamente, ${failedCount} fallaron.</p>
        ${failedCount > 0 ? `<p><strong>Metadatos que fallaron:</strong> ${result.failed.join(', ')}</p>` : ''}
    `;
    
    if (resultSection.style) {
        resultSection.style.display = 'block';
    }
}

function showError(message) {
    console.error('Error en la aplicación:', message);
    alert('Error: ' + message);
}

// Add global error handler for uncaught errors
window.addEventListener('error', function(event) {
    console.error('Error no capturado:', event.error);
    console.error('En el archivo:', event.filename);
    console.error('En la línea:', event.lineno);
});

const metadataBody = document.getElementById('metadataBody');
if (metadataBody) {
    metadataBody.addEventListener('change', function() {
        updateSelectAllCheckbox();
        updateCopyButton();
    });
}

function load360Template() {
    console.log('Cargando template 360...');
    
    // Set source file path to indicate template is loaded
    sourceFilePath = 'template_360';
    const sourcePathElement = document.getElementById('sourcePath');
    if (sourcePathElement) {
        sourcePathElement.textContent = 'Template 360 Cargado';
    }
    
    // Define the 360 metadata template
    sourceMetadata = {
        'ProjectionType': 'equirectangular',
        'Spherical': 'true',
        'StereoMode': 'mono',
        'Stitched': 'true',
        'StitchingSoftware': 'Insta360'
    };
    
    console.log('Template 360 cargado con metadatos:', sourceMetadata);
    
    // Render the table with the template metadata
    renderMetadataTable();
    updateCopyButton();
    
    // Select all template metadata checkboxes
    setTimeout(() => {
        const templateMetadataKeys = ['ProjectionType', 'Spherical', 'StereoMode', 'Stitched', 'StitchingSoftware'];
        templateMetadataKeys.forEach(key => {
            const checkbox = document.getElementById(`meta-${key}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        updateCopyButton();
    }, 100);
}

// Initialize the table when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Aplicación iniciada - DOM cargado');
    try {
        renderMetadataTable();
        updateCopyButton();
    } catch (error) {
        console.error('Error durante la inicialización:', error);
    }
});