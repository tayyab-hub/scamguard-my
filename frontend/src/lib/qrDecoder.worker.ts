import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// The decoder binary is emitted by Vite from the pinned package and served by this origin.
// No CDN, frame upload, recording or decoded-destination access is involved.
const ready = prepareZXingModule({
  overrides: { locateFile: () => wasmUrl },
  fireImmediately: true,
})
void ready.then(
  () => self.postMessage({ type: 'ready' }),
  () => self.postMessage({ type: 'error' }),
)
self.onmessage = async (event: MessageEvent<ImageData>) => {
  try {
    await ready
    const results = await readBarcodes(event.data, {
      formats: ['QRCode'],
      maxNumberOfSymbols: 2,
      textMode: 'Plain',
    })
    // Fatal UTF-8 decoding keeps the same text boundary as the upload engine.
    const decoder = new TextDecoder('utf-8', { fatal: true })
    self.postMessage({
      type: 'result',
      payloads: results.map((result) => decoder.decode(result.bytes)),
    })
  } catch {
    self.postMessage({ type: 'error' })
  }
}
