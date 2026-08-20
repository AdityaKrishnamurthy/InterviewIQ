const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const sessionRoutes = require('./routes/session');
const speechRoutes = require('./routes/speech');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('InterviewIQ API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/speech', speechRoutes);

module.exports = app;
