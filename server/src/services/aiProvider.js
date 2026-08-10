const Groq = require('groq-sdk');
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
  if (apiKey && apiKey !== 'your_key_here') {
    return new GoogleGenAI({ apiKey });
  }
  return null;
};

/**
 * Generate AI completion with primary Groq API (llama-3.3-70b-versatile) and fallback to Gemini / heuristic
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
        model: 'llama-3.3-70b-versatile',
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
        model: 'gemini-2.0-flash',
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

module.exports = {
  generateCompletion,
  getGroqClient,
};
