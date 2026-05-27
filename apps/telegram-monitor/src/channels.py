"""
Tonlytics Telegram Monitor — Dynamic Channel Discovery
Discovers channels dynamically from the authenticated user's actual Telegram account.
No hardcoded channel lists — only monitors channels the user is currently joined to.
"""
import logging
from typing import Optional

from telethon import TelegramClient
from telethon.tl.types import Channel, Chat

log = logging.getLogger("monitor")

# TON-related keywords for auto-detection
TON_KEYWORDS = [
    "ton", "toncoin", "telegram", "wallet", "jetton", "nft",
    "defi", "dex", "ston", "dedust", "getgems", "tonkeeper",
    "mini app", "miniapp", "tact", "func", "blockchain", "web3",
    "ton connect", "ton space", "mytonwallet", "fragment", "usdt",
    "stablecoin", "validator", "staking", "tvm", "wallet v5",
]

# Category classification based on channel name/description
CATEGORY_HINTS = {
    "wallet": "Infrastructure",
    "tonkeeper": "Infrastructure",
    "mytonwallet": "Infrastructure",
    "dev": "Infrastructure",
    "sdk": "Infrastructure",
    "ston": "DeFi",
    "dedust": "DeFi",
    "swap": "DeFi",
    "dex": "DeFi",
    "defi": "DeFi",
    "nft": "Mini Apps",
    "getgems": "Mini Apps",
    "game": "Mini Apps",
    "app": "Mini Apps",
    "bot": "Mini Apps",
}


def is_ton_relevant_text(text: str, channel_title: str = "", username: str = "") -> bool:
    """Return True when a message or its channel context is relevant to TON."""
    combined = f"{text} {channel_title} {username}".lower()
    return any(keyword in combined for keyword in TON_KEYWORDS)


def classify_text_category(text: str, channel_title: str = "", username: str = "") -> str:
    """Classify a message using both the post text and channel context."""
    combined = f"{text} {channel_title} {username}".lower()
    for keyword, category in CATEGORY_HINTS.items():
        if keyword in combined:
            return category
    if "usdt" in combined or "stablecoin" in combined or "liquidity" in combined:
        return "DeFi"
    if "telegram" in combined or "fragment" in combined:
        return "Integration"
    return "Ecosystem"


def _classify_category(title: str, username: str) -> str:
    """Auto-classify channel category based on name."""
    combined = f"{title} {username}".lower()
    for keyword, category in CATEGORY_HINTS.items():
        if keyword in combined:
            return category
    return "Ecosystem"


async def discover_joined_channels(client: TelegramClient) -> list[dict]:
    """
    Discover ALL channels/supergroups the user is currently joined to.
    Fetches fresh dialog list directly from Telegram — no caching.
    Returns list of channel info dicts.
    """
    channels = []

    log.info("[DISCOVERY] Fetching live dialog list from Telegram account...")

    async for dialog in client.iter_dialogs():
        entity = dialog.entity

        # Only include channels and supergroups (not private chats, groups, bots)
        if not isinstance(entity, Channel):
            continue

        # Skip if it's a private/personal group (not a broadcast channel or supergroup)
        if not entity.broadcast and not entity.megagroup:
            continue

        username = entity.username or ""
        title = entity.title or ""
        category = _classify_category(title, username)

        channels.append({
            "id": entity.id,
            "username": username,
            "title": title,
            "category": category,
            "broadcast": entity.broadcast,
            "megagroup": entity.megagroup,
            "participants_count": getattr(entity, "participants_count", None),
            "entity": entity,  # Keep reference for Telethon event registration
        })

    log.info(f"[DISCOVERY] Found {len(channels)} channels/supergroups in account.")
    return channels


async def refresh_channels(client: TelegramClient, previous_ids: set[int]) -> tuple[list[dict], set[int], set[int]]:
    """
    Refresh channel list and detect changes.
    Returns: (current_channels, newly_joined_ids, left_ids)
    """
    current = await discover_joined_channels(client)
    current_ids = {ch["id"] for ch in current}

    newly_joined = current_ids - previous_ids
    left = previous_ids - current_ids

    if newly_joined:
        new_names = [ch["title"] for ch in current if ch["id"] in newly_joined]
        log.info(f"[DISCOVERY] Newly joined channels: {new_names}")

    if left:
        log.info(f"[DISCOVERY] Left channels (removed): {left}")

    return current, newly_joined, left
