import '@testing-library/jest-dom/vitest';

// Vitest 4's jsdom environment doesn't reliably wire up a working Storage
// instance for localStorage, so provide a minimal in-memory stand-in.
const createMemoryStorage = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createMemoryStorage(),
  writable: true,
});
