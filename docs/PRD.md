# PRD — CashFlow: Domowy Tracker Finansów

**Wersja:** 1.0  
**Data:** Kwiecień 2026  
**Status:** Aktywny rozwój

---

## 1. Problem / Kontekst

Większość Polaków nie wie dokładnie, na co wydaje pieniądze. Arkusze kalkulacyjne są skomplikowane, a dedykowane aplikacje bankowe pokazują tylko historię transakcji — bez analizy, bez celów, bez podpowiedzi. Efekt: poczucie, że "pieniądze gdzieś uciekają", brak kontroli nad budżetem domowym i niemożność odkładania oszczędności.

**CashFlow** rozwiązuje ten problem: to prosta, wizualna aplikacja do śledzenia przychodów i wydatków, która nie tylko pokazuje dane, ale aktywnie pomaga zarządzać finansami metodą **Pay Yourself First** — najpierw odkładasz, resztą zarządzasz.

---

## 2. Persony

### 👩 Anna, 34 lata — Mama i freelancerka
- **Sytuacja:** Pracuje zdalnie, dwoje dzieci, kredyt hipoteczny, 800+
- **Frustracja:** "Nie wiem gdzie mi schodzi ta pensja. Niby zarabiam dobrze, ale na koniec miesiąca zostaje mi grosze."
- **Potrzeba:** Chce widzieć gdzie idą pieniądze, odkładać na wakacje i kontrolować wydatki na dzieci

### 👨 Marek, 28 lat — Młody specjalista
- **Sytuacja:** Singiel, wynajmuje mieszkanie, spłaca pożyczkę studencką, chce kupić auto
- **Frustracja:** "Zaczynam miesiąc z planem, ale zawsze coś wypadnie i plan się sypie"
- **Potrzeba:** Jasne alerty gdy przekracza budżet, cele oszczędnościowe z konkretnym planem spłaty

---

## 3. User Stories

### Budżet
- Jako użytkownik, chcę szybko dodać wydatek (kwota, kategoria, opis), aby nie tracić czasu na bookkeeping
- Jako użytkownik, chcę dodać wpływ (wynagrodzenie, 800+, freelance), aby aplikacja znała moje realne przychody
- Jako użytkownik, chcę widzieć historię wydatków i wpływów z bieżącego miesiąca, aby wiedzieć co się wydarzyło
- Jako użytkownik, chcę usunąć błędny wpis z historii, aby saldo było poprawne
- Jako użytkownik, chcę być ostrzeżony gdy próbuję dodać podobny wydatek drugi raz w tym miesiącu, aby unikać duplikatów
- Jako użytkownik, chcę przeglądać historyczne miesiące, aby zobaczyć co wydawałam w lutym

### Zdrowie finansowe
- Jako użytkownik, chcę widzieć "ocenę zdrowia finansowego" (0-100), aby w jednym spojrzeniu ocenić swój miesiąc
- Jako użytkownik, chcę dostawać alerty gdy przekraczam 80% przychodów, gdy jedna kategoria dominuje budżet, i gdy oszczędzam mniej niż 20%, aby reagować na czas

### Cele oszczędnościowe
- Jako użytkownik, chcę dodać cel (np. "Wakacje 2026 — 5000 zł do lipca"), aby mieć konkretny target
- Jako użytkownik, chcę odkładać pieniądze na cel i widzieć postęp na pasku, aby motywować się do oszczędzania
- Jako użytkownik, chcę aby wpłata na cel ZMNIEJSZAŁA moje saldo, bo te pieniądze naprawdę wychodzą
- Jako użytkownik, chcę aby po usunięciu celu znikały też jego wpłaty z historii, aby saldo było spójne

### Przegląd
- Jako użytkownik, chcę widzieć wykres wydatków per kategoria, aby zidentyfikować gdzie "ucieka" budżet
- Jako użytkownik, chcę pobrać raport PDF za bieżący miesiąc, aby pokazać go partnerowi lub zachować dla siebie
- Jako użytkownik, chcę widzieć podsumowanie roczne (wpływy, wydatki, saldo za cały rok), aby planować finanse długoterminowo

### Asystent AI
- Jako użytkownik, chcę zapytać "na co wydaję najwięcej?", aby dostać personalizowaną analizę moich danych
- Jako użytkownik, chcę dostać poradę jak poprawić swoje oszczędności, aby nie musieć samemu analizować liczb

### Powiadomienia
- Jako użytkownik, chcę dostawać codzienne powiadomienie o 20:00 z podsumowaniem salda, aby mieć aplikację "pod ręką" nawet bez otwierania

---

## 4. User Flows

### Flow 1: Dodawanie wydatku
1. Użytkownik otwiera aplikację → zakładka Budżet (domyślna)
2. Widzi formularz z polami: Kwota, Kategoria, Opis
3. Wpisuje dane → klika "Dodaj wydatek"
4. Jeśli podobny wpis istnieje w tym miesiącu → pojawia się modal z ostrzeżeniem
5. Potwierdza lub anuluje
6. Historia i statystyki odświeżają się natychmiast

