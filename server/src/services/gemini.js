const { generateCompletion } = require('./aiProvider');

/**
 * Parses resume text using the configured Groq LLM and returns structured JSON
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
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // \b only asserts between word/non-word chars, so it never matches next to
    // a trailing symbol like the "+" in C++. Use lookarounds on word chars instead.
    const left = /\w/.test(tech[0]) ? '\\b' : '';
    const right = /\w/.test(tech[tech.length - 1]) ? '\\b' : '(?!\\w)';
    const regex = new RegExp(`${left}${escaped}${right}`, 'i');
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

/**
 * Parses Job Description text using the configured LLM and returns structured JSON
 * Handles multi-role JD documents by focusing on the specified targetRole if provided
 */
const parseJobDescriptionText = async (jdText, targetRole = '') => {
  const roleInstruction = targetRole ? `
NOTE: The user has specified the target role as "${targetRole}". If the document contains multiple job descriptions or positions, focus EXCLUSIVELY on extracting the requirements, skills, and responsibilities for the "${targetRole}" position.` : 'If multiple roles are described in the JD, extract requirements for the most prominent technical role.';

  const systemPrompt = `You are an expert technical recruiter and senior engineering hiring manager.
Analyze the provided Job Description (JD) text thoroughly and extract structured role requirements.
${roleInstruction}
You MUST return ONLY a valid JSON object matching this exact structure:
{
  "roleTitle": "${targetRole || 'Software Engineer'}",
  "requiredSkills": ["React", "TypeScript", "Node.js", "System Design", "AWS"],
  "responsibilities": [
    "Design and build scalable microservices and APIs",
    "Collaborate with product and design on feature delivery"
  ],
  "experienceLevel": "Mid-Senior (3-5 years)",
  "summary": "A 2-sentence summary capturing the core mission and primary technical demands of the role."
}`;

  const userPrompt = `Extract role requirements, required tech stack, and responsibilities from this Job Description${targetRole ? ` specifically for the "${targetRole}" role` : ''}:\n\n"""\n${jdText}\n"""`;

  try {
    const parsed = await generateCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    return {
      roleTitle: parsed.roleTitle || targetRole || 'Software Engineer',
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      experienceLevel: parsed.experienceLevel || '',
      summary: parsed.summary || '',
    };
  } catch (err) {
    console.warn('AI Job Description Parsing warning, using fallback:', err.message);
    return fallbackJDParsing(jdText, targetRole);
  }
};

/**
 * Fallback parser for Job Description if API call fails
 */
const fallbackJDParsing = (jdText, targetRole = '') => {
  const text = jdText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const skills = [];
  const knownTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB',
    'Python', 'Java', 'C++', 'Go', 'Rust', 'SQL', 'PostgreSQL', 'Docker',
    'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'REST API', 'GraphQL',
    'System Design', 'Microservices', 'CI/CD', 'Kafka', 'Redis'
  ];

  knownTech.forEach((tech) => {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const left = /\w/.test(tech[0]) ? '\\b' : '';
    const right = /\w/.test(tech[tech.length - 1]) ? '\\b' : '(?!\\w)';
    const regex = new RegExp(`${left}${escaped}${right}`, 'i');
    if (regex.test(text)) {
      skills.push(tech);
    }
  });

  let roleTitle = targetRole || 'Software Engineer';
  if (!targetRole) {
    for (const line of lines.slice(0, 5)) {
      if (line.toLowerCase().includes('engineer') || line.toLowerCase().includes('developer') || line.toLowerCase().includes('architect')) {
        roleTitle = line.replace(/^[#*-]\s*/, '').slice(0, 60);
        break;
      }
    }
  }

  const responsibilities = lines
    .filter((l) => /^(develop|build|design|collaborate|lead|maintain|implement|work)/i.test(l.replace(/^[-•*]\s*/, '')))
    .slice(0, 4)
    .map((l) => l.replace(/^[-•*]\s*/, ''));

  return {
    roleTitle,
    requiredSkills: skills.length > 0 ? Array.from(new Set(skills)) : ['JavaScript', 'System Design'],
    responsibilities: responsibilities.length > 0 ? responsibilities : ['Build and maintain robust software systems'],
    experienceLevel: 'Technical Professional',
    summary: `Target position for ${roleTitle} requiring proficiency in ${skills.slice(0, 4).join(', ') || 'core software engineering'}.`,
  };
};

module.exports = {
  parseResumeText,
  fallbackResumeParsing,
  parseJobDescriptionText,
  fallbackJDParsing,
};
