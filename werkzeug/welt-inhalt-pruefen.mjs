#!/usr/bin/env node
/*
 * welt-inhalt-pruefen.mjs - Inhaltliche Pruefhilfen fuer die Steckbriefe der MSY-Welt (Ergaenzung zu welt-pruefen.mjs).
 *
 * welt-pruefen.mjs prueft Form und Verteilungen. Dieses Skript sucht Stellen, an denen die Lebenstexte dem Skelett
 * widersprechen, Begriffe der Simulation in die Texte geraten sind, Texte ein Produkt vorab beurteilen oder Schablonen
 * wiederholen. Jeder Befund ist ein Hinweis zum Nachlesen, kein Urteil; nur ein uneinheitliches Schema ist ein Fehler.
 *
 * Aufruf:
 *   node werkzeug/welt-inhalt-pruefen.mjs [--welt <ordner>] [--md <datei>|-] [--max <n>]
 * Exit-Code 0 ohne Schemafehler, 1 bei Schemafehlern, 2 wenn Dateien fehlen.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argumente } from './welt-skelett.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const A = argumente(process.argv.slice(2));
const WELT = resolve(A.welt || join(HIER, '..', 'welt'));
const MAX = Number(A.max || 12);
const lies = d => { if (!existsSync(d)) { console.log('FEHLER: Datei fehlt: ' + d); process.exit(2); } return JSON.parse(readFileSync(d, 'utf8')); };
const S = lies(join(WELT, 'skelett.json'));
const F = S.figuren;
const byId = new Map(F.map(p => [p.id, p]));
const ST = new Map(), DATEI = new Map();
for (let n = 1; n <= 10; n++) {
  const roh = lies(join(WELT, 'figuren-' + String(n).padStart(2, '0') + '.json'));
  for (const f of (Array.isArray(roh) ? roh : roh.figuren)) { ST.set(f.id, f); DATEI.set(f.id, n); }
}
const fl = v => typeof v === 'string' ? v : Array.isArray(v) ? v.map(fl).join(' | ') : v && typeof v === 'object' ? Object.values(v).map(fl).join(' | ') : String(v ?? '');
const leben = id => { const f = ST.get(id), s = byId.get(id); return f ? Object.fromEntries(Object.entries(f).filter(([k]) => !(k in s))) : {}; };
const TX = new Map(F.map(p => [p.id, Object.values(leben(p.id)).map(fl).join(' \n ')]));
const ctx = (t, i, n = 60) => t.slice(Math.max(0, i - n), i + n).replace(/\s+/g, ' ');
const jeDatei = ids => { const m = {}; for (const id of ids) { const d = DATEI.get(id); m[d] = (m[d] || 0) + 1; } return Object.entries(m).map(([d, v]) => 'Datei ' + d + ': ' + v).join(', '); };
const kinderZahl = p => (p.kinder_ids || []).length + (p.kleine_kinder || []).length + (p.kinder_ausserhalb || 0);
const out = [];
let schemaFehler = 0;
const abschnitt = (titel, eintraege, info = '') => {
  out.push('\n### ' + titel + ': ' + eintraege.length + (eintraege.length ? ' (' + jeDatei(eintraege.map(e => e.id)) + ')' : '') + (info ? '\n' + info : ''));
  for (const e of eintraege.slice(0, MAX)) out.push('- ' + e.id + ' ' + byId.get(e.id).name + ': ' + e.text);
  if (eintraege.length > MAX) out.push('- … weitere ' + (eintraege.length - MAX));
};

// K1 Schema der Lebensfelder
const TYPEN = { kurzbio: 'string', persoenlichkeit: 'object', widerspruch: 'string', alltag: 'string', was_gerade_los_ist: 'string', interessen: 'array', wissen_skills: 'array', probleme: 'array', freie_zeiten: 'string', treffen_text: 'string', spielverhalten: 'object', mediennutzung: 'string', geld_ausgeben: 'string', sprechweise: 'string', was_nervt: 'string', was_begeistert: 'string', denkstil_text: 'string' };
const OPTIONAL = { beruf_genau: 'string', schule_genau: 'string' };
const typ = v => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
const k1 = [];
for (const p of F) {
  if (!ST.has(p.id)) { k1.push({ id: p.id, text: 'Steckbrief fehlt' }); continue; }
  const l = leben(p.id);
  for (const [k, t] of Object.entries(TYPEN)) if (typ(l[k]) !== t) k1.push({ id: p.id, text: k + ' ist ' + typ(l[k]) + ' statt ' + t });
  for (const k of Object.keys(l)) if (!(k in TYPEN) && !(k in OPTIONAL)) k1.push({ id: p.id, text: 'unbekanntes Feld ' + k });
  for (const [k, t] of Object.entries(OPTIONAL)) if (k in l && typ(l[k]) !== t) k1.push({ id: p.id, text: k + ' ist ' + typ(l[k]) + ' statt ' + t });
}
schemaFehler = k1.length;
abschnitt('K1 Schema der Lebensfelder (Fehler)', k1, 'Pflicht: ' + Object.keys(TYPEN).join(', ') + '; wahlweise: ' + Object.keys(OPTIONAL).join(', '));

// K2 Begriffe der Simulation in den Texten
const k2 = [];
const reMeta = /(in (der|dieser) Welt (kaum|keine|keinen|nur|niemand|mehr|einen|eine)|Menschen in der Welt|Freundin in der Welt|\bSpielneigung\b|\bDenkstil\b|KI-artig|\bF\d{4}\b|\bK\d{3}\b|Skelett|Steckbrief|(?<!Fußball-)\bSimulation\b)/gi;
for (const p of F) { const t = TX.get(p.id); let m; reMeta.lastIndex = 0; while ((m = reMeta.exec(t))) k2.push({ id: p.id, text: '„…' + ctx(t, m.index) + '…“' }); }
abschnitt('K2 Begriffe der Simulation im Lebenstext', k2);

// K3 Vorab-Urteile ueber ein hypothetisches Spiel (Produktnaehe)
const spv = id => (ST.get(id) || {}).spielverhalten || {};
const feldText = (id, k) => fl((ST.get(id) || {})[k] || '');
const reVor = /würde[^.|]{0,80}(mitmachen|ausprobieren|mitspielen|probieren|spielen|mögen|lustig finden)|(neue[nms]? Partyspiel|Verräter-?[Ss]piel)[^.|]{0,60}würde/i;
const k3 = F.filter(p => reVor.test(fl(spv(p.id)))).map(p => { const t = fl(spv(p.id)); const i = t.search(reVor); return { id: p.id, text: '„…' + ctx(t, i, 70) + '…“' }; });
abschnitt('K3 Spielverhalten mit Vorab-Urteil über ein noch unbekanntes Spiel', k3, 'Figuren mit dem Wort „Verräter“: ' + F.filter(p => /Verräter/i.test(TX.get(p.id))).length);

// K4 Rollenspiel laut Skelett unbekannt, Text nennt es
const reRolle = /werwolf|vampir k|weerwolven|loups?-garous|\bmafia\b|among us/i;
const k4 = F.filter(p => !p.spielen.kennt_rollenspiel && reRolle.test(fl(spv(p.id).partyspiele || '') + ' ' + fl(spv(p.id).lieblinge || ''))).map(p => ({ id: p.id, text: 'Partyspiele: ' + fl(spv(p.id).partyspiele || '').slice(0, 90) }));
abschnitt('K4 kennt_rollenspiel false, Partyspiele oder Lieblinge nennen ein Rollen- oder Bluffspiel', k4);

// K5 Ohne Kinder im Skelett, Text nennt eigene Kinder oder Enkel
const reKind = /\b(Enkel\w*|Urenkel\w*|(?:ihre|seine|ihrer|seiner|ihren|seinen|ihrem|seinem) (?:Tochter|Sohn|Töchter|Söhne|Kinder|Kindern)|torun\w*)\b/g;
const reHerkunft = /^(Enkel|Enkelin) (\p{L}+er |zugewanderter )/u;
const k5 = [];
for (const p of F) {
  if (kinderZahl(p) > 0) continue;
  const t = TX.get(p.id); let m; reKind.lastIndex = 0;
  while ((m = reKind.exec(t))) { const rest = t.slice(m.index, m.index + 60); if (reHerkunft.test(rest) || /Enkel- und|Eigenbedarf/.test(ctx(t, m.index, 30))) continue; k5.push({ id: p.id, text: p.familienstand + ', ' + p.alter + ': „…' + ctx(t, m.index) + '…“' }); break; }
}
abschnitt('K5 Ohne Kinder im Skelett, Text nennt eigene Kinder oder Enkel (nachlesen)', k5);

// K6 Kinder-Figuren gemischter Paare ohne die Herkunft beider Eltern
const k6 = [];
for (const p of F) { const el = (p.eltern_ids || []).map(id => byId.get(id)).filter(Boolean); if (el.length === 2 && el[0].herkunft[0] !== el[1].herkunft[0] && !el.every(e => p.herkunft.includes(e.herkunft[0]))) k6.push({ id: p.id, text: 'herkunft ' + p.herkunft.join('/') + ', Eltern ' + el.map(e => e.id + ' ' + e.herkunft.join('/')).join(' und ') }); }
abschnitt('K6 Kind gemischter Eltern ohne beide Herkünfte', k6);

// K7 Bildung
const altBeiAnkunft = p => p.einwanderung && p.einwanderung.seit ? p.alter - (2026 - p.einwanderung.seit) : null;
const k7 = [];
for (const p of F) {
  const a = altBeiAnkunft(p);
  if (/Herkunftsland/.test(p.bildung.schule || '') && a !== null && a < 15) k7.push({ id: p.id, text: 'Schulabschluss im Herkunftsland, aber mit ' + a + ' Jahren angekommen' });
  if (['staatsexamen', 'promotion'].includes(p.bildung.abschluss) && /Fachabitur|Hauptschul|Mittlere Reife|Realschul|POS/.test(p.bildung.schule || '')) k7.push({ id: p.id, text: p.bildung.abschluss + ' mit ' + p.bildung.schule });
  const kn = Number((String(p.bildung.klasse || '').match(/(\d+)/) || [])[1]);
  if (p.status === 'schule' && /^(Realschule|Oberschule|Werkrealschule oder Hauptschule|Hauptschule)$/.test(p.bildung.schulform) && kn > 10) k7.push({ id: p.id, text: p.bildung.schulform + ' ' + p.bildung.klasse });
}
abschnitt('K7 Bildung passt nicht zu Ankunft, Schulabschluss oder Schulform', k7, 'Studierende mit Abschluss-Code anlern: ' + F.filter(p => p.status === 'studium' && p.bildung.abschluss === 'anlern').length + ' von ' + F.filter(p => p.status === 'studium').length);

// K8 Glaube und Sprache
const k8 = [];
for (const p of F) {
  if (p.glaube.richtung === 'alevitisch' && p.treffen_hindernis.some(h => /Fastenmonat/.test(h))) k8.push({ id: p.id, text: 'alevitisch mit Treff-Hindernis Fastenmonat' });
  if (p.glaube.richtung === 'jesidisch' && p.sprachen.some(s => /Zazak/.test(s.sprache))) k8.push({ id: p.id, text: 'jesidisch mit Zazakî (Jesiden sprechen meist Kurmancî)' });
  if (p.herkunft[0] === 's_asien' && p.sprachen.some(s => /Arabisch/.test(s.sprache) && s.niveau === 'Muttersprache')) k8.push({ id: p.id, text: 'südasiatische Familie, Arabisch als Muttersprache' });
  const a = altBeiAnkunft(p);
  if (p.einwanderung?.generation === 1 && a !== null && a >= 12 && p.sprachen.filter(s => s.niveau === 'Muttersprache').length >= 2) k8.push({ id: p.id, text: 'mit ' + a + ' angekommen, zwei Muttersprachen: ' + p.sprachen.filter(s => s.niveau === 'Muttersprache').map(s => s.sprache).join(' und ') });
}
abschnitt('K8 Glaube und Sprache passen nicht zusammen', k8);

// K9 Alter, Status, Abschlussbezeichnung
const k9 = [];
for (const p of F) {
  if (p.status === 'erwerbstaetig' && p.alter >= 72) k9.push({ id: p.id, text: 'erwerbstätig mit ' + p.alter + ': ' + p.beruf });
  if (['DE', 'AT', 'CH'].includes(p.land) && p.alter >= 60 && /\b(Bachelor|Master)\b/.test(feldText(p.id, 'kurzbio') + ' ' + feldText(p.id, 'beruf_genau'))) k9.push({ id: p.id, text: p.alter + ' Jahre, Text nennt Bachelor oder Master (damals Diplom, Magister oder Staatsexamen)' });
}
abschnitt('K9 Alter und Status oder Abschlussbezeichnung unwahrscheinlich', k9);

// K10 Schablonensaetze
const k10 = [];
for (const feld of ['denkstil_text', 'treffen_text', 'geld_ausgeben', 'widerspruch']) {
  const m = new Map();
  for (const p of F) { const s = feldText(p.id, feld).split(/(?<=[.!?])\s/)[0].trim().toLowerCase(); if (s.length < 25) continue; if (!m.has(s)) m.set(s, []); m.get(s).push(p.id); }
  for (const [s, ids] of m) if (ids.length > 1) k10.push({ id: ids[0], text: feld + ' ×' + ids.length + ' (' + ids.join(', ') + '): „' + s.slice(0, 110) + '“' });
}
abschnitt('K10 Gleicher erster Satz in mehreren Steckbriefen', k10);

// K11 Aehnlichkeit
const woerter = t => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 1);
const sh = new Map(F.map(p => { const w = woerter(TX.get(p.id)); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]); return [p.id, s]; }));
const jac = (a, b) => { let n = 0; const [x, y] = a.size < b.size ? [a, b] : [b, a]; for (const e of x) if (y.has(e)) n++; return n / (a.size + b.size - n); };
const paare = [];
const ids = F.map(p => p.id);
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const v = jac(sh.get(ids[i]), sh.get(ids[j])); if (v > 0.045) paare.push({ id: ids[i], text: v.toFixed(3) + ' mit ' + ids[j] + ' ' + byId.get(ids[j]).name, v }); }
paare.sort((a, b) => b.v - a.v);
abschnitt('K11 Ähnlichste Steckbriefe (Jaccard über Wort-Dreiergruppen, über 0,045)', paare);

const text = '# Inhaltliche Prüfhilfen der Welt\n\nErzeugt mit `werkzeug/welt-inhalt-pruefen.mjs`. Befunde sind Hinweise zum Nachlesen; nur K1 ist ein Fehler.\n' + out.join('\n') + '\n';
if (A.md) { if (A.md === '-' || A.md === true) console.log(text); else writeFileSync(resolve(A.md), text, 'utf8'); }
console.log('K1 Schema ' + k1.length + ' | K2 Meta ' + k2.length + ' | K3 Vorab-Urteil ' + k3.length + ' | K4 Rollenspiel ' + k4.length + ' | K5 Kinder/Enkel ' + k5.length + ' | K6 Herkunft ' + k6.length + ' | K7 Bildung ' + k7.length + ' | K8 Glaube/Sprache ' + k8.length + ' | K9 Alter ' + k9.length + ' | K10 Schablonen ' + k10.length + ' | K11 ähnlich ' + paare.length);
process.exit(schemaFehler ? 1 : 0);
