export default async function handler(req, res) {
  // Proxy /api/* requests to external APIs
  
  if (req.url.startsWith('/api/football-api/')) {
    const path = req.url.replace('/api/football-api/', '')
    const apiUrl = `https://api.football-data.org/${path}`
    const apiKey = process.env.FOOTBALL_DATA_API_KEY

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    try {
      const response = await fetch(apiUrl, {
        headers: { 'X-Auth-Token': apiKey },
      })
      const data = await response.json()
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=60')
      return res.status(response.status).json(data)
    } catch (error) {
      return res.status(500).json({ error: 'Proxy failed' })
    }
  }

  res.status(404).json({ error: 'Not found' })
}
