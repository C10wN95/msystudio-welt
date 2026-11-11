# Bauplan der Welt: 1000 Figuren für MSY Studio

**Stand:** 07.11.2026 · **Herausgeber:** MSY Studio
**Dateien:** `welt/bauplan.json` (maschinenlesbar, Grundlage des Generators) und diese Datei (lesbar). Prüfskript: `werkzeug/bauplan-pruefen.mjs`.
**Alle Quellen abgerufen am 07.11.2026.** Liste am Ende (Q01–Q52), danach Lizenzen und Namensnennung.

## Fragestellung

Wie muss eine Welt aus 1000 Figuren gebaut sein, damit sie echte Menschen in Deutschland, der Türkei und der Diaspora glaubwürdig abbildet: mit Orten, Altersaufbau, Familien, Schulen, Berufen, Namen, Freundesnetzen, Problemen, Geräten, Spielgewohnheiten und Denkstil, ohne Zielgruppen und ohne Projekt-Tags?

## Kernergebnis

| Bereich | Ergebnis | Konfidenz |
|---|---|---|
| Orte | 20 echte Nachbarschaften in 12 Ländern, je 2–4 Stadtteile; DE 450, TR 300, andere 250 Figuren | Vorgabe, Auswahl begründet |
| Alter | Altersaufbau je Land nach UN-Daten für 2026; Minderjährige (12–17) bewusst auf 13,5 % angehoben | gesichert (Datenbasis), Anhebung ist Vorgabe |
| Haushalte | Haushaltsformen je Land, Ehe nach Alter, Kinderzahl, Abstände Eltern–Kind und Partner | DE und TR wahrscheinlich, andere Länder geschätzt |
| Bildung | Schulformen je Land und Bundesland, Abschlüsse nach Alter, 54 echte Hochschulen, 96 erfundene Schulnamen | DE und TR gesichert bis wahrscheinlich |
| Tätigkeiten | 488 Berufsbezeichnungen in 33 Branchen mit Bildung, Einkommensstufe, Arbeitszeiten, Frauenanteil, Häufigkeit; Status nach Alter für DE und TR; Einkommen je Land | Status wahrscheinlich, Einzelwerte je Beruf geschätzt |
| Namen | 2125 verschiedene Vornamen in 44 Pools nach Herkunft, Generation und Geschlecht; 1201 Nachnamen; Familienregeln je Herkunft | zusammengestellt, wahrscheinlich |
| Soziales | Freundeszahl, Netz in der Welt, Online-Freunde, Einsamkeit, Treff-Erlaubnis, 16 Treff-Hindernisse, 8 Muster freier Zeit, 11 Kreisarten | Einsamkeit DE gesichert, Rest geschätzt |
| Probleme | 21 Problemarten mit Häufigkeit nach Alter für DE und TR | Schulden, Armut, Depression, Pflege gesichert; Rest geschätzt |
| Geräte | iPhone-Anteil je Land (Statcounter Oktober 2026 und Mittel Januar–Oktober), Handyklassen, Zustand, Konsole und PC | iOS gemessen, Rest geschätzt |
| Spielen | Anteil Spielender nach Alter und Geschlecht, beliebte Spiele je Land und Alter, Bluff, Ehrgeiz, Anleitung | Gesamtzahlen gesichert, Verteilungen geschätzt |
| Denkstil | 70 % Mensch, 30 % KI, unabhängig gezogen; 10 benannte Spielarten des KI-artigen Denkens | Vorgabe |

**Prüfung:** `bauplan-pruefen.mjs` meldet keine Fehler (20 Orte, 1000 Figuren, 13,5 % Minderjährige, 488 Berufe, 2125 Vornamen, 1201 Nachnamen, 52 Quellen). Positivkontrolle: eine absichtlich kaputte Kopie mit 7 eingebauten Fehlern wurde vollständig erkannt.

## Bewusste Abweichungen von der Wirklichkeit

1. **Minderjährige übergewichtet:** Real sind in den 12 Ländern (gewichtet nach Figuren) 8,0 % der Menschen ab 12 Jahren minderjährig. Die Welt hat 13,5 % (Vorgabe 12–15 %), weil Kinder von Figurenpaaren selbst Figuren sind. Alle Länder werden mit demselben Faktor 1,66 angehoben, die Erwachsenen anteilig gesenkt.
2. **Türkische und kurdische Wurzeln übergewichtet:** In den deutschen Orten haben rund 27 % der Figuren türkische oder kurdische Wurzeln (real 3–4 % der Bevölkerung in Deutschland), weltweit rund 46 %. Grund: Vorgabe 45 % DE, 30 % TR, 25 % Diaspora und andere.
3. **Zugewanderte in Europa übergewichtet:** Nur 49 % der deutschen Figuren haben keine Einwanderungsgeschichte (real 68,6 %, Q03). Deshalb sind die Figuren in DE, NL, BE, AT, CH, FR, GB und US etwas jünger als ihr Land (Zielverteilung `welt_mischung`).
4. **Orte sind Ausschnitte:** 20 echte Nachbarschaften, kein repräsentatives Abbild ganzer Länder. Innerhalb der Gruppen gelten echte Verteilungen.

## Aufbau von bauplan.json

| Schlüssel | Inhalt |
|---|---|
| `meta` | Zweck, Lizenz, Konventionen (Anteile 0–1, Ländercodes, Basis gemessen, abgeleitet, geschaetzt, vorgabe), Abweichungen, Hinweise zum Generator |
| `quellen` | Q01–Q52 mit Titel, Herausgeber, URL, Datum, Abruf, Zweck und Bedingungen mit Namensnennung (`lizenz`) |
| `ziel` | 1000 Figuren, 70/30, 12–15 % Minderjährige, Ländergruppen, mindestens 350 Berufe bei Berufstätigen |
| `orte` | 20 Orte mit Land, Figurenzahl, Stadtteilen (Anteil, Beschreibung), Sprachen, Herkunftsmischung, Glaube, Mobilität, Treffpunkten, Schulsystem |
| `herkunft` | 42 Herkunftsgruppen mit Namenspool, Sprachen, Glaubensverteilung; Glaubenspraxis |
| `alter` | Bänder, Methode, je Land `real`, `welt`, `welt_mischung`, `frauenanteil`, `erwartete_figuren`, Median; UN-Rohdaten |
| `haushalte` | Personenanteile je Haushaltsform und Land, Kennzahlen, Korrekturen, Paarregeln, Ehe nach Alter, Partnerabstand, Kinderzahl, Elternalter, Auszug, Mehrgenerationen |
| `bildung` | Abschluss-Codes, Schulformen 12–17 je Land und Bundesland, Abschlüsse Erwachsener, Studium, echte Hochschulen, erfundene Schulnamen je Ort |
| `taetigkeiten` | `katalog` (488 Berufe), Feldbeschreibung, Zeiten-Legende, `status` je Alter (DE, TR, andere), `einkommen` (Stufen je Land, Schicht) |
| `namen` | Generationen g1–g4, Regeln, Ausschlüsse, Sperrliste Prominenter, Familienregeln je Herkunft, 44 Pools, Zuordnung Herkunft → Pool |
| `sozial` | enge Freunde, Netz in der Welt, Online-Freunde, Einsamkeit, Treff-Erlaubnis, Hindernisse, freie Zeiten, Kreise, Sprachen |
| `probleme` | Regeln, 21 Arten mit Häufigkeit je Alter (DE, TR, andere), Lebensereignisse, Identität |
| `geraete` | iOS-Monatswerte und Auswertung je Land, Projektvorgabe, Modifikatoren, Marken, Klassen, Zustand, Konsole, PC, Tablet |
| `spielen` | Videospiele nach Alter und Geschlecht, analoge Spiele, beliebte Spiele, Partyspiele, Bluff, Ehrgeiz, Anleitung, Spieleabend-Kultur |
| `denkstil` | 70/30, Unabhängigkeitsregel, Mensch-Färbungen, 10 KI-Spielarten mit Anteilen und Beispielsätzen |
| `digital_medien` | Zusatz: Social Media, generative KI, Online-Einkauf, Anime, Kleinbetriebe |
| `pruefregeln` | 13 Regeln für Generator und Prüfskripte |
| `leitplanken_qualitaet` | Einzelfall, Widerspruch-Beispiele, Verbote, Vorschlag für Steckbrief-Felder |

