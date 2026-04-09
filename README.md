💸 CashFlow — Domowy Tracker Finansów
> Aplikacja webowa do zarządzania budżetem domowym z asystentem AI, systemem logowania i inteligentnymi alertami finansowymi.
🌐 Zobacz działającą aplikację
---
📌 O projekcie
CashFlow to aplikacja zaliczeniowa stworzona z pomocą narzędzi AI (Claude, Anthropic). Pomaga użytkownikom kontrolować wydatki, śledzić wpływy, wyznaczać cele oszczędnościowe i otrzymywać spersonalizowane porady finansowe oparte na metodzie Pay Yourself First.
Projekt powstał z osobistej potrzeby — chęci lepszego zarządzania finansami domowymi.
---
✨ Funkcje
💰 Wydatki i wpływy
Dodawanie wydatków i wpływów z 14 kategoriami
Historia transakcji z filtrowaniem
Dynamiczne podpowiedzi opisu dla każdej kategorii
📊 Przegląd i analizy
Wykresy wydatków według kategorii
Wykres dzienny (ostatnie 14 dni)
Top wydatki miesiąca
Porównanie wpływów i wydatków
Eksport do PDF — jednym kliknięciem
🏥 Zdrowie finansowe
Ocena budżetu w skali 0-100
Inteligentne alerty oparte na metodzie Pay Yourself First (cel: 20% oszczędności)
Ostrzeżenia gdy wydatki przekraczają limity
🎯 Cele oszczędnościowe
Dodawanie celów z terminem i kwotą
Pasek postępu z kolorem zależnym od realizacji
Obliczanie miesięcznej kwoty do odkładania
📅 Stałe wydatki
Zarządzanie powtarzającymi się wydatkami (czynsz, subskrypcje itp.)
Dodawanie wszystkich stałych jednym kliknięciem
🤖 Asystent AI
Prawdziwy AI (Claude, Anthropic) zintegrowany przez Netlify Functions
Rozumie pytania po polsku
Analizuje dane użytkownika i daje spersonalizowane porady
Klucz API ukryty — bezpieczna architektura proxy
🔐 Logowanie i bezpieczeństwo
Rejestracja i logowanie przez email/hasło (Firebase Authentication)
Dane każdego użytkownika przechowywane w chmurze (Firebase Firestore)
Dostęp z każdego urządzenia po zalogowaniu
🔔 Powiadomienia
Powiadomienia push (Service Worker)
Codzienny raport o 20:00
📱 Responsywność
Dolny pasek nawigacji na telefonie
Zoptymalizowany interfejs na urządzenia mobilne
---
🛠️ Technologie
Technologia	Zastosowanie
HTML5 / CSS3 / JavaScript	Frontend aplikacji
Firebase Authentication	System logowania użytkowników
Firebase Firestore	Baza danych w chmurze
Netlify Functions	Serwer proxy dla API (bezpieczeństwo)
Claude API (Anthropic)	Asystent AI
jsPDF	Generowanie raportów PDF
Service Worker	Powiadomienia push
GitHub	Repozytorium kodu
Netlify	Hosting i deployment
---
🚀 Jak uruchomić lokalnie
Aplikacja nie wymaga instalacji — wystarczy otworzyć plik `index.html` w przeglądarce.
Jednak funkcje AI i logowanie wymagają połączenia z internetem (Firebase + Netlify).
---
📁 Struktura projektu
```
home-expense-tracker/
├── index.html              # Główna aplikacja (HTML + CSS + JS)
├── sw.js                   # Service Worker (powiadomienia push)
├── netlify/
│   └── functions/
│       └── chat.js         # Proxy dla Claude API (ukryty klucz)
└── README.md               # Dokumentacja projektu
```
---
🔒 Bezpieczeństwo
Klucz API Claude nie jest przechowywany w kodzie aplikacji
Klucz jest ukryty jako zmienna środowiskowa na Netlify
Komunikacja przez serwer proxy (Netlify Functions)
Dane użytkowników chronione przez Firebase Authentication
---
💡 Metodologia finansowa
Alerty i ocena zdrowia finansowego oparta na metodzie Pay Yourself First:
Cel: odkładanie minimum 20% wpływów
Alarm: gdy oszczędności spadają poniżej 10%
Ostrzeżenie: gdy jedna kategoria przekracza 25% budżetu do wydania
Sukces: gdy osiągasz lub przekraczasz 20% oszczędności
---
👩‍💻 Autorka
Anna Karpińska — projekt zaliczeniowy  
Narzędzia AI użyte do stworzenia projektu: Claude (Anthropic)
---
📄 Licencja
Projekt edukacyjny — stworzony na potrzeby zaliczenia.
