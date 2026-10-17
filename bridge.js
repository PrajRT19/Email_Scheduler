const net = require('net');
const { spawn } = require('child_process');

function createProxy(port) {
  const server = net.createServer((socket) => {
    socket.setNoDelay(true);
    const cp = spawn('wsl.exe', ['-e', 'socat', '-', `TCP:127.0.0.1:${port}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    socket.pipe(cp.stdin);
    cp.stdout.pipe(socket);

    cp.stderr.on('data', (d) => {
      console.error(`[bridge:${port} cp.stderr]`, d.toString());
    });

    socket.on('error', (err) => {
      console.error(`[bridge:${port} socket.error]`, err.message);
      try { cp.kill(); } catch {}
    });

    cp.on('error', (err) => {
      console.error(`[bridge:${port} cp.error]`, err.message);
      try { socket.destroy(); } catch {}
    });

    socket.on('close', () => {
      try { cp.kill(); } catch {}
    });

    cp.on('close', (code) => {
      try { socket.destroy(); } catch {}
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Bridge listening on 127.0.0.1:${port}`);
  });
}

createProxy(5432);
createProxy(6379);
