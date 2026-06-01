const { execSync } = require('child_process');

function findLanguageServerProcess() {
  let output;
  try {
    output = execSync('ps aux', { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed ps aux:', err);
    return null;
  }

  const lines = output.split('\n');
  const targetLine = lines.find(
    (line) =>
      (line.includes('/bin/language_server') || line.includes('language_server_linux_x64')) &&
      line.includes('antigravity')
  );

  if (!targetLine) {
    console.log('Language server process not found in ps aux');
    return null;
  }

  console.log('Found process line:', targetLine);

  const columns = targetLine.trim().split(/\s+/);
  const pid = columns[1];
  const tokenMatch = targetLine.match(/--csrf_token[=\s]+([\w-]+(?:-[\w-]+)*)/);

  if (!pid || !tokenMatch) {
    console.log('PID or csrfToken match failed. PID:', pid, 'tokenMatch:', tokenMatch);
    return null;
  }

  return { pid, csrfToken: tokenMatch[1] };
}

function findProcessPorts(pid) {
  try {
    const output = execSync(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`, { encoding: 'utf8' });
    console.log('lsof output:\n', output);
    const matches = [...output.matchAll(/127\.0\.0\.1:(\d+)/g)];
    return matches.map(m => parseInt(m[1], 10));
  } catch (err) {
    console.error('Failed lsof:', err);
    return [];
  }
}

async function testPort(port, csrfToken) {
  console.log(`Testing port ${port} with token ${csrfToken}...`);
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connect-Protocol-Version': '1',
          'x-codeium-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          metadata: {
            ideName: 'antigravity',
            extensionName: 'antigravity',
            ideVersion: 'unknown',
            locale: 'en',
          },
        }),
      }
    );
    console.log(`Port ${port} response status:`, response.status);
    const text = await response.text();
    console.log(`Port ${port} body preview:`, text.slice(0, 500));
    try {
      const data = JSON.parse(text);
      console.log(`Port ${port} JSON data:`, JSON.stringify(data, null, 2));
    } catch {
      console.log(`Port ${port} output is not JSON`);
    }
  } catch (err) {
    console.error(`Port ${port} failed:`, err.message);
  }
}

async function main() {
  const proc = findLanguageServerProcess();
  if (!proc) return;
  console.log('Found process:', proc);
  const ports = findProcessPorts(proc.pid);
  console.log('Found ports:', ports);
  for (const port of ports) {
    await testPort(port, proc.csrfToken);
    console.log('------------------------------------');
  }
}

main();
