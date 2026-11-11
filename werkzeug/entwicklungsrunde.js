export const meta = {
  name: 'entwicklungsrunde',
  description: 'Entwicklungsrunde mit der simulierten Welt von MSY Studio: 100 zufaellig gezogene Figuren, Stimmung aller, Wortmeldungen der Redenden, Diskussion, Bericht mit Gewichtung nach Herkunft der Meinung',
  whenToUse: 'Vor jeder Entscheidung, was oder wie gebaut wird, wenn Menschen es erleben. args: {welt, thema, frage, produkt, material, materialText, seed, anzahl, maxRedner, groesse, ausgabe, projektablage, startbefehl, sparModell, sparEffort}',
  phases: [
    { title: 'Stimmung', detail: 'alle Gezogenen: Interesse, erster Gedanke, reden oder schweigen' },
    { title: 'Wortmeldungen', detail: 'wer redet, sagt ausfuehrlich seine Meinung' },
    { title: 'Diskussion', detail: 'das Meeting als Ganzes' },
    { title: 'Bericht', detail: 'Auswertung mit Gewichtung nach Herkunft der Meinung' },
  ],
}

// Teil von MSY-Welt (simulierte Welt von MSY Studio). Aufruf mit dem Workflow-Werkzeug von Claude Code:
//   Workflow({scriptPath: '<pfad>/werkzeug/entwicklungsrunde.js', args: {...}})
// Pflicht: welt (Ordner mit figuren-01.json usw.), thema, frage, ausgabe (Ordner fuer diesen Lauf).
// Wahlweise: seed (Zahl, wiederholbare Ziehung; sonst aus thema und frage), anzahl (Standard 100), maxRedner (25), groesse (Zahl der Figuren, 1000),
//   projektablage (zweiter Ordner, z. B. im eigenen privaten Projekt, in den der Bericht zusaetzlich geschrieben wird),
//   startbefehl (Vorsatz fuer Rechenlaeufe der Agenten, z. B. ein Starter mit niedriger Prioritaet),
//   sparModell (z. B. 'haiku': Modell NUR fuer die Stimmung aller Gezogenen, Standard 'sonnet'; spart Tokens),
//   sparEffort (z. B. 'low': Denkaufwand NUR fuer die Stimmung, Standard 'medium').
//   Wortmeldungen (sonnet, medium), Diskussion und Bericht (Modell der Sitzung) bleiben davon unberuehrt.
// Redner: Wollen mehr Figuren reden als maxRedner, reden zuerst einige Kritiker (Interesse bis 3), dann die mit dem hoechsten Interesse.
//   Bei Gleichstand entscheidet eine aus dem Startwert gemischte Reihenfolge, nicht die Kennung (die Kennungen sind nach Laendern
//   vergeben). Gleicher Startwert und gleiche Stimmung ergeben dieselben Redner.
// Figuren: figuren-01.json enthaelt F0001-F0100, figuren-02.json F0101-F0200 usw.

const A = args || {}
if (!A.welt || !A.thema || !A.frage || !A.ausgabe) throw new Error('entwicklungsrunde braucht args.welt, args.thema, args.frage und args.ausgabe')
const WELT = String(A.welt).replace(/[\\/]+$/, '')
const GROESSE = A.groesse || 1000
const anzahl = Math.max(10, Math.min(200, A.anzahl || 100))
const maxRedner = Math.max(5, Math.min(40, A.maxRedner || 25))
const material = Array.isArray(A.material) ? A.material : (A.material ? [A.material] : [])
const produkt = A.produkt || 'ein Produkt von MSY Studio'
const stimmungModell = A.sparModell || 'sonnet'
const stimmungEffort = A.sparEffort || 'medium'

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function prng(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const seed = typeof A.seed === 'number' ? A.seed : hash(A.thema + '|' + A.frage)
const zufall = prng(seed)
const gezogen = new Set()
while (gezogen.size < anzahl) gezogen.add(1 + Math.floor(zufall() * GROESSE))
const ids = Array.from(gezogen).sort((a, b) => a - b).map(n => 'F' + String(n).padStart(4, '0'))
const datei = id => WELT + '/figuren-' + String(Math.ceil(Number(id.slice(1)) / 100)).padStart(2, '0') + '.json'

const REGELN = 'Regeln:\n' +
  '- Dies ist eine SIMULATION von MSY Studio. Gesucht ist echtes Verhalten: Desinteresse, Missverständnisse, Schweigen und Lautstärke gehören dazu.\n' +
  '- Nichts committen. Nichts außerhalb von ' + A.ausgabe + (A.projektablage ? ' und ' + A.projektablage : '') + ' schreiben. Keine Dienste oder Live-Systeme anfassen. Kein eingebauter Browser, kein Chrome, kein file://.\n' +
  '- Lies nur das Material und die Welt-Dateien. Erfinde nichts über das Produkt, was das Material nicht zeigt.' +
  (A.startbefehl ? '\n- Rechenläufe, auch kurze node- oder python-Prüfungen, nur über diesen Startbefehl: ' + A.startbefehl + ' <befehl>.' : '')
const MATERIAL = 'PRODUKT: ' + produkt + '\nTHEMA: ' + A.thema + '\nFRAGE: ' + A.frage + '\n' +
  (material.length ? 'MATERIAL (mit dem Read-Werkzeug ansehen, Bilder anschauen):\n' + material.map(m => '- ' + m).join('\n') : 'Kein Datei-Material.') +
  (A.materialText ? '\nMATERIAL ALS TEXT:\n' + A.materialText : '')

const STIMMUNG = {
  type: 'object',
  properties: {
    figuren: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          alter: { type: 'integer' },
          geschlecht: { type: 'string' },
          land: { type: 'string' },
          ort: { type: 'string' },
          taetigkeit: { type: 'string' },
          denkstil: { type: 'string', enum: ['Mensch', 'KI'] },
          spielt_solche_dinge: { type: 'string', enum: ['oft', 'manchmal', 'nie'] },
          interesse: { type: 'integer', minimum: 0, maximum: 10 },
          wuerde_nutzen: { type: 'string', enum: ['ja', 'vielleicht', 'nein'] },
          erster_gedanke: { type: 'string' },
          spricht: { type: 'boolean' },
          warum_reden_oder_schweigen: { type: 'string' },
        },
        required: ['id', 'name', 'alter', 'geschlecht', 'land', 'ort', 'taetigkeit', 'denkstil', 'spielt_solche_dinge', 'interesse', 'wuerde_nutzen', 'erster_gedanke', 'spricht', 'warum_reden_oder_schweigen'],
      },
    },
  },
  required: ['figuren'],
}

