const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('../middleware/auth');
const { resumeStore } = require('../db');
const { parseResumeText } = require('../services/gemini');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// @route   POST /api/resume/upload
// @desc    Upload PDF resume, parse with Gemini AI, save extracted skills/projects
// @access  Private
router.post(
  '/upload',
  authMiddleware,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      return next();
    }
    upload.single('resume')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
  try {
    console.log('POST /api/resume/upload req.body:', req.body, 'req.file:', req.file ? req.file.originalname : null);
    let extractedText = '';
    let originalFilename = 'resume.pdf';

    if (req.file) {
      originalFilename = req.file.originalname;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        // fileFilter above only checks the client-supplied mimetype/extension,
        // which is trivially spoofable — verify the actual file content too.
        if (fileBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
          return res.status(400).json({ message: 'Uploaded file is not a valid PDF' });
        }
        try {
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || '';
        } catch (pdfErr) {
          console.warn('PDF parsing fallback:', pdfErr.message);
          extractedText = fileBuffer.toString('utf-8');
        }
      } finally {
        // Clean up temp file from uploads directory after reading
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (e) {
          /* ignore unlink error */
        }
      }
    } else if (req.body && (req.body.text || req.body.rawText)) {
      // Fallback text input if raw text sent directly
      extractedText = req.body.text || req.body.rawText;
      originalFilename = req.body.filename || 'text_resume.txt';
    } else {
      return res.status(400).json({ message: 'Please upload a PDF file or provide resume text' });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ message: 'Could not extract text from uploaded PDF' });
    }

    // Call Groq / Gemini AI parser
    const parsedData = await parseResumeText(extractedText);

    // Save resume
    const resume = await resumeStore.create({
      userId: req.user.id,
      filename: originalFilename,
      rawText: extractedText.slice(0, 5000),
      parsedData,
    });

    res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resume: {
        id: resume._id.toString(),
        filename: resume.filename,
        parsedData: resume.parsedData,
        createdAt: resume.createdAt,
      },
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    console.error('Resume upload error:', err.message);
    res.status(500).json({ message: err.message || 'Server error during resume processing' });
  }
});

// @route   GET /api/resume/latest
// @desc    Get the latest uploaded resume for logged-in user
// @access  Private
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const resume = await resumeStore.findLatestByUserId(req.user.id);

    if (!resume) {
      return res.status(404).json({ message: 'No resume found for user' });
    }

    res.json({
      resume: {
        id: resume._id.toString(),
        filename: resume.filename,
        parsedData: resume.parsedData,
        createdAt: resume.createdAt,
      },
    });
  } catch (err) {
    console.error('Fetch resume error:', err.message);
    res.status(500).json({ message: 'Server error fetching resume' });
  }
});

// @route   DELETE /api/resume/latest
// @desc    Delete the current user's latest resume
// @access  Private
router.delete('/latest', authMiddleware, async (req, res) => {
  try {
    const deleted = await resumeStore.deleteLatestByUserId(req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'No resume found to remove' });
    }
    res.json({ success: true, message: 'Resume removed successfully' });
  } catch (err) {
    console.error('Delete resume error:', err.message);
    res.status(500).json({ message: 'Server error removing resume' });
  }
});

// @route   DELETE /api/resume/:id
// @desc    Delete a specific resume by ID
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await resumeStore.deleteByIdAndUserId(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.json({ success: true, message: 'Resume removed successfully' });
  } catch (err) {
    console.error('Delete resume error:', err.message);
    res.status(500).json({ message: 'Server error removing resume' });
  }
});

module.exports = router;
