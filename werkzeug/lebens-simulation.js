export const meta = {
  name: 'lebens-simulation',
  description: 'Lebens-Simulation mit der simulierten Welt von MSY Studio: Freundeskreise leben Wochen, treffen sich oder nicht, spielen das Produkt, etwas anderes oder gar nichts; ausgewaehlte Abende im Detail; wer spielt am meisten',
  whenToUse: 'Statt oder vor echten Testabenden und um zu sehen, wer ein Produkt wirklich nutzt. args: {welt, produkt, version, material, materialText, verboten, wochen, kreise, abende, seed, start, ausgabe, projektablage, startbefehl, hinweis, minSpieler, maxSpieler, wochenOhneDateien, sparModell, sparEffort, bilderBeschreiben}',
  phases: [
    { title: 'Kreise', detail: 'Freundeskreise aus der Welt ziehen' },
    { title: 'Wochen', detail: 'je Kreis die Wochen: Treffen, Tun, Spielen oder nicht' },
    { title: 'Abende', detail: 'ausgewaehlte Spieleabende im Detail (mit bilderBeschreiben vorher einmal alle Bilder beschreiben)' },
    { title: 'Auswertung', detail: 'wer spielt am meisten, warum nicht, was stattdessen' },
  ],
}

// Teil von MSY-Welt (simulierte Welt von MSY Studio). Aufruf mit dem Workflow-Werkzeug von Claude Code:
//   Workflow({scriptPath: '<pfad>/werkzeug/lebens-simulation.js', args: {...}})
// Pflicht: welt (Ordner mit kreise.json und figuren-01.json usw.), produkt, version, ausgabe (Ordner fuer diesen Lauf).
// Wahlweise: wochen (4), kreise (8), abende (3), seed, start (wie das Produkt in die Welt kommt), material, materialText, verboten, hinweis,
//   projektablage (zweiter Ordner, z. B. im eigenen privaten Projekt, fuer Bericht und Rohdaten), startbefehl (Vorsatz fuer Rechenlaeufe der Agenten),
//   wochenOhneDateien (true: die Wochen sehen nur Text-Material, die Dateien, etwa viele Bilder, nur die Abende; spart Tokens),
//   sparModell (z. B. 'sonnet': Modell fuer Kreise ziehen und Wochen; Spielleiter und Auswertung bleiben beim Modell der Sitzung; spart Tokens),
//   sparEffort (z. B. 'medium': Denkaufwand fuer Kreise ziehen und Wochen),
//   bilderBeschreiben (true; Standard aus): Vor den Abenden beschreibt EIN Agent (Modell der Sitzung) jedes Bild des Materials genau
//     einmal: sichtbare Texte woertlich, Knoepfe, Uhren, Zahlen, Aufbau, Lesbarkeit. Die Beschreibung steht danach in
//     <ausgabe>/bilder-beschreibung.md. Die Spielleiter lesen sie statt die Bilder anzusehen und oeffnen ein Bild nur, wenn eine Szene
//     ohne das Bild nicht zu beurteilen ist, jedes hoechstens einmal. Bilder sind Dateien in material mit der Endung png, jpg, jpeg,
//     gif, webp oder bmp (Ordner werden nicht durchsucht). Gibt es keinen Abend, entfaellt die Beschreibung.
//     Sinnvoll bei vielen Bildern (Dutzende Fotos oder Screenshots), vor allem mit mehreren Abenden und zusammen mit wochenOhneDateien;
//     bei wenigen Bildern spart es kaum etwas.
//     Achtung: Die Option aendert die Wahrnehmung der Spielleiter (Text statt Bild). Laeufe, die miteinander verglichen oder an echten
//     Tests kalibriert werden, immer mit derselben Einstellung fahren.
// Kosten: Ohne bilderBeschreiben sieht jeder Spielleiter alle Dateien des Materials selbst, auch mehrfach. Viele grosse Fotos machen
//   die Abende teuer; Fotos vorher verkleinern oder bilderBeschreiben nutzen.

