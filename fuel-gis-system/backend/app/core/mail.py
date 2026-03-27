import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_email_code(to_email: str, code: str, purpose: str = "register") -> None:
    subject_map = {
        "register": "Подтверждение регистрации",
        "login": "Код подтверждения входа",
        "reset_password": "Сброс пароля",
    }

    subject = subject_map.get(purpose, "Код подтверждения")
    body = f"""
Здравствуйте!

Ваш код подтверждения: {code}

Если это были не вы, просто проигнорируйте это письмо.

С уважением,
Fuel GIS System
""".strip()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)