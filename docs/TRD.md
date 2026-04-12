# TRD — CashFlow: Technical Requirements Document

**Wersja:** 1.0  
**Data:** Kwiecień 2026  
**Stack:** Vanilla JS / HTML / CSS + Firebase + Netlify

---

## 1. Architektura systemu

```
┌─────────────────────────────────────────┐
│           FRONTEND (index.html)          │
│  Vanilla JS — Single Page Application   │
│                                          │
│  Moduły:                                 │
│  • State Management (globalne zmienne)  │
│  • Selektory (getMonth*, getYear*)      │
│  • Render functions (renderStats etc.)  │
│  • UI Components (modals, toasts)       │
└────────────┬───────────────┬────────────┘
             │               │
    ┌────────▼──────┐ ┌──────▼──────────┐
    │   Firebase    │ │ Netlify Function │
    │  Auth + Fire- │ │  /chat (proxy)  │
    │  store (NoSQL)│ │                 │
    └───────────────┘ └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │  Claude API     │
                      │  (Anthropic)    │
                      └─────────────────┘
```

---

## 2. Stos technologiczny

| Warstwa | Technologia | Wersja | Cel |
|---------|-------------|--------|-----|
| Frontend | HTML5 / CSS3 / Vanilla JS | ES2022 | SPA, jeden plik |
| Hosting | Netlify | — | CDN, HTTPS, deploy z GitHub |
| Auth | Firebase Authentication | 10.8.0 | Email/password login |
| Baza danych | Firebase Firestore | 10.8.0 compat | NoSQL, dane per-user |
| AI Proxy | Netlify Functions | Node.js 18 | Ukrycie klucza Anthropic |
| AI Model | Claude (Anthropic) | claude-haiku | Asystent finansowy |
| PDF | jsPDF | cdnjs | Generowanie raportów |
| Powiadomienia | Web Notifications API + SW | — | Push daily 20:00 |
| Czcionki | Plus Jakarta Sans, Inter | Google Fonts | UI typography |

---

## 3. Model danych

### Firestore — struktura dokumentu

```
users/{uid}/
  expenses: Array<Expense>
  incomes:  Array<Income>
  goals:    Array<Goal>
  updatedAt: ISO string
```

### Typy danych

```typescript
interface Expense {
  id: number;          // Date.now()
  amount: number;      // PLN, zawsze > 0
  cat: string;         // klucz z CAT_META
  desc: string;        // opis użytkownika lub label kategorii
  date: string;        // YYYY-MM-DD
}

interface Income {
  id: number;
  amount: number;
  cat: string;         // klucz z INC_META
  desc: string;
  date: string;        // YYYY-MM-DD
}

interface Goal {
  id: number;
  name: string;
  target: number;      // kwota celu w PLN
  deadline: string;    // YYYY-MM (format miesiąc-rok)
  saved: number;       // ZAWSZE recalkulowane z historii expenses
  emoji: string;       // auto-generowane przez goalEmoji()
}
```

### Kategorie wydatków (CAT_META)

```
oszczednosci, jedzenie, cafe, transport, dom, kredyt, pozyczka,
zdrowie, rozrywka, sport, travel, beauty, gifts, electronics,
education, childcare, inne
```

### Kategorie wpływów (INC_META)

```
wynagrodzenie, premia, freelance, 800plus, zwrot, rodzina, inne_inc
```

---

## 4. State Management

### Globalne zmienne stanu

```javascript
let expenses     = [];          // tablica wydatków (z Firestore)
let incomes      = [];          // tablica wpływów (z Firestore)
let goals        = [];          // tablica celów (z Firestore)
let selectedMonth = 'YYYY-MM';  // aktywny miesiąc (nawigacja)
let filterMonth   = 'YYYY-MM';  // filtr w Przeglądzie
let histFilter    = 'all';      // filtr historii: all/exp/inc
let currentUser   = null;       // Firebase User object
let isTyping      = false;      // rate limit AI
```

### Selektory (pure functions)

