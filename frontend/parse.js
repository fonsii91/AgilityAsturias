const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test-results2.json'));
const failures = data.testResults.filter(t => t.status === 'failed').map(t => {
  return t.name + '\n  ' + t.assertionResults.filter(a => a.status === 'failed').map(a => a.failureMessages[0].split('\n')[0]).join('\n  ');
});
console.log(failures.join('\n\n'));
