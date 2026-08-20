const { fallbackResumeParsing } = require('../src/services/gemini');

describe('fallbackResumeParsing', () => {
  it('does not throw on skill names containing regex metacharacters', () => {
    // Regression test: "C++" used to be interpolated raw into `new RegExp`,
    // producing /\bC++\b/ which throws "Nothing to repeat".
    expect(() => fallbackResumeParsing('Proficient in C++ and Python.')).not.toThrow();
  });

  it('detects C++ as a distinct skill from C', () => {
    const result = fallbackResumeParsing('Experience with C++ and embedded C.');
    expect(result.skills).toContain('C++');
  });

  it('matches Node.js literally rather than as a wildcard pattern', () => {
    // "Node.js" contains a literal dot; unescaped it would match "NodeXjs" too.
    const result = fallbackResumeParsing('Built APIs with Node.js and Express.');
    expect(result.skills).toContain('Node.js');
    expect(fallbackResumeParsing('NodeXjs is not a real technology').skills).not.toContain('Node.js');
  });

  it('matches multi-word skills like REST API', () => {
    const result = fallbackResumeParsing('Designed REST API endpoints for the platform.');
    expect(result.skills).toContain('REST API');
  });

  it('does not match a skill name embedded inside a longer word', () => {
    const result = fallbackResumeParsing('I enjoy Javascript-adjacent hobbies like Javascripting.');
    // "Java" should not match inside "Javascript"
    expect(result.skills).not.toContain('Java');
  });

  it('falls back to default skills when nothing recognizable is found', () => {
    const result = fallbackResumeParsing('');
    expect(result.skills.length).toBeGreaterThan(0);
    expect(result.projects.length).toBeGreaterThan(0);
  });

  it('extracts a project from a line mentioning "project"', () => {
    const result = fallbackResumeParsing('Built a project: Personal Finance Tracker\nUsed React and MongoDB.');
    expect(result.projects.length).toBeGreaterThan(0);
  });
});
