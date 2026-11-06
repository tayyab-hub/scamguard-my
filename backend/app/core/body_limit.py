# ASGI middleware that bounds actual HTTP body bytes before FastAPI parses JSON or multipart
# data. A narrow QR route allowance accommodates image uploads. Counting received chunks also
# covers requests without an honest Content-Length.

from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.errors import error_response


# Wrap the next ASGI application with a default byte cap and optional exact-path caps; non-HTTP
# scopes pass through.
class BodyLimitMiddleware:
    """Bound buffered request bytes, including bodies without Content-Length."""

    # Store the wrapped application and configured limits. path_limits only changes explicitly
    # listed request paths.
    def __init__(self, app: ASGIApp, max_bytes: int, path_limits: dict[str, int] | None = None):
        self.app = app
        self.max_bytes = max_bytes
        self.path_limits = path_limits or {}

    # Receive bounded chunks until complete, disconnect or overflow. Send 413 on overflow;
    # otherwise replay one assembled request body to the next application.
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        max_bytes = self.path_limits.get(scope.get("path", ""), self.max_bytes)
        # Bound allocation by bytes, even when a sender streams many tiny chunks.
        body = bytearray()
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > max_bytes:
                response = error_response(
                    Request(scope), 413, "REQUEST_TOO_LARGE", "The request is too large."
                )
                await response(scope, receive, send)
                return
            body.extend(message.get("body", b""))
            if not message.get("more_body", False):
                break
        delivered = False

        # Deliver buffered bytes exactly once, then delegate later receive calls. Without replay
        # the downstream parser would see a body that this middleware had already consumed.
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
