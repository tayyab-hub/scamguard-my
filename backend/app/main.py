# SCAMGUARD API assembly. create_app connects validated settings, middleware, routers and shared
# intelligence engines. Its lifespan owns the database connection pool; migrations are run
# separately, never by creating tables at startup.

import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.api.analyses import router as analyses_router
from app.api.auth import router as auth_router
from app.api.routes import router
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import Settings, get_settings
from app.core.errors import error_response, install_error_handlers
from app.db.session import build_engine
from app.ml.engine import build_message_engine
from app.phone_intelligence.engine import build_phone_engine
from app.qr_intelligence.engine import build_qr_engine
from app.services.mail import build_mail_service
from app.url_intelligence.engine import build_url_engine


# Build and return an independent FastAPI application. Tests can supply Settings explicitly;
# normal startup uses cached environment settings. The returned app is configured here and its
# resources are opened by lifespan.
def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()
    logging.basicConfig(level=config.log_level, format="%(levelname)s %(name)s %(message)s")

    # Create shared engines once for this app, then yield while requests are served. A session
    # factory creates separate database units of work per request. finally releases pooled
    # connections even after startup or shutdown failures.
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        engine = build_engine(config)
        try:
            application.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
            application.state.message_engine = build_message_engine(config)
            application.state.url_engine = build_url_engine(config)
            application.state.phone_engine = build_phone_engine()
            application.state.qr_engine = build_qr_engine(
                config,
                application.state.message_engine,
                application.state.url_engine,
                application.state.phone_engine,
            )
            application.state.mail_service = build_mail_service(config)
            yield
        finally:
            engine.dispose()

    application = FastAPI(
        title="SCAMGUARD API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if config.app_env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if config.app_env != "production" else None,
    )
    application.state.settings = config
    application.add_middleware(
        BodyLimitMiddleware,
        max_bytes=config.max_request_bytes,
        path_limits={
            "/api/v1/analyses/qr": config.qr_max_upload_bytes + 65_536,
        },
    )

    # Wrap each HTTP request with a fresh correlation ID and privacy-oriented response headers.
    # Unexpected failures become a generic JSON error; only exception type and request ID are
    # logged.
    @application.middleware("http")
    async def request_context(request: Request, call_next):
        request.state.request_id = str(uuid4())
        try:
            response = await call_next(request)
        except Exception as exc:
            # Avoid logging submitted content, connection strings or exception messages.
            logging.getLogger("scamguard.api").error(
                "request_id=%s unhandled_exception=%s",
                request.state.request_id,
                type(exc).__name__,
            )
            response = error_response(
                request, 500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again."
            )
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    # Outer CORS layer also decorates errors returned by request_context.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Accept", "Content-Type", "X-CSRF-Token"],
        expose_headers=["X-Request-ID"],
    )
    install_error_handlers(application)
    application.include_router(router)
    application.include_router(auth_router)
    application.include_router(analyses_router)
    return application


app = create_app()
