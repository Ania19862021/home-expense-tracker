// netlify/functions/parse.js
// Parsowanie opisu słownego wydatków i wpływów przez Claude AI
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const { text, date } = body;
  if (!text) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_text' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'no_api_key' }) };
  }

  const requestBody = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Przeanalizuj poniższy opis finansowy i wyodrębnij wszystkie transakcje. Zwróć TYLKO czysty JSON bez komentarzy.

Format odpowiedzi:
{"items": [
  {"type": "inc", "amount": 8000, "cat": "wynagrodzenie", "desc": "Pensja"},
  {"type": "exp", "amount": 1500, "cat": "mieszkanie", "desc": "Czynsz"}
]}

Zasady:
- type: "inc" dla wpływów/dochodów, "exp" dla wydatków/kosztów
- amount: kwota jako liczba (bez zł)
- cat dla wydatków (exp): zywnosc, restauracje, transport, mieszkanie, rachunki, zdrowie, rozrywka, sport, podroze, uroda, prezenty, edukacja, dzieci, kredyty, subskrypcje, inne
- cat dla wpływów (inc): wynagrodzenie, premia, freelance, zwrot, rodzina, inne_inc
- desc: krótki opis (max 30 znaków)
- Jeśli nie możesz wyodrębnić żadnej transakcji: {"items": [], "error": "nie_rozpoznano"}

Data transakcji: ${date}

Opis do przeanalizowania:
${text}`
    }],
  });

  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });

  if (result.status !== 200) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'api_error' }) };
  }

  try {
    const apiResponse = JSON.parse(result.body);
    const text2 = apiResponse.content?.[0]?.text?.trim() || '{"items":[]}';
    const parsed = JSON.parse(text2);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'nie_rozpoznano', items: [] }) };
  }
};