```javascript
// Miesiąc
getMonthExpenses(month)        // wszystkie wydatki danego miesiąca
getMonthBudgetExpenses(month)  // wydatki bez wpłat na cele
getMonthIncomes(month)         // wpływy danego miesiąca

// Rok
getYearExpenses(year)          // wszystkie wydatki roku
getYearBudgetExpenses(year)    // wydatki roku bez celów
getYearGoalExpenses(year)      // tylko wpłaty na cele w roku
getYearIncomes(year)           // wpływy roku

// Aliasy (używają selectedMonth)
thisMonthExpenses()
thisMonthBudgetExpenses()
thisMonthIncomes()
```

### Formuła salda (wszędzie jednolita)

```
balance = totalInc - totalExp - totalGoal
```

gdzie:
- `totalInc` = suma wpływów danego okresu
- `totalExp` = suma wydatków BEZ wpłat na cele
- `totalGoal` = suma wpłat na cele

**Stosowana w:** `updateHeaderTotal`, `renderStats`, `renderCharts`, `renderMonthlySummary`, `calcHealthScore`, `renderAlerts`, `exportPDF`, `botReply`, `sendDailyNotification`

---

## 5. Kluczowe funkcje i ich odpowiedzialność

### Zapis danych

```javascript
async function save()           // expenses + incomes → localStorage + Firestore
async function saveToFirestore()// expenses + incomes + goals → Firestore
function saveGoals()            // goals → localStorage + Firestore
async function setState(patch)  // patch dowolnych zmiennych → zapis + render
```

### Render pipeline

```javascript
function render() {
  renderList()           // historia bieżącego miesiąca
  renderStats()          // statystyki (wpływy, wydatki, saldo, %)
  renderCharts()         // wykresy kategorii, top, dzienny
  renderMonthlySummary() // podsumowanie z kartami
  renderMonthButtons()   // przyciski miesięcy w Przeglądzie
  updateHeaderTotal()    // saldo w nagłówku
  renderHealthScore()    // score 0-100 z kolorem i opisem
  renderAlerts()         // alerty Pay Yourself First
  updateMonthNav()       // pasek nawigacji ‹ Kwiecień 2026 ›
}
```

### Logika celów (krytyczna)

```javascript
// g.saved ZAWSZE recalkulowane z historii — nigdy nie trzymane osobno
g.saved = expenses
  .filter(e => isGoalSaving(e) && e.desc.includes(g.name))
  .reduce((s, e) => s + e.amount, 0);

// Wpłata na cel = wydatek w historii z cat:'oszczednosci'
// Usunięcie celu = usunięcie wszystkich powiązanych wydatków z historii
```

### Zdrowie finansowe — algorytm score

```
Score (0-100):
  60 pkt — oszczędności (savePct ≥ 20% → 60 pkt, skalowane w dół)
  20 pkt — kontrola wydatków (totalExp/totalInc ≤ 80%)
  10 pkt — różnorodność wpływów (> 1 źródło)
  10 pkt — cele oszczędnościowe (ma jakikolwiek cel z > 0 saved)
```

---

## 6. Bezpieczeństwo

### Klucze API

| Klucz | Gdzie przechowywany | Czy widoczny dla usera |
|-------|---------------------|------------------------|
| Anthropic (Claude) | Netlify env variable | ❌ Nigdy |
| Firebase API key | index.html (publiczny) | ✅ Normalny standard |
| Firebase Auth | Firebase Console | ❌ |

### Firebase Security Rules (wymagane w Console)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### Ochrona przed duplikatami

```javascript
function checkDuplicate(list, cat, desc) {
  const m = today().slice(0, 7); // bieżący miesiąc
  return list.find(e =>
    e.date.startsWith(m) &&
    e.cat === cat &&
    e.desc.toLowerCase().trim() === desc.toLowerCase().trim()
  );
}
```

### Rate limiting AI

```javascript
let isTyping = false; // blokuje kolejny request gdy AI odpowiada
```

---

## 7. Netlify Function — /chat

```javascript
// netlify/functions/chat.js
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-haiku-...',
    max_tokens: 1000,
    system: systemPrompt, // dane finansowe usera
    messages: [{ role: 'user', content: query }]
  })
});
```

System prompt zawiera: totalInc, totalExp, balance, catSummary, recentExp (ostatnie 8 transakcji).

---

## 8. Service Worker (sw.js)

