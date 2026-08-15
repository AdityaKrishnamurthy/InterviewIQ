const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');

console.log('\n=========================================');
console.log('🚀 Launching InterviewIQ Full Stack');
console.log('=========================================');
console.log('• Frontend: http://localhost:3000');
console.log('• Backend:  http://localhost:3001');
console.log('=========================================\n');

// Start Express Backend
const server = spawn('node', ['server/src/server.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

// Start Vite Client
const client = spawn('npm', ['run', 'dev', '--workspace=client'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

const shutdown = () => {
  try {
    server.kill();
    client.kill();
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
