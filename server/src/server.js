const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from .env.local in root directory
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config();

// Disable buffering so queries fail fast when DB is disconnected
mongoose.set('bufferCommands', false);

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const sessionRoutes = require('./routes/session');
const speechRoutes = require('./routes/speech');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => res.send('InterviewIQ API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/speech', speechRoutes);

// Keep event loop open even if MongoDB connection is omitted/disconnected
setInterval(() => {}, 1000 * 60 * 60);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/interviewiq';

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.warn('Local MongoDB unavailable:', err.message);
    console.log('Using robust in-memory store fallback for authentication and sessions.');
  });

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
