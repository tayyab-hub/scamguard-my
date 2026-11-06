# Development/module entry point for python -m app. Uvicorn imports app.main:app and serves it
# on the configured port; production binding differs from loopback development. This entry point
# does not apply database migrations.

import uvicorn

from app.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0" if settings.app_env == "production" else "127.0.0.1",
        port=settings.port,
    )
