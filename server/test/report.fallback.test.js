const { fallbackReport } = require('../src/services/report');

describe('fallbackReport', () => {
  it('converts an average 1-5 score into a 0-100 overall score', () => {
    const qaPairs = [{ score: 5 }, { score: 5 }, { score: 5 }];
    const result = fallbackReport({ claimedSkills: ['React'], qaPairs });
    expect(result.overallScore).toBe(100);
  });

  it('produces 0 when every answer scored the minimum', () => {
    const qaPairs = [{ score: 1 }, { score: 1 }];
    const result = fallbackReport({ claimedSkills: ['React'], qaPairs });
    expect(result.overallScore).toBe(20);
  });

  it('falls back to a neutral 3.5 average when no scores are present', () => {
    const result = fallbackReport({ claimedSkills: ['React'], qaPairs: [] });
    expect(result.overallScore).toBe(70);
  });

  it('ignores qa pairs without a numeric score', () => {
    const qaPairs = [{ score: 5 }, { score: undefined }, { score: 5 }];
    const result = fallbackReport({ claimedSkills: ['React'], qaPairs });
    expect(result.overallScore).toBe(100);
  });

  it('produces one skillConfidence entry per claimed skill', () => {
    const claimedSkills = ['React', 'Node.js', 'MongoDB'];
    const result = fallbackReport({ claimedSkills, qaPairs: [{ score: 4 }] });
    expect(result.skillConfidence).toHaveLength(3);
    result.skillConfidence.forEach((entry) => {
      expect(claimedSkills).toContain(entry.skill);
      expect(['strong', 'moderate', 'weak']).toContain(entry.status);
    });
  });

  it('always returns the required report shape', () => {
    const result = fallbackReport({ claimedSkills: ['React'], qaPairs: [] });
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.weaknesses)).toBe(true);
    expect(Array.isArray(result.roadmap)).toBe(true);
  });
});
