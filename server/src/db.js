const mongoose = require('mongoose');
const User = require('./models/User');
const Resume = require('./models/Resume');
const Session = require('./models/Session');
const fs = require('fs');
const path = require('path');

// In-memory data structures with automatic JSON file persistence fallback
const memoryUsers = new Map();
const memoryResumes = new Map();
const memorySessions = new Map();

const DB_FILE = path.join(__dirname, '../../.local_db.json');

const loadMemoryStore = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (Array.isArray(data.users)) {
        data.users.forEach((u) => {
          u.save = async function () {
            memoryUsers.set(this._id, this);
            saveMemoryStore();
            return this;
          };
          memoryUsers.set(u._id, u);
        });
      }
      if (Array.isArray(data.resumes)) {
        data.resumes.forEach((r) => {
          r.save = async function () {
            memoryResumes.set(this._id, this);
            saveMemoryStore();
            return this;
          };
          memoryResumes.set(r._id, r);
        });
      }
      if (Array.isArray(data.sessions)) {
        data.sessions.forEach((s) => {
          s.save = async function () {
            this.updatedAt = new Date();
            memorySessions.set(this._id, this);
            saveMemoryStore();
            return this;
          };
          memorySessions.set(s._id, s);
        });
      }
    }
  } catch (err) {
    console.warn('Could not load local_db.json:', err.message);
  }
};

const saveMemoryStore = () => {
  try {
    const data = {
      users: Array.from(memoryUsers.values()),
      resumes: Array.from(memoryResumes.values()),
      sessions: Array.from(memorySessions.values()),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save local_db.json:', err.message);
  }
};

loadMemoryStore();

const isDbConnected = () => mongoose.connection.readyState === 1;

// User Store Adapter
const userStore = {
  findByEmail: async (email) => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    if (isDbConnected()) {
      return await User.findOne({ email: cleanEmail });
    }
    for (const u of memoryUsers.values()) {
      if (u.email === cleanEmail) return u;
    }
    return null;
  },

  findById: async (id) => {
    if (!id) return null;
    if (isDbConnected()) {
      return await User.findById(id).select('-passwordHash');
    }
    const user = memoryUsers.get(id.toString());
    if (!user) return null;
    const { passwordHash, ...userWithoutPass } = user;
    return userWithoutPass;
  },

  create: async ({ name, email, passwordHash }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    if (isDbConnected()) {
      const u = new User({ name: cleanName, email: cleanEmail, passwordHash });
      await u.save();
      return u;
    }
    const id = new mongoose.Types.ObjectId().toString();
    const user = {
      _id: id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: new Date(),
      save: async function () {
        memoryUsers.set(this._id, this);
        saveMemoryStore();
        return this;
      },
    };
    memoryUsers.set(id, user);
    saveMemoryStore();
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
    if (!userId) return null;
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
      userId: userId.toString(),
      filename,
      rawText,
      parsedData,
      createdAt: new Date(),
      save: async function () {
        memoryResumes.set(this._id, this);
        saveMemoryStore();
        return this;
      },
    };
    memoryResumes.set(id, resume);
    saveMemoryStore();
    return resume;
  },
};

// Session Store Adapter
const sessionStore = {
  findByIdAndUserId: async (id, userId) => {
    if (!id || !userId) return null;
    if (isDbConnected()) {
      return await Session.findOne({ _id: id, userId });
    }
    const s = memorySessions.get(id.toString());
    if (s && s.userId.toString() === userId.toString()) {
      return s;
    }
    return null;
  },

  findByUserId: async (userId) => {
    if (!userId) return [];
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
      userId: userId.toString(),
      resumeId: resumeId ? resumeId.toString() : null,
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
        saveMemoryStore();
        return this;
      },
    };
    memorySessions.set(id, session);
    saveMemoryStore();
    return session;
  },

  deleteByIdAndUserId: async (id, userId) => {
    if (!id || !userId) return false;
    if (isDbConnected()) {
      const res = await Session.deleteOne({ _id: id, userId });
      return res.deletedCount > 0;
    }
    const s = memorySessions.get(id.toString());
    if (s && s.userId.toString() === userId.toString()) {
      memorySessions.delete(id.toString());
      saveMemoryStore();
      return true;
    }
    return false;
  },
};

module.exports = {
  isDbConnected,
  userStore,
  resumeStore,
  sessionStore,
};