**Empfohlene Reihenfolge im Generator:** Orte und Herkunft → Haushalte (Paare, Kinder, Mehrgenerationen) → Alter und Geschlecht passend zum Haushalt → Bildung und Tätigkeit → Einkommen und Schicht → Gerät → Probleme → Freundesnetz und Kreise → Spielen → Denkstil zuletzt und unabhängig. Fester Startwert, damit die Welt wiederholbar ist. Die Datei ist rund 340 KB groß: Ein Skript liest sie ganz, Agenten nur die Abschnitte, die sie brauchen.

## 1. Orte

| Ort | Land | Figuren | Stadtteile | größte Herkunftsgruppen |
|---|---|---|---|---|
| Berlin | DE | 110 | Neukölln (Nord), Kreuzberg (SO 36), Spandau, Marzahn-Hellersdorf | deutsch 40 %, türkisch 27 %, arabisch 9 %, russlanddeutsch 6 % |
| Köln | DE | 90 | Ehrenfeld, Mülheim, Chorweiler, Lindenthal | deutsch 48 %, türkisch 28 %, italienisch 4 % |
| Duisburg (Ruhrgebiet) | DE | 90 | Marxloh, Hochfeld, Rheinhausen, Neudorf | deutsch 42 %, türkisch 33 %, arabisch 5 %, Südosteuropa 10 % |
| Region Stuttgart | DE | 90 | Bad Cannstatt, Zuffenhausen, Schorndorf (Kleinstadt), Dorf im Rems-Murr-Kreis | deutsch 48 %, türkisch 22 %, italienisch 7 %, Ex-Jugoslawien 6 % |
| Leipzig und Umland | DE | 70 | Connewitz, Grünau, Eisenbahnstraße, Wurzen (Kleinstadt) | deutsch 76 %, arabisch 5 % |
| İstanbul | TR | 120 | Bağcılar, Esenyurt, Kadıköy, Üsküdar | türkisch 62 %, kurdisch 16 %, syrisch 6 %, Balkan 6 % |
| Ankara | TR | 50 | Çankaya, Keçiören, Mamak, Etimesgut/Eryaman | türkisch 81 %, kurdisch 10 % |
| İzmir | TR | 45 | Karşıyaka, Bornova, Buca, Konak | türkisch 70 %, kurdisch 14 %, Balkan 10 % |
| Kayseri | TR | 40 | Melikgazi, Kocasinan, Talas, Develi (Kleinstadt) | türkisch 86 %, tscherkessisch 6 % |
| Diyarbakır | TR | 45 | Bağlar, Kayapınar, Yenişehir, Sur | kurdisch 78 %, türkisch 14 % |
| Rotterdam | NL | 32 | Feijenoord, Delfshaven, Charlois, Kralingen | türkisch 35 %, niederländisch 35 %, marokkanisch 12 % |
| Brüssel | BE | 25 | Schaerbeek, Saint-Josse, Anderlecht, Woluwe-Saint-Lambert | türkisch 33 %, belgisch 30 %, marokkanisch 15 % |
| Wien | AT | 35 | Favoriten, Ottakring, Brigittenau, Floridsdorf | österreichisch 41 %, türkisch 24 %, Ex-Jugoslawien 15 % |
| Basel | CH | 20 | Kleinbasel, Gundeldingen, St. Johann, Riehen | schweizerisch 40 %, türkisch 18 %, italienisch und albanisch je 10 % |
| London (Nord und Ost) | GB | 32 | Haringey, Enfield, Hackney | britisch 38 %, türkisch-zypriotisch 14 %, türkisch 12 %, kurdisch 10 % |
| Paterson und Clifton (New Jersey) | US | 26 | South Paterson, Eastside/Downtown, Clifton | hispanisch 30 %, türkisch 20 %, US 16 %, afroamerikanisch 14 % |
| Strasbourg | FR | 22 | Hautepierre, Cronenbourg, Neudorf, Bischheim/Schiltigheim | französisch 45 %, türkisch 24 %, maghrebinisch 15 % |
| Kardschali (Kırcaali) | BG | 18 | Zentrum, Wazroschdenzi, Momtschilgrad, Dörfer | Bulgarien-Türken 60 %, bulgarisch 34 % |
| Dubai | AE | 20 | Deira, Al Nahda/Al Qusais, Al Barsha, Jumeirah Village Circle | südasiatisch 35 %, türkisch 15 %, arabisch 15 %, emiratisch 10 % |
| Baku | AZ | 20 | Nəsimi, Yasamal, Xətai, Sabunçu | aserbaidschanisch 88 % |

Warum diese Orte: Die deutschen Orte decken die größten türkeistämmigen Gemeinden ab (Berlin, Köln, Ruhrgebiet, Stuttgart), dazu Ostdeutschland mit wenig Zuwanderung (Leipzig), Kleinstädte und ein Dorf. Die türkischen Orte decken Metropole, Hauptstadt, säkulare Küste, konservatives Zentralanatolien und den kurdisch geprägten Südosten ab. Die übrigen Orte sind die bekannten Zentren der türkischen Diaspora (Q05, Q49) sowie Balkan, Golf und Aserbaidschan. Jeder Ort hat Sprachen, Glaube, Mobilität und typische Treffpunkte, damit Treffen und Absagen glaubwürdig werden. Echte Orte und öffentliche Plätze werden genannt; Firmen und Schulen sind erfunden.

**Konfidenz:** Die Herkunftsmischungen je Ort sind Schätzungen, die sich an bekannten Anteilen orientieren (z. B. NL 2,6 % türkischer Herkunft, Q05); sie sind bewusst auf die Vorgabe zugeschnitten.

## 2. Alter

Datenbasis: UN World Population Prospects 2024 für das Jahr 2026, je Land nach 5-Jahres-Gruppen und Geschlecht (Q01). Gegenprobe Türkei: TÜİK 2025 meldet ein Medianalter von 34,9 Jahren und 11,1 % über 65 (Q02); Deutschland: Menschen mit Einwanderungsgeschichte sind im Schnitt 38,2 Jahre alt, ohne 47,6 (Q03).