const A = args || {}
if (!A.welt || !A.produkt || !A.version || !A.ausgabe) throw new Error('lebens-simulation braucht args.welt, args.produkt, args.version und args.ausgabe')
const WELT = String(A.welt).replace(/[\\/]+$/, '')
const wochen = Math.max(1, Math.min(12, A.wochen || 4))
const kreisAnzahl = Math.max(2, Math.min(16, A.kreise || 8))
const abendAnzahl = Math.max(0, Math.min(6, A.abende === undefined ? 3 : A.abende))
const minSpieler = A.minSpieler || 3
const maxSpieler = A.maxSpieler || 8
const material = Array.isArray(A.material) ? A.material : (A.material ? [A.material] : [])
const verboten = Array.isArray(A.verboten) ? A.verboten : (A.verboten ? [A.verboten] : [])
const SPAR = Object.assign({}, A.sparModell ? { model: A.sparModell } : {}, A.sparEffort ? { effort: A.sparEffort } : {})
const IST_BILD = /\.(png|jpe?g|gif|webp|bmp)$/i
const bilder = material.filter(m => IST_BILD.test(m))
const BILDER_DATEI = A.ausgabe + '/bilder-beschreibung.md'
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const seed = typeof A.seed === 'number' ? A.seed : hash(A.produkt + '|' + A.version)
const start = A.start || 'Das Produkt verbreitet sich so, wie es das Material beschreibt. Wer es kennt und wie man es bekommt, ergibt sich aus dem Leben der Figuren. Niemand kennt es automatisch.'

const REGELN = 'Regeln:\n' +
  '- Dies ist eine SIMULATION von MSY Studio. Gesucht ist das echte Leben: Absagen, Müdigkeit, Streit, andere Pläne, Pannen, Langeweile und Lachen.\n' +
  '- Nichts committen. Nichts außerhalb von ' + A.ausgabe + (A.projektablage ? ' und ' + A.projektablage : '') + ' schreiben. Keine Dienste oder Live-Systeme anfassen. Kein eingebauter Browser, kein Chrome, kein file://.\n' +
  '- Lies nur das Material und die Welt-Dateien.' + (verboten.length ? ' AUSDRÜCKLICH VERBOTEN zu lesen: ' + verboten.join(', ') + '.' : '') + '\n' +
  '- Erfinde nichts, was das Produkt laut Material nicht kann. Was das Material nicht zeigt, ist unbekannt.' +
  (A.startbefehl ? '\n- Rechenläufe, auch kurze node- oder python-Prüfungen, nur über diesen Startbefehl: ' + A.startbefehl + ' <befehl>.' : '')
const MATERIAL = 'PRODUKT: ' + A.produkt + ', Version ' + A.version + '\n' +
  (material.length ? 'MATERIAL (das, was Nutzer sehen; mit dem Read-Werkzeug ansehen, Bilder anschauen):\n' + material.map(m => '- ' + m).join('\n') : 'Kein Datei-Material.') +
  (A.materialText ? '\nMATERIAL ALS TEXT:\n' + A.materialText : '') + (A.hinweis ? '\nHINWEIS: ' + A.hinweis : '')
const WOCHEN_MATERIAL = A.wochenOhneDateien
  ? 'PRODUKT: ' + A.produkt + ', Version ' + A.version + '\n' + (A.materialText ? 'MATERIAL ALS TEXT:\n' + A.materialText : 'Kein Material.') + (A.hinweis ? '\nHINWEIS: ' + A.hinweis : '') +
    (material.length ? '\nDie Dateien des Materials (etwa Fotos) sind nur für die Spielabende; öffne sie nicht.' : '')
  : MATERIAL

