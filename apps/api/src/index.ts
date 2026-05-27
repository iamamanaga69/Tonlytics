import express from 'express';
import cors from 'cors';
import { dbService, isSupabaseConfigured, supabase } from 'database';
import { logInfo, logError } from 'telemetry';
import { env } from 'config';
import { getRedisConnection } from 'queues';

const app = express();
const port = env.PORT || 3005;

app.use(cors());
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
