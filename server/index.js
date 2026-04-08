import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import customersRoutes from './routes/customers.js';
import combosRoutes from './routes/combos.js';
import authRoutes from './routes/auth.js';
import shiftsRoutes from './routes/shifts.js';
import tablesRoutes from './routes/tables.js';
import settingsRoutes from './routes/settings.js';
import inventoryRoutes from './routes/inventory.js';
import modifiersRoutes from './routes/modifiers.js';
import categoriesRoutes from './routes/categories.js';
import uploadRoutes from './routes/upload.js';
import reportsRoutes from './routes/reports.js';
import schedulesRoutes from './routes/schedules.js';
import { verifyToken } from './routes/auth.js'; // Import the protection middleware!
import { startScheduler } from './services/scheduler.js' 
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Required for Cloudflare/Render to handle headers correctly
app.set('trust proxy', 1);

const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
// Simplified port resolution: Render always provides PORT
const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0'; 

// Middleware
app.use(cors({
  origin: true, 
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session middleware
app.use(session({
  name: 'pos_session',
  secret: process.env.SESSION_SECRET || 'restaurant-pos-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isRender, // Use secure cookies in production (Render)
    httpOnly: true,
    sameSite: isRender ? 'none' : 'lax', // Needed for cross-domain cookies if applicable
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// Health check endpoint (Check this first)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: isRender ? 'production' : 'development'
  });
});

// Serve built frontend (if present) for root and non-API routes
const distCandidates = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../dist')
];
let staticPath = null;
for (const p of distCandidates) {
  if (fs.existsSync(p)) {
    staticPath = p;
    break;
  }
}

if (staticPath) {
  app.use(express.static(staticPath));
  console.log('Serving static assets from', staticPath);
} else {
  console.warn('Static assets not found. Root will return 200 health status.');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings/public', settingsRoutes);

// ... rest of the app.use calls ...
app.use('/api/products', verifyToken, productsRoutes);
app.use('/api/combos', verifyToken, combosRoutes);
app.use('/api/categories', verifyToken, categoriesRoutes);
app.use('/api/tables', verifyToken, tablesRoutes);
app.use('/api/orders', verifyToken, ordersRoutes);
app.use('/api/shifts', verifyToken, shiftsRoutes);
app.use('/api/settings', verifyToken, settingsRoutes);
app.use('/api/customers', (req, res, next) => {
  const optionalTokenRoutes = ['/api/customers/login', '/api/customers/register'];
  if (optionalTokenRoutes.includes(req.originalUrl)) return next();
  return verifyToken(req, res, next);
}, customersRoutes);
app.use('/api/inventory', verifyToken, inventoryRoutes);
app.use('/api/modifiers', verifyToken, modifiersRoutes);
app.use('/api/upload', verifyToken, uploadRoutes);
app.use('/api/reports', verifyToken, reportsRoutes);
app.use('/api/schedules', verifyToken, schedulesRoutes);

// Catch-all for React routing or basic status
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (staticPath && fs.existsSync(path.join(staticPath, 'index.html'))) {
    return res.sendFile(path.join(staticPath, 'index.html'));
  }
  res.status(200).send('POS Server Active (Static frontend not found)');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server live at http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${isRender ? 'RENDER' : 'LOCAL'}`);
  console.log(`🛠  Port: ${PORT} (from env: ${process.env.PORT || 'default'})`);
  
  try {
    startScheduler();
  } catch (err) {
    console.error('[Scheduler] Startup failed:', err?.message || err);
  }
});