const MITGLIED = {
  type: 'object',
  properties: {
    id: { type: 'string' }, name: { type: 'string' }, alter: { type: 'integer' }, geschlecht: { type: 'string' },
    land: { type: 'string' }, ort: { type: 'string' }, taetigkeit: { type: 'string' }, denkstil: { type: 'string', enum: ['Mensch', 'KI'] },
    geraet: { type: 'string' }, steckbrief: { type: 'string' },
  },
  required: ['id', 'name', 'alter', 'geschlecht', 'land', 'ort', 'taetigkeit', 'denkstil', 'geraet', 'steckbrief'],
}
const KREISE = {
  type: 'object',
  properties: {
    kreise: {
      type: 'array',
      items: {
        type: 'object',
        properties: { kreis: { type: 'string' }, art: { type: 'string' }, ort: { type: 'string' }, mitglieder: { type: 'array', items: MITGLIED } },
        required: ['kreis', 'art', 'ort', 'mitglieder'],
      },
    },
    ziehung: { type: 'string' },
  },
  required: ['kreise', 'ziehung'],
}
const TREFFEN = {
  type: 'object',
  properties: {
    woche: { type: 'integer' }, wann: { type: 'string' }, wo: { type: 'string' },
    wer: { type: 'array', items: { type: 'string' } },
    was_gemacht: { type: 'string' },
    produkt_gespielt: { type: 'boolean' },
    warum_nicht: { type: 'string' },
    stattdessen: { type: 'string' },
    dauer_min: { type: 'integer' },
    stimmung: { type: 'string' },
  },
  required: ['woche', 'wann', 'wo', 'wer', 'was_gemacht', 'produkt_gespielt', 'warum_nicht', 'stattdessen', 'dauer_min', 'stimmung'],
}
const WOCHEN = {
  type: 'object',
  properties: {
    kreis: { type: 'string' },
    kennt_produkt: { type: 'string' },
    treffen: { type: 'array', items: TREFFEN },
    ausgefallen: { type: 'array', items: { type: 'string' } },
    weitergesagt: { type: 'array', items: { type: 'string' } },
    fazit: { type: 'string' },
  },
  required: ['kreis', 'kennt_produkt', 'treffen', 'ausgefallen', 'weitergesagt', 'fazit'],
}
const SPIEL = {
  type: 'object',
  properties: {
    dauer_min: { type: 'integer' }, abgebrochen: { type: 'boolean' }, protokoll_datei: { type: 'string' },
    wichtige_momente: { type: 'array', items: { type: 'string' } }, luecken_im_material: { type: 'array', items: { type: 'string' } },
  },
  required: ['dauer_min', 'abgebrochen', 'protokoll_datei', 'wichtige_momente', 'luecken_im_material'],
}
const ERLEBEN = {
  type: 'object',
  properties: {
    id: { type: 'string' }, name: { type: 'string' },
    ziel_verstanden: { type: 'string', enum: ['ja', 'teils', 'nein'] }, wann_verstanden: { type: 'string' },
    verwirrt_bei: { type: 'array', items: { type: 'string' } }, langweilig_bei: { type: 'array', items: { type: 'string' } },
    gelacht_bei: { type: 'array', items: { type: 'string' } }, geaergert_bei: { type: 'array', items: { type: 'string' } },
    spass: { type: 'integer', minimum: 1, maximum: 10 }, nochmal: { type: 'string', enum: ['ja', 'vielleicht', 'nein'] },
    weiterempfehlen: { type: 'boolean' }, was_aendern: { type: 'string' }, zitat: { type: 'string' },
  },
  required: ['id', 'name', 'ziel_verstanden', 'wann_verstanden', 'verwirrt_bei', 'langweilig_bei', 'gelacht_bei', 'geaergert_bei', 'spass', 'nochmal', 'weiterempfehlen', 'was_aendern', 'zitat'],
}
const BERICHT = {
  type: 'object',
  properties: {
    datei: { type: 'string' }, kurzfassung: { type: 'string' }, kernpunkte: { type: 'array', items: { type: 'string' } },
    empfehlungen: { type: 'array', items: { type: 'string' } }, wer_spielt_am_meisten: { type: 'string' }, fuer_gruender: { type: 'string' }, offen: { type: 'string' },
  },
  required: ['datei', 'kurzfassung', 'kernpunkte', 'empfehlungen', 'wer_spielt_am_meisten', 'fuer_gruender', 'offen'],
}
const BILDBESCHREIBUNG = {
  type: 'object',
  properties: {
    bilder_beschrieben: { type: 'integer', minimum: 0 },
    nicht_geoeffnet: { type: 'array', items: { type: 'string' } },
  },
  required: ['bilder_beschrieben', 'nicht_geoeffnet'],
}

