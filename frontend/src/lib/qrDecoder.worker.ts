// Background camera decoder worker. Vite emits the pinned WASM binary as a same-origin asset;
// readiness/error/result messages coordinate with qrDecoder.ts. Request up to two symbols so
// the scanner can reject ambiguity instead of picking one silently.

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
// Wait for initialization, decode the supplied ImageData and convert raw bytes with strict
// UTF-8. postMessage returns text/errors to the main thread; it is not an HTTP request.
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
