const mongoose = require('mongoose');
const User = require('./models/User');
const Resume = require('./models/Resume');
const Session = require('./models/Session');
const crypto = require('crypto');

// In-memory data structures for fallback when MongoDB is not connected
const memoryUsers = new Map();
const memoryResumes = new Map();
const memorySessions = new Map();

const isDbConnected = () => mongoose.connection.readyState === 1;

// User Store Adapter
const userStore = {
  findByEmail: async (email) => {
    const cleanEmail = email.toLowerCase();
    if (isDbConnected()) {
      return await User.findOne({ email: cleanEmail });
    }
    for (const u of memoryUsers.values()) {
      if (u.email === cleanEmail) return u;
    }
    return null;
  },

  findById: async (id) => {
    if (isDbConnected()) {
      return await User.findById(id).select('-passwordHash');
    }
    const user = memoryUsers.get(id);
    if (!user) return null;
    const { passwordHash, ...userWithoutPass } = user;
    return userWithoutPass;
  },

  create: async ({ name, email, passwordHash }) => {
    const cleanEmail = email.toLowerCase();
    if (isDbConnected()) {
      const u = new User({ name, email: cleanEmail, passwordHash });
      await u.save();
      return u;
    }
    const id = new mongoose.Types.ObjectId().toString();
    const user = {
      _id: id,
      name,
      email: cleanEmail,
      passwordHash,
      createdAt: new Date(),
      save: async function () {
        memoryUsers.set(this._id, this);
        return this;
      },
    };
    memoryUsers.set(id, user);
    return user;
  },
};

// Resume Store Adapter
const resumeStore = {
  findById: async (id) => {
    if (!id) return null;
    if (isDbConnected()) {
      return await Resume.findById(id);
    }
    return memoryResumes.get(id.toString()) || null;
  },

  findLatestByUserId: async (userId) => {
    if (isDbConnected()) {
      return await Resume.findOne({ userId }).sort({ createdAt: -1 });
    }
    const userResumes = Array.from(memoryResumes.values())
      .filter((r) => r.userId.toString() === userId.toString())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return userResumes[0] || null;
  },

  create: async ({ userId, filename, rawText, parsedData }) => {
    if (isDbConnected()) {
      const r = new Resume({ userId, filename, rawText, parsedData });
      await r.save();
      return r;
    }
    const id = new mongoose.Types.ObjectId().toString();
    const resume = {
      _id: id,
      userId,
      filename,
      rawText,
      parsedData,
      createdAt: new Date(),
      save: async function () {
        memoryResumes.set(this._id, this);
        return this;
      },
    };
    memoryResumes.set(id, resume);
    return resume;
  },
};

// Session Store Adapter
const sessionStore = {
  findByIdAndUserId: async (id, userId) => {
    if (isDbConnected()) {
      return await Session.findOne({ _id: id, userId });
    }
    const s = memorySessions.get(id);
    if (s && s.userId.toString() === userId.toString()) {
      return s;
    }
    return null;
  },

  findByUserId: async (userId) => {
    if (isDbConnected()) {
      return await Session.find({ userId }).sort({ updatedAt: -1 });
    }
    return Array.from(memorySessions.values())
      .filter((s) => s.userId.toString() === userId.toString())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  create: async ({ userId, resumeId, companyPersona, targetRole, currentDifficulty, messages, topicHistory }) => {
    if (isDbConnected()) {
      const s = new Session({
        userId,
        resumeId,
        companyPersona,
        targetRole,
        currentDifficulty,
        messages,
        topicHistory,
      });
      await s.save();
      return s;
    }
    const id = new mongoose.Types.ObjectId().toString();
    const session = {
      _id: id,
      userId,
      resumeId,
      companyPersona,
      targetRole,
      status: 'active',
      currentDifficulty: currentDifficulty || 'medium',
      messages: messages || [],
      topicHistory: topicHistory || [],
      weakPoints: [],
      skillConfidence: [],
      overallScore: 0,
      reportData: { strengths: [], weaknesses: [], roadmap: [], summary: '' },
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        this.updatedAt = new Date();
        memorySessions.set(this._id, this);
        return this;
      },
    };
    memorySessions.set(id, session);
    return session;
  },
};

module.exports = {
  isDbConnected,
  userStore,
  resumeStore,
  sessionStore,
};
