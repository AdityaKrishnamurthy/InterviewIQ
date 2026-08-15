const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');

const authMiddleware = require('../middleware/auth');
const { sessionStore, resumeStore } = require('../db');
const {
  PERSONAS,
  generateInitialQuestion,
  evaluateAndGenerateFollowup,
} = require('../services/adaptiveEngine');
const { generateTruthfulnessAndReport } = require('../services/report');

// @route   GET /api/session/personas
// @desc    Get list of available company personas
// @access  Public / Private
router.get('/personas', (req, res) => {
  res.json({ personas: PERSONAS });
});

// @route   POST /api/session/start
// @desc    Start a new adaptive interview session
// @access  Private
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { companyPersona = 'General', targetRole = 'Software Engineer', resumeId } = req.body;

    let resumeObj = null;
    if (resumeId) {
      resumeObj = await resumeStore.findById(resumeId);
    }
    if (!resumeObj) {
      resumeObj = await resumeStore.findLatestByUserId(req.user.id);
    }

    const resumeData = resumeObj ? resumeObj.parsedData : null;

    // Generate initial greeting & first question
    const initial = await generateInitialQuestion({
      persona: companyPersona,
      targetRole,
      resumeData,
    });

    const initialMessage = {
      id: crypto.randomUUID(),
      role: 'interviewer',
      content: initial.content,
      difficulty: 'medium',
      timestamp: new Date(),
    };

    const session = await sessionStore.create({
      userId: req.user.id,
      resumeId: resumeObj ? resumeObj._id : null,
      companyPersona,
      targetRole,
      currentDifficulty: 'medium',
      messages: [initialMessage],
      topicHistory: [initial.topic],
    });

    res.status(201).json({
      message: 'Interview session started',
      session,
    });
  } catch (err) {
    console.error('Start session error:', err.message);
    res.status(500).json({ message: 'Server error starting interview session' });
  }
});

// @route   POST /api/session/answer
// @desc    Submit an answer to the current question & get adaptive follow-up
// @access  Private
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer || !answer.trim()) {
      return res.status(400).json({ message: 'Please provide sessionId and answer text' });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }

    const session = await sessionStore.findByIdAndUserId(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session is already completed' });
    }

    // Get last interviewer question
    const interviewerMessages = session.messages.filter((m) => m.role === 'interviewer');
    const lastInterviewerMsg = interviewerMessages[interviewerMessages.length - 1];
    const previousQuestion = lastInterviewerMsg ? lastInterviewerMsg.content : 'Tell me about your technical background.';

    // Fetch resume context if available
    let resumeData = null;
    if (session.resumeId) {
      const resumeObj = await resumeStore.findById(session.resumeId);
      if (resumeObj) resumeData = resumeObj.parsedData;
    }

    // Evaluate answer with Groq AI + Interview Memory
    const evaluationResult = await evaluateAndGenerateFollowup({
      persona: session.companyPersona,
      targetRole: session.targetRole,
      resumeData,
      currentDifficulty: session.currentDifficulty,
      previousQuestion,
      candidateAnswer: answer,
      sessionHistory: session.messages,
    });

    // 1. Record candidate message with score & evaluation
    const candidateMsg = {
      id: crypto.randomUUID(),
      role: 'candidate',
      content: answer,
      score: evaluationResult.score,
      evaluation: evaluationResult.evaluation,
      difficulty: session.currentDifficulty,
      timestamp: new Date(),
    };
    session.messages.push(candidateMsg);

    // Track weak points for interview memory (score <= 2)
    if (evaluationResult.score <= 2 && evaluationResult.topic) {
      if (!session.weakPoints.includes(evaluationResult.topic)) {
        session.weakPoints.push(evaluationResult.topic);
      }
    }

    // 2. Record next interviewer question with updated difficulty
    session.currentDifficulty = evaluationResult.nextDifficulty;
    if (evaluationResult.topic && !session.topicHistory.includes(evaluationResult.topic)) {
      session.topicHistory.push(evaluationResult.topic);
    }

    const nextInterviewerMsg = {
      id: crypto.randomUUID(),
      role: 'interviewer',
      content: evaluationResult.nextQuestion,
      difficulty: evaluationResult.nextDifficulty,
      timestamp: new Date(),
    };
    session.messages.push(nextInterviewerMsg);

    // Compute overall score average
    const candidateScores = session.messages
      .filter((m) => m.role === 'candidate' && typeof m.score === 'number')
      .map((m) => m.score);

    if (candidateScores.length > 0) {
      const avg = candidateScores.reduce((a, b) => a + b, 0) / candidateScores.length;
      session.overallScore = Math.round(avg * 10) / 10;
    }

    session.updatedAt = new Date();
    await session.save();

    res.json({
      message: 'Answer processed',
      session,
      evaluation: {
        score: evaluationResult.score,
        feedback: evaluationResult.evaluation,
        newDifficulty: evaluationResult.nextDifficulty,
      },
    });
  } catch (err) {
    console.error('Answer session error:', err.message);
    res.status(500).json({ message: 'Server error processing answer' });
  }
});

