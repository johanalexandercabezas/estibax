// Lanza el dev server de Vite desacoplado
const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname);

const fe = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0', '--port', '5173'], {
  detached: true,
  stdio: 'ignore',
  cwd: root,
});
fe.unref();
console.log('FRONTEND_LANZADO pid=' + fe.pid);
