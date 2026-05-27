"""
Tonlytics Telegram Monitor — Main Entry Point
Runs the Telethon channel monitor and FastAPI server concurrently.

Usage:
    python -m src.main
"""
import asyncio
import signal
import sys
import threading
import uvicorn

from .monitor import start_monitor, stop_monitor
from .config import get_telegram_config


API_HOST = "0.0.0.0"
API_PORT = 3010


def run_api_server() -> None:
    """Run the FastAPI server in a background thread."""
    config = uvicorn.Config(
        "src.api:app",
        host=API_HOST,
        port=API_PORT,
        log_level="info",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


async def main() -> None:
    """Entry point: starts API server + Telegram monitor."""

    # Validate config before starting
    cfg = get_telegram_config()
    print("=" * 60)
    print("  TONLYTICS TELEGRAM MONITOR")
    print("  TON Ecosystem Intelligence Engine")
    print("=" * 60)
    print(f"  API ID  : {cfg['api_id']}")
    print(f"  API Hash: {'*' * 28}{cfg['api_hash'][-4:]}")
    print(f"  API URL : http://localhost:{API_PORT}/api/telegram-news")
    print("=" * 60)
    print()

    # Start FastAPI in a background thread
    api_thread = threading.Thread(target=run_api_server, daemon=True)
    api_thread.start()
    print(f"[MAIN] FastAPI server started on http://localhost:{API_PORT}")

    # Start Telegram monitor (blocks until stopped)
    try:
        await start_monitor()
    except KeyboardInterrupt:
        print("\n[MAIN] Shutting down...")
        await stop_monitor()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[MAIN] Goodbye.")
        sys.exit(0)
