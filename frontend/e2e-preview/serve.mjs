// Test-only static server: exercise built files and the checked-in Vercel SPA rewrite.
// No API implementation, fixture responses, FastAPI process or development proxy.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const output = resolve(frontend, 'dist')
const { rewrites } = JSON.parse(await readFile(resolve(frontend, 'vercel.json'), 'utf8'))
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
}

async function findFile(pathname) {
  const candidate = resolve(output, `.${pathname}`)
  if (!candidate.startsWith(output + sep)) return undefined
  return (await stat(candidate).catch(() => undefined))?.isFile() ? candidate : undefined
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:4173').pathname)
    let file = await findFile(pathname)
    if (!file) {
      const rewrite = rewrites.find(({ source }) => new RegExp(`^${source}$`).test(pathname))
      if (rewrite) file = await findFile(rewrite.destination)
    }
    if (!file) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(await readFile(file))
  } catch {
    response.writeHead(500).end()
  }
}).listen(4173, '127.0.0.1')
