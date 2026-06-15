// ============================================================
//  Paste your FREE Groq API key below
//  Get one at: https://console.groq.com
// ============================================================
var API_KEY = localStorage.getItem('groq_key') || '';
if (!API_KEY) {
  API_KEY = prompt('Enter your Groq API key (get one free at console.groq.com):') || '';
  if (API_KEY) localStorage.setItem('groq_key', API_KEY);
}
// ============================================================

var loadMsgs = [
  'Checking domain...',
  'Scanning patterns...',
  'Inspecting structure...',
  'Running checks...'
];
var ticker = null;

function tryUrl(u) {
  document.getElementById('url').value = u;
  doCheck();
}

function normUrl(raw) {
  raw = raw.trim();
  if (!raw) return null;
  if (raw.indexOf('http://') !== 0 && raw.indexOf('https://') !== 0) {
    raw = 'https://' + raw;
  }
  try { new URL(raw); return raw; } catch(e) { return null; }
}

function doCheck() {
  if (!API_KEY) {
    API_KEY = prompt('Enter your Groq API key (get one free at console.groq.com):') || '';
    if (API_KEY) localStorage.setItem('groq_key', API_KEY);
    if (!API_KEY) return;
  }

  var raw = document.getElementById('url').value;
  var url = normUrl(raw);
  var hint = document.getElementById('hint');

  if (!url) {
    hint.textContent = 'Please enter a valid URL.';
    hint.className = 'hint err';
    return;
  }

  hint.textContent = 'Press Enter or click Check';
  hint.className = 'hint';
  document.getElementById('btn').disabled = true;
  document.getElementById('result').className = 'result';
  document.getElementById('result').innerHTML = '';

  var ld = document.getElementById('loading');
  ld.style.display = 'flex';
  var idx = 0;
  document.getElementById('loadMsg').textContent = loadMsgs[0];
  ticker = setInterval(function() {
    idx = (idx + 1) % loadMsgs.length;
    document.getElementById('loadMsg').textContent = loadMsgs[idx];
  }, 900);

  var prompt_text = 'Analyse this URL for safety. Return ONLY a raw JSON object, no markdown, no explanation.'
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

  fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt_text }],
      max_tokens: 1000,
      temperature: 0.1
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    clearInterval(ticker);
    ld.style.display = 'none';
    document.getElementById('btn').disabled = false;

    if (data.error) throw new Error(data.error.message);

    var txt = data.choices[0].message.content;
    var start = txt.indexOf('{');
    var end = txt.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Invalid response from AI');
    var r = JSON.parse(txt.substring(start, end + 1));
    renderResult(r);
  })
  .catch(function(err) {
    clearInterval(ticker);
    ld.style.display = 'none';
    document.getElementById('btn').disabled = false;
    var el = document.getElementById('result');
    el.innerHTML = '<p style="font-size:13px;color:var(--danger);padding:8px 0;">Error: ' + escHtml(err.message || 'Something went wrong. Check your API key.') + '</p>';
    el.className = 'result show';
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderResult(r) {
  var colors = { safe: 'var(--safe)', suspicious: 'var(--warn)', dangerous: 'var(--danger)' };
  var labels = { safe: 'Safe to open', suspicious: 'Proceed with caution', dangerous: 'Do not open' };
  var col = colors[r.verdict] || 'var(--warn)';
  var lbl = labels[r.verdict] || 'Proceed with caution';
  var dots = { safe: 'dot-safe', warn: 'dot-warn', danger: 'dot-danger', info: 'dot-info' };

  var findings = r.findings || [];
  var rows = '';
  for (var i = 0; i < findings.length; i++) {
    var f = findings[i];
    rows += '<div class="finding">'
      + '<span class="dot ' + (dots[f.type] || 'dot-info') + '"></span>'
      + '<div class="finding-body">'
      + '<div>' + escHtml(f.text) + '</div>'
      + '<div class="finding-cat">' + escHtml(f.label) + '</div>'
      + '</div></div>';
  }

  document.getElementById('result').innerHTML =
    '<div class="verdict-line">'
    + '<span class="verdict-text" style="color:' + col + '">' + lbl + '</span>'
    + '<span class="score">' + r.score + '/100</span>'
    + '</div>'
    + '<p class="summary">' + escHtml(r.summary) + '</p>'
    + '<p class="findings-label">Details</p>'
    + rows;

  requestAnimationFrame(function() {
    document.getElementById('result').className = 'result show';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('url').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doCheck();
  });
});