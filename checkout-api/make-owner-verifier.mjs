import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

if (!process.stdin.isTTY) {
  throw new Error('Open a terminal to enter the password privately.');
}

const hiddenOutput = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const terminal = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
try {
  process.stderr.write('Owner password (input hidden, 16 characters minimum): ');
  const password = await terminal.question('');
  process.stderr.write('\n');
  if (password.length < 16 || password.length > 256) {
    throw new Error('Use a strong password of 16–256 characters.');
  }
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  process.stdout.write(`${salt.toString('base64url')}.${hash.toString('base64url')}\n`);
} finally {
  terminal.close();
}
