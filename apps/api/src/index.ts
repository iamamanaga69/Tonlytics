import express from 'express';
import cors from 'cors';
import { dbService, isSupabaseConfigured, supabase, runDbMigrations } from 'database';
import { logInfo, logError } from 'telemetry';
import { env } from 'config';
import { getRedisConnection } from 'queues';

const app = express();
const port = env.PORT || 3005;

// CORS: Allow Vercel frontend, local dev, and configurable origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://tonlytics.vercel.app',
];

// Add custom FRONTEND_URL if configured on Railway
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  logInfo(`[API] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// REST ROUTES
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Retrieves approved briefings
app.get('/api/briefings', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    
    const data = await dbService.getBriefings({
      category: category as any,
      search
    });

    res.json({ success: true, data });
  } catch (error) {
    logError('[API] Failed to retrieve briefings:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Retrieves active crawler sources
app.get('/api/sources', async (req, res) => {
  try {
    const data = await dbService.getSources();
    res.json({ success: true, data });
  } catch (error) {
    logError('[API] Failed to retrieve sources:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start API Server
app.listen(port, async () => {
  // Run automated database migrations on startup if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      await runDbMigrations();
    } catch (migErr) {
      logError('[STARTUP] Failed to run database migrations:', migErr);
    }
  }

  logInfo('==================================================');
  logInfo(`[STARTUP] Service: api`);
  logInfo(`[STARTUP] Port: ${port}`);
  logInfo(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`[STARTUP] Database Configured: ${!!process.env.DATABASE_URL}`);
  logInfo(`[STARTUP] Supabase Configured: ${isSupabaseConfigured}`);

  // 1. Supabase Check
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('briefings').select('id').limit(1);
      if (error) throw error;
      logInfo('[STARTUP] Supabase Connection: SUCCESSFUL');
    } catch (err) {
      logError('[STARTUP] Supabase Connection: FAILED', err);
    }
  } else {
    logInfo('[STARTUP] Supabase Connection: SKIPPED (Not configured)');
  }

  // 2. Queue Status Check
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    logInfo(`[STARTUP] Redis Connection (Queues): SUCCESSFUL (${pong})`);
  } catch (err) {
    logError('[STARTUP] Redis Connection (Queues): FAILED', err);
  }

  logInfo('==================================================');
  logInfo(`[API] Tonlytics REST Server successfully running on port ${port}`);
});
