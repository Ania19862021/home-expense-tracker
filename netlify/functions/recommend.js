// netlify/functions/recommend.js
// Rekomendacje oszczędnościowe od Dolarka
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

  const { data } = body;
  if (!data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_data' }) };
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
      content: `Jesteś Dolarek — ekspert finansowy. Przeanalizuj dane użytkownika i wygeneruj KONKRETNE, SPERSONALIZOWANE rekomendacje oszczędnościowe.

DANE UŻYTKOWNIKA:
${data}

Wygeneruj 3-5 rekomendacji w formacie JSON. Każda rekomendacja musi być:
- Konkretna i oparta na PRAWDZIWYCH danych użytkownika (nie ogólne porady)
- Z realną kwotą do zaoszczędzenia
- Z krótkim uzasadnieniem

Format odpowiedzi — TYLKO czysty JSON:
{
  "recommendations": [
    {
      "type": "danger|warning|success|info",
      "icon": "emoji",
      "title": "Krótki tytuł (max 40 znaków)",
      "desc": "Konkretna porada z kwotami (max 120 znaków)",
      "saving": 500
    }
  ],
  "summary": "Jedno zdanie podsumowania sytuacji finansowej (max 100 znaków)"
}

Typy:
- "danger" — pilna sprawa, coś idzie bardzo źle
- "warning" — uwaga, można poprawić  
- "success" — coś idzie dobrze, pochwal użytkownika
- "info" — neutralna porada edukacyjna

Zasady:
- Jeśli wydatki > 50% wpływów w jakiejś kategorii — to "danger"
- Jeśli brak funduszu awaryjnego (saldo < 3x miesięczne wydatki) — "warning"
- Jeśli oszczędności > 20% — "success"
- Podaj konkretne kwoty z danych użytkownika
- saving: ile złotych można zaoszczędzić miesięcznie (0 jeśli nie dotyczy)
- Odpowiedz TYLKO czystym JSON, zero markdown`
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
      let data2 = '';
      res.on('data', chunk => data2 += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data2 }));
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
    const text = apiResponse.content?.[0]?.text?.trim() || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'blad_parsowania' }) };
  }
};
