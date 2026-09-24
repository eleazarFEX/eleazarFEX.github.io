/**
 * Copia los binarios de FFmpeg.wasm y el worker ESM de @ffmpeg/ffmpeg
 * dentro de /public, para que el navegador los cargue SIEMPRE desde el
 * mismo origen que la aplicacion.
 *
 * Esto es lo que evita el error:
 *   Failed to construct 'Worker': Script at https://cdn.jsdelivr.net/... 
 *   cannot be accessed from origin 'null'
 *
 * Resultado:
 *   public/ffmpeg/ffmpeg-core.js
 *   public/ffmpeg/ffmpeg-core.wasm
 *   public/ffmpeg/esm/*           (incluye worker.js y sus imports relativos)
 */
import { access, cp, mkdir, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const modules = path.join(root, 'node_modules')
const outDir = path.join(root, 'public', 'ffmpeg')

const exists = async (p) => {
  try {
    await access(p, constants.R_OK)
    return true
  } catch {
    return false
  }
}

const coreEsmDir = path.join(modules, '@ffmpeg', 'core', 'dist', 'esm')
const ffmpegEsmDir = path.join(modules, '@ffmpeg', 'ffmpeg', 'dist', 'esm')

async function main() {
  if (!(await exists(coreEsmDir))) {
    console.error(
      '\n[ffmpeg] No se encontro @ffmpeg/core/dist/esm.\n' +
        '         Ejecuta "npm install" antes de "npm run dev".\n'
    )
    process.exit(0) // no rompemos el install; el mensaje ya es claro
  }
  if (!(await exists(ffmpegEsmDir))) {
    console.error(
      '\n[ffmpeg] No se encontro @ffmpeg/ffmpeg/dist/esm.\n' +
        '         Ejecuta "npm install" antes de "npm run dev".\n'
    )
    process.exit(0)
  }

  await rm(outDir, { recursive: true, force: true })
  await mkdir(path.join(outDir, 'esm'), { recursive: true })

  // Core (build de un solo hilo: NO necesita SharedArrayBuffer ni cabeceras COOP/COEP)
  for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
    const from = path.join(coreEsmDir, f)
    if (!(await exists(from))) {
      console.error(`[ffmpeg] Falta ${f} en @ffmpeg/core/dist/esm`)
      process.exit(1)
    }
    await cp(from, path.join(outDir, f))
  }

  // Worker ESM completo (worker.js importa ./const.js, ./errors.js, etc.)
  await cp(ffmpegEsmDir, path.join(outDir, 'esm'), { recursive: true })

  console.log('[ffmpeg] Assets listos en public/ffmpeg (core + worker del mismo origen).')
}

main().catch((err) => {
  console.error('[ffmpeg] Error copiando assets:', err)
  process.exit(1)
})