const WORT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    aussage: { type: 'string' },
    gefaellt: { type: 'array', items: { type: 'string' } },
    stoert: { type: 'array', items: { type: 'string' } },
    unklar: { type: 'array', items: { type: 'string' } },
    vorschlag: { type: 'string' },
    wuerde_nutzen_10: { type: 'integer', minimum: 1, maximum: 10 },
  },
  required: ['id', 'aussage', 'gefaellt', 'stoert', 'unklar', 'vorschlag', 'wuerde_nutzen_10'],
}

const DISKUSSION = {
  type: 'object',
  properties: {
    verlauf_kurz: { type: 'string' },
    meinungswechsel: { type: 'array', items: { type: 'string' } },
    einig: { type: 'array', items: { type: 'string' } },
    streit: { type: 'array', items: { type: 'string' } },
    leise_mehrheit: { type: 'string' },
  },
  required: ['verlauf_kurz', 'meinungswechsel', 'einig', 'streit', 'leise_mehrheit'],
}

const BERICHT = {
  type: 'object',
  properties: {
    datei: { type: 'string' },
    kurzfassung: { type: 'string' },
    kernpunkte: { type: 'array', items: { type: 'string' } },
    empfehlungen: { type: 'array', items: { type: 'string' } },
    wer_ist_relevant: { type: 'string' },
    fuer_gruender: { type: 'string' },
    offen: { type: 'string' },
  },
  required: ['datei', 'kurzfassung', 'kernpunkte', 'empfehlungen', 'wer_ist_relevant', 'fuer_gruender', 'offen'],
}

// 1. Stimmung: alle Gezogenen in Zehnergruppen
phase('Stimmung')
const gruppen = []
for (let i = 0; i < ids.length; i += 10) gruppen.push(ids.slice(i, i + 10))
const stimmung = [].concat(...(await parallel(gruppen.map((g, k) => () => {
  const dateien = Array.from(new Set(g.map(datei)))
  return agent(
    'Du simulierst einen Teil einer Entwicklungsrunde von MSY Studio. Im Raum sitzen ' + anzahl + ' zufällig gezogene Figuren aus der simulierten Welt. Du übernimmst diese ' + g.length + ':\n' +
    g.join(', ') + '\nIhre vollständigen Steckbriefe stehen in: ' + dateien.join(', ') + ' (nur diese IDs lesen).\n\n' + MATERIAL + '\n\n' +
    'Für jede dieser Figuren simulierst du ehrlich, was in ihr vorgeht, wenn das Thema vorgestellt wird. Maßgeblich sind Alter, Leben, Sorgen, Interessen, Gewohnheiten und Denkstil (Mensch = Bauchgefühl; KI = nüchtern und systematisch).\n' +
    '- Viele interessiert ein Thema nicht, manche verstehen es nicht, manche sind abgelenkt. Das ist erwünscht.\n' +
    '- spricht: Würde diese Person im Meeting etwas sagen? Schüchterne, Desinteressierte und Überforderte schweigen oft, Laute reden auch ohne Ahnung.\n' +
    '- erster_gedanke: ein Satz in ihren eigenen Worten.\n' +
    '- Übernimm alter, geschlecht, land, ort und taetigkeit (Beruf oder Schule) genau aus dem Steckbrief.\n\n' + REGELN,
    { label: 'Stimmung ' + (k + 1) + ' (' + g[0] + '–' + g[g.length - 1] + ')', phase: 'Stimmung', schema: STIMMUNG, model: stimmungModell, effort: stimmungEffort }
  ).then(r => (r && r.figuren) ? r.figuren : [])
}))).filter(Boolean))
log('Stimmung: ' + stimmung.length + ' von ' + ids.length + ' Figuren, davon ' + stimmung.filter(f => f.spricht).length + ' wollen reden')

