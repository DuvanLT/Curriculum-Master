const fs = require('fs');
const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = 'dummy.pdf';

const postData = 
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="dummy.pdf"\r\n' +
  'Content-Type: application/pdf\r\n\r\n' +
  fs.readFileSync(filePath).toString('binary') + '\r\n' +
  '--' + boundary + '--\r\n';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/import',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(postData, 'binary')
  }
};

const req = http.request(options, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${rawData}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData, 'binary');
req.end();
