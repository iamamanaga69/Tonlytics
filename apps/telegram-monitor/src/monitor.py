"""
Tonlytics Telegram Monitor — Telethon Real-Time Client
Connects to Telegram, dynamically discovers joined channels,
fetches messages + media, and auto-refreshes the channel list.
Auto-reconnects on disconnection.
"""
import asyncio
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Optional

from telethon import TelegramClient, events
from telethon.tl.types import (
    MessageMediaPhoto,
    MessageMediaDocument,
    DocumentAttributeVideo,
    DocumentAttributeFilename,
)

from .config import get_telegram_config, MEDIA_DIR, SESSION_FILE, MESSAGES_FILE
from .channels import discover_joined_channels, refresh_channels, is_ton_relevant_text, classify_text_category
from .storage import store

# === Logging (safe for Windows) ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(stream=open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False))
    ],
)
log = logging.getLogger("monitor")

# Suppress noisy Telethon file download logs
logging.getLogger("telethon.client.downloads").setLevel(logging.WARNING)

# === Constants ===
CHANNEL_REFRESH_INTERVAL = 300  # Refresh channel list every 5 minutes
HISTORY_FETCH_LIMIT = 15       # Messages per channel on initial fetch

# === State ===
_client: Optional[TelegramClient] = None
_is_running = False
_monitored_channels: list[dict] = []
_monitored_ids: set[int] = set()
_connection_status = "disconnected"
_last_refresh = ""


def get_status() -> dict:
    """Return current monitor status for the API."""
    return {
        "connected": _is_running,
        "status": _connection_status,
        "monitored_channels": len(_monitored_channels),
        "last_refresh": _last_refresh,
        "channels": [
            {
                "id": ch["id"],
                "username": ch["username"],
                "title": ch["title"],
                "category": ch["category"],
                "type": "broadcast" if ch["broadcast"] else "supergroup",
            }
            for ch in _monitored_channels
        ],
    }


def _safe_text(text: str, max_len: int = 80) -> str:
    """Sanitize text for safe console output on Windows."""
    if not text:
        return ""
    safe = text.replace("\n", " ").replace("\r", " ")
    try:
        return safe.encode("ascii", errors="replace").decode("ascii")[:max_len]
    except Exception:
        return safe[:max_len]


async def _download_media(message, channel_name: str) -> Optional[dict]:
    """Download photo or video from a message. Returns media metadata or None."""
    global _client
    if not _client or not message.media:
        return None

    media_info: Optional[dict] = None

    try:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        msg_id = message.id
        safe_name = channel_name.replace(" ", "_")[:20]

        if isinstance(message.media, MessageMediaPhoto):
            filename = f"{safe_name}_{msg_id}_{timestamp}.jpg"
            filepath = MEDIA_DIR / filename
            await _client.download_media(message, file=str(filepath))
            if filepath.exists():
                media_info = {
                    "type": "photo",
                    "filename": filename,
                    "path": f"/api/telegram-news/media/{filename}",
                    "size_bytes": filepath.stat().st_size,
                }

        elif isinstance(message.media, MessageMediaDocument):
            doc = message.media.document
            if doc is None:
                return None

            is_video = any(
                isinstance(attr, DocumentAttributeVideo) for attr in (doc.attributes or [])
            )
            mime = doc.mime_type or ""

            if is_video or mime.startswith("video/"):
                ext = ".mp4" if "mp4" in mime else ".mkv"
                filename = f"{safe_name}_{msg_id}_{timestamp}{ext}"

                # Skip videos larger than 50MB
                if doc.size and doc.size > 50 * 1024 * 1024:
                    return {
                        "type": "video",
                        "filename": filename,
                        "skipped": True,
                        "reason": "exceeds_50mb",
                        "size_bytes": doc.size,
                    }

                filepath = MEDIA_DIR / filename
                await _client.download_media(message, file=str(filepath))
                if filepath.exists():
                    media_info = {
                        "type": "video",
                        "filename": filename,
                        "path": f"/api/telegram-news/media/{filename}",
                        "size_bytes": filepath.stat().st_size,
                    }

            elif mime.startswith("image/"):
                ext = ".jpg" if "jpeg" in mime else (".png" if "png" in mime else ".webp")
                filename = f"{safe_name}_{msg_id}_{timestamp}{ext}"
                filepath = MEDIA_DIR / filename
                await _client.download_media(message, file=str(filepath))
                if filepath.exists():
                    media_info = {
                        "type": "image",
                        "filename": filename,
                        "path": f"/api/telegram-news/media/{filename}",
                        "size_bytes": filepath.stat().st_size,
                    }

    except Exception as e:
        log.warning(f"Media download error: {e}")

    return media_info