| Land | Figuren | Minderjährige real (ab 12) | Minderjährige Welt | Medianalter ab 12 (real) | ohne Einwanderungsgeschichte in der Welt |
|---|---|---|---|---|---|
| DE | 450 | 6,3 % | 10,4 % | 51,3 | 49 % |
| TR | 300 | 10,6 % | 17,6 % | 40,4 | – |
| NL | 32 | 7,1 % | 11,8 % | 47,6 | 35 % |
| BE | 25 | 7,9 % | 13,1 % | 47,8 | 30 % |
| AT | 35 | 6,5 % | 10,8 % | 49,3 | 41 % |
| CH | 20 | 6,9 % | 11,4 % | 48,5 | 40 % |
| GB | 32 | 8,5 % | 14,0 % | 46,3 | 38 % |
| US | 26 | 8,7 % | 14,3 % | 44,7 | 30 % |
| FR | 22 | 8,3 % | 13,7 % | 48,5 | 45 % |
| BG | 18 | 7,0 % | 11,5 % | 49,7 | – |
| AE | 20 | 6,6 % | 10,9 % | 34,7 | – |
| AZ | 20 | 11,3 % | 18,7 % | 39,5 | – |

**Erwartete Figuren je Altersband (ganze Welt):** 12–14: 68 · 15–17: 67 · 18–24: 90 · 25–29: 76 · 30–34: 79 · 35–39: 84 · 40–44: 81 · 45–49: 74 · 50–54: 68 · 55–59: 74 · 60–64: 75 · 65–69: 49 · 70–74: 40 · 75–79: 31 · 80–84: 21 · 85+: 22.

Regeln: Zugewanderte in Europa und den USA sind jünger (25–44 ×1,2, 65+ ×0,5). Diyarbakır ist deutlich jünger als der türkische Schnitt (Şanlıurfa Medianalter 21,8, Q02), Kardschali sehr alt, Dubai fast ohne über 60-Jährige und stark männlich. Frauenanteile je Band stehen im JSON. Toleranz beim Bauen: ±3 Prozentpunkte je Band und Land.

**Konfidenz:** gesichert für die Altersaufbauten; die Anhebung der Minderjährigen ist Vorgabe.

## 3. Haushalte

| Kennzahl | Deutschland | Türkei |
|---|---|---|
| Alleinlebende | 20,6 % der Bevölkerung (2024, Q07); Berlin: 50 % der Haushalte | 20,5 % der Haushalte, rund 7 % der Menschen (2025, Q06) |
| Haushaltsgröße | rund 2 | 3,08 (2025) |
| Großfamilien und Mehrgenerationen | rund 1 % der Menschen | 13,5 % der Haushalte, rund 22 % der Menschen |
| Alleinerziehende | 1,62 Mio. mit Kindern unter 18, 19,4 % der Familien (2025, Q08) | rund 6 % der Menschen (geschätzt) |
| Erstheirat | Frauen 32,8, Männer 35,3 (2023, Q10) | Frauen 26,0, Männer 28,5 (2025, Q09) |
| Verheiratet | rund 50 % der Erwachsenen (2023) | rund 60 % ab 15 (2025, Q13) |
| Scheidungen | rund ein Drittel der Ehen (geschätzt) | 193 793 im Jahr 2025, 34 % in den ersten 5 Jahren (Q09) |
| Geburtenziffer | 1,32 (2025; Deutsche 1,20, Ausländerinnen 1,78, Q11) | 1,42 (2025; Şanlıurfa 3,15, Q12) |
| Alter der Mütter | Erstgeburt rund 30 (geschätzt) | Ø 29,4 bei Geburt (2025, Q12) |
| Auszug aus dem Elternhaus | 23,9 Jahre (2024; EU 26,2, Q47) | meist bei Heirat; 70 % der ledigen 25–29-Jährigen wohnen bei den Eltern (Q06) |

Im JSON stehen dazu Personenanteile je Haushaltsform für alle 12 Länder, Ehe- und Partnerquote je Altersband (DE, TR, Regeln für die anderen), Partner-Altersabstand, abgeschlossene Kinderzahl von Frauen 45–54 (DE 20 % kinderlos), Alter der Mutter bei Geburt, Geschwisterabstand und Korrekturen je Herkunft und Ort.

**Paarregeln:** Zusammenlebende Paare sind immer beide Figuren. Gleichgeschlechtliche Paare in den westlichen Ländern etwa 2–3 % (DE: rund 3 % der Eheschließungen, Q10). Partner in Fernbeziehung oder im Ausland stehen nur als Angabe im Haushalt.

**Konfidenz:** Eckwerte DE und TR gesichert; Ehe nach Alter abgeleitet; andere Länder geschätzt.

## 4. Bildung

- **Deutschland:** Schuljahr 2025/26 bundesweit: 2,31 Mio. am Gymnasium, 1,32 Mio. an Gesamtschulen (neu: Schularten mit drei Bildungsgängen), 0,78 Mio. an Realschulen, 0,72 Mio. an Schularten mit zwei Bildungsgängen, 0,13 Mio. an Hauptschulen (Q14). Die Welt nutzt die Schulformen des jeweiligen Bundeslands: Berlin (ISS, Gymnasium), NRW (Gymnasium, Gesamtschule, Realschule, Hauptschule, Sekundarschule), Baden-Württemberg (Gymnasium, Realschule, Gemeinschaftsschule, Werkrealschule) und Sachsen (Oberschule, Gymnasium). Ab 16 kommen Ausbildung mit Berufsschule, Berufsfachschule und Übergangssystem dazu. 2025 verließen 64 935 Jugendliche die Schule ohne Abschluss (Q14).
- **Türkei:** 2024/25 waren 3,16 Mio. an allgemeinbildenden Lisesi, 1,68 Mio. an beruflichen und 0,49 Mio. an İmam-Hatip-Lisesi; Privatschulanteil 11,6 %; der berufliche Anteil stieg 2025/26 auf 39,5 % (Q15). Prüfungen LGS (14 Jahre) und YKS (17–18) prägen die Jugend.
- **Andere Länder:** NL vmbo, havo, vwo; BE allgemein, technisch, beruflich; AT Mittelschule, AHS, BHS, Lehre; CH Sekundarschule A, E, P, Lehre, Gymnasium; GB GCSE, Sixth Form, College, Apprenticeship; US Middle und High School; FR collège, lycée; BG Profil- und Berufsgymnasium; AE Privatschulen nach britischem, indischem und amerikanischem Lehrplan; AZ allgemeine Schule und Lyzeen.
- **Abschlüsse Erwachsener:** für DE (Schule und Beruf) und TR (höchster Abschluss) nach Altersband. Gemessen: Eingewanderte 25–34 in DE haben zu 33 % einen Hochschulabschluss, aber 36 % keinen Berufsabschluss (Q03).
- **Hochschulen:** echte öffentliche Hochschulen je Ort (z. B. Universität Duisburg-Essen, Marmara Üniversitesi, Dicle Üniversitesi, Erasmus Universiteit). **Weiterführende Schulen sind erfunden:** 96 Namen nach den Namensgewohnheiten jedes Ortes (z. B. „Gesamtschule Marxloh-Schwelgern“, „Kadıköy Lalezar Fen Lisesi“). Zufällige Übereinstimmungen mit echten Schulen sind nicht beabsichtigt.

**Konfidenz:** DE und TR gesamt gesichert; Aufteilung nach Bundesland und Abschlüsse nach Alter geschätzt (Größenordnungen nach Mikrozensus und TÜİK, Einzelwerte nicht abgerufen).

## 5. Tätigkeiten

