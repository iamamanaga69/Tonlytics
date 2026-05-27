const { spawn } = require('node:child_process');

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--no-turbo');
const npmArgs = ['run', 'dev', '--workspace=web', '--', ...forwardedArgs];

const child = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/s', '/c', ['npm', ...npmArgs].join(' ')], {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
  : spawn('npm', npmArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
