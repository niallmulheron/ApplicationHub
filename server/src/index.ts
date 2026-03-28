import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { applicationRoutes } from './routes/applications.js';
import { authRoutes } from './routes/auth.js';
import { companyRoutes } from './routes/companies.js';
import { contactRoutes } from './routes/contacts.js';
import { profileRoutes } from './routes/profile.js';
import { analyticsRoutes } from './routes/analytics.js';
import { aiRoutes } from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --------------- Middleware ---------------

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// --------------- Routes ---------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// --------------- Error handling ---------------

app.use(errorHandler);

// --------------- Start ---------------

app.listen(PORT, () => {
  console.log(`\n  🚀 Server running on http://localhost:${PORT}`);
  console.log(`  📋 Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
