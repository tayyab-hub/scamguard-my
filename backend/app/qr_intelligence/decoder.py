from __future__ import annotations

import hashlib
import warnings
from dataclasses import dataclass
from importlib.metadata import version
from io import BytesIO

import zxingcpp
from PIL import Image, UnidentifiedImageError

DECODER_LIBRARY = "zxing-cpp"
DECODER_VERSION = version("zxing-cpp")
SUPPORTED_FORMATS = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}


class QRImageError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class DecodedQR:
    payload: str
    payload_bytes: int
    file_sha256: str
    image_format: str
    width: int
    height: int
    decoder_library: str = DECODER_LIBRARY
    decoder_version: str = DECODER_VERSION


def decoder_operational() -> bool:
    return bool(DECODER_VERSION and zxingcpp.BarcodeFormat.QRCode)


def validate_payload_bytes(payload_bytes: bytes, max_payload_bytes: int) -> str:
    if not payload_bytes:
        raise QRImageError("QR_PAYLOAD_EMPTY", "The QR code contains no readable payload.")
    if len(payload_bytes) > max_payload_bytes:
        raise QRImageError(
            "QR_PAYLOAD_TOO_LARGE", "The decoded QR payload exceeds the 5,000-byte limit."
        )
    try:
        payload = payload_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise QRImageError(
            "QR_PAYLOAD_ENCODING_UNSUPPORTED", "The QR payload is not valid UTF-8 text."
        ) from None
    if not payload.strip():
        raise QRImageError("QR_PAYLOAD_EMPTY", "The QR code contains no readable text payload.")
    if any(ord(char) < 32 and char not in "\r\n\t" for char in payload):
        raise QRImageError(
            "QR_PAYLOAD_UNSUPPORTED", "The QR payload contains unsupported control characters."
        )
    return payload


def decode_qr_image(
    data: bytes,
    declared_mime: str | None,
    *,
    max_upload_bytes: int,
    max_dimension: int,
    max_pixels: int,
    max_payload_bytes: int,
) -> DecodedQR:
    if not data:
        raise QRImageError("QR_IMAGE_EMPTY", "Choose a non-empty QR image.")
    if len(data) > max_upload_bytes:
        raise QRImageError("QR_IMAGE_TOO_LARGE", "QR image must be 5 MB or smaller.")
    if declared_mime not in SUPPORTED_FORMATS.values():
        raise QRImageError("QR_IMAGE_TYPE_UNSUPPORTED", "Upload a PNG, JPEG or WebP image.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as candidate:
                actual_format = candidate.format
                width, height = candidate.size
                if actual_format not in SUPPORTED_FORMATS:
                    raise QRImageError(
                        "QR_IMAGE_TYPE_UNSUPPORTED", "Upload a PNG, JPEG or WebP image."
                    )
                if SUPPORTED_FORMATS[actual_format] != declared_mime:
                    raise QRImageError(
                        "QR_IMAGE_TYPE_MISMATCH",
                        "The uploaded file content does not match its declared image type.",
                    )
                if width <= 0 or height <= 0:
                    raise QRImageError("QR_IMAGE_INVALID", "The image dimensions are invalid.")
                if getattr(candidate, "n_frames", 1) != 1:
                    raise QRImageError(
                        "QR_IMAGE_ANIMATED_UNSUPPORTED",
                        "Animated images are unsupported. Upload one still QR image.",
                    )
                if width > max_dimension or height > max_dimension or width * height > max_pixels:
                    raise QRImageError(
                        "QR_IMAGE_DIMENSIONS_EXCEEDED",
                        "QR image dimensions are too large. Use an image up to 4096 × 4096 pixels.",
                    )
                candidate.verify()

            with Image.open(BytesIO(data)) as candidate:
                # A fresh, single-channel pixel buffer strips EXIF and other container metadata.
                pixels = candidate.convert("L")
                pixels.load()
    except QRImageError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise QRImageError(
            "QR_IMAGE_DIMENSIONS_EXCEEDED", "The image expands to an unsafe number of pixels."
        ) from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise QRImageError(
            "QR_IMAGE_INVALID", "The uploaded file is not a readable supported image."
        ) from None

    try:
        symbols = zxingcpp.read_barcodes(
            pixels,
            formats=zxingcpp.BarcodeFormat.QRCode,
            try_rotate=True,
            try_downscale=True,
            try_invert=True,
        )
    except (RuntimeError, TypeError, ValueError):
        raise QRImageError(
            "QR_DECODE_FAILED", "The image could not be decoded safely. Try a clearer image."
        ) from None
    valid = [symbol for symbol in symbols if symbol.valid]
    if not valid:
        raise QRImageError(
            "QR_NOT_DETECTED",
            "No readable QR code was detected. Try a clearer image with the entire code visible.",
        )
    if len(valid) > 1:
        raise QRImageError(
            "QR_MULTIPLE_DETECTED",
            "Multiple QR codes detected. Please crop or upload one QR code.",
        )
    payload_bytes = bytes(valid[0].bytes)
    payload = validate_payload_bytes(payload_bytes, max_payload_bytes)
    return DecodedQR(
        payload=payload,
        payload_bytes=len(payload_bytes),
        file_sha256=hashlib.sha256(data).hexdigest(),
        image_format=actual_format,
        width=width,
        height=height,
    )