async def _process_message(event_or_message, is_history: bool = False) -> None:
    """Process a single Telegram message into storage."""
    try:
        # NewMessage events wrap the message; iter_messages yields Message directly
        if isinstance(event_or_message, events.NewMessage.Event):
            message = event_or_message.message
        else:
            message = event_or_message

        # Extract text safely (Telethon uses .text or .message attribute)
        text = getattr(message, "text", None) or getattr(message, "message", None)
        if not text or not isinstance(text, str):
            return

        # Get channel info
        chat = await message.get_chat()
        channel_title = getattr(chat, "title", None) or str(chat.id)
        channel_username = getattr(chat, "username", None) or ""
        channel_id = getattr(chat, "id", 0)

        if not is_ton_relevant_text(text, channel_title, channel_username):
            return

        # Look up category from our monitored list
        category = classify_text_category(text, channel_title, channel_username)
        for ch in _monitored_channels:
            if ch["id"] == channel_id:
                if category == "Ecosystem":
                    category = ch["category"]
                break

        # Download media if present
        media = await _download_media(message, channel_title)

        source_url = (
            f"https://t.me/{channel_username}/{message.id}"
            if channel_username
            else f"https://t.me/c/{str(channel_id).replace('-100', '')}/{message.id}"
        )

        msg_data = {
            "message_id": message.id,
            "channel_id": channel_id,
            "channel": channel_username or channel_title,
            "channel_name": channel_title,
            "source_url": source_url,
            "category": category,
            "text": text[:2000],
            "date": message.date.isoformat() if message.date else datetime.now(timezone.utc).isoformat(),
            "has_media": media is not None,
            "media": media,
            "views": getattr(message, "views", None),
            "forwards": getattr(message, "forwards", None),
            "reply_to": message.reply_to_msg_id if message.reply_to else None,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

        await store.add_message(msg_data)

        label = "HISTORY" if is_history else "LIVE"
        media_tag = f" | media:{media['type']}" if media else ""
        log.info(f"[{label}] #{channel_title}: {_safe_text(text)}{media_tag}")

    except Exception as e:
        log.error(f"Error processing message: {e}")


async def _fetch_history(client: TelegramClient, channel: dict, limit: int = HISTORY_FETCH_LIMIT) -> int:
    """Fetch recent message history from a channel."""
    count = 0
    try:
        entity = channel["entity"]
        async for message in client.iter_messages(entity, limit=limit):
            text = getattr(message, "text", None) or getattr(message, "message", None)
            if text and isinstance(text, str):
                await _process_message(message, is_history=True)
                count += 1
    except Exception as e:
        log.warning(f"Failed to fetch history for #{channel['title']}: {e}")
    return count


async def _periodic_refresh(client: TelegramClient) -> None:
    """Background task: periodically refresh the monitored channel list."""
    global _monitored_channels, _monitored_ids, _last_refresh

    while _is_running:
        await asyncio.sleep(CHANNEL_REFRESH_INTERVAL)

        if not _is_running:
            break

        try:
            log.info("[REFRESH] Refreshing channel list from Telegram account...")
            channels, new_ids, left_ids = await refresh_channels(client, _monitored_ids)

            if new_ids or left_ids:
                _monitored_channels = channels
                _monitored_ids = {ch["id"] for ch in channels}
                _last_refresh = datetime.now(timezone.utc).isoformat()

                # Fetch history for newly joined channels
                for ch in channels:
                    if ch["id"] in new_ids:
                        log.info(f"[REFRESH] Fetching history for newly joined: #{ch['title']}")
                        await _fetch_history(client, ch, limit=10)
                        await asyncio.sleep(1)

                # Re-register event handler with updated channel list
                client.remove_event_handler(on_new_message)
                entities = [ch["entity"] for ch in channels]
                client.add_event_handler(on_new_message, events.NewMessage(chats=entities))

                log.info(f"[REFRESH] Channel list updated: {len(channels)} active channels.")
            else:
                log.info(f"[REFRESH] No changes detected. Still monitoring {len(_monitored_channels)} channels.")

        except Exception as e:
            log.error(f"[REFRESH] Channel refresh failed: {e}")


async def on_new_message(event):
    """Global event handler for new messages."""
    await _process_message(event)


async def _clear_stale_data() -> None:
    """Clear old stored messages and rebuild fresh."""
    try:
        if MESSAGES_FILE.exists():
            MESSAGES_FILE.unlink()
            log.info("[CLEANUP] Cleared stale messages.json")
        # Reset in-memory store
        store._messages = []
        store._loaded = True
    except Exception as e:
        log.warning(f"[CLEANUP] Failed to clear stale data: {e}")


async def start_monitor() -> None:
    """
    Start the Telegram monitoring client.
    Dynamically discovers joined channels, fetches history,
    then listens for new messages in real-time.
    Refreshes channel list every 5 minutes.
    Auto-reconnects on disconnection.
    """
    global _client, _is_running, _monitored_channels, _monitored_ids, _connection_status, _last_refresh

    config = get_telegram_config()
    _connection_status = "connecting"

    log.info("Initializing Telethon client...")
    _client = TelegramClient(
        str(SESSION_FILE),
        config["api_id"],
        config["api_hash"],
        connection_retries=10,
        retry_delay=5,
        auto_reconnect=True,
    )

    while True:
        try:
            await _client.connect()

            if not await _client.is_user_authorized():
                log.info("First-time login required. Enter phone number and verification code.")
                await _client.start()

            me = await _client.get_me()
            log.info(f"Logged in as: {me.first_name} (id={me.id})")

            # Clear stale data from previous sessions
            await _clear_stale_data()

            # === DYNAMIC CHANNEL DISCOVERY ===
            log.info("Discovering joined channels from Telegram account...")
            _monitored_channels = await discover_joined_channels(_client)
            _monitored_ids = {ch["id"] for ch in _monitored_channels}
            _last_refresh = datetime.now(timezone.utc).isoformat()

            if not _monitored_channels:
                log.warning("No channels found in account. Join some channels and restart.")
                _connection_status = "no_channels"
                await asyncio.sleep(30)
                continue

            # Log discovered channels
            log.info(f"--- MONITORED CHANNELS ({len(_monitored_channels)}) ---")
            for ch in _monitored_channels:
                ch_type = "broadcast" if ch["broadcast"] else "supergroup"
                username_tag = f"@{ch['username']}" if ch['username'] else f"id:{ch['id']}"
                log.info(f"  [{ch['category']}] {ch['title']} ({username_tag}) [{ch_type}]")
            log.info(f"--- END CHANNEL LIST ---")

            # Fetch recent history for all channels
            log.info(f"Fetching recent history from {len(_monitored_channels)} channels...")
            total_history = 0
            for ch in _monitored_channels:
                fetched = await _fetch_history(_client, ch, limit=HISTORY_FETCH_LIMIT)
                total_history += fetched
                await asyncio.sleep(1)  # Rate limit between channels

            log.info(f"History loaded: {total_history} messages from {len(_monitored_channels)} channels.")

            # Register real-time event handler for all discovered channels
            entities = [ch["entity"] for ch in _monitored_channels]
            _client.add_event_handler(on_new_message, events.NewMessage(chats=entities))

            _is_running = True
            _connection_status = "connected"
            log.info(f"[LIVE] Monitoring {len(_monitored_channels)} channels. Refreshing every {CHANNEL_REFRESH_INTERVAL}s.")

            # Start periodic channel refresh in background
            refresh_task = asyncio.create_task(_periodic_refresh(_client))

            # Run until disconnected
            await _client.run_until_disconnected()

            # Cancel refresh task on disconnect
            refresh_task.cancel()

        except ConnectionError as e:
            _connection_status = "reconnecting"
            log.warning(f"Connection lost: {e}. Reconnecting in 10s...")
            await asyncio.sleep(10)

        except Exception as e:
            _connection_status = "error"
            log.error(f"Unexpected error: {e}")
            traceback.print_exc()
            log.info("Restarting in 15s...")
            await asyncio.sleep(15)

        finally:
            _is_running = False


async def stop_monitor() -> None:
    """Gracefully stop the monitor."""
    global _client, _is_running, _connection_status
    if _client:
        await _client.disconnect()
    _is_running = False
    _connection_status = "disconnected"
    log.info("Monitor stopped.")
