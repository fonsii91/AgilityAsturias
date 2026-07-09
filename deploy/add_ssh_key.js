const { Client } = require('ssh2');
const fs = require('fs');

const requiredEnv = ['SSH_HOST', 'SSH_USERNAME', 'SSH_PASSWORD', 'SSH_PUBLIC_KEY_PATH'];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const conn = new Client();
conn.on('ready', () => {
  const pubKey = fs.readFileSync(process.env.SSH_PUBLIC_KEY_PATH, 'utf8');
  conn.exec(`mkdir -p ~/.ssh && echo "${pubKey.trim()}" >> ~/.ssh/authorized_keys`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Key added successfully');
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error', err);
}).connect({
  host: process.env.SSH_HOST,
  port: Number(process.env.SSH_PORT || 22),
  username: process.env.SSH_USERNAME,
  password: process.env.SSH_PASSWORD
});