- **Katalog:** 488 Berufsbezeichnungen in 33 Branchen, je mit Branche, nötiger Bildung, Einkommensstufe 1–5, Richtwert in Euro für DE, typischen Arbeitszeiten (16 Codes wie schicht, nacht, wochenende, frueh, saison), Frauenanteil, Häufigkeitsgewicht 1–9 und Ländern. Enthalten sind auch typische Berufe einzelner Länder: Çaycı, Dolmuş-Fahrer, Kapıcı, Bakkal, Memur, Muhtar, Textilwerkstatt (Atölye), Hafenarbeit in Rotterdam, Öl und Gas in Baku, Tabakbau in Kardschali, Hausangestellte in Dubai, Home Health Aide in New Jersey.
- **Status nach Alter:** DE und TR je Altersband (Schule, Ausbildung, Studium, erwerbstätig, arbeitslos, Haushalt, Elternzeit, Rente, erwerbsunfähig, Dienst, NEET), mit Hinweisen zu Geschlecht und Herkunft; andere Länder als Regeln. Eckwerte: DE 2025 2,948 Mio. Arbeitslose, Quote 6,3 % (Q51), Erwerbstätigenquote 15–64 77 %, Teilzeit Frauen 50,6 %, Männer 14,3 % (Q17); TR 2025 Arbeitslosigkeit 8,3 %, Jugend 15,3 % (Frauen 22,1 %), Unterauslastung 29,7 %, Erwerbstätigenquote 49 % (Q16).
- **Arbeitszeiten DE:** 9,3 % arbeiten zumindest gelegentlich nachts, 27 % am Wochenende; Vollzeit 40,2 Stunden pro Woche (Q42).
- **Einkommen:** Stufen 1–5 je Land in Landeswährung, verankert an Mindestlöhnen 2026 (DE 2 343 €, NL 2 295 €, BE 2 112 €, FR 1 823 €, BG 620 € im Monat, Q20; TR netto 28 075,50 TL, Q19; GB £12,71 je Stunde, New Jersey $15,92, AZ 400 AZN, Q21) und am deutschen Median (54 066 € im Jahr für Vollzeit, Q18). Dazu Schicht (knapp bis wohlhabend) mit DE-Armutsquote 16,1 % (Q36) und TR 20,6 % (Q38).

**Konfidenz:** Eckwerte gesichert; Einkommen, Frauenanteil und Gewicht je Beruf sind Richtwerte (geschätzt).

## 6. Namen

- 44 Pools nach Herkunft, Geschlecht und vier Generationen (g1 1940–1964, g2 1965–1984, g3 1985–2004, g4 2005–2014), zusammen **2125 verschiedene Vornamen** und **1201 Nachnamen** (Vorgabe: 1200 und 700).
- Besonderheiten: ostdeutsche Vornamen der 1970er/80er (Mandy, Ronny), türkeistämmige Diaspora-Namen der jüngeren Generationen (Deniz, Lara, Elias), kurdische Vornamen erst bei Jüngeren (in der Türkei bis in die 2000er nicht frei möglich), bulgarische Türken mit -ov/-ova, aserbaidschanische -ov/-ova und -li, arabische Schreibvarianten, Vietnamesen mit Familienname zuerst.
- **Familienregeln je Herkunft** (wer welchen Nachnamen nach der Heirat trägt, zwei Nachnamen bei Hispanics und Portugiesen, Vatersnamen in Ostafrika und Afghanistan).
- **Ausgeschlossen:** Vornamen und Nachnamen aus einer privaten Liste (Projektvorgabe, damit Berichte nicht mit echten Personen verwechselt werden; `privat/ausschluss.json`, nicht im offenen Projekt) und eine Sperrliste prominenter Kombinationen (z. B. Thomas Müller, Cem Özdemir, Can Yaman).

**Konfidenz:** wahrscheinlich; zusammengestellt nach den Hitlisten der Jahrgänge, nicht 1:1 übernommen.

## 7. Soziales

- **Enge Freunde (Erwachsene):** 0: 8 %, 1–2: 22 %, 3–5: 38 %, 6–9: 20 %, 10 und mehr: 12 %. Anker: USA 2023 8 % ohne enge Freunde, 53 % mit 1–4, 38 % mit 5 und mehr (Q29); GB 2025 rund 10 % ohne (Q31); ohne Hochschulabschluss doppelt so oft ohne Freunde (Q30).
- **Netz in der Welt:** 18 % einsam (0–2 Freunde unter den Figuren), 2 % mit über 20; Kantenarten Familie 22 %, Schule oder Uni 18 %, Arbeit 16 %, Nachbarschaft 12 %, Verein 10 %, online 10 %, Gemeinde 7 %, Eltern-Kontakte 5 %; 85 % im selben Ort.
- **Online-Freunde:** 60 % der 12–17-Jährigen haben mindestens einen, 5 % der über 65-Jährigen (geschätzt).
- **Einsamkeit:** DE 2021: 18–29: 14,1 %, 30–50: 12,3 %, 51–75: 9,8 %, 75+: 10,2 %; 2020 bei 18–29 rund 32 % (Q28). Länderfaktoren geschätzt.
- **Treff-Erlaubnis:** vier Stufen (frei, abgesprochen, eingeschränkt, kaum) je Altersgruppe, mit Gründen. Regel: Strenge nie einer Gruppe zuschreiben.
- **16 Treff-Hindernisse** mit Häufigkeit, z. B. keine Lust oder müde 20 %, Schicht-, Nacht- oder Wochenendarbeit 18 %, lange Tage oder Pendeln 15 %, Geld 14 %, kleine Kinder 12 %, Prüfungen 10 %, Familienpflichten 10 %, Ramadan 5 %.
- **8 Muster freier Zeit** (Tagesjob abends und Wochenende 30 %, nachmittags 18 %, nur Wochenende 12 %, nach Schichtplan 10 %, spät abends und nachts 10 %, kaum frei 8 %, spontan 7 %, feste Runde 5 %) und Kultur der Treffzeiten (später in TR, nach dem Iftar im Ramadan, abends in Dubai).
- **11 Kreisarten** (Clique, Uni, Kollegen, Familie, Nachbarn, Verein, Gemeinde, online, Eltern, Teehaus, Hobby) mit Größe, Treffrhythmus und typischem Tun.
- **Sprachen:** Englisch sehr hoch in NL (EF 2025 Platz 1), AT (3), DE (4), BE (9) (Q48), niedriger in TR und AZ; Türkisch in der Diaspora je Generation schwächer; Aserbaidschaner verstehen Türkisch meist gut.

**Konfidenz:** Einsamkeit DE gesichert; Freundeszahl abgeleitet aus USA und GB; Netz, Hindernisse und Zeiten geschätzt.

## 8. Probleme

Regel: 55–65 % der Figuren haben mindestens ein spürbares Problem, rund 20 % zwei oder mehr. Probleme werden als Lage einer Person beschrieben, nie als Eigenschaft einer Gruppe. Nicht vergeben werden Gewalt in Beziehungen, Missbrauch und Suizid.

