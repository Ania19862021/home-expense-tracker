// netlify/functions/statement.js
// Parsowanie wyciągów bankowych PDF przez Claude API
// FIXES: BUG-1 (body size), BUG-3/4/5 (amount/date normalization)

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

  const { pdf, mediaType } = body;
  if (!pdf) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_pdf' }) };
  }

  // BUG-1 FIX: sprawdzamy rozmiar base64 po stronie serwera
  // base64 ~ 1.37 * raw size; limit Netlify = 6MB body
  // Bezpieczny limit PDF: ~4MB (base64 = ~5.5MB + JSON overhead)
  const base64SizeBytes = Math.ceil(pdf.length * 0.75);
  const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4MB
  if (base64SizeBytes > MAX_PDF_BYTES) {
    return {
      statusCode: 413,
      headers,
      body: JSON.stringify({ error: 'pdf_too_large', maxMB: 4 })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'no_api_key' }) };
  }

  const requestBody = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: mediaType || 'application/pdf',
            data: pdf,
          },
        },
        {
          type: 'text',
          text: `Jesteś ekspertem od analizy wyciągów bankowych. Przeanalizuj ten wyciąg i wyodrębnij WSZYSTKIE transakcje finansowe.

Dla każdej transakcji określ:
- type: "exp" (wydatek, obciążenie, przelew wychodzący) lub "inc" (wpływ, uznanie, przelew przychodzący)
- amount: kwota jako LICZBA dodatnia bez znaku (np. 150.50, NIE "150.50")
- date: data transakcji w formacie YYYY-MM-DD (wymagane, jeśli nie znasz — użyj "0000-00-00")
- desc: opis transakcji max 50 znaków (usuń numery kont, kody referencyjne, zostaw czytelną nazwę)
- cat: kategoria wg listy poniżej

KATEGORIE WYDATKÓW:
zywnosc — Biedronka, Lidl, Żabka, Carrefour, Auchan, Kaufland, Netto, sklep spożywczy, supermarket
restauracje — McDonald's, KFC, Burger King, pizza, restauracja, kawiarnia, cafe, bistro, bar
transport — Shell, Orlen, BP, Lotos, paliwo, parking, PKP, PKS, ZTM, MPK, Uber, Bolt, taxi, rower miejski
mieszkanie — czynsz, najem, administracja, zarządca, wspólnota mieszkaniowa, czynsz dzierżawy
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
- Przy przelewach własnych między kontami — pomiń (type: "skip")
- Daty MUSZĄ być z wyciągu w formacie YYYY-MM-DD, nie wymyślaj
- Kwoty ZAWSZE jako liczby (nie stringi), ZAWSZE dodatnie
- Jeśli opis jest po angielsku — przetłumacz na polski
- Każda transakcja MUSI mieć: type, amount, date, desc, cat

Odpowiedz TYLKO czystym JSON bez żadnego markdown ani komentarzy:
{"transactions": [{"type":"exp","amount":150.00,"date":"2026-03-15","desc":"Biedronka zakupy","cat":"zywnosc"}], "period": "Marzec 2026", "bank": "nazwa banku jeśli rozpoznajesz"}`
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
        'anthropic-beta': 'pdfs-2024-09-25',
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
    console.error('API error:', result.status, result.body.slice(0, 500));
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'api_error', detail: result.status }) };
  }

  try {
    const apiResponse = JSON.parse(result.body);
    const text = apiResponse.content?.[0]?.text?.trim() || '{"transactions":[]}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!parsed.transactions) {
      parsed.transactions = [];
    }

    // BUG-1/3/4/5 FIX: normalizuj każdą transakcję — AI może zwrócić stringa zamiast liczby
    parsed.transactions = parsed.transactions
      .filter(t => t.type !== 'skip')
      .map(t => ({
        ...t,
        // BUG-3/4 FIX: amount zawsze jako float, nigdy string, nigdy undefined
        amount: parseFloat(t.amount) || 0,
        // BUG-5 FIX: date zawsze jako string, fallback na pusty string
        date: (typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) ? t.date : '',
        // Zabezpieczenie pola desc
        desc: (t.desc || 'Nieznana transakcja').slice(0, 50),
        // Zabezpieczenie kategorii
        cat: t.cat || (t.type === 'inc' ? 'inne_inc' : 'inne'),
      }))
      // Odfiltruj transakcje z amount <= 0 (błędy AI)
      .filter(t => t.amount > 0);

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (e) {
    console.error('Parse error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: 'parse_error', transactions: [] }) };
  }
};
