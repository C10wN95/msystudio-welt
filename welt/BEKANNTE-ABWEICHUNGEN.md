# Bekannte Abweichungen

**Stand:** 11.11.2026 · gilt für `welt/skelett.json`, `welt/kreise.json` und `welt/figuren-01.json` bis `figuren-10.json`

Die Welt ist ein Modell, kein Abbild der Wirklichkeit. Diese Datei sagt offen, wo die Verteilungen **bewusst** von der Wirklichkeit abweichen, wo sie das **eigene Ziel** aus `welt/bauplan.json` noch verfehlen und welche **Lebenslagen fehlen**. Grundlage ist eine Prüfung aller 1000 Figuren gegen den Bauplan mit `werkzeug/welt-pruefen.mjs` und `werkzeug/welt-inhalt-pruefen.mjs`. Die Zahlen beziehen sich auf die gesamte Welt, Prozentwerte auf die genannte Gruppe. Eine englische Kurzfassung steht am Ende.

## 1. Bewusst anders als die Wirklichkeit

| Merkmal | Welt | Wirklichkeit | Grund |
|---|---|---|---|
| Minderjährige (12–17 Jahre) | 132 Figuren, 13,2 % | rund 8 % der Menschen ab 12 in den 12 Ländern | Kinder von Figurenpaaren sind selbst Figuren; Ziel 12–15 % |
| Türkische oder kurdische Wurzeln | 26,9 % der Figuren in Deutschland, 45,9 % insgesamt | 3–4 % der Bevölkerung in Deutschland | Ländermischung: 450 Figuren in Deutschland, 300 in der Türkei, 250 in der Diaspora und anderen Ländern |
| Ohne Einwanderungsgeschichte (Deutschland) | 48,7 % | 68,6 % | Die Orte sind Viertel mit viel Zuwanderung; die Figuren in Europa und den USA sind deshalb etwas jünger als ihr Land |
| Orte | 20 Nachbarschaften in 12 Ländern | – | Ausschnitte, keine repräsentativen Länder |
| Kinder unter 12 Jahren | nur als Zahl im Haushalt (215) | – | Die Welt beginnt bei 12 Jahren |
| Denkstil | 700 denken wie Menschen, 300 nüchtern wie eine KI | – | Festgelegter Anteil, unabhängig von Beruf, Alter und Herkunft gezogen |
| iPhone-Anteil Deutschland | 27,7 % | 27,7 % im Oktober 2026, 35,8 % im Mittel Januar bis Oktober | Bewusst der Oktoberwert; der Gerätebestand dürfte bei 30–35 % liegen |

## 2. Noch nicht am eigenen Ziel

