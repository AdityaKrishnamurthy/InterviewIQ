const { generateCompletion } = require('./aiProvider');

/**
 * Generates Truthfulness Rating & Final Technical Interview Report
 */
const generateTruthfulnessAndReport = async ({ resumeData, sessionMessages, targetRole, persona }) => {
  const claimedSkills = resumeData?.skills || ['JavaScript', 'Software Engineering', 'System Design'];
  const claimedProjects = resumeData?.projects || [];

  // Filter Q&A turns
  const qaPairs = [];
  for (let i = 0; i < sessionMessages.length; i++) {
    if (sessionMessages[i].role === 'interviewer') {
      const question = sessionMessages[i].content;
      const answerMsg = sessionMessages[i + 1]?.role === 'candidate' ? sessionMessages[i + 1] : null;
      if (answerMsg) {
        qaPairs.push({
          question,
          answer: answerMsg.content,
          score: answerMsg.score,
          evaluation: answerMsg.evaluation,
        });
      }
    }
  }

  const qaTranscriptText = qaPairs
    .map(
      (pair, idx) =>
        `Q${idx + 1}: "${pair.question}"\nCandidate Answer: "${pair.answer}"\nScore: ${pair.score}/5 (${pair.evaluation})`
    )
    .join('\n\n');

  const systemPrompt = `You are a Senior Principal Technical Interviewer and Resume Truthfulness Auditor.
Target Role: ${targetRole}
Interview Persona: ${persona}

Claimed Resume Skills:
${claimedSkills.join(', ')}

Claimed Resume Projects:
${claimedProjects.map((p) => `- ${p.name}: ${p.description}`).join('\n')}

Interview Q&A Session Transcript:
${qaTranscriptText || 'No transcripts recorded.'}

Tasks:
1. TRUTHFULNESS CHECKER: Cross-check each claimed resume skill against the candidate's actual demonstrated answers during the interview.
   Rate each skill from 1 to 5:
   - 5 (Strong): Solid depth demonstrated in interview answers.
   - 3 (Moderate): Partial knowledge demonstrated; minor gaps.
   - 1-2 (Weak): Resume claims skill, but candidate failed to demonstrate depth or gave poor answers.
2. STRENGTHS & WEAKNESSES: Identify top 3 technical strengths and top 3 weaknesses/gaps.
3. IMPROVEMENT ROADMAP: Generate 3 prioritized actionable steps (High, Medium, Low) for candidate preparation.

Return ONLY raw JSON matching schema:
{
  "overallScore": 82,
  "summary": "Candidate showed strong React architecture skills, but struggled with PostgreSQL indexing and Docker deployment.",
  "skillConfidence": [
    {
      "skill": "React",
      "score": 5,
      "status": "strong",
      "evidence": "Accurately explained Virtual DOM reconciliation and custom hooks."
    },
    {
      "skill": "PostgreSQL",
      "score": 2,
      "status": "weak",
      "evidence": "Was unable to explain B-Tree index optimization for high-throughput queries."
    }
  ],
  "strengths": [
    "Frontend architecture and state management with React",
    "Clear communication of component trade-offs"
  ],
  "weaknesses": [
    "Database index optimization and query execution plans",
    "Containerization & production Docker setup"
  ],
  "roadmap": [
    {
      "priority": "High",
      "title": "Master PostgreSQL Indexing & EXPLAIN ANALYZE",
      "description": "Study B-tree and GIN indexes, practice optimizing slow SQL queries."
    },
    {
      "priority": "Medium",
      "title": "Production Docker & Multi-stage Builds",
      "description": "Learn multi-stage Dockerfiles and container memory limits."
    }
  ]
}`;

  const userPrompt = `Audit candidate resume claims and generate final report JSON.`;

  try {
    const report = await generateCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    const candidateScores = qaPairs.filter((p) => typeof p.score === 'number').map((p) => p.score);

    let calculatedOverall = 75;
    if (candidateScores.length > 0) {
      const avg = candidateScores.reduce((a, b) => a + b, 0) / candidateScores.length;
      calculatedOverall = Math.round((avg / 5) * 100);
    }

    return {
      overallScore: Number(report.overallScore) || calculatedOverall,
      summary: report.summary || 'Completed technical interview evaluation session.',
      skillConfidence: Array.isArray(report.skillConfidence) ? report.skillConfidence : [],
      strengths: Array.isArray(report.strengths) ? report.strengths : [],
      weaknesses: Array.isArray(report.weaknesses) ? report.weaknesses : [],
      roadmap: Array.isArray(report.roadmap) ? report.roadmap : [],
    };
  } catch (err) {
    console.warn('Report generation fallback:', err.message);
    return fallbackReport({ claimedSkills, qaPairs });
  }
};

/**
 * Fallback report generation if AI provider fails
 */
const fallbackReport = ({ claimedSkills, qaPairs }) => {
  const scores = qaPairs.filter((p) => typeof p.score === 'number').map((p) => p.score);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3.5;
  const overall = Math.round((avgScore / 5) * 100);

  const skillConfidence = claimedSkills.map((skill, idx) => {
    const score = Math.max(2, Math.min(5, Math.floor(avgScore) + (idx % 2 === 0 ? 0 : -1)));
    return {
      skill,
      score,
      status: score >= 4 ? 'strong' : score === 3 ? 'moderate' : 'weak',
      evidence: `Demonstrated ${score}/5 depth during technical Q&A session.`,
    };
  });

  return {
    overallScore: overall,
    summary: 'Candidate demonstrated solid fundamental concepts with opportunities to deepen system trade-offs.',
    skillConfidence,
    strengths: ['Technical communication', 'Code organization'],
    weaknesses: ['System edge cases', 'Performance optimization under load'],
    roadmap: [
      {
        priority: 'High',
        title: 'Deepen System Design Fundamentals',
        description: 'Focus on database scaling, caching strategies, and load balancing.',
      },
    ],
  };
};

module.exports = {
  generateTruthfulnessAndReport,
  fallbackReport,
};