### Flow 2: Odkładanie na cel
1. Użytkownik przechodzi do zakładki Cele
2. Widzi swoje cele z paskami postępu
3. Wpisuje kwotę w polu obok celu → klika "+ Odłóż"
4. Kwota pojawia się w historii jako "🎯 Oszczędności: Dom"
5. Saldo natychmiast spada o tę kwotę
6. Pasek postępu celu się wypełnia

### Flow 3: Przeglądanie historycznych miesięcy
1. Użytkownik widzi "‹ Kwiecień 2026 ›" na górze Budżetu
2. Klika "‹" → przechodzi do marca
3. Historia, statystyki, zdrowie finansowe — wszystko zmienia się na marzec
4. Może wrócić do bieżącego miesiąca klikając "›"

---

## 5. Features (MoSCoW)

### ✅ Must Have — ZROBIONE
- Dodawanie/usuwanie wydatków i wpływów z kategoriami
- Saldo miesięczne (wpływy − wydatki − cele)
- Historia wpisów z filtrem (wszystko/wydatki/wpływy)
- Zdrowie finansowe (score 0-100, Pay Yourself First)
- Alerty i rekomendacje finansowe
- Cele oszczędnościowe z paskami postępu
- Wykresy kategorii i Top kategorie
- Firebase Auth (logowanie/rejestracja)
- Synchronizacja danych przez Firestore
- Eksport PDF

### ✅ Should Have — ZROBIONE
- Asystent AI (Claude) z kontekstem danych użytkownika
- Powiadomienia push (codzienne o 20:00)
- Ochrona przed duplikatami
- Nawigacja między miesiącami (‹ ›)
- Podsumowanie miesięczne (saldo, zdrowie, top kategorie)
- Kalkulator 800+ (wielodzietność)
- Offline detection
- Service Worker

### 🔲 Could Have — DO ZROBIENIA
- **Podsumowanie roczne** (wpływy, wydatki, saldo za rok, breakdown miesięczny)
- Edycja istniejącego wpisu (teraz tylko delete + dodaj nowy)
- Eksport CSV
- Budżet miesięczny z limitami per kategoria (np. max 500 zł na jedzenie)
- Ciemny motyw (dark mode)
- Porównanie miesięcy (kwiecień vs marzec)

### ❌ Won't Have (v1)
- Importowanie wyciągów bankowych
- Wielowalutowość
- Wersja dla par/rodzin (współdzielony budżet)
- Inwestycje i portfele
- Prognozowanie z AI

---

## 6. Acceptance Criteria

### Saldo
- **Given** użytkownik ma wpływy 5000 zł i wydatki 3000 zł i odkłada 500 zł na cel
- **When** patrzy na saldo
- **Then** widzi 1500 zł (5000 − 3000 − 500) w nagłówku, w statystykach i w Przeglądzie

### Duplikaty
- **Given** użytkownik dodał "Netflix — Subskrypcje — 49 zł" w tym miesiącu
- **When** próbuje dodać ponownie "Netflix — Subskrypcje"
- **Then** widzi modal z ostrzeżeniem i może anulować lub dodać mimo to

### Cele
- **Given** użytkownik usuwa cel "Wakacje"
- **When** patrzy na historię
- **Then** wszystkie wpłaty "🎯 Oszczędności: Wakacje" zniknęły, saldo wzrosło

### Nawigacja miesięczna
- **Given** jest kwiecień 2026
- **When** użytkownik klika "‹"
- **Then** widzi historię i statystyki marca 2026, nie może kliknąć "›" poza bieżący miesiąc

---

## 7. Non-Functional Requirements

- **Prywatność:** Każdy użytkownik widzi wyłącznie swoje dane. Bez możliwości dostępu do cudzych danych.
- **Szybkość:** Każda akcja (dodanie wpisu, usunięcie) odzwierciedla się natychmiast na ekranie — bez przeładowania strony
- **Offline:** Jeśli użytkownik straci internet, aplikacja zachowuje się normalnie (dane z lokalnego cache) i synchronizuje po powrocie połączenia
- **Mobile-first:** Aplikacja działa płynnie na telefonie — jeden palec wystarczy do wszystkich akcji
- **Bezpieczeństwo:** Klucz API do AI nigdy nie jest widoczny dla użytkownika

---

## 8. Design / UI

- Minimalistyczny, jasny interfejs — bez przytłaczania danymi
- Kolor akcentu: różowo-pomarańczowy gradient (brand CashFlow)
- Kolor niebezpieczeństwa: czerwony; sukcesu: zielony — intuicyjne
- Dolna nawigacja na mobile (thumb-friendly)
- Górna nawigacja z zakładkami na desktop
- Dane finansowe wyraźnie większe od etykiet — liczby są bohaterem

---

## 9. Success Metrics

- Użytkownik dodaje co najmniej 5 wpisów w pierwszym tygodniu
- Użytkownik wraca do aplikacji minimum 3x w tygodniu
- Zdrowie finansowe użytkownika rośnie po 2 miesiącach użytkowania
- PDF jest pobierany co najmniej raz na miesiąc

---

## 10. Out of Scope (v1)

- Automatyczne importowanie transakcji z banku
- Współdzielony budżet dla par/rodzin
- Obsługa kryptowalut i inwestycji
- Wersja anglojęzyczna (tylko PL)
- Aplikacja natywna iOS/Android (tylko web)
