const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
require('dotenv').config();

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('gsk_') ? process.env.GEMINI_API_KEY : null);
  if (apiKey && apiKey !== 'your_groq_key_here') {
    return new Groq({ apiKey });
  }
  return null;
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_key_here' && !apiKey.startsWith('gsk_')) {
    return new GoogleGenAI({ apiKey });
  }
  return null;
};

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

/**
 * Generate AI completion with primary Groq API and fallback to Gemini / heuristic
 */
const generateCompletion = async ({ systemPrompt = '', userPrompt = '', jsonMode = false }) => {
  const groq = getGroqClient();

  if (groq) {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userPrompt });

      const options = {
        messages,
        model: GROQ_MODEL,
        temperature: 0.2,
      };

      if (jsonMode) {
        options.response_format = { type: 'json_object' };
      }

      const response = await groq.chat.completions.create(options);
      const text = response.choices[0]?.message?.content?.trim() || '';

      if (jsonMode) {
        let cleanText = text;
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        return JSON.parse(cleanText);
      }

      return text;
    } catch (err) {
      console.warn('Groq API completion warning:', err.message);
    }
  }

  // Fallback to Gemini if Groq fails or key unavailable
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}${userPrompt}`;
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: fullPrompt,
      });

      let text = response.text ? response.text.trim() : '';
      if (jsonMode) {
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        return JSON.parse(text);
      }
      return text;
    } catch (err) {
      console.warn('Gemini fallback completion warning:', err.message);
    }
  }

  throw new Error('No active AI provider available');
};

/**
 * Transcribe a recorded audio buffer via Groq's hosted Whisper endpoint.
 * Used as the cross-browser voice-input fallback when the browser's native
 * Web Speech API is unsupported or blocked (e.g. Brave routes it through a
 * Google backend it doesn't wire up, so recognition never starts there).
 */
const transcribeAudio = async (buffer, filename, mimetype) => {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Server-side transcription is unavailable: no GROQ_API_KEY configured');
  }

  const file = await toFile(buffer, filename, { type: mimetype });
  const response = await groq.audio.transcriptions.create({
    file,
    model: GROQ_WHISPER_MODEL,
    language: 'en',
    response_format: 'json',
  });

  return response.text?.trim() || '';
};

module.exports = {
  generateCompletion,
  getGroqClient,
  transcribeAudio,
};
