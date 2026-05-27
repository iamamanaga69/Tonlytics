"""
Tonlytics Telegram Monitor — Supabase Bridge
Reads collected messages from the monitor and pushes them to the
Next.js /api/ingest endpoint, which inserts them into Supabase.

Usage:
    python -m src.bridge
"""
import json
import time
import asyncio
import logging
import sys
from pathlib import Path

try:
    import aiohttp
except ImportError:
    print("aiohttp required: pip install aiohttp")
    sys.exit(1)

from .config import MESSAGES_FILE

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(stream=open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False))
    ],
)
log = logging.getLogger("bridge")

# Configuration
INGEST_URL = "http://localhost:3000/api/ingest"
CRON_SECRET = "dev_secret_token"
BRIDGE_INTERVAL = 60  # seconds between sync cycles
SENT_TRACKER = Path(__file__).resolve().parent.parent / "data" / "sent_ids.json"


def load_sent_ids() -> set:
    """Load already-sent message IDs to avoid duplicates."""
    if SENT_TRACKER.exists():
        try:
            data = json.loads(SENT_TRACKER.read_text(encoding="utf-8"))
            return set(data)
        except Exception:
            return set()
    return set()


def save_sent_ids(ids: set) -> None:
    """Persist sent message IDs."""
    try:
        SENT_TRACKER.write_text(
            json.dumps(list(ids)[-5000:], default=str),  # Cap at 5000
            encoding="utf-8",
        )
    except Exception as e:
        log.warning(f"Failed to save sent IDs: {e}")


async def sync_to_supabase() -> int:
    """Read messages.json and POST unsent messages to the ingest endpoint."""
    if not MESSAGES_FILE.exists():
        log.info("No messages.json found — waiting for monitor to collect data.")
        return 0

    try:
        raw = MESSAGES_FILE.read_text(encoding="utf-8")
        all_messages = json.loads(raw) if raw.strip() else []
    except (json.JSONDecodeError, OSError) as e:
        log.warning(f"Failed to read messages.json: {e}")
        return 0

    sent_ids = load_sent_ids()

    # Filter unsent messages
    unsent = []
    for msg in all_messages:
        msg_key = f"{msg.get('channel', '')}_{msg.get('message_id', '')}"
        if msg_key not in sent_ids and msg.get("text", "").strip():
            unsent.append(msg)

    if not unsent:
        log.info(f"All {len(all_messages)} messages already synced. Nothing to push.")
        return 0

    log.info(f"Found {len(unsent)} new messages to push to Supabase.")

    # POST to ingest endpoint in batches of 20
    total_inserted = 0
    batch_size = 20

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(unsent), batch_size):
            batch = unsent[i:i + batch_size]

            try:
                async with session.post(
                    INGEST_URL,
                    json={"messages": batch},
                    headers={
                        "Authorization": f"Bearer {CRON_SECRET}",
                        "Content-Type": "application/json",
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    result = await resp.json()

                    if resp.status == 200 and result.get("success"):
                        inserted = result.get("inserted", 0)
                        skipped = result.get("skipped", 0)
                        total_inserted += inserted
                        log.info(f"Batch {i // batch_size + 1}: inserted={inserted}, skipped={skipped}")

                        # Mark these as sent
                        for msg in batch:
                            msg_key = f"{msg.get('channel', '')}_{msg.get('message_id', '')}"
                            sent_ids.add(msg_key)
                    else:
                        log.error(f"Ingest API error: {resp.status} - {result}")

            except aiohttp.ClientError as e:
                log.error(f"HTTP error posting to ingest API: {e}")
            except Exception as e:
                log.error(f"Unexpected error: {e}")

    save_sent_ids(sent_ids)
    log.info(f"Sync complete: {total_inserted} new briefings inserted into Supabase.")
    return total_inserted


async def main():
    """Run the bridge continuously."""
    log.info("=" * 50)
    log.info("  TONLYTICS TELEGRAM -> SUPABASE BRIDGE")
    log.info(f"  Ingest URL: {INGEST_URL}")
    log.info(f"  Interval: {BRIDGE_INTERVAL}s")
    log.info("=" * 50)

    while True:
        try:
            await sync_to_supabase()
        except Exception as e:
            log.error(f"Bridge cycle failed: {e}")

        await asyncio.sleep(BRIDGE_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Bridge stopped.")
