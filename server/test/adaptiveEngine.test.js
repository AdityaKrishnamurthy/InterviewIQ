const { calculateNextDifficulty, PERSONAS } = require('../src/services/adaptiveEngine');

describe('calculateNextDifficulty', () => {
  it('escalates from easy to medium on a strong score', () => {
    expect(calculateNextDifficulty('easy', 4)).toBe('medium');
  });

  it('escalates from medium to hard on a strong score', () => {
    expect(calculateNextDifficulty('medium', 5)).toBe('hard');
  });

  it('stays at hard on a strong score', () => {
    expect(calculateNextDifficulty('hard', 4)).toBe('hard');
  });

  it('backs off from hard to medium on a weak score', () => {
    expect(calculateNextDifficulty('hard', 2)).toBe('medium');
  });

  it('backs off from medium to easy on a weak score', () => {
    expect(calculateNextDifficulty('medium', 1)).toBe('easy');
  });

  it('stays at easy on a weak score', () => {
    expect(calculateNextDifficulty('easy', 2)).toBe('easy');
  });

  it('holds difficulty steady on an average score', () => {
    expect(calculateNextDifficulty('medium', 3)).toBe('medium');
    expect(calculateNextDifficulty('easy', 3)).toBe('easy');
    expect(calculateNextDifficulty('hard', 3)).toBe('hard');
  });
});

describe('PERSONAS', () => {
  it('defines all personas referenced by the client including Custom', () => {
    expect(Object.keys(PERSONAS).sort()).toEqual(['Amazon', 'Custom', 'General', 'Google', 'Startup']);
  });

  it('gives every persona a name, description, and style', () => {
    Object.values(PERSONAS).forEach((persona) => {
      expect(persona.name).toBeTruthy();
      expect(persona.description).toBeTruthy();
      expect(persona.style).toBeTruthy();
    });
  });
});
