import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import plantRoutes from './routes/plantRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import ngoRoutes from './routes/ngoRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174']
      : ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Green Gamers API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/ngo', ngoRoutes);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  console.error('API Error:', err);
  return res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Green Gamers server running on http://localhost:${PORT}`);
});

export default app;
