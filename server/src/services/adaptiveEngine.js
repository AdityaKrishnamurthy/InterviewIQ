const { GoogleGenAI } = require('@google/genai');

const PERSONAS = {
  Google: {
    name: 'Google Technical Interviewer',
    description: 'Algorithms-heavy, focuses on data structures, algorithmic complexity (Big-O), system trade-offs, and edge cases.',
    style: 'Analytical, inquisitive about time/space complexity, asks deep questions about optimization.',
  },
  Amazon: {
    name: 'Amazon Leadership & System Design Interviewer',
    description: 'Focuses on Leadership Principles (Customer Obsession, Ownership, Deep Dive) using STAR method and scalable architecture.',
    style: 'Structured, demands concrete examples of past technical decisions and failure recovery.',
  },
  Startup: {
    name: 'High-Growth Startup Tech Lead',
    description: 'Projects-heavy, focuses on rapid delivery, architecture choices, real-world trade-offs, and tech stack mastery.',
    style: 'Pragmatic, fast-paced, asks deep questions on candidate resume projects and production bugs.',
  },
  General: {
    name: 'Senior Full-Stack Engineer',
    description: 'Balanced technical interview covering CS fundamentals, coding, system design, and resume projects.',
    style: 'Encouraging, clear, structured technical evaluation.',
  },
};

const getApiKey = () => process.env.GEMINI_API_KEY || '';

/**
 * Calculates next difficulty level based on candidate score (1-5)
 */
const calculateNextDifficulty = (currentDifficulty, score) => {
  if (score >= 4) {
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
    return 'hard';
  } else if (score <= 2) {
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
    return 'easy';
  }
  return currentDifficulty; // score === 3 stays same
};

/**
 * Generates initial greeting and first interview question tailored to persona & resume
 */
const generateInitialQuestion = async ({ persona, targetRole, resumeData }) => {
  const personaInfo = PERSONAS[persona] || PERSONAS.General;
  const apiKey = getApiKey();

  const skillsText = resumeData?.skills?.join(', ') || 'General Software Engineering';
  const projectsText = resumeData?.projects?.map((p) => `${p.name}: ${p.description}`).join('; ') || 'No projects listed';

  const prompt = `You are a ${personaInfo.name} interviewing a candidate for a ${targetRole} position.
Style: ${personaInfo.style}

Candidate Skills: ${skillsText}
Candidate Resume Projects: ${projectsText}

Generate the opening turn of the technical interview.
Provide a friendly 1-sentence welcome, followed by your FIRST technical interview question (Difficulty: Medium).
If candidate has projects listed, touch upon their most relevant project or core skill.

Return ONLY a JSON object:
{
  "greeting": "Welcome to the InterviewIQ session for ${targetRole}.",
  "question": "Your first question here",
  "topic": "Topic Name (e.g. React Virtual DOM or Array Optimization)"
}`;

  if (apiKey && apiKey !== 'your_key_here') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response.text ? response.text.trim() : '';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      const parsed = JSON.parse(text);
      return {
        content: `${parsed.greeting}\n\n${parsed.question}`,
        topic: parsed.topic || 'General Tech',
      };
    } catch (err) {
      console.warn('Gemini initial question warning:', err.message);
    }
  }

  // Fallback initial question
  const firstProject = resumeData?.projects?.[0]?.name || 'your latest technical project';
  return {
    content: `Welcome to your ${targetRole} technical interview with the ${personaInfo.name} persona!\n\nTo kick off, tell me about the architecture of ${firstProject}. What key technical trade-offs did you make during implementation?`,
    topic: firstProject,
  };
};

/**
 * Evaluates candidate answer and generates adaptive follow-up question
 */
const evaluateAndGenerateFollowup = async ({
  persona,
  targetRole,
  resumeData,
  currentDifficulty,
  previousQuestion,
  candidateAnswer,
  sessionHistory,
}) => {
  const personaInfo = PERSONAS[persona] || PERSONAS.General;
  const apiKey = getApiKey();

  const prompt = `You are a ${personaInfo.name} interviewing a candidate for a ${targetRole} role.
Current Question Difficulty: ${currentDifficulty}

Previous Interviewer Question:
"${previousQuestion}"

Candidate Answer:
"${candidateAnswer}"

Candidate Resume Context:
Skills: ${resumeData?.skills?.join(', ') || 'N/A'}
Projects: ${resumeData?.projects?.map((p) => p.name).join(', ') || 'N/A'}

Tasks:
1. Score the candidate's answer from 1 to 5 (1 = poor/incorrect, 3 = average/partial, 5 = exceptional/thorough).
2. Provide a 2-sentence feedback evaluation explaining strengths or gaps.
3. Based on the score, generate the NEXT follow-up question:
   - If score >= 4: Increase challenge/difficulty.
   - If score <= 2: Simplify or pivot to core fundamentals.
   - If score == 3: Explore deeper or move to a lateral topic.

Return ONLY raw JSON with NO markdown wrappers:
{
  "score": 4,
  "evaluation": "Strong explanation of asynchronous handling, but missed error boundary cases.",
  "nextQuestion": "Follow-up question string here...",
  "topic": "Topic Name"
}`;

  if (apiKey && apiKey !== 'your_key_here') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response.text ? response.text.trim() : '';
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const parsed = JSON.parse(text);
      const score = Math.max(1, Math.min(5, Number(parsed.score) || 3));
      const nextDifficulty = calculateNextDifficulty(currentDifficulty, score);

      return {
        score,
        evaluation: parsed.evaluation || 'Answer processed successfully.',
        nextQuestion: parsed.nextQuestion || 'Can you walk me through how you would optimize this solution further?',
        nextDifficulty,
        topic: parsed.topic || 'System Optimization',
      };
    } catch (err) {
      console.warn('Gemini evaluation warning:', err.message);
    }
  }

  // Fallback evaluation if API key unavailable
  const wordCount = candidateAnswer.split(/\s+/).length;
  let score = 3;
  if (wordCount > 30) score = 4;
  if (wordCount < 10) score = 2;

  const nextDifficulty = calculateNextDifficulty(currentDifficulty, score);
  const feedback =
    score >= 4
      ? 'Good depth and clarity in your technical explanation.'
      : 'Answer was brief; consider expanding on underlying trade-offs and edge cases.';

  const followupQuestions = {
    hard: 'How would you scale this design to handle 100x traffic while maintaining sub-50ms latency?',
    medium: 'What potential failure modes or memory leaks could occur with this implementation, and how would you prevent them?',
    easy: 'Could you explain the core fundamentals and time complexity of your approach?',
  };

  return {
    score,
    evaluation: feedback,
    nextQuestion: followupQuestions[nextDifficulty],
    nextDifficulty,
    topic: 'Technical Deep-Dive',
  };
};

module.exports = {
  PERSONAS,
  calculateNextDifficulty,
  generateInitialQuestion,
  evaluateAndGenerateFollowup,
};