| Problem | DE 18–29 | DE 30–49 | DE 50–64 | TR 18–29 | TR 30–49 | Beleg |
|---|---|---|---|---|---|---|
| Schulden | 9 % | 11 % | 9 % | 15 % | 20 % | DE 8,16 % überschuldet, Anstieg unter 30 und über 70 (Q32); TR 56,4 % der Haushalte zahlen Konsumschulden ab (Q38) |
| Geldsorgen und Armut | 22 % | 13 % | 13 % | 20 % | 19 % | DE 16,1 % (Q36), TR 20,6 % (Q38) |
| Jobverlust oder unsichere Arbeit | 10 % | 9 % | 10 % | 25 % | 18 % | Q16, Q51 |
| Krankheit im Alltag | 6 % | 10 % | 20 % | 6 % | 11 % | geschätzt |
| depressive Phasen oder Ängste | 35 % | 27 % | 22 % | 32 % | 26 % | DE 25 % der Erwachsenen mit Symptomen, Frauen 18–29: 47 % (Q33) |
| Pflege von Angehörigen | 4 % | 8 % | 16 % | 5 % | 10 % | rund 7,1 Mio. pflegende Angehörige (Q35) |
| Trennung in den letzten 2 Jahren | 7 % | 6 % | 3 % | 4 % | 3,5 % | TR gemessen (Q09) |
| Wohnkosten oder Wohnungsnot | 18 % | 12 % | 9 % | 20 % | 18 % | DE 11,2 % zahlen über 40 % fürs Wohnen (Q37) |
| Überlastung und Erschöpfung | 15 % | 22 % | 15 % | 18 % | 26 % | geschätzt |

Weitere Arten im JSON: Liebeskummer, Mobbing (12–17: 18–20 %, Anker PISA, Q41), Prüfungsstress (TR 12–17: 45 %), unsicherer Aufenthalt (Syrer in TR: 2 280 542 unter temporärem Schutz, Q40), Diskriminierung (NaDiRa: 54 % der rassistisch markierten Menschen erleben sie mindestens monatlich, Q39), Sucht und riskanter Konsum, Behinderung, Trauer, Flucht- und Kriegserfahrung, Folgen des Erdbebens 2023, Familienkonflikt, krankes Kind. Dazu **Lebensereignisse** (verliebt, Hochzeit, Baby, neuer Job, Umzug, Führerschein, Heimatbesuch) für rund 40 % der Figuren, damit die Welt nicht nur aus Sorgen besteht.

**Konfidenz:** Schulden, Armut, Depression und Pflege gesichert (DE); Altersaufteilung und TR-Werte meist geschätzt. Offizielle TÜİK-Werte zur Depression wurden nicht gefunden.

## 9. Geräte

| Land | iOS Oktober 2026 | Mittel Jan–Okt 2026 |
|---|---|---|
| DE | 27,7 % (Projektvorgabe) | 35,8 % |
| TR | 23,1 % (Seite: 23,2 %, Projektvorgabe) | 24,6 % |
| NL | 31,5 % | 35,6 % |
| BE | 45,4 % | 46,1 % |
| AT | 47,4 % | 48,2 % |
| CH | 56,3 % | 56,7 % |
| GB | 50,1 % | 50,8 % |
| US | 52,0 % | 59,2 % |
| FR | 35,8 % | 34,7 % |
| BG | 22,4 % | 23,5 % |
| AE | 19,2 % | 21,2 % |
| AZ | 17,6 % | 19,6 % |

Quelle: Statcounter, Anteil an mobilen Seitenaufrufen (Q22). **Achtung:** Statcounter misst Seitenaufrufe, nicht Geräte. Deutschland fiel von rund 40 % (Januar bis Juni) auf 27,6–27,7 % (August bis Oktober); die Ursache ist unklar, möglicherweise eine Änderung der Messung. Die Welt nimmt nach Vorgabe den Oktober-Wert; das Mittel steht zum Vergleich daneben.

Dazu im JSON: Modifikatoren für Alter (12–17 ×1,35 bis 65+ ×0,7) und Schicht (knapp ×0,5 bis wohlhabend ×2), Marken (DE Oktober 2026: Samsung 39,7 %, Apple 27,7 %, Xiaomi 21,3 %, Q23; TR geschätzt, weil Statcounter dort 54 % der Geräte nicht erkennt), Handyklassen (Einsteiger, Mittel, Oberklasse, alt) je Land, Zustand (Speicher fast voll 30 %, Akku hält keinen Abend 22 %), Konsole im Haushalt (DE 38 %, TR 15 %, US 50 %), Gaming-PC und Tablet. DE-Anker: 22,1 Mio. spielen auf Konsole, rund 14 Mio. am PC, 9,9 Mio. am Tablet (Q24).

**Konfidenz:** iOS gemessen (mit dem genannten Vorbehalt); Klassen, Zustand und Konsolen geschätzt.

## 10. Spielen

- **Gesamtwerte:** DE 41,2 Mio. Spielende, rund 60 % der 6–69-Jährigen, 46 % Frauen, Ø 38,3 Jahre (Q24); 55 % ab 16 spielen (Q25). TR rund 50 Mio. aktive Spielende, 46 % Frauen, 47 Mio. auf dem Handy (Q26).
- **Anteil Spielender nach Alter und Geschlecht** (abgeleitet und an den Gesamtwerten ausgerichtet): 12–17: Jungen 94 %, Mädchen 82 %; 18–29: 85 % und 66 %; 40–49: 66 % und 52 %; 60–69: 40 % und 36 %; 70+: rund 20 %. Intensität: selten 30 %, gelegentlich 35 %, regelmäßig 25 %, Vielspieler 10 %.
- **Analoge Spiele mindestens monatlich:** DE 30 %, TR 38 %, AZ 40 % (geschätzt; für Okey und Tavla wurde keine belastbare Messung gefunden; YouGov 2025: 23 % in DE nennen Brettspiele als Interesse, Q27).
- **Beliebte Spiele** je Land und Alter, z. B. TR 18–29: PUBG Mobile, Valorant, Okey (101), Batak, Tavla, Vampir Köylü (Werwolf); DE 12–17: Brawl Stars, Fortnite, Minecraft, Roblox, EA SPORTS FC; NL: Rummikub, Klaverjassen; AZ: Nərd, Domino, Lotu; AE: Baloot, Tarneeb, Ludo King.
- **Bluff-Freude:** liebt es 15 %, mag es 30 %, neutral 25 %, unwohl 20 %, hasst es 10 %. **Ehrgeiz:** sehr 15 %, ehrgeizig 30 %, locker 40 %, egal 15 %. **Anleitung:** liest vollständig 15 %, überfliegt 30 %, lässt sich erklären 35 %, probiert einfach 20 % (KI-artige lesen doppelt so oft vollständig).
- **Partyspiele:** Wer Werwolf, Vampir Köylü oder Among Us kennt, versteht Verräter-Rollen schneller (bekannt bei 65–70 % der unter 30-Jährigen, geschätzt).

**Konfidenz:** Gesamtzahlen gesichert; Verteilungen nach Alter abgeleitet; Bluff, Ehrgeiz und Anleitung geschätzt (keine passende Studie gefunden) und als Erstes an echten Tests mit Menschen zu prüfen.

## 11. Denkstil

