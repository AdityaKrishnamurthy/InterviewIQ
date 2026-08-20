const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jdRoutes = require('./routes/jd');
const sessionRoutes = require('./routes/session');
const speechRoutes = require('./routes/speech');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/speech', speechRoutes);

// Catch unhandled /api/* routes and always return JSON, never HTML
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Static assets from client build directory
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA catch-all fallback: Serve client index.html for direct navigation (e.g. /dashboard, /interview)
app.use((req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('InterviewIQ API is running');
    }
  });
});

module.exports = app;
