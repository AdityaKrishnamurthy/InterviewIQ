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

const SkillConfidenceSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  score: { type: Number, required: true }, // 1 to 5
  status: { type: String, enum: ['strong', 'moderate', 'weak'], required: true },
  evidence: { type: String, default: '' },
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
  weakPoints: [{ type: String }],
  skillConfidence: [SkillConfidenceSchema],
  overallScore: { type: Number, default: 0 },
  reportData: {
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    roadmap: [{ title: String, description: String, priority: String }],
    summary: { type: String, default: '' },
  },
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