- **70 % Mensch, 30 % KI** (Vorgabe), zuletzt und unabhängig von allem anderen gezogen; nur leichte Häufungen (höchstens 5 Prozentpunkte) erlaubt. Prüfung: in jeder Gruppe ab 30 Figuren 22–38 % KI-artige.
- **Mensch:** Bauch, Launen, Vorlieben, Vorurteile, Gefühle; optionale Färbungen (Bauchentscheider, Gesellige, Misstrauische, Begeisterungsfähige, Nostalgiker, Sparfuchs, Harmoniesuchende, Rechthaber).
- **10 Spielarten des KI-artigen Denkens** mit Anteil, Denkweise, Verhalten im Meeting und im Spiel und einem typischen Satz: Zahlenmensch (13 %), Regel-Prüfer (12 %), Systematiker (12 %), Skeptiker (11 %), Optimierer (10 %), Vergleicher (9 %), Risiko-Abwäger (9 %), Ursachenforscher (8 %), Datensammler (8 %), Logiker (8 %).
- KI-artige Figuren sind ganz normale Menschen mit Beruf, Familie und Sorgen: KI-artige Friseurinnen, Rentner, Bauern und Schüler gehören dazu.

## 12. Zusatz: Digital und Medien

Für Produkte im Netz (Videos, Webseiten, Online-Shops, KI-Dienste): Internet TR 90,9 % (2025) und 92,3 % (2026); WhatsApp 88,6 %, YouTube 72,9 %, Instagram 68,1 % in TR (Q43); Jugendliche in DE 2024: WhatsApp 94 %, Instagram 62 %, TikTok 59 %, Snapchat 49 % (Q45); generative KI 2025: EU 32,7 %, 16–24-Jährige 64 %, 65–74-Jährige 7 %, DE rund 32 % (Q44), TR 19,2 % (Q43); Online-Einkauf TR 55,7 % (2025) und 60 % (2026); Anime: rund 27 % in DE schauen Anime und Ähnliches, USA 22 % (Q46). Viele Kleinbetriebe haben keine eigene Webseite, nur Instagram, WhatsApp Business oder einen Google-Eintrag (geschätzt).

## Prüfregeln für Generator und Prüfskripte

1. Genau 1000 Figuren (F0001–F1000 ohne Lücke); Figuren je Ort genau wie geplant; DE 450, TR 300, andere 250.
2. Minderjährige 120–150 (Ziel 135); jede minderjährige Figur lebt mit mindestens einem Elternteil, das Figur ist, oder hat eine begründete Ausnahme.
3. Genau 700 Mensch und 300 KI; in Gruppen ab 30 Figuren 22–38 % KI.
4. Alter je Land ±3 Prozentpunkte je Band zur Zielverteilung (`welt_mischung` oder `welt`).
5. Paare beide Figuren im selben Haushalt; Mutter bei Geburt 16–48, Vater 17–60.
6. Mindestens 350 verschiedene Berufe bei Berufstätigen; Bildung passt zum Beruf oder die Ausnahme ist begründet.
7. Namen eindeutig, keine ausgeschlossenen Vornamen, keine prominenten Kombinationen.
8. Netz symmetrisch; 15–22 % mit 0–2 Freunden in der Welt.
9. iPhone je Land ±5 Prozentpunkte zur Basis; 55–65 % mit mindestens einem Problem.

## Offene Punkte und Unsicherheiten

1. **iPhone-Basis Deutschland:** Oktober 2026 (27,7 %, Vorgabe) oder Mittel Januar–Oktober (35,8 %)? Der Statcounter-Wert sprang im August; ein Gerätebestand von 30–35 % wäre plausibel. Die Welt nimmt nach Projektvorgabe den Oktober-Wert.
2. **Geschätzte Werte mit größtem Einfluss auf Spiele-Ergebnisse:** Bluff-Freude, Ehrgeiz, Anleitung lesen, analoge Spiele (Okey, Tavla) und Treff-Hindernisse. Sie sollten als Erstes an echten Tests mit Menschen geprüft werden.
3. **Nicht abgerufen oder nicht gefunden:** TÜİK-Werte zur Depression, PISA-2022-Werte für DE und TR zum Mobbing, Schulformen je Bundesland im Detail, Einkommen je Beruf (BA-Entgeltatlas), Altersaufteilung der Überschuldung. Die jeweiligen Felder sind als geschätzt markiert.
4. **Sekundärquellen:** Mehrere TÜİK- und Destatis-Werte stammen aus Presseberichten über die Originalveröffentlichung (markiert im Quellenverzeichnis); die Werte stimmen zwischen mehreren Berichten überein.
5. **Herkunftsmischungen der Orte** sind auf die Vorgabe zugeschnitten (viele türkische Wurzeln); wer eine repräsentative Welt eines Landes will, braucht andere Gewichte.
6. **Dateigröße:** rund 340 KB; Agenten sollten nur die benötigten Abschnitte laden.

## Quellen (alle abgerufen am 07.11.2026)

