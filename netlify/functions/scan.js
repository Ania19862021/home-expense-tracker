// netlify/functions/scan.js
// Skanowanie paragonów przez Claude Vision API
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

  const { image, mediaType } = body;
  if (!image || !mediaType) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_image' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'no_api_key' }) };
  }

  const requestBody = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: image,
          },
        },
        {
          type: 'text',
          text: `Przeanalizuj ten paragon i zwróć odpowiedź TYLKO jako czysty JSON bez żadnych komentarzy.
Format odpowiedzi gdy rozpoznasz paragon:
{"amount": 47.50, "category": "zywnosc", "desc": "Biedronka", "date": "2026-03-15"}
Dostępne kategorie (wybierz jedną):
zywnosc, restauracje, transport, mieszkanie, rachunki, zdrowie, rozrywka, sport, podroze, uroda, prezenty, edukacja, dzieci, kredyty, subskrypcje, inne
Zasady:
- amount: kwota do zapłaty (liczba, bez zł)
- category: najbardziej pasująca kategoria
- desc: nazwa sklepu lub opis (max 30 znaków)
- date: data z paragonu w formacie YYYY-MM-DD (np. "2026-03-15"), lub null jeśli daty nie widać
Jeśli NIE możesz odczytać kwoty lub to nie jest paragon:
{"error": "nie_rozpoznano"}
Odpowiedz TYLKO czystym JSON.`,
        },
      ],
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
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'api_error', detail: result.body }) };
  }

  try {
    const apiResponse = JSON.parse(result.body);
    const text = apiResponse.content?.[0]?.text?.trim() || '{"error":"brak_odpowiedzi"}';
    const parsed = JSON.parse(text);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'nie_rozpoznano' }) };
  }
};
