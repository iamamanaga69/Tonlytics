"""
Tonlytics Telegram Monitor — Configuration
Loads environment variables securely via dotenv. Never hardcode credentials.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the telegram-monitor root directory
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def get_telegram_config() -> dict:
    """Validated Telegram API configuration from environment."""
    api_id = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")

    if not api_id or not api_hash:
        raise EnvironmentError(
            "[CONFIG] Missing TELEGRAM_API_ID or TELEGRAM_API_HASH.\n"
            "Set them in apps/telegram-monitor/.env"
        )

    return {
        "api_id": int(api_id),
        "api_hash": api_hash,
    }


# === Paths ===
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
MESSAGES_FILE = DATA_DIR / "messages.json"
SESSION_FILE = BASE_DIR / "tonlytics_monitor"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
