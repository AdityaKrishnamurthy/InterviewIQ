const { generateCompletion } = require('./aiProvider');

/**
 * Parses resume text using Groq LLM (llama-3.3-70b-versatile) and returns structured JSON
 */
const parseResumeText = async (resumeText) => {
  const systemPrompt = `You are an expert technical resume parser and senior engineering hiring manager.
Analyze the provided resume text thoroughly and extract structured candidate data.
You MUST return ONLY a valid JSON object matching this exact structure:
{
  "projects": [
    {
      "name": "Project Name",
      "description": "2-3 sentence overview of what was built, problem solved, and technical architecture",
      "techStack": ["React", "Node.js", "Express", "MongoDB"]
    }
  ],
  "skills": ["JavaScript", "Python", "System Design", "Docker", "AWS"],
  "experience": [
    {
      "company": "Company / Organization Name",
      "role": "Role / Position",
      "duration": "e.g. Jun 2023 - Present or 1 Year"
    }
  ],
  "rawSummary": "A high-impact 2-sentence summary highlighting core strengths and experience level."
}`;

  const userPrompt = `Extract skills, projects, and work experience from the following resume text:\n\n"""\n${resumeText}\n"""`;

  try {
    const parsed = await generateCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      rawSummary: parsed.rawSummary || '',
    };
  } catch (err) {
    console.warn('AI Resume Parsing warning, using fallback:', err.message);
    return fallbackResumeParsing(resumeText);
  }
};

/**
 * Fallback parser if API call fails
 */
const fallbackResumeParsing = (resumeText) => {
  const text = resumeText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const skills = [];
  const knownTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB',
    'Python', 'Java', 'C++', 'SQL', 'PostgreSQL', 'Docker', 'AWS', 'Git',
    'HTML', 'CSS', 'REST API', 'GraphQL', 'Tailwind', 'Redux'
  ];

  knownTech.forEach((tech) => {
    const regex = new RegExp(`\\b${tech}\\b`, 'i');
    if (regex.test(text)) {
      skills.push(tech);
    }
  });

  const projects = [];
  let currentProject = null;

  lines.forEach((line) => {
    if (line.toLowerCase().includes('project') || line.toLowerCase().includes('built') || line.toLowerCase().includes('developed')) {
      if (currentProject) projects.push(currentProject);
      currentProject = {
        name: line.replace(/^[-•*]\s*/, '').slice(0, 50),
        description: line,
        techStack: skills.slice(0, 4),
      };
    }
  });

  if (currentProject && projects.length < 3) {
    projects.push(currentProject);
  }

  if (projects.length === 0) {
    projects.push({
      name: 'Technical Project',
      description: text.slice(0, 150) || 'Full-stack software application',
      techStack: skills.length > 0 ? skills.slice(0, 3) : ['JavaScript', 'Node.js', 'React'],
    });
  }

  return {
    projects,
    skills: skills.length > 0 ? Array.from(new Set(skills)) : ['JavaScript', 'Software Engineering'],
    experience: [
      {
        company: 'Technical Experience',
        role: 'Software Developer',
        duration: '1+ Years',
      },
    ],
    rawSummary: 'Parsed candidate profile with demonstrated technical skills.',
  };
};

module.exports = {
  parseResumeText,
};
