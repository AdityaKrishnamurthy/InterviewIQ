const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: {
    type: String,
    enum: ['interviewer', 'candidate', 'system'],
    required: true,
  },
  content: { type: String, required: true },
  score: { type: Number, default: null },
  evaluation: { type: String, default: '' },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
  },
  companyPersona: {
    type: String,
    enum: ['Google', 'Amazon', 'Startup', 'General'],
    default: 'General',
  },
  targetRole: {
    type: String,
    default: 'Software Engineer',
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
  currentDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  messages: [MessageSchema],
  topicHistory: [{ type: String }],
  overallScore: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
