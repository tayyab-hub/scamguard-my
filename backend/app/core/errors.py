import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

logger = logging.getLogger("scamguard.api")


class ApiError(Exception):
    def __init__(
        self, status_code: int, code: str, message: str, headers: dict[str, str] | None = None
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers


def safe_validation_field(error: dict) -> str:
    location = list(error["loc"])
    # Pydantic appends an unknown JSON key to extra-field errors. That key is
    # user-controlled and can itself contain private data, so report its trusted
    # parent location instead.
    if error.get("type") == "extra_forbidden" and location:
        location.pop()
    return ".".join(map(str, location))


def error_response(
    request: Request,
    status: int,
    code: str,
    message: str,
    details: list[dict[str, str]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id,
                "details": details or [],
            }
        },
        headers={**(headers or {}), "X-Request-ID": request_id},
    )


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        # Never log SQL, parameters or connection details.
        return error_response(
            request, 503, "DATABASE_UNAVAILABLE", "Submission storage is unavailable."
        )

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
        return error_response(request, exc.status_code, exc.code, exc.message, headers=exc.headers)

    @app.exception_handler(HTTPException)
    async def handle_http_error(request: Request, exc: HTTPException) -> JSONResponse:
        messages = {404: "Endpoint not found.", 405: "Method not allowed."}
        return error_response(
            request,
            exc.status_code,
            f"HTTP_{exc.status_code}",
            messages.get(exc.status_code, "The request could not be completed."),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Do not echo request values, Pydantic context, URLs or user-submitted content.
        details = [
            {"field": safe_validation_field(item), "message": "Invalid value."}
            for item in exc.errors()
        ]
        return error_response(
            request, 422, "VALIDATION_ERROR", "Check the request fields.", details
        )
