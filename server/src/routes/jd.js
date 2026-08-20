const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('../middleware/auth');
const { jdStore } = require('../db');
const { parseJobDescriptionText } = require('../services/gemini');

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
    cb(null, `jd-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// @route   POST /api/jd/upload
// @desc    Upload Job Description via PDF or Text, parse with AI, save extracted requirements
// @access  Private
router.post(
  '/upload',
  authMiddleware,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      return next();
    }
    upload.single('jd')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      let extractedText = '';
      let originalFilename = '';

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
            console.warn('JD PDF parsing fallback:', pdfErr.message);
            extractedText = fileBuffer.toString('utf-8');
          }
        } finally {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch (e) {
            /* ignore unlink error */
          }
        }
      } else if (req.body && (req.body.text || req.body.rawText)) {
        extractedText = req.body.text || req.body.rawText;
        originalFilename = req.body.title ? `${req.body.title} (Text)` : 'job_description.txt';
      } else {
        return res.status(400).json({ message: 'Please upload a PDF file or provide Job Description text' });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ message: 'Could not extract text from Job Description input' });
      }

      const targetRole = (req.body?.title || req.body?.targetRole || '').trim();

      // Call AI parser with target role focus if specified
      const parsedData = await parseJobDescriptionText(extractedText, targetRole);

      // Save JD
      const jd = await jdStore.create({
        userId: req.user.id,
        title: parsedData.roleTitle || targetRole || 'Target Role',
        filename: originalFilename,
        rawText: extractedText.slice(0, 5000),
        parsedData,
      });

      res.status(201).json({
        message: 'Job Description uploaded and parsed successfully',
        jd: {
          id: jd._id.toString(),
          title: jd.title,
          filename: jd.filename,
          parsedData: jd.parsedData,
          createdAt: jd.createdAt,
        },
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      }
      console.error('JD upload error:', err.message);
      res.status(500).json({ message: err.message || 'Server error during Job Description processing' });
    }
  }
);

// @route   GET /api/jd/latest
// @desc    Get the latest uploaded Job Description for logged-in user
// @access  Private
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const jd = await jdStore.findLatestByUserId(req.user.id);

    if (!jd) {
      return res.status(404).json({ message: 'No Job Description found for user' });
    }

    res.json({
      jd: {
        id: jd._id.toString(),
        title: jd.title,
        filename: jd.filename,
        parsedData: jd.parsedData,
        createdAt: jd.createdAt,
      },
    });
  } catch (err) {
    console.error('Fetch JD error:', err.message);
    res.status(500).json({ message: 'Server error fetching Job Description' });
  }
});

// @route   DELETE /api/jd/latest
// @desc    Delete the current user's latest Job Description
// @access  Private
router.delete('/latest', authMiddleware, async (req, res) => {
  try {
    const deleted = await jdStore.deleteLatestByUserId(req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'No Job Description found to remove' });
    }
    res.json({ success: true, message: 'Job Description removed successfully' });
  } catch (err) {
    console.error('Delete JD error:', err.message);
    res.status(500).json({ message: 'Server error removing Job Description' });
  }
});

module.exports = router;