| Bereich | Ziel laut Bauplan | Ist | Folge |
|---|---|---|---|
| Türkei: verheiratet ab 18 | 66,4 % | 60,6 %; 30–39 und 50–54 Jahre zu selten | weniger Ehepaare in der Lebensmitte |
| Türkei: geschieden (ab 15) | 5,2 % | 11,2 % (28 Figuren) | Geschiedene in der Türkei doppelt so häufig wie real |
| Altersabstand Mann minus Frau, 0–3 Jahre | 45 % (DE und TR) | DE 24,8 %, TR 34,1 % | Paare sind zu oft weit auseinander |
| Altersabstand 4–7 Jahre | DE 26 %, TR 32 % | DE 45,6 %, TR 52,9 % | wie oben |
| Gleichgeschlechtliche Paare | 2–3 % der Paare im Westen | 3 von 279 Paaren (rund 1,5 % im Westen) | etwas zu selten |
| Queere Erwachsene | 3–5 % | 2,1 % (21 Figuren, davon 6 nicht offen) | etwas zu selten |
| Elternzeit (Deutschland) | rund 5 Figuren | 0 | frische Eltern arbeiten, studieren oder führen den Haushalt |
| Auszubildende (Deutschland) | rund 9 | 4 | zu wenige Azubis |
| Weder Arbeit noch Ausbildung, jung (Deutschland) | rund 2,5 | 0 | fehlt |
| Studium / Haushalt (Deutschland) | 14,6 / 12,7 Figuren | 24 / 8 | mehr Studierende, weniger Hausleute |
| Selbstständige | DE 9 %, TR 22 % | DE 13,4 %, TR 17,5 % | in der Türkei zu wenige, in Deutschland zu viele |
| Ohne Smartphone | Kinder 12–13 rund 5 %, Ältere oft | 3 Kinder; alle 39 Figuren ab 80 haben ein Smartphone | kein Tastenhandy, keine Älteren ohne Handy |
| Einsam ab 75 Jahren | 10,2 % | 22,9 % | das Feld `einsam` meint wenige Freunde, nicht nur das Gefühl |
| Treffen „kaum erlaubt“ mit 16–17 | 5 % | 14,3 % | Jugendliche zu oft stark eingeschränkt |
| Freunde: 6–10 / über 20 | 30 % / 2 % | 36,1 % / 0,7 % (7 Figuren) | Netze etwas zu gleichförmig |
| Treff-Hindernisse | Schicht 18 %, Pflege 6 %, Erlaubnis 8 %, Krankheit 7 % | 13,1 / 3,0 / 4,5 / 10,0 % | Krankheit zu häufig, die anderen zu selten |
| Problemarten im Verhältnis zur Rate im Bauplan | 1,0 | Depression und Angst 0,7, Pflege 0,7, Trennung 0,6, Geldsorgen 1,2 | seelische Belastungen eher unterschätzt |
| Schulform Gymnasium (48 Schüler in DE) | rund 44 % bundesweit | 52 %; Haupt- und Realschule nur 3 Figuren | höhere Schulformen übervertreten |
| Anime 12–17 / 18–29 | 50 / 45 % | 41,7 / 38,8 % | etwas zu selten |
| Videospiele 12–17 (Jungen / Mädchen) | 94 / 82 % | 98 / 90 % | etwas zu häufig |
| Altersbänder kleiner Länder | grob | Abweichungen bis 7,4 Prozentpunkte | dort stehen nur 1–2 Figuren je Band |

**Kreise (für Simulationen über Wochen):**
- Alle 18 Klassen-Kreise haben nur 2 Mitglieder. Eine ganze Schulklasse lässt sich so nicht simulieren; Jugendrunden entstehen über Freundeskreise.
- Kreise für Berufsschule und Hochschule fehlen.
- 114 Figuren gehören zu keinem Kreis, 102 davon sind einsam. Wer nur Kreise zieht, trifft sie nie.
- Der Treffrhythmus ist je Kreisart fest vorgegeben; Unterschiede entstehen erst durch die Figuren.
- 18 Online-Kreise und 11 über mehrere Orte verteilte Kreise können nicht gemeinsam am Tisch sitzen.

## 3. Bekannte Unstimmigkeiten im Skelett

Diese Fälle stammen aus dem Generator. Die Lebenstexte erklären viele davon; korrigiert werden sie beim nächsten Neubau des Skeletts.

