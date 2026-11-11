# Mitmachen bei MSY-Welt

*English summary below.*

Danke, dass du helfen willst. So geht es:

## Was willkommen ist

- **Korrekturen:** Eine Figur passt nicht zu ihrem Alter, Ort oder Beruf, eine Familie passt nicht zusammen, ein Text ist unklar.
- **Mehr Vielfalt:** neue Orte, Berufe, Schulformen, Lebenslagen oder Sprachen, die in der Welt fehlen.
- **Neue Figuren:** Sie müssen sich ins Netz einfügen, also mit Familie, Freunden und Kreisen verbunden sein.
- **Bessere Werkzeuge:** Prüfskripte, Generator, Workflows.
- **Kalibrierung:** Vergleiche zwischen Simulation und echten Testergebnissen, ohne persönliche Daten echter Menschen.

## Regeln für Figuren

1. **Nur erfunden.** Keine echten oder prominenten Personen und keine personenbezogenen Daten echter Menschen (Namen mit Adresse, Kontaktdaten, Konten, Fotos). Keine Straßenadressen mit Hausnummer.
2. **Keine echten Betriebe und Schulen als Schauplatz.** Arbeitgeber, Schulen und Betriebe sind erfunden. Prüfe einen neuen Namen vorher kurz im Netz: Gibt es am Ort oder in der Nähe schon eine Schule oder Firma dieses Namens, nimm einen anderen. Echte Orte, Stadtteile, Straßen und Hochschulen dürfen vorkommen. Das gilt auch für öffentliche Einrichtungen wie die Bundeswehr und andere Streitkräfte, Krankenhäuser, Gerichte, Polizei, Behörden und Flughäfen, auch als Arbeits- oder Lernort. Stelle über sie aber keine Behauptungen auf, die man für Tatsachen halten könnte.
3. **Nichts Belastendes über Betriebe, Schulen oder Einrichtungen mit Namen.** Schreib Rechtsverstöße (z. B. Arbeit ohne Anmeldung, auch von Minderjährigen), Mobbing oder Diskriminierung durch Vorgesetzte oder Lehrkräfte, Insolvenz, Schließung, Verkauf oder Stellenabbau nie einem Betrieb, einer Schule oder einer Einrichtung mit Namen zu, auch nicht, wenn der Name erfunden ist: Gibt es ihn doch, wird daraus eine Behauptung über einen echten Betrieb. Erlebt eine Figur so etwas, steht für ihren Betrieb, ihre Schule oder Einrichtung in allen Angaben zur Figur nur ein Gattungsbegriff, auch in `welt/skelett.json`, zum Beispiel „in einem Imbiss“, „bei einer Baufirma“ oder „an ihrer Schule“. Auch der Gattungsbegriff darf nicht auf einen bestimmten Betrieb zeigen, etwa „das Krankenhaus im Ort“, wenn es dort nur eines gibt.
4. **Marken nur als Produkte.** Spiele, Apps, Geräte und Plattformen dürfen genannt werden, wenn eine Figur sie nutzt. Keine Herabsetzung von Marken oder Firmen.
5. **Keine verletzenden Klischees.** Jede Figur ist ein glaubwürdiger Einzelfall mit Widersprüchen und nie das Bild einer ganzen Gruppe.
6. **Respekt:** Krankheit, Armut, Konflikte in der Familie und andere heikle Lebenslagen werden sachlich und würdevoll beschrieben. Gewalt in Beziehungen, Missbrauch und Suizid vergibt die Welt nicht.
7. **Jugendschutz:** Figuren unter 18 haben keine sexuellen Inhalte und keine Liebesbeziehung zu Erwachsenen. Alkohol, Drogen, Gewalt und Glücksspiel werden bei ihnen nicht verherrlicht.
8. **Keine fremden Texte.** Schreib alles selbst: keine Passagen aus Artikeln, Büchern, Wikipedia oder Liedtexten. Zahlen aus Statistiken nur mit Eintrag in den Quellen des Bauplans (`welt/bauplan.json`, `quellen[]`: Titel, Herausgeber, URL, Abrufdatum, Bedingungen unter `lizenz`) und in `welt/bauplan.md`.
9. **Schema einhalten:** Felder wie in `welt/figuren-*.json`. Beziehungen müssen beidseitig sein: Wer verheiratet ist, steht auch beim Partner.
10. **Prüfen:** Vor dem Einreichen `node werkzeug/welt-pruefen.mjs` und `node werkzeug/welt-index.mjs` laufen lassen, ohne Fehler. Neue Namen von Figuren prüfst du vorher mit `node werkzeug/namen-pruefen.mjs --namen <datei>` (ein Name je Zeile, braucht Netz) und einer kurzen Websuche: Ist ein Name vor allem mit einer bekannten Person verbunden, nimm einen anderen.

