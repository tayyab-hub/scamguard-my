# QR package marker. Decoding and payload classification are local/deterministic; routed
# assessments reuse other engines. In particular, the shared Message engine may use its optional
# external reviewer when configured, so the legacy package docstring is not an unconditional
# offline guarantee.

"""Local, deterministic QR decoding and payload assessment."""
