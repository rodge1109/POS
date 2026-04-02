import express from 'express';
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
import { verifyToken } from './routes/auth.js'; // Import the protection middleware!
import { startScheduler } from './services/scheduler.js' 
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow localhost on any port for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all origins in development
  },
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  name: 'pos_session',
  secret: process.env.SESSION_SECRET || 'restaurant-pos-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
}));

// Serve built frontend (if present) for root and non-API routes
// Check common locations: project root `dist` and relative `../dist`
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
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
  console.log('Serving static assets from', staticPath);
} else {
  console.warn('Static assets not found in any of:', distCandidates.join(', '));
}

// Routes
app.use('/api/auth', authRoutes);

// Protected Routes (Required company_id in token)
app.use('/api/products', verifyToken, productsRoutes);
app.use('/api/orders', verifyToken, ordersRoutes);
app.use('/api/customers', verifyToken, customersRoutes);
app.use('/api/combos', verifyToken, combosRoutes);
app.use('/api/shifts', verifyToken, shiftsRoutes);
app.use('/api/tables', verifyToken, tablesRoutes);
app.use('/api/settings', verifyToken, settingsRoutes);
app.use('/api/inventory', verifyToken, inventoryRoutes);
app.use('/api/modifiers', verifyToken, modifiersRoutes);
app.use('/api/categories', verifyToken, categoriesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  startScheduler();
});
