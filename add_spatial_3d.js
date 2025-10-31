const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script para agregar metadata 3D espacial a videos usando Google spatial-media
 * 
 * Uso: node add_spatial_3d.js [input_video] [output_video] [stereo_mode]
 *
 * stereo_mode puede ser:
 *   - top-bottom (por defecto) - Stereoscopic3D Top-Bottom
 *   - left-right - Stereoscopic3D Left-Right
 *   - mono - Monoscopic (sin metadata stereo)
 */

class SpatialMediaInjector {
    constructor() {
        this.spatialMediaPath = path.join(__dirname, 'node_modules', 'spatial-media', 'spatialmedia');
    }

    /**
     * Verifica si spatial-media está instalado
     */
    async checkSpatialMedia() {
        try {
            const spatialMediaExists = fs.existsSync(this.spatialMediaPath);
            if (!spatialMediaExists) {
                console.log('Instalando spatial-media...');
                await this.installSpatialMedia();
            }
            return true;
        } catch (error) {
            console.error('Error verificando spatial-media:', error.message);
            return false;
        }
    }

    /**
     * Instala spatial-media desde GitHub
     */
    async installSpatialMedia() {
        return new Promise((resolve, reject) => {
            console.log('Descargando spatial-media...');
            
            const downloadCommand = spawn('git', [
                'clone',
                'https://github.com/google/spatial-media.git',
                path.join(__dirname, 'node_modules', 'spatial-media')
            ]);

            downloadCommand.on('close', (code) => {
                if (code === 0) {
                    console.log('spatial-media descargado exitosamente');
                    resolve();
                } else {
                    reject(new Error(`Error descargando spatial-media: código ${code}`));
                }
            });

            downloadCommand.on('error', (error) => {
                reject(new Error(`Error ejecutando git: ${error.message}`));
            });
        });
    }

    /**
     * Agrega metadata 3D espacial al video
     */
    async injectSpatialMetadata(inputPath, outputPath, stereoMode = 'top-bottom') {
        try {
            // Verificar que el archivo de entrada existe
            if (!fs.existsSync(inputPath)) {
                throw new Error(`Archivo de entrada no encontrado: ${inputPath}`);
            }

            // Verificar que spatial-media está disponible
            const spatialMediaReady = await this.checkSpatialMedia();
            if (!spatialMediaReady) {
                throw new Error('No se pudo inicializar spatial-media');
            }

            console.log(`Procesando video: ${inputPath}`);
            console.log(`Modo estereoscópico: ${stereoMode}`);
            console.log(`Archivo de salida: ${outputPath}`);


            // Crear comando para spatial-media
            const args = ['-i', '-2']; // -i para inyectar, -2 para v2 metadata
            
            // Agregar opciones según el modo estereoscópico
            if (stereoMode === 'mono') {
                // Para Monoscopic, usar modo 'mono' (modificado en spatial-media)
                args.push('-s', 'mono');
            } else {
                args.push('-s', stereoMode);
            }

            // Agregar proyección equirectangular para video 360
            args.push('-p', 'equirectangular');
            
            // Agregar archivos de entrada y salida
            args.push(inputPath, outputPath);

            console.log('Ejecutando spatial-media con argumentos:', args.join(' '));

            return new Promise((resolve, reject) => {
                const spatialMediaProcess = spawn('python', [
                    this.spatialMediaPath,
                    ...args
                ]);

                let stdout = '';
                let stderr = '';

                spatialMediaProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                    console.log('spatial-media:', data.toString().trim());
                });

                spatialMediaProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                    console.error('spatial-media error:', data.toString().trim());
                });