// 1. Kreise ziehen (deterministisch per seed ueber ein kleines node-Skript)
phase('Kreise')
const kreiseRes = await agent(
  'Ziehe ' + kreisAnzahl + ' Freundeskreise aus der simulierten Welt von MSY Studio: ' + WELT + '/kreise.json (Kreise mit Mitgliedern), Steckbriefe in ' + WELT + '/figuren-01.json bis figuren-10.json (F0001–F0100 in 01 usw.).\n' +
  'Die Ziehung muss wiederholbar sein. Nutze ein kleines node-Skript' + (A.startbefehl ? ' (über den Startbefehl ' + A.startbefehl + ')' : '') + ' mit dem Startwert ' + seed + ' (einfacher Zufallsgenerator wie mulberry32) und ziehe ohne Zurücklegen aus allen Kreisen.\n' +
  'Es gibt keine Zielgruppe: Ziehe aus ALLEN Kreisen, ob Familie, Schule, Arbeit, Verein, Nachbarschaft oder online. Kreise mit weniger als 2 Mitgliedern überspringen.\n' +
  'Gib je Kreis die Mitglieder mit den Feldern aus dem Steckbrief zurück und dazu den VOLLSTÄNDIGEN Steckbrief als Text (Feld steckbrief, unverändert). taetigkeit = Beruf oder Schule, geraet = Handy (Android/iPhone, Klasse). Notiere unter ziehung Startwert und Befehl.\n' +
  'Schreibe die Ziehung nach ' + A.ausgabe + '/kreise.md (Ordner anlegen).\n\n' + REGELN,
  Object.assign({ label: 'Kreise ziehen', phase: 'Kreise', schema: KREISE }, SPAR)
)
if (!kreiseRes || !kreiseRes.kreise || kreiseRes.kreise.length === 0) throw new Error('keine Kreise gezogen')
const kreise = kreiseRes.kreise
log('Kreise: ' + kreise.length + ' mit zusammen ' + kreise.reduce((s, k) => s + k.mitglieder.length, 0) + ' Figuren')

// 2. Wochen je Kreis
phase('Wochen')
const leben = (await parallel(kreise.map(k => () => agent(
  'Du simulierst ' + wochen + ' Wochen im echten Leben dieses Freundeskreises aus der Welt von MSY Studio.\n' +
  'KREIS ' + k.kreis + ' (' + k.art + ', ' + k.ort + '). Mitglieder mit vollständigen Steckbriefen:\n' + k.mitglieder.map(m => '- ' + m.name + ' (' + m.id + '): ' + m.steckbrief).join('\n') + '\n\n' + WOCHEN_MATERIAL + '\n\nWIE DAS PRODUKT IN DIE WELT KOMMT: ' + start + '\n\n' +
  'Simuliere Woche für Woche:\n' +
  '- Wer hat wann Zeit (Arbeit, Schule, Familie, Kinder, Partner, Probleme, Geld, Erlaubnis, Laune)? Kommt ein Treffen zustande, wann und wo, und wer kommt?\n' +
  '- Was wird gemacht: essen, reden, ausgehen, Okey, UNO, FIFA, Werwolf, Mario Kart oder anderes, oder das Produkt? Nicht jedes Treffen wird ein Spieleabend.\n' +
  '- Wird das Produkt NICHT gespielt, halte den echten Grund fest: kennt es keiner, iPhone, kein Speicher, keine Lust, zu wenige Leute, zu kompliziert, lieber etwas anderes, Akku.\n' +
  '- Wird es gespielt: wer, wie lange, wie die Stimmung war, wer wieder will.\n' +
  '- Wem erzählen die Mitglieder davon (andere Kreise, Familie, online)?\n' +
  '- Halte dich an die Steckbriefe. Einsame Figuren treffen sich selten, gestresste sagen ab, Eltern haben Kinder im Blick.\n' +
  'Schreibe den Verlauf nach ' + A.ausgabe + '/kreis-' + k.kreis + '-wochen.md und gib die Treffen strukturiert zurück (wer = IDs).\n\n' + REGELN,
  Object.assign({ label: 'Wochen ' + k.kreis + ' (' + k.art + ')', phase: 'Wochen', schema: WOCHEN }, SPAR)
).then(l => (l ? Object.assign({}, l, { kreis: k.kreis }) : null))))).filter(Boolean)
// Kreis-Kennung aus der Ziehung, nicht aus der Antwort des Agenten (die war auch schon ein langer Text, dann fanden die Abende ihre Spieler nicht)
const alleTreffen = [].concat(...leben.map(l => l.treffen.map(t => Object.assign({}, t, { kreis: l.kreis }))))
log('Wochen: ' + alleTreffen.length + ' Treffen, davon ' + alleTreffen.filter(t => t.produkt_gespielt).length + ' mit dem Produkt')

