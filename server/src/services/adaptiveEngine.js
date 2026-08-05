const { generateCompletion } = require('./aiProvider');

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
 * Generates initial greeting and first interview question tailored to persona & resume deep-dive
 */
const generateInitialQuestion = async ({ persona, targetRole, resumeData }) => {
  const personaInfo = PERSONAS[persona] || PERSONAS.General;

  const skillsText = resumeData?.skills?.join(', ') || 'General Software Engineering';
  const projectsText = resumeData?.projects?.map((p) => `Project "${p.name}": ${p.description} (Tech: ${p.techStack?.join(', ') || 'N/A'})`).join('\n') || 'No projects listed';

  const systemPrompt = `You are a ${personaInfo.name} interviewing a candidate for a ${targetRole} position.
Style: ${personaInfo.style}

Candidate Resume Profile:
- Demonstrated Skills: ${skillsText}
- Resume Projects for Deep Dive:
${projectsText}

Task:
Generate the opening turn of this technical interview.
You MUST conduct a Resume Deep Dive:
1. Provide a warm 1-sentence welcome welcoming them to the ${targetRole} interview.
2. Select one specific project from their resume (or technical skill) and ask a deep-dive architecture/design question about it (Difficulty: Medium). Ask about specific implementation details, choices, or challenges.

Return ONLY a JSON object with schema:
{
  "greeting": "Welcome to your ${targetRole} technical interview...",
  "question": "Your deep-dive question here...",
  "topic": "Project or Skill Topic Name"
}`;

  const userPrompt = `Generate initial greeting and first resume deep-dive question for ${targetRole}.`;

  try {
    const parsed = await generateCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    return {
      content: `${parsed.greeting}\n\n${parsed.question}`,
      topic: parsed.topic || 'Resume Deep Dive',
    };
  } catch (err) {
    console.warn('AI initial question warning, using fallback:', err.message);
    const firstProject = resumeData?.projects?.[0]?.name || 'your latest technical project';
    return {
      content: `Welcome to your ${targetRole} technical interview with the ${personaInfo.name} persona!\n\nTo kick off our resume deep-dive, walk me through the architecture of ${firstProject}. What key technical trade-offs did you make during implementation?`,
      topic: firstProject,
    };
  }
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
}) => {
  const personaInfo = PERSONAS[persona] || PERSONAS.General;

  const systemPrompt = `You are a ${personaInfo.name} interviewing a candidate for a ${targetRole} role.
Current Difficulty: ${currentDifficulty}

Previous Interviewer Question:
"${previousQuestion}"

Candidate Answer:
"${candidateAnswer}"

Candidate Resume Context:
Skills: ${resumeData?.skills?.join(', ') || 'N/A'}
Projects: ${resumeData?.projects?.map((p) => p.name).join(', ') || 'N/A'}

Tasks:
1. Thoroughly evaluate the candidate's answer quality on a scale of 1 to 5:
   - 5 = Outstanding depth, accurate architecture/trade-offs, clear communication.
   - 4 = Strong technical answer with minor omitted edge cases.
   - 3 = Average/partial answer; basic understanding demonstrated.
   - 2 = Weak/superficial answer; missed key technical concepts.
   - 1 = Incorrect, off-topic, or empty response.
2. Write a 2-sentence feedback evaluation highlighting specific strengths or gaps.
3. Generate the NEXT follow-up question adapting difficulty dynamically:
   - If score >= 4: Increase challenge (e.g. scaling, edge cases, failure recovery, micro-optimizations).
   - If score <= 2: Simplify or ask about fundamental core concepts.
   - If score == 3: Explore deeper or move to a lateral technical topic.

Return ONLY raw JSON:
{
  "score": 4,
  "evaluation": "Clear explanation of backend architecture, but lacked specifics on database indexing.",
  "nextQuestion": "Follow-up question string...",
  "topic": "System Scalability"
}`;

  const userPrompt = `Evaluate the candidate response and generate the next adaptive follow-up question.`;

  try {
    const parsed = await generateCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    const score = Math.max(1, Math.min(5, Number(parsed.score) || 3));
    const nextDifficulty = calculateNextDifficulty(currentDifficulty, score);

    return {
      score,
      evaluation: parsed.evaluation || 'Answer evaluated.',
      nextQuestion: parsed.nextQuestion || 'How would you optimize this implementation further?',
      nextDifficulty,
      topic: parsed.topic || 'Technical Deep-Dive',
    };
  } catch (err) {
    console.warn('AI evaluation warning, using fallback:', err.message);
    const wordCount = candidateAnswer.split(/\s+/).length;
    let score = 3;
    if (wordCount > 30) score = 4;
    if (wordCount < 10) score = 2;

    const nextDifficulty = calculateNextDifficulty(currentDifficulty, score);
    return {
      score,
      evaluation:
        score >= 4
          ? 'Good technical depth and clarity.'
          : 'Answer was brief; consider elaborating on architectural trade-offs.',
      nextQuestion:
        nextDifficulty === 'hard'
          ? 'How would you scale this design to handle 100x traffic while maintaining sub-50ms latency?'
          : nextDifficulty === 'medium'
          ? 'What potential failure modes or memory leaks could occur, and how would you prevent them?'
          : 'Could you explain the core fundamentals and time complexity of your approach?',
      nextDifficulty,
      topic: 'Technical Deep-Dive',
    };
  }
};

module.exports = {
  PERSONAS,
  calculateNextDifficulty,
  generateInitialQuestion,
  evaluateAndGenerateFollowup,
};
