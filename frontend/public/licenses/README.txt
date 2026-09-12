SCAMGUARD Task 8 QR decoder notices

The live-camera fallback uses the unmodified reader binary and JavaScript API from
zxing-wasm 3.1.3 (https://github.com/Sec-ant/zxing-wasm/tree/v3.1.3).

zxing-wasm-specific JavaScript: Copyright (c) 2023 Ze-Zheng Wu, MIT License.
See zxing-wasm-MIT.txt, copied from the installed 3.1.3 npm package.

ZXing C++ and the C++ WASM binding: Apache License 2.0.
See zxing-Apache-2.0.txt, copied from the v3.1.3 binding source license.
Upstream core: https://github.com/zxing-cpp/zxing-cpp
Binding: https://github.com/Sec-ant/zxing-wasm/tree/v3.1.3/src/cpp

SCAMGUARD uses the reader entry point only, not the barcode-writing entry points.
The upstream README lists the licenses of additional components in the complete
package: https://github.com/Sec-ant/zxing-wasm/blob/v3.1.3/README.md#licenses

These files accompany the deferred decoder assets and are copied by Vite to /licenses/.