// 3. Abende im Detail: je Kreis hoechstens einer, bis zur Grenze
phase('Abende')
const gespielt = alleTreffen.filter(t => t.produkt_gespielt && t.wer.length >= minSpieler && t.wer.length <= maxSpieler)
const auswahl = []
for (const t of gespielt) { if (auswahl.length < abendAnzahl && !auswahl.some(a => a.kreis === t.kreis)) auswahl.push(t) }
// Wahlweise (bilderBeschreiben): EIN Agent beschreibt vor den Abenden jedes Bild genau einmal, die Spielleiter lesen dann diese Beschreibung
let ABEND_MATERIAL = MATERIAL
let bilderBeschrieben = null
if (A.bilderBeschreiben && !bilder.length) log('Bilder: keine Bilddateien im Material, keine Beschreibung')
else if (A.bilderBeschreiben && !auswahl.length) log('Bilder: kein Abend, keine Beschreibung')
else if (A.bilderBeschreiben) {
  const b = await agent(
    'Du bereitest die Spielabende einer Simulation von MSY Studio vor. Die Spielleiter sollen die Bilder des Materials nicht selbst ansehen, sondern deine Beschreibung lesen. Beschreibe deshalb jedes dieser ' + bilder.length + ' Bilder genau einmal.\n\n' +
    'PRODUKT: ' + A.produkt + ', Version ' + A.version + '\nBILDER (das, was Nutzer sehen):\n' + bilder.map(m => '- ' + m).join('\n') + '\n\n' +
    'So gehst du vor:\n' +
    '- Öffne jedes Bild genau einmal mit dem Read-Werkzeug, in der Reihenfolge der Liste. Andere Dateien liest du nicht.\n' +
    '- Je Bild ein Abschnitt mit dem Pfad wie in der Liste als Überschrift. Darin: alle sichtbaren Texte wörtlich in Anführungszeichen, Knöpfe und andere Bedienelemente, Uhren, Zähler und Zahlen, der Aufbau (was wo steht, Größen, Farben, Reihenfolge) und die Lesbarkeit (was klein, verdeckt, unscharf, abgeschnitten oder kontrastarm ist). Beschreibe nur, was zu sehen ist, ohne Urteil über das Produkt.\n' +
    '- Schreibe nach ' + BILDER_DATEI + ' (Ordner anlegen). Arbeite in Blöcken von höchstens 10 Bildern und hänge jeden Block gleich an die Datei an, ohne die ganze Datei neu zu schreiben.\n' +
    '- Gib zurück, wie viele Bilder du beschrieben hast und welche du nicht öffnen konntest (Pfad wie in der Liste).\n\n' + REGELN,
    { label: 'Bilder beschreiben (' + bilder.length + ')', phase: 'Abende', schema: BILDBESCHREIBUNG }
  )
  const nicht = b && Array.isArray(b.nicht_geoeffnet) ? b.nicht_geoeffnet : []
  bilderBeschrieben = b ? b.bilder_beschrieben : 0
  if (bilderBeschrieben > 0) {
    const ohneBilder = material.filter(m => !IST_BILD.test(m))
    ABEND_MATERIAL = 'PRODUKT: ' + A.produkt + ', Version ' + A.version + '\n' +
      (ohneBilder.length ? 'MATERIAL (das, was Nutzer sehen; mit dem Read-Werkzeug ansehen):\n' + ohneBilder.map(m => '- ' + m).join('\n') + '\n' : '') +
      'BILDER DES MATERIALS (das, was Nutzer sehen; beschrieben in ' + BILDER_DATEI + '):\n' + bilder.map(m => '- ' + m).join('\n') + '\n' +
      'Die Beschreibung enthält je Bild einen Abschnitt mit dem Pfad als Überschrift: sichtbare Texte wörtlich, Knöpfe, Uhren, Zahlen, Aufbau, Lesbarkeit. Lies sie vollständig, bei Bedarf in Abschnitten, statt die Bilder anzusehen. Öffne ein Bild nur, wenn eine Szene ohne das Bild nicht zu beurteilen ist, und jedes Bild höchstens einmal; nenne geöffnete Bilder mit Grund am Ende des Protokolls.' +
      (nicht.length ? '\nNicht beschrieben, weil sie sich nicht öffnen ließen: ' + nicht.join(', ') : '') +
      (A.materialText ? '\nMATERIAL ALS TEXT:\n' + A.materialText : '') + (A.hinweis ? '\nHINWEIS: ' + A.hinweis : '')
    log('Bilder: ' + bilderBeschrieben + ' von ' + bilder.length + ' beschrieben in ' + BILDER_DATEI + (nicht.length ? ', nicht geöffnet: ' + nicht.join(', ') : ''))
  } else log('Bilder: Beschreibung fehlgeschlagen, die Spielleiter sehen die Bilder selbst (teurer)')
}
const abende = (await pipeline(
  auswahl,
  (_, t, i) => {
    const k = kreise.find(x => x.kreis === t.kreis)
    const spieler = k ? k.mitglieder.filter(m => t.wer.includes(m.id)) : []
    return agent(
      'Du bist der Spielleiter einer Simulation von MSY Studio. Spiele diesen Abend mit dem Produkt durch.\n\n' + ABEND_MATERIAL + '\n\n' +
      'KREIS ' + t.kreis + ', Woche ' + t.woche + ', ' + t.wann + ', ' + t.wo + '. Stimmung vorher: ' + t.stimmung + '.\nSpieler (vollständige Steckbriefe):\n' + spieler.map(m => '- ' + m.name + ' (' + m.id + '): ' + m.steckbrief).join('\n') + '\n\n' +
      'So spielst du:\n' +
      '- Halte dich streng an Regeln, Abläufe, Texte und Bildschirme aus dem Material. Wo es etwas offen lässt, entscheide schlicht und schreib es unter luecken_im_material.\n' +
      '- Die Spieler handeln nach ihren Steckbriefen: Ungeduldige tippen weiter, wer Anleitungen überspringt, versteht später oder nie. Wer Bluffen hasst, blufft schlecht. Müde oder abgelenkte Spieler verpassen Dinge. Es wird geredet, gescherzt, gestritten und aufs eigene Handy geschaut.\n' +
      '- Schreibe das Protokoll nach ' + A.ausgabe + '/abend-' + (i + 1) + '-protokoll.md. Die erste Runde Schritt für Schritt mit Uhrzeit, danach bis zum Ende zusammengefasst, mit jedem besonderen Moment. Bricht die Gruppe realistisch ab, dann bricht sie ab.\n\n' + REGELN,
      { label: 'Abend ' + (i + 1) + ' (' + t.kreis + '): Spielleiter', phase: 'Abende', schema: SPIEL }
    ).then(s => ({ t: t, spieler: spieler, spiel: s, nr: i + 1 }))
  },
  (prev) => {
    if (!prev || !prev.spiel) return null
    const proto = prev.spiel.protokoll_datei || (A.ausgabe + '/abend-' + prev.nr + '-protokoll.md')
    return parallel(prev.spieler.map(m => () => agent(
      'Du bist ' + m.name + ' (' + m.id + ') aus der simulierten Welt von MSY Studio. Denkstil: ' + (m.denkstil === 'KI' ? 'nüchtern und systematisch wie eine KI' : 'wie ein Mensch, aus dem Bauch heraus') + '.\nDein Steckbrief (JSON):\n' + m.steckbrief + '\n\n' +
      'Du hast gerade diesen Abend erlebt: ' + proto + '. Lies das Protokoll, behalte aber nur, was du als diese Person mitbekommen hättest.\n' +
      'Erzähle ehrlich aus deiner Sicht: Hast du das Ziel verstanden, und wann? Wo warst du verwirrt, gelangweilt oder verärgert, wo hast du gelacht? Wie viel Spaß hattest du (1–10)? Würdest du nochmal spielen? Würdest du es empfehlen? Das zitat wörtlich, wie du es nach dem Spiel sagst.\n\n' + REGELN,
      { label: 'Abend ' + prev.nr + ': ' + m.name, phase: 'Abende', schema: ERLEBEN, model: 'sonnet', effort: 'medium' }
    ))).then(e => Object.assign({}, prev, { erleben: e.filter(Boolean) }))
  }
)).filter(Boolean)