// 2. Wortmeldungen: wer redet (deterministisch begrenzt, Kritiker bleiben dabei).
// Gleichstand entscheidet eine aus dem Startwert gemischte Reihenfolge der Gezogenen, nicht die Kennung:
// die Kennungen sind nach Laendern vergeben, sonst kaemen bei Gleichstand fast nur Figuren eines Landes zu Wort.
phase('Wortmeldungen')
const mischen = prng(hash('redner|' + seed))
const reihenfolge = ids.slice()
for (let i = reihenfolge.length - 1; i > 0; i--) {
  const j = Math.floor(mischen() * (i + 1))
  const t = reihenfolge[i]; reihenfolge[i] = reihenfolge[j]; reihenfolge[j] = t
}
const rang = new Map(reihenfolge.map((id, i) => [id, i]))
const platz = f => (rang.has(f.id) ? rang.get(f.id) : rang.size)
const nachPlatz = (a, b) => platz(a) - platz(b) || String(a.id).localeCompare(String(b.id))
const redenWollen = stimmung.filter(f => f.spricht)
let redner = redenWollen
if (redenWollen.length > maxRedner) {
  const kritiker = redenWollen.filter(f => f.interesse <= 3).sort(nachPlatz).slice(0, Math.min(5, Math.floor(maxRedner / 4)))
  const rest = redenWollen.filter(f => !kritiker.includes(f)).sort((a, b) => b.interesse - a.interesse || nachPlatz(a, b))
  redner = kritiker.concat(rest.slice(0, maxRedner - kritiker.length))
}
const worte = (await parallel(redner.map(f => () => agent(
  'Du bist ' + f.name + ' (' + f.id + ') aus der simulierten Welt von MSY Studio. Dein vollständiger Steckbrief steht in ' + datei(f.id) + ' (nur deinen Eintrag lesen).\n' +
  'Denkstil: ' + (f.denkstil === 'KI' ? 'nüchtern und systematisch wie eine KI, aber mit deinem Leben und deinen Interessen' : 'wie ein Mensch, aus dem Bauch heraus, mit deinen Launen und Vorurteilen') + '.\n' +
  'Dein erster Gedanke war: „' + f.erster_gedanke + '“\n\n' + MATERIAL + '\n\n' +
  'Du meldest dich im Meeting zu Wort. Sieh dir das Material so an, wie du es wirklich tun würdest, und sag dann deine Meinung in deinen eigenen Worten (aussage, 2–6 Sätze). Sei ehrlich: Wenn du es nicht verstehst oder nicht brauchst, sag das.\n\n' + REGELN,
  { label: 'Wort ' + f.id + ' ' + f.name, phase: 'Wortmeldungen', schema: WORT, model: 'sonnet', effort: 'medium' }
)))).filter(Boolean)

// 3. Diskussion
phase('Diskussion')
const steckbriefKurz = f => f.name + ' (' + f.id + ', ' + f.alter + ', ' + f.ort + ', ' + f.taetigkeit + ', ' + f.denkstil + ', spielt ' + f.spielt_solche_dinge + ')'
const diskussion = await agent(
  'Du simulierst das Meeting einer Entwicklungsrunde von MSY Studio als Ganzes.\n' + MATERIAL + '\n\n' +
  'Wortmeldungen (wer redet):\n' + worte.map(w => { const f = stimmung.find(x => x.id === w.id); return '- ' + (f ? steckbriefKurz(f) : w.id) + ': „' + w.aussage + '“' }).join('\n') + '\n\n' +
  'Stimmung der Schweigenden (' + stimmung.filter(f => !worte.some(w => w.id === f.id)).length + ' Personen): ' +
  stimmung.filter(f => !worte.some(w => w.id === f.id)).map(f => f.id + ' ' + f.alter + 'J Interesse ' + f.interesse + ' „' + f.erster_gedanke + '“').join(' | ') + '\n\n' +
  'Spiele das Meeting realistisch durch: Wer reagiert auf wen, wer dominiert, wer wird überhört, welche Missverständnisse gibt es, wer ändert seine Meinung, was denkt die leise Mehrheit? Schreibe das Meeting nach ' + A.ausgabe + '/diskussion.md (Ordner anlegen).\n\n' + REGELN,
  { label: 'Diskussion', phase: 'Diskussion', schema: DISKUSSION }
)

// Kennzahlen deterministisch
function band(a) {
  if (a < 15) return 'unter 15'
  if (a <= 17) return '15–17'
  if (a <= 24) return '18–24'
  if (a <= 30) return '25–30'
  if (a <= 44) return '31–44'
  if (a <= 59) return '45–59'
  return '60+'
}
function gruppiere(feld) {
  const out = {}
  for (const f of stimmung) {
    const k = feld(f)
    if (!out[k]) out[k] = { n: 0, interesse_summe: 0, nutzen_ja: 0, nutzen_vielleicht: 0, redet: 0 }
    out[k].n++
    out[k].interesse_summe += f.interesse
    if (f.wuerde_nutzen === 'ja') out[k].nutzen_ja++
    if (f.wuerde_nutzen === 'vielleicht') out[k].nutzen_vielleicht++
    if (f.spricht) out[k].redet++
  }
  for (const k of Object.keys(out)) { out[k].interesse_mittel = Math.round(out[k].interesse_summe / out[k].n * 10) / 10; delete out[k].interesse_summe }
  return out
}
const zahlen = {
  seed: seed, gezogen: ids.length, mit_stimmung: stimmung.length, wollten_reden: redenWollen.length, haben_geredet: worte.length,
  denkstil: { Mensch: stimmung.filter(f => f.denkstil === 'Mensch').length, KI: stimmung.filter(f => f.denkstil === 'KI').length },
  nach_alter: gruppiere(f => band(f.alter)),
  nach_spielgewohnheit: gruppiere(f => f.spielt_solche_dinge),
  nach_land: gruppiere(f => f.land),
  nach_denkstil: gruppiere(f => f.denkstil),
  wahrscheinliche_nutzer: stimmung.filter(f => f.wuerde_nutzen === 'ja' && f.spielt_solche_dinge !== 'nie').map(f => f.id),
}

// 4. Bericht
phase('Bericht')
const roh = { thema: A.thema, frage: A.frage, produkt: produkt, zahlen: zahlen, stimmung: stimmung, worte: worte, diskussion: diskussion }
const bericht = await agent(
  'Du wertest eine Entwicklungsrunde mit der simulierten Welt für die Projektleitung aus.\n' +
  'Rohdaten (JSON, vollständig):\n' + JSON.stringify(roh) + '\n\nDas Meeting steht in ' + A.ausgabe + '/diskussion.md.\n\n' +
  'Aufgaben:\n' +
  '1. Schreibe die Rohdaten unverändert als ' + A.ausgabe + '/rohdaten.json.\n' +
  '2. Schreibe ' + A.ausgabe + '/bericht.md in einfacher Sprache mit diesen Teilen:\n' +
  '   - Kopfzeile „SIMULATION: simulierte Figuren, keine echten Menschen“.\n' +
  '   - Wer im Raum war: Verteilung nach Alter, Land, Spielgewohnheit und Denkstil. Übernimm die Zahlen aus „zahlen“ genau so.\n' +
  '   - Die leise Mehrheit: Interesse und Nutzungsabsicht.\n' +
  '   - Wortmeldungen: wichtige Aussagen IMMER mit Herkunft (Name, ID, Alter, Lage, ob die Person das selbst nutzen würde).\n' +
  '   - Gewichtung: Was sagen die wahrscheinlichen Nutzer (würden es nutzen und spielen oder nutzen so etwas), was sagen die anderen? Wo widersprechen sich die beiden Gruppen? Welche Meinung ist für die Entscheidung wirklich relevant, und warum?\n' +
  '   - Wer würde es nutzen: welche Alters- und Lebenslagen zeigen das meiste Interesse? Die Zielgruppe ergibt sich hier von selbst.\n' +
  '   - Empfehlungen an die Projektleitung, je mit „von wem“ und „wie relevant“.\n' +
  '   - Grenzen der Simulation.\n' +
  '   - „In 3 Sätzen“: einfache Sprache ohne Fachwörter, mit dem Hinweis, dass es simuliert ist.\n' +
  (A.projektablage ? '3. Schreibe bericht.md und rohdaten.json zusätzlich unverändert nach ' + A.projektablage + ' (Ordner anlegen).\n4. ' : '3. ') +
  'Gib die Kurzfassung strukturiert zurück (Feld fuer_gruender = die 3 Sätze).\n\n' + REGELN,
  { label: 'Bericht', phase: 'Bericht', schema: BERICHT }
)

return { seed: seed, ids: ids, zahlen: zahlen, diskussion: diskussion, bericht: bericht }
