"""
Tonlytics Telegram Monitor — FastAPI Endpoint
Serves /api/telegram-news with latest ingested messages in JSON.
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional

from .storage import store
from .monitor import get_status
from .config import MEDIA_DIR

app = FastAPI(
    title="Tonlytics Telegram Monitor API",
    description="Real-time TON ecosystem intelligence from Telegram channels.",
    version="2.0.0",
)

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/telegram-news")
async def get_telegram_news(
    limit: int = Query(default=50, ge=1, le=200, description="Number of messages to return"),
    channel: Optional[str] = Query(default=None, description="Filter by channel username or title"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
):
    """
    GET /api/telegram-news
    Returns latest Telegram messages from dynamically monitored channels.
    """
    messages = await store.get_latest(limit=limit, channel=channel, category=category)

    return {
        "success": True,
        "count": len(messages),
        "messages": messages,
    }


@app.get("/api/telegram-news/stats")
async def get_stats():
    """Storage and monitoring statistics."""
    storage_stats = await store.get_stats()
    monitor_status = get_status()

    return {
        "success": True,
        "monitor": monitor_status,
        "storage": storage_stats,
    }


@app.get("/api/telegram-news/channels")
async def get_channels():
    """List all currently monitored channels (discovered dynamically from account)."""
    monitor_status = get_status()

    return {
        "success": True,
        "count": len(monitor_status["channels"]),
        "last_refresh": monitor_status["last_refresh"],
        "channels": monitor_status["channels"],
    }


@app.get("/api/telegram-news/media/{filename}")
async def get_media(filename: str):
    """Serve a downloaded media file."""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        return JSONResponse({"error": "Invalid filename"}, status_code=400)

    filepath = MEDIA_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        return JSONResponse({"error": "File not found"}, status_code=404)

    return FileResponse(str(filepath))


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    monitor_status = get_status()
    return {
        "status": "ok",
        "service": "telegram-monitor",
        "version": "2.0.0",
        "connected": monitor_status["connected"],
        "channels_monitored": monitor_status["monitored_channels"],
    }
