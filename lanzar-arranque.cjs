const { spawn } = require('child_process');
const child = spawn('node', ['iniciar-todo.cjs'], {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  windowsHide: true,
});
child.unref();
console.log('Arrancador lanzado en background, PID:', child.pid);
