const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const pubKey = fs.readFileSync('C:\\Users\\Fonsi\\.ssh\\id_rsa.pub', 'utf8');
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
  host: '157.173.121.242',
  port: 22,
  username: 'root',
  password: 'z1jateU3PgSii3fB7'
});
