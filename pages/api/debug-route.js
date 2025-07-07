export default function handler(req, res) {
  res.status(200).json({ 
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers
  });
}