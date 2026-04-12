// netlify/functions/parse.js
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
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Jesteś ekspertem od analizy finansowej i doskonale znasz potoczny język polski. Przeanalizuj tekst i wyodrębnij WSZYSTKIE transakcje finansowe.

ROZUMIENIE KWOT — potoczne wyrażenia:
- "stówa", "stówka" = 100 zł
- "dwie stówy", "dwieście" = 200 zł
- "pięć dych" = 50 zł (dycha = 10 zł)
- "koło", "kółko" = 1000 zł ("dwa koła" = 2000 zł)
- "tysiak", "tysiaka", "tysiąc" = 1000 zł
- "kawał kasy", "sporo" = interpretuj z kontekstu
- "kilka stów" = ~300-500 zł
- "k" lub "K" po liczbie = tysiące ("2k" = 2000 zł)
- liczba bez jednostki = złotówki ("zapłaciłam 150" = 150 zł)

ROZUMIENIE WPŁYWÓW — wszystko co oznacza że pieniądze przyszły:
- "zarobiłam/zarobił/zarobiłem/zarobiło się"
- "dostałam/dostał/dostałem wypłatę/pensję/kasę/hajs"
- "przelali mi", "wpłynęło", "wpadło"
- "hajs za zlecenie", "kasa za projekt", "faktura"
- "800+", "500+", "świadczenie", "zasiłek", "alimenty"
- "800+ na X dzieci" = X × 800 zł (np. "na dwójkę" = 1600, "na trójkę" = 2400)
- "mąż zarobił", "żona zarobiła", "partner dostał" = wpływ wynagrodzenie
- "premię dostałam", "bonus"
- "zwrócili mi", "oddali kasę", "refundacja"

ROZUMIENIE WYDATKÓW — wszystko co oznacza że pieniądze wyszły:
- "zapłaciłam/zapłacił/zapłaciłem", "wydałam/wydał"
- "kupiłam/kupił", "wzięłam/wziął"
- "poszło na", "leciało na", "poszła kasa na"
- "rata", "kredyt", "hipoteka", "pożyczka"
- "czynsz", "rachunki", "media", "prąd", "gaz", "internet"
- "tankowanie", "paliwo", "benzynę"
- "komunia", "wesele", "chrzciny", "urodziny" = prezenty/inne
- "naprawa", "serwis", "mechanik"
- "lekarz", "apteka", "wizyta"
- "Biedronka", "Lidl", "Żabka", "Carrefour", "Auchan" = żywność
- nazwa sklepu/marki bez kategorii = żywność lub inne zależnie od kontekstu

KATEGORIE wydatków: zywnosc, restauracje, transport, mieszkanie, rachunki, zdrowie, rozrywka, sport, podroze, uroda, prezenty, edukacja, dzieci, kredyty, subskrypcje, inne
KATEGORIE wpływów: wynagrodzenie, premia, freelance, 800plus, zwrot, rodzina, inne_inc

PRZYKŁADY jak rozpoznawać:
"mąż zarobił 8000" → {"type":"inc","amount":8000,"cat":"wynagrodzenie","desc":"Pensja męża"}
"800+ na dwójkę dzieci" → {"type":"inc","amount":1600,"cat":"800plus","desc":"800+ dwójka dzieci"}
"800+ na trójkę" → {"type":"inc","amount":2400,"cat":"800plus","desc":"800+ trójka dzieci"}
"kredyt PKO na 2000" → {"type":"exp","amount":2000,"cat":"kredyty","desc":"Kredyt PKO"}
"hipoteczny 2000" → {"type":"exp","amount":2000,"cat":"kredyty","desc":"Kredyt hipoteczny"}
"komunia 1000" → {"type":"exp","amount":1000,"cat":"prezenty","desc":"Komunia"}
"paliwo 400" → {"type":"exp","amount":400,"cat":"transport","desc":"Paliwo"}
"telefon 150" → {"type":"exp","amount":150,"cat":"subskrypcje","desc":"Telefon"}
"naprawa samochodu 1000" → {"type":"exp","amount":1000,"cat":"transport","desc":"Naprawa samochodu"}
"stówka na Żabkę" → {"type":"exp","amount":100,"cat":"zywnosc","desc":"Żabka"}
"dwa koła na wesele" → {"type":"exp","amount":2000,"cat":"prezenty","desc":"Wesele"}
"wpadło mi 3 koła za projekt" → {"type":"inc","amount":3000,"cat":"freelance","desc":"Projekt"}
"pięć dych za basen" → {"type":"exp","amount":50,"cat":"sport","desc":"Basen"}
"premia tysiąc" → {"type":"inc","amount":1000,"cat":"premia","desc":"Premia"}

FORMAT — tylko czysty JSON, ZERO komentarzy, ZERO markdown:
{"items": [...]}

Jeśli tekst nie zawiera żadnych transakcji finansowych:
{"items": [], "error": "nie_rozpoznano"}

Data: ${date}

Tekst do analizy:
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
    const clean = text2.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'nie_rozpoznano', items: [] }) };
  }
};