- **Bildung:** 9 Figuren haben einen „Schulabschluss im Herkunftsland“, kamen aber unter 15 Jahren an. 5 Figuren haben Staatsexamen oder Universitätsstudium mit Fachabitur. 2 Klassenstufen liegen über dem Ende ihrer Schulform. 44 von 49 Studierenden tragen den Abschluss-Code `anlern`; das verzerrt Bildungsstatistiken. Ältere Figuren in Deutschland, Österreich und der Schweiz tragen die Codes `bachelor` und `master`; die Texte nennen die damaligen Abschlüsse (Diplom, Magister).
- **Herkunft und Sprache:** 7 Kinder gemischter Paare tragen nur die Herkunft eines Elternteils. 6 alevitische Figuren haben das Treff-Hindernis Fastenmonat, 2 jesidische Figuren Zazakî als Muttersprache, eine südasiatische Familie Arabisch als Muttersprache. 11 Figuren kamen mit 12 Jahren oder älter und haben trotzdem zwei Muttersprachen. 2 Figuren aus dem früheren Jugoslawien tragen Namen, die kaum zu ihrem Glauben passen: einen kroatischen Vornamen bei orthodoxem Glauben, einen serbischen Vornamen und einen bosniakischen Nachnamen bei katholischem Glauben. 2 Roma-Frauen in Duisburg tragen rumänische Vornamen, sprechen aber Bulgarisch.
- **Alter und Status:** 6 Figuren sind mit 72 Jahren oder älter erwerbstätig.
- **Rente „über die Versicherung des Mannes“:** vereinfachte Statusbezeichnung für Frauen ohne eigene Rente. Die Texte sagen, wovon die Figur tatsächlich lebt.
- **Dubai:** Alle sechs südasiatischen Figuren haben einfache Tätigkeiten in Service, Reinigung, Callcenter oder Hafen. Die Texte geben ihnen verschiedene Wege (Weiterbildung, eigene Pläne, Familien mit anderen Berufen), Fachkräfte aus Südasien fehlen aber.
- **Texte:** Steckbriefe aus derselben Datei ähneln sich stärker als Steckbriefe aus verschiedenen Dateien, weil jede Datei eine eigene Handschrift hat.

**Von Hand geändert:** Einige Figuren hießen zufällig wie bekannte Personen. Sie wurden nach dem Erzeugen umbenannt, in Familien über den gemeinsamen Nachnamen. Die alten Namen stehen jetzt in der Sperrliste des Generators. Ein Neubau mit demselben Startwert vergibt deshalb viele Namen anders als im veröffentlichten Skelett. `werkzeug/namen-pruefen.mjs` gleicht alle Namen in einer Abfrage mit Wikidata ab.

Ebenfalls von Hand angepasst wurden:
- die Namen von 5 südasiatischen Figuren in Dubai, damit sie zu Glaube und Region passen;
- der Glaube von 6 Roma-Figuren: In der Türkei sind sie jetzt muslimisch, in Duisburg christlich;
- die Texte zu den jesidischen Figuren, damit nicht alle dieselbe Geschichte vom Bruch mit der Familie erzählen;
- 44 Betriebe, in denen Figuren Arbeit ohne Anmeldung, Mobbing oder Benachteiligung durch Vorgesetzte, Entlassungen, Kurzarbeit oder gekürzte Stunden wegen der Lage des Betriebs, drohende Insolvenz, einen Verkauf oder eine Schließung erleben. Dort steht jetzt nur noch die Art des Betriebs, zum Beispiel „Kunststoffbetrieb in Duisburg“.

Der Generator kennt diese Regeln noch nicht. Er zieht den Glauben der Roma unabhängig vom Land und südasiatische Namen unabhängig vom Glauben, und er gibt Betrieben Eigennamen. Ein Neubau kann solche Fälle deshalb wieder erzeugen.

## 4. Fehlende oder kaum vertretene Lebenslagen

- **Inhaber kleiner Betriebe mit digitalem Alltag:** Es gibt 81 Selbstständige, davon 35 Inhaber, aber kaum Texte über Webseite, soziale Medien, eigenen Online-Shop, Marktplätze oder KI im Betrieb, und nur 4–7 Online-Händler. Fragen, die die Sicht von Inhabern brauchen (Software, Webseiten, digitale Dienste kaufen), kann die Welt kaum beantworten; sie zeigt dort vor allem die Sicht von Kundinnen und Kunden.
- **Frische Eltern in Elternzeit:** 0.
- **Auszubildende und Berufsschulklassen:** zu wenige (siehe oben).
- **Ältere ohne Smartphone:** 0 mit Tastenhandy oder ohne Handy.
- **Pendelrentner zwischen der Türkei und Europa:** 0.
- **Jüdische Figuren:** 0.
- **Christen aus einheimischen Minderheiten in der Türkei:** 2.
- **Trans und nicht-binäre Menschen:** 0.
- **Wohnungslose:** 0.
- **Pflege- und Adoptivfamilien:** 0; Patchwork-Familien: 2.
- **Zwillinge:** 0.
- **Menschen im Pflegeheim:** fast keine.
- **Schülerinnen und Schüler, die von Lehrkräften abgewertet werden:** 0.
- **Content-Creator und Streamer:** 5. Anime ist meist nur ein Ja-oder-Nein-Wert, ohne Plattform, Genre oder Fan-Praxis.
- **Geschmack und Stil:** Kein Merkmal beschreibt den ästhetischen Geschmack einer Figur.

