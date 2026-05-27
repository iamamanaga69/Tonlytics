import express from 'express';
import { dbService } from 'database';
import { logInfo, logError } from 'telemetry';
import { env } from 'config';

const app = express();
const port = env.PORT || 3005;

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
app.listen(port, () => {
  logInfo(`[API] Tonlytics REST Server successfully running on port ${port}`);
});