## Ablauf

1. Für Wünsche und Fehler ein **Issue** auf GitHub anlegen.
2. Für Änderungen einen **Pull Request** stellen, mit kurzer Begründung und dem Ergebnis des Prüfskripts.
3. MSY Studio prüft den Beitrag (Inhalt, Respekt, Schema, Netz, Rechte) und übernimmt ihn oder meldet sich mit Fragen.

## Lizenz deiner Beiträge

Beiträge stehen unter denselben Lizenzen wie das Projekt:

- **Code** (`werkzeug/`): MIT, siehe [`LICENSE`](LICENSE).
- **Daten und Texte** (`welt/`, Dokumentation): CC BY 4.0, siehe [`LICENSE-DATA.md`](LICENSE-DATA.md).

Mit dem Pull Request bestätigst du, dass du den Beitrag selbst erstellt hast oder ihn unter diesen Lizenzen weitergeben darfst, und dass er keine Rechte anderer verletzt.

## Nicht hochladen

Ergebnisse eigener Läufe (`laeufe/`), private Listen (`privat/`), persönliche Daten und Zugangsdaten gehören nicht in das Projekt.

## Wiedererkannt?

Wer meint, sich selbst, eine andere Person, eine Schule, eine Firma oder eine Einrichtung in der Welt wiederzuerkennen, meldet sich über ein Issue oder über die Kontaktdaten im [Impressum](https://web.msystudio.com/impressum). MSY Studio prüft die Stelle und ändert sie.

---

## English summary

Contributions are welcome: corrections, more diversity, new figures that fit into the network, better tools and calibration data without personal data of real people. Rules: figures are fictional (no real or famous persons, no personal data, no street addresses); employers, schools and businesses are invented, so check a new name online first and pick another one if a school or company of that name exists nearby; real places, streets and universities may appear, and so may public institutions such as the German Bundeswehr and other armed forces, hospitals, courts, the police, public authorities and airports, also as a workplace or place of learning, but nothing that could be taken as a factual claim about them; never attach anything incriminating to a business, school or institution with a name, not even an invented one: no legal violations (e.g. undeclared work, also by minors), no bullying or discrimination by superiors or teachers, no insolvency, closure, sale or job cuts; if a figure experiences such things, its workplace or school gets only a generic term in all of the figure's data, including `welt/skelett.json` (e.g. "at a snack bar", "at a construction company"), and the generic term must not point to one specific place either; brands only as products a figure uses; no hurtful stereotypes; sensitive situations described with respect, no domestic violence, abuse or suicide; figures under 18 have no sexual content and no romantic relationship with adults; write everything yourself (no passages from articles, books, Wikipedia or song lyrics) and record every statistic in the blueprint's sources with its conditions. Run `node werkzeug/welt-pruefen.mjs` and `node werkzeug/welt-index.mjs` without errors before opening a pull request. Check new names of figures beforehand with `node werkzeug/namen-pruefen.mjs --namen <file>` (one name per line, needs internet access) and a quick web search; if a name is mainly associated with a well-known person, pick another one.

**License of contributions:** code (`werkzeug/`) under MIT, data and texts (`welt/`, documentation) under CC BY 4.0, the same as the project. By opening a pull request you confirm that you created the contribution yourself or may share it under these licenses and that it does not infringe the rights of others. Do not upload run results, private lists, personal data or credentials.
