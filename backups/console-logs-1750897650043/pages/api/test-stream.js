// pages/api/test-stream.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  console.log('Starting test stream...');

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.status(200);

  // Send chunks with delays
  res.write('Hello ');
  console.log('Sent: Hello ');

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.write('streaming ');
  console.log('Sent: streaming ');

  await new Promise(resolve => setTimeout(resolve, 1000));

  res.write('world!');
  console.log('Sent: world!');

  res.end();
  console.log('Stream ended');
}