// @route   POST /api/session/:id/complete
// @desc    Complete interview session & generate Truthfulness Rating and Report
// @access  Private
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await sessionStore.findByIdAndUserId(req.params.id, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    let resumeData = null;
    if (session.resumeId) {
      const resumeObj = await resumeStore.findById(session.resumeId);
      if (resumeObj) resumeData = resumeObj.parsedData;
    }

    // Run Truthfulness Checker & Report Generator
    const reportResults = await generateTruthfulnessAndReport({
      resumeData,
      sessionMessages: session.messages,
      targetRole: session.targetRole,
      persona: session.companyPersona,
    });

    session.status = 'completed';
    session.skillConfidence = reportResults.skillConfidence;
    session.reportData = {
      strengths: reportResults.strengths,
      weaknesses: reportResults.weaknesses,
      roadmap: reportResults.roadmap,
      summary: reportResults.summary,
    };
    session.updatedAt = new Date();

    await session.save();

    res.json({
      message: 'Session completed and report generated',
      session,
      report: reportResults,
    });
  } catch (err) {
    console.error('Complete session error:', err.message);
    res.status(500).json({ message: 'Server error generating final report' });
  }
});

// @route   GET /api/session/:id/report
// @desc    Get complete report details for a session
// @access  Private
router.get('/:id/report', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await sessionStore.findByIdAndUserId(req.params.id, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'completed' || !session.reportData?.summary) {
      // Auto-generate if not yet completed
      let resumeData = null;
      if (session.resumeId) {
        const resumeObj = await resumeStore.findById(session.resumeId);
        if (resumeObj) resumeData = resumeObj.parsedData;
      }

      const reportResults = await generateTruthfulnessAndReport({
        resumeData,
        sessionMessages: session.messages,
        targetRole: session.targetRole,
        persona: session.companyPersona,
      });

      session.status = 'completed';
      session.skillConfidence = reportResults.skillConfidence;
      session.reportData = {
        strengths: reportResults.strengths,
        weaknesses: reportResults.weaknesses,
        roadmap: reportResults.roadmap,
        summary: reportResults.summary,
      };
      await session.save();
    }

    res.json({
      session,
      report: {
        overallScore: session.overallScore ? Math.round((session.overallScore / 5) * 100) : 80,
        summary: session.reportData.summary,
        skillConfidence: session.skillConfidence,
        strengths: session.reportData.strengths,
        weaknesses: session.reportData.weaknesses,
        roadmap: session.reportData.roadmap,
      },
    });
  } catch (err) {
    console.error('Fetch report error:', err.message);
    res.status(500).json({ message: 'Server error fetching report' });
  }
});

// @route   GET /api/session/history
// @desc    Get complete session history and stats
// @access  Private
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const sessions = await sessionStore.findByUserId(req.user.id);
    
    let totalSessions = sessions.length;
    let completedSessions = 0;
    let totalScore = 0;
    let bestScore = 0;
    let scoreTimeline = [];
    let personaStats = {};

    const formattedSessions = sessions.map(session => {
      const qCount = session.messages.filter(m => m.role === 'candidate').length;
      
      if (session.status === 'completed') {
        completedSessions++;
        if (session.overallScore) {
          totalScore += session.overallScore;
          if (session.overallScore > bestScore) bestScore = session.overallScore;
          
          scoreTimeline.push({
            date: session.createdAt,
            score: session.overallScore,
            persona: session.companyPersona
          });
          
          if (!personaStats[session.companyPersona]) {
            personaStats[session.companyPersona] = { count: 0, totalScore: 0 };
          }
          personaStats[session.companyPersona].count++;
          personaStats[session.companyPersona].totalScore += session.overallScore;
        }
      }

      return {
        _id: session._id,
        companyPersona: session.companyPersona,
        targetRole: session.targetRole,
        status: session.status,
        overallScore: session.overallScore,
        currentDifficulty: session.currentDifficulty,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        questionCount: qCount
      };
    });

    const averageScore = completedSessions > 0 ? Number((totalScore / completedSessions).toFixed(1)) : 0;
    const personaBreakdown = {};
    for (const p in personaStats) {
      personaBreakdown[p] = {
        count: personaStats[p].count,
        averageScore: Number((personaStats[p].totalScore / personaStats[p].count).toFixed(1))
      };
    }

    const stats = {
      totalSessions,
      completedSessions,
      averageScore,
      bestScore,
      scoreTimeline,
      personaBreakdown
    };

    res.json({ sessions: formattedSessions, stats });
  } catch (err) {
    console.error('Fetch session history error:', err.message);
    res.status(500).json({ message: 'Server error fetching session history' });
  }
});

// @route   GET /api/session/:id
// @desc    Get session details by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    const session = await sessionStore.findByIdAndUserId(req.params.id, req.user.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json({ session });
  } catch (err) {
    console.error('Fetch session error:', err.message);
    res.status(500).json({ message: 'Server error fetching session' });
  }
});

// @route   GET /api/session
// @desc    List all sessions for user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sessions = await sessionStore.findByUserId(req.user.id);
    res.json({ sessions });
  } catch (err) {
    console.error('Fetch sessions error:', err.message);
    res.status(500).json({ message: 'Server error fetching user sessions' });
  }
});

module.exports = router;
