const express = require('express');
const path = require('path');
const cors = require('cors');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/tasks', taskRoutes);

// Serve React frontend static build
const clientBuildPath = path.join(__dirname, '..', 'public');
app.use(express.static(clientBuildPath));

// SPA fallback — all non-API routes return index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TaskFlow server running on port ${PORT}`);
  });
}

module.exports = app;
