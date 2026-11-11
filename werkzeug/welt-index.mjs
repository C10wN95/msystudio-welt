#!/usr/bin/env node
/*
 * welt-index.mjs - Baut welt/index.json aus welt/figuren-01.json bis figuren-10.json.
 *
 * Der Index ist eine kompakte Liste aller 1000 Figuren (eine Zeile je Figur) mit den Feldern, die man zum Ziehen,
 * Filtern und Nachschlagen braucht, plus der Datei, in der der vollstaendige Steckbrief steht, und einer Kurzliste
 * der Kreise. Grundlage sind die Steckbriefe; skelett.json und kreise.json werden zum Abgleich gelesen.
 *
 * Aufruf:
 *   node werkzeug/welt-index.mjs [--welt <ordner>] [--aus <datei>] [--erlaube-fehlende]
 *   --erlaube-fehlende  fehlende figuren-NN.json werden aus skelett.json ergaenzt (Feld steckbrief: false);
 *                       ohne diesen Schalter bricht das Skript bei fehlenden Dateien ab.
 * Exit-Code 0 bei Erfolg, 1 bei Fehlern.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argumente, fid, jsonZeilen, STICHTAG } from './welt-skelett.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const A = argumente(process.argv.slice(2));
const WELT = resolve(A.welt || join(HIER, '..', 'welt'));
const AUS = resolve(A.aus || join(WELT, 'index.json'));
const fehler = [];
const lies = d => JSON.parse(readFileSync(d, 'utf8'));

if (!existsSync(join(WELT, 'skelett.json'))) { console.log('FEHLER: skelett.json fehlt in ' + WELT); process.exit(1); }
const S = lies(join(WELT, 'skelett.json'));
const K = existsSync(join(WELT, 'kreise.json')) ? lies(join(WELT, 'kreise.json')) : { kreise: [] };
const skelett = new Map(S.figuren.map(p => [p.id, p]));

const figuren = [];
const dateien = [];
for (let n = 1; n <= 10; n++) {
  const name = 'figuren-' + String(n).padStart(2, '0') + '.json';
  const datei = join(WELT, name);
  let liste = null;
  if (existsSync(datei)) {
    try { const roh = lies(datei); liste = Array.isArray(roh) ? roh : roh.figuren; } catch (e) { fehler.push(name + ': kein gültiges JSON (' + e.message + ')'); }
    if (!Array.isArray(liste)) { fehler.push(name + ': keine Liste figuren'); liste = null; } else dateien.push(name);
  } else if (!A['erlaube-fehlende']) fehler.push(name + ' fehlt (mit --erlaube-fehlende aus skelett.json ergänzen)');
  for (let i = 0; i < 100; i++) {
    const id = fid((n - 1) * 100 + i + 1);
    let f = liste ? liste[i] : null;
    if (liste && (!f || f.id !== id)) { fehler.push(name + ' Position ' + (i + 1) + ': ' + (f && f.id) + ' statt ' + id); f = null; }
    const s = skelett.get(id);
    const quelle = f || s;
    if (!quelle) { fehler.push(id + ' fehlt in Steckbrief und Skelett'); continue; }
    // persoenlichkeit ist in den Steckbriefen ein Objekt {kurz, geduld, humor, macken}; als Text wird kurz genommen, sonst die kurzbio
    const pers = quelle.persoenlichkeit;
    const kurzText = typeof pers === 'string' ? pers : (pers && typeof pers.kurz === 'string' ? pers.kurz : (typeof quelle.kurzbio === 'string' ? quelle.kurzbio : null));
    const kurz = kurzText ? kurzText.split(/(?<=[.!?])\s/)[0].slice(0, 160) : null;
    figuren.push({
      id, name: quelle.name || (quelle.vorname + ' ' + quelle.nachname), alter: quelle.alter, geschlecht: quelle.geschlecht, land: quelle.land, ort: quelle.ort,
      stadtteil: quelle.stadtteil, herkunft: quelle.herkunft, status: quelle.status, taetigkeit: quelle.taetigkeit, einkommen: quelle.einkommen,
      denkstil: quelle.denkstil, denkstil_art: quelle.denkstil_art, spielneigung: quelle.spielneigung, handy: quelle.geraet ? quelle.geraet.handy : null,
      einsam: quelle.einsam, haushalt_id: quelle.haushalt_id, kreise_ids: quelle.kreise_ids || [], datei: name, steckbrief: !!f, kurz,
    });
  }
}
if (fehler.length) { for (const f of fehler) console.log('FEHLER: ' + f); console.log(fehler.length + ' Fehler, index.json nicht geschrieben'); process.exit(1); }

const zaehle = f => { const m = {}; for (const p of figuren) { const k = f(p); m[k] = (m[k] || 0) + 1; } return m; };
const index = {
  meta: {
    titel: 'Index der MSY-Welt', erzeugt_mit: 'werkzeug/welt-index.mjs', stichtag: STICHTAG, quellen: dateien, figuren: figuren.length,
    mit_steckbrief: figuren.filter(p => p.steckbrief).length,
    hinweis: 'Kompakte Liste zum Ziehen und Filtern. Vollständige Steckbriefe stehen in der genannten Datei (figuren-01.json enthält F0001 bis F0100 usw.), Beziehungen in skelett.json, Kreise in kreise.json.',
  },
  statistik: { je_land: zaehle(p => p.land), je_denkstil: zaehle(p => p.denkstil), je_einkommen: zaehle(p => p.einkommen), minderjaehrige: figuren.filter(p => p.alter <= 17).length, kreise: (K.kreise || []).length },
  kreise: (K.kreise || []).map(k => ({ kreis_id: k.kreis_id, art: k.art, unterart: k.unterart, ort: k.ort, groesse: k.mitglieder.length, mitglieder: k.mitglieder })),
  figuren,
};
writeFileSync(AUS, jsonZeilen(index, ['kreise', 'figuren']), 'utf8');
console.log('index.json geschrieben: ' + AUS + ' (' + figuren.length + ' Figuren, davon ' + index.meta.mit_steckbrief + ' mit Steckbrief, ' + index.kreise.length + ' Kreise)');