| ID | Titel und Herausgeber | veröffentlicht | URL |
|---|---|---|---|
| Q01 | World Population Prospects 2024, Altersaufbau 2026 je Land (UN DESA, über PopulationPyramid.net) | 2024 | https://www.populationpyramid.net/api/pp/276/2026/?csv=true (Ländercode tauschen) |
| Q02 | ADNKS 2025: Bevölkerung 86 092 168, Medianalter 34,9, 65+ 11,1 % (TÜİK, Bericht CNBC-e) | 09.02.2026 | https://www.cnbce.com/veriler/turkiyenin-nufusu-belli-oldu-kentlesme-derinlesti-ortanca-yas-yukseldi-turkiyenin-nufusu-ne-kadar-turkiye-ortalama-yas-kac-h24622 |
| Q03 | 21,8 Mio. Menschen mit Einwanderungsgeschichte 2025, PM 128/26 (Destatis) | 13.04.2026 | https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_128_125.html |
| Q04 | Wie viele Menschen mit Einwanderungsgeschichte leben in Deutschland? (Mediendienst Integration) | 14.04.2026 | https://mediendienst-integration.de/bevoelkerung/auslaender-und-migranten-in-deutschland/wie-viele-menschen-mit-einwanderungsgeschichte-leben-in-deutschland/ |
| Q05 | Turks in the Netherlands, CBS 2025: 468 726 (2,6 %) (Wikipedia nach CBS, Sekundärquelle) | laufend | https://en.wikipedia.org/wiki/Turks_in_the_Netherlands |
| Q06 | İstatistiklerle Aile 2025 (TÜİK, Bericht Alomaliye) | 12.05.2026 | https://www.alomaliye.com/2026/05/12/turkiyenin-aile-yapisinda-donusum-haneler-kuculuyor-yalnizlik-artiyor/ |
| Q07 | Haushalte und Familien, Mikrozensus 2024 (Destatis) | laufend | https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Haushalte-Familien/_inhalt.html |
| Q08 | Alleinerziehende 2025 nach Destatis-PM N051 (statistiken-aktuell.de, Sekundärquelle) | 07.2026 | https://statistiken-aktuell.de/alleinerziehende-2025-datenmonitor/ |
| Q09 | Evlenme ve Boşanma İstatistikleri 2025 (TÜİK, Bericht DHA) | 24.02.2026 | https://www.dha.com.tr/gundem/2025te-552-bin-cift-evlendi-193-bin-cift-bosandi-2824953 |
| Q10 | Zahl der Woche: 50 % der Erwachsenen verheiratet (Destatis) | 04.02.2025 | https://www.destatis.de/DE/Presse/Pressemitteilungen/Zahl-der-Woche/2025/PD25_06_p002.html |
| Q11 | Geburtenziffer 2025: 1,32 (Destatis, PM 230/26) | 01.07.2026 | https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/07/PD26_230_12.html |
| Q12 | Doğum İstatistikleri 2025: 1,42 (TÜİK, Bericht Ekonomi Gazetesi) | 05.2026 | https://www.ekonomigazetesi.com/ekonomi/dogurganlik-hizi-2025te-142-79771 |
| Q13 | Junge Bevölkerung und Familienstand 2025 (TÜİK, Bericht CNBC-e) | 05.2026 | https://www.cnbce.com/veriler/2025te-genc-nufusun-turkiye-nufusuna-orani-azaldi-h30027 |
| Q14 | Tabelle 2.3.30: Schüler nach Schulart 2025/26 (Destatis über Datenportal BMFTR) | 19.10.2026 | https://www.datenportal.bmftr.bund.de/portal/de/Tabelle-2.3.30.pdf |
| Q15 | Örgün Eğitim İstatistikleri 2024/25 und 2025/26 (MEB, Bericht Pervin Kaplan) | 30.09.2025 / 2026 | https://www.pervinkaplan.com/detay/orgun-egitim-istatistikleri-1-milyon-ogrenci-acik-ogretimde-800-bin-ogrenci-tasimali-egitimde/32245 |
| Q16 | İşgücü İstatistikleri 2025 (TÜİK, Bericht Alomaliye) | 25.03.2026 | https://www.alomaliye.com/2026/03/25/tuik-2025-isgucu-istatistikleri-issizlik-yuzde-8-3e-geriledi-atil-isgucu-yuzde-29-7ye-yukseldi/ |
| Q17 | Teilzeitquote 2025 (Destatis, Bericht ZDF, Sekundärquelle) | 05.2026 | https://www.zdfheute.de/wirtschaft/teilzeit-quote-arbeit-rekord-100.html |
| Q18 | Mittlerer Bruttojahresverdienst 2025: 54 066 € (Destatis) | 04.2026 | https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_113_621.html |
| Q19 | 2026 Asgari Ücret: netto 28 075,50 TL (QNB Invest) | 12.2025 | https://www.qnbinvest.com.tr/investodak/qnbarastirma/2026-asgari-ucret-aciklandi-net-28075-tl |
| Q20 | Minimum wage statistics, Januar 2026 (Eurostat) | 01.2026 | https://ec.europa.eu/eurostat/statistics-explained/index.php/Minimum_wage_statistics |
| Q21 | Mindestlöhne 2026 GB, New Jersey, AZ (Ballotpedia, AzerNews, Trading Economics) | 2026 | https://ballotpedia.org/Minimum_wage_increases_in_2026 ; https://tradingeconomics.com/azerbaijan/minimum-wages |
| Q22 | Mobile OS Market Share, Januar–Oktober 2026 (Statcounter) | laufend | https://gs.statcounter.com/os-market-share/mobile/germany |
| Q23 | Mobile Vendor Market Share, Oktober 2026 (Statcounter) | laufend | https://gs.statcounter.com/vendor-market-share/mobile/germany |
| Q24 | More Than 41 Million People in Germany Play Video Games (game) | 06.05.2026 | https://www.gamedeveloper.com/press-release/more-than-41-million-people-in-germany-play-video-games |
| Q25 | Bitkom 2026: 55 % ab 16 spielen (Bericht ingenieur.de) | 20.08.2026 | https://www.ingenieur.de/karriere/arbeitsleben/39-millionen-gamer-aber-weniger-jobs-games-branche-im-beschaeftigungscheck/ |
| Q26 | Türkiye Oyun Sektörü Raporu 2025 (Gaming in Türkiye mit Xsolla, Bericht Mobidictum); Altersverteilung 2022 (GameDev Reports) | 02.2026 / 2023 | https://mobidictum.com/tr/turkiye-oyun-sektoru-raporu-2025/ ; https://gamedevreports.substack.com/p/gaming-in-turkey-the-turkish-gaming |
| Q27 | Brettspiele genauso beliebt wie Videospiele (YouGov) | 12.2025 | https://yougov.com/de-de/artikel/53743-brettspiele-genauso-beliebt-wie-videospiele-consideration-steigt-in-kinderlosen-haushalten |
| Q28 | Einsamkeitsbarometer 2024 (BMFSFJ, zitiert in Stellungnahme Landtag MV) | 2024/2025 | https://www.dokumentation.landtag-mv.de/parldok/dokument/68091/8_218_stellungnahme_mirjam_dierkes_einsamkeit_bei_jungen_menschen |
| Q29 | What does friendship look like in America? (Pew Research Center) | 12.10.2023 | https://www.pewresearch.org/short-reads/2023/10/12/what-does-friendship-look-like-in-america/ |
| Q30 | American Social Capital Survey 2024 (Survey Center on American Life, Bericht, Sekundärquelle) | 2024 | https://scribe.disroot.org/post/810810 |
| Q31 | One in 10 UK adults have no close friends (Nation.Cymru) | 03.2025 | https://nation.cymru/news/one-in-10-uk-adults-have-no-close-friends-survey-suggests |
| Q32 | SchuldnerAtlas Deutschland 2025 (Creditreform) | 11.2025 | https://www.creditreform.de/fileadmin/user_upload/central_files/img/startseite/aktuellesundwissen/SchuldnerAtlas/2025/SchuldnerAtlas_Pressemitteilung_2025.pdf |
| Q33 | Depressive and anxiety symptoms among adults in Germany 2024 (RKI, J Health Monit) | 2025 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12709641 |
| Q34 | Yaşam Memnuniyeti Araştırması 2024 (TÜİK, Bericht NTV) | 01.2025 | https://www.ntv.com.tr/turkiye/turkiyenin-yuzde-49-6si-mutlu,MLHWl-f9DEmeXsPRuuk7zg |
| Q35 | pflege.de-Studie 2025, SOEP 2021: 7,1 Mio. pflegende Angehörige | 2025 | https://www.pflege.de/studien/studie-2025-wie-geht-es-pflegenden-angehoerigen/ |
| Q36 | 16,1 % armutsgefährdet, EU-SILC 2025 (Destatis) | 02.2026 | https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/02/PD26_039_63.html |
| Q37 | Wohnkosten über 40 % des Einkommens, Eurostat 2025 (Euronews) | 31.10.2026 | https://www.euronews.com/2026/10/31/where-in-europe-do-households-spend-more-than-40-of-their-income-on-housing |
| Q38 | Yoksulluk ve Yaşam Koşulları 2025 (TÜİK, Bericht Alomaliye) | 30.12.2025 | https://www.alomaliye.com/2025/12/30/goreli-yoksulluk-2025te-yuzde-13-0a-geriledi-tuik-yoksulluk-ve-yasam-kosullari-verileri/ |
| Q39 | NaDiRa-Monitoringbericht 2025 (DeZIM, Bericht ZDF) | 2025 | https://www.zdfheute.de/politik/deutschland/rassismus-diskriminierung-studie-rassismusmonitor-100.html |
| Q40 | Syrer unter temporärem Schutz, Mai 2026 (İçişleri Bakanlığı, Bericht Diken) | 04/05.2026 | https://www.diken.com.tr/?p=1710320 |
| Q41 | PISA 2022 Mobbing (OECD, Berichte vienna.at und The Local) | 2024 / 2017 | https://www.vienna.at/pisa-studie-mehrheit-fuhlt-sich-an-schulen-wohl/8452126 ; https://www.thelocal.de/20170419/one-in-six-german-school-kids-regularly-bullied-report |
| Q42 | Nachtarbeit 2024, Wochenendarbeit 2023 (Destatis, Bericht Ärzteblatt) | 2025 | https://www.aerzteblatt.de/news/millionen-menschen-in-deutschland-arbeiten-nachts-3f848ec7-cd96-4b25-8301-2f2c2c1f249d |
| Q43 | Hanehalkı Bilişim Teknolojileri Kullanım Araştırması 2025 und 2026 (TÜİK, Bericht Habertürk) | 27.08.2025 / 08.2026 | https://www.haberturk.com/internet-kullanan-bireylerin-orani-yuzde-90-9-oldu-3817846-teknoloji |
| Q44 | Generative KI 2025 (Eurostat, Bericht Euronews) | 29.12.2025 | https://www.euronews.com/2025/12/29/chatgpt-gemini-grok-and-others-which-countries-use-generative-ai-tools-most-across-europe |
| Q45 | JIM-Studie 2024/2025 (mpfs, Berichte) | 11.2025 | https://mpfs.de/app/uploads/2025/11/Vorab-PM_JIM-Studie-2025.pdf |
| Q46 | Anime: Statista Consumer Insights; Global Anime White Paper 2026 (GEM Partners) | 2025/2026 | https://de.statista.com/infografik/33941/anteil-der-befragten-die-animationsfilme-und-serien-im-tv-schauen-oder-streamen |
| Q47 | When do young people in the EU leave home? (Eurostat) | 23.09.2025 | https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250923-1 |
| Q48 | EF English Proficiency Index 2025 (Bericht AmCham Belgium) | 11.2025 | https://amcham.be/blog/amcham-posts-1/ef-english-proficiency-index-2025-launched-belgium-breaks-into-the-global-top-ten-52 |
| Q49 | International Migrant Stock 2024 (UN DESA, über Prague Process) | 2024 | https://www.pragueprocess.eu/en/component/sprint/?id=916 |
| Q50 | Geburten 2025: 654 300 (Destatis) | 04.2026 | https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_146_126.html |
| Q51 | Jahresrückblick 2025: 2,948 Mio. Arbeitslose, 6,3 % (Bundesagentur für Arbeit) | 01/02.2026 | https://www.arbeitsagentur.de/presse/2026-02-jahresrueckblick-2025 |
| Q52 | Arbeitsmarkt 2025 (Statistik Austria) | 03.2026 | https://www.statistik.at/fileadmin/publications/Arbeitsmarkt-2025_bf.pdf |

