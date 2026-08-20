const express = require('express');
const router = express.Router();
const multer = require('multer');

const authMiddleware = require('../middleware/auth');
const { transcribeAudio } = require('../services/aiProvider');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — a spoken answer, not a file upload
});

// @route   POST /api/speech/transcribe
// @desc    Server-side transcription fallback for browsers where the native
//          Web Speech API is unsupported or blocked (e.g. Brave)
// @access  Private
router.post('/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No audio file provided' });
  }

  try {
    const transcript = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'answer.webm',
      req.file.mimetype || 'audio/webm'
    );
    res.json({ transcript });
  } catch (err) {
    if (err.message.includes('GROQ_API_KEY')) {
      return res.status(503).json({ message: 'Server-side transcription is not configured' });
    }
    console.error('Transcription error:', err.message);
    res.status(500).json({ message: 'Failed to transcribe audio' });
  }
});

module.exports = router;
