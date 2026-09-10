"""Password-reset mail delivery without exposing reset secrets to API responses or logs."""

import html
import json
from dataclasses import dataclass
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import Settings


class MailDeliveryError(RuntimeError):
    """Raised when a configured provider does not accept a message."""


class MailService(Protocol):
    def send_password_reset(self, recipient: str, reset_url: str) -> None: ...


@dataclass(frozen=True)
class CapturedPasswordReset:
    recipient: str
    reset_url: str


class DevelopmentMailService:
    """Process-local capture for automated tests and explicit local development only."""

    def __init__(self) -> None:
        self.outbox: list[CapturedPasswordReset] = []

    def send_password_reset(self, recipient: str, reset_url: str) -> None:
        self.outbox.append(CapturedPasswordReset(recipient=recipient, reset_url=reset_url))


class ResendMailService:
    endpoint = "https://api.resend.com/emails"

    def __init__(self, api_key: str, from_email: str) -> None:
        self.api_key = api_key
        self.from_email = from_email

    def send_password_reset(self, recipient: str, reset_url: str) -> None:
        safe_url = html.escape(reset_url, quote=True)
        body = json.dumps(
            {
                "from": self.from_email,
                "to": [recipient],
                "subject": "Reset your SCAMGUARD password",
                "text": (
                    "Use this one-time link to reset your SCAMGUARD password. "
                    f"The link expires soon: {reset_url}\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                "html": (
                    "<p>Use this one-time link to reset your SCAMGUARD password.</p>"
                    f'<p><a href="{safe_url}">Reset password</a></p>'
                    "<p>The link expires soon. If you did not request this, ignore this email.</p>"
                ),
            }
        ).encode()
        request = Request(
            self.endpoint,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "SCAMGUARD/0.1 password-reset",
            },
        )
        try:
            with urlopen(request, timeout=8) as response:
                if response.status < 200 or response.status >= 300:
                    raise MailDeliveryError("The email provider rejected the request.")
        except (HTTPError, URLError, TimeoutError) as exc:
            raise MailDeliveryError("Password-reset email delivery failed.") from exc


def build_mail_service(settings: Settings) -> MailService:
    if settings.mail_provider == "resend":
        api_key = settings.resend_api_key
        from_email = settings.resend_from_email
        if api_key is None or from_email is None:
            raise RuntimeError("Resend mail settings are incomplete.")
        return ResendMailService(api_key.get_secret_value(), from_email)
    return DevelopmentMailService()
