# MSY-Welt: eine simulierte Welt mit 1000 Figuren

*English summary below.*

Die MSY-Welt ist eine **erfundene Welt mit 1000 Figuren**, die wie echte Menschen leben. Jede Figur hat Beruf oder Schule, Familie (manche sind miteinander verheiratet, manche haben Kinder), Freunde, Sorgen und Probleme, freie Zeiten, ein Handy und eigene Gewohnheiten beim Spielen und im Netz. Die Figuren kommen aus Deutschland, der Türkei und vielen anderen Ländern. 70 % entscheiden aus dem Bauch heraus wie die meisten Menschen, 30 % denken nüchtern und systematisch wie eine KI. Es gibt **keine Zielgruppen**: Wer sich wofür interessiert, ergibt sich aus dem Leben der Figuren.

Gebaut hat sie [MSY Studio](https://web.msystudio.com). Sie ist offen, damit andere sie nutzen und mitentwickeln können.

## Wozu

Bevor man etwas baut, das Menschen erleben (ein Spiel, eine App, eine Webseite, ein Logo, eine Folge), will man wissen, wie unterschiedliche Leute darauf reagieren. Die Welt liefert dafür zwei Verfahren als Workflows für [Claude Code](https://claude.com/claude-code):

- **Entwicklungsrunde** (`werkzeug/entwicklungsrunde.js`): Aus der Welt werden 100 Figuren zufällig gezogen. Jede hat eine Stimmung zum Thema, manche schweigen, die Redenden melden sich zu Wort, und das Meeting wird als Ganzes durchgespielt. Der Bericht nennt bei jeder Meinung, **von wem sie kommt**, und trennt die Stimmen wahrscheinlicher Nutzer von denen der übrigen Figuren.
- **Lebens-Simulation** (`werkzeug/lebens-simulation.js`): Freundeskreise aus der Welt leben einige Wochen. Treffen kommen zustande oder nicht. Gespielt oder genutzt wird das Produkt, etwas anderes oder gar nichts, jeweils mit Grund. Ausgewählte Abende werden im Detail durchgespielt. Am Ende steht, **wer das Produkt wirklich nutzt**, warum andere es nicht tun und was sie stattdessen machen.

**Wichtig:** Das sind simulierte Meinungen, keine echten Menschen. Die Ergebnisse sind Hinweise und keine Daten. Wer sie für Entscheidungen nutzt, sollte die Simulation vorher an echten Testergebnissen prüfen (kalibrieren). Echte Tests mit echten Menschen schlagen jede Simulation.

## Inhalt

| Ordner | Inhalt |
|---|---|
| `welt/` | `bauplan.md` und `bauplan.json` (Verteilungen, Orte, Listen, Quellen), `skelett.json` (Haushalte, Ehen, Kinder, Freundesnetz), `kreise.json` (Freundeskreise), `figuren-01.json` bis `figuren-10.json` (Steckbriefe F0001–F0100 und so weiter), `index.json` (kompakte Liste aller 1000 Figuren), `BEKANNTE-ABWEICHUNGEN.md` (wo die Welt vom Bauplan und von der Wirklichkeit abweicht) |
| `werkzeug/` | Workflows `entwicklungsrunde.js` und `lebens-simulation.js`, Generator `welt-skelett.mjs`, Prüfskripte `welt-pruefen.mjs`, `welt-inhalt-pruefen.mjs` und `bauplan-pruefen.mjs`, Namensabgleich `namen-pruefen.mjs` (prüft über Wikidata, ob bekannte Personen so heißen wie Figuren; braucht Netz), Index-Skript `welt-index.mjs` |
| `LICENSE`, `LICENSE-DATA.md` | Lizenzen: MIT für den Code, CC BY 4.0 für Daten und Texte (siehe [Lizenz](#lizenz)) |
| `laeufe/` | nur lokal: Ergebnisse eigener Läufe, wird nie mit hochgeladen (`.gitignore`) |
| `privat/` | nur lokal: private Listen, z. B. `ausschluss.json` (Namen, die die Welt nicht vergibt); wird nie mit hochgeladen (`.gitignore`). Fehlt der Ordner, überspringen Generator und Prüfskripte diesen Punkt mit einem Hinweis |

## Benutzung (Claude Code)

```
Workflow({scriptPath: '<pfad>/werkzeug/entwicklungsrunde.js', args: {
  welt: '<pfad>/welt', thema: '…', frage: '…', produkt: '…',
  material: ['<datei aus Nutzersicht>'], anzahl: 100, seed: 42,
  ausgabe: '<pfad>/laeufe/<projekt>/<datum>-<thema>',
  projektablage: '<ordner im eigenen, privaten Projekt>'   // wahlweise: Kopie des Berichts
}})
```

```
Workflow({scriptPath: '<pfad>/werkzeug/lebens-simulation.js', args: {
  welt: '<pfad>/welt', produkt: '…', version: '…', material: [ … ],
  wochen: 4, kreise: 8, abende: 3, seed: 42,
  ausgabe: '<pfad>/laeufe/<projekt>/<datum>-leben', projektablage: '…'
}})
```

Die Ausgabe gehört nach `laeufe/`, das nicht mit hochgeladen wird. Was ihr behalten wollt, legt ihr über `projektablage` in eurem eigenen Projekt ab.

Alle Optionen stehen im Kopf des jeweiligen Workflows. Zum Sparen von Tokens:

- **Entwicklungsrunde:** `sparModell` und `sparEffort` gelten nur für die Stimmung aller Gezogenen (Standard `'sonnet'` und `'medium'`, günstiger z. B. `'haiku'` und `'low'`). Wortmeldungen, Diskussion und Bericht bleiben, wie sie sind.
- **Lebens-Simulation:** Mit `bilderBeschreiben: true` beschreibt vor den Abenden ein Agent jedes Bild des Materials genau einmal (`bilder-beschreibung.md` im Ausgabe-Ordner). Die Spielleiter lesen diese Beschreibung, statt jedes Bild selbst anzusehen. Das lohnt sich bei vielen Bildern, am besten zusammen mit `wochenOhneDateien: true`. Es ändert aber, wie die Spielleiter das Material wahrnehmen: Läufe, die ihr miteinander vergleicht oder an echten Tests kalibriert, fahrt ihr mit derselben Einstellung.

## Mitmachen

Neue Figuren, Korrekturen, neue Orte, bessere Werkzeuge: Wie das geht, steht in [CONTRIBUTING.md](CONTRIBUTING.md). Beiträge mit echten Personen oder verletzenden Klischees nehmen wir nicht an.

## Hinweise

- **Alles erfunden:** Alle Figuren und Familien der Welt sind erfunden, ebenso ihre Schulen und Betriebe. Ausgenommen sind Hochschulen und öffentliche Einrichtungen (nächster Punkt). Ähnlichkeiten mit lebenden oder verstorbenen Personen und Übereinstimmungen mit echten Schulen oder Firmen sind zufällig und nicht beabsichtigt.
- **Echte Orte und Einrichtungen:** Orte, Stadtteile, Straßen und Hochschulen sind echt, ebenso öffentliche Einrichtungen wie die Bundeswehr und andere Streitkräfte, Krankenhäuser, Gerichte, Polizei, Behörden und Flughäfen. Alles, was in den Steckbriefen über sie gesagt wird, ist erfunden. Die Ortsbeschreibungen im Bauplan sind grobe Zusammenfassungen und Schätzungen.
- **Wie die Welt entstanden ist:** Die Verteilungen beruhen auf öffentlichen Statistiken (siehe [Quellen](welt/bauplan.md#quellen-lizenzen-und-namensnennung)). Die Steckbriefe wurden mit KI-Sprachmodellen geschrieben und mit Prüfskripten geprüft. Sie beruhen nicht auf Befragungen oder Daten echter Menschen.
- **Marken:** Genannte Spiele, Apps, Geräte und Marken gehören ihren Inhabern. MSY-Welt steht in keiner Verbindung zu ihnen.
- **Figuren unter 18:** Die Welt enthält 132 Figuren zwischen 12 und 17 Jahren. Wer Produkte prüft, die Minderjährigen nicht angeboten werden dürfen (zum Beispiel Glücksspiel, Alkohol oder Inhalte ab 18), lässt ihre Stimmen aus der Auswertung heraus.
- **Keine echten Daten:** Gebt den Workflows kein Material mit, das personenbezogene Daten echter Menschen enthält.
- **Etwas wiedererkannt?** Wer meint, sich selbst, eine andere Person oder eine Einrichtung in der Welt wiederzuerkennen, meldet sich über ein Issue oder über die Kontaktdaten im [Impressum](https://web.msystudio.com/impressum). Wir prüfen die Stelle und ändern sie.

## Lizenz

- **Code** in `werkzeug/`: [MIT-Lizenz](LICENSE).
- **Daten und Texte** (alles in `welt/` sowie diese Dokumentation): [Creative Commons Namensnennung 4.0 International (CC BY 4.0)](LICENSE-DATA.md).

Ihr dürft alles nutzen, verändern und weitergeben, auch kommerziell. Bedingung ist die Namensnennung, zum Beispiel: *„MSY-Welt“ von MSY Studio, CC BY 4.0*, mit Link zu diesem Projekt. Änderungen macht ihr kenntlich. An den Ergebnissen eurer eigenen Läufe beansprucht MSY Studio keine Rechte.

**Ausgenommen:**
- **Werte aus Quellen:** Für Zahlen, die aus Statistiken übernommen sind, gelten zusätzlich die Bedingungen der Herausgeber, vor allem für die UN-Daten (CC BY 3.0 IGO) und die Statcounter-Werte (CC BY-SA 3.0) im Bauplan. Einzelheiten und die nötige Namensnennung stehen in [welt/bauplan.md](welt/bauplan.md#quellen-lizenzen-und-namensnennung).
- **Name und Logo:** Der Name „MSY Studio“ und das Logo von MSY Studio fallen nicht unter die Lizenzen. Sie dürfen nicht so verwendet werden, dass der Eindruck entsteht, MSY Studio stehe hinter einem anderen Projekt oder unterstütze es. Die Namensnennung nach der Lizenz bleibt davon unberührt.

## Stand

**Veröffentlicht:** Version 1.0 der Welt, Stichtag 07.11.2026. Wo die Welt vom Bauplan und von der Wirklichkeit abweicht, steht in [welt/BEKANNTE-ABWEICHUNGEN.md](welt/BEKANNTE-ABWEICHUNGEN.md).

Herausgeber: MSY Studio · [Impressum](https://web.msystudio.com/impressum) (gilt auch für den GitHub-Auftritt von MSY Studio)

---

## English summary

MSY-Welt is a **fictional world of 1,000 people** with jobs or schools, families (some married to each other, some with children), friendships, problems, free time, phones and gaming habits. They live mainly in Germany and Türkiye and in many other countries. 70 % decide by gut feeling, 30 % think analytically like an AI. There are **no target groups**: interests emerge from each figure's life. The data is in German.

It comes with two [Claude Code](https://claude.com/claude-code) workflows:
- **Entwicklungsrunde** (development round): 100 random figures react to a question. Some stay silent, some speak up, and every opinion is reported together with who said it.
- **Lebens-Simulation** (life simulation): friend circles live for a few weeks, meet or don't, and use the product, something else or nothing, each time with a reason.

All options are documented at the top of each workflow. To save tokens, `sparModell` and `sparEffort` set the model and effort for the first reactions of all drawn figures in the development round only (default `'sonnet'` and `'medium'`, cheaper e.g. `'haiku'` and `'low'`). In the life simulation, `bilderBeschreiben: true` has one agent describe every image of the material once before the evenings (`bilder-beschreibung.md` in the output folder), and the game masters read that description instead of viewing each image. This pays off with many images, best combined with `wochenOhneDateien: true`, but it changes what the game masters perceive: use the same setting for runs you compare or calibrate.

Results are **simulated opinions, not real people**. Calibrate against real tests before relying on them. Contributions are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

**Notes.** All figures and families are fictional, and so are their schools and businesses, except universities and public institutions; any resemblance to real persons, living or dead, or to real schools or companies is coincidental. Places, neighbourhoods, streets and universities are real, and so are public institutions such as the German Bundeswehr and other armed forces, hospitals, courts, the police, public authorities and airports, but everything the profiles say about them is fictional; the place descriptions in the blueprint are rough summaries and estimates. The distributions are based on public statistics; the profiles were written with AI language models and checked with scripts, not taken from surveys or data of real people. Games, apps, devices and brands mentioned belong to their owners; MSY-Welt is not affiliated with them. The world contains 132 figures aged 12 to 17: leave their votes out when testing products that may not be offered to minors (e.g. gambling, alcohol, adult content). Do not give the workflows material containing personal data of real people. If you think you recognise yourself, another person or an institution, open an issue or use the contact details in the [legal notice](https://web.msystudio.com/impressum).

**License.** Code in `werkzeug/`: [MIT](LICENSE). Data and texts (everything in `welt/` and this documentation): [CC BY 4.0](LICENSE-DATA.md). Attribution, for example: *"MSY-Welt" by MSY Studio, CC BY 4.0*, with a link to this project; please indicate changes. MSY Studio claims no rights in the results of your own runs. Excluded: values taken from statistics keep their publishers' conditions, notably UN data (CC BY 3.0 IGO) and Statcounter values (CC BY-SA 3.0), see [welt/bauplan.md](welt/bauplan.md#quellen-lizenzen-und-namensnennung); the name "MSY Studio" and its logo are not licensed and must not be used to suggest that MSY Studio is behind or endorses another project.

**Status.** Published: version 1.0 of the world, reference date 7 November 2026. Known deviations from the blueprint and from reality: [welt/BEKANNTE-ABWEICHUNGEN.md](welt/BEKANNTE-ABWEICHUNGEN.md) (in German). Publisher: MSY Studio, [legal notice (Impressum)](https://web.msystudio.com/impressum), which also covers MSY Studio's presence on GitHub.
