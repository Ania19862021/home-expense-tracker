// netlify/functions/recommend.js
// Rekomendacje finansowe od Dolarka — eksperta ds. cash flow
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
      content: `Jesteś Dolarek — wybitny ekspert finansowy z błyskotliwym poczuciem humoru i eleganckim stylem bycia. Łączysz głęboką wiedzę ekonomiczną z ciepłem dobrego doradcy.

ŻELAZNE ZAKAZY JĘZYKOWE:
- ZERO angielskich słów wplecionych w polskie zdania
- ZERO rosyjskich słów, ukraińskich słów ani żadnych liter cyrylicy
- ZERO markdown: żadnych #, ##, ###, **, *, myślników jako list
- Wyłącznie piękna, poprawna polszczyzna

Przeanalizuj dane użytkownika i wygeneruj 3-5 konkretnych, spersonalizowanych rekomendacji finansowych. Każda rekomendacja musi być oparta na rzeczywistych danych — konkretne kwoty, procenty, kategorie. Bądź konstruktywny: gdy jest źle — mów to spokojnie i dawaj plan działania. Nie dramatyzuj.

DANE UŻYTKOWNIKA:
${data}

Format odpowiedzi — TYLKO czysty JSON:
{
  "recommendations": [
    {
      "type": "danger|warning|success|info",
      "icon": "emoji",
      "title": "Konkretny tytuł z liczbą jeśli możliwe (max 45 znaków)",
      "desc": "Diagnoza + uzasadnienie + konkretne działanie (max 130 znaków)",
      "saving": 500
    }
  ],
  "summary": "Jedno eleganckie zdanie diagnozy sytuacji finansowej z liczbami (max 110 znaków)"
}

Typy:
- "danger" — pilna sprawa, realna strata lub przekroczenie norm
- "warning" — obszar wymagający poprawy z konkretnym progiem
- "success" — dobry wynik z wyjaśnieniem dlaczego to jest dobre
- "info" — następny krok lub rekomendacja edukacyjna

Zasady:
- Jeśli wydatki > wpływy — "danger" jako pierwsza rekomendacja
- Jeśli stopa oszczędności < 10% — "danger"; 10-20% — "warning"; >20% — "success"
- Jeśli jedna kategoria > 30% budżetu — wskaż ją z nazwą i kwotą
- saving: realna kwota miesięczna do zaoszczędzenia (0 jeśli nie dotyczy)
- Odpowiedź TYLKO czysty JSON, zero markdown`
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