## 5. Was das für die Nutzung heißt

- Jedes Ergebnis ist eine Simulation, keine Meinung echter Menschen. Vor jeder Entscheidung an echten Befunden prüfen.
- Kleine Gruppen (einzelne Länder, seltene Berufe, Altersbänder mit 1–2 Figuren) nicht als Statistik lesen.
- Die Werte mit dem größten Einfluss auf Ergebnisse zu Spielen sind geschätzt: Freude am Bluffen, Ehrgeiz, Lesen von Anleitungen, analoge Spiele und Treff-Hindernisse. Sie sollten als Erstes an echten Tests geprüft werden.
- Eine Zufallsrunde aus 100 Figuren enthält zwischen etwa 20 und 41 KI-artige Figuren. Berichte sollten die tatsächliche Zahl nennen.

---

## English summary

The world is a model, not a mirror of reality. Known deviations as of 11 Nov 2026:

- **On purpose:** minors (12–17) are 13.2 % instead of about 8 %, because children of figure couples are figures themselves; Turkish or Kurdish roots are strongly over-represented (26.9 % of figures in Germany, 45.9 % overall); only 48.7 % of figures in Germany have no migration background (real: 68.6 %); the 20 places are neighbourhoods, not countries; children under 12 exist only as numbers; 300 of 1000 figures think in a sober, AI-like way by design.
- **Not yet on target:** too many divorced figures in Turkey (11.2 % instead of 5.2 %); partners are too often 4–7 years apart; no one on parental leave; too few apprentices; every figure aged 80+ has a smartphone; teenagers aged 16–17 are too often barely allowed to meet friends; loneliness at 75+ is over-represented; depression, anxiety and care duties are under-represented; all 18 class circles have only 2 members; 114 figures belong to no circle.
- **Skeleton inconsistencies:** some education chains, origins of children of mixed couples, faith–language combinations and work status above age 72 come from the generator and will be fixed in the next rebuild. All six South Asian figures in Dubai have low-skilled service, cleaning, call-centre or dock jobs in the skeleton; their texts give them different paths, but skilled South Asian workers are missing. A few names that happened to match well-known people were changed by hand after generation; the old names are now on the generator's block list, so a rebuild with the same seed assigns many names differently (`werkzeug/namen-pruefen.mjs` checks all names against Wikidata in one query). Also changed by hand: names of South Asian figures in Dubai to fit faith and region, the faith of Roma figures to fit their country, the stories of the Yazidi figures, and businesses where a figure experiences undeclared work, bullying or discrimination by superiors, layoffs, short-time work or cut hours due to the business situation, a sale or a closure (they are now only named by type, e.g. "a plastics firm in Duisburg"). The generator does not know these rules yet, so a rebuild can bring such cases back. Two figures from former Yugoslavia have names that hardly fit their faith, and two Roma women in Duisburg have Romanian first names but speak Bulgarian.
- **Missing groups:** owners of small businesses with a digital side, parents on parental leave, older people without smartphones, retirees commuting between Turkey and Europe, Jewish figures, trans and non-binary people, homeless people, foster and adoptive families, twins, people in care homes, school students belittled by teachers; Christians from Turkey's native minorities (2) and patchwork families (2) are rare.
- **Use:** every result is a simulation. Check it against real findings before relying on it, and do not read small groups as statistics.
