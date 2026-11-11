#!/usr/bin/env node
/*
 * welt-pruefen.mjs - Prueft die MSY-Welt gegen den Bauplan.
 *
 * Prueft welt/skelett.json und welt/kreise.json und, sobald vorhanden, welt/figuren-01.json bis figuren-10.json
 * (Steckbriefe: alle Skelett-Felder unveraendert plus die Lebensfelder). Vergleicht die Verteilungen mit
 * welt/bauplan.json.
 *
 * Aufruf:
 *   node werkzeug/welt-pruefen.mjs [--welt <ordner>] [--bauplan <datei>] [--md <datei>|-]
 *                                  [--figuren-pflicht] [--leben-felder a,b,c] [--still] [--privat <datei>]
 *   --md               schreibt den Verteilungsvergleich als Markdown (Datei oder - fuer die Konsole)
 *   --figuren-pflicht  fehlende figuren-NN.json sind Fehler (sonst nur Hinweis)
 *   --leben-felder     Pflichtfelder der Steckbriefe (Standard: persoenlichkeit,widerspruch,alltag,was_gerade_los_ist)
 *   --privat           private Liste (Standard: privat/ausschluss.json); fehlt sie, entfallen die Ausschlusspruefungen (Hinweis)
 * Exit-Code 0 ohne Fehler, 1 mit Fehlern, 2 wenn Dateien fehlen oder kein gueltiges JSON sind.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BAENDER, STATUS_CODES, KREIS_ARTEN, FAMILIENSTAENDE, STUFE_BILDUNG, TREFF_STUFEN, PROMINENTE_ZUSATZ, band, normName, argumente, fid, ladePrivat } from './welt-skelett.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const A = argumente(process.argv.slice(2));
const WELT = resolve(A.welt || join(HIER, '..', 'welt'));
const BAUPLAN = resolve(A.bauplan || join(WELT, 'bauplan.json'));
const LEBEN_FELDER = String(A['leben-felder'] || 'persoenlichkeit,widerspruch,alltag,was_gerade_los_ist').split(',').map(s => s.trim()).filter(Boolean);
const fehler = [], hinweise = [];
const F_ = (m) => fehler.push(m), H_ = (m) => hinweise.push(m);
const MAX_JE_REGEL = 12;
const zaehlerRegel = new Map();
function fehlerR(regel, m) { const n = (zaehlerRegel.get(regel) || 0) + 1; zaehlerRegel.set(regel, n); if (n <= MAX_JE_REGEL) F_(regel + ': ' + m); else if (n === MAX_JE_REGEL + 1) F_(regel + ': weitere Fälle nicht einzeln aufgeführt'); }
function hinweisR(regel, m) { const n = (zaehlerRegel.get('h:' + regel) || 0) + 1; zaehlerRegel.set('h:' + regel, n); if (n <= MAX_JE_REGEL) H_(regel + ': ' + m); else if (n === MAX_JE_REGEL + 1) H_(regel + ': weitere Fälle nicht einzeln aufgeführt'); }

function lade(datei, pflicht = true) {
  if (!existsSync(datei)) { if (pflicht) { console.log('FEHLER: Datei fehlt: ' + datei); process.exit(2); } return null; }
  const roh = readFileSync(datei);
  if (roh[0] === 0xEF && roh[1] === 0xBB && roh[2] === 0xBF) fehler.push(datei + ': beginnt mit BOM');
  const text = roh.toString('utf8');
  if (text.includes('�')) fehler.push(datei + ': enthält ungültige UTF-8-Zeichen');
  try { return JSON.parse(text); } catch (e) { console.log('FEHLER: kein gültiges JSON: ' + datei + ' (' + e.message + ')'); process.exit(2); }
}
function steuerzeichen(v, weg, regel) {
  if (typeof v === 'string') { if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) fehlerR(regel, 'Steuerzeichen in ' + weg); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => steuerzeichen(x, weg + '[' + i + ']', regel)); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) steuerzeichen(x, weg + '.' + k, regel);
}
const kanon = v => (Array.isArray(v) ? '[' + v.map(kanon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + kanon(v[k])).join(',') + '}' : JSON.stringify(v));
const pct = (a, b) => (b ? (100 * a / b) : 0);
const f1 = x => x.toFixed(1).replace('.', ',');
const ohneMeta = o => { const r = {}; for (const [k, v] of Object.entries(o || {})) if (typeof v === 'number') r[k] = v; return r; };

const B = lade(BAUPLAN);
const S = lade(join(WELT, 'skelett.json'));
const K = lade(join(WELT, 'kreise.json'));
steuerzeichen(S, 'skelett', 'R13 Steuerzeichen');
steuerzeichen(K, 'kreise', 'R13 Steuerzeichen');

const F = Array.isArray(S.figuren) ? S.figuren : [];
const byId = new Map(F.map(p => [p.id, p]));
const ORTE = Object.fromEntries(B.orte.map(o => [o.id, o]));
const HK = new Set(B.herkunft.gruppen.map(g => g.code));
const PROBLEM_CODES = new Set(B.probleme.arten.map(a => a.code));
const MUSTER = new Set(B.sozial.freie_zeiten.muster.map(m => m.code));
const HINDERNISSE = new Set(B.sozial.treff_hindernisse.liste.map(h => h.hindernis));
const KI_ARTEN = new Map(B.denkstil.ki.spielarten.map(s => [s.name, s]));
const FAERBUNGEN = new Set(B.denkstil.mensch.faerbungen);
const KATALOG = new Map(B.taetigkeiten.katalog.map(j => [j.titel, j]));
const md = [];

// ---------- R1 Anzahl, IDs, Orte ----------
if (F.length !== 1000) F_('R1 Anzahl: ' + F.length + ' Figuren statt 1000');
F.forEach((p, i) => { if (p.id !== fid(i + 1)) fehlerR('R1 IDs', 'Position ' + (i + 1) + ' hat ' + p.id + ' statt ' + fid(i + 1)); });
if (byId.size !== F.length) F_('R1 IDs: doppelte IDs');
const proOrt = {}, proLand = {};
for (const p of F) { proOrt[p.ort] = (proOrt[p.ort] || 0) + 1; proLand[p.land] = (proLand[p.land] || 0) + 1; }
for (const o of B.orte) if ((proOrt[o.id] || 0) !== o.figuren) fehlerR('R1 Orte', o.id + ': ' + (proOrt[o.id] || 0) + ' statt ' + o.figuren);
const andere = F.length - (proLand.DE || 0) - (proLand.TR || 0);
if ((proLand.DE || 0) !== 450 || (proLand.TR || 0) !== 300 || andere !== 250) F_('R1 Länder: DE ' + proLand.DE + ', TR ' + proLand.TR + ', andere ' + andere + ' (Soll 450, 300, 250)');

// ---------- Felder und Werte ----------
const ID_RE = /^F\d{4}$/;
const listenFelder = ['kinder_ids', 'eltern_ids', 'geschwister_ids', 'freunde_ids', 'kollegen_ids', 'klassen_ids', 'online_freunde_ids'];
for (const p of F) {
  const w = (m) => fehlerR('R0 Felder', p.id + ': ' + m);
  if (!ID_RE.test(p.id || '')) w('id ungültig');
  for (const k of ['haushalt_id', 'vorname', 'nachname', 'stadtteil', 'taetigkeit', 'denkstil_art', 'freizeit_muster']) if (typeof p[k] !== 'string' || !p[k]) w(k + ' fehlt oder ist leer');
  if (!Number.isInteger(p.alter) || p.alter < 12 || p.alter > 105) w('alter ungültig: ' + p.alter);
  if (!['m', 'w'].includes(p.geschlecht)) w('geschlecht ungültig: ' + p.geschlecht);
  if (!Array.isArray(p.herkunft) || !p.herkunft.length || p.herkunft.length > 2 || p.herkunft.some(h => !HK.has(h))) w('herkunft ungültig: ' + JSON.stringify(p.herkunft));
  const o = ORTE[p.ort];
  if (!o) w('ort unbekannt: ' + p.ort); else {
    if (o.land !== p.land) w('land ' + p.land + ' passt nicht zu ort ' + p.ort);
    if (!o.stadtteile.some(s => s.name === p.stadtteil)) w('stadtteil unbekannt: ' + p.stadtteil);
  }
  if (!Array.isArray(p.sprachen) || !p.sprachen.length || p.sprachen.some(s => !s || typeof s.sprache !== 'string' || typeof s.niveau !== 'string')) w('sprachen ungültig');
  if (!p.bildung || typeof p.bildung !== 'object' || !(p.bildung.abschluss in STUFE_BILDUNG) || !['schule', 'ausbildung', 'studium', 'abschluss'].includes(p.bildung.stufe)) w('bildung ungültig');
  if (!STATUS_CODES.includes(p.status)) w('status ungültig: ' + p.status);
  if (!['knapp', 'mittel', 'gut'].includes(p.einkommen)) w('einkommen ungültig: ' + p.einkommen);
  if (!FAMILIENSTAENDE.includes(p.familienstand)) w('familienstand ungültig: ' + p.familienstand);
  if (p.partner_id !== null && !ID_RE.test(p.partner_id || '')) w('partner_id ungültig');
  for (const k of listenFelder) if (!Array.isArray(p[k]) || p[k].some(x => !byId.has(x))) w(k + ' ungültig oder mit unbekannter ID');
  for (const k of listenFelder) if (Array.isArray(p[k]) && new Set(p[k]).size !== p[k].length) w(k + ' enthält doppelte IDs');
  for (const k of listenFelder) if (Array.isArray(p[k]) && p[k].includes(p.id)) w(k + ' enthält die Figur selbst');
  if (!Array.isArray(p.kleine_kinder) || p.kleine_kinder.some(a => !Number.isInteger(a) || a < 0 || a > 11)) w('kleine_kinder ungültig');
  if (!p.geraet || typeof p.geraet.handy !== 'string' || !('klasse' in p.geraet) || !Array.isArray(p.geraet.sonst)) w('geraet ungültig (handy, klasse, sonst)');
  if (!['Mensch', 'KI'].includes(p.denkstil)) w('denkstil ungültig: ' + p.denkstil);
  else if (p.denkstil === 'KI' && !KI_ARTEN.has(p.denkstil_art)) w('denkstil_art passt nicht zu KI: ' + p.denkstil_art);
  else if (p.denkstil === 'Mensch' && !FAERBUNGEN.has(p.denkstil_art)) w('denkstil_art passt nicht zu Mensch: ' + p.denkstil_art);
  if (!MUSTER.has(p.freizeit_muster)) w('freizeit_muster unbekannt: ' + p.freizeit_muster);
  if (!TREFF_STUFEN.includes(p.treffen_erlaubt)) w('treffen_erlaubt ungültig: ' + p.treffen_erlaubt);
  if (!Array.isArray(p.treffen_hindernis) || p.treffen_hindernis.some(h => !HINDERNISSE.has(h))) w('treffen_hindernis ungültig');
  if (!Array.isArray(p.problem_arten) || p.problem_arten.some(c => !PROBLEM_CODES.has(c))) w('problem_arten ungültig');
  if (!Number.isInteger(p.spielneigung) || p.spielneigung < 0 || p.spielneigung > 5) w('spielneigung ungültig: ' + p.spielneigung);
  if (typeof p.einsam !== 'boolean') w('einsam fehlt');
}

// ---------- R2 Minderjaehrige ----------
const minder = F.filter(p => p.alter <= 17);
if (minder.length < 120 || minder.length > 150) F_('R2 Minderjährige: ' + minder.length + ' (Soll 120 bis 150)');
for (const p of minder) {
  const elternHier = (p.eltern_ids || []).map(id => byId.get(id)).filter(e => e && e.haushalt_id === p.haushalt_id);
  if (!elternHier.length && !p.ausnahme) fehlerR('R2 Minderjährige', p.id + ' lebt ohne Elternteil (Figur) und ohne begründete Ausnahme');
}

// ---------- R3 Denkstil ----------
const ki = F.filter(p => p.denkstil === 'KI').length;
if (ki < 295 || ki > 305) F_('R3 Denkstil: ' + ki + ' KI statt 300'); else if (ki !== 300) H_('R3 Denkstil: ' + ki + ' KI (Ziel genau 300)');
const gruppen = new Map();
const gr = (k, p) => { if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(p); };
for (const p of F) { gr('Land ' + p.land, p); gr('Alter ' + band(p.alter), p); gr('Geschlecht ' + p.geschlecht, p); if (p.schicht) gr('Schicht ' + p.schicht, p); }
const kiTab = [];
for (const [k, ps] of gruppen) {
  if (ps.length < 30) continue;
  const a = ps.filter(p => p.denkstil === 'KI').length / ps.length;
  kiTab.push([k, ps.length, a]);
  if (a < 0.22 || a > 0.38) F_('R3 Denkstil: Gruppe ' + k + ' hat ' + f1(100 * a) + ' % KI (Soll 22 bis 38 %)');
}
const artIst = {}; for (const p of F) if (p.denkstil === 'KI') artIst[p.denkstil_art] = (artIst[p.denkstil_art] || 0) + 1;
for (const [name, s] of KI_ARTEN) { const soll = s.anteil * ki; const ist = artIst[name] || 0; if (Math.abs(ist - soll) > 3) F_('R3 KI-Spielart ' + name + ': ' + ist + ' statt ' + soll.toFixed(0) + ' (±3)'); }

// ---------- R4 Altersverteilung je Land ----------
const altersTab = [];
for (const [land, j] of Object.entries(B.alter.je_land)) {
  const ps = F.filter(p => p.land === land); if (!ps.length) continue;
  const ziel = j[j.zielverteilung];
  let maxD = 0;
  const zeilen = [];
  for (const b of BAENDER) {
    const ist = ps.filter(p => band(p.alter) === b).length / ps.length;
    const d = 100 * (ist - ziel[b]);
    if (Math.abs(d) > Math.abs(maxD)) maxD = d;
    zeilen.push([b, 100 * ziel[b], 100 * ist, d]);
    if (ps.length >= 40 && Math.abs(d) > 3) F_('R4 Alter ' + land + ' ' + b + ': ' + f1(100 * ist) + ' % statt ' + f1(100 * ziel[b]) + ' % (±3 Prozentpunkte)');
  }
  if (ps.length < 40 && Math.abs(maxD) > 10) H_('R4 Alter ' + land + ' (unter 40 Figuren, nur grob): größte Abweichung ' + f1(maxD) + ' Prozentpunkte');
  altersTab.push({ land, n: ps.length, zeilen, maxD, ziel: j.zielverteilung });
}

// ---------- Haushalte ----------
const HH = new Map((S.haushalte || []).map(h => [h.haushalt_id, h]));
for (const p of F) { const h = HH.get(p.haushalt_id); if (!h) fehlerR('R5 Haushalte', p.id + ': Haushalt ' + p.haushalt_id + ' fehlt'); else if (!h.mitglieder.includes(p.id)) fehlerR('R5 Haushalte', p.id + ' fehlt in der Mitgliederliste von ' + h.haushalt_id); }
for (const h of HH.values()) {
  for (const id of h.mitglieder) { const p = byId.get(id); if (!p) fehlerR('R5 Haushalte', h.haushalt_id + ': unbekannte Figur ' + id); else if (p.haushalt_id !== h.haushalt_id || p.ort !== h.ort || p.stadtteil !== h.stadtteil) fehlerR('R5 Haushalte', h.haushalt_id + ': ' + id + ' passt nicht (Haushalt, Ort oder Stadtteil)'); }
  for (const k of h.kleine_kinder || []) if (!(k.alter >= 0 && k.alter < 12)) fehlerR('R5 Haushalte', h.haushalt_id + ': kleines Kind mit Alter ' + k.alter);
}

// ---------- R5 Paare, R6 Eltern, Geschwister ----------
for (const p of F) {
  if (p.partner_id) {
    const q = byId.get(p.partner_id);
    if (!q) { fehlerR('R5 Paare', p.id + ': Partner ' + p.partner_id + ' fehlt'); continue; }
    if (q.partner_id !== p.id) fehlerR('R5 Paare', p.id + ' und ' + q.id + ' nicht beidseitig');
    if (q.ort !== p.ort && !p.partner_grund) fehlerR('R5 Paare', p.id + ' und ' + q.id + ' leben in verschiedenen Orten ohne Grund');
    if (q.haushalt_id !== p.haushalt_id && !p.partner_grund) fehlerR('R5 Paare', p.id + ' und ' + q.id + ' leben getrennt ohne partner_grund');
    if (q.haushalt_id === p.haushalt_id && !['verheiratet', 'zusammenlebend'].includes(p.familienstand)) fehlerR('R5 Paare', p.id + ': Partner im Haushalt, aber familienstand ' + p.familienstand);
    if (q.haushalt_id !== p.haushalt_id && !['in Beziehung', 'verlobt', 'verheiratet', 'getrennt lebend'].includes(p.familienstand)) fehlerR('R5 Paare', p.id + ': familienstand ' + p.familienstand + ' passt nicht zu getrennt lebendem Partner');
    const d = Math.abs(p.alter - q.alter);
    if (d > 25) fehlerR('R5 Paare', p.id + ' und ' + q.id + ': Altersabstand ' + d + ' Jahre'); else if (d > 15 && p.id < q.id) hinweisR('R5 Paare', p.id + ' und ' + q.id + ': Altersabstand ' + d + ' Jahre');
    if (p.alter < 16 || q.alter < 16) fehlerR('R5 Paare', p.id + ' oder ' + q.id + ' ist zu jung für eine Partnerschaft');
  } else if (['verheiratet', 'zusammenlebend'].includes(p.familienstand) && !p.partner_extern) fehlerR('R5 Paare', p.id + ': ' + p.familienstand + ' ohne partner_id und ohne partner_extern');
  for (const kid of p.kinder_ids || []) {
    const k = byId.get(kid); if (!k) continue;
    if (!(k.eltern_ids || []).includes(p.id)) fehlerR('R6 Eltern', p.id + ' nennt Kind ' + kid + ', aber nicht umgekehrt');
    const ab = p.alter - k.alter;
    if (p.geschlecht === 'w' && (ab < 16 || ab > 48)) fehlerR('R6 Eltern', 'Mutter ' + p.id + ' war bei der Geburt von ' + kid + ' ' + ab + ' Jahre alt (16 bis 48)');
    if (p.geschlecht === 'm' && (ab < 17 || ab > 60)) fehlerR('R6 Eltern', 'Vater ' + p.id + ' war bei der Geburt von ' + kid + ' ' + ab + ' Jahre alt (17 bis 60)');
  }
  for (const eid of p.eltern_ids || []) { const e = byId.get(eid); if (e && !(e.kinder_ids || []).includes(p.id)) fehlerR('R6 Eltern', p.id + ' nennt Elternteil ' + eid + ', aber nicht umgekehrt'); }
  if ((p.eltern_ids || []).length > 2) fehlerR('R6 Eltern', p.id + ' hat mehr als zwei Eltern');
  const el = (p.eltern_ids || []).map(id => byId.get(id)).filter(Boolean);
  if (el.length === 2 && el[0].geschlecht === el[1].geschlecht) hinweisR('R6 Eltern', p.id + ': zwei Eltern gleichen Geschlechts');
  for (const sid of p.geschwister_ids || []) {
    const s = byId.get(sid); if (!s) continue;
    if (!(s.geschwister_ids || []).includes(p.id)) fehlerR('R6 Geschwister', p.id + ' und ' + sid + ' nicht beidseitig');
    const ge = (p.eltern_ids || []).filter(x => (s.eltern_ids || []).includes(x));
    if ((p.eltern_ids || []).length && (s.eltern_ids || []).length && !ge.length) fehlerR('R6 Geschwister', p.id + ' und ' + sid + ' haben keinen gemeinsamen Elternteil');
  }
  const kern = new Set([p.partner_id, ...(p.eltern_ids || []), ...(p.kinder_ids || []), ...(p.geschwister_ids || [])].filter(Boolean));
  for (const x of [...(p.freunde_ids || []), ...(p.online_freunde_ids || [])]) if (kern.has(x)) fehlerR('R8 Netz', p.id + ': ' + x + ' ist Familie und zugleich als Freund eingetragen');
}

// ---------- R7 Namen ----------
const PRIV = ladePrivat(A.privat);
if (!PRIV.gefunden) H_('R7/R11 private Liste fehlt (privat/ausschluss.json): Prüfung ausgeschlossener Namen und interner Begriffe übersprungen');
const AUS_V = new Set(PRIV.vornamen.map(normName));
const AUS_N = new Set(PRIV.nachnamen.map(normName));
const SPERRE = new Set([...B.namen.sperrliste_prominente.beispiele, ...PROMINENTE_ZUSATZ].map(normName));
const voll = new Map();
for (const p of F) {
  const n = normName(p.vorname + ' ' + p.nachname);
  if (voll.has(n)) fehlerR('R7 Namen', p.id + ' und ' + voll.get(n) + ' heißen beide ' + p.vorname + ' ' + p.nachname); else voll.set(n, p.id);
  if (String(p.vorname).split(/[\s-]+/).some(t => AUS_V.has(normName(t)))) fehlerR('R7 Namen', p.id + ': ausgeschlossener Vorname ' + p.vorname);
  if (String(p.nachname).split(/[\s-]+/).some(t => AUS_N.has(normName(t)))) fehlerR('R7 Namen', p.id + ': ausgeschlossener Nachname ' + p.nachname);
  if (SPERRE.has(n) || SPERRE.has(normName(String(p.vorname).split(' ')[0] + ' ' + p.nachname))) fehlerR('R7 Namen', p.id + ': prominente Kombination ' + p.vorname + ' ' + p.nachname);
  if (p.name !== undefined && p.name !== p.vorname + ' ' + p.nachname) fehlerR('R7 Namen', p.id + ': name passt nicht zu vorname und nachname');
}

// ---------- R8 Netz, Kollegen, Klassen ----------
const symm = (feld, regel) => { for (const p of F) for (const x of p[feld] || []) { const q = byId.get(x); if (q && !(q[feld] || []).includes(p.id)) fehlerR(regel, feld + ': ' + p.id + ' → ' + x + ' ohne Rückrichtung'); } };
symm('freunde_ids', 'R8 Netz'); symm('online_freunde_ids', 'R8 Netz'); symm('kollegen_ids', 'R8 Kollegen'); symm('klassen_ids', 'R8 Klassen');
let gleicherOrt = 0, kantenOffline = 0;
for (const p of F) for (const x of [...(p.freunde_ids || []), ...(p.online_freunde_ids || [])]) { kantenOffline++; if (byId.get(x)?.ort === p.ort) gleicherOrt++; }
const anteilGleicherOrt = kantenOffline ? gleicherOrt / kantenOffline : 1;
if (anteilGleicherOrt < 0.75) H_('R8 Netz: nur ' + f1(100 * anteilGleicherOrt) + ' % der Freundschaften im selben Ort (Bauplan rund 85 %)');
const grad = p => (p.freunde_ids || []).length + (p.online_freunde_ids || []).length;
const wenig = F.filter(p => grad(p) <= 2).length;
if (wenig < 150 || wenig > 220) F_('R8 Netz: ' + f1(pct(wenig, F.length)) + ' % mit 0 bis 2 Freunden in der Welt (Soll 15 bis 22 %)');
const viele = F.filter(p => grad(p) > 20).length;
if (!viele) F_('R8 Netz: niemand hat mehr als 20 Freunde (Soll: einige)');
for (const p of F) if (p.einsam && grad(p) > 2) fehlerR('R8 Netz', p.id + ' ist einsam, hat aber ' + grad(p) + ' Freunde');
for (const p of F) for (const x of p.online_freunde_ids || []) if ((p.freunde_ids || []).includes(x)) hinweisR('R8 Netz', p.id + ': ' + x + ' ist Freund und Online-Freund zugleich');
for (const p of F) for (const x of p.kollegen_ids || []) { const q = byId.get(x); if (q && p.betrieb_id && q.betrieb_id !== p.betrieb_id) fehlerR('R8 Kollegen', p.id + ' und ' + x + ' arbeiten nicht im selben Betrieb'); }
for (const p of F) for (const x of p.klassen_ids || []) {
  const q = byId.get(x); if (!q) continue;
  if (q.ort !== p.ort) fehlerR('R8 Klassen', p.id + ' und ' + x + ' leben in verschiedenen Orten');
  if (p.status === 'schule' && q.status === 'schule' && (p.bildung.schule !== q.bildung.schule || p.bildung.klasse !== q.bildung.klasse || p.alter !== q.alter)) fehlerR('R8 Klassen', p.id + ' und ' + x + ': nicht dieselbe Schule, Klasse oder nicht gleich alt');
  if (p.status === 'studium' && q.status === 'studium' && p.bildung.hochschule !== q.bildung.hochschule) fehlerR('R8 Klassen', p.id + ' und ' + x + ': verschiedene Hochschulen');
  if (p.status === 'ausbildung' && q.status === 'ausbildung' && p.bildung.berufsschule !== q.bildung.berufsschule) fehlerR('R8 Klassen', p.id + ' und ' + x + ': verschiedene Berufsschulen');
}
if (Array.isArray(S.netz)) {
  const kanten = new Set();
  for (const e of S.netz) { kanten.add(e.a + '|' + e.b); if (!byId.has(e.a) || !byId.has(e.b)) fehlerR('R8 Netz', 'Kante mit unbekannter Figur ' + e.a + ' ' + e.b); }
  for (const p of F) for (const x of [...(p.freunde_ids || []), ...(p.online_freunde_ids || [])]) if (p.id < x && !kanten.has(p.id + '|' + x)) fehlerR('R8 Netz', 'Kante ' + p.id + '–' + x + ' fehlt in netz');
  const eintraege = F.reduce((s, p) => s + grad(p), 0);
  if (S.netz.length * 2 !== eintraege) fehlerR('R8 Netz', 'netz hat ' + S.netz.length + ' Kanten, die Figuren nennen ' + eintraege + ' Einträge (erwartet ' + S.netz.length * 2 + ')');
}

// ---------- R6 Berufe ----------
const erw = F.filter(p => p.status === 'erwerbstaetig');
const berufe = new Set();
for (const p of erw) {
  const j = KATALOG.get(p.beruf);
  if (!j) { fehlerR('R6 Berufe', p.id + ': Beruf nicht im Katalog: ' + p.beruf); continue; }
  berufe.add(p.beruf);
  if (j.laender !== 'alle' && !j.laender.includes(p.land)) fehlerR('R6 Berufe', p.id + ': ' + p.beruf + ' ist in ' + p.land + ' nicht vorgesehen');
  const pl = Math.max(1, STUFE_BILDUNG[p.bildung.abschluss] ?? 0), jl = STUFE_BILDUNG[j.bildung];
  const streng = j.bildung === 'staatsexamen' ? !['staatsexamen', 'promotion'].includes(p.bildung.abschluss) : j.bildung === 'promotion' ? p.bildung.abschluss !== 'promotion' : jl > pl;
  if (streng && !p.bildung_ausnahme) fehlerR('R6 Berufe', p.id + ': ' + p.beruf + ' verlangt ' + j.bildung + ', Abschluss ' + p.bildung.abschluss + ' ohne begründete Ausnahme');
}
if (berufe.size < (B.ziel.mindestens_verschiedene_berufe_bei_berufstaetigen || 350)) F_('R6 Berufe: nur ' + berufe.size + ' verschiedene Berufe bei Berufstätigen (Soll mindestens 350)');
for (const p of F) if (p.status !== 'erwerbstaetig' && p.status !== 'elternzeit' && p.beruf) fehlerR('R6 Berufe', p.id + ': beruf gesetzt, obwohl status ' + p.status);

// ---------- R9 Geraete ----------
const iosTab = [];
for (const land of Object.keys(B.alter.je_land)) {
  const ps = F.filter(p => p.land === land && p.geraet && p.geraet.handy !== 'kein eigenes Handy'); if (!ps.length) continue;
  const basis = B.geraete.iphone_vorgabe[land] ?? B.geraete.ios_anteil[land].oktober_2026;
  const ist = ps.filter(p => p.geraet.handy === 'iPhone').length / ps.length;
  iosTab.push([land, ps.length, 100 * basis, 100 * ist]);
  if (Math.abs(ist - basis) > 0.05) F_('R9 iPhone ' + land + ': ' + f1(100 * ist) + ' % statt ' + f1(100 * basis) + ' % (±5 Prozentpunkte)');
}

// ---------- R9 Probleme ----------
const mitP = F.filter(p => (p.problem_arten || []).length).length;
if (mitP < 550 || mitP > 650) F_('R9 Probleme: ' + f1(pct(mitP, F.length)) + ' % mit mindestens einem Problem (Soll 55 bis 65 %)');

// ---------- Kreise ----------
const KR = Array.isArray(K.kreise) ? K.kreise : [];
const kIds = new Set();
const mitglied = new Map();
const kennen = (a, b) => {
  const p = byId.get(a);
  return [p.partner_id, ...(p.eltern_ids || []), ...(p.kinder_ids || []), ...(p.geschwister_ids || []), ...(p.freunde_ids || []), ...(p.online_freunde_ids || []), ...(p.kollegen_ids || []), ...(p.klassen_ids || [])].includes(b);
};
for (const k of KR) {
  if (kIds.has(k.kreis_id)) fehlerR('R10 Kreise', 'doppelte kreis_id ' + k.kreis_id); kIds.add(k.kreis_id);
  if (!KREIS_ARTEN.includes(k.art)) fehlerR('R10 Kreise', k.kreis_id + ': art ' + k.art + ' unbekannt');
  if (!Array.isArray(k.mitglieder) || k.mitglieder.length < 2 || k.mitglieder.length > 10) { fehlerR('R10 Kreise', k.kreis_id + ': ' + (k.mitglieder || []).length + ' Mitglieder (2 bis 10)'); continue; }
  if (new Set(k.mitglieder).size !== k.mitglieder.length) fehlerR('R10 Kreise', k.kreis_id + ': doppelte Mitglieder');
  for (const id of k.mitglieder) {
    const p = byId.get(id); if (!p) { fehlerR('R10 Kreise', k.kreis_id + ': unbekannte Figur ' + id); continue; }
    mitglied.set(id, (mitglied.get(id) || 0) + 1);
    if (k.ort !== 'online' && k.ort !== 'mehrere' && p.ort !== k.ort) fehlerR('R10 Kreise', k.kreis_id + ': ' + id + ' lebt nicht in ' + k.ort);
    if (!k.mitglieder.some(x => x !== id && byId.has(x) && kennen(id, x))) fehlerR('R10 Kreise', k.kreis_id + ': ' + id + ' kennt niemanden im Kreis');
    if (Array.isArray(p.kreise_ids) && !p.kreise_ids.includes(k.kreis_id)) fehlerR('R10 Kreise', id + ' ist Mitglied von ' + k.kreis_id + ', kreise_ids nennt es nicht');
  }
  if (k.ort === 'mehrere' && new Set(k.mitglieder.map(id => byId.get(id)?.ort)).size < 2) hinweisR('R10 Kreise', k.kreis_id + ': ort mehrere, alle Mitglieder im selben Ort');
}
if (KR.length < 250) F_('R10 Kreise: nur ' + KR.length + ' Kreise (Soll mindestens 250)');
for (const p of F) {
  const n = mitglied.get(p.id) || 0;
  if (n > 4) fehlerR('R10 Kreise', p.id + ' gehört zu ' + n + ' Kreisen (höchstens 4)');
  if (Array.isArray(p.kreise_ids)) for (const kid of p.kreise_ids) if (!kIds.has(kid)) fehlerR('R10 Kreise', p.id + ': kreise_ids nennt unbekannten Kreis ' + kid);
}

// ---------- Steckbriefe figuren-01..10.json ----------
const figurenDateien = [];
const STAFF = PRIV.vornamen;
const INTERN = PRIV.intern;
let lebenGeprueft = 0;
for (let n = 1; n <= 10; n++) {
  const datei = join(WELT, 'figuren-' + String(n).padStart(2, '0') + '.json');
  if (!existsSync(datei)) { if (A['figuren-pflicht']) F_('R11 Steckbriefe: ' + datei + ' fehlt'); continue; }
  const roh = lade(datei, false);
  const liste = Array.isArray(roh) ? roh : Array.isArray(roh?.figuren) ? roh.figuren : null;
  figurenDateien.push(datei);
  if (!liste) { F_('R11 Steckbriefe: ' + datei + ' enthält keine Liste figuren'); continue; }
  steuerzeichen(roh, 'figuren-' + String(n).padStart(2, '0'), 'R13 Steuerzeichen');
  if (liste.length !== 100) F_('R11 Steckbriefe: ' + datei + ' hat ' + liste.length + ' Figuren statt 100');
  liste.forEach((f, i) => {
    const soll = fid((n - 1) * 100 + i + 1);
    if (!f || f.id !== soll) { fehlerR('R11 Steckbriefe', datei + ' Position ' + (i + 1) + ': ' + (f && f.id) + ' statt ' + soll); return; }
    const s = byId.get(f.id); if (!s) return;
    for (const [k, v] of Object.entries(s)) {
      if (!(k in f)) { fehlerR('R11 Steckbriefe', f.id + ': Skelett-Feld ' + k + ' fehlt'); continue; }
      if (kanon(f[k]) !== kanon(v)) fehlerR('R11 Steckbriefe', f.id + ': Skelett-Feld ' + k + ' wurde verändert');
    }
    for (const k of LEBEN_FELDER) {
      const v = f[k];
      const leer = v === undefined || v === null || (typeof v === 'string' && v.trim().length < 10) || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v && !Array.isArray(v) && !Object.keys(v).length);
      if (leer) fehlerR('R11 Steckbriefe', f.id + ': Lebensfeld ' + k + ' fehlt oder ist zu kurz');
    }
    // Inhalt: keine prominenten Namen, keine internen Begriffe (private Liste), ausgeschlossene Vornamen im Text nur als Hinweis
    const texte = Object.entries(f).filter(([k]) => !(k in s)).map(([, v]) => JSON.stringify(v)).join(' ');
    const tn = normName(texte);
    for (const sp of SPERRE) if (sp.includes(' ') && tn.includes(sp)) fehlerR('R11 Steckbriefe', f.id + ': nennt eine prominente Person (' + sp + ')');
    for (const w of INTERN) if (new RegExp('\\b' + w + '\\b', 'i').test(texte)) fehlerR('R11 Steckbriefe', f.id + ': interner Begriff ' + w);
    for (const w of STAFF) if (new RegExp('(^|[^\\p{L}])' + w + '($|[^\\p{L}])', 'u').test(texte)) hinweisR('R11 Steckbriefe', f.id + ': Text nennt den ausgeschlossenen Vornamen ' + w);
    lebenGeprueft++;
  });
}
if (!figurenDateien.length) H_('R11 Steckbriefe: noch keine figuren-NN.json vorhanden (nur Skelett geprüft)');
else if (figurenDateien.length < 10) H_('R11 Steckbriefe: ' + figurenDateien.length + ' von 10 Dateien vorhanden');
const IDX = existsSync(join(WELT, 'index.json')) ? lade(join(WELT, 'index.json'), false) : null;
if (IDX) { const n = Array.isArray(IDX.figuren) ? IDX.figuren.length : 0; if (n !== 1000) F_('R12 Index: index.json nennt ' + n + ' Figuren statt 1000'); }

// ------------------------------------------------------------------------------------------------
// Verteilungsvergleich (Markdown)
// ------------------------------------------------------------------------------------------------
const tab = (kopf, zeilen) => ['| ' + kopf.join(' | ') + ' |', '|' + kopf.map(() => '---').join('|') + '|', ...zeilen.map(z => '| ' + z.join(' | ') + ' |')].join('\n');
const anteile = (ps, f) => { const m = {}; for (const p of ps) { const k = f(p); m[k] = (m[k] || 0) + 1; } return m; };
const vergleich = (titel, soll, ps, f, rund = 1) => {
  const ist = anteile(ps, f); const keys = [...new Set([...Object.keys(soll), ...Object.keys(ist)])];
  md.push('**' + titel + '** (' + ps.length + ' Figuren)\n\n' + tab(['Wert', 'Bauplan %', 'Welt %', 'Abweichung'], keys.map(k => [k, soll[k] !== undefined ? f1(100 * soll[k]) : '–', f1(pct(ist[k] || 0, ps.length)), soll[k] !== undefined ? f1(pct(ist[k] || 0, ps.length) - 100 * soll[k]) : '–'])) + '\n');
};
md.push('## Verteilungsvergleich mit dem Bauplan\n');
md.push('Erzeugt mit `werkzeug/welt-pruefen.mjs`. Prozentangaben gerundet; Abweichung in Prozentpunkten.\n');
md.push('### Orte und Länder\n\n' + tab(['Ort', 'Land', 'Soll', 'Ist'], B.orte.map(o => [o.id, o.land, o.figuren, proOrt[o.id] || 0])) + '\n');
md.push('### Alter je Land\n');
for (const t of altersTab.filter(t => t.n >= 40)) md.push('**' + t.land + '** (' + t.n + ' Figuren, Ziel ' + t.ziel + ')\n\n' + tab(['Band', 'Ziel %', 'Welt %', 'Abweichung'], t.zeilen.map(([b, z, i, d]) => [b, f1(z), f1(i), f1(d)])) + '\n');
md.push('Länder unter 40 Figuren (nur grob): ' + altersTab.filter(t => t.n < 40).map(t => t.land + ' größte Abweichung ' + f1(t.maxD) + ' pp').join(', ') + '.\n');
md.push('Minderjährige (12–17): ' + minder.length + ' (' + f1(pct(minder.length, F.length)) + ' %; Ziel 13,5 %, erlaubt 12–15 %). Je Land: ' + Object.keys(B.alter.je_land).map(l => l + ' ' + F.filter(p => p.land === l && p.alter <= 17).length).join(', ') + '.\n');
md.push('### Haushalte\n');
for (const land of ['DE', 'TR']) {
  const ps = F.filter(p => p.land === land);
  vergleich('Haushaltsform der Figuren ' + land + ' (Bauplan: Personenanteile aller Altersstufen, nur Richtwert)', ohneMeta(B.haushalte.personen_anteile_je_land[land]), ps, p => HH.get(p.haushalt_id)?.art || '?');
}
md.push('Haushalte: ' + HH.size + '; kleine Kinder (unter 12, keine Figuren): ' + [...HH.values()].reduce((s, h) => s + (h.kleine_kinder || []).length, 0) + '; Paare im selben Haushalt: ' + F.filter(p => p.partner_id && byId.get(p.partner_id)?.haushalt_id === p.haushalt_id).length / 2 + '; Paare ohne gemeinsamen Haushalt: ' + F.filter(p => p.partner_id && byId.get(p.partner_id)?.haushalt_id !== p.haushalt_id).length / 2 + '; Figuren mit Eltern in der Welt: ' + F.filter(p => (p.eltern_ids || []).length).length + ', davon in einem anderen Haushalt: ' + F.filter(p => (p.eltern_ids || []).some(e => byId.get(e)?.haushalt_id !== p.haushalt_id)).length + '.\n');
md.push('### Herkunft\n');
const trWurzeln = p => p.herkunft.some(h => ['tr', 'ku', 'tr_balkan', 'tr_zypern'].includes(h));
md.push('Türkische oder kurdische Wurzeln: in DE ' + f1(pct(F.filter(p => p.land === 'DE' && trWurzeln(p)).length, proLand.DE)) + ' % (Bauplan rund 27 %), weltweit ' + f1(pct(F.filter(trWurzeln).length, F.length)) + ' % (Bauplan rund 46 %). Figuren in DE ohne Einwanderungsgeschichte: ' + f1(pct(F.filter(p => p.land === 'DE' && !p.einwanderung).length, proLand.DE)) + ' % (Bauplan 49 %).\n');
const hkSoll = {}, hkIst = {};
for (const o of B.orte) { const s = Object.values(o.herkunft).reduce((a, b) => a + b, 0); for (const [h, w] of Object.entries(o.herkunft)) hkSoll[h] = (hkSoll[h] || 0) + o.figuren * w / s; }
for (const p of F) hkIst[p.herkunft[0]] = (hkIst[p.herkunft[0]] || 0) + 1;
md.push(tab(['Herkunft (erster Code)', 'Bauplan Figuren', 'Welt Figuren'], Object.keys(hkSoll).sort((a, b) => hkSoll[b] - hkSoll[a]).map(h => [h, hkSoll[h].toFixed(1).replace('.', ','), hkIst[h] || 0])) + '\n');
md.push('### Status, Bildung, Berufe\n');
for (const land of ['DE', 'TR']) { const ps = F.filter(p => p.land === land && p.alter >= 18); const st = anteile(ps, p => p.status); md.push('Status ' + land + ' ab 18: ' + Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + f1(pct(v, ps.length)) + ' %').join(', ') + '.\n'); }
for (const land of ['DE', 'TR']) { const ps = F.filter(p => p.land === land && p.alter >= 25); const ab = anteile(ps, p => p.bildung.abschluss); md.push('Höchster Abschluss ' + land + ' ab 25: ' + Object.entries(ab).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + f1(pct(v, ps.length)) + ' %').join(', ') + '.\n'); }
md.push('Berufstätige: ' + erw.length + ', verschiedene Berufsbezeichnungen: ' + berufe.size + ' (Soll mindestens 350); häufigste: ' + Object.entries(anteile(erw, p => p.beruf)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ' ' + v).join(', ') + '. Quereinstiege mit Begründung: ' + F.filter(p => p.bildung_ausnahme).length + '.\n');
md.push('Betriebe: ' + (S.betriebe || []).length + '; Berufstätige mit mindestens einem Kollegen in der Welt: ' + erw.filter(p => (p.kollegen_ids || []).length).length + '.\n');
md.push('### Einkommen und Schicht\n');
const SCH = B.taetigkeiten.einkommen.schicht.verteilung;
for (const [titel, laender, soll] of [['DE', ['DE'], SCH.DE], ['TR', ['TR'], SCH.TR], ['Europa außer DE und US', ['NL', 'BE', 'AT', 'CH', 'GB', 'FR', 'US'], SCH.DE], ['BG und AZ', ['BG', 'AZ'], SCH.TR]]) vergleich('Schicht ' + titel, ohneMeta(soll), F.filter(p => laender.includes(p.land)), p => p.schicht);
md.push('Einkommen (aus der Schicht): ' + Object.entries(anteile(F, p => p.einkommen)).map(([k, v]) => k + ' ' + f1(pct(v, F.length)) + ' %').join(', ') + '.\n');
md.push('### Geräte\n\n' + tab(['Land', 'Figuren mit Handy', 'iOS Basis %', 'iPhone Welt %'], iosTab.map(([l, n, b, i]) => [l, n, f1(b), f1(i)])) + '\n');
md.push('Handyklassen: ' + Object.entries(anteile(F, p => p.geraet.klasse || 'ohne Handy')).map(([k, v]) => k + ' ' + v).join(', ') + '. Speicher fast voll: ' + f1(pct(F.filter(p => p.geraet.zustand?.includes('Speicher fast voll')).length, F.length)) + ' % (Bauplan 30 %), Akku hält keinen Abend: ' + f1(pct(F.filter(p => p.geraet.zustand?.includes('Akku hält keinen Abend')).length, F.length)) + ' % (22 %). Konsole im Haushalt: DE ' + f1(pct(F.filter(p => p.land === 'DE' && p.geraet.sonst.some(s => /PlayStation|Switch|Xbox/.test(s))).length, proLand.DE)) + ' % (38 %), TR ' + f1(pct(F.filter(p => p.land === 'TR' && p.geraet.sonst.some(s => /PlayStation|Switch|Xbox/.test(s))).length, proLand.TR)) + ' % (15 %).\n');
md.push('### Probleme\n');
const mehrP = F.filter(p => (p.problem_arten || []).length >= 2).length;
md.push('Mindestens ein Problem: ' + f1(pct(mitP, F.length)) + ' % (Soll 55–65 %); zwei oder mehr: ' + f1(pct(mehrP, F.length)) + ' % (Bauplan rund 20 %).\n\n' + tab(['Problem', 'Figuren'], Object.entries(anteile(F.flatMap(p => p.problem_arten.map(c => ({ c }))), x => x.c)).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v])) + '\n');
md.push('Lebensereignis: ' + f1(pct(F.filter(p => p.lebensereignis).length, F.length)) + ' % (Bauplan rund 40 %).\n');
md.push('### Freundesnetz und Kreise\n');
const gradB = p => { const g = grad(p); return g <= 2 ? '0-2' : g <= 5 ? '3-5' : g <= 10 ? '6-10' : g <= 20 ? '11-20' : '21+'; };
vergleich('Freunde in der Welt (offline und online)', ohneMeta(B.sozial.netz_in_der_welt.grad), F, gradB);
md.push('Einsam (höchstens zwei Freunde in der Welt): ' + F.filter(p => p.einsam).length + '. Freundschaften im selben Ort: ' + f1(100 * anteilGleicherOrt) + ' % (Bauplan rund 85 %). Kanten: ' + (S.netz || []).length + '.\n');
const kantenArt = anteile(S.netz || [], e => e.art);
md.push(tab(['Kantenart', 'Bauplan %', 'Welt %'], Object.entries(ohneMeta(B.sozial.netz_in_der_welt.kanten_arten)).map(([k, v]) => [k, f1(100 * v), f1(pct(kantenArt[k] || 0, (S.netz || []).length))])) + '\n');
const OQ = B.sozial.online_freundschaften.mindestens_ein_online_freund;
md.push('Mindestens ein Online-Freund: ' + Object.keys(OQ).filter(k => typeof OQ[k] === 'number').map(k => { const [lo, hi] = k === '65+' ? [65, 200] : k.split('-').map(Number); const ps = F.filter(p => p.alter >= lo && p.alter <= hi); return k + ' ' + f1(pct(ps.filter(p => p.online_freunde_ids.length).length, ps.length)) + ' % (Bauplan ' + f1(100 * OQ[k]) + ' %)'; }).join(', ') + '.\n');
const kz = anteile(F, p => { const n = mitglied.get(p.id) || 0; return n >= 4 ? '4+' : String(n); });
md.push('Kreise: ' + KR.length + ' (Soll mindestens 250); nach Art: ' + Object.entries(anteile(KR, k => k.art)).map(([k, v]) => k + ' ' + v).join(', ') + '.\n');
vergleich('Kreise je Figur', ohneMeta(B.sozial.kreise.mitgliedschaften_je_figur), F, p => { const n = mitglied.get(p.id) || 0; return n >= 4 ? '4+' : String(n); });
md.push('### Denkstil\n\n' + KI_ARTEN.size + ' KI-Spielarten; KI gesamt ' + ki + ' (Soll 300).\n\n' + tab(['Spielart', 'Soll', 'Ist'], [...KI_ARTEN.values()].map(s => [s.name, (s.anteil * ki).toFixed(0), artIst[s.name] || 0])) + '\n');
md.push(tab(['Gruppe (ab 30 Figuren)', 'Figuren', 'KI-Anteil %'], kiTab.sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, n, a]) => [k, n, f1(100 * a)])) + '\n');
md.push('### Freizeit, Treffen, Spielen\n');
vergleich('Muster freier Zeit', Object.fromEntries(B.sozial.freie_zeiten.muster.map(m => [m.code, m.anteil])), F, p => p.freizeit_muster);
for (const [k, lo, hi] of [['12-15', 12, 15], ['16-17', 16, 17], ['18-29', 18, 29], ['30-64', 30, 64], ['65+', 65, 200]]) vergleich('Treff-Erlaubnis ' + k, ohneMeta(B.sozial.treff_erlaubnis.verteilung[k]), F.filter(p => p.alter >= lo && p.alter <= hi), p => p.treffen_erlaubt);
const hdIst = anteile(F.flatMap(p => p.treffen_hindernis.map(h => ({ h }))), x => x.h);
md.push(tab(['Treff-Hindernis', 'Bauplan %', 'Welt %'], B.sozial.treff_hindernisse.liste.map(h => [h.hindernis, f1(100 * h.anteil), f1(pct(hdIst[h.hindernis] || 0, F.length))])) + '\n');
if (F[0] && F[0].spielen) {
  const AS = B.spielen.videospiele.anteil_spielend;
  md.push(tab(['Alter', 'Bauplan spielt Videospiele (m/w) %', 'Welt (m/w) %'], Object.keys(AS).filter(k => k !== 'basis').map(k => { const [lo, hi] = k === '70+' ? [70, 200] : k.split('-').map(Number); const ps = g => F.filter(p => p.alter >= lo && p.alter <= hi && p.geschlecht === g); const s = g => f1(pct(ps(g).filter(p => p.spielen.videospiele !== 'nie').length, ps(g).length)); return [k, f1(100 * AS[k].m) + ' / ' + f1(100 * AS[k].w), s('m') + ' / ' + s('w')]; })) + '\n');
  vergleich('Bluff-Freude', ohneMeta(B.spielen.bluff_freude.verteilung), F, p => p.spielen.bluff);
  vergleich('Ehrgeiz', ohneMeta(B.spielen.ehrgeiz.verteilung), F, p => p.spielen.ehrgeiz);
  vergleich('Anleitung', ohneMeta(B.spielen.anleitung.verteilung), F, p => p.spielen.anleitung);
  md.push('Spielneigung 0–5: ' + Object.entries(anteile(F, p => p.spielneigung)).map(([k, v]) => k + ': ' + v).join(', ') + '. Analog mindestens monatlich: DE ' + f1(pct(F.filter(p => p.land === 'DE' && ['monatlich', 'woechentlich', 'taeglich'].includes(p.spielen.analog)).length, proLand.DE)) + ' % (30 %), TR ' + f1(pct(F.filter(p => p.land === 'TR' && ['monatlich', 'woechentlich', 'taeglich'].includes(p.spielen.analog)).length, proLand.TR)) + ' % (38 %).\n');
}

// ------------------------------------------------------------------------------------------------
// Ausgabe
// ------------------------------------------------------------------------------------------------
const kurz = [
  'Figuren ' + F.length + ' | Minderjährige ' + minder.length + ' | KI ' + ki + ' | Berufe ' + berufe.size + ' | mit Problem ' + f1(pct(mitP, F.length)) + ' % | 0–2 Freunde ' + f1(pct(wenig, F.length)) + ' % | über 20 Freunde ' + viele + ' | Kreise ' + KR.length + ' | Steckbriefe geprüft ' + lebenGeprueft,
];
if (A.md) {
  const text = '# Prüfung der Welt\n\n' + kurz.join('\n') + '\n\n' + (fehler.length ? '**Fehler (' + fehler.length + '):**\n\n' + fehler.map(f => '- ' + f).join('\n') + '\n\n' : '**Keine Fehler.**\n\n') + (hinweise.length ? '**Hinweise (' + hinweise.length + '):**\n\n' + hinweise.map(h => '- ' + h).join('\n') + '\n\n' : '') + md.join('\n');
  if (A.md === '-' || A.md === true) console.log(text); else writeFileSync(resolve(A.md), text, 'utf8');
}
if (!A.still || fehler.length) {
  console.log(kurz.join('\n'));
  for (const f of fehler) console.log('FEHLER: ' + f);
  for (const h of hinweise) console.log('HINWEIS: ' + h);
  console.log(fehler.length ? fehler.length + ' Fehler, ' + hinweise.length + ' Hinweise' : 'Keine Fehler, ' + hinweise.length + ' Hinweise');
}
process.exit(fehler.length ? 1 : 0);