## Quellen, Lizenzen und Namensnennung

**Grundsatz:** Der Bauplan übernimmt aus den Quellen einzelne Kennzahlen und rechnet sie um. Texte, Tabellen und Grafiken der Quellen sind nicht übernommen. Einzelne Zahlen sind Fakten und nicht urheberrechtlich geschützt. Trotzdem nennt der Bauplan jede Quelle. Wo Herausgeber Bedingungen stellen, gelten sie für die übernommenen Werte zusätzlich zur Lizenz der Welt (CC BY 4.0, siehe `LICENSE-DATA.md`). In `bauplan.json` stehen die Bedingungen je Quelle unter `quellen[].lizenz`.

**Unverändert übernommene Datenreihen.** Wer sie weitergibt, nennt die Quelle so:

| Daten in `bauplan.json` | Quelle | Bedingungen | Namensnennung |
|---|---|---|---|
| `alter.rohdaten_un` (Bevölkerung nach Alter und Geschlecht, 12 Länder, 2026) | Q01 | CC BY 3.0 IGO (https://creativecommons.org/licenses/by/3.0/igo/); abgerufen über PopulationPyramid.net, ebenfalls CC BY 3.0 IGO | United Nations, Department of Economic and Social Affairs, Population Division (2024). World Population Prospects 2024. |
| `geraete.ios_monatswerte_2026`, `geraete.marken.DE_oktober_2026` | Q22, Q23 | CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/); Statcounter verlangt die Nennung mit Link. Wer diese Werte selbst weitergibt, gibt sie unter denselben Bedingungen weiter. | Quelle: Statcounter Global Stats (https://gs.statcounter.com) |

**Abgeleitete Werte.** Alle übrigen Zahlen hat MSY Studio aus den Quellen umgerechnet, gewichtet oder geschätzt (Feld `basis`: abgeleitet, geschaetzt, vorgabe). Wer sich auf die Zahlen eines Herausgebers beruft, nennt ihn so:

| Herausgeber | Quellen | Bedingungen | Namensnennung |
|---|---|---|---|
| Vereinte Nationen (UN DESA) | Q01, Q49 | CC BY 3.0 IGO | United Nations, Department of Economic and Social Affairs, Population Division (2024): World Population Prospects 2024 bzw. International Migrant Stock 2024 |
| Statistisches Bundesamt (Destatis) | Q03, Q07, Q10, Q11, Q18, Q36, Q50; über Berichte Q08, Q14, Q17, Q42 | Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet; Daten aus GENESIS-Online unter Datenlizenz Deutschland – Namensnennung – 2.0 | Quelle: Statistisches Bundesamt (Destatis); eigene Berechnung |
| Eurostat | Q20, Q47; über Berichte Q37, Q44 | Weiterverwendung mit Quellenangabe; Änderungen kenntlich machen | Quelle: Eurostat; eigene Berechnung |
| Statistik der Bundesagentur für Arbeit | Q51 | Weitergabe mit Quellenangabe | © Statistik der Bundesagentur für Arbeit |
| Statistik Austria | Q52 | Nutzung mit korrekter Quellenangabe | Quelle: STATISTIK AUSTRIA |
| CBS (Niederlande) | Q05, Wert über Wikipedia | CBS-Inhalte unter CC BY 4.0; vom Wikipedia-Text (CC BY-SA 4.0) ist nichts übernommen | Quelle: CBS |
| TÜİK, MEB, İçişleri Bakanlığı (Türkei) | Q02, Q06, Q09, Q12, Q13, Q15, Q16, Q34, Q38, Q40, Q43, jeweils über Presseberichte | keine offene Lizenz gefunden; übernommen sind nur einzelne veröffentlichte Werte | Kaynak: TÜİK (bzw. MEB, İçişleri Bakanlığı) |
| Statcounter | Q22, Q23 | CC BY-SA 3.0 | wie oben |
| Studien, Verbände und Medien | Q04, Q19, Q21, Q24–Q33, Q35, Q39, Q41, Q45, Q46, Q48 | einzelne Kennzahlen aus Veröffentlichungen | Titel und Herausgeber wie in der Liste oben |

**Namen:** Die Vornamen- und Nachnamen-Pools sind nach Hitlisten und Häufigkeiten zusammengestellt und nicht 1:1 aus einer Liste übernommen.

**Eigene Inhalte:** Verteilungen, Schätzungen, Kataloge (Berufe, Namen-Pools, Schulnamen), Figuren und Texte hat MSY Studio erstellt. Sie stehen unter CC BY 4.0. Wer die Welt weitergibt, nennt sie wie in `LICENSE-DATA.md` beschrieben, zum Beispiel „MSY-Welt“ von MSY Studio, CC BY 4.0.