// Kennzahlen deterministisch
const figur = {}
for (const k of kreise) for (const m of k.mitglieder) figur[m.id] = m
function band(a) {
  if (a < 15) return 'unter 15'
  if (a <= 17) return '15–17'
  if (a <= 24) return '18–24'
  if (a <= 30) return '25–30'
  if (a <= 44) return '31–44'
  if (a <= 59) return '45–59'
  return '60+'
}
const spiele = {}
for (const t of alleTreffen) if (t.produkt_gespielt) for (const id of t.wer) spiele[id] = (spiele[id] || 0) + 1
const nachAlter = {}
for (const id of Object.keys(figur)) {
  const b = band(figur[id].alter)
  if (!nachAlter[b]) nachAlter[b] = { figuren: 0, haben_gespielt: 0, abende_summe: 0 }
  nachAlter[b].figuren++
  if (spiele[id]) { nachAlter[b].haben_gespielt++; nachAlter[b].abende_summe += spiele[id] }
}
const zaehle = (arr) => { const o = {}; for (const x of arr) if (x) o[x] = (o[x] || 0) + 1; return o }
const alleErleben = [].concat(...abende.map(a => a.erleben || []))
const zahlen = {
  seed: seed, wochen: wochen, kreise: kreise.length, figuren: Object.keys(figur).length,
  treffen: alleTreffen.length, treffen_mit_produkt: alleTreffen.filter(t => t.produkt_gespielt).length,
  figuren_die_gespielt_haben: Object.keys(spiele).length,
  nach_alter: nachAlter,
  gruende_nicht_gespielt: zaehle(alleTreffen.filter(t => !t.produkt_gespielt).map(t => t.warum_nicht)),
  stattdessen: zaehle(alleTreffen.filter(t => !t.produkt_gespielt).map(t => t.stattdessen)),
  abende_im_detail: abende.length,
  spass_mittel: alleErleben.length ? Math.round(alleErleben.reduce((s, e) => s + e.spass, 0) / alleErleben.length * 10) / 10 : null,
  ziel_verstanden: zaehle(alleErleben.map(e => e.ziel_verstanden)),
  nochmal: zaehle(alleErleben.map(e => e.nochmal)),
}
if (bilderBeschrieben !== null) zahlen.bilder_beschrieben = bilderBeschrieben

