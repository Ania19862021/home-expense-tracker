// netlify/functions/statement.js
// Parsowanie wyciągów bankowych — przyjmuje TEKST wyciągnięty przez PDF.js
// Tekst jest lekki (~20KB zamiast 5MB PDF), API call mieści się w 10s timeout Netlify
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

  // Przyjmujemy tekst wyciągnięty przez PDF.js po stronie klienta
  const { text, filename } = body;

  if (!text || text.trim().length < 20) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_text' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'no_api_key' }) };
  }

  const prompt = `Jesteś ekspertem od analizy wyciągów bankowych. Przeanalizuj poniższy tekst wyciągu i wyodrębnij WSZYSTKIE transakcje finansowe.

Dla każdej transakcji określ:
- type: "exp" (wydatek, obciążenie, przelew wychodzący) lub "inc" (wpływ, uznanie, przelew przychodzący)
- amount: kwota jako LICZBA dodatnia bez znaku (np. 150.50, NIE "150.50")
- date: data transakcji w formacie YYYY-MM-DD (jeśli nie widać daty użyj "")
- desc: opis transakcji max 50 znaków (usuń numery kont, kody referencyjne, zostaw czytelną nazwę)
- cat: kategoria wg listy poniżej

KATEGORIE WYDATKÓW:
zywnosc — Biedronka, Lidl, Żabka, Carrefour, Auchan, Kaufland, Netto, sklep spożywczy, supermarket
restauracje — McDonald's, KFC, Burger King, pizza, restauracja, kawiarnia, cafe, bistro, bar
transport — Shell, Orlen, BP, Lotos, paliwo, parking, PKP, PKS, ZTM, MPK, Uber, Bolt, taxi, rower miejski
mieszkanie — czynsz, najem, administracja, zarządca, wspólnota mieszkaniowa
rachunki — prąd, gaz, woda, internet, telefon, T-Mobile, Orange, Play, Plus, UPC, Multimedia, INEA
kredyty — rata kredytu, hipoteka, pożyczka, chwilówka, leasing
subskrypcje — Netflix, Spotify, Apple, Google, Disney+, HBO, YouTube Premium, ChatGPT, Adobe
zdrowie — apteka, lekarz, szpital, klinika, dentysta, rehabilitacja, fizjoterapeuta, badania
rozrywka — kino, teatr, bilety, koncert, muzeum, gry, Steam, PlayStation
sport — siłownia, fitness, basen, squash, kręgielnia, karnet
podroze — hotel, Airbnb, booking, lot, Ryanair, Wizz, pociąg, bilet lotniczy
uroda — fryzjer, kosmetyczka, salon, manicure, pedicure, drogeria, Rossmann, Douglas
prezenty — kwiaciarnia, prezent, kwiat, urodziny, ślub
edukacja — kurs, szkolenie, książka, uczelnia, czesne, Udemy, szkoła językowa
dzieci — przedszkole, żłobek, zabawki, odzież dziecięca, zajęcia dodatkowe
inne — wszystko co nie pasuje do powyższych

KATEGORIE WPŁYWÓW:
wynagrodzenie — pensja, wynagrodzenie, przelew od pracodawcy, płaca
premia — premia, bonus, nagroda
freelance — faktura, zlecenie, projekt, wynagrodzenie za usługę
800plus — 800+, 500+, świadczenie na dziecko
zwrot — zwrot, refundacja, korekta
rodzina — przelew od rodziny, od mamy, od taty, od partnera
inne_inc — inne przychody

WAŻNE ZASADY:
- Ignoruj salda, opłaty bankowe za prowadzenie konta, odsetki bankowe
- Ignoruj przelewy własne między kontami tego samego posiadacza
- Kwoty ZAWSZE jako liczby (nie stringi), ZAWSZE dodatnie
- Każda transakcja MUSI mieć: type, amount, desc, cat
- Jeśli opis po angielsku — przetłumacz na polski

Odpowiedz TYLKO czystym JSON (zero markdown, zero komentarzy):
{"transactions":[{"type":"exp","amount":150.00,"date":"2026-03-15","desc":"Biedronka zakupy","cat":"zywnosc"}],"period":"Marzec 2026","bank":"nazwa banku"}

TEKST WYCIĄGU:
${text}`;

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001', // Haiku: szybszy (2-4s) i tańszy, mieści się w 10s timeout
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: prompt,
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
    console.error('API error:', result.status, result.body.slice(0, 300));
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'api_error', detail: result.status }) };
  }

  try {
    const apiResponse = JSON.parse(result.body);
    const rawText = apiResponse.content?.[0]?.text?.trim() || '{"transactions":[]}';
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!parsed.transactions) parsed.transactions = [];

    // Normalizuj każdą transakcję — zabezpieczenie przed błędami AI
    parsed.transactions = parsed.transactions
      .map(t => ({
        ...t,
        amount: parseFloat(t.amount) || 0,
        date: (typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) ? t.date : '',
        desc: (t.desc || 'Nieznana transakcja').slice(0, 50),
        cat: t.cat || (t.type === 'inc' ? 'inne_inc' : 'inne'),
        type: ['exp', 'inc'].includes(t.type) ? t.type : 'exp',
      }))
      .filter(t => t.amount > 0); // usuń transakcje bez kwoty

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (e) {
    console.error('Parse error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'parse_error', transactions: [] }) };
  }
};