                spatialMediaProcess.on('close', async (code) => {
                    if (code === 0) {
                        console.log('✅ Metadata 3D espacial agregada exitosamente');
                        console.log(`Archivo creado: ${outputPath}`);
                        
                        // Verificar que el archivo de salida existe
                        if (fs.existsSync(outputPath)) {
                            const stats = fs.statSync(outputPath);
                            console.log(`Tamaño del archivo: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
                            
                            // Verificar metadata agregado por spatial-media
                            await this.verifySpatialMetadata(outputPath, stereoMode);
                            
                            resolve({
                                success: true,
                                outputPath: outputPath,
                                fileSize: stats.size
                            });
                        } else {
                            reject(new Error('El archivo de salida no se creó correctamente'));
                        }
                    } else {
                        reject(new Error(`spatial-media falló con código ${code}: ${stderr}`));
                    }
                });

                spatialMediaProcess.on('error', (error) => {
                    reject(new Error(`Error ejecutando spatial-media: ${error.message}`));
                });
            });

        } catch (error) {
            console.error('Error inyectando metadata espacial:', error.message);
            throw error;
        }
    }

    /**
     * Verifica el metadata espacial agregado
     */
    async verifySpatialMetadata(filePath, stereoMode) {
        try {
            console.log('\n--- Verificación de Metadata 3D ---');
            
            // Verificar con spatial-media directamente
            await this.checkWithSpatialMedia(filePath);
            
            console.log(`✅ Video procesado como ${stereoMode === 'mono' ? 'Monoscopic' : 'Stereoscopic3D ' + stereoMode}`);
            
        } catch (error) {
            console.error('Error verificando metadata:', error.message);
        }
    }

    /**
     * Verifica metadata usando spatial-media directamente
     */
    async checkWithSpatialMedia(filePath) {
        return new Promise((resolve) => {
            const spatialMediaProcess = spawn('python', [
                this.spatialMediaPath,
                filePath
            ]);

            let stdout = '';
            let stderr = '';

            spatialMediaProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            spatialMediaProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            spatialMediaProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Metadata spatial-media:');
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        if (line.trim() && !line.includes('Processing:') && !line.includes('Loaded file...')) {
                            console.log(`  ${line.trim()}`);
                        }
                    }
                }
                resolve();
            });
        });
    }


    /**
     * Verifica si Python está disponible
     */
    async checkPython() {
        return new Promise((resolve) => {
            const pythonCheck = spawn('python', ['--version']);
            
            pythonCheck.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Python encontrado');
                    resolve(true);
                } else {
                    console.error('❌ Python no encontrado. Se requiere Python para ejecutar spatial-media');
                    resolve(false);
                }
            });

            pythonCheck.on('error', () => {
                console.error('❌ Python no encontrado. Se requiere Python para ejecutar spatial-media');
                resolve(false);
            });
        });
    }
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
Uso: node add_spatial_3d.js <input_video> <output_video> [stereo_mode]

Argumentos:
  input_video   - Ruta al video de entrada (ej: test.mp4)
  output_video  - Ruta donde guardar el video con metadata 3D
  stereo_mode   - Modo estereoscópico (opcional):
                  - top-bottom (por defecto)
                  - left-right  
                  - mono (video 360 monoscópico)

Ejemplos:
  node add_spatial_3d.js test.mp4 test_3d.mp4
  node add_spatial_3d.js test.mp4 test_3d_left_right.mp4 left-right
  node add_spatial_3d.js test.mp4 test_360_mono.mp4 mono
        `);
        process.exit(1);
    }

    const [inputPath, outputPath, stereoMode = 'top-bottom'] = args;
    
    // Validar modo estereoscópico
    const validModes = ['top-bottom', 'left-right', 'mono'];
    if (!validModes.includes(stereoMode)) {
        console.error(`Modo estereoscópico inválido: ${stereoMode}`);
        console.error(`Modos válidos: ${validModes.join(', ')}`);
        process.exit(1);
    }

    const injector = new SpatialMediaInjector();

    try {
        // Verificar Python
        const pythonAvailable = await injector.checkPython();
        if (!pythonAvailable) {
            console.error('Por favor instale Python y asegúrese de que esté en el PATH');
            process.exit(1);
        }

        // Inyectar metadata
        await injector.injectSpatialMetadata(inputPath, outputPath, stereoMode);
        
        console.log('\n🎉 Proceso completado exitosamente!');
        console.log(`El video con metadata 3D espacial está en: ${outputPath}`);
        
    } catch (error) {
        console.error('\n❌ Error durante el proceso:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = SpatialMediaInjector;