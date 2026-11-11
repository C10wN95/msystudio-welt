// Prüft welt/bauplan.json auf Vollständigkeit und Stimmigkeit.
// Aufruf:
//   node werkzeug/bauplan-pruefen.mjs [pfad/zu/bauplan.json] [--privat <datei>]
//   --privat: private Liste (Standard: privat/ausschluss.json); fehlt sie, entfällt die Prüfung ausgeschlossener Vornamen (Hinweis).
// Ausgabe: Kennzahlen und Befunde; Exit-Code 1 bei Fehlern.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ladePrivat } from './welt-skelett.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const iPrivat = argv.indexOf('--privat');
const privatDatei = iPrivat >= 0 ? argv.splice(iPrivat, 2)[1] : undefined;
const pfad = argv[0] || join(hier, '..', 'welt', 'bauplan.json');
const roh = readFileSync(pfad, 'utf8');
const fehler = [];
const hinweise = [];
let B;
try { B = JSON.parse(roh); } catch (e) { console.log('FEHLER: kein gültiges JSON:', e.message); process.exit(1); }
if (roh.charCodeAt(0) === 0xFEFF) fehler.push('Datei beginnt mit BOM');

const TOL = 0.011;
const summe = (o) => Object.values(o).filter((x) => typeof x === 'number').reduce((s, x) => s + x, 0);
function verteilung(o, name) {
  if (!o || typeof o !== 'object') { fehler.push(name + ': fehlt'); return; }
  const s = summe(o);
  if (Math.abs(s - 1) > TOL) fehler.push(name + ': Summe ' + s.toFixed(3) + ' statt 1');
}

// Steuerzeichen in Texten
(function steuer(v, weg) {
  if (typeof v === 'string') { if (/[\u0000-\u001f]/.test(v)) fehler.push('Steuerzeichen in ' + weg); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => steuer(x, weg + '[' + i + ']')); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) steuer(x, weg + '.' + k);
})(B, 'bauplan');

// Pflichtabschnitte
for (const k of ['meta', 'quellen', 'ziel', 'orte', 'herkunft', 'alter', 'haushalte', 'bildung', 'taetigkeiten', 'namen', 'sozial', 'probleme', 'geraete', 'spielen', 'denkstil']) {
  if (!(k in B)) fehler.push('Abschnitt fehlt: ' + k);
}

// Quellen
const qIds = new Set((B.quellen || []).map((q) => q.id));
for (const q of B.quellen || []) for (const f of ['id', 'titel', 'herausgeber', 'url', 'abgerufen']) if (!q[f]) fehler.push('Quelle ' + q.id + ': Feld ' + f + ' fehlt');
(function refs(v, weg) {
  if (Array.isArray(v)) { v.forEach((x, i) => refs(x, weg + '[' + i + ']')); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if ((k === 'quellen' || k === 'quelle') && weg !== 'bauplan') {
      const liste = Array.isArray(x) ? x : (typeof x === 'string' ? [x] : []);
      for (const id of liste) if (/^Q\d+$/.test(id) && !qIds.has(id)) fehler.push('unbekannte Quelle ' + id + ' in ' + weg);
    }
    refs(x, weg + '.' + k);
  }
})(B, 'bauplan');

// Orte
const orte = B.orte || [];
if (orte.length < 15 || orte.length > 20) fehler.push('Orte: ' + orte.length + ' statt 15–20');
const jeLand = {};
let figuren = 0;
const herkunftCodes = new Set(((B.herkunft || {}).gruppen || []).map((g) => g.code));
for (const o of orte) {
  figuren += o.figuren;
  jeLand[o.land] = (jeLand[o.land] || 0) + o.figuren;
  if (!o.stadtteile || o.stadtteile.length < 2 || o.stadtteile.length > 4) fehler.push('Ort ' + o.id + ': ' + (o.stadtteile || []).length + ' Stadtteile');
  verteilung(Object.fromEntries((o.stadtteile || []).map((s) => [s.name, s.anteil])), 'Ort ' + o.id + ' Stadtteile');
  verteilung(o.herkunft, 'Ort ' + o.id + ' Herkunft');
  for (const c of Object.keys(o.herkunft || {})) if (!herkunftCodes.has(c)) fehler.push('Ort ' + o.id + ': Herkunft ' + c + ' nicht in herkunft.gruppen');
  if (!o.sprachen || !o.sprachen.length) fehler.push('Ort ' + o.id + ': keine Sprachen');
}
if (figuren !== 1000) fehler.push('Figuren in Orten: ' + figuren + ' statt 1000');
const andere = Object.entries(jeLand).filter(([l]) => l !== 'DE' && l !== 'TR').reduce((s, [, n]) => s + n, 0);
if (jeLand.DE !== 450 || jeLand.TR !== 300 || andere !== 250) fehler.push('Länderanteile DE ' + jeLand.DE + ', TR ' + jeLand.TR + ', andere ' + andere + ' statt 450/300/250');

// Herkunft und Namenspools
const namen = B.namen || {};
const pools = namen.pools || {};
for (const g of (B.herkunft || {}).gruppen || []) {
  const zu = (namen.zuordnung_herkunft_zu_pool || {})[g.code];
  if (!zu) fehler.push('Herkunft ' + g.code + ': keine Namenszuordnung');
  else for (const p of zu) { const id = p.split(' ')[0]; if (!pools[id]) fehler.push('Herkunft ' + g.code + ': Pool ' + id + ' fehlt'); }
  if (g.glaube) verteilung(g.glaube, 'Glaube ' + g.code);
}

// Alter
const alter = B.alter || {};
let minderGewichtet = 0;
for (const [land, n] of Object.entries(jeLand)) {
  const a = (alter.je_land || {})[land];
  if (!a) { fehler.push('Alter: Land ' + land + ' fehlt'); continue; }
  verteilung(a.welt, 'Alter welt ' + land);
  verteilung(a.real, 'Alter real ' + land);
  const zielV = a[a.zielverteilung || 'welt'];
  if (!zielV) { fehler.push('Alter ' + land + ': Zielverteilung ' + a.zielverteilung + ' fehlt'); continue; }
  verteilung(zielV, 'Alter Ziel ' + land);
  minderGewichtet += n * (zielV['12-14'] + zielV['15-17']);
}
const minder = minderGewichtet / 1000;
if (minder < 0.12 || minder > 0.15) fehler.push('Minderjährige weltweit ' + (minder * 100).toFixed(1) + ' % statt 12–15 %');

// Haushalte
const hh = B.haushalte || {};
for (const [land, v] of Object.entries((hh.personen_anteile_je_land || {}))) if (/^[A-Z]{2}$/.test(land)) verteilung(v, 'Haushalte ' + land);
for (const [land, v] of Object.entries(hh.partner_altersabstand || {})) if (/^[A-Z]{2}$/.test(land)) verteilung(v, 'Partnerabstand ' + land);
for (const [k, v] of Object.entries(((hh.kinderzahl || {}).abgeschlossen_frauen_45_54) || {})) verteilung(v, 'Kinderzahl ' + k);
for (const [k, v] of Object.entries(((hh.eltern_kind_abstand || {}).alter_der_mutter_bei_geburt) || {})) if (typeof v === 'object') verteilung(v, 'Mutteralter ' + k);

// Bildung
const sf = ((B.bildung || {}).schulformen_12_17) || {};
for (const [k, v] of Object.entries(sf)) {
  if (!v || typeof v !== 'object' || k.includes('bundesweit') || k.includes('sekundarstufe') || k === 'DE_ab_16_statt_schule') continue;
  const nur = Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'number'));
  if (Object.keys(nur).length >= 2) verteilung(nur, 'Schulformen ' + k);
}
const ab = ((B.bildung || {}).abschluesse_erwachsene) || {};
for (const teil of ['DE_schulabschluss', 'DE_berufsabschluss', 'TR_hoechster_abschluss']) for (const [band, v] of Object.entries(ab[teil] || {})) if (typeof v === 'object') verteilung(v, teil + ' ' + band);

// Tätigkeiten
const t = B.taetigkeiten || {};
const kat = t.katalog || [];
const titel = kat.map((x) => x.titel);
const eindeutig = new Set(titel).size;
if (eindeutig < 450) fehler.push('Berufskatalog: ' + eindeutig + ' eindeutige Titel statt mindestens 450');
if (eindeutig !== titel.length) fehler.push('Berufskatalog: doppelte Titel');
const bildungCodes = new Set(Object.keys(((B.bildung || {}).abschluss_codes) || {}));
const zeitCodes = new Set(Object.keys(t.zeiten_legende || {}));
for (const x of kat) {
  if (!bildungCodes.has(x.bildung)) fehler.push('Beruf ' + x.titel + ': Bildung ' + x.bildung + ' unbekannt');
  if (!(x.stufe >= 1 && x.stufe <= 5)) fehler.push('Beruf ' + x.titel + ': Stufe ' + x.stufe);
  if (!(x.frauen >= 0 && x.frauen <= 1)) fehler.push('Beruf ' + x.titel + ': Frauenanteil ' + x.frauen);
  if (!(x.gewicht >= 1 && x.gewicht <= 9)) fehler.push('Beruf ' + x.titel + ': Gewicht ' + x.gewicht);
  for (const z of x.zeiten || []) if (!zeitCodes.has(z)) fehler.push('Beruf ' + x.titel + ': Zeit ' + z + ' unbekannt');
}
for (const land of ['DE', 'TR']) for (const [band, v] of Object.entries(((t.status || {})[land]) || {})) if (v && typeof v === 'object') verteilung(v, 'Status ' + land + ' ' + band);
for (const [land, v] of Object.entries((((t.einkommen || {}).schicht || {}).verteilung) || {})) if (typeof v === 'object') verteilung(v, 'Schicht ' + land);

// Namen
const vornamen = new Set();
const nachnamen = new Set();
let vornamenEintraege = 0;
const privat = ladePrivat(privatDatei);
if (!privat.gefunden) hinweise.push('Private Liste fehlt (privat/ausschluss.json): Prüfung ausgeschlossener Vornamen übersprungen');
const ausschluss = new Set(privat.vornamen);
for (const [pid, p] of Object.entries(pools)) {
  for (const g of ['m', 'w']) for (const [gen, liste] of Object.entries((p[g]) || {})) {
    if (!['g1', 'g2', 'g3', 'g4'].includes(gen)) fehler.push('Pool ' + pid + ': unbekannte Generation ' + gen);
    for (const n of liste) {
      vornamenEintraege++;
      vornamen.add(n);
      for (const teil of n.split(' ')) if (ausschluss.has(teil)) fehler.push('Pool ' + pid + ': ausgeschlossener Vorname ' + n);
    }
  }
  for (const n of p.nachnamen || []) nachnamen.add(n);
}
if (vornamen.size < 1200) fehler.push('Vornamen: ' + vornamen.size + ' eindeutige statt mindestens 1200');
if (nachnamen.size < 700) fehler.push('Nachnamen: ' + nachnamen.size + ' eindeutige statt mindestens 700');

// Soziales, Spielen, Geräte
const so = B.sozial || {};
verteilung((so.enge_freunde || {}).erwachsene, 'enge Freunde Erwachsene');
verteilung((so.enge_freunde || {})['12-17'], 'enge Freunde 12-17');
verteilung((so.netz_in_der_welt || {}).grad, 'Netz Grad');
verteilung((so.netz_in_der_welt || {}).kanten_arten, 'Netz Kantenarten');
verteilung((so.netz_in_der_welt || {}).staerke, 'Netz Stärke');
for (const [band, v] of Object.entries(((so.treff_erlaubnis || {}).verteilung) || {})) verteilung(v, 'Treff-Erlaubnis ' + band);
verteilung(Object.fromEntries((((so.freie_zeiten || {}).muster) || []).map((m) => [m.code, m.anteil])), 'freie Zeiten');
verteilung(((so.kreise || {}).mitgliedschaften_je_figur), 'Kreis-Mitgliedschaften');
const sp = B.spielen || {};
verteilung((sp.bluff_freude || {}).verteilung, 'Bluff-Freude');
verteilung((sp.ehrgeiz || {}).verteilung, 'Ehrgeiz');
verteilung((sp.anleitung || {}).verteilung, 'Anleitung');
verteilung(((sp.videospiele || {}).intensitaet_bei_spielenden), 'Spiel-Intensität');
for (const [k, v] of Object.entries((((B.geraete || {}).handy_klassen || {}).verteilung) || {})) verteilung(v, 'Handy-Klassen ' + k);
for (const land of Object.keys(jeLand)) if (!(((B.geraete || {}).ios_anteil || {})[land])) fehler.push('iOS-Anteil fehlt für ' + land);

// Probleme
for (const p of ((B.probleme || {}).arten) || []) {
  if (!p.code || !p.name || !p.basis) fehler.push('Problem ohne code, name oder basis');
  for (const land of ['DE', 'TR']) for (const [band, x] of Object.entries(p[land] || {})) if (!(x >= 0 && x <= 1)) fehler.push('Problem ' + p.code + ' ' + land + ' ' + band + ': ' + x);
}

// Denkstil
const ds = B.denkstil || {};
if (!ds.verteilung || ds.verteilung.Mensch !== 0.7 || ds.verteilung.KI !== 0.3) fehler.push('Denkstil nicht 70/30');
const arten = (((ds.ki || {}).spielarten) || []);
if (arten.length < 8 || arten.length > 12) fehler.push('KI-Spielarten: ' + arten.length + ' statt 8–12');
verteilung(Object.fromEntries(arten.map((a) => [a.code, a.anteil])), 'KI-Spielarten');

// Ergebnis
console.log('Datei:', pfad, '(' + Math.round(roh.length / 1024) + ' KB)');
console.log('Orte:', orte.length, '| Figuren:', figuren, '| Länder:', JSON.stringify(jeLand));
console.log('Minderjährige weltweit (welt):', (minder * 100).toFixed(1) + ' %');
console.log('Berufe:', eindeutig, '| Branchen:', new Set(kat.map((x) => x.branche)).size);
console.log('Vornamen eindeutig:', vornamen.size, '(Einträge ' + vornamenEintraege + ') | Nachnamen eindeutig:', nachnamen.size, '| Namens-Pools:', Object.keys(pools).length);
console.log('Quellen:', qIds.size, '| Probleme:', (((B.probleme || {}).arten) || []).length, '| KI-Spielarten:', arten.length);
for (const h of hinweise) console.log('HINWEIS:', h);
if (fehler.length) { console.log('FEHLER (' + fehler.length + '):'); for (const f of fehler) console.log(' -', f); process.exit(1); }
console.log('OK: keine Fehler gefunden.');
