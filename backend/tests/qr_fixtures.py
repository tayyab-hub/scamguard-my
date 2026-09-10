from io import BytesIO

import zxingcpp
from PIL import Image


def qr_image_bytes(payload: str, image_format: str = "PNG") -> bytes:
    barcode = zxingcpp.create_barcode(payload, zxingcpp.BarcodeFormat.QRCode)
    image = Image.fromarray(barcode.to_image(scale=7))
    if image_format in {"JPEG", "WEBP"}:
        image = image.convert("RGB")
    output = BytesIO()
    image.save(output, format=image_format, quality=95)
    return output.getvalue()


def multiple_qr_image_bytes() -> bytes:
    left = Image.open(BytesIO(qr_image_bytes("first controlled QR"))).convert("L")
    right = Image.open(BytesIO(qr_image_bytes("second controlled QR"))).convert("L")
    canvas = Image.new("L", (left.width + right.width + 80, max(left.height, right.height)), 255)
    canvas.paste(left, (0, 0))
    canvas.paste(right, (left.width + 80, 0))
    output = BytesIO()
    canvas.save(output, format="PNG")
    return output.getvalue()


def emv_payment_payload(*, corrupt_crc: bool = False, embedded_url: str | None = None) -> str:
    fields = [
        ("00", "01"),
        ("01", "11"),
        ("26", "0014A0000006770101"),
        ("52", "5812"),
        ("53", "458"),
        ("54", "12.34"),
        ("58", "MY"),
        ("59", "SCAMGUARD"),
        ("60", "KUALA LUMPUR"),
    ]
    if embedded_url:
        fields.insert(3, ("27", embedded_url))
    body = "".join(f"{tag}{len(value.encode('utf-8')):02d}{value}" for tag, value in fields)
    prefix = f"{body}6304"
    crc = 0xFFFF
    for byte in prefix.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    encoded = f"{crc:04X}"
    return prefix + ("0000" if corrupt_crc else encoded)
