#!/usr/bin/env node
/*
 * namen-pruefen.mjs - Gleicht die Namen der Figuren mit Wikidata ab: Heisst ein bekannter Mensch genau so?
 *
 * Eine einzige SPARQL-Abfrage prueft alle Namen der Welt (Vorname + Nachname, dazu Vorname + Geburtsname). Gesucht
 * werden Menschen (P31 = Q5), deren Bezeichnung oder Alias in einer der Sprachen genau so lautet, ohne Mindestzahl an
 * Sprachversionen. Namen mit Akzenten werden zusaetzlich ohne Akzente gesucht. Die Abfrage braucht Netz.
 *
 * Positivkontrolle: Die Kontrollnamen stehen in der Sperrliste und muessen gefunden werden, einer mit vielen und einer
 * mit wenigen Sprachversionen. Fehlt einer, ist das Messgeraet kaputt (Exit-Code 2) und das Ergebnis zaehlt nicht.
 *
 * Ein Treffer ist ein Hinweis zum Nachlesen, kein Urteil: Allerweltsnamen haben fast immer Namensvettern. Heikel ist ein
 * Name, wenn er vor allem mit einer heute bekannten Person verbunden ist (viele Sprachversionen, erster Suchtreffer),
 * besonders im selben Land oder wenn der Steckbrief dem Namen heikle Eigenschaften anhaengt. Solche Namen umbenennen und
 * den alten Namen in die Sperrliste aufnehmen (PROMINENTE_ZUSATZ in werkzeug/welt-skelett.mjs). Wikidata kennt nicht
 * jede bekannte Person und nicht jede Umschrift (Stoyan, Stoian); die Websuche und die Sperrliste bleiben deshalb noetig.
 *
 * Aufruf:
 *   node werkzeug/namen-pruefen.mjs [--welt <ordner>] [--namen <datei>] [--kontrolle "Name;Name"] [--schwelle <n>]
 *                                   [--sprachen a,b,c] [--alle] [--aus <datei.json>] [--streng]
 *   --namen      prueft die Namen aus einer Textdatei (ein Name je Zeile, # = Kommentar) statt der Welt, z. B. neue Namen
 *   --sprachen   Sprachen fuer --namen und die Kontrollnamen (Standard de,fr,nl,tr; mul und en immer)
 *   --kontrolle  weitere Kontrollnamen, die gefunden werden muessen (mit ; getrennt), z. B. alte Namen nach einer Umbenennung
 *   --schwelle   ab so vielen Sprachversionen gilt ein Treffer als gewichtig (Standard 15)
 *   --alle       listet alle Namen mit Treffer (sonst nur die gewichtigen und eine Zusammenfassung)
 *   --aus        schreibt das vollstaendige Ergebnis als JSON
 *   --streng     Exit-Code 1, wenn ein Name einen gewichtigen Treffer hat
 * Exit-Code 0 ohne Befund oder ohne --streng, 1 mit gewichtigem Treffer und --streng, 2 bei Abbruch oder fehlender Kontrolle.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argumente, PROMINENTE_ZUSATZ, normName } from './welt-skelett.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const ENDPUNKT = 'https://query.wikidata.org/sparql';
// Sprachen der Bezeichnungen. Jeder Name wird mit mul (sprachuebergreifende Bezeichnung, die viele Personen nur noch
// tragen) und en gesucht, dazu in den lateinisch geschriebenen Sprachen seines Landes und seiner Herkunft. Alle Sprachen
// fuer alle Namen wuerden das Zeitlimit des Abfragedienstes (60 s) sprengen.
const BASIS = ['mul', 'en'];
const SPRACHE_LAND = { DE: ['de'], AT: ['de'], CH: ['de', 'fr'], NL: ['nl'], BE: ['fr', 'nl'], FR: ['fr'], TR: ['tr'], AZ: ['az'] };
const SPRACHE_HERKUNFT = {
  de: ['de'], de_ost: ['de'], ru_de: ['de'], at: ['de'], ch: ['de', 'fr'], nl: ['nl'], be: ['fr', 'nl'], fr: ['fr'],
  tr: ['tr'], tr_diaspora: ['tr'], ku: ['tr'], tr_balkan: ['tr'], tr_zypern: ['tr'], kauk: ['tr'], minderheit_tr: ['tr'], az: ['az', 'tr'],
  ar_maghreb: ['fr'], afr_west: ['fr'], afr_zentral: ['fr'], hisp: ['es'], pt_es: ['es', 'pt'], it: ['it'], pl: ['pl'],
  ex_yu: ['hr', 'bs'], al: ['sq'], ro: ['ro'], roma: ['ro', 'tr'], vn: ['vi'], eu_expat: ['it', 'pt', 'es', 'pl', 'fr', 'nl'],
};
// Kontrollnamen aus der Sperrliste: einer mit vielen, einer mit wenigen Sprachversionen.
const KONTROLLE_STANDARD = ['Gerhard Berger', 'Rainer Winkler'];

class Abbruch extends Error {}
const ohneAkzent = s => s.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/[ƏƎ]/g, 'E').replace(/ə/g, 'e').replace(/[Đđ]/g, m => (m === 'Đ' ? 'D' : 'd'))
  .replace(/[Łł]/g, m => (m === 'Ł' ? 'L' : 'l')).replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
const literal = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

async function hauptprogramm() {
  const A = argumente(process.argv.slice(2));
  const WELT = resolve(A.welt || join(HIER, '..', 'welt'));
  const SCHWELLE = Number(A.schwelle || 15);
  // fuer Namen aus --namen und die Kontrollnamen, zusaetzlich zu BASIS
  const SPRACHEN_LISTE = A.sprachen ? String(A.sprachen).split(',').map(s => s.trim()).filter(Boolean) : ['de', 'fr', 'nl', 'tr'];
  const sprachenFuer = p => [...new Set([...BASIS, ...(SPRACHE_LAND[p.land] || []), ...p.herkunft.flatMap(h => SPRACHE_HERKUNFT[h] || [])])];

  // ---------- Namen sammeln ----------
  const namen = new Map(); // Name -> { wo: [Figur, Liste oder Kontrolle], sprachen: Set, kontrolle }
  const merke = (name, wo, sprachen, kontrolle = false) => {
    const n = String(name || '').replace(/\s+/g, ' ').trim();
    if (!n || !n.includes(' ')) return;
    const e = namen.get(n) || { wo: [], sprachen: new Set(), kontrolle: false };
    if (wo && !e.wo.includes(wo)) e.wo.push(wo);
    for (const s of sprachen) e.sprachen.add(s);
    e.kontrolle ||= kontrolle;
    namen.set(n, e);
  };
  if (A.namen) {
    if (!existsSync(A.namen)) throw new Abbruch('Datei fehlt: ' + A.namen);
    for (const z of readFileSync(A.namen, 'utf8').split(/\r?\n/)) { const t = z.trim(); if (t && !t.startsWith('#')) merke(t, 'Liste', [...BASIS, ...SPRACHEN_LISTE]); }
  } else {
    const datei = join(WELT, 'skelett.json');
    if (!existsSync(datei)) throw new Abbruch('Datei fehlt: ' + datei);
    const S = JSON.parse(readFileSync(datei, 'utf8'));
    for (const p of S.figuren) {
      merke(p.vorname + ' ' + p.nachname, p.id, sprachenFuer(p));
      if (p.geburtsname && p.geburtsname !== p.nachname) merke(p.vorname + ' ' + p.geburtsname, p.id + ' (Geburtsname)', sprachenFuer(p));
    }
  }
  const kontrollen = [...KONTROLLE_STANDARD, ...String(A.kontrolle || '').split(';').map(s => s.trim()).filter(Boolean)];
  const sperre = new Set(PROMINENTE_ZUSATZ.map(normName));
  for (const k of kontrollen) {
    if (!sperre.has(normName(k))) console.log('Hinweis: Kontrollname steht nicht in der Sperrliste: ' + k);
    merke(k, 'Kontrolle', [...BASIS, ...SPRACHEN_LISTE], true);
  }
  const zahlNamen = [...namen.values()].filter(e => !e.kontrolle || e.wo.length > 1).length;

  // ---------- Abfrage bauen ----------
  const gesucht = new Map(); // Suchtext -> Liste der Namen
  const werte = new Set();
  for (const [n, e] of namen) {
    const oa = ohneAkzent(n);
    for (const [v, sprachen] of [[n, [...e.sprachen]], ...(oa !== n ? [[oa, BASIS]] : [])]) {
      const l = gesucht.get(v) || []; if (!l.includes(n)) l.push(n); gesucht.set(v, l);
      for (const sp of sprachen) werte.add(literal(v) + '@' + sp);
    }
  }
  const alleSprachen = [...new Set([...werte].map(w => w.slice(w.lastIndexOf('@') + 1)))];
  const abfrage = `SELECT ?name ?item ?sl ?beschrDe ?beschrEn WHERE {
  VALUES ?name { ${[...werte].join(' ')} }
  { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
  ?item wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl .
  OPTIONAL { ?item schema:description ?beschrDe FILTER(LANG(?beschrDe) = "de") }
  OPTIONAL { ?item schema:description ?beschrEn FILTER(LANG(?beschrEn) = "en") }
}`;

  // ---------- Abfrage senden (bei Zeitueberschreitung oder Ueberlast ein zweiter Versuch) ----------
  const t0 = Date.now();
  let J = null, letzterFehler = '';
  for (let versuch = 1; versuch <= 2 && !J; versuch++) {
    try {
      const antwort = await fetch(ENDPUNKT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/sparql-results+json',
          'User-Agent': 'MSY-Welt-namen-pruefen/1.0 (Open-Source-Werkzeug fuer erfundene Figuren; https://github.com/C10wN95/msystudio-welt)',
        },
        body: 'query=' + encodeURIComponent(abfrage),
        signal: AbortSignal.timeout(180000),
      });
      if (antwort.ok) J = await antwort.json();
      else {
        letzterFehler = 'HTTP ' + antwort.status + ': ' + (await antwort.text()).slice(0, 300);
        if (antwort.status !== 429 && antwort.status < 500) break;
        const warten = Math.min(60, Number(antwort.headers.get('retry-after')) || 10);
        if (versuch < 2) { console.log('Hinweis: Wikidata antwortet mit HTTP ' + antwort.status + ', zweiter Versuch in ' + warten + ' s'); await new Promise(r => setTimeout(r, warten * 1000)); }
      }
    } catch (e) { letzterFehler = e.message; if (versuch < 2) console.log('Hinweis: ' + e.message + ', zweiter Versuch'); }
  }
  if (!J) throw new Abbruch('Wikidata-Abfrage fehlgeschlagen: ' + letzterFehler);
  const sekunden = ((Date.now() - t0) / 1000).toFixed(1);

  // ---------- Auswerten ----------
  const treffer = new Map(); // Name -> Map(item -> {sl, beschreibung, als})
  for (const b of J.results.bindings) {
    const text = b.name.value;
    const id = b.item.value.replace('http://www.wikidata.org/entity/', '');
    for (const n of gesucht.get(text) || []) {
      const m = treffer.get(n) || new Map();
      const alt = m.get(id);
      const beschreibung = (b.beschrDe && b.beschrDe.value) || (b.beschrEn && b.beschrEn.value) || '';
      if (!alt) m.set(id, { sl: Number(b.sl.value), beschreibung, als: text });
      else if (!alt.beschreibung && beschreibung) alt.beschreibung = beschreibung;
      treffer.set(n, m);
    }
  }
  const ergebnis = [...namen.entries()].map(([name, e]) => {
    const items = [...(treffer.get(name) || new Map()).entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.sl - a.sl);
    return { name, wo: e.wo, kontrolle: e.kontrolle, sprachen: [...e.sprachen], treffer: items.length, max_sprachversionen: items.length ? items[0].sl : 0, items };
  });
  const fehlend = ergebnis.filter(e => e.kontrolle && !e.treffer).map(e => e.name);
  const pruefen = ergebnis.filter(e => !e.kontrolle || e.wo.length > 1);
  const mitTreffer = pruefen.filter(e => e.treffer).sort((a, b) => b.max_sprachversionen - a.max_sprachversionen || a.name.localeCompare(b.name));
  const gewichtig = mitTreffer.filter(e => e.max_sprachversionen >= SCHWELLE);

  if (A.aus) writeFileSync(resolve(A.aus), JSON.stringify({ quelle: ENDPUNKT, sprachen: alleSprachen, schwelle: SCHWELLE, kontrollen, kontrolle_ok: !fehlend.length, namen: zahlNamen, ergebnis }, null, 1) + '\n', 'utf8');

  const zeile = e => e.name + ' [' + e.wo.join(', ') + ']: ' + e.treffer + ' Treffer, bis ' + e.max_sprachversionen + ' Sprachversionen; '
    + e.items.slice(0, 3).map(i => i.id + ' ' + i.sl + ' SV' + (i.beschreibung ? ' (' + i.beschreibung.slice(0, 70) + ')' : '')).join(' | ');
  console.log('Wikidata-Abgleich: ' + zahlNamen + ' Namen, ' + werte.size + ' Suchwerte in ' + alleSprachen.length + ' Sprachen (' + alleSprachen.join(', ') + '), eine Abfrage, ' + sekunden + ' s');
  for (const e of ergebnis.filter(x => x.kontrolle)) console.log('Kontrolle ' + e.name + ': ' + (e.treffer ? 'gefunden (bis ' + e.max_sprachversionen + ' Sprachversionen)' : 'NICHT gefunden'));
  console.log('Namen mit Treffer: ' + mitTreffer.length + ', davon ab ' + SCHWELLE + ' Sprachversionen: ' + gewichtig.length);
  for (const e of (A.alle ? mitTreffer : gewichtig)) console.log('  ' + zeile(e));
  if (!A.alle && mitTreffer.length > gewichtig.length) console.log('  (weitere ' + (mitTreffer.length - gewichtig.length) + ' Namen mit kleineren Treffern: --alle)');
  if (fehlend.length) throw new Abbruch('Kontrollnamen nicht gefunden (' + fehlend.join(', ') + '): Abfrage oder Sprachen pruefen, Ergebnis ungueltig');
  return A.streng && gewichtig.length ? 1 : 0;
}

// Kein process.exit(): Unter Windows bricht Node sonst manchmal ab, waehrend die Netzverbindung noch schliesst.
try { process.exitCode = await hauptprogramm(); } catch (e) {
  if (e instanceof Abbruch) { console.log('ABBRUCH: ' + e.message); process.exitCode = 2; } else throw e;
}
