# Tonlytics Telegram Monitor

Real-time TON ecosystem intelligence from Telegram channels, powered by Telethon.

## Setup

```bash
cd apps/telegram-monitor

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Create a `.env` file (already created if you followed setup):

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

> ⚠️ Never commit `.env` to git. It is already in `.gitignore`.

## Running

```bash
python -m src.main
```

On first run, Telethon will ask for your **phone number** and **verification code** to authenticate with the Telegram API. A session file will be created so you don't need to re-authenticate.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/telegram-news` | GET | Latest messages (supports `?limit=`, `?channel=`, `?category=`) |
| `/api/telegram-news/stats` | GET | Storage and monitoring statistics |
| `/api/telegram-news/channels` | GET | List of monitored channels |
| `/api/telegram-news/media/{filename}` | GET | Serve downloaded media files |
| `/api/health` | GET | Health check |

### Example

```
GET http://localhost:3010/api/telegram-news?limit=10&category=DeFi
```

## Monitored Channels

| Channel | Category |
|---|---|
| @toncoin | Ecosystem |
| @tonblockchain | Ecosystem |
| @ton_society | Ecosystem |
| @tonkeeper | Infrastructure |
| @mytonwallet | Infrastructure |
| @staboratory (STON.fi) | DeFi |
| @dedaboratory (DeDust) | DeFi |
| @getgems_io | Mini Apps |
| @tondevnews | Infrastructure |
| @taboratory | Ecosystem |

## Folder Structure

```
telegram-monitor/
├── .env                    ← API credentials (gitignored)
├── requirements.txt
├── data/
│   ├── messages.json       ← Stored messages
│   └── media/              ← Downloaded images/videos
└── src/
    ├── __init__.py
    ├── config.py            ← dotenv loader
    ├── channels.py          ← Channel registry
    ├── storage.py           ← JSON message store
    ├── monitor.py           ← Telethon real-time client
    ├── api.py               ← FastAPI endpoints
    └── main.py              ← Entry point
```
