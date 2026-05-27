"""
Tonlytics Telegram Monitor — Message & Media Storage
Thread-safe local JSON storage for ingested Telegram messages and media files.
"""
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from .config import MESSAGES_FILE, MEDIA_DIR

_lock = asyncio.Lock()
log = logging.getLogger("storage")


class MessageStore:
    """Persistent JSON-backed message store with in-memory cache."""

    def __init__(self) -> None:
        self._messages: list[dict] = []
        self._loaded = False

    async def _load(self) -> None:
        """Load messages from disk on first access."""
        if self._loaded:
            return
        if MESSAGES_FILE.exists():
            try:
                raw = MESSAGES_FILE.read_text(encoding="utf-8")
                self._messages = json.loads(raw) if raw.strip() else []
            except (json.JSONDecodeError, OSError):
                self._messages = []
        self._loaded = True

    async def _save(self) -> None:
        """Persist current messages list to disk."""
        try:
            MESSAGES_FILE.write_text(
                json.dumps(self._messages, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )
        except OSError as e:
            log.warning(f"[STORAGE] Failed to persist messages: {e}")

    async def add_message(self, msg: dict) -> None:
        """Add a message to the store (deduplicates by message_id + channel)."""
        async with _lock:
            await self._load()

            # Deduplicate
            key = (msg.get("message_id"), msg.get("channel"))
            for existing in self._messages:
                if (existing.get("message_id"), existing.get("channel")) == key:
                    return  # Already stored

            self._messages.insert(0, msg)

            # Cap at 5000 messages to prevent unbounded growth
            if len(self._messages) > 5000:
                self._messages = self._messages[:5000]

            await self._save()

    async def get_latest(
        self,
        limit: int = 50,
        channel: Optional[str] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        """Get latest messages with optional filters."""
        async with _lock:
            await self._load()

        results = self._messages
        if channel:
            results = [m for m in results if m.get("channel", "").lower() == channel.lower()]
        if category:
            results = [m for m in results if m.get("category", "").lower() == category.lower()]
        return results[:limit]

    async def get_stats(self) -> dict:
        """Return storage statistics."""
        async with _lock:
            await self._load()

        channels: dict[str, int] = {}
        for m in self._messages:
            ch = m.get("channel", "unknown")
            channels[ch] = channels.get(ch, 0) + 1

        media_files = list(MEDIA_DIR.glob("*"))
        total_media_size = sum(f.stat().st_size for f in media_files if f.is_file())

        return {
            "total_messages": len(self._messages),
            "channels": channels,
            "media_files": len(media_files),
            "media_size_mb": round(total_media_size / (1024 * 1024), 2),
        }

    @property
    def count(self) -> int:
        return len(self._messages)


# Singleton
store = MessageStore()