- **Rejestracja:** `navigator.serviceWorker.register('/sw.js')` przy `window.load`
- **Powiadomienia:** `new Notification()` — lokalnie, bez serwera push
- **Harmonogram:** `setInterval` co godzinę sprawdza czy jest 20:00 i czy nie wysłano już dziś
- **Treść powiadomienia:** saldo + procent wydanych + zdrowie finansowe

**Ograniczenie:** Powiadomienia działają tylko gdy przeglądarka jest otwarta (brak VAPID/push subscription).

---

## 9. PDF Export — struktura raportu

```
Strona 1:
  Header gradient (CashFlow + miesiąc + zdrowie finansowe)
  4 kafelki: WPŁYWY | WYDATKI | CELE | SALDO
  Sekcja: Wydatki wg kategorii (pasek per kategoria + %)
  Sekcja: Top kategorie (ranking z paskami)
  Sekcja: Cele oszczędnościowe (pasek postępu per cel)
  Footer

Nowa strona jeśli y > 268mm
```

---

## 10. Migracja danych (loadUserData)

Przy każdym załadowaniu aplikacja:

```javascript
1. Pobiera dane z Firestore
2. Migruje stare wpłaty celów: cat:'inne' → cat:'oszczednosci'
3. Usuwa wpłaty celów które nie mają już odpowiadającego celu
4. Recalkuluje g.saved dla każdego celu z historii expenses
5. Jeśli były zmiany → zapisuje z powrotem do Firestore
```

---

## 11. Plan testowania

### Testy manualne — krytyczne ścieżki

| Test | Kroki | Oczekiwany wynik |
|------|-------|------------------|
| Saldo | Dodaj wpływ 5000, wydatek 3000, cel 500 | Saldo = 1500 wszędzie |
| Duplikat | Dodaj "Netflix/Subskrypcje" dwa razy | Modal ostrzeżenia przy 2. próbie |
| Usunięcie celu | Utwórz cel, wpłać 500, usuń cel | Historia czysta, saldo +500 |
| Nawigacja | Kliknij ‹ z kwietnia | Marzec: inna historia i statystyki |
| AI | Zapytaj "jakie moje saldo?" | Odpowiedź zgodna z danymi |
| PDF | Pobierz PDF | Liczby zgodne z widokiem aplikacji |
| Offline | Odłącz internet, dodaj wydatek | Toast info, dane w localStorage |

### Testy bezpieczeństwa

| Test | Kroki | Oczekiwany wynik |
|------|-------|------------------|
| XSS | Wpisz `<script>alert(1)</script>` jako opis | Wyświetla jako tekst, nie wykonuje |
| Auth guard | Otwórz Firestore bez logowania | Odmowa dostępu (rules) |
| API key | Sprawdź Network tab w DevTools | Brak klucza Anthropic w requestach |

---

## 12. Ryzyka techniczne

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Firestore rules zbyt otwarte | Wysokie | Krytyczny | Ustawić rules w Console natychmiast |
| Brak CORS w Netlify Function | Średnie | Wysoki | Dodać `Access-Control-Allow-Origin` header |
| g.saved rozjazd z historią | Niskie (naprawione) | Wysoki | Recalkulacja przy każdym loadUserData |
| localStorage nadpisanie przez Firestore | Niskie | Średni | Offline detection + kolejka sync |
| jsPDF — polskie znaki | Niskie (naprawione) | Niski | Funkcja `pl()` stripuje diakrytyki |

---

## 13. Do zrobienia — backlog techniczny

### Priorytet wysoki
- [ ] Weryfikacja Firestore Security Rules w Firebase Console
- [ ] Podsumowanie roczne — przenieść HTML do `panel-przeglad` (bug pozycjonowania)
- [ ] Edycja istniejącego wpisu (CRUD bez usuwania)

### Priorytet średni
- [ ] VAPID push notifications — powiadomienia bez otwartej przeglądarki
- [ ] Eksport CSV
- [ ] Budżet miesięczny per kategoria (limit + alert przekroczenia)
- [ ] Porównanie miesięcy w Przeglądzie

### Priorytet niski
- [ ] Dark mode (prefers-color-scheme)
- [ ] Animacje przejść między zakładkami
- [ ] Filtr kategorii w historii
- [ ] Wyszukiwarka w historii (po opisie)