// 4. Auswertung
phase('Auswertung')
const roh = {
  produkt: A.produkt, version: A.version, start: start, zahlen: zahlen,
  kreise: kreise.map(k => ({ kreis: k.kreis, art: k.art, ort: k.ort, mitglieder: k.mitglieder.map(m => ({ id: m.id, name: m.name, alter: m.alter, land: m.land, taetigkeit: m.taetigkeit, denkstil: m.denkstil, geraet: m.geraet })) })),
  leben: leben, abende: abende.map(a => ({ nr: a.nr, kreis: a.t.kreis, spiel: a.spiel, erleben: a.erleben })),
}
const bericht = await agent(
  'Du wertest eine Lebens-Simulation mit der simulierten Welt für die Projektleitung aus.\nRohdaten (JSON, vollständig):\n' + JSON.stringify(roh) + '\n\n' +
  'Die Verläufe liegen unter ' + A.ausgabe + '/kreis-*-wochen.md, die Abende unter ' + A.ausgabe + '/abend-*-protokoll.md.\n' +
  'Aufgaben:\n' +
  '1. Schreibe die Rohdaten unverändert als ' + A.ausgabe + '/rohdaten.json.\n' +
  '2. Schreibe ' + A.ausgabe + '/bericht.md in einfacher Sprache mit diesen Teilen:\n' +
  '   - Kopfzeile „SIMULATION: simulierte Figuren, keine echten Menschen“.\n' +
  '   - Kennzahlen: Übernimm die Zahlen aus „zahlen“ genau so.\n' +
  '   - Wer spielt am meisten: nach Alter, Lebenslage, Land, Gerät und Spielgewohnheit. Daraus ergibt sich, wer die echte Zielgruppe ist.\n' +
  '   - Warum nicht gespielt wurde: nach Häufigkeit geordnet, mit Beispielen und Herkunft.\n' +
  '   - Was stattdessen gespielt oder gemacht wurde: die echte Konkurrenz im Alltag.\n' +
  '   - Die Abende im Detail: Verstehen, Spaß, Langeweile, Ärger, nochmal spielen.\n' +
  '   - Weitererzählen: Verbreitet sich das Produkt von selbst?\n' +
  '   - Empfehlungen an die Projektleitung, je mit „von wem“ und „wie relevant“.\n' +
  '   - Grenzen der Simulation.\n' +
  '   - „In 3 Sätzen“: einfache Sprache ohne Fachwörter, mit dem Hinweis, dass es simuliert ist.\n' +
  (A.projektablage ? '3. Schreibe bericht.md und rohdaten.json zusätzlich unverändert nach ' + A.projektablage + ' (Ordner anlegen).\n4. ' : '3. ') +
  'Gib die Kurzfassung strukturiert zurück (Feld fuer_gruender = die 3 Sätze).\n\n' + REGELN,
  { label: 'Auswertung', phase: 'Auswertung', schema: BERICHT }
)

return { seed: seed, zahlen: zahlen, bericht: bericht }
