import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.api.routes import router
from app.core.config import Settings, get_settings
from app.core.errors import error_response, install_error_handlers
from app.db.session import build_engine


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()
    logging.basicConfig(level=config.log_level, format="%(levelname)s %(name)s %(message)s")

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        engine = build_engine(config)
        application.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
        try:
            yield
        finally:
            engine.dispose()

    application = FastAPI(
        title="SCAMGUARD MY API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if config.app_env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if config.app_env != "production" else None,
    )

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
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    install_error_handlers(application)
    application.include_router(router)
    return application


app = create_app()
