export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const prompt_text = 'Analyse this URL for safety. Return ONLY a raw JSON object, no markdown, no explanation.'
    + '\n\nURL: ' + url
    + '\n\nReturn exactly this structure:'
    + '\n{'
    + '\n  "verdict": "safe",'
    + '\n  "score": 95,'
    + '\n  "summary": "One sentence verdict.",'
    + '\n  "findings": ['
    + '\n    { "type": "safe", "label": "Category", "text": "One sentence." }'
    + '\n  ]'
    + '\n}'
    + '\n\nRules:'
    + '\n- verdict: safe, suspicious, or dangerous'
    + '\n- score: 0 to 100 (100 = completely safe)'
    + '\n- type: safe, warn, danger, or info'
    + '\n- 3 to 5 findings'
    + '\n- Known brands (google, github, youtube, microsoft, apple, amazon, linkedin) = safe score 90+'
    + '\n- Phishing: misspelled brand, odd TLD (.xyz .tk), deceptive subdomain'
    + '\n- No HTTPS = warn finding'
    + '\n- Local IPs (192.168.x.x, 10.x.x.x) = suspicious'
    + '\n- Return ONLY the JSON object, nothing else';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt_text }],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const txt = data.choices[0].message.content;
    const start = txt.indexOf('{');
    const end = txt.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return res.status(500).json({ error: 'Invalid response from AI' });
    }

    const result = JSON.parse(txt.substring(start, end + 1));
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
