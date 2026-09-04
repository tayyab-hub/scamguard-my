import asyncio
import json

from app.core.body_limit import BodyLimitMiddleware


def test_chunked_body_is_bounded_without_content_length():
    async def scenario():
        invoked = False
        messages = iter(
            [
                {"type": "http.request", "body": b"a" * 40000, "more_body": True},
                {"type": "http.request", "body": b"b" * 40000, "more_body": False},
            ]
        )
        output = []

        async def app(scope, receive, send):
            nonlocal invoked
            invoked = True

        async def receive():
            return next(messages)

        async def send(message):
            output.append(message)

        await BodyLimitMiddleware(app, 65536)(
            {
                "type": "http",
                "method": "POST",
                "path": "/api/v1/analyses",
                "headers": [],
                "state": {"request_id": "test-request"},
            },
            receive,
            send,
        )
        assert not invoked
        assert output[0]["status"] == 413
        assert json.loads(output[1]["body"])["error"]["request_id"] == "test-request"

    asyncio.run(scenario())
