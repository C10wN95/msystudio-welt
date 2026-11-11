#!/usr/bin/env node
/*
 * welt-skelett.mjs - Generator fuer das Skelett der MSY-Welt (1000 Figuren).
 *
 * Liest welt/bauplan.json und schreibt:
 *   welt/skelett.json  Figuren (eine Zeile je Figur), Haushalte, Betriebe, Freundesnetz
 *   welt/kreise.json   Freundeskreise (Familie, Freunde, Klasse, Arbeit, Verein, Nachbarschaft, Online)
 *
 * Kein Netzzugriff. Wiederholbar: gleicher Bauplan und gleicher Startwert ergeben dieselbe Welt.
 *
 * Aufruf:
 *   node werkzeug/welt-skelett.mjs [--welt <ordner>] [--bauplan <datei>] [--aus <ordner>] [--seed <zahl>] [--privat <datei>]
 * Standard: welt = ../welt (relativ zu diesem Skript), bauplan = <welt>/bauplan.json, aus = <welt>,
 *           seed = 20261107.
 *
 * Private Liste: privat/ausschluss.json (neben welt/ und werkzeug/, nicht im offenen Projekt) mit den Feldern
 * vornamen, nachnamen und intern. Diese Namen vergibt der Generator nicht. Fehlt die Datei, schliesst er nichts aus
 * und meldet das; die Namen koennen dann vom veroeffentlichten Skelett abweichen.
 *
 * Reihenfolge (wie im Bauplan empfohlen): Orte und Herkunft -> Haushalte -> Alter und Geschlecht im
 * Haushalt -> Einwanderung -> Familien ueber Haushalte -> Namen -> Glaube, Sprachen -> Bildung und
 * Taetigkeit -> Betriebe -> Einkommen und Schicht -> Denkstil (unabhaengig, ausbalanciert) -> Geraet ->
 * Probleme -> Lebensereignis -> Spielen und Medien -> Freundesnetz und Kreise -> freie Zeit und Treffen.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const STANDARD_SEED = 20261107;
export const JAHR = 2026;
export const STICHTAG = '2026-11-07';
export const BAENDER = ['12-14', '15-17', '18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85+'];
export const STATUS_CODES = ['schule', 'ausbildung', 'studium', 'erwerbstaetig', 'arbeitslos', 'haushalt', 'elternzeit', 'rente', 'erwerbsunfaehig', 'dienst', 'neet'];
export const KREIS_ARTEN = ['Familie', 'Freunde', 'Klasse', 'Arbeit', 'Verein', 'Nachbarschaft', 'Online'];
export const FAMILIENSTAENDE = ['ledig', 'in Beziehung', 'verlobt', 'zusammenlebend', 'verheiratet', 'getrennt lebend', 'geschieden', 'verwitwet'];
export const STUFE_BILDUNG = { keine: 0, anlern: 1, ausbildung: 2, fachschule: 3, bachelor: 4, master: 5, staatsexamen: 5, promotion: 6 };
export const EINKOMMEN_AUS_SCHICHT = { knapp: 'knapp', untere_mitte: 'mittel', mitte: 'mittel', obere_mitte: 'gut', wohlhabend: 'gut' };
export const TREFF_STUFEN = ['frei', 'abgesprochen', 'eingeschraenkt', 'kaum'];
export const WESTEN = new Set(['DE', 'NL', 'BE', 'AT', 'CH', 'GB', 'US', 'FR']);
export const EINHEIMISCH = {
  DE: ['de'], AT: ['at'], CH: ['ch'], NL: ['nl'], BE: ['be'], FR: ['fr'], GB: ['uk'], US: ['us', 'afroam'],
  TR: ['tr', 'ku', 'kauk', 'minderheit_tr', 'roma', 'tr_balkan'], BG: ['bg', 'tr_balkan', 'roma'], AZ: ['az', 'ru', 'kauk'], AE: ['ar_golf'],
};
export const LANDESSPRACHE = { DE: 'Deutsch', AT: 'Deutsch', CH: 'Deutsch', NL: 'Niederländisch', BE: 'Französisch', FR: 'Französisch', GB: 'Englisch', US: 'Englisch', TR: 'Türkisch', BG: 'Bulgarisch', AZ: 'Aserbaidschanisch', AE: 'Arabisch' };
// Vornamen, die in zwei Kulturen funktionieren (Bauplan namen.regeln)
export const NAMEN_BEIDE = { m: ['Deniz', 'Can', 'Leon', 'Elias', 'Adam', 'Emir'], w: ['Deniz', 'Lara', 'Aylin', 'Mila', 'Sara', 'Lina', 'Ela'] };
// Ergaenzung zur Sperrliste des Bauplans: bekannte lebende oder historische Personen, Platzhalternamen, Kunstfiguren
export const PROMINENTE_ZUSATZ = [
  'Helmut Schmidt', 'Gerhard Schröder', 'Ralf Schumacher', 'Helene Fischer', 'Sarah Connor', 'Timo Werner', 'Angela Merkel', 'Friedrich Merz',
  'Helmut Kohl', 'Willy Brandt', 'Konrad Adenauer', 'Markus Söder', 'Christian Lindner', 'Karl Lauterbach', 'Robert Habeck', 'Annalena Baerbock',
  'Frank-Walter Steinmeier', 'Joachim Gauck', 'Horst Seehofer', 'Wolfgang Schäuble', 'Thomas Gottschalk', 'Günther Jauch', 'Dieter Bohlen',
  'Heidi Klum', 'Til Schweiger', 'Jürgen Klopp', 'Manuel Neuer', 'Toni Kroos', 'Lukas Podolski', 'Bastian Schweinsteiger', 'Philipp Lahm',
  'Mario Götze', 'Miroslav Klose', 'Oliver Kahn', 'Lothar Matthäus', 'Franz Beckenbauer', 'Uwe Seeler', 'Sebastian Vettel', 'Nico Rosberg',
  'Michael Ballack', 'Joshua Kimmich', 'Jamal Musiala', 'Florian Wirtz', 'Kai Havertz', 'Leroy Sané', 'Mats Hummels', 'Marco Reus',
  'Herbert Grönemeyer', 'Udo Lindenberg', 'Peter Maffay', 'Andrea Berg', 'Matthias Schweighöfer', 'Jan Böhmermann', 'Daniel Brühl',
  'Katarina Witt', 'Dirk Nowitzki', 'Steffi Graf', 'Max Mustermann', 'Erika Mustermann', 'Sebastian Kurz', 'Arnold Schwarzenegger',
  'David Alaba', 'Niki Lauda', 'Marcel Hirscher', 'Roger Federer', 'Xherdan Shaqiri', 'Granit Xhaka',
  'Recep Tayyip Erdoğan', 'Ekrem İmamoğlu', 'Mansur Yavaş', 'Özgür Özel', 'Kemal Kılıçdaroğlu', 'Devlet Bahçeli', 'Meral Akşener',
  'Ali Babacan', 'Ahmet Davutoğlu', 'Selahattin Demirtaş', 'Leyla Zana', 'Abdullah Öcalan', 'Süleyman Demirel', 'Turgut Özal',
  'Bülent Ecevit', 'Abdullah Gül', 'Binali Yıldırım', 'Necdet Sezer', 'Ahmet Necdet Sezer', 'Mehmet Şimşek', 'Hakan Fidan',
  'Ahmet Kaya', 'Cem Yılmaz', 'Hülya Avşar', 'Arda Güler', 'Kenan Yıldız', 'Nuri Şahin', 'Semih Kaya', 'Şener Şen', 'Murat Yıldırım',
  'Hazal Kaya', 'Şenol Güneş', 'Ebru Şahin', 'Kemal Sunal', 'Hakan Şükür', 'Mesut Özil', 'İlkay Gündoğan', 'Kerem Aktürkoğlu',
  'Barış Alper Yılmaz', 'Burak Özçivit', 'Kıvanç Tatlıtuğ', 'Hande Erçel', 'Ajda Pekkan', 'Orhan Pamuk', 'Elif Şafak', 'Nazım Hikmet',
  'Yaşar Kemal', 'Zeki Müren', 'Müslüm Gürses', 'İbrahim Tatlıses', 'Şivan Perwer', 'Fatih Terim', 'Hakan Çalhanoğlu', 'Merih Demiral',
  'Cengiz Ünder', 'Volkan Demirel', 'Emre Belözoğlu', 'Tuncay Şanlı', 'Hamit Altıntop', 'Halil Altıntop', 'Rüştü Reçber', 'Ferdi Kadıoğlu',
  'Kenan Doğulu', 'Murat Boz', 'Mustafa Sandal', 'Ebru Gündeş', 'Bülent Ersoy', 'Demet Akalın', 'Hadise Açıkgöz', 'Tarkan Tevetoğlu',
  'Yılmaz Güney', 'Türkan Şoray', 'Haluk Bilginer', 'Beren Saat', 'Serenay Sarıkaya', 'Engin Altan Düzyatan', 'Halit Ergenç',
  'Kenan İmirzalıoğlu', 'Tuba Büyüküstün', 'Cem Karaca', 'Neşet Ertaş', 'Aşık Veysel', 'Mustafa Kemal Atatürk', 'Rauf Denktaş',
  'Heydər Əliyev', 'Mehriban Əliyeva', 'Leyla Əliyeva', 'Arzu Əliyeva', 'Rəşad Sadıqov', 'Grigor Dimitrov', 'Hristo Stoichkov',
  'Mohamed Salah', 'Achraf Hakimi', 'Riyad Mahrez', 'Hakim Ziyech', 'Yassine Bounou', 'Bashar al-Assad', 'Yasser Arafat',
  'Hassan Rouhani', 'Ali Daei', 'Ashraf Ghani', 'Hamid Karzai', 'Imran Khan', 'Salman Khan', 'Aamir Khan', 'Shah Rukh Khan',
  'Priyanka Chopra', 'Malala Yousafzai', 'Narendra Modi', 'Virat Kohli', 'Sachin Tendulkar', 'Manny Pacquiao', 'Rodrigo Duterte',
  'Kwame Nkrumah', 'Sadio Mané', 'Didier Drogba', 'Victor Osimhen', 'Emma Watson', 'Emma Stone', 'Tom Jones', 'Harry Kane',
  'Harry Potter', 'Sherlock Holmes', 'John Smith', 'John Doe', 'Jane Doe', 'David Beckham', 'Paul McCartney', 'Elton John', 'Ed Sheeran',
  'Taylor Swift', 'Michael Jordan', 'Will Smith', 'Kevin Hart', 'Denzel Washington', 'Serena Williams', 'Venus Williams', 'LeBron James',
  'Barack Obama', 'Michelle Obama', 'Donald Trump', 'Joe Biden', 'Bill Gates', 'Steve Jobs', 'Elon Musk', 'Peter Parker', 'Lisa Simpson',
  'Bart Simpson', 'Homer Simpson', 'Bob Marley', 'Usain Bolt', 'Ruud Gullit', 'Clarence Seedorf', 'Edgar Davids', 'Patrick Kluivert',
  'Johan Cruijff', 'Arjen Robben', 'Max Verstappen', 'Mark Rutte', 'Virgil van Dijk', 'Kylian Mbappé', 'Zinédine Zidane',
  'Emmanuel Macron', 'Marine Le Pen', 'Karim Benzema', 'Antoine Griezmann', 'Mario Rossi', 'Valentino Rossi', 'Francesco Totti',
  'Giorgia Meloni', 'Andrea Bocelli', 'Laura Pausini', 'Cristiano Ronaldo', 'Rafael Nadal', 'Enrique Iglesias', 'Julio Iglesias',
  'Penélope Cruz', 'Celia Cruz', 'Pedro Sánchez', 'Jennifer Lopez', 'Jennifer López', 'Selena Gomez', 'Selena Gómez', 'Lionel Messi',
  'Antonio Banderas', 'Andrij Schewtschenko', 'Vitali Klitschko', 'Wladimir Klitschko', 'Vladimir Putin', 'Wolodymyr Selenskyj',
  'Andrzej Duda', 'Lech Wałęsa', 'Anna Lewandowska', 'Wojciech Szczęsny', 'Gheorghe Hagi', 'Simona Halep', 'Nadia Comăneci',
  'Klaus Iohannis', 'Edin Džeko', 'Luka Modrić', 'Rita Ora', 'Novak Djokovic', 'Novak Đoković', 'Giannis Antetokounmpo', 'Alexis Tsipras',
  'Rainer Winkler', 'Gerhard Berger', 'Klaus Fischer', 'Andrea Fischer', 'Alan Davies', 'Weronika Nowakowska', 'Lea Friedrich', 'Serkan Kaya',
  'Ibrahim Abboud', 'Peter Krause', 'Alice David', 'Stoyan Yordanov', 'Stefka Yordanova', 'James Anderson', 'Brian Kelly',
  'Isaiah Jackson', 'Hans Berger', 'Vasile Marin', 'Serhat Balcı', 'Walter Lang', 'Eoin Doyle', 'Dragan Marković',
  'Rəhim Hüseynov', 'Yusuf Aslan', 'Werner Böhm', 'Oliver Gray', 'Tim Schäfer', 'Marianne Walter', 'Katharina Schulze',
  'Andrea Roth', 'Katarzyna Dąbrowska', 'Səbinə Əliyeva',
];
// Spiele, die am Bildschirm gespielt werden (Rest der Bauplan-Listen sind Karten-, Brett- und Gruppenspiele)
export const VIDEOSPIELE = new Set(['Brawl Stars', 'Fortnite', 'Minecraft', 'Roblox', 'EA SPORTS FC', 'Clash Royale', 'Mario Kart', 'Among Us',
  'Call of Duty', 'Valorant', 'League of Legends', 'Mario Party', 'GTA', 'Candy Crush', 'Mario Kart mit den Kindern', 'Wordle', 'PUBG Mobile',
  'EA SPORTS FC Mobile', 'CS2', 'Royal Match', 'Jackbox Party Packs', 'Madden NFL', 'NBA 2K', 'Counter-Strike', 'Ludo King', 'Cricket-Spiele', 'Solitär']);

// ------------------------------------------------------------------------------------------------
// Hilfen
// ------------------------------------------------------------------------------------------------
export function argumente(liste) {
  const a = {};
  for (let i = 0; i < liste.length; i++) {
    const t = liste[i];
    if (!t.startsWith('--')) { (a._ ||= []).push(t); continue; }
    const gl = t.indexOf('=');
    if (gl > 0) a[t.slice(2, gl)] = t.slice(gl + 1);
    else if (i + 1 < liste.length && !liste[i + 1].startsWith('--')) a[t.slice(2)] = liste[++i];
    else a[t.slice(2)] = true;
  }
  return a;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function fnv(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export class Zufall {
  constructor(seed, stufe) { this.r = mulberry32(fnv(String(seed) + '|' + stufe)); }
  z() { return this.r(); }
  chance(p) { return this.r() < p; }
  ganz(a, b) { return a + Math.floor(this.r() * (b - a + 1)); }
  wahl(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  gewichtet(e) {
    const liste = Array.isArray(e) ? e : Object.entries(e);
    let s = 0;
    for (const [, w] of liste) if (w > 0) s += w;
    if (!(s > 0)) return liste.length ? liste[Math.floor(this.r() * liste.length)][0] : undefined;
    let x = this.r() * s;
    for (const [k, w] of liste) { if (w > 0) { x -= w; if (x < 0) return k; } }
    for (let i = liste.length - 1; i >= 0; i--) if (liste[i][1] > 0) return liste[i][0];
    return undefined;
  }
  mischen(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  normal() { let u = 0, v = 0; while (u === 0) u = this.r(); while (v === 0) v = this.r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
}
export function band(a) {
  if (a < 12) return null;
  if (a <= 14) return '12-14';
  if (a <= 17) return '15-17';
  if (a <= 24) return '18-24';
  if (a >= 85) return '85+';
  const u = Math.floor(a / 5) * 5;
  return u + '-' + (u + 4);
}
export function normName(s) {
  return String(s).replace(/ı/g, 'i').replace(/İ/g, 'I').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
export function fid(n) { return 'F' + String(n).padStart(4, '0'); }

// Private Listen (nicht im offenen Projekt): privat/ausschluss.json mit vornamen, nachnamen und intern.
export const PRIVAT_DATEI = join(dirname(fileURLToPath(import.meta.url)), '..', 'privat', 'ausschluss.json');
export function ladePrivat(datei) {
  const d = typeof datei === 'string' && datei ? resolve(datei) : PRIVAT_DATEI;
  if (!existsSync(d)) return { gefunden: false, datei: d, vornamen: [], nachnamen: [], intern: [] };
  const J = JSON.parse(readFileSync(d, 'utf8'));
  const liste = v => (Array.isArray(v) ? v : []).map(String);
  return { gefunden: true, datei: d, vornamen: liste(J.vornamen), nachnamen: liste(J.nachnamen), intern: liste(J.intern) };
}
const summe = arr => arr.reduce((s, x) => s + x, 0);
const klemme = (x, a, b) => Math.max(a, Math.min(b, x));
function ohneMeta(o) { const r = {}; for (const [k, v] of Object.entries(o || {})) if (typeof v === 'number') r[k] = v; return r; }
function normiere(o) { const s = summe(Object.values(o)); const r = {}; for (const [k, v] of Object.entries(o)) r[k] = s > 0 ? v / s : 0; return r; }
function altersgruppe5(a) { return a <= 17 ? '12-17' : a <= 29 ? '18-29' : a <= 49 ? '30-49' : a <= 64 ? '50-64' : '65+'; }
function beginntMit(name, praefix) { return !praefix || String(name).startsWith(praefix); }

// Berufsbezeichnung nach Geschlecht (Katalog nutzt Formen wie "Pflegehelfer/in", "Medizinische/r", "Kaufmann/Kauffrau")
export function gendern(titel, g) {
  const SPEZIAL = {
    'Kinderfrau/Nanny im Haushalt der Familie': ['Kinderbetreuer (Nanny) im Haushalt der Familie', 'Kinderfrau (Nanny) im Haushalt der Familie'],
    "Koranlehrerin oder Koranlehrer (Kur'an kursu öğreticisi)": ["Koranlehrer (Kur'an kursu öğreticisi)", "Koranlehrerin (Kur'an kursu öğreticisi)"],
    'Dede oder Mitarbeiter/in eines Cemevi': ['Dede oder Mitarbeiter eines Cemevi', 'Mitarbeiterin eines Cemevi'],
    'Sozialarbeiter/in oder Sozialpädagog/in': ['Sozialarbeiter oder Sozialpädagoge', 'Sozialarbeiterin oder Sozialpädagogin'],
    'Hebamme/Entbindungspfleger': ['Entbindungspfleger', 'Hebamme'],
    'Moscheediener (Kayyum) oder Muezzin': ['Moscheediener (Kayyum) oder Muezzin', 'Moscheedienerin (Kayyum)'],
    'Imam einer Moscheegemeinde': ['Imam einer Moscheegemeinde', 'Religionsbeauftragte einer Moscheegemeinde'],
    'Berufsunteroffizier (Uzman çavuş)': ['Berufsunteroffizier (Uzman çavuş)', 'Berufsunteroffizierin (Uzman çavuş)'],
  };
  if (SPEZIAL[titel]) return SPEZIAL[titel][g === 'w' ? 1 : 0];
  const w = g === 'w';
  let t = titel;
  t = t.replace(/([\p{L}-]+)\/-(\p{L}+)/gu, (_, a, b) => {
    if (!w) return a;
    const i = a.toLowerCase().lastIndexOf(b.slice(0, 4).toLowerCase());
    return i > 0 ? a.slice(0, i) + b : a;
  });
  t = t.replace(/([\p{L}-]+)\/(\p{Lu}[\p{L}-]*)/gu, (_, a, b) => {
    const weiblich = x => /(in|frau|mutter)$/i.test(x);
    const fem = weiblich(a) && !weiblich(b) ? a : b;
    const mas = fem === a ? b : a;
    return w ? fem : mas;
  });
  t = t.replace(/([\p{L}-]+)\/in(?!\p{L})/gu, (_, a) => (w ? a + 'in' : a));
  t = t.replace(/([\p{L}-]+)\/r(?!\p{L})/gu, (_, a) => (w ? a : a + 'r'));
  return t;
}

// ------------------------------------------------------------------------------------------------
// Feste Tabellen, die der Bauplan in Worten beschreibt (Stadtteile, Wellen, Schulen, Betriebe)
// ------------------------------------------------------------------------------------------------
// Herkunftsneigung je Stadtteil (Faktoren auf die Ortsmischung), nach den Stadtteilbeschreibungen im Bauplan
const ST_HERKUNFT = [
  ['berlin', 'Neukölln', { tr: 1.5, ar_levante: 2, ku: 1.3, de: 0.6 }], ['berlin', 'Kreuzberg', { tr: 1.6, ku: 1.4, de: 0.8 }],
  ['berlin', 'Spandau', { tr: 1.2, ru_de: 2 }], ['berlin', 'Marzahn', { de: 1.6, ru_de: 2, vn: 3, tr: 0.25, ar_levante: 0.4, ku: 0.3 }],
  ['koeln', 'Mülheim', { tr: 1.6, ku: 1.3 }], ['koeln', 'Chorweiler', { tr: 1.2, ar_levante: 1.5, ru_de: 2.5, de: 0.7 }],
  ['koeln', 'Lindenthal', { de: 1.6, tr: 0.4, ku: 0.4 }],
  ['duisburg', 'Marxloh', { tr: 1.7, ro: 2, bg: 2, roma: 2, de: 0.5 }], ['duisburg', 'Hochfeld', { ro: 2.5, bg: 2.5, roma: 2.5, tr: 1.3, de: 0.6 }],
  ['duisburg', 'Rheinhausen', { tr: 1.2 }], ['duisburg', 'Neudorf', { de: 1.5, tr: 0.6 }],
  ['stuttgart', 'Bad Cannstatt', { tr: 1.3, it: 1.3, gr: 1.3 }], ['stuttgart', 'Zuffenhausen', { tr: 1.2, it: 1.4 }],
  ['stuttgart', 'Schorndorf', { de: 1.3 }], ['stuttgart', 'Dorf', { de: 1.6, tr: 0.5, it: 0.6, gr: 0.6 }],
  ['leipzig', 'Neustadt', { ar_levante: 4, af: 3, ku: 3, tr: 3, vn: 1.5, de: 0.5 }], ['leipzig', 'Grünau', { de: 1.2, ru_de: 2 }],
  ['leipzig', 'Connewitz', { de: 1.1 }], ['leipzig', 'Wurzen', { de: 1.3, ar_levante: 0.5 }],
  ['istanbul', 'Bağcılar', { ku: 1.3, ar_levante: 2 }], ['istanbul', 'Esenyurt', { ar_levante: 2, af: 2.5, ku: 1.2 }],
  ['istanbul', 'Kadıköy', { minderheit_tr: 3, tr_balkan: 1.3, ku: 0.6, ar_levante: 0.3 }], ['istanbul', 'Üsküdar', { tr: 1.1 }],
  ['ankara', 'Mamak', { ku: 1.6 }], ['ankara', 'Çankaya', { tr: 1.1 }],
  ['izmir', 'Buca', { ku: 1.5, roma: 2 }], ['izmir', 'Karşıyaka', { tr_balkan: 1.5 }], ['izmir', 'Bornova', { tr_balkan: 1.2 }],
  ['diyarbakir', 'Yenişehir', { tr: 1.5 }],
  ['rotterdam', 'Feijenoord', { tr: 1.5, ar_maghreb: 1.4, nl: 0.5 }], ['rotterdam', 'Delfshaven', { tr: 1.3, ar_maghreb: 1.3, karib: 1.2 }],
  ['rotterdam', 'Charlois', { karib: 1.3, pl: 1.5, bg: 1.5 }], ['rotterdam', 'Kralingen', { nl: 1.8, tr: 0.5 }],
  ['bruessel', 'Saint-Josse', { tr: 1.6 }], ['bruessel', 'Schaerbeek', { tr: 1.3, ar_maghreb: 1.2 }],
  ['bruessel', 'Anderlecht', { ar_maghreb: 1.5, ro: 1.5 }], ['bruessel', 'Woluwe', { be: 1.8, eu_expat: 2.5, tr: 0.3 }],
  ['wien', 'Favoriten', { tr: 1.5, ex_yu: 1.2 }], ['wien', 'Ottakring', { ex_yu: 1.4, tr: 1.2 }],
  ['wien', 'Brigittenau', { tr: 1.1, ex_yu: 1.2 }], ['wien', 'Floridsdorf', { at: 1.4 }],
  ['basel', 'Kleinbasel', { tr: 1.5, al: 1.4, it: 1.1, ch: 0.6 }], ['basel', 'Riehen', { ch: 1.8, de: 1.5, tr: 0.3 }],
  ['london', 'Haringey', { tr: 1.4, tr_zypern: 1.4, ku: 1.3 }], ['london', 'Enfield', { tr_zypern: 1.3, tr: 1.2 }],
  ['london', 'Hackney', { uk: 1.2, afr_west: 1.3, karib: 1.3 }],
  ['paterson', 'South Paterson', { tr: 1.8, ar_levante: 1.6 }], ['paterson', 'Paterson Eastside', { hisp: 1.8, afroam: 1.8 }],
  ['paterson', 'Clifton', { us: 1.6, pl: 2 }],
  ['strassburg', 'Hautepierre', { ar_maghreb: 1.6, tr: 1.2, fr: 0.6 }], ['strassburg', 'Cronenbourg', { tr: 1.4 }],
  ['strassburg', 'Neudorf', { fr: 1.4 }], ['strassburg', 'Bischheim', { tr: 1.3 }],
  ['kardschali', 'Dörfer', { tr_balkan: 1.4 }], ['kardschali', 'Zentrum', { bg: 1.4 }],
  ['dubai', 'Deira', { s_asien: 1.5 }], ['dubai', 'Al Nahda', { s_asien: 1.3, ph: 1.5 }],
  ['dubai', 'Al Barsha', { eu_expat: 2, tr: 1.3, ar_golf: 1.5 }], ['dubai', 'Jumeirah', { eu_expat: 1.5, tr: 1.5, ir: 1.5 }],
];
// Altersneigung je Stadtteil (Bauplan alter.ort_hinweise)
const ST_ALTER = [
  ['berlin', 'Neukölln', a => (a >= 18 && a <= 39 ? 1.3 : a >= 65 ? 0.7 : 1)], ['berlin', 'Marzahn', a => (a >= 60 ? 1.35 : 1)],
  ['leipzig', 'Grünau', a => (a >= 60 ? 1.4 : 1)], ['leipzig', 'Wurzen', a => (a >= 60 ? 1.4 : 1)],
  ['leipzig', 'Connewitz', a => (a >= 18 && a <= 34 ? 1.5 : a >= 65 ? 0.7 : 1)], ['leipzig', 'Neustadt', a => (a >= 18 && a <= 39 ? 1.4 : 1)],
  ['istanbul', 'Esenyurt', a => (a <= 34 ? 1.35 : a >= 60 ? 0.6 : 1)], ['istanbul', 'Kadıköy', a => (a >= 55 ? 1.35 : 1)],
  ['kayseri', 'Develi', a => (a >= 60 ? 1.4 : a >= 20 && a <= 39 ? 0.7 : 1)],
];
// Altersfaktoren je Ort (Bauplan alter.ort_hinweise); Diyarbakir juenger, Kardschali sehr alt
const ORT_ALTER_F = {
  diyarbakir: { '12-14': 4 / 3, '15-17': 4 / 3, '18-24': 4 / 3, '25-29': 4 / 3 },
  kardschali: { '25-29': 0.6, '30-34': 0.6, '35-39': 0.65, '40-44': 0.75, '60-64': 1.25, '65-69': 1.4, '70-74': 1.4, '75-79': 1.4, '80-84': 1.3, '85+': 1.2 },
};
// Haushaltskorrekturen (Bauplan haushalte.korrekturen.orte)
const HH_KORREKTUR = [
  ['berlin', '', { allein: 1.4 }], ['leipzig', '', { allein: 1.3 }], ['leipzig', 'Wurzen', { allein: 1.2 }],
  ['koeln', 'Lindenthal', { wg_sonstige: 2 }], ['diyarbakir', '', { mehrgenerationen: 1.6 }], ['kayseri', 'Develi', { mehrgenerationen: 1.5 }],
  ['istanbul', 'Kadıköy', { allein: 2, wg_sonstige: 2 }], ['istanbul', 'Bağcılar', { mehrgenerationen: 1.3 }], ['kardschali', '', { allein: 1.8 }],
];
// Lage fuer Schicht (+ eher wohlhabend, - eher knapp; Bauplan einkommen.schicht.orte und Stadtteilbeschreibungen)
const ST_LAGE = [
  ['koeln', 'Lindenthal', 1], ['basel', 'Riehen', 1], ['bruessel', 'Woluwe', 1], ['ankara', 'Çankaya', 1], ['istanbul', 'Kadıköy', 1],
  ['rotterdam', 'Kralingen', 1], ['dubai', 'Al Barsha', 1], ['dubai', 'Jumeirah', 0.6], ['paterson', 'Clifton', 0.5], ['izmir', 'Karşıyaka', 0.4],
  ['duisburg', 'Marxloh', -1], ['duisburg', 'Hochfeld', -1], ['koeln', 'Chorweiler', -1], ['leipzig', 'Grünau', -1], ['istanbul', 'Esenyurt', -1],
  ['diyarbakir', 'Bağlar', -1], ['bruessel', 'Saint-Josse', -1], ['strassburg', 'Hautepierre', -1], ['dubai', 'Deira', -1],
  ['berlin', 'Neukölln', -0.4], ['berlin', 'Marzahn', -0.4], ['istanbul', 'Bağcılar', -0.5], ['ankara', 'Mamak', -0.5],
  ['rotterdam', 'Feijenoord', -0.5], ['rotterdam', 'Charlois', -0.5], ['paterson', 'Paterson Eastside', -0.6], ['leipzig', 'Neustadt', -0.6],
  ['diyarbakir', 'Sur', -0.6], ['kardschali', 'Wazroschdenzi', -0.3], ['wien', 'Favoriten', -0.3], ['london', 'Haringey', -0.3],
];
const ST_RELIGIOES = [['istanbul', 'Bağcılar'], ['ankara', 'Keçiören'], ['kayseri', ''], ['diyarbakir', 'Bağlar'], ['duisburg', 'Marxloh']];
const ST_SAEKULAR = [['istanbul', 'Kadıköy'], ['izmir', 'Karşıyaka'], ['ankara', 'Çankaya'], ['leipzig', ''], ['rotterdam', 'Kralingen'], ['berlin', 'Marzahn']];
const ST_LAENDLICH = [['stuttgart', 'Schorndorf'], ['stuttgart', 'Dorf'], ['leipzig', 'Wurzen'], ['kayseri', 'Develi'], ['kardschali', 'Momtschilgrad'], ['kardschali', 'Dörfer']];
const ST_GYM_FAKTOR = [['duisburg', 'Marxloh', 0.5], ['koeln', 'Chorweiler', 0.5], ['duisburg', 'Hochfeld', 0.5], ['leipzig', 'Grünau', 0.5],
  ['koeln', 'Lindenthal', 1.4], ['duisburg', 'Neudorf', 1.4], ['leipzig', 'Connewitz', 1.4], ['basel', 'Riehen', 1.4]];
const GROSSSTADT = new Set(['berlin', 'istanbul', 'london', 'dubai', 'basel', 'rotterdam']);
const WETTER_ORTE = new Set(['kayseri', 'leipzig', 'dubai', 'diyarbakir']);
const TR_WURZELN = new Set(['tr', 'ku', 'tr_balkan', 'tr_zypern', 'ar_levante', 'ar_maghreb', 'af', 'al', 'roma']);
const TUERKISCHSPRACHIG = new Set(['tr', 'ku', 'tr_balkan', 'tr_zypern', 'kauk', 'minderheit_tr']);
const ARBEITSMIGRATION_AE = new Set(['s_asien', 'ph', 'afr_ost']);
const RASSISTISCH_MARKIERT = new Set(['tr', 'ku', 'tr_balkan', 'tr_zypern', 'ar_levante', 'ar_maghreb', 'ar_golf', 'af', 'afr_west', 'afr_zentral', 'afr_ost', 'afroam', 'hisp', 's_asien', 'roma', 'vn', 'ph', 'karib', 'ir', 'al', 'az', 'kauk']);

// Einwanderungswellen: Ankunftsjahre und Anteil der ersten Generation nach Alter (geschaetzt nach Bauplan alter.herkunft_korrektur)
const WELLEN = {
  gastarbeiter: { w: [[1961, 1973, 4], [1974, 1990, 3], [1991, 2010, 2], [2011, 2026, 1]], g1: [[70, 0.85], [55, 0.5], [40, 0.3], [25, 0.2], [18, 0.1], [0, 0.05]], g3: true },
  fluchtNeu: { w: [[2013, 2017, 6], [2018, 2026, 2], [1985, 2005, 1]], g1: [[18, 0.92], [12, 0.85], [0, 0.5]], g3: false },
  ukraine: { w: [[2022, 2025, 8], [2000, 2021, 1]], g1: [[0, 0.95]], g3: false },
  spaetaussiedler: { w: [[1988, 2005, 1]], g1: [[30, 0.9], [20, 0.3], [0, 0.05]], g3: false },
  eu_ost: { w: [[2007, 2024, 1]], g1: [[18, 0.85], [0, 0.6]], g3: false },
  alt_post: { w: [[1975, 1995, 3], [1996, 2026, 1]], g1: [[45, 0.85], [30, 0.5], [18, 0.2], [0, 0.05]], g3: true },
  expat: { w: [[2005, 2025, 1]], g1: [[18, 0.98], [0, 0.6]], g3: false },
  usmig: { w: [[1985, 2005, 2], [2006, 2024, 2]], g1: [[30, 0.75], [18, 0.45], [0, 0.15]], g3: true },
};
function welleFuer(h, land) {
  if (land === 'AE' || land === 'AZ' || land === 'BG') return 'expat';
  if (land === 'TR') return ['ar_levante', 'af'].includes(h) ? 'fluchtNeu' : 'expat';
  if (h === 'ua') return 'ukraine';
  if (['ar_levante', 'af', 'afr_ost'].includes(h)) return 'fluchtNeu';
  if (h === 'ru_de') return 'spaetaussiedler';
  if (['ro', 'bg', 'roma', 'tr_balkan'].includes(h)) return 'eu_ost';
  if (h === 'pl') return land === 'US' ? 'usmig' : 'eu_ost';
  if (['eu_expat', 'de'].includes(h)) return 'expat';
  if (land === 'US') return 'usmig';
  if (['vn', 'ir', 'afr_west', 'afr_zentral', 'karib', 'al', 's_asien', 'ph', 'ru'].includes(h)) return 'alt_post';
  return 'gastarbeiter';
}

// Studienfaecher (Name, Frauenanteil; geschaetzt)
const FAECHER = [['Informatik', 0.2], ['Wirtschaftsinformatik', 0.25], ['Maschinenbau', 0.15], ['Elektrotechnik', 0.15], ['Bauingenieurwesen', 0.3],
  ['Architektur', 0.55], ['BWL', 0.5], ['VWL', 0.4], ['Jura', 0.55], ['Medizin', 0.62], ['Zahnmedizin', 0.6], ['Pharmazie', 0.7], ['Pflegewissenschaft', 0.8],
  ['Psychologie', 0.75], ['Soziale Arbeit', 0.78], ['Lehramt', 0.7], ['Erziehungswissenschaft', 0.8], ['Germanistik', 0.75], ['Anglistik', 0.7],
  ['Geschichte', 0.45], ['Politikwissenschaft', 0.5], ['Soziologie', 0.65], ['Medien und Kommunikation', 0.62], ['Biologie', 0.62], ['Chemie', 0.45],
  ['Physik', 0.25], ['Mathematik', 0.45], ['Data Science', 0.3], ['Game Design', 0.3], ['Design', 0.7], ['Musik', 0.5], ['Sportwissenschaft', 0.4],
  ['Tourismus', 0.7], ['Internationale Beziehungen', 0.6], ['Islamische Theologie', 0.5], ['Ernährungswissenschaft', 0.85], ['Agrarwissenschaft', 0.4],
  ['Wirtschaftsingenieurwesen', 0.25], ['Logistik', 0.35]];

// Fantasiewoerter fuer erfundene Betriebsnamen je Sprache
const FANTASIE = {
  de: ['Lindenhöhe', 'Rosenhain', 'Kastanienhof', 'Sonnenhang', 'Mühlbach', 'Kranichfeld', 'Eichblatt', 'Weidengrund', 'Brückenblick', 'Morgenrot', 'Ahornweg', 'Nordlicht', 'Silberpappel', 'Wiesengrund', 'Hafenkante', 'Kiefernhain'],
  tr: ['Çınaraltı', 'Lalezar', 'Martı', 'Defne', 'Yıldızlı', 'Ege', 'Pınarbaşı', 'Doruk', 'Akasya', 'Nergis', 'Toros', 'Kardelen', 'Meltem', 'Gökkuşağı', 'Bereket', 'Zümrüt'],
  nl: ['De Linde', 'Maasblik', 'De Molen', 'Zuiderlicht', 'Havenzicht', 'De Brug', 'Waterkant', 'De Kade', 'Lindehof', 'Polderzicht'],
  fr: ['Les Tilleuls', 'Le Moulin', "L'Étoile", 'Les Saules', 'Le Pont', 'La Fontaine', 'Les Acacias', 'Le Phare', 'Les Glycines', 'Les Charmes'],
  en: ['Riverside', 'Oakfield', 'Bluebell', 'Kingsway', 'Greenway', 'Harbourside', 'Maplewood', 'Sterling', 'Brookside', 'Elmwood', 'Northgate', 'Lakeview', 'Willowbank', 'Cedarcrest'],
  bg: ['Rodopi', 'Arda', 'Izgrev', 'Zora', 'Yantra', 'Balkan', 'Elitsa', 'Kamelia'],
  az: ['Xəzər', 'Günəş', 'Nərgiz', 'Ulduz', 'Bahar', 'Dəniz', 'Odlar', 'Qala', 'Səhər', 'Lalə'],
};
const SPRACHE_LAND = { DE: 'de', AT: 'de', CH: 'de', TR: 'tr', NL: 'nl', BE: 'fr', FR: 'fr', GB: 'en', US: 'en', AE: 'en', BG: 'bg', AZ: 'az' };
// Betriebsarten: oeffentlich = Einrichtung ohne eigenen Namen; vorlagen je Sprache ({F} Fantasiewort, {N} Nachname)
const BETRIEB = {
  krankenhaus: { oeff: true, d: { de: 'Krankenhaus', tr: 'Devlet Hastanesi (staatliches Krankenhaus)', nl: 'ziekenhuis', fr: 'hôpital', en: 'hospital', bg: 'Krankenhaus', az: 'xəstəxana (Krankenhaus)' } },
  pflegeheim: { v: { de: ['Seniorenzentrum {F}', 'Pflegeheim Haus {F}'], tr: ['{F} Huzurevi'], nl: ['Zorgcentrum {F}'], fr: ['EHPAD {F}'], en: ['{F} Care Home'], bg: ['Dom za vazrastni {F}'], az: ['{F} Qocalar Evi'] } },
  pflegedienst: { v: { de: ['Pflegedienst {N}', 'Ambulante Pflege {F}'], tr: ['{F} Evde Bakım'], nl: ['Thuiszorg {F}'], fr: ['Soins à domicile {F}'], en: ['{F} Home Care'], bg: ['{F} Grizha'], az: ['{F} Evdə Qulluq'] } },
  praxis: { v: { de: ['Praxis {N}', 'Gemeinschaftspraxis am {F}'], tr: ['{F} Tıp Merkezi', '{F} Poliklinik'], nl: ['Praktijk {F}'], fr: ['Cabinet {N}'], en: ['{F} Medical Centre'], bg: ['Praktika {F}'], az: ['{F} Tibb Mərkəzi'] } },
  apotheke: { v: { de: ['{F}-Apotheke'], tr: ['{F} Eczanesi'], nl: ['Apotheek {F}'], fr: ['Pharmacie {F}'], en: ['{F} Pharmacy'], bg: ['Apteka {F}'], az: ['{F} Aptek'] } },
  kita: { v: { de: ['Kita {F}'], tr: ['{F} Anaokulu'], nl: ['Kinderopvang {F}'], fr: ['Crèche {F}'], en: ['{F} Nursery'], bg: ['Detska gradina {F}'], az: ['{F} Uşaq Bağçası'] } },
  traeger: { v: { de: ['Sozialwerk {F} e. V.', 'Jugendhilfe {F}'], tr: ['{F} Derneği'], nl: ['Stichting {F}'], fr: ['Association {F}'], en: ['{F} Community Trust'], bg: ['Fondatsiya {F}'], az: ['{F} İctimai Birliyi'] } },
  laden: { v: { de: ['Supermarkt am {F}', '{N} Markt'], tr: ['{N} Market', '{F} Süpermarket'], nl: ['Supermarkt {F}'], fr: ['Supermarché {F}'], en: ['{F} Supermarket', '{N} Stores'], bg: ['Magazin {F}'], az: ['{F} Market'] } },
  gastro: { v: { de: ['Restaurant {F}', 'Gasthaus {N}'], tr: ['{N} Lokantası', '{F} Restoran'], nl: ['Restaurant {F}'], fr: ['Restaurant {F}'], en: ['{F} Diner', '{F} Restaurant'], bg: ['Mehana {F}'], az: ['{F} Restoranı'] } },
  lebensmittel: { v: { de: ['{N} Feinkost', '{F} Backwaren'], tr: ['{F} Gıda'], nl: ['{F} Voedingsmiddelen'], fr: ['{F} Alimentaire'], en: ['{F} Foods'], bg: ['{F} Hrani'], az: ['{F} Qida'] } },
  logistik: { v: { de: ['{F} Logistik GmbH', 'Spedition {N}', 'Paketzentrum {F}'], tr: ['{F} Lojistik', '{F} Kargo'], nl: ['{F} Logistiek'], fr: ['{F} Logistique'], en: ['{F} Logistics'], bg: ['{F} Logistika'], az: ['{F} Logistika'] } },
  verkehr: { oeff: true, d: { de: 'städtischer Verkehrsbetrieb', tr: 'städtischer Verkehrsbetrieb', nl: 'städtischer Verkehrsbetrieb', fr: 'städtischer Verkehrsbetrieb', en: 'städtischer Verkehrsbetrieb', bg: 'städtischer Verkehrsbetrieb', az: 'städtischer Verkehrsbetrieb' } },
  baufirma: { v: { de: ['{N} Bau GmbH', 'Bauunternehmen {N}'], tr: ['{N} İnşaat'], nl: ['{N} Bouw'], fr: ['{N} Bâtiment'], en: ['{N} Builders'], bg: ['{F} Stroy'], az: ['{F} İnşaat'] } },
  handwerk: { v: { de: ['Handwerksbetrieb {N}', '{N} Werkstatt'], tr: ['{N} Atölyesi', 'Usta {N}'], nl: ['{N} Vakwerk'], fr: ['Atelier {N}'], en: ['{N} & Sons'], bg: ['{N} Remonti'], az: ['{N} Emalatxanası'] } },
  werkstatt: { v: { de: ['Autohaus {N}', 'Kfz-Werkstatt {N}'], tr: ['{N} Oto Servis'], nl: ['Garage {N}'], fr: ['Garage {N}'], en: ['{F} Motors'], bg: ['Avtoservis {F}'], az: ['{N} Avtoservis'] } },
  fabrik: { v: { de: ['{F}werk', '{N} Metallbau GmbH', '{F} Kunststofftechnik'], tr: ['{F} Tekstil', '{N} Makine', '{F} Plastik'], nl: ['{F} Industrie'], fr: ['Usine {F}'], en: ['{F} Manufacturing'], bg: ['{F} Zavod'], az: ['{F} Zavodu'] } },
  stadtwerke: { oeff: true, d: { de: 'Stadtwerke', tr: 'städtischer Versorgungsbetrieb', nl: 'städtischer Versorgungsbetrieb', fr: 'städtischer Versorgungsbetrieb', en: 'städtischer Versorgungsbetrieb', bg: 'städtischer Versorgungsbetrieb', az: 'Energieunternehmen' } },
  firma: { v: { de: ['{F} GmbH', '{N} & Partner', '{N} GmbH'], tr: ['{F} Ltd. Şti.', '{N} Ticaret', '{N} ve Ortakları'], nl: ['{F} B.V.'], fr: ['{F} SARL'], en: ['{F} Ltd', '{N} & Partners'], bg: ['{F} OOD'], az: ['{F} MMC'] } },
  kanzlei: { v: { de: ['Kanzlei {N}', 'Steuerbüro {N}'], tr: ['{N} Hukuk Bürosu', '{N} Mali Müşavirlik'], nl: ['Kantoor {N}'], fr: ['Cabinet {N}'], en: ['{N} Solicitors'], bg: ['Kantora {N}'], az: ['{N} Hüquq Bürosu'] } },
  gericht: { oeff: true, d: { de: 'Gericht', tr: 'Adliye (Gericht)', nl: 'Gericht', fr: 'Gericht', en: 'Gericht', bg: 'Gericht', az: 'Gericht' } },
  amt: { oeff: true, d: { de: 'öffentliche Verwaltung', tr: 'Belediye oder Behörde', nl: 'Gemeindeverwaltung', fr: 'Verwaltung', en: 'Council (Verwaltung)', bg: 'Gemeindeverwaltung', az: 'Behörde' } },
  polizei: { oeff: true, d: { de: 'Polizei', tr: 'Polizei (Emniyet)', nl: 'Polizei', fr: 'Polizei', en: 'Polizei', bg: 'Polizei', az: 'Polizei' } },
  feuerwehr: { oeff: true, d: { de: 'Berufsfeuerwehr', tr: 'İtfaiye', nl: 'Feuerwehr', fr: 'Feuerwehr', en: 'Feuerwehr', bg: 'Feuerwehr', az: 'Feuerwehr' } },
  armee: { oeff: true, d: { de: 'Streitkräfte', tr: 'Streitkräfte', nl: 'Streitkräfte', fr: 'Streitkräfte', en: 'Streitkräfte', bg: 'Streitkräfte', az: 'Streitkräfte' } },
  sicherheit: { v: { de: ['{F} Sicherheitsdienst'], tr: ['{F} Güvenlik'], nl: ['{F} Beveiliging'], fr: ['{F} Sécurité'], en: ['{F} Security'], bg: ['{F} Ohrana'], az: ['{F} Mühafizə'] } },
  salon: { v: { de: ['Salon {F}', '{N}s Barbershop'], tr: ['{F} Kuaför'], nl: ['Kapsalon {F}'], fr: ['Salon {F}'], en: ['{F} Hair Studio'], bg: ['Salon {F}'], az: ['{F} Gözəllik Salonu'] } },
  sport: { v: { de: ['Fitnessstudio {F}', 'Sportverein {F}'], tr: ['{F} Spor Salonu'], nl: ['Sportschool {F}'], fr: ['Salle de sport {F}'], en: ['{F} Gym'], bg: ['Fitness {F}'], az: ['{F} İdman Zalı'] } },
  reinigung: { v: { de: ['{N} Gebäudereinigung'], tr: ['{F} Temizlik'], nl: ['{F} Schoonmaak'], fr: ['{F} Nettoyage'], en: ['{F} Cleaning'], bg: ['{F} Pochistvane'], az: ['{F} Təmizlik'] } },
  hof: { v: { de: ['Hof {N}'], tr: ['{N} Çiftliği'], nl: ['Boerderij {N}'], fr: ['Ferme {N}'], en: ['{N} Farm'], bg: ['Stopanstvo {N}'], az: ['{N} Təsərrüfatı'] } },
  gemeinde: { oeff: true, d: { de: 'Religionsgemeinde', tr: 'Religionsgemeinde', nl: 'Religionsgemeinde', fr: 'Religionsgemeinde', en: 'Religionsgemeinde', bg: 'Religionsgemeinde', az: 'Religionsgemeinde' } },
  medien: { v: { de: ['{F} Media', 'Agentur {F}'], tr: ['{F} Medya', '{F} Ajans'], nl: ['{F} Media'], fr: ['Agence {F}'], en: ['{F} Media'], bg: ['{F} Media'], az: ['{F} Media'] } },
  schule: { oeff: true, d: {} },
  hochschule: { oeff: true, d: {} },
  privat: { privat: true },
  plattform: { privat: true },
};
// Unterarten fuer passende Betriebsnamen (Schneiderin arbeitet in einer Schneiderei, nicht im Malerbetrieb)
const BETRIEB_SUB = [
  [/Hotel|Zimmerreinigung|Rezeption/, 'hotel'], [/Imbiss|Döner|Kebap|Grill|Pizza/, 'imbiss'], [/Café|Barista/, 'cafe'], [/Teehaus|Kahvehane/, 'teehaus'],
  [/Hochzeitssaal|Düğün/, 'hochzeitssaal'], [/Shisha/, 'shisha'], [/Catering|Kantine/, 'catering'], [/Reise/, 'reisebuero'],
  [/Bäcker|Konditor|Simit|Baklava/, 'baeckerei'], [/Metzger|Fleischer/, 'metzgerei'], [/Mode|Boutique|Brautmode/, 'mode'],
  [/Handyladen|Elektronik- oder Handy|Handy- und Computer|Mobilfunk|Telekommunikation/, 'handy'], [/Drogerie/, 'drogerie'], [/Tankstelle/, 'tankstelle'],
  [/Florist/, 'blumen'], [/Buchhändler/, 'buch'], [/Möbel/, 'moebel'], [/Autohaus|Kfz-Teile|Gebrauchtwagen/, 'autohaus'],
  [/Maler/, 'maler'], [/Elektroniker für Energie|Elektro/, 'elektro'], [/Sanitär|Klima|Anlagenmechaniker/, 'haustechnik'],
  [/Tischler|Schreiner|Raumausstatter|Polster/, 'tischlerei'], [/Schneider/, 'schneiderei'], [/Goldschmied|Uhrmacher|Juwelier/, 'juwelier'],
  [/Bank|Kredit/, 'bank'], [/Versicherung/, 'versicherung'], [/Steuer|Wirtschaftsprüfer|Mali Müşavir/, 'steuerbuero'], [/Wechselstube/, 'wechselstube'],
  [/Fitness|Yoga|Pilates|Kampfsport|Tanz/, 'studio'], [/Halısaha|Kleinfeld/, 'halisaha'], [/Fußball|Sportverein|Halbprofi/, 'sportverein'], [/Bäderbetriebe|Bademeister/, 'bad'],
  [/Taxi|Fahrdienst|Dolmuş|Chauffeur|Servis|Schulbus/, 'fahrdienst'], [/Flug|Pilot|Bodenpersonal|Luftsicherheit/, 'flughafen'],
  [/Zug|Lokführer|Fahrkarten/, 'bahn'], [/Fähr|Kapitän|Schiffs/, 'reederei'], [/Friseur|Barbier|Barbershop|Herrenfriseur/, 'friseur'],
  [/Kosmetik|Nagel|Visagist/, 'kosmetik'], [/Software|App-|Frontend|DevOps|IT-|Daten|KI- und|Fachinformatiker|Systemadmin|UX/, 'it'],
  [/Ingenieur|Konstrukteur|Techniker|Produktdesigner/, 'ingenieurbuero'], [/Immobilien|Wohnanlage|Facility/, 'immobilien'],
  [/Bibliothekar|Archivar/, 'bibliothek'], [/Museum/, 'museum'], [/Influencer|Streamer|E-Sportler/, 'kanal'],
  [/Tätowierer/, 'tattoo'], [/Musiker|DJ|Nachhilfelehrer|Hochzeitsplaner|Wertstoffsammler|Spieleautor|Schausteller|Babysitter|Hundesitter/, 'freiberuflich'],
  [/Schauspieler/, 'theater'], [/Veranstaltungstechnik/, 'eventtechnik'], [/Fahrlehrer|Fahrschule/, 'fahrschule'],
  [/Kurszentrum|Dershane/, 'kurszentrum'], [/Volkshochschule|Sprachkurs|Integrationskurs/, 'sprachschule'], [/Musikschule/, 'musikschule'],
  [/Parkplatz/, 'parkplatz'], [/Detektiv/, 'detektei'], [/Spielhalle/, 'spielhalle'], [/Bestatter/, 'bestatter'],
];
const BETRIEB_SUB_NAMEN = {
  hotel: { de: ['Hotel {F}'], tr: ['{F} Otel'], en: ['{F} Hotel'], fr: ['Hôtel {F}'], nl: ['Hotel {F}'] },
  imbiss: { de: ['{N}s Imbiss', 'Kebabhaus {F}'], tr: ['{N} Kebap', '{N} Döner'], en: ["{N}'s Kebab House"], fr: ['Snack {N}'], nl: ['Snackbar {N}'] },
  cafe: { de: ['Café {F}'], tr: ['{F} Kafe'], en: ['{F} Coffee'], fr: ['Café {F}'], nl: ['Koffiehuis {F}'] },
  teehaus: { de: ['Teehaus {F}'], tr: ['{F} Kahvehanesi'], en: ['{F} Tea House'], fr: ['Salon de thé {F}'], nl: ['Theehuis {F}'], az: ['{F} Çayxanası'] },
  hochzeitssaal: { de: ['Festsaal {F}'], tr: ['{F} Düğün Salonu'], en: ['{F} Banqueting Hall'], fr: ['Salle des fêtes {F}'], nl: ['Feestzaal {F}'] },
  shisha: { de: ['Shisha-Lounge {F}'], tr: ['{F} Nargile Kafe'], en: ['{F} Shisha Lounge'], fr: ['Chicha Lounge {F}'], nl: ['Shishalounge {F}'] },
  catering: { de: ['Catering {N}'], tr: ['{N} Yemek'], en: ['{N} Catering'], fr: ['Traiteur {N}'], nl: ['Catering {N}'] },
  reisebuero: { de: ['Reisebüro {F}'], tr: ['{F} Turizm'], en: ['{F} Travel'], fr: ['Agence de voyages {F}'], nl: ['Reisbureau {F}'] },
  baeckerei: { de: ['Bäckerei {N}'], tr: ['{N} Fırını', '{F} Pastanesi'], en: ['{N} Bakery'], fr: ['Boulangerie {N}'], nl: ['Bakkerij {N}'] },
  metzgerei: { de: ['Metzgerei {N}'], tr: ['Kasap {N}'], en: ['{N} Butchers'], fr: ['Boucherie {N}'], nl: ['Slagerij {N}'] },
  mode: { de: ['Modehaus {F}'], tr: ['{F} Butik'], en: ['{F} Fashion'], fr: ['Boutique {F}'], nl: ['Modehuis {F}'] },
  handy: { de: ['Handyladen {F}'], tr: ['{F} İletişim'], en: ['{F} Mobile'], fr: ['{F} Téléphonie'], nl: ['{F} Telecom'] },
  drogerie: { de: ['Drogerie am {F}'], tr: ['{F} Kozmetik'], en: ['{F} Chemist'], fr: ['Droguerie {F}'], nl: ['Drogisterij {F}'] },
  tankstelle: { de: ['Tankstelle am {F}'], tr: ['{F} Akaryakıt'], en: ['{F} Service Station'], fr: ['Station {F}'], nl: ['Tankstation {F}'] },
  blumen: { de: ['Blumen {N}'], tr: ['{F} Çiçekçilik'], en: ['{N} Florist'], fr: ['Fleurs {N}'], nl: ['Bloemen {N}'] },
  buch: { de: ['Buchhandlung {F}'], tr: ['{F} Kitabevi'], en: ['{F} Books'], fr: ['Librairie {F}'], nl: ['Boekhandel {F}'] },
  moebel: { de: ['Möbelhaus {F}'], tr: ['{N} Mobilya'], en: ['{F} Furniture'], fr: ['Meubles {N}'], nl: ['Meubelhuis {F}'] },
  autohaus: { de: ['Autohaus {N}'], tr: ['{N} Otomotiv'], en: ['{F} Motors'], fr: ['Garage {N}'], nl: ['Autobedrijf {N}'] },
  maler: { de: ['Malerbetrieb {N}'], tr: ['{N} Boya'], en: ['{N} Decorators'], fr: ['Peinture {N}'], nl: ['Schildersbedrijf {N}'] },
  elektro: { de: ['Elektro {N}'], tr: ['{N} Elektrik'], en: ['{N} Electrical'], fr: ['Électricité {N}'], nl: ['Elektro {N}'] },
  haustechnik: { de: ['{N} Haustechnik'], tr: ['{N} Tesisat'], en: ['{N} Plumbing'], fr: ['{N} Plomberie'], nl: ['{N} Installatietechniek'] },
  tischlerei: { de: ['Tischlerei {N}'], tr: ['{N} Marangoz'], en: ['{N} Joinery'], fr: ['Menuiserie {N}'], nl: ['Timmerbedrijf {N}'] },
  schneiderei: { de: ['Änderungsschneiderei {N}'], tr: ['{N} Terzi'], en: ['{N} Tailors'], fr: ['Retouches {N}'], nl: ['Kleermakerij {N}'] },
  juwelier: { de: ['Juwelier {N}'], tr: ['{N} Kuyumculuk'], en: ['{N} Jewellers'], fr: ['Bijouterie {N}'], nl: ['Juwelier {N}'] },
  bank: { oeff: true, d: 'Bankfiliale' },
  versicherung: { de: ['Versicherungsagentur {N}'], tr: ['{N} Sigorta'], en: ['{N} Insurance'], fr: ['Assurances {N}'], nl: ['Verzekeringen {N}'] },
  steuerbuero: { de: ['Steuerbüro {N}'], tr: ['{N} Mali Müşavirlik'], en: ['{N} Accountants'], fr: ['Cabinet comptable {N}'], nl: ['Administratiekantoor {N}'] },
  wechselstube: { de: ['Wechselstube {F}'], tr: ['{F} Döviz'], en: ['{F} Exchange'], fr: ['Change {F}'], nl: ['Wisselkantoor {F}'] },
  studio: { de: ['Fitnessstudio {F}'], tr: ['{F} Spor Salonu'], en: ['{F} Gym'], fr: ['Salle de sport {F}'], nl: ['Sportschool {F}'] },
  sportverein: { de: ['Sportverein {F}'], tr: ['{F} Spor Kulübü'], en: ['{F} Football Club'], fr: ['Club sportif {F}'], nl: ['Sportvereniging {F}'] },
  bad: { oeff: true, d: 'städtisches Schwimmbad' },
  fahrdienst: { de: ['Taxiunternehmen {N}', 'Fahrdienst {N}'], tr: ['{N} Turizm (Servis)', '{F} Taksi'], en: ['{F} Cars'], fr: ['Taxis {N}'], nl: ['Taxibedrijf {N}'] },
  flughafen: { oeff: true, d: 'Flughafen' },
  bahn: { oeff: true, d: 'Bahngesellschaft' },
  reederei: { de: ['Reederei {F}'], tr: ['{F} Denizcilik'], en: ['{F} Shipping'], fr: ['Compagnie maritime {F}'], nl: ['Rederij {F}'] },
  friseur: { de: ['Salon {F}', '{N}s Barbershop'], tr: ['{F} Kuaför', 'Berber {N}'], en: ['{F} Hair Studio'], fr: ['Salon {F}'], nl: ['Kapsalon {F}'] },
  kosmetik: { de: ['Kosmetikstudio {F}'], tr: ['{F} Güzellik Salonu'], en: ['{F} Beauty'], fr: ['Institut {F}'], nl: ['Schoonheidssalon {F}'] },
  it: { de: ['{F} Software', '{F} IT-Service'], tr: ['{F} Yazılım', '{F} Bilişim'], en: ['{F} Software'], fr: ['{F} Informatique'], nl: ['{F} Software'] },
  ingenieurbuero: { de: ['Ingenieurbüro {N}', '{F} Engineering'], tr: ['{N} Mühendislik'], en: ['{F} Engineering'], fr: ['Bureau d\'études {F}'], nl: ['Ingenieursbureau {F}'] },
  immobilien: { de: ['Immobilien {N}', 'Hausverwaltung {F}'], tr: ['{F} Emlak', '{F} Site Yönetimi'], en: ['{F} Property'], fr: ['Immobilier {N}'], nl: ['Makelaardij {N}'] },
  bibliothek: { oeff: true, d: 'öffentliche Bibliothek' },
  museum: { oeff: true, d: 'Museum' },
  kanal: { oeff: true, d: 'eigener Kanal (Instagram, TikTok, YouTube oder Twitch)', ohneOrt: true },
  freiberuflich: { oeff: true, d: 'freiberuflich, wechselnde Auftraggeber', ohneOrt: true },
  halisaha: { de: ['Kleinfeldplatz {F}'], tr: ['{F} Halısaha'], en: ['{F} Five-a-side'], fr: ['Foot à cinq {F}'], nl: ['Kooiveld {F}'] },
  tattoo: { de: ['Tattoo-Studio {F}'], tr: ['{F} Dövme Stüdyosu'], en: ['{F} Tattoo'], fr: ['Tatouage {F}'], nl: ['Tattooshop {F}'] },
  theater: { oeff: true, d: 'Theater' },
  eventtechnik: { de: ['Veranstaltungstechnik {N}'], tr: ['{F} Organizasyon'], en: ['{F} Event Services'], fr: ['{F} Événements'], nl: ['{F} Evenementen'] },
  fahrschule: { de: ['Fahrschule {N}'], tr: ['{F} Sürücü Kursu'], en: ['{F} Driving School'], fr: ['Auto-école {F}'], nl: ['Rijschool {N}'] },
  kurszentrum: { de: ['Lernzentrum {F}'], tr: ['{F} Etüt Merkezi', '{F} Dershanesi'], en: ['{F} Tutoring'], fr: ['Centre de soutien {F}'], nl: ['Huiswerkinstituut {F}'] },
  sprachschule: { de: ['Sprachschule {F}'], tr: ['{F} Dil Okulu'], en: ['{F} Language School'], fr: ['École de langues {F}'], nl: ['Taleninstituut {F}'] },
  musikschule: { de: ['Musikschule {F}'], tr: ['{F} Müzik Kursu'], en: ['{F} Music School'], fr: ['École de musique {F}'], nl: ['Muziekschool {F}'] },
  parkplatz: { de: ['Parkhaus am {F}'], tr: ['{F} Otopark'], en: ['{F} Car Park'], fr: ['Parking {F}'], nl: ['Parkeergarage {F}'] },
  detektei: { de: ['Detektei {N}'], tr: ['{N} Dedektiflik'], en: ['{N} Investigations'], fr: ['Agence {N}'], nl: ['Recherchebureau {N}'] },
  spielhalle: { de: ['Spielhalle {F}'], tr: ['{F} Oyun Salonu'], en: ['{F} Arcade'], fr: ['Salle de jeux {F}'], nl: ['Speelhal {F}'] },
  bestatter: { de: ['Bestattungen {N}'], tr: ['{F} Cenaze Hizmetleri'], en: ['{N} Funeral Services'], fr: ['Pompes funèbres {N}'], nl: ['Uitvaartzorg {N}'] },
};
// Streitkraefte je Land (echte oeffentliche Einrichtungen, keine erfundenen Firmen)
const ARMEE = { DE: 'Bundeswehr', AT: 'Bundesheer', CH: 'Schweizer Armee', TR: 'Türkische Streitkräfte', NL: 'niederländische Streitkräfte', BE: 'belgische Streitkräfte', FR: 'französische Streitkräfte', GB: 'britische Streitkräfte', US: 'US-Streitkräfte', BG: 'bulgarische Streitkräfte', AE: 'Streitkräfte der VAE', AZ: 'aserbaidschanische Streitkräfte' };
function betriebsSub(j) { for (const [re, k] of BETRIEB_SUB) if (re.test(j.titel)) return k; return null; }
function betriebsArt(j) {
  const t = j.titel, b = j.branche;
  if (b === 'plattform') return 'plattform';
  if (b === 'haushalt') return 'privat';
  if (/Krankenhaus|Assistenzärzt|Fachärzt|Hebamme|Operationstechn|Radiologie|im Labor|Notfallsan|Rettungssan|Pflegedienstleitung|Patientenbegleiter|Healthcare Assistant/.test(t)) return 'krankenhaus';
  if (/Altenpflege|Pflegehelfer|Betreuungskraft/.test(t)) return 'pflegeheim';
  if (/Home Health|24-Stunden|ambulanten Pflegedienst/.test(t)) return 'pflegedienst';
  if (/Apothek|Pharmazeutisch/.test(t)) return 'apotheke';
  if (b === 'gesundheit') return /Augenoptik|Hörakustik|Zahntechnik|Orthopädietechnik/.test(t) ? 'handwerk' : 'praxis';
  if (/Kita|Erzieher|Kinderpfleger|Tagesmutter/.test(t)) return 'kita';
  if (b === 'soziales') return 'traeger';
  if (/Grundschullehr|weiterführenden Schule|Gymnasiallehr|Förderschullehr|Lehramtsanwärter|Schulleiter|Schulsekretär|Unterrichtsassistent|Schulsozialarbeit|Schulbegleiter|Berufsschullehr/.test(t)) return 'schule';
  if (/Professor|Wissenschaftliche|Doktorand/.test(t)) return 'hochschule';
  if (b === 'bildung') return 'traeger';
  if (b === 'handel') return 'laden';
  if (b === 'gastro') return 'gastro';
  if (b === 'lebensmittel') return 'lebensmittel';
  if (b === 'logistik') return 'logistik';
  if (b === 'verkehr') return 'verkehr';
  if (b === 'bau') return 'baufirma';
  if (b === 'handwerk') return 'handwerk';
  if (b === 'kfz') return 'werkstatt';
  if (b === 'industrie') return 'fabrik';
  if (b === 'energie') return 'stadtwerke';
  if (b === 'recht') return /Richter|Staatsanwalt|Justiz|Gerichtsvollzieher/.test(t) ? 'gericht' : 'kanzlei';
  if (b === 'oeffentlich') {
    if (/Polizist|Ordnungsamt|Zabıta/.test(t)) return 'polizei';
    if (/Feuerwehr/.test(t)) return 'feuerwehr';
    if (/soldat|Soldat|Offizier|Uzman/.test(t)) return 'armee';
    if (/Sicherheit|Türsteher|Nachtwächter/.test(t)) return 'sicherheit';
    return 'amt';
  }
  if (b === 'beauty') return 'salon';
  if (b === 'sport') return 'sport';
  if (b === 'reinigung') return 'reinigung';
  if (b === 'landwirtschaft') return 'hof';
  if (b === 'religion') return 'gemeinde';
  if (b === 'medien' || b === 'kunst') return 'medien';
  return 'firma';
}

// ------------------------------------------------------------------------------------------------
// Erzeugung
// ------------------------------------------------------------------------------------------------
export function erzeugeWelt(B, SEED = STANDARD_SEED) {
  const Z = stufe => new Zufall(SEED, stufe);
  const ORTE = B.orte;
  const ORT = Object.fromEntries(ORTE.map(o => [o.id, o]));
  const HK = Object.fromEntries(B.herkunft.gruppen.map(g => [g.code, g]));
  const AL = B.alter.je_land;
  const LAENDER = [...new Set(ORTE.map(o => o.land))];
  const KATALOG = B.taetigkeiten.katalog.map((j, i) => ({ ...j, nr: i, sb: STUFE_BILDUNG[j.bildung] }));
  const istEinheimisch = (h, land) => (EINHEIMISCH[land] || []).includes(h);
  const stTreffer = (tab, oid, stName) => tab.filter(([o, pre]) => o === oid && beginntMit(stName, pre));
  const istLaendlich = (oid, st) => stTreffer(ST_LAENDLICH, oid, st).length > 0;
  const geburtsjahr = a => JAHR - a;

  // ---------- Altersziele je Ort ----------
  function einheimAnteil(o) {
    let s = 0;
    for (const [h, w] of Object.entries(o.herkunft)) if (istEinheimisch(h, o.land)) s += w;
    return s / summe(Object.values(o.herkunft));
  }
  function ortBasis(o, migrant) {
    const j = AL[o.land];
    if (j.zielverteilung === 'welt_mischung') {
      if (migrant === true) return j.welt_mit_einwanderung;
      if (migrant === false) return j.welt;
      const e = einheimAnteil(o); const r = {};
      for (const b of BAENDER) r[b] = e * j.welt[b] + (1 - e) * j.welt_mit_einwanderung[b];
      return r;
    }
    return j.welt;
  }
  const ortF = (oid, b) => (ORT_ALTER_F[oid] && ORT_ALTER_F[oid][b]) || 1;
  const ZIEL_ALTER = {};
  for (const land of LAENDER) {
    const os = ORTE.filter(o => o.land === land);
    const T = {};
    // Kleine Orte (unter 40 Figuren) verfehlen die Minderjaehrigen sonst systematisch um etwa eine Figur (grobe Haushalte);
    // ihr Zielanteil 12-17 wird deshalb um 30 % angehoben, damit die Welt insgesamt 12-15 % Minderjaehrige erreicht.
    const kleinF = summe(os.map(o => o.figuren)) < 40 ? 1.3 : 1;
    for (const o of os) {
      const basis = ortBasis(o);
      const roh = {}; for (const b of BAENDER) roh[b] = basis[b] * ortF(o.id, b) * (b === '12-14' || b === '15-17' ? kleinF : 1);
      const n = normiere(roh);
      T[o.id] = {}; for (const b of BAENDER) T[o.id][b] = n[b] * o.figuren;
    }
    if (os.length > 1) {
      const lz = AL[land][AL[land].zielverteilung]; const NL = summe(os.map(o => o.figuren)); const sl = summe(BAENDER.map(b => lz[b]));
      for (let it = 0; it < 60; it++) {
        for (const b of BAENDER) { const s = summe(os.map(o => T[o.id][b])); const f = (lz[b] / sl) * NL / s; for (const o of os) T[o.id][b] *= f; }
        for (const o of os) { const s = summe(BAENDER.map(b => T[o.id][b])); for (const b of BAENDER) T[o.id][b] *= o.figuren / s; }
      }
    }
    Object.assign(ZIEL_ALTER, T);
  }
  const ZIEL_HK = {};
  for (const o of ORTE) { const n = normiere(o.herkunft); ZIEL_HK[o.id] = {}; for (const [h, w] of Object.entries(n)) ZIEL_HK[o.id][h] = w * o.figuren; }
  // Zielanteile der Haushaltsformen unter den Figuren (ab 12): Personenanteile des Bauplans, Familienformen ohne Kinder unter 12
  const HH_ARTEN = ['allein', 'paar_ohne_kinder', 'paar_mit_kindern', 'alleinerziehend', 'mehrgenerationen', 'wg_sonstige'];
  const FIG_QUOTE = { allein: 1, paar_ohne_kinder: 1, paar_mit_kindern: 0.72, alleinerziehend: 0.72, mehrgenerationen: 0.75, wg_sonstige: 1 };
  const AE_ARTEN = {
    ar_golf: { paar_mit_kindern: 0.6, mehrgenerationen: 0.35, paar_ohne_kinder: 0.04, allein: 0.01 },
    labor: { wg_sonstige: 0.72, paar_mit_kindern: 0.2, paar_ohne_kinder: 0.06, allein: 0.02 },
    ar_levante: { wg_sonstige: 0.3, paar_mit_kindern: 0.52, paar_ohne_kinder: 0.12, allein: 0.06 },
    andere: { paar_mit_kindern: 0.55, paar_ohne_kinder: 0.18, allein: 0.08, wg_sonstige: 0.15, alleinerziehend: 0.04 },
  };
  function artAnteile(land, oid, stName, h) {
    if (land === 'AE') return AE_ARTEN[h === 'ar_golf' ? 'ar_golf' : ARBEITSMIGRATION_AE.has(h) ? 'labor' : h === 'ar_levante' ? 'ar_levante' : 'andere'];
    const p = { ...ohneMeta(B.haushalte.personen_anteile_je_land[land]) };
    if (WESTEN.has(land) && TR_WURZELN.has(h)) { p.allein *= 0.5; p.paar_mit_kindern *= 1.25; p.mehrgenerationen *= 4; }
    for (const [o2, pre, f] of HH_KORREKTUR) if (o2 === oid && (stName === null ? !pre : beginntMit(stName, pre))) for (const [k, v] of Object.entries(f)) p[k] *= v;
    return normiere(p);
  }
  const ZIEL_TYP = {};
  for (const o of ORTE) {
    const mix = normiere(o.herkunft); const r = Object.fromEntries(HH_ARTEN.map(t => [t, 0]));
    for (const [h, w] of Object.entries(mix)) { const a = artAnteile(o.land, o.id, null, h); for (const t of HH_ARTEN) r[t] += w * (a[t] || 0) * FIG_QUOTE[t]; }
    const n = normiere(r); ZIEL_TYP[o.id] = Object.fromEntries(HH_ARTEN.map(t => [t, n[t] * o.figuren]));
  }
  const grp4 = a => (a <= 17 ? 0 : a <= 39 ? 1 : a <= 64 ? 2 : 3);
  const ZIEL_FRAUEN = {};
  for (const o of ORTE) {
    const fa = AL[o.land].frauenanteil; const ziel = ZIEL_ALTER[o.id];
    const s = [0, 0, 0, 0], n = [0, 0, 0, 0];
    for (const b of BAENDER) { const a = b === '85+' ? 85 : Number(b.split('-')[0]); const g = grp4(a); s[g] += ziel[b] * fa[b]; n[g] += ziel[b]; }
    ZIEL_FRAUEN[o.id] = s.map((x, i) => (n[i] > 0 ? x / n[i] : 0.5));
  }

  // ---------- Altersziehung im Haushalt ----------
  const jahrAbfall = a => Math.pow(0.8, a - 85);
  const BREITE85 = summe(Array.from({ length: 15 }, (_, i) => jahrAbfall(85 + i)));
  const jahrCache = new Map();
  function jahrTabelle(ctx) {
    const key = ctx.o.id + '|' + ctx.st.name + '|' + (ctx.migrant ? 1 : 0);
    if (jahrCache.has(key)) return jahrCache.get(key);
    const basis = ortBasis(ctx.o, ctx.migrant);
    const tilts = stTreffer(ST_ALTER, ctx.o.id, ctx.st.name).map(x => x[2]);
    const tab = [];
    for (let a = 12; a <= 99; a++) {
      const b = band(a);
      const breite = b === '85+' ? BREITE85 : (b === '12-14' || b === '15-17') ? 3 : b === '18-24' ? 7 : 5;
      let w = basis[b] * ortF(ctx.o.id, b) / breite * (a >= 85 ? jahrAbfall(a) : 1);
      for (const t of tilts) w *= t(a);
      tab[a] = w;
    }
    jahrCache.set(key, tab);
    return tab;
  }
  function zieheAlter(ctx, z, lo, hi, prop) {
    const tab = jahrTabelle(ctx); const e = [];
    for (let a = Math.max(12, lo); a <= hi; a++) { const w = (tab[a] || 0) * prop(a); if (w > 0) e.push([a, w]); }
    return e.length ? z.gewichtet(e) : z.ganz(lo, hi);
  }
  function geschlechtFuer(ctx, a, z, frauenFaktor = 1) {
    const fa = AL[ctx.land].frauenanteil[band(a)] ?? 0.5;
    const f = fa * frauenFaktor;
    return z.chance(f / (f + (1 - fa))) ? 'w' : 'm';
  }

  // ---------- Haushaltsbausteine ----------
  function person(rolle, alter, g, herkunft) {
    return { rolle, alter, geschlecht: g, herkunft: [...new Set(herkunft)], gen: null, seit: null, partner: null, partnerArt: null, eltern: [], kinder: [], familienstand: null, hh: null, info: {} };
  }
  function verbindeEltern(kind, eltern) { for (const e of eltern) if (e) { kind.eltern.push(e); e.kinder.push(kind); } }
  function paar(a, b, art) { a.partner = b; b.partner = a; a.partnerArt = b.partnerArt = art; a.familienstand = b.familienstand = art; }
  const kindHerkunft = (vater, mutter) => [...new Set([vater ? vater.herkunft[0] : null, mutter ? mutter.herkunft[0] : null].filter(Boolean))];
  function partnerHerkunft(ctx, z) {
    const gleich = ctx.trad ? 0.9 : istEinheimisch(ctx.h, ctx.land) ? 0.88 : 0.8;
    if (z.chance(gleich)) return ctx.h;
    const e = Object.entries(normiere(ctx.o.herkunft)).filter(([h]) => h !== ctx.h);
    return e.length ? z.gewichtet(e) : ctx.h;
  }
  function kinderzahlGruppe(ctx) {
    const { land, o, h } = ctx;
    if (land === 'TR') return o.id === 'diyarbakir' ? 'TR_suedosten' : 'TR';
    if (land === 'AE') return h === 'ar_golf' ? 'AE_emiratisch' : (ARBEITSMIGRATION_AE.has(h) || h === 'ar_levante') ? 'TR' : 'NL_BE_FR_GB_US';
    if (land === 'BG') return 'BG';
    if (land === 'AZ') return 'AZ';
    if (ctx.migrant) return 'DE_mit_einwanderungsgeschichte';
    if (land === 'DE') return 'DE';
    if (land === 'AT' || land === 'CH') return 'AT_CH';
    return 'NL_BE_FR_GB_US';
  }
  function zieheKinderzahl(ctx, z, mind1) {
    const d = { ...B.haushalte.kinderzahl.abgeschlossen_frauen_45_54[kinderzahlGruppe(ctx)] };
    if (mind1) delete d['0'];
    const k = z.gewichtet(d);
    return k === '4+' ? z.gewichtet([[4, 0.6], [5, 0.25], [6, 0.15]]) : Number(k);
  }
  function mutterAlterBeiGeburt(ctx, z) {
    const tab = B.haushalte.eltern_kind_abstand.alter_der_mutter_bei_geburt;
    const key = ctx.land === 'TR' ? (ctx.o.id === 'diyarbakir' ? 'TR_suedosten' : 'TR') : (ctx.land === 'AZ' || ctx.land === 'AE' || ctx.trad) ? 'TR' : 'DE';
    const k = z.gewichtet(ohneMeta(tab[key]));
    const r = { 'unter 20': [17, 19], '20-24': [20, 24], '25-29': [25, 29], '30-34': [30, 34], '35-39': [35, 39], '40+': [40, 44] }[k] || [25, 32];
    return z.ganz(r[0], r[1]);
  }
  function erzeugeKinder(ctx, z, mutterAlter, mind1) {
    const k = zieheKinderzahl(ctx, z, mind1);
    if (!k) return [];
    let a = mutterAlterBeiGeburt(ctx, z);
    if (k >= 3) a = Math.max(17, a - z.ganz(1, 4));
    const geb = [a];
    for (let i = 1; i < k; i++) {
      const r = { '1-2': [1, 2], '3-4': [3, 4], '5-7': [5, 7], '8+': [8, 11] }[z.gewichtet(ohneMeta(B.haushalte.eltern_kind_abstand.geschwisterabstand_jahre))];
      a += z.ganz(r[0], r[1]);
      if (a > 46) break;
      geb.push(a);
    }
    return geb.filter(g => g <= mutterAlter).map(g => ({ alter: mutterAlter - g, geschlecht: z.chance(0.512) ? 'm' : 'w' }));
  }
  function kindZuHause(ctx, alter, g, z) {
    if (alter < 18) return true;
    const p = ctx.trad ? (alter <= 24 ? 0.88 : alter <= 29 ? (g === 'w' ? 0.5 : 0.65) : alter <= 34 ? 0.22 : 0.05)
      : (alter <= 20 ? 0.75 : alter <= 24 ? 0.42 : alter <= 29 ? 0.14 : 0.04);
    return z.chance(p);
  }
  function partnerAbstand(ctx, z) {
    const tab = ohneMeta(B.haushalte.partner_altersabstand[ctx.trad ? 'TR' : 'DE']);
    const r = { '-4_und_weniger': [-9, -4], '-3_bis_-1': [-3, -1], '0_bis_3': [0, 3], '4_bis_7': [4, 7], '8_und_mehr': [8, 15] }[z.gewichtet(tab)];
    return z.ganz(r[0], r[1]);
  }
  function verheiratetQuote(ctx, alter, mitKindern) {
    const E = B.haushalte.ehe_und_partnerschaft;
    const key = (ctx.land === 'TR' || ctx.land === 'AZ' || ctx.land === 'AE') ? 'TR' : 'DE';
    let b = band(Math.max(18, alter)); if (b === '12-14' || b === '15-17') b = '18-24';
    let v = E[key].verheiratet[b] ?? 0.5, u = E[key].zusammenlebend_unverheiratet[b] ?? 0.05;
    if (['NL', 'BE', 'FR'].includes(ctx.land)) { u *= 1.5; v *= 0.85; }
    if (ctx.land === 'BG') u *= 2;
    if (ctx.trad) u *= 0.15;
    let q = v / (v + u);
    if (mitKindern) q = 1 - (1 - q) * 0.6;
    return q;
  }
  const vaterOk = (vAlter, kAlter) => vAlter - kAlter >= 17 && vAlter - kAlter <= 60;
  function alleinNeigung(ctx, a) {
    if (ctx.land === 'AE') return 0.3;
    if (WESTEN.has(ctx.land) && !ctx.trad) return a < 20 ? 0.05 : a < 25 ? 0.6 : a < 35 ? 0.8 : a < 55 ? 0.45 : a < 65 ? 0.55 : a < 75 ? 0.7 : a < 85 ? 1 : 1.1;
    return a < 22 ? 0.03 : a < 30 ? 0.12 : a < 45 ? 0.1 : a < 55 ? 0.15 : a < 65 ? 0.35 : a < 75 ? 0.7 : 1;
  }
  function paarOhneNeigung(ctx, a) {
    if (WESTEN.has(ctx.land) && !ctx.trad) return a < 22 ? 0.15 : a < 30 ? 0.6 : a < 35 ? 0.5 : a < 45 ? 0.2 : a < 50 ? 0.35 : a < 55 ? 0.7 : a < 75 ? 1 : a < 85 ? 0.8 : 0.4;
    return a < 22 ? 0.25 : a < 30 ? 0.3 : a < 45 ? 0.06 : a < 50 ? 0.15 : a < 55 ? 0.4 : a < 75 ? 1 : a < 85 ? 0.7 : 0.35;
  }
  // Muetter mit Teenagern bewusst haeufiger: Der Bauplan hebt die Minderjaehrigen um den Faktor 1,66 an
  const paarMitNeigung = a => (a < 25 ? 0.35 : a < 30 ? 0.7 : a < 38 ? 0.85 : a < 53 ? 1.7 : a < 58 ? 0.6 : 0.15);
  const alleinerzNeigung = a => (a < 25 ? 0.35 : a < 38 ? 0.8 : a < 53 ? 1.6 : a < 58 ? 0.5 : 0.2);
  function famStandAllein(ctx, a, z) {
    if (a < 30) return z.gewichtet({ ledig: 0.95, geschieden: 0.03, 'getrennt lebend': 0.02 });
    if (a < 50) return z.gewichtet(ctx.trad ? { ledig: 0.45, geschieden: 0.4, 'getrennt lebend': 0.08, verwitwet: 0.07 } : { ledig: 0.6, geschieden: 0.3, 'getrennt lebend': 0.07, verwitwet: 0.03 });
    if (a < 65) return z.gewichtet({ ledig: 0.28, geschieden: 0.4, verwitwet: 0.27, 'getrennt lebend': 0.05 });
    return z.gewichtet(ctx.trad ? { verwitwet: 0.75, geschieden: 0.15, ledig: 0.1 } : { verwitwet: 0.6, geschieden: 0.2, ledig: 0.2 });
  }

  function hhAllein(ctx, z) {
    const a = zieheAlter(ctx, z, 18, 99, x => alleinNeigung(ctx, x));
    const g = geschlechtFuer(ctx, a, z, a >= 65 ? 1.5 : 1);
    const p = person('kopf', a, g, [ctx.h]);
    p.familienstand = famStandAllein(ctx, a, z);
    const hh = { art: 'allein', mitglieder: [p], wegGezogen: [], hinweis: '' };
    if (a >= 85 && z.chance(0.15)) hh.hinweis = 'lebt in einem Pflegeheim oder im betreuten Wohnen';
    if (p.familienstand !== 'ledig' && a >= 28) {
      const mAlter = g === 'w' ? a : a - z.ganz(0, 4);
      if (mAlter >= 18) {
        for (const k of erzeugeKinder(ctx, z, mAlter, false)) {
          if (g === 'm' && !vaterOk(a, k.alter)) continue;
          if (k.alter >= 18) hh.wegGezogen.push({ ...k, eltern: [p] });
          else if (['geschieden', 'getrennt lebend'].includes(p.familienstand)) {
            // minderjaehrige Kinder leben beim anderen Elternteil (nur Angabe)
            if (k.alter < 12) (p.info.kleineKinderExtern ||= []).push(k.alter);
            else p.info.kinderAusserhalb = (p.info.kinderAusserhalb || 0) + 1;
            p.info.kinderNotiz = 'Kinder leben beim anderen Elternteil';
          }
        }
      }
    }
    return hh;
  }
  function hhPaarOhne(ctx, z) {
    const gleich = WESTEN.has(ctx.land) && !ctx.trad && z.chance(0.025);
    const aW = zieheAlter(ctx, z, 19, 96, x => paarOhneNeigung(ctx, x));
    let g1 = 'w', g2 = 'm', a2;
    if (gleich) { g1 = g2 = z.chance(0.5) ? 'w' : 'm'; a2 = klemme(aW + z.ganz(-6, 6), 19, 98); }
    else { a2 = aW + partnerAbstand(ctx, z); if (a2 < 18 || a2 > 99) return null; }
    const p1 = person('kopf', aW, g1, [ctx.h]);
    const p2 = person('partner', a2, g2, [partnerHerkunft(ctx, z)]);
    paar(p1, p2, z.chance(verheiratetQuote(ctx, Math.max(aW, a2), false)) ? 'verheiratet' : 'zusammenlebend');
    const hh = { art: 'paar_ohne_kinder', mitglieder: [p1, p2], wegGezogen: [], hinweis: gleich ? 'gleichgeschlechtliches Paar' : '' };
    if (gleich) { p1.info.queer = 'offen'; p2.info.queer = 'offen'; }
    if (!gleich && aW >= 38) {
      for (const k of erzeugeKinder(ctx, z, aW, false)) if (k.alter >= 18 && vaterOk(a2, k.alter)) hh.wegGezogen.push({ ...k, eltern: [p1, p2] });
    }
    return hh;
  }
  function hhPaarMit(ctx, z) {
    for (let v = 0; v < 4; v++) {
      const aW = zieheAlter(ctx, z, 20, 64, paarMitNeigung);
      const kinder = erzeugeKinder(ctx, z, aW, true);
      const zuhause = [], weg = [];
      for (const k of kinder) (kindZuHause(ctx, k.alter, k.geschlecht, z) ? zuhause : weg).push(k);
      if (!zuhause.length) continue;
      let aM = null;
      for (let t = 0; t < 8; t++) { const x = aW + partnerAbstand(ctx, z); if (x >= 18 && x <= 99 && kinder.every(k => vaterOk(x, k.alter))) { aM = x; break; } }
      if (aM === null) continue;
      const w = person('kopf', aW, 'w', [ctx.h]);
      const m = person('partner', aM, 'm', [partnerHerkunft(ctx, z)]);
      if (z.chance(0.5)) { w.rolle = 'partner'; m.rolle = 'kopf'; }
      paar(w, m, z.chance(verheiratetQuote(ctx, Math.max(aW, aM), true)) ? 'verheiratet' : 'zusammenlebend');
      const hh = { art: 'paar_mit_kindern', mitglieder: [w, m], wegGezogen: [], hinweis: '' };
      for (const k of zuhause) { const c = person('kind', k.alter, k.geschlecht, kindHerkunft(m, w)); verbindeEltern(c, [w, m]); hh.mitglieder.push(c); }
      for (const k of weg) hh.wegGezogen.push({ ...k, eltern: [w, m] });
      return hh;
    }
    return null;
  }
  function hhAlleinerziehend(ctx, z) {
    for (let v = 0; v < 4; v++) {
      const vater = z.chance(ctx.land === 'TR' ? 0.1 : 0.15);
      const aP = zieheAlter(ctx, z, 19, 66, alleinerzNeigung);
      const mAlter = vater ? aP - z.ganz(0, 4) : aP;
      if (mAlter < 18) continue;
      const kinder = erzeugeKinder(ctx, z, mAlter, true);
      if (vater && !kinder.every(k => vaterOk(aP, k.alter))) continue;
      const zuhause = [], weg = [];
      for (const k of kinder) (kindZuHause(ctx, k.alter, k.geschlecht, z) ? zuhause : weg).push(k);
      if (!zuhause.length) continue;
      const e = person('kopf', aP, vater ? 'm' : 'w', [ctx.h]);
      e.familienstand = z.gewichtet(ctx.trad ? { geschieden: 0.55, verwitwet: 0.3, 'getrennt lebend': 0.1, ledig: 0.05 } : { geschieden: 0.5, ledig: 0.33, verwitwet: 0.08, 'getrennt lebend': 0.09 });
      const hh = { art: 'alleinerziehend', mitglieder: [e], wegGezogen: [], hinweis: '' };
      for (const k of zuhause) { const c = person('kind', k.alter, k.geschlecht, [ctx.h]); verbindeEltern(c, [e]); hh.mitglieder.push(c); }
      for (const k of weg) hh.wegGezogen.push({ ...k, eltern: [e] });
      return hh;
    }
    return null;
  }
  function hhMehrgen(ctx, z) {
    for (let v = 0; v < 5; v++) {
      const aG = zieheAlter(ctx, z, 46, 94, x => (x < 55 ? 0.5 : x < 82 ? 1 : 0.6));
      const opaLebt = z.chance(aG < 65 ? 0.85 : aG < 75 ? 0.65 : aG < 85 ? 0.45 : 0.25);
      const omaLebt = !opaLebt || z.chance(0.92);
      const kinder = erzeugeKinder(ctx, z, aG, true);
      const erw = kinder.filter(k => k.alter >= 21 && k.alter <= 58);
      if (!erw.length) continue;
      const soehne = erw.filter(k => k.geschlecht === 'm'), toechter = erw.filter(k => k.geschlecht === 'w');
      const bleibt = (z.chance(ctx.trad ? 0.78 : 0.5) && soehne.length) ? z.wahl(soehne) : (toechter.length ? z.wahl(toechter) : z.wahl(erw));
      let aO = null;
      if (opaLebt) {
        for (let t = 0; t < 8; t++) { const x = aG + partnerAbstand(ctx, z); if (x >= 46 && x <= 100 && kinder.every(k => vaterOk(x, k.alter))) { aO = x; break; } }
        if (aO === null) continue;
      }
      const oma = omaLebt ? person('grosselternteil', aG, 'w', [ctx.h]) : null;
      const opa = aO !== null ? person('grosselternteil', aO, 'm', [ctx.h]) : null;
      const G1 = [oma, opa].filter(Boolean);
      if (oma && opa) paar(oma, opa, z.chance(ctx.trad ? 0.99 : 0.93) ? 'verheiratet' : 'zusammenlebend');
      else G1[0].familienstand = z.chance(0.85) ? 'verwitwet' : 'geschieden';
      const c = person('kind', bleibt.alter, bleibt.geschlecht, [ctx.h]); verbindeEltern(c, G1);
      const hh = { art: 'mehrgenerationen', mitglieder: [...G1, c], wegGezogen: [], hinweis: '' };
      const verh = z.chance(ctx.trad ? 0.9 : 0.7);
      if (verh) {
        const gap = partnerAbstand(ctx, z);
        const aS = c.geschlecht === 'm' ? c.alter - gap : c.alter + gap;
        if (aS < 18 || aS > 99) continue;
        const s = person('schwiegerkind', aS, c.geschlecht === 'm' ? 'w' : 'm', [partnerHerkunft(ctx, z)]);
        paar(c, s, 'verheiratet');
        hh.mitglieder.push(s);
        const mutter = c.geschlecht === 'w' ? c : s, vater = c.geschlecht === 'm' ? c : s;
        for (const k of erzeugeKinder(ctx, z, mutter.alter, false)) {
          if (!vaterOk(vater.alter, k.alter)) continue;
          if (k.alter >= 18 && !kindZuHause(ctx, k.alter, k.geschlecht, z)) { hh.wegGezogen.push({ ...k, eltern: [vater, mutter] }); continue; }
          const e = person('enkel', k.alter, k.geschlecht, kindHerkunft(vater, mutter)); verbindeEltern(e, [vater, mutter]); hh.mitglieder.push(e);
        }
        hh.hinweis = (c.geschlecht === 'm' ? 'Sohn' : 'Tochter') + ' lebt mit eigener Familie bei den Eltern';
      } else {
        c.familienstand = z.gewichtet({ ledig: 0.55, geschieden: 0.35, verwitwet: 0.1 });
        hh.hinweis = 'erwachsenes Kind lebt mit den alten Eltern zusammen';
      }
      for (const k of kinder) {
        if (k === bleibt) continue;
        if (k.alter < 18 || (k.alter <= 30 && kindZuHause(ctx, k.alter, k.geschlecht, z))) {
          const x = person('kind', k.alter, k.geschlecht, [ctx.h]); verbindeEltern(x, G1); x.familienstand = 'ledig'; hh.mitglieder.push(x);
        } else hh.wegGezogen.push({ ...k, eltern: G1 });
      }
      return hh;
    }
    return null;
  }
  let wohngruppen = 0;
  function hhWG(ctx, z, zaehler) {
    const { land, h } = ctx;
    if (land === 'AE' && (ARBEITSMIGRATION_AE.has(h) || h === 'ar_levante')) {
      const n = z.ganz(2, 5); const frauen = h === 'ph' && z.chance(0.35);
      const mit = [];
      for (let i = 0; i < n; i++) {
        const a = zieheAlter(ctx, z, 21, 55, x => (x <= 45 ? 1 : 0.4));
        const hi = i && z.chance(0.3) ? z.wahl(['s_asien', 'ph', 'afr_ost', 'ar_levante']) : h;
        const p = person(i ? 'mitbewohner' : 'kopf', a, frauen ? 'w' : 'm', [hi]);
        p.familienstand = a >= 27 && z.chance(0.6) ? 'verheiratet' : 'ledig';
        if (p.familienstand === 'verheiratet') {
          p.info.partnerExtern = (p.geschlecht === 'm' ? 'Ehefrau' : 'Ehemann') + ' lebt im Herkunftsland';
          const ks = erzeugeKinder({ ...ctx, h: hi }, z, p.geschlecht === 'w' ? a : a - 4, false);
          const klein = ks.filter(k => k.alter < 12).map(k => k.alter);
          if (klein.length) p.info.kleineKinderExtern = klein;
          const gross = ks.filter(k => k.alter >= 12).length;
          if (gross) p.info.kinderAusserhalb = gross;
          if (ks.length) p.info.kinderNotiz = 'Kinder leben im Herkunftsland';
        }
        mit.push(p);
      }
      return { art: 'wg_sonstige', form: 'arbeiterunterkunft', mitglieder: mit, wegGezogen: [], hinweis: 'Arbeiterunterkunft (geteilte Wohnung, vom Arbeitgeber gestellt)' };
    }
    const formen = WESTEN.has(land) ? { wg: 0.8, geschwister: 0.17, wohngruppe: (land === 'DE' && wohngruppen < 2) ? 0.03 : 0 }
      : land === 'TR' ? { wohnheim: 0.35, wg: 0.4, geschwister: 0.25 } : { wg: 0.55, geschwister: 0.45 };
    const form = z.gewichtet(formen);
    if (form === 'geschwister') {
      const a1 = zieheAlter(ctx, z, 19, 38, x => (x <= 30 ? 1 : 0.4));
      const a2 = klemme(a1 + z.wahl([-6, -4, -3, -2, -1, 1, 2, 3, 4, 6]), 18, 45);
      const p1 = person('kopf', a1, z.chance(0.5) ? 'm' : 'w', [ctx.h]), p2 = person('geschwister', a2, z.chance(0.5) ? 'm' : 'w', [ctx.h]);
      p1.familienstand = p2.familienstand = 'ledig';
      p1.info.geschwister = [p2]; p2.info.geschwister = [p1];
      return { art: 'wg_sonstige', form: 'geschwister', mitglieder: [p1, p2], wegGezogen: [], hinweis: 'Geschwister wohnen zusammen' };
    }
    if (form === 'wohngruppe') {
      const fluchtH = ['af', 'ar_levante', 'afr_ost'].filter(x => ctx.o.herkunft[x]);
      const hh0 = fluchtH.length ? z.wahl(fluchtH) : ctx.h;
      const n = z.ganz(1, 2); const mit = [];
      for (let i = 0; i < n; i++) {
        const p = person(i ? 'mitbewohner' : 'kopf', z.ganz(15, 17), z.chance(0.8) ? 'm' : 'w', [hh0]);
        p.familienstand = 'ledig';
        p.info.ausnahme = fluchtH.length ? 'lebt in einer Wohngruppe der Jugendhilfe (ohne Eltern geflüchtet)' : 'lebt in einer Wohngruppe der Jugendhilfe';
        mit.push(p);
      }
      return { art: 'wg_sonstige', form: 'wohngruppe', mitglieder: mit, wegGezogen: [], hinweis: 'Wohngruppe der Jugendhilfe' };
    }
    const n = form === 'wohnheim' ? z.ganz(2, 3) : z.ganz(2, 4);
    const g0 = z.chance(0.5) ? 'm' : 'w';
    const a0 = form === 'wohnheim' ? z.ganz(18, 23) : zieheAlter(ctx, z, 19, 36, x => (x <= 28 ? 1 : 0.45));
    const mit = [];
    for (let i = 0; i < n; i++) {
      const a = i === 0 ? a0 : klemme(a0 + z.ganz(-3, 4), 18, 40);
      const g = form === 'wohnheim' ? g0 : (z.chance(0.5) ? 'm' : 'w');
      const hi = i === 0 ? ctx.h : zieheHerkunft(ctx.o, ctx.st, zaehler, z);
      const p = person(i ? 'mitbewohner' : 'kopf', a, g, [hi]);
      p.familienstand = 'ledig';
      mit.push(p);
    }
    return { art: 'wg_sonstige', form, mitglieder: mit, wegGezogen: [], hinweis: form === 'wohnheim' ? 'Studentenwohnheim (Yurt)' : 'Wohngemeinschaft' };
  }
  function haushaltsArt(ctx, z) {
    const { land, o, st, h } = ctx;
    if (land === 'AE') {
      const p = h === 'ar_golf' ? { paar_mit_kindern: 0.55, mehrgenerationen: 0.35, paar_ohne_kinder: 0.08, allein: 0.02 }
        : ARBEITSMIGRATION_AE.has(h) ? { wg_sonstige: 0.62, paar_mit_kindern: 0.24, paar_ohne_kinder: 0.09, allein: 0.05 }
          : h === 'ar_levante' ? { wg_sonstige: 0.3, paar_mit_kindern: 0.45, paar_ohne_kinder: 0.15, allein: 0.1 }
            : { paar_mit_kindern: 0.42, paar_ohne_kinder: 0.22, allein: 0.14, wg_sonstige: 0.17, alleinerziehend: 0.05 };
      return z.gewichtet(p);
    }
    const p = { ...ohneMeta(B.haushalte.personen_anteile_je_land[land]) };
    if (WESTEN.has(land) && TR_WURZELN.has(h)) { p.allein *= 0.5; p.paar_mit_kindern *= 1.25; p.mehrgenerationen *= 4; }
    for (const [oid, pre, f] of HH_KORREKTUR) if (oid === o.id && beginntMit(st.name, pre)) for (const [k, v] of Object.entries(f)) p[k] *= v;
    const gr = { allein: 1, paar_ohne_kinder: 2, paar_mit_kindern: ctx.trad ? 4.4 : 3.9, alleinerziehend: 2.6, mehrgenerationen: 5.5, wg_sonstige: 2.7 };
    for (const k of Object.keys(p)) p[k] /= gr[k];
    // Familien im Kandidatenpool doppelt anbieten; welche Form gewaehlt wird, steuert der Zielpfad (ZIEL_TYP)
    p.paar_mit_kindern *= 2; p.alleinerziehend *= 2; p.mehrgenerationen *= 2;
    return z.gewichtet(p);
  }
  function bildeHaushalt(ctx, z, zaehler) {
    const art = haushaltsArt(ctx, z);
    const f = { allein: hhAllein, paar_ohne_kinder: hhPaarOhne, paar_mit_kindern: hhPaarMit, alleinerziehend: hhAlleinerziehend, mehrgenerationen: hhMehrgen, wg_sonstige: hhWG }[art];
    const hh = f(ctx, z, zaehler);
    if (!hh) return null;
    hh.o = ctx.o; hh.st = ctx.st; hh.land = ctx.land; hh.hkKopf = ctx.h; hh.trad = ctx.trad;
    for (const p of hh.mitglieder) p.hh = hh;
    return hh;
  }
  function zieheHerkunft(o, st, zaehler, z) {
    const mix = normiere(o.herkunft);
    const tilt = {};
    for (const [, , f] of stTreffer(ST_HERKUNFT, o.id, st.name)) for (const [h, v] of Object.entries(f)) tilt[h] = (tilt[h] || 1) * v;
    const e = [];
    for (const [h, a] of Object.entries(mix)) {
      const need = ZIEL_HK[o.id][h] - (zaehler.herkunft[h] || 0);
      e.push([h, Math.max(0.04 * a * o.figuren, need) * (tilt[h] || 1)]);
    }
    return z.gewichtet(e);
  }
  function kontext(o, st, h) {
    const trad = ['TR', 'AZ', 'BG', 'AE'].includes(o.land) || (WESTEN.has(o.land) && TR_WURZELN.has(h));
    return { o, st, h, land: o.land, migrant: !istEinheimisch(h, o.land), trad };
  }

  // ---------- 1. Haushalte je Ort (Kandidaten nach Restbedarf auswaehlen) ----------
  const zH = Z('haushalte');
  const HAUSHALTE = [];
  const KANDIDATEN = 40;
  for (const o of ORTE) {
    const anteile = o.stadtteile.map(s => s.anteil);
    const roh = anteile.map(a => (a / summe(anteile)) * o.figuren);
    const quote = roh.map(Math.floor);
    let rest = o.figuren - summe(quote);
    roh.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).slice(0, rest).forEach(([, i]) => quote[i]++);
    const offen = [...quote];
    const zaehler = { alter: {}, herkunft: {}, gruppe: [0, 0, 0, 0], frauen: [0, 0, 0, 0], typ: {}, gesamt: 0 };
    const zielA = ZIEL_ALTER[o.id], zielH = ZIEL_HK[o.id], zielF = ZIEL_FRAUEN[o.id], zielT = ZIEL_TYP[o.id];
    const NO = o.figuren;
    // Abweichung vom Zielpfad: nach P platzierten Figuren sollten je Band zielA * P / NO vorhanden sein
    function fehler(CA, CH, G, FR, CT, P) {
      let eA = 0, eH = 0, eG = 0, eT = 0;
      for (const b of BAENDER) { const d = (CA[b] || 0) - zielA[b] * P / NO; eA += (b === '12-14' || b === '15-17' ? 15 : 1) * d * d / Math.max(1, zielA[b]); }
      for (const h of Object.keys(zielH)) { const d = (CH[h] || 0) - zielH[h] * P / NO; eH += d * d / Math.max(2, zielH[h]); }
      for (let g = 0; g < 4; g++) { const d = FR[g] - zielF[g] * G[g]; eG += d * d / Math.max(1, G[g]); }
      for (const t of HH_ARTEN) { const d = (CT[t] || 0) - zielT[t] * P / NO; eT += d * d / Math.max(1, zielT[t]); }
      return eA + 0.3 * eH + 0.5 * eG + 0.8 * eT;
    }
    function bewerte(hh) {
      const figs = hh.mitglieder.filter(p => p.alter >= 12);
      const CA = { ...zaehler.alter }, CH = { ...zaehler.herkunft }, G = [...zaehler.gruppe], FR = [...zaehler.frauen], CT = { ...zaehler.typ };
      for (const p of figs) {
        const b = band(p.alter); CA[b] = (CA[b] || 0) + 1;
        CH[p.herkunft[0]] = (CH[p.herkunft[0]] || 0) + 1;
        const g = grp4(p.alter); G[g]++; if (p.geschlecht === 'w') FR[g]++;
      }
      CT[hh.art] = (CT[hh.art] || 0) + figs.length;
      const P = zaehler.gesamt + figs.length;
      const vorher = fehler(zaehler.alter, zaehler.herkunft, zaehler.gruppe, zaehler.frauen, zaehler.typ, P);
      const nachher = fehler(CA, CH, G, FR, CT, P);
      return (vorher - nachher) / figs.length;
    }
    let sicher = 0;
    while (summe(offen) > 0 && sicher++ < 20000) {
      let si = -1, best = -1;
      for (let i = 0; i < offen.length; i++) { if (offen[i] <= 0) continue; const f = offen[i] / quote[i] + zH.z() * 0.05; if (f > best) { best = f; si = i; } }
      const st = o.stadtteile[si];
      let bester = null, wert = -Infinity;
      for (let k = 0; k < KANDIDATEN; k++) {
        const h = zieheHerkunft(o, st, zaehler, zH);
        const hh = bildeHaushalt(kontext(o, st, h), zH, zaehler);
        if (!hh) continue;
        const nf = hh.mitglieder.filter(p => p.alter >= 12).length;
        if (nf === 0 || nf > offen[si]) continue;
        if (hh.form === 'wohngruppe' && wohngruppen >= 2) continue;
        const w = bewerte(hh) + zH.z() * 0.01;
        if (w > wert) { wert = w; bester = hh; }
      }
      if (!bester) {
        // Notfall: Einzelperson im Band mit dem groessten Restbedarf (ab 18)
        let bb = '30-34', bmax = -Infinity;
        for (const b of BAENDER.slice(2)) { const r = zielA[b] - (zaehler.alter[b] || 0); if (r > bmax) { bmax = r; bb = b; } }
        const h = zieheHerkunft(o, st, zaehler, zH);
        const ctx = kontext(o, st, h);
        const [lo, hi] = bb === '85+' ? [85, 92] : bb.split('-').map(Number);
        const p = person('kopf', zH.ganz(lo, hi), 'w', [h]);
        p.geschlecht = geschlechtFuer(ctx, p.alter, zH);
        p.familienstand = famStandAllein(ctx, p.alter, zH);
        bester = { art: 'allein', mitglieder: [p], wegGezogen: [], hinweis: '', o, st, land: o.land, hkKopf: h, trad: ctx.trad };
        p.hh = bester;
      }
      if (bester.form === 'wohngruppe') wohngruppen++;
      bester.nr = HAUSHALTE.length;
      HAUSHALTE.push(bester);
      for (const p of bester.mitglieder) {
        if (p.alter < 12) continue;
        const b = band(p.alter); zaehler.alter[b] = (zaehler.alter[b] || 0) + 1;
        zaehler.herkunft[p.herkunft[0]] = (zaehler.herkunft[p.herkunft[0]] || 0) + 1;
        const g = grp4(p.alter); zaehler.gruppe[g]++; if (p.geschlecht === 'w') zaehler.frauen[g]++;
        zaehler.gesamt++;
        zaehler.typ[bester.art] = (zaehler.typ[bester.art] || 0) + 1;
      }
      offen[si] -= bester.mitglieder.filter(p => p.alter >= 12).length;
    }
  }

  // ---------- 2. Einwanderungsgeschichte ----------
  const zE = Z('einwanderung');
  function g1Anteil(wl, a) { for (const [ab, p] of WELLEN[wl].g1) if (a >= ab) return p; return 0; }
  function ankunft(wl, a, z) {
    const gj = geburtsjahr(a);
    const opts = [];
    for (const [von, bis, w] of WELLEN[wl].w) {
      const lo = Math.max(von, gj), hi = Math.min(bis, JAHR);
      if (hi < lo) continue;
      const lo2 = Math.max(lo, gj + 16), hi2 = Math.min(hi, gj + 35);
      opts.push([{ lo, hi, lo2, hi2 }, w * (hi - lo + 1) * (hi2 >= lo2 ? 2 : 0.5)]);
    }
    if (!opts.length) return Math.min(JAHR, Math.max(gj, JAHR - z.ganz(0, 3)));
    const r = z.gewichtet(opts);
    if (r.hi2 >= r.lo2 && z.chance(0.75)) return z.ganz(r.lo2, r.hi2);
    return z.ganz(r.lo, r.hi);
  }
  for (const hh of HAUSHALTE) {
    const land = hh.land;
    const sortiert = [...hh.mitglieder].sort((a, b) => b.alter - a.alter);
    for (const p of sortiert) {
      const fremd = p.herkunft.filter(h => !istEinheimisch(h, land));
      if (!fremd.length) { p.gen = null; continue; }
      const elternHier = p.eltern.filter(e => e.hh === hh);
      if (elternHier.length) {
        const mig = elternHier.filter(e => e.gen !== null);
        if (!mig.length) { p.gen = null; continue; }
        let best = null;
        for (const e of mig) {
          let g, s = null;
          if (e.gen === 1) { if (geburtsjahr(p.alter) < e.seit) { g = 1; s = e.seit; } else g = 2; } else g = Math.min(3, e.gen + 1);
          if (best === null || g < best.g) best = { g, s };
        }
        p.gen = best.g; p.seit = best.s;
        continue;
      }
      const h = fremd[0]; const wl = welleFuer(h, land);
      const pp = p.partner && p.partner.hh === hh && p.partner.gen !== undefined && p.partner !== p ? p.partner : null;
      if (pp && pp.alter > p.alter && pp.gen !== null && zE.chance(0.75)) {
        if (pp.gen === 1) { p.gen = 1; p.seit = klemme(pp.seit + zE.ganz(0, 4), geburtsjahr(p.alter), JAHR); }
        else if (zE.chance(0.6)) p.gen = pp.gen;
        else { p.gen = 1; p.seit = klemme(geburtsjahr(p.alter) + zE.ganz(20, 28), geburtsjahr(p.alter), JAHR); }
        continue;
      }
      if (zE.chance(g1Anteil(wl, p.alter))) { p.gen = 1; p.seit = ankunft(wl, p.alter, zE); }
      else if (WELLEN[wl].g3) { p.gen = p.alter >= 40 ? (zE.chance(0.9) ? 2 : 3) : p.alter >= 25 ? (zE.chance(0.7) ? 2 : 3) : (zE.chance(0.45) ? 2 : 3); }
      else p.gen = 2;
    }
    // Geschwister ohne Eltern im Haushalt: gleiche Geschichte
    for (const p of hh.mitglieder) if (p.info.geschwister) for (const s of p.info.geschwister) if (s.alter < p.alter) { s.gen = p.gen; s.seit = p.seit; }
  }

  // ---------- 3. Familien ueber Haushalte (erwachsene Kinder, die ausgezogen sind) ----------
  const zL = Z('familien');
  const pool = [];
  for (const hh of HAUSHALTE) for (const e of hh.wegGezogen) pool.push({ ...e, hh, frei: true });
  const alleP = HAUSHALTE.flatMap(hh => hh.mitglieder);
  const kandidatenX = zL.mischen(alleP.filter(p => p.alter >= 18 && p.alter <= 64 && !p.eltern.length && !(p.info.geschwister)));
  const TR_ORTE = ORTE.filter(o => o.land === 'TR').map(o => o.id);
  function querErlaubt(x, eltern0) {
    const ox = x.hh.o.id, oe = eltern0.hh.o.id;
    if (ox === oe) return 1;
    const h = x.herkunft[0];
    // Eltern in einem anderen Land nur, wenn die Figur als Erwachsene (ab 17) allein ausgewandert ist
    if (x.gen === 1 && (x.seit - geburtsjahr(x.alter)) < 17) return 0;
    if (x.hh.land !== 'TR' && x.gen === 1 && TUERKISCHSPRACHIG.has(h) && eltern0.hh.land === 'TR' && istEinheimisch(eltern0.herkunft[0], 'TR')) return 0.35;
    if (x.gen === 1 && h === 'tr_balkan' && oe === 'kardschali') return 0.5;
    if (x.hh.land === 'TR' && ['istanbul', 'izmir', 'ankara'].includes(ox) && ['kayseri', 'diyarbakir'].includes(oe) && x.gen === null) return 0.3;
    return 0;
  }
  function genPasst(x, e) {
    if (x.hh.o.id !== e.hh.o.id) return true;
    if (x.gen === null) return e.gen === null;
    if (x.gen === 2) return e.gen === 1 && e.seit <= geburtsjahr(x.alter);
    if (x.gen === 3) return e.gen === 2 || e.gen === 3;
    if (x.gen === 1) return e.gen === 1 && Math.abs((e.seit || 0) - (x.seit || 0)) <= 1;
    return false;
  }
  let verknuepft = 0;
  for (const x of kandidatenX) {
    if (!zL.chance(0.6)) continue;
    const opts = [];
    for (const e of pool) {
      if (!e.frei || e.geschlecht !== x.geschlecht || Math.abs(e.alter - x.alter) > 1) continue;
      const el = e.eltern; if (!el.length) continue;
      if (!x.herkunft.includes(el[0].herkunft[0])) continue;
      if (el.includes(x) || el.some(p => p.partner === x) || el.some(p => p.hh === x.hh)) continue;
      const mutter = el.find(p => p.geschlecht === 'w'), vater = el.find(p => p.geschlecht === 'm');
      if (mutter && (mutter.alter - x.alter < 16 || mutter.alter - x.alter > 48)) continue;
      if (vater && (vater.alter - x.alter < 17 || vater.alter - x.alter > 60)) continue;
      const q = querErlaubt(x, el[0]); if (!q) continue;
      if (!genPasst(x, el[0])) continue;
      if (x.partner && el.some(p => p.kinder.includes(x.partner))) continue;
      opts.push([e, q]);
    }
    if (!opts.length) continue;
    const e = zL.gewichtet(opts.map(([v, w]) => [v, w]));
    e.frei = false;
    verbindeEltern(x, e.eltern);
    verknuepft++;
  }
  for (const e of pool) if (e.frei) for (const el of e.eltern) el.info.kinderAusserhalb = (el.info.kinderAusserhalb || 0) + 1;

  // ---------- 4. Figuren festlegen, Reihenfolge nach Ort, Stadtteil, Familie ----------
  const istFigur = p => p.alter >= 12;
  // Familienbuendel je Ort (Haushalte, die durch Eltern-Kind-Verbindungen verbunden sind)
  const hhWurzel = new Map(HAUSHALTE.map(h => [h, h]));
  const finde = h => { while (hhWurzel.get(h) !== h) { hhWurzel.set(h, hhWurzel.get(hhWurzel.get(h))); h = hhWurzel.get(h); } return h; };
  for (const p of alleP) for (const e of p.eltern) if (e.hh !== p.hh && e.hh.o === p.hh.o) { const a = finde(e.hh), b = finde(p.hh); if (a !== b) hhWurzel.set(b.nr < a.nr ? a : b, b.nr < a.nr ? b : a); }
  const ortIdx = Object.fromEntries(ORTE.map((o, i) => [o.id, i]));
  const stIdx = hh => hh.o.stadtteile.findIndex(s => s.name === hh.st.name);
  const sortiertHH = [...HAUSHALTE].sort((a, b) => {
    const ra = finde(a), rb = finde(b);
    return ortIdx[a.o.id] - ortIdx[b.o.id] || stIdx(ra) - stIdx(rb) || ra.nr - rb.nr || a.nr - b.nr;
  });
  const ROLLE_RANG = { grosselternteil: 0, kopf: 1, partner: 2, geschwister: 3, mitbewohner: 3, kind: 4, schwiegerkind: 5, enkel: 6 };
  const F = [];
  let hhNr = 0;
  for (const hh of sortiertHH) {
    hh.id = 'H' + String(++hhNr).padStart(4, '0');
    const figs = hh.mitglieder.filter(istFigur).sort((a, b) => (ROLLE_RANG[a.rolle] - ROLLE_RANG[b.rolle]) || (b.alter - a.alter));
    for (const p of figs) { p.i = F.length; p.id = fid(F.length + 1); F.push(p); }
  }
  if (F.length !== 1000) throw new Error('Figurenzahl ' + F.length + ' statt 1000');
  for (const p of F) { p.land = p.hh.land; p.ort = p.hh.o.id; p.stadtteil = p.hh.st.name; }
  const famKern = (a, b) => a.partner === b || a.eltern.includes(b) || b.eltern.includes(a) || geschwister(a).includes(b);
  function geschwister(p) {
    const s = new Set();
    for (const e of p.eltern) for (const k of e.kinder) if (k !== p && istFigur(k)) s.add(k);
    if (p.info.geschwister) for (const k of p.info.geschwister) if (istFigur(k)) s.add(k);
    return [...s];
  }

  // ---------- 5. Beziehungen ohne gemeinsamen Haushalt ----------
  const zB = Z('beziehungen');
  for (const p of F) if (!p.familienstand) p.familienstand = 'ledig';
  const singles = zB.mischen(F.filter(p => p.alter >= 18 && p.alter <= 40 && !p.partner && ['ledig', 'geschieden'].includes(p.familienstand) && !p.info.partnerExtern));
  const vergeben = new Set();
  let beziehungen = 0;
  for (const a of singles) {
    if (vergeben.has(a) || !zB.chance(0.16)) continue;
    const gleich = WESTEN.has(a.land) && zB.chance(0.03);
    const opts = singles.filter(b => b !== a && !vergeben.has(b) && b.ort === a.ort && (gleich ? b.geschlecht === a.geschlecht : b.geschlecht !== a.geschlecht)
      && !famKern(a, b) && b.hh !== a.hh);
    const w = opts.map(b => {
      const mann = a.geschlecht === 'm' ? a : b, frau = a.geschlecht === 'm' ? b : a;
      const d = gleich ? Math.abs(a.alter - b.alter) : mann.alter - frau.alter;
      if (d < -3 || d > 8) return [b, 0];
      return [b, (b.herkunft[0] === a.herkunft[0] ? 3 : 1) * (b.stadtteil === a.stadtteil ? 1.5 : 1)];
    });
    const b = zB.gewichtet(w.filter(([, x]) => x > 0));
    if (!b) continue;
    vergeben.add(a); vergeben.add(b);
    a.partner = b; b.partner = a;
    const trad = ['TR', 'AZ', 'AE'].includes(a.land) || TR_WURZELN.has(a.herkunft[0]);
    const verlobt = trad && zB.chance(0.45);
    a.familienstand = b.familienstand = verlobt ? 'verlobt' : 'in Beziehung';
    const grund = x => (x.eltern.some(e => e.hh === x.hh) ? 'wohnt noch bei den Eltern' : 'jede und jeder hat eine eigene Wohnung');
    a.info.partnerGrund = verlobt ? 'verlobt, Hochzeit geplant; ' + grund(a) : grund(a);
    b.info.partnerGrund = verlobt ? 'verlobt, Hochzeit geplant; ' + grund(b) : grund(b);
    if (gleich) { a.info.queer = b.info.queer = 'offen'; }
    beziehungen++;
  }
  // queere Figuren ohne Paar (selten), in TR, BG, AE, AZ meist nicht offen
  for (const p of F) if (p.alter >= 18 && !p.info.queer && zB.chance(0.012)) p.info.queer = WESTEN.has(p.land) ? (zB.chance(0.8) ? 'offen' : 'nicht offen') : 'nicht offen';

  // ---------- 6. Namen ----------
  const zN = Z('namen');
  const NP = B.namen.pools;
  const AUSS = B.namen.ausschluss_vornamen || {};
  const AUS_V = new Set((Array.isArray(AUSS.liste) ? AUSS.liste : []).map(normName));
  const AUS_N = new Set((Array.isArray(AUSS.nachnamen) ? AUSS.nachnamen : []).map(normName));
  const SPERRE = new Set([...B.namen.sperrliste_prominente.beispiele, ...PROMINENTE_ZUSATZ].map(normName));
  const vornameOk = v => !String(v).split(/[\s-]+/).some(t => AUS_V.has(normName(t)));
  const GENS = ['g1', 'g2', 'g3', 'g4'];
  const generation = a => { const gj = geburtsjahr(a); return gj <= 1964 ? 'g1' : gj <= 1984 ? 'g2' : gj <= 2004 ? 'g3' : 'g4'; };
  function vornamenListe(pool, g, gen) {
    const P = NP[pool]; if (!P || !P[g]) return [];
    let l = P[g][gen];
    if (!l || !l.length) { const i = GENS.indexOf(gen); for (const d of [1, -1, 2, -2, 3, -3]) { const x = P[g][GENS[i + d]]; if (x && x.length) { l = x; break; } } }
    return (l || []).filter(vornameOk);
  }
  // Unterpool fuer eu_expat je Familie
  const EXPAT_POOLS = ['it', 'pt_es', 'pl', 'fr', 'nl', 'ie'];
  function poolFuer(code, p, fam) {
    if (code === 'eu_expat') return fam.expatPool ||= zN.wahl(EXPAT_POOLS);
    if (code === 'roma' && p.land === 'TR') return 'tr';
    return code;
  }
  // Abstammungslinien (wer traegt welchen Geburtsnamen)
  const lin = F.map((_, i) => i);
  const lf = i => { while (lin[i] !== i) { lin[i] = lin[lin[i]]; i = lin[i]; } return i; };
  const lu = (a, b) => { const x = lf(a), y = lf(b); if (x !== y) lin[Math.max(x, y)] = Math.min(x, y); };
  const exLinie = new Map();
  for (const p of F) {
    const vater = p.eltern.find(e => e.geschlecht === 'm' && istFigur(e));
    const mutter = p.eltern.find(e => e.geschlecht === 'w' && istFigur(e));
    if (vater) lu(p.i, vater.i);
    else if (mutter) {
      if (['ledig', 'in Beziehung', 'verlobt'].includes(mutter.familienstand) || p.herkunft[0] !== mutter.herkunft[0]) lu(p.i, mutter.i);
      else { const k = mutter.i; if (exLinie.has(k)) lu(p.i, exLinie.get(k)); else exLinie.set(k, p.i); }
    }
    if (p.info.geschwister) for (const s of p.info.geschwister) if (istFigur(s)) lu(p.i, s.i);
  }
  const linien = new Map();
  for (const p of F) { const r = lf(p.i); if (!linien.has(r)) linien.set(r, []); linien.get(r).push(p); }
  const nnBenutzt = new Map();
  const linieName = new Map();
  for (const [r, mit] of linien) {
    const kopf = [...mit].sort((a, b) => (a.geschlecht === 'm' ? 0 : 1) - (b.geschlecht === 'm' ? 0 : 1) || b.alter - a.alter)[0];
    const code = kopf.herkunft[0];
    const fam = { expatPool: null };
    let pool = poolFuer(code, kopf, fam);
    if (code === 'tr_balkan' && kopf.land === 'TR') pool = zN.chance(0.6) ? 'tr' : 'tr_balkan';
    if (code === 'kauk' && kopf.land === 'TR') pool = zN.chance(0.5) ? 'tr' : 'kauk';
    if (code === 'ku' && zN.chance(0.35)) pool = 'tr';
    if (code === 'minderheit_tr' && zN.chance(0.3)) pool = 'tr';
    const NN = (NP[pool] && NP[pool].nachnamen) || NP[code]?.nachnamen || NP.de.nachnamen;
    const benutzt = nnBenutzt.get(kopf.ort) || new Set(); nnBenutzt.set(kopf.ort, benutzt);
    const frei = NN.filter(n => !benutzt.has(n) && !AUS_N.has(normName(n.split('/')[0])));
    const nn = frei.length ? zN.wahl(frei) : zN.wahl(NN);
    benutzt.add(nn);
    linieName.set(r, { stamm: nn, pool, fam });
    for (const p of mit) p.namensPool = pool, p.fam = fam;
  }
  const form = (stamm, g) => (stamm.includes('/') ? stamm.split('/')[g === 'w' ? 1 : 0] : stamm);
  const NAMENSWECHSEL = { de: 0.75, at: 0.75, ch: 0.7, tr: 0.97, ku: 0.97, tr_balkan: 0.95, tr_zypern: 0.9, kauk: 0.95, az: 0.6, uk: 0.8, us: 0.8, afroam: 0.75, hisp: 0.2,
    karib: 0.7, pl: 0.85, ru_de: 0.85, ru: 0.8, ua: 0.8, ex_yu: 0.8, al: 0.85, ro: 0.8, bg: 0.8, roma: 0.8, afr_west: 0.6, minderheit_tr: 0.9, gr: 0.3, it: 0, nl: 0.3,
    be: 0.1, fr: 0.3, ar_levante: 0, ar_maghreb: 0, ar_golf: 0, ir: 0, af: 0, vn: 0, s_asien: 0.4, ph: 0.7, afr_zentral: 0.3, afr_ost: 0, pt_es: 0, eu_expat: 0.3 };
  for (const p of F) { const L = linieName.get(lf(p.i)); p.geburtsname = form(L.stamm, p.geschlecht); p.nachname = p.geburtsname; }
  // Ex-Linien: Mutter behaelt oft den Namen der Kinder (frueherer Ehename)
  for (const [mi, ki] of exLinie) { const m = F[mi]; if (zN.chance(0.6)) m.nachname = form(linieName.get(lf(ki)).stamm, 'w'); }
  for (const p of F) {
    if (p.geschlecht !== 'w' || p.familienstand !== 'verheiratet' || !p.partner || p.partner.geschlecht !== 'm') continue;
    const q = NAMENSWECHSEL[p.herkunft[0]] ?? 0.5;
    if (!zN.chance(q)) continue;
    const ehe = form(linieName.get(lf(p.partner.i)).stamm, 'w');
    p.nachname = (TUERKISCHSPRACHIG.has(p.herkunft[0]) && p.land === 'TR' && zN.chance(0.5) && ehe !== p.geburtsname) ? p.geburtsname + ' ' + ehe : ehe;
  }
  const vollBenutzt = new Set();
  const nachAlter = [...F].sort((a, b) => b.alter - a.alter);
  for (const p of nachAlter) {
    const gen = generation(p.alter);
    const nahe = new Set([...p.eltern, ...p.kinder, ...geschwister(p), p.partner].filter(Boolean).map(x => x.vorname).filter(Boolean));
    let quellen = [];
    const codes = p.herkunft;
    const europaDiaspora = WESTEN.has(p.land) && (gen === 'g3' || gen === 'g4');
    const istOst = x => x.ort === 'leipzig' || (x.ort === 'berlin' && x.stadtteil.startsWith('Marzahn'));
    for (const [code, gew] of codes.length > 1 ? [[codes[0], 0.45], [codes[1], 0.35], ['__beide', 0.2]] : [[codes[0], 1]]) {
      if (code === '__beide') { quellen.push([NAMEN_BEIDE[p.geschlecht], gew]); continue; }
      let pool = code === codes[0] ? p.namensPool : poolFuer(code, p, p.fam);
      if (code !== codes[0] && code === 'ku' && zN.chance(0.35)) pool = 'tr';
      const basis = vornamenListe(pool, p.geschlecht, gen);
      if ((code === 'tr' || code === 'ku') && europaDiaspora) { quellen.push([basis, gew * 0.5]); quellen.push([vornamenListe('tr_diaspora', p.geschlecht, gen), gew * (code === 'ku' ? 0.3 : 0.5)]); }
      else if (code === 'de' && istOst(p) && gen !== 'g4') { quellen.push([basis, gew * 0.65]); quellen.push([vornamenListe('de_ost', p.geschlecht, gen), gew * 0.35]); }
      else quellen.push([basis, gew]);
    }
    quellen = quellen.filter(([l]) => l && l.length);
    if (!quellen.length) quellen = [[vornamenListe('de', p.geschlecht, gen), 1]];
    let v = null;
    for (let t = 0; t < 60 && !v; t++) {
      const liste = zN.gewichtet(quellen.map(([l, w]) => [l, w]));
      const kand = zN.wahl(liste);
      const voll = normName(kand + ' ' + p.nachname);
      if (nahe.has(kand) || vollBenutzt.has(voll) || SPERRE.has(voll) || SPERRE.has(normName(kand.split(' ')[0] + ' ' + p.nachname))) continue;
      v = kand;
    }
    if (!v) {
      // letzte Rettung: anderer Generationspool derselben Herkunft
      for (const gx of GENS) for (const kand of vornamenListe(p.namensPool, p.geschlecht, gx)) {
        const voll = normName(kand + ' ' + p.nachname);
        if (!v && !nahe.has(kand) && !vollBenutzt.has(voll) && !SPERRE.has(voll)) v = kand;
      }
    }
    if (!v) throw new Error('Kein freier Vorname fuer ' + p.id);
    p.vorname = v;
    vollBenutzt.add(normName(v + ' ' + p.nachname));
  }

  // ---------- 7. Glaube ----------
  const zG = Z('glaube');
  const PRAXIS = ohneMeta(B.herkunft.glaubenspraxis.verteilung_bei_religioeser_zugehoerigkeit);
  const OHNE = new Set(['ohne', 'ohne_oder_saekular']);
  function richtungZiehen(p) {
    const h = p.herkunft[0];
    let d = { ...ohneMeta(HK[h]?.glaube) };
    if (h === 'de' && (p.ort === 'leipzig' || p.stadtteil.startsWith('Marzahn'))) d = { ohne: 0.8, evangelisch: 0.12, katholisch: 0.05, andere: 0.03 };
    return zG.gewichtet(d) || 'ohne';
  }
  function praxisZiehen(p, richtung) {
    if (OHNE.has(richtung)) return null;
    const d = { ...PRAXIS };
    let stark = 1;
    if (p.alter >= 60) stark *= 1.5; else if (p.alter < 30) stark *= 0.75;
    const rel = stTreffer(ST_RELIGIOES, p.ort, p.stadtteil).length > 0;
    if (['TR', 'AE'].includes(p.land) || rel) stark *= rel && ['TR', 'AE'].includes(p.land) ? 2.5 : 2;
    if (stTreffer(ST_SAEKULAR, p.ort, p.stadtteil).length) { stark *= 0.4; d.gar_nicht *= 1.6; d.kaum *= 1.2; }
    d.stark *= stark;
    return zG.gewichtet(d);
  }
  for (const hh of sortiertHH) {
    const figs = hh.mitglieder.filter(istFigur).sort((a, b) => b.alter - a.alter);
    for (const p of figs) {
      const eltern = p.eltern.filter(e => e.glaube);
      if (eltern.length && zG.chance(0.85)) {
        const e = zG.wahl(eltern);
        const richtung = e.glaube.richtung;
        let praxis = OHNE.has(richtung) ? null : e.glaube.praxis;
        if (praxis && zG.chance(0.4)) praxis = { stark: 'mittel', mittel: 'kaum', kaum: 'gar_nicht', gar_nicht: 'gar_nicht' }[praxis];
        if (praxis && p.alter < 18 && zG.chance(0.2)) praxis = praxisZiehen(p, richtung);
        p.glaube = { richtung, praxis };
      } else if (p.partner && p.partner.glaube && p.partner.herkunft[0] === p.herkunft[0] && zG.chance(0.8)) {
        p.glaube = { richtung: p.partner.glaube.richtung, praxis: OHNE.has(p.partner.glaube.richtung) ? null : (zG.chance(0.7) ? p.partner.glaube.praxis : praxisZiehen(p, p.partner.glaube.richtung)) };
      } else {
        const r = richtungZiehen(p); p.glaube = { richtung: r, praxis: praxisZiehen(p, r) };
      }
    }
  }

  // ---------- 8. Sprachen ----------
  const zS = Z('sprachen');
  const NIVEAU = ['Muttersprache', 'sehr gut', 'gut', 'mittel', 'Grundkenntnisse'];
  const famSprache = new Map();
  function herkunftsSprache(p, code) {
    const key = (p.hh.id || '') + '|' + code;
    if (famSprache.has(key)) return famSprache.get(key);
    let s;
    switch (code) {
      case 'ku': s = zS.chance(0.8) ? 'Kurdisch (Kurmancî)' : 'Kurdisch (Zazakî)'; break;
      case 'be': s = zS.chance(0.8) ? 'Französisch' : 'Niederländisch'; break;
      case 'pt_es': s = zS.chance(0.5) ? 'Portugiesisch' : 'Spanisch'; break;
      case 'karib': s = p.land === 'GB' ? 'Englisch' : 'Niederländisch'; break;
      case 'afr_west': s = ['FR', 'BE'].includes(p.land) ? zS.wahl(['Französisch', 'Wolof']) : zS.wahl(['Englisch', 'Twi', 'Yoruba']); break;
      case 'afr_ost': s = zS.wahl(['Tigrinya', 'Amharisch', 'Somali']); break;
      case 's_asien': s = zS.wahl(['Hindi', 'Urdu', 'Bengali', 'Malayalam']); break;
      case 'kauk': s = p.land === 'AZ' ? 'Aserbaidschanisch' : 'Türkisch'; break;
      case 'roma': s = 'Romanes'; break;
      case 'eu_expat': s = { it: 'Italienisch', pt_es: zS.chance(0.5) ? 'Portugiesisch' : 'Spanisch', pl: 'Polnisch', fr: 'Französisch', nl: 'Niederländisch', ie: 'Englisch' }[p.fam?.expatPool || 'it']; break;
      case 'ch': s = 'Schweizerdeutsch'; break;
      case 'ar_maghreb': s = 'Arabisch (Darija)'; break;
      case 'ru_de': s = 'Russisch'; break;
      case 'minderheit_tr': s = 'Türkisch'; break;
      default: s = String(HK[code]?.sprachen?.[0] || 'Deutsch').split(' oder ')[0];
    }
    famSprache.set(key, s);
    return s;
  }
  function englischNiveau(p) {
    const a = p.alter, l = p.land;
    if (l === 'GB' || l === 'US') return 'Muttersprache';
    const akad = p.status === 'studium' || ['bachelor', 'master', 'staatsexamen', 'promotion'].includes(p.bildung?.abschluss);
    const hoch = ['NL', 'AT', 'DE', 'BE', 'CH'].includes(l);
    if (l === 'AE') return ARBEITSMIGRATION_AE.has(p.herkunft[0]) ? zS.gewichtet({ gut: 0.4, mittel: 0.4, Grundkenntnisse: 0.2 }) : zS.gewichtet({ 'sehr gut': 0.5, gut: 0.4, mittel: 0.1 });
    if (hoch) {
      if (a <= 17) return zS.gewichtet({ gut: 0.45, mittel: 0.4, Grundkenntnisse: 0.15 });
      if (a < 50) return zS.gewichtet(akad ? { 'sehr gut': 0.45, gut: 0.5, mittel: 0.05 } : { 'sehr gut': 0.12, gut: 0.45, mittel: 0.33, Grundkenntnisse: 0.1 });
      if (a < 65) return zS.gewichtet({ gut: 0.25, mittel: 0.4, Grundkenntnisse: 0.25, keine: 0.1 });
      return zS.gewichtet({ mittel: 0.2, Grundkenntnisse: 0.4, keine: 0.4 });
    }
    if (l === 'FR' || l === 'BG') {
      if (a < 35) return zS.gewichtet({ gut: 0.35, mittel: 0.45, Grundkenntnisse: 0.2 });
      if (a < 60) return zS.gewichtet({ mittel: 0.35, Grundkenntnisse: 0.4, keine: 0.25 });
      return zS.gewichtet({ Grundkenntnisse: 0.3, keine: 0.7 });
    }
    if (a <= 17) return zS.gewichtet({ mittel: 0.4, Grundkenntnisse: 0.5, gut: 0.1 });
    if (a < 35) return zS.gewichtet(akad ? { gut: 0.45, mittel: 0.4, 'sehr gut': 0.1, Grundkenntnisse: 0.05 } : { mittel: 0.25, Grundkenntnisse: 0.45, keine: 0.3 });
    if (a < 55) return zS.gewichtet(akad ? { gut: 0.35, mittel: 0.45, Grundkenntnisse: 0.2 } : { Grundkenntnisse: 0.35, keine: 0.65 });
    return zS.gewichtet({ Grundkenntnisse: 0.15, keine: 0.85 });
  }
  function sprachenFuer(p) {
    const m = new Map();
    const setze = (s, n) => { if (!s || n === 'keine') return; const alt = m.get(s); if (!alt || NIVEAU.indexOf(n) < NIVEAU.indexOf(alt)) m.set(s, n); };
    const L = LANDESSPRACHE[p.land];
    const h0 = p.herkunft[0];
    if (p.gen === null) {
      if (p.land === 'TR' && h0 === 'ku') { setze(herkunftsSprache(p, 'ku'), p.alter >= 40 ? 'Muttersprache' : zS.gewichtet({ Muttersprache: 0.4, gut: 0.35, mittel: 0.25 })); setze('Türkisch', p.alter >= 60 && p.ort === 'diyarbakir' && p.geschlecht === 'w' ? 'mittel' : 'Muttersprache'); }
      else if (p.land === 'BG' && h0 === 'tr_balkan') { setze('Türkisch', 'Muttersprache'); setze('Bulgarisch', p.alter < 60 ? 'sehr gut' : 'gut'); }
      else if (p.land === 'AZ' && h0 === 'ru') { setze('Russisch', 'Muttersprache'); setze('Aserbaidschanisch', zS.gewichtet({ gut: 0.5, mittel: 0.5 })); }
      else if (p.land === 'AZ' && h0 === 'kauk') { setze('Aserbaidschanisch', 'Muttersprache'); if (p.alter >= 50) setze('Lesgisch', 'Muttersprache'); }
      else if (p.land === 'TR' && h0 === 'kauk') { setze('Türkisch', 'Muttersprache'); if (p.alter >= 50) setze('Tscherkessisch', 'gut'); }
      else if (p.land === 'TR' && h0 === 'minderheit_tr') { setze('Türkisch', 'Muttersprache'); if (p.alter >= 45) setze(zS.wahl(['Armenisch', 'Griechisch', 'Ladino', 'Aramäisch']), 'gut'); }
      else if (p.land === 'TR' && h0 === 'roma') { setze('Türkisch', 'Muttersprache'); if (zS.chance(0.4)) setze('Romanes', 'gut'); }
      else if (p.land === 'BG' && h0 === 'roma') { setze('Bulgarisch', 'Muttersprache'); setze(zS.chance(0.6) ? 'Romanes' : 'Türkisch', 'gut'); }
      else if (p.land === 'CH') { setze('Schweizerdeutsch', 'Muttersprache'); setze('Deutsch', 'sehr gut'); setze('Französisch', zS.gewichtet({ gut: 0.3, mittel: 0.5, Grundkenntnisse: 0.2 })); }
      else if (p.land === 'BE') { const fr = herkunftsSprache(p, 'be'); setze(fr, 'Muttersprache'); setze(fr === 'Französisch' ? 'Niederländisch' : 'Französisch', zS.gewichtet({ gut: 0.4, mittel: 0.45, Grundkenntnisse: 0.15 })); }
      else if (p.land === 'AE') { setze('Arabisch', 'Muttersprache'); }
      else if (p.land === 'FR' && p.ort === 'strassburg' && p.alter >= 60 && zS.chance(0.5)) { setze('Französisch', 'Muttersprache'); setze('Elsässisch', 'gut'); }
      else setze(L, 'Muttersprache');
    } else {
      const hs = herkunftsSprache(p, h0);
      if (p.gen === 1) {
        setze(hs, 'Muttersprache');
        const jahre = JAHR - (p.seit || JAHR); const ankunftsAlter = p.alter - jahre;
        let n = jahre < 2 ? 'Grundkenntnisse' : jahre < 6 ? 'mittel' : jahre < 16 ? 'gut' : ankunftsAlter < 16 ? 'sehr gut' : ankunftsAlter >= 30 ? 'mittel' : 'gut';
        if (p.land === 'AE') n = 'Grundkenntnisse';
        if (p.land === 'AZ' && TUERKISCHSPRACHIG.has(h0)) n = 'gut';
        setze(L === 'Arabisch' && p.land === 'AE' ? 'Arabisch' : L, n);
        if (p.land === 'CH') setze('Schweizerdeutsch', jahre >= 10 ? 'gut' : 'mittel');
      } else {
        setze(p.land === 'CH' ? 'Schweizerdeutsch' : L, 'Muttersprache');
        if (p.land === 'CH') setze('Deutsch', 'sehr gut');
        const tr = TUERKISCHSPRACHIG.has(h0);
        const n = p.gen === 2 ? (tr ? (p.alter >= 35 ? 'sehr gut' : 'gut') : zS.gewichtet({ 'sehr gut': 0.3, gut: 0.5, mittel: 0.2 })) : zS.gewichtet({ gut: 0.25, mittel: 0.45, Grundkenntnisse: 0.3 });
        setze(hs, n);
      }
      if (h0 === 'ku' && p.land !== 'TR') setze('Türkisch', p.gen === 1 ? 'sehr gut' : 'gut');
      if (h0 === 'ru_de') setze('Deutsch', p.gen === 1 ? 'gut' : 'Muttersprache');
      if (h0 === 'roma') setze(zS.wahl(['Rumänisch', 'Bulgarisch']), 'gut');
      if (h0 === 'ar_maghreb' && ['FR', 'BE', 'NL'].includes(p.land)) setze('Französisch', 'sehr gut');
    }
    if (p.herkunft[1] && !istEinheimisch(p.herkunft[1], p.land)) setze(herkunftsSprache(p, p.herkunft[1]), p.gen === 1 ? 'Muttersprache' : 'gut');
    if (p.herkunft[1] && istEinheimisch(p.herkunft[1], p.land)) setze(p.land === 'CH' ? 'Schweizerdeutsch' : L, 'Muttersprache');
    if (h0 === 'az' && p.land !== 'TR') setze('Türkisch', 'gut');
    if (p.land === 'AZ' && p.alter >= 45 && h0 === 'az') setze('Russisch', zS.gewichtet({ 'sehr gut': 0.3, gut: 0.5, mittel: 0.2 }));
    if (p.land === 'AE' && h0 !== 'ar_golf') setze('Englisch', englischNiveau(p));
    else setze('Englisch', englischNiveau(p));
    return [...m.entries()].sort((a, b) => NIVEAU.indexOf(a[1]) - NIVEAU.indexOf(b[1])).map(([sprache, niveau]) => ({ sprache, niveau }));
  }

  // ---------- 9. Status, Bildung, Taetigkeit ----------
  const zT = Z('taetigkeit');
  const ST = B.taetigkeiten.status;
  const deKey = a => (a <= 14 ? '12-14' : a <= 17 ? '15-17' : a <= 20 ? '18-20' : a <= 24 ? '21-24' : a <= 29 ? '25-29' : a <= 34 ? '30-34' : a <= 44 ? '35-44' : a <= 54 ? '45-54' : a <= 59 ? '55-59' : a <= 64 ? '60-64' : a <= 69 ? '65-69' : '70+');
  const trKey = a => (a <= 13 ? '12-13' : a <= 17 ? '14-17' : a <= 20 ? '18-20' : a <= 24 ? '21-24' : a <= 29 ? '25-29' : a <= 44 ? '30-44' : a <= 54 ? '45-54' : a <= 64 ? '55-64' : '65+');
  const TR_MAENNER = {
    '25-29': { erwerbstaetig: 0.8, arbeitslos: 0.09, studium: 0.05, neet: 0.03, haushalt: 0.01, dienst: 0.02 },
    '30-44': { erwerbstaetig: 0.87, arbeitslos: 0.07, erwerbsunfaehig: 0.03, neet: 0.02, haushalt: 0.01 },
    '45-54': { erwerbstaetig: 0.78, rente: 0.1, arbeitslos: 0.06, erwerbsunfaehig: 0.05, haushalt: 0.01 },
    '55-64': { rente: 0.55, erwerbstaetig: 0.38, erwerbsunfaehig: 0.05, haushalt: 0.02 },
    '65+': { rente: 0.9, erwerbstaetig: 0.08, haushalt: 0.02 },
  };
  function statusVerteilung(p) {
    const a = p.alter, l = p.land, g = p.geschlecht;
    const kleineEigene = (p.kleineKinderAlter || []).filter(x => x <= 2).length > 0;
    let d;
    if (l === 'AE') {
      if (a <= 17) return { schule: 1 };
      if (p.herkunft[0] === 'ar_golf') d = a <= 24 ? { studium: 0.5, erwerbstaetig: 0.35, haushalt: g === 'w' ? 0.15 : 0.02, neet: 0.03 } : a >= 60 ? { rente: 0.8, erwerbstaetig: 0.2 } : (g === 'm' ? { erwerbstaetig: 0.9, arbeitslos: 0.04, studium: 0.03 } : { erwerbstaetig: 0.5, haushalt: 0.42, studium: 0.05 });
      else if (a <= 21 && p.eltern.length) d = { studium: 0.55, erwerbstaetig: 0.3, neet: 0.15 };
      else d = g === 'm' || !p.partner ? { erwerbstaetig: 0.97, arbeitslos: 0.03 } : { erwerbstaetig: 0.5, haushalt: 0.48, arbeitslos: 0.02 };
      if (a >= 63) d = { rente: 0.5, erwerbstaetig: 0.5 };
      return d;
    }
    const trTab = ['TR', 'AZ'].includes(l);
    if (trTab) {
      const k = trKey(a);
      d = { ...ohneMeta(ST.TR[k]) };
      if (TR_MAENNER[k]) {
        if (g === 'm') d = { ...TR_MAENNER[k] };
        else { const r = {}; for (const s of new Set([...Object.keys(d), ...Object.keys(TR_MAENNER[k])])) r[s] = Math.max(0, 2 * (d[s] || 0) - (TR_MAENNER[k][s] || 0)); d = r; }
      } else if (k === '18-20' || k === '21-24') {
        if (g === 'm') { d.dienst = (d.dienst || 0) * 2; d.haushalt = (d.haushalt || 0) * 0.1; }
        else { d.haushalt = (d.haushalt || 0) * 1.9; d.dienst = 0; }
      } else if (k === '14-17') { if (g === 'm') d.erwerbstaetig *= 1.5; else d.erwerbstaetig *= 0.5; }
      if (l === 'AZ') { if (g === 'm' && a >= 18 && a <= 20) d.dienst = 0.35; if (g === 'w' && d.haushalt) { d.haushalt *= 0.75; d.erwerbstaetig = (d.erwerbstaetig || 0) * 1.25; } }
    } else {
      const k = deKey(a);
      d = { ...ohneMeta(ST.DE[k]) };
      if (a >= 25 && a <= 44) {
        if (g === 'w') { d.haushalt = (d.haushalt || 0) * 2; d.elternzeit = (d.elternzeit || 0) * 2.2; }
        else { d.haushalt = (d.haushalt || 0) * 0.2; d.elternzeit = (d.elternzeit || 0) * 0.3; }
      }
      if (l === 'BG') { d.arbeitslos = (d.arbeitslos || 0) * 1.5; if (a >= 62) { d.rente = (d.rente || 0) + 0.5; } }
      if (l === 'BE') d.arbeitslos = (d.arbeitslos || 0) * 1.6;
      if (l === 'FR' && a < 30) d.arbeitslos = (d.arbeitslos || 0) * 1.5;
      if (l === 'AT' && g === 'm' && a >= 18 && a <= 20) d.dienst = 0.25;
      if (l === 'CH' && g === 'm' && a >= 19 && a <= 21) d.dienst = 0.06;
      if (l === 'CH' && a >= 15 && a <= 17) { d.ausbildung = 0.55; d.schule = 0.4; }
      if (l === 'AT' && a >= 15 && a <= 17) { d.ausbildung = 0.3; d.schule = 0.64; }
      if (l === 'GB' && a >= 16 && a <= 17) { d.ausbildung = 0.07; d.schule = 0.85; d.neet = 0.08; }
      if (l === 'US' && a <= 17) { d = { schule: 0.97, erwerbstaetig: 0.01, neet: 0.02 }; }
      if (l === 'FR' && a >= 15 && a <= 17) { d.ausbildung = 0.06; d.schule = 0.9; d.neet = 0.04; }
      if (p.gen === 1 && a >= 25 && a <= 59 && !['eu_expat', 'de'].includes(p.herkunft[0])) d.arbeitslos = (d.arbeitslos || 0) * 2;
    }
    if (!kleineEigene) delete d.elternzeit;
    // Hausfrau oder Hausmann nur, wenn jemand im Haushalt verdient; Maenner ab 45 selten
    if (p.hh.art === 'allein' || p.hh.art === 'wg_sonstige') delete d.haushalt;
    if (g === 'm' && a >= 45 && d.haushalt) d.haushalt *= 0.25;
    if (p.eltern.some(e => e.hh === p.hh) && a >= 18 && a <= 24) { for (const s of ['schule', 'ausbildung', 'studium']) if (d[s]) d[s] *= 1.3; }
    if (a < 18) delete d.studium;
    // Schule nach 18 ist vor allem in DE, AT, CH und NL ueblich (Abitur, Matura, Berufsschule)
    if (!['DE', 'AT', 'CH', 'NL'].includes(l) && d.schule) { if (a >= 19) delete d.schule; else if (a === 18) d.schule *= 0.5; }
    if (a >= 21 && d.schule) delete d.schule;
    if (a < 50 && !trTab) delete d.rente;
    if (a < 40 && trTab) delete d.rente;
    return d;
  }
  // Schulformen
  const SCHULNAMEN = B.bildung.schulnamen_erfunden;
  function schultyp(name) {
    if (/Beruf|Oberstufenzentrum|Gewerbliche Schule|mbo-campus|Höhere Technische|Institut technique|Lycée professionnel|Mesleki ve Teknik/.test(name)) return 'beruf';
    if (/Sixth Form/.test(name)) return 'sixth';
    if (/İmam Hatip Lisesi/.test(name)) return 'imamhatip';
    if (/Fen Lisesi/.test(name)) return 'fen';
    if (/Koleji/.test(name)) return 'kolej';
    if (/Anadolu Lisesi/.test(name)) return 'anadolu';
    if (/Ortaokulu/.test(name)) return 'ortaokul';
    if (/Werkrealschule/.test(name)) return 'werkreal';
    if (/Realschule/.test(name)) return 'realschule';
    if (/Hauptschule/.test(name)) return 'hauptschule';
    if (/Gesamtschule/.test(name)) return 'gesamtschule';
    if (/Gemeinschaftsschule/.test(name)) return 'gemeinschaft';
    if (/Oberschule/.test(name)) return 'oberschule';
    if (/Mittelschule/.test(name)) return 'mittelschule';
    if (/\(ISS/.test(name)) return 'iss';
    if (/Sekundarschule/.test(name)) return 'sekundarschule';
    if (/vwo/.test(name) && /havo/.test(name)) return 'havo_vwo';
    if (/havo/.test(name)) return 'vmbo_havo';
    if (/vmbo/.test(name)) return 'vmbo';
    if (/Athénée|Atheneum|Collège Woluwe/.test(name)) return 'be_allgemein';
    if (/^Collège/.test(name)) return 'college';
    if (/^Lycée/.test(name)) return 'lycee';
    if (/Middle School/.test(name)) return 'middle';
    if (/High School/.test(name)) return 'high';
    if (/Charter/.test(name)) return 'charter';
    if (/Academy|Community School/.test(name) && !/British|American/.test(name)) return 'academy';
    if (/British/.test(name)) return 'ae_british';
    if (/Indian|CBSE/.test(name)) return 'ae_indian';
    if (/American/.test(name)) return 'ae_american';
    if (/Crescent/.test(name)) return 'ae_andere';
    if (/Grundschule/.test(name)) return 'bg_grund';
    if (/Profilgymnasium/.test(name)) return 'bg_profil';
    if (/Allgemeine Schule/.test(name)) return 'az_allgemein';
    if (/Lisey/.test(name)) return 'az_lyzeum';
    if (/Gimnaziyas/.test(name)) return 'az_gymnasium';
    if (/Gymnasium|Lyceum/.test(name)) return 'gymnasium';
    return 'sonstige';
  }
  const SCHULEN_ORT = {};
  for (const o of ORTE) {
    SCHULEN_ORT[o.id] = {};
    for (const n of SCHULNAMEN[o.id] || []) {
      let name = n;
      if (/Nr\. 2xx/.test(n)) name = n.replace('2xx', String(200 + (fnv(o.id + n) % 90))).replace(/\s*\(Baku nummeriert Schulen\)/, '');
      (SCHULEN_ORT[o.id][schultyp(n)] ||= []).push(name);
    }
  }
  const ersatzSchulen = new Map();
  function ersatzSchule(o, typ, st) {
    const key = o.id + '|' + typ;
    if (ersatzSchulen.has(key)) return ersatzSchulen.get(key);
    const sp = SPRACHE_LAND[o.land]; const F_ = FANTASIE[sp] || FANTASIE.de; const f = F_[fnv(key) % F_.length];
    const s0 = st.split(' ')[0];
    if (typ.startsWith('grundschule')) {
      const g = { de: `Grundschule am ${f}`, tr: `${s0} ${f} İlkokulu`, nl: `Basisschool ${f}`, fr: `École primaire ${f}`, en: `${f} Primary School`, bg: `Grundschule „${f}“`, az: `${f} İbtidai Məktəbi` }[sp] || `Grundschule ${f}`;
      ersatzSchulen.set(key, g);
      return g;
    }
    const vorlagen = {
      gymnasium: `${f}-Gymnasium`, gesamtschule: `Gesamtschule am ${f}`, realschule: `Realschule am ${f}`, hauptschule: `Hauptschule am ${f}`, sekundarschule: `Sekundarschule am ${f}`,
      iss: `Sekundarschule am ${f}`, gemeinschaft: `Gemeinschaftsschule am ${f}`, oberschule: `Oberschule am ${f}`, werkreal: `Werkrealschule am ${f}`, mittelschule: `Mittelschule ${f}`,
      anadolu: `${s0} ${f} Anadolu Lisesi`, kolej: `${f} Koleji (privat)`, fen: `${f} Fen Lisesi`, imamhatip: `${s0} ${f} Anadolu İmam Hatip Lisesi`, beruf: `Berufsschule ${f}`,
      college: `Collège ${f}`, lycee: `Lycée ${f}`, academy: `${f} Academy`, middle: `${f} Middle School`, high: `${f} High School`, charter: `${f} Charter School`,
      bg_grund: `Grundschule „${f}“`, bg_profil: `Profilgymnasium „${f}“`, az_allgemein: `Allgemeine Schule Nr. ${200 + (fnv(key) % 90)}`, az_lyzeum: `${f} Lisey`, az_gymnasium: `${f} Gimnaziyası`,
      ae_british: `${f} British School`, ae_indian: `${f} Indian School (CBSE)`, ae_american: `${f} American School`, ae_andere: `${f} International School`, sixth: `${f} Sixth Form College`,
      vmbo: `${f} College (vmbo)`, vmbo_havo: `${f} College (vmbo, havo)`, havo_vwo: `Lyceum ${f} (havo, vwo)`, be_allgemein: `Athénée ${f}`,
      foerder: `Förderschule am ${f}`, privat_de: `Freie Schule ${f} (privat)`, bg_berufs: `Berufsgymnasium ${f}`, imamhatip_orta: `${st.split(' ')[0]} ${f} İmam Hatip Ortaokulu`,
      ortaokul: `${st.split(' ')[0]} ${f} Ortaokulu`, acik: 'Açık Öğretim Lisesi (Fernschule)', grammar: `${f} Grammar School`, privat_gb: `${f} Independent School`,
      privat_us: `${f} Preparatory School (privat)`, ae_staat: 'staatliche Schule für Emiratis in Dubai', fachmittel: `Fachmittelschule ${f}`, bruecke: `Brückenangebot ${f}`,
      polytechnisch: `Polytechnische Schule ${f}`, bms: `Fachschule ${f} (BMS)`, sonder: `Sonderschule ${f}`, praktijk: `Praktijkschool ${f}`, berufsschule: `Berufsschule ${f}`,
      lycee_pro: `Lycée professionnel ${f}`, az_privat: `${f} Özəl Məktəbi (privat)`, college_fe: `${f} College (Further Education)`, mesem: 'Mesleki Eğitim Merkezi (MESEM)',
      be_technisch: `Institut ${f} (technique)`, privat_ae: `${f} Private School`, sonstige: `Schule ${f}`,
    };
    const name = vorlagen[typ] || `Schule ${f}`;
    ersatzSchulen.set(key, name);
    return name;
  }
  function waehleSchule(p, typen, ersatzTyp) {
    const o = ORT[p.ort];
    const liste = typen.flatMap(t => SCHULEN_ORT[o.id][t] || []);
    if (!liste.length) return ersatzSchule(o, ersatzTyp || typen[0], p.stadtteil);
    const st1 = p.stadtteil.split(/[\s(/]/)[0];
    return zT.gewichtet(liste.map(n => [n, (n.includes(st1) ? 3 : 1) * (1 + 2 * (schulBelegung.get(n + '|' + p.alter) || 0))]));
  }
  const schulBelegung = new Map();
  function schulformZiehen(p) {
    const a = p.alter, l = p.land, o = ORT[p.ort];
    const SF = B.bildung.schulformen_12_17;
    const gymF = (stTreffer(ST_GYM_FAKTOR, p.ort, p.stadtteil)[0] || [0, 0, 1])[2];
    const elternAkad = p.eltern.some(e => ['bachelor', 'master', 'staatsexamen', 'promotion'].includes(e.bildung?.abschluss)) ? 1.6 : 1;
    const mit = (d, gymKey) => { const r = { ...ohneMeta(d) }; if (gymKey && r[gymKey]) r[gymKey] *= gymF * elternAkad; return r; };
    if (l === 'DE') {
      if (a >= 16 && zT.chance(0.09 / 0.79)) { const x = zT.gewichtet({ Berufsfachschule: 0.05, 'Übergangssystem (Berufsvorbereitung)': 0.04 }); return { schulform: x, schule: waehleSchule(p, ['beruf'], 'berufsschule') }; }
      if (a >= 18) return { schulform: 'Gymnasiale Oberstufe', schule: waehleSchule(p, ['gymnasium', 'gesamtschule', 'iss'], 'gymnasium') };
      const land = { berlin: 'DE_berlin', koeln: 'DE_nrw', duisburg: 'DE_nrw', stuttgart: 'DE_bw', leipzig: 'DE_sachsen' }[o.id];
      const sf = zT.gewichtet(mit(SF[land], 'Gymnasium'));
      const typ = { 'Integrierte Sekundarschule oder Gemeinschaftsschule': ['iss', 'gemeinschaft', 'sekundarschule'], Gymnasium: ['gymnasium'], Förderschule: ['foerder'], Gesamtschule: ['gesamtschule'],
        Realschule: ['realschule'], Hauptschule: ['hauptschule'], Sekundarschule: ['sekundarschule'], Gemeinschaftsschule: ['gemeinschaft'], 'Werkrealschule oder Hauptschule': ['werkreal', 'hauptschule'],
        'SBBZ (Förderschule)': ['foerder'], 'Waldorf und Privatschule': ['privat_de'], Oberschule: ['oberschule'] }[sf] || ['sonstige'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'TR') {
      if (a <= 13) {
        const sf = zT.gewichtet(ohneMeta(SF.TR_12_13));
        if (sf === 'nicht in der Schule') return null;
        const typ = sf.startsWith('İmam') ? ['imamhatip_orta'] : sf.startsWith('privates') ? ['kolej'] : ['ortaokul'];
        return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
      }
      const d = { ...ohneMeta(SF.TR_14_17) }; delete d['nicht in der Schule']; delete d['MESEM (Lehre mit einem Schultag)'];
      if (gymF !== 1 || stTreffer(ST_LAGE, p.ort, p.stadtteil).some(x => x[2] > 0)) { d['Fen, Sosyal Bilimler, Güzel Sanatlar oder Spor Lisesi'] *= 1.5; d['Privatlise (Kolej)'] *= 1.8; }
      const sf = zT.gewichtet(d);
      const typ = sf.startsWith('Anadolu Lisesi') ? ['anadolu'] : sf.startsWith('Meslek') ? ['beruf'] : sf.startsWith('Anadolu İmam') ? ['imamhatip'] : sf.startsWith('Fen') ? ['fen'] : sf.startsWith('Privat') ? ['kolej'] : ['acik'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'NL') {
      const sf = zT.gewichtet(mit({ vmbo: 0.5, havo: 0.25, vwo: 0.22, praktijkonderwijs: 0.03 }, 'vwo'));
      const typ = sf === 'vmbo' ? ['vmbo', 'vmbo_havo'] : sf === 'havo' ? ['vmbo_havo', 'havo_vwo'] : sf === 'vwo' ? ['havo_vwo'] : ['praktijk'];
      if (a >= 16 && sf === 'vmbo') return { schulform: 'mbo', schule: waehleSchule(p, ['beruf'], 'berufsschule') };
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'BE') {
      const sf = zT.gewichtet(ohneMeta(SF.BE));
      const typ = sf.startsWith('allgemein') ? ['be_allgemein'] : sf.startsWith('technisch') || sf.startsWith('beruflich') ? ['beruf'] : ['sonder'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0] === 'beruf' ? 'be_technisch' : typ[0]) };
    }
    if (l === 'AT') {
      if (a <= 14) { const sf = zT.gewichtet(mit(SF.AT_wien_10_14, 'AHS (Gymnasium)')); const typ = sf === 'Mittelschule' ? ['mittelschule'] : sf.startsWith('AHS') ? ['gymnasium'] : ['sonder']; return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) }; }
      const d = { ...ohneMeta(SF.AT_15_17) }; delete d['Lehre mit Berufsschule']; delete d['ohne Ausbildung'];
      const sf = zT.gewichtet(d);
      const typ = sf.startsWith('AHS') ? ['gymnasium'] : sf.startsWith('BHS') ? ['beruf'] : sf.startsWith('Fachschule') ? ['bms'] : ['polytechnisch'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'CH') {
      if (a <= 14) { const sf = zT.gewichtet(mit(SF.CH_12_14, 'Sekundarschule Zug P oder Gymnasium')); const typ = sf.startsWith('Sonder') ? ['sonder'] : ['sekundarschule']; return { schulform: sf, schule: waehleSchule(p, sf.includes('Gymnasium') ? ['gymnasium', 'sekundarschule'] : typ, typ[0]) }; }
      const d = { ...ohneMeta(SF.CH_15_17) }; delete d['Berufslehre (EFZ oder EBA)']; delete d.ohne;
      const sf = zT.gewichtet(d);
      const typ = sf === 'Gymnasium' ? ['gymnasium'] : sf === 'Fachmittelschule' ? ['fachmittel'] : ['bruecke'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'GB') {
      if (a <= 15) { const sf = zT.gewichtet(ohneMeta(SF.GB_12_15)); const typ = sf.startsWith('Comprehensive') ? ['academy'] : sf.startsWith('Grammar') ? ['grammar'] : ['privat_gb']; return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) }; }
      const sf = zT.gewichtet({ 'Sixth Form (A-Levels)': 0.45, 'College (BTEC, T-Levels)': 0.4 });
      return { schulform: sf, schule: waehleSchule(p, sf.startsWith('Sixth') ? ['sixth'] : ['college_fe'], sf.startsWith('Sixth') ? 'sixth' : 'college_fe') };
    }
    if (l === 'US') {
      const sf = zT.gewichtet(ohneMeta(SF.US));
      if (sf.startsWith('Homeschooling')) return { schulform: sf, schule: 'Unterricht zu Hause' };
      const typ = sf.startsWith('Charter') ? ['charter'] : sf.startsWith('Privat') ? ['privat_us'] : (a <= 13 ? ['middle'] : ['high']);
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'FR') {
      if (a <= 14) return { schulform: 'collège', schule: waehleSchule(p, ['college'], 'college') };
      const sf = zT.gewichtet({ 'lycée général et technologique': 0.6, 'lycée professionnel': 0.3 });
      return { schulform: sf, schule: waehleSchule(p, sf.includes('professionnel') ? ['beruf'] : ['lycee'], sf.includes('professionnel') ? 'lycee_pro' : 'lycee') };
    }
    if (l === 'BG') {
      if (a <= 13) return { schulform: 'Grundschule (bis Klasse 7)', schule: waehleSchule(p, ['bg_grund'], 'bg_grund') };
      const sf = zT.gewichtet({ Profilgymnasium: 0.5, Berufsgymnasium: 0.42 });
      return { schulform: sf, schule: waehleSchule(p, sf === 'Profilgymnasium' ? ['bg_profil'] : ['beruf'], sf === 'Profilgymnasium' ? 'bg_profil' : 'bg_berufs') };
    }
    if (l === 'AE') {
      const sf = p.herkunft[0] === 'ar_golf' ? 'staatliche Schule (Emiratis)' : zT.gewichtet({ 'Privatschule britischer Lehrplan': 0.35, 'Privatschule indischer Lehrplan (CBSE)': p.herkunft[0] === 's_asien' ? 1.2 : 0.3, 'Privatschule amerikanischer Lehrplan': 0.12, 'andere Lehrpläne (türkisch, philippinisch, französisch)': p.herkunft[0] === 'tr' ? 0.8 : 0.08 });
      const typ = sf.includes('britischer') ? ['ae_british'] : sf.includes('indischer') ? ['ae_indian'] : sf.includes('amerikanischer') ? ['ae_american'] : sf.includes('andere') ? ['ae_andere'] : ['ae_staat'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    if (l === 'AZ') {
      const sf = zT.gewichtet(ohneMeta(SF.AZ));
      const typ = sf.startsWith('allgemeine') ? ['az_allgemein'] : sf.startsWith('Lyzeum') ? ['az_lyzeum', 'az_gymnasium'] : ['az_privat'];
      return { schulform: sf, schule: waehleSchule(p, typ, typ[0]) };
    }
    return { schulform: 'allgemeinbildende Schule', schule: ersatzSchule(o, 'sonstige', p.stadtteil) };
  }
  function klasseLabel(p, sf, schule) {
    const a = p.alter, l = p.land;
    const buchstabe = 'abc'[fnv(schule + '|' + a) % 3];
    if (l === 'DE') return `Klasse ${Math.min(13, a - 5)}${buchstabe}`;
    if (l === 'TR') return `${Math.min(12, a - 5)}. Sınıf ${buchstabe.toUpperCase()}`;
    if (l === 'NL') return `klas ${Math.max(1, a - 11)}`;
    if (l === 'BE') return `${Math.max(1, a - 11)}e secondaire`;
    if (l === 'AT') return `${Math.max(1, a - 9)}. Klasse ${buchstabe}`;
    if (l === 'CH') return a <= 14 ? `${Math.max(1, a - 11)}. Sek` : `${a - 14}. Jahr`;
    if (l === 'GB') return `Year ${Math.min(13, a - 4)}`;
    if (l === 'US') return `Grade ${Math.min(12, a - 5)}`;
    if (l === 'FR') return { 12: '5e', 13: '4e', 14: '3e', 15: 'seconde', 16: 'première', 17: 'terminale' }[a] || 'terminale';
    if (l === 'BG') return `${Math.min(12, a - 6)}. Klasse`;
    if (l === 'AE') return /britischer/.test(sf) ? `Year ${Math.min(13, a - 4)}` : `Grade ${Math.min(12, a - 5)}`;
    if (l === 'AZ') return `${Math.min(11, a - 5)}. Klasse`;
    return `Klasse ${a - 5}`;
  }
  // Studienfach und Hochschule muessen zusammenpassen (keine Psychologie an der Wirtschaftsuniversitaet)
  function fachPasst(fach, h) {
    const tech = /Informatik|Maschinenbau|Elektrotechnik|Bauingenieur|Architektur|Physik|Chemie|Mathematik|Data Science|Wirtschaftsingenieur|Logistik/.test(fach);
    const wirt = /BWL|VWL|Wirtschaftsinformatik|Tourismus|Logistik|Internationale/.test(fach);
    const medien = /Medien|Design/.test(fach);
    const sozial = /Soziale Arbeit|Pflege|Erziehung/.test(fach);
    const nurUni = /Medizin|Zahnmedizin|Pharmazie|Jura|Lehramt|Psychologie|Physik|Geschichte|Germanistik|Anglistik|Islamische Theologie|Politik|Soziologie|Biologie/.test(fach);
    if (/Sporthochschule/.test(h)) return /Sport/.test(fach) ? 8 : 0;
    if (/Alice Salomon/.test(h)) return sozial ? 6 : 0;
    if (/Hochschule der Medien/.test(h)) return medien || /Informatik|Wirtschaftsinformatik/.test(fach) ? 6 : 0;
    if (/WU Wien|İktisat|UNEC/.test(h)) return wirt ? 6 : 0;
    if (/Technische|TU |İstanbul Teknik|Yıldız Teknik|ODTÜ|Teknik Üniversitesi/.test(h)) return tech || wirt ? 4 : 0;
    if (/HTW|HTWK|TH Köln|Hochschule für Technik|Fachhochschule|FH Campus|Hochschule Ruhr West|Hogeschool|DHBW|Community College|Middlesex/.test(h)) return nurUni ? 0 : tech || wirt || sozial || medien ? 3 : 1;
    if (/Zweigcampus|Zayed/.test(h)) return /Medizin|Zahnmedizin|Pharmazie|Jura|Lehramt|Islamische/.test(fach) && /Zweigcampus/.test(h) ? 0 : 1;
    return /Sport/.test(fach) ? 0.5 : 1;
  }
  // Abschluesse Erwachsener
  const AE_ = B.bildung.abschluesse_erwachsene;
  function abschlussZiehen(p) {
    const a = p.alter, l = p.land, h = p.herkunft[0];
    const key = a < 35 ? '25-34' : a < 50 ? '35-49' : a < 65 ? '50-64' : '65+';
    if (l === 'DE' && (p.gen === null || p.gen >= 2 || ['de', 'eu_expat'].includes(h))) {
      if (p.ort === 'leipzig' && h === 'de' && a >= 50) {
        const be = zT.gewichtet({ ausbildung: 0.85, fachschule: 0.08, master_diplom: 0.07 });
        return { abschluss: be === 'master_diplom' ? 'master' : be, schule: 'POS-Abschluss (10. Klasse)', beruf: be === 'master_diplom' ? 'Diplom' : be === 'fachschule' ? 'Meister oder Techniker' : 'Facharbeiterabschluss' };
      }
      let s = zT.gewichtet(ohneMeta(AE_.DE_schulabschluss[key]));
      let be = zT.gewichtet(ohneMeta(AE_.DE_berufsabschluss[key]));
      if (p.gen === 2 && zT.chance(0.25)) { if (be === 'master_diplom' || be === 'bachelor') be = 'ausbildung'; }
      if (['bachelor', 'master_diplom', 'promotion'].includes(be)) s = 'abitur_fachabitur';
      const sText = { ohne: 'ohne Schulabschluss', hauptschule: 'Hauptschulabschluss', mittlere_reife: 'Mittlere Reife', abitur_fachabitur: zT.chance(0.25) ? 'Fachabitur' : 'Abitur' }[s];
      const code = be === 'ohne' ? (s === 'ohne' ? 'keine' : 'anlern') : be === 'master_diplom' ? 'master' : be;
      const bText = { ohne: 'ohne Berufsabschluss', ausbildung: 'Berufsausbildung', fachschule: 'Meister oder Techniker', bachelor: 'Bachelor', master_diplom: zT.chance(0.5) ? 'Master' : 'Diplom', promotion: 'Promotion' }[be];
      return { abschluss: code, schule: sText, beruf: bText };
    }
    if (l === 'DE' && p.gen === 1) {
      if (a >= 55 && TR_WURZELN.has(h)) return zT.chance(0.65) ? { abschluss: 'keine', schule: 'Grundschule im Herkunftsland', beruf: 'ohne Berufsabschluss' } : { abschluss: 'ausbildung', schule: 'Schulabschluss im Herkunftsland', beruf: 'Berufsausbildung' };
      const x = zT.gewichtet({ hoch: 0.33, ausb: 0.27, ohne: 0.36, fach: 0.04 });
      if (x === 'hoch') { const m = zT.chance(0.45); return { abschluss: m ? 'master' : 'bachelor', schule: 'Hochschulreife im Herkunftsland', beruf: (m ? 'Master' : 'Bachelor') + ' im Herkunftsland' }; }
      if (x === 'ausb') return { abschluss: 'ausbildung', schule: 'Schulabschluss im Herkunftsland', beruf: 'Berufsausbildung' };
      if (x === 'fach') return { abschluss: 'fachschule', schule: 'Schulabschluss im Herkunftsland', beruf: 'Fachschule' };
      return { abschluss: zT.chance(0.35) ? 'keine' : 'anlern', schule: zT.chance(0.5) ? 'Schulabschluss im Herkunftsland' : 'wenige Schuljahre', beruf: 'ohne Berufsabschluss' };
    }
    if (l === 'TR' || (TUERKISCHSPRACHIG.has(h) && p.gen === 1 && a >= 55)) {
      const d = { ...ohneMeta(AE_.TR_hoechster_abschluss[key]) };
      if (p.geschlecht === 'w' && a >= 50) { d.keine *= 1.6; d.ilkokul *= 1.4; }
      if (p.ort === 'diyarbakir' && a >= 40) { d.keine *= 1.8; d.ilkokul *= 1.2; }
      if (stTreffer(ST_LAGE, p.ort, p.stadtteil).some(x => x[2] > 0)) { d.lisans *= 1.5; d.yuksek_lisans_doktora *= 1.6; }
      const x = zT.gewichtet(d);
      const map = { keine: ['keine', 'ohne Schulabschluss'], ilkokul: ['keine', 'İlkokul (Grundschule)'], ortaokul: ['anlern', 'Ortaokul (Mittelschule)'], lise_allgemein: ['anlern', 'Lise (Gymnasium)'],
        lise_beruflich: ['ausbildung', 'Meslek Lisesi (berufliches Gymnasium)'], onlisans: ['fachschule', 'Önlisans (2 Jahre Hochschule)'], lisans: ['bachelor', 'Lisans (Bachelor)'],
        yuksek_lisans_doktora: zT.chance(0.15) ? ['promotion', 'Doktora (Promotion)'] : ['master', 'Yüksek Lisans (Master)'] }[x];
      return { abschluss: map[0], schule: map[1], beruf: null };
    }
    let hoch = AE_.andere_laender_25_64.hochschule[l] ?? 0.3, ohne = AE_.andere_laender_25_64.ohne_sekundarabschluss[l] ?? 0.15;
    if (l === 'AE') { hoch = { ar_golf: 0.5, eu_expat: 0.8, tr: 0.6, ar_levante: 0.45, ir: 0.5, s_asien: 0.3, ph: 0.35, afr_ost: 0.15 }[h] ?? 0.4; ohne = { s_asien: 0.3, afr_ost: 0.4, ph: 0.15 }[h] ?? 0.08; if (ARBEITSMIGRATION_AE.has(h) && p.hh.form === 'arbeiterunterkunft') { hoch *= 0.3; ohne *= 1.8; } }
    if (a < 35) hoch *= 1.15; else if (a >= 65) { hoch *= 0.6; ohne *= 1.4; } else if (a >= 50) hoch *= 0.8;
    if (p.gen === 1 && ['ar_levante', 'af', 'afr_west', 'afr_ost', 'afr_zentral', 'roma'].includes(h)) { ohne *= 1.6; hoch *= 0.8; }
    if (p.gen === 1 && TR_WURZELN.has(h) && a >= 50) { ohne *= 2; hoch *= 0.5; }
    if (h === 'eu_expat') hoch = Math.min(0.85, hoch * 1.6);
    hoch = Math.min(0.85, hoch); ohne = Math.min(0.7, ohne);
    const mitte = Math.max(0, 1 - hoch - ohne);
    const x = zT.gewichtet({ keine: ohne * 0.4, anlern: ohne * 0.6, ausbildung: mitte * 0.85, fachschule: mitte * 0.15, bachelor: hoch * 0.6, master: hoch * 0.36, promotion: hoch * 0.04 });
    const text = { keine: 'ohne Sekundarabschluss', anlern: 'Sekundarabschluss ohne Berufsausbildung', ausbildung: 'Sekundarabschluss und Berufsausbildung', fachschule: 'Berufsausbildung mit Weiterbildung (Fachschule)', bachelor: 'Hochschulabschluss (Bachelor)', master: 'Hochschulabschluss (Master)', promotion: 'Promotion' }[x];
    return { abschluss: x, schule: text, beruf: null };
  }
  // Berufswahl aus dem Katalog
  const MODERN = /App-|Apps|Online|Social-Media|Content|DevOps|UX-|KI- und|E-Commerce|Data Scientist|Influencer|Streamer|Shopify|Clickworker|Webdesigner|Frontend|Game Artist|Spieleentwickler|E-Sportler|IT-Sicherheit|Photovoltaik|Windkraft|Second-Hand/;
  const berufZaehlerGlobal = new Map(), berufZaehlerOrt = new Map();
  const DIVERS = 4.5, GEWICHT_EXP = 0.55;
  function berufPasst(j, p) { return j.laender === 'alle' || j.laender.includes(p.land); }
  function waehleBeruf(p, opts = {}) {
    const lvl = Math.max(1, STUFE_BILDUNG[p.bildung.abschluss] ?? 1);
    const quer = opts.quer === true;
    const e = [];
    for (const j of KATALOG) {
      if (!berufPasst(j, p)) continue;
      if (opts.filter && !opts.filter(j)) continue;
      const jl = j.sb;
      if (j.bildung === 'staatsexamen' && !['master', 'staatsexamen', 'promotion'].includes(p.bildung.abschluss)) continue;
      if (j.bildung === 'promotion' && p.bildung.abschluss !== 'promotion') continue;
      if (jl > lvl && !(quer && jl === lvl + 1 && !['staatsexamen', 'promotion', 'master'].includes(j.bildung) && j.branche !== 'gesundheit' && j.branche !== 'recht')) continue;
      let w = Math.pow(j.gewicht, GEWICHT_EXP);
      const fr = klemme(j.frauen, 0.03, 0.97);
      w *= p.geschlecht === 'w' ? fr : 1 - fr;
      const diff = lvl - Math.max(1, jl);
      w *= diff <= 0 ? 1 : diff === 1 ? 0.55 : diff === 2 ? 0.25 : 0.1;
      if (j.stufe === 5 && p.alter < 30) w *= 0.15;
      if (j.stufe >= 4 && p.alter < 26) w *= 0.3;
      if (/Inhaber|Betreiber|Geschäftsführer|Pächter/.test(j.titel) && p.alter < 24) w *= 0.15;
      if (/Professor|Schulleiter|Richter|Notar|Kita-Leitung|Pflegedienstleitung/.test(j.titel) && p.alter < 36) w *= 0.08;
      if (/Doktorand|Lehramtsanwärter|Assistenzärzt/.test(j.titel) && p.alter > 38) w *= 0.1;
      if (/Au-pair|Saisonkraft|Animateur|Erntehelfer/.test(j.titel) && p.alter > 40) w *= 0.2;
      if (/Halbprofi|E-Sportler|Influencer/.test(j.titel) && p.alter > 35) w *= 0.15;
      if (j.branche === 'landwirtschaft' && !/Gärtner|Tierpfleger|Hundefriseur|Imker|Agraringenieur/.test(j.titel)) w *= istLaendlich(p.ort, p.stadtteil) ? 3 : ['kardschali', 'kayseri', 'diyarbakir'].includes(p.ort) ? 0.6 : 0.12;
      if (/Hafen|Kranführer/.test(j.titel) && !['rotterdam', 'duisburg', 'london', 'dubai'].includes(p.ort)) continue;
      if (/Skilehrer/.test(j.titel) && !['kayseri', 'wien', 'basel'].includes(p.ort)) continue;
      if (/Antalya|Küste|Fährpersonal|Fischer/.test(j.titel) && ['kayseri', 'ankara', 'diyarbakir', 'leipzig', 'stuttgart'].includes(p.ort)) continue;
      if (/Tabak/.test(j.titel) && p.ort !== 'kardschali' && p.land !== 'TR') continue;
      if (p.land === 'AE' && ARBEITSMIGRATION_AE.has(p.herkunft[0]) && ['bau', 'reinigung', 'haushalt', 'logistik', 'gastro', 'verkehr', 'handel', 'oeffentlich'].includes(j.branche)) w *= 2;
      // neue Berufe passen kaum zu Aelteren (frueherer Beruf von Rentnern erst recht nicht)
      if (MODERN.test(j.titel) || j.branche === 'plattform') { if (opts.frueher && p.alter >= 55) continue; if (p.alter >= 60) w *= 0.1; else if (p.alter >= 50) w *= 0.35; }
      if (opts.frueher && p.alter >= 68 && /Barkeeper|Shisha|Tätowierer|DJ|Türsteher|Barista|Callcenter|Mobilfunkladen|Fitnesstrainer|Yoga|Nageldesign|Kurier|Lieferdienst/.test(j.titel)) w *= 0.05;
      // Berufe, die es erst seit den 1990ern gibt, passen nicht zum frueheren Beruf heute ueber 68-Jaehriger
      if (opts.frueher && p.alter >= 68 && /Mediengestalter|Fachinformatiker|Mechatroniker|IT-|Software|Daten|Web|Handy|Podologe|Pflegedienstleitung|Fachkraft für Lagerlogistik|Medizinische\/r Technologe|Operationstechnische/.test(j.titel)) continue;
      if (opts.jung && /Inhaber|Betreiber|Fahrer|Sicherheit|Pflege|Taxi|Lkw/.test(j.titel)) continue;
      const cg = berufZaehlerGlobal.get(j.nr) || 0, co = berufZaehlerOrt.get(p.ort + '|' + j.nr) || 0;
      if (!opts.ohneVielfalt) {
        if (j.gewicht < 6 && co >= 3) continue;
        w *= 1 / Math.pow(1 + DIVERS * cg, 2);
      }
      if (w > 0) e.push([j, w]);
    }
    const j = zT.gewichtet(e);
    if (j && !opts.ohneVielfalt) { berufZaehlerGlobal.set(j.nr, (berufZaehlerGlobal.get(j.nr) || 0) + 1); berufZaehlerOrt.set(p.ort + '|' + j.nr, (berufZaehlerOrt.get(p.ort + '|' + j.nr) || 0) + 1); }
    return j;
  }
  function teilzeit(p, j) {
    const frau = p.geschlecht === 'w';
    let q = { DE: frau ? 0.5 : 0.14, NL: frau ? 0.65 : 0.2, AT: frau ? 0.49 : 0.12, CH: frau ? 0.58 : 0.18, BE: frau ? 0.4 : 0.1, FR: frau ? 0.27 : 0.08, GB: frau ? 0.38 : 0.13, US: frau ? 0.22 : 0.1, TR: frau ? 0.18 : 0.06, BG: 0.03, AZ: 0.06, AE: 0.04 }[p.land] ?? 0.15;
    if (j.zeiten.includes('teilzeit')) q = Math.min(0.9, q + 0.3);
    if ((p.kleineKinderAlter || []).length && frau) q = Math.min(0.95, q * 1.4);
    if (p.alter < 20) q = Math.max(q, 0.3);
    return zT.chance(q);
  }
  // Kinder unter 12 je Person (im Haushalt oder extern)
  for (const hh of HAUSHALTE) for (const k of hh.mitglieder.filter(x => !istFigur(x))) for (const e of k.eltern) (e.kleineKinderAlter ||= []).push(k.alter);
  for (const p of alleP) if (p.info.kleineKinderExtern) (p.kleineKinderAlter ||= []).push(...p.info.kleineKinderExtern);

  const zSt = Z('status');
  // Reihenfolge: Eltern vor Kindern (fuer Schulwahl nach Elternbildung)
  const nachAlterAb = [...F].sort((a, b) => b.alter - a.alter);
  for (const p of nachAlterAb) {
    if (p.info.ausnahme) { p.status = 'schule'; }
    else if (p.hh.form === 'arbeiterunterkunft') p.status = 'erwerbstaetig';
    else if ((p.land === 'TR' || p.land === 'AZ') ? p.alter <= 13 : p.alter <= 14) p.status = 'schule';
    else p.status = zSt.gewichtet(statusVerteilung(p)) || 'erwerbstaetig';
    if (p.hh.form === 'wohnheim') p.status = 'studium';
    if (p.hh.form === 'wg' && p.alter <= 26 && zSt.chance(0.55) && p.alter >= 18) p.status = 'studium';
  }
  // Bildung je Status
  for (const p of nachAlterAb) {
    const a = p.alter;
    if (p.status === 'schule') {
      const s = schulformZiehen(p);
      if (!s) { p.status = a >= 14 && p.land === 'TR' ? 'erwerbstaetig' : 'neet'; }
      else {
        const fern = /Açık Öğretim|Unterricht zu Hause/.test(s.schule);
        const klasse = fern ? null : klasseLabel(p, s.schulform, s.schule);
        p.bildung = { stufe: 'schule', abschluss: 'keine', schulform: s.schulform, schule: s.schule, klasse };
        schulBelegung.set(s.schule + '|' + a, (schulBelegung.get(s.schule + '|' + a) || 0) + 1);
        continue;
      }
    }
    if (p.status === 'studium') {
      const hs = (B.bildung.hochschulen_real[p.ort] || ['Hochschule am Ort']).filter(h => !/Açıköğretim|Fernstudium/.test(h));
      const fernstudium = p.land === 'TR' && zT.chance(0.2);
      let fach = null, hochschule = null;
      for (let t = 0; t < 20 && !hochschule; t++) {
        fach = zT.gewichtet(FAECHER.map(([n, f]) => [n, p.geschlecht === 'w' ? f : 1 - f]));
        if (fernstudium) { hochschule = 'Anadolu Üniversitesi Açıköğretim (Fernstudium)'; break; }
        const opts = hs.map(h => [h, fachPasst(fach, h)]).filter(([, w]) => w > 0);
        hochschule = opts.length ? zT.gewichtet(opts) : null;
      }
      if (!hochschule) hochschule = zT.wahl(hs);
      const semester = klemme(1 + 2 * (a - 19) + zT.ganz(0, 1), 1, 12);
      const sAbschl = p.land === 'DE' ? (zT.chance(0.8) ? 'Abitur' : 'Fachabitur') : p.land === 'TR' ? 'Lise' : 'Hochschulreife';
      p.bildung = { stufe: 'studium', abschluss: a >= 23 && zT.chance(0.35) ? 'bachelor' : 'anlern', schule: sAbschl, hochschule, fach, semester };
      continue;
    }
    if (p.status === 'ausbildung') {
      const sAbschl = p.land === 'DE' ? zT.gewichtet({ Hauptschulabschluss: 0.25, 'Mittlere Reife': 0.5, Abitur: 0.25 }) : p.land === 'TR' ? 'Ortaokul' : 'Sekundarabschluss I';
      p.bildung = { stufe: 'ausbildung', abschluss: 'anlern', schule: sAbschl };
      const j = waehleBeruf({ ...p, bildung: { abschluss: 'ausbildung' } }, { filter: x => x.bildung === 'ausbildung', ohneVielfalt: true });
      p.ausbildungsJob = j;
      const typ = p.land === 'TR' ? 'mesem' : p.land === 'AT' || p.land === 'CH' ? 'berufsschule' : 'berufsschule';
      p.bildung.beruf = j ? j.titel : 'Ausbildung';
      p.bildung.berufsschule = p.land === 'TR' ? ersatzSchule(ORT[p.ort], 'mesem', p.stadtteil) : waehleSchule(p, ['beruf'], typ);
      p.bildung.lehrjahr = klemme(a - 15 - zT.ganz(0, 2), 1, 3);
      continue;
    }
    if (a <= 17) {
      // Minderjaehrige ohne Schule (Abbruch, Arbeit): Abschluss nach Alter
      const txt = { TR: 'Ortaokul, danach Schule abgebrochen', DE: 'Schule ohne Abschluss verlassen' }[p.land] || 'Schule abgebrochen';
      p.bildung = { stufe: 'abschluss', abschluss: a >= 15 ? 'anlern' : 'keine', schule: txt };
      continue;
    }
    const ab = abschlussZiehen(p);
    // Altersgrenzen: kein Master mit 21, keine Promotion mit 25
    const kappe = a < 22 ? 2 : a < 25 ? 4 : a < 28 ? 5 : 6;
    if ((STUFE_BILDUNG[ab.abschluss] ?? 0) > kappe) {
      ab.abschluss = kappe === 2 ? (zT.chance(0.6) ? 'ausbildung' : 'anlern') : kappe === 4 ? 'bachelor' : 'master';
      ab.beruf = { ausbildung: 'Berufsausbildung', anlern: 'ohne Berufsabschluss', bachelor: 'Bachelor', master: 'Master' }[ab.abschluss];
      if (p.land !== 'DE') ab.schule = { ausbildung: 'Sekundarabschluss und Berufsausbildung', anlern: 'Sekundarabschluss ohne Berufsausbildung', bachelor: 'Hochschulabschluss (Bachelor)', master: 'Hochschulabschluss (Master)' }[ab.abschluss];
    }
    if (a < 20 && ab.abschluss === 'ausbildung') { ab.abschluss = 'anlern'; ab.beruf = 'noch ohne Berufsabschluss'; }
    p.bildung = { stufe: 'abschluss', abschluss: ab.abschluss, schule: ab.schule };
    if (ab.beruf) p.bildung.beruf = ab.beruf;
  }
  // Beruf fuer Erwerbstaetige (zufaellige Reihenfolge wegen Vielfaltsgewicht)
  const erwerbs = zT.mischen(F.filter(p => p.status === 'erwerbstaetig'));
  for (const p of erwerbs) {
    let quer = zT.chance(0.06);
    let j = waehleBeruf(p, { quer, jung: p.alter < 18 });
    if (!j) { quer = false; j = waehleBeruf(p, { jung: p.alter < 18, ohneVielfalt: true }); }
    if (!j) throw new Error('Kein Beruf fuer ' + p.id);
    p.job = j;
    const jl = j.sb, pl = Math.max(1, STUFE_BILDUNG[p.bildung.abschluss] ?? 1);
    if (j.bildung === 'staatsexamen' && p.bildung.abschluss === 'master') { p.bildung.abschluss = 'staatsexamen'; p.bildung.beruf = 'Staatsexamen'; }
    if (jl > pl) p.bildungAusnahme = 'Quereinstieg: arbeitet ohne den üblichen Abschluss, mit Berufserfahrung und Einarbeitung';
    if (pl - Math.max(1, jl) >= 2 && p.gen === 1 && !['eu_expat', 'de'].includes(p.herkunft[0]) && zT.chance(0.7)) p.bildungHinweis = 'arbeitet unter der eigenen Qualifikation (Abschluss aus dem Herkunftsland nicht anerkannt)';
  }
  // Elternzeit: Beruf, zu dem die Person zurueckkehrt; Rente, Arbeitslos u. a.: frueherer Beruf
  for (const p of F) {
    if (p.status === 'elternzeit') p.job = waehleBeruf(p, { ohneVielfalt: true });
    const trFrau = ['TR', 'AZ'].includes(p.land) && p.geschlecht === 'w' && p.alter >= 55;
    if (p.status === 'rente' && trFrau && zT.chance(0.55)) { p.renteHinweis = p.familienstand === 'verwitwet' ? 'Witwenrente' : 'Rente über die Versicherung des Mannes'; continue; }
    if (p.status === 'haushalt' && trFrau && zT.chance(0.8)) continue;
    if (['rente', 'arbeitslos', 'erwerbsunfaehig'].includes(p.status) || (p.status === 'haushalt' && p.alter >= 30 && zT.chance(0.5))) {
      if (!(p.status === 'arbeitslos' && p.alter < 22 && zT.chance(0.5))) p.frueherJob = waehleBeruf(p, { ohneVielfalt: true, frueher: true });
    }
  }
  // Erwerbsform, Arbeitszeit, Nebenjob
  const SELBST = B.taetigkeiten.status.erwerbsform.selbststaendig_anteil_an_erwerbstaetigen;
  for (const p of F) {
    if (p.job && (p.status === 'erwerbstaetig' || p.status === 'elternzeit')) {
      const j = p.job;
      p.erwerbsform = j.branche === 'selbststaendig' || /Inhaber|Betreiber|selbstständig|Freelancer|Freiberufliche|eigenem Hof|eigener Praxis|eigener Werkstatt|Subunternehmer|Handelsvertreter|Influencer|Streamer|Kleinbauer|Tabakbauer|Viehhalter/.test(j.titel) ? 'selbststaendig' : 'angestellt';
      if (p.erwerbsform === 'angestellt' && /Fotograf|DJ|Tätowierer|Hochzeitsmusiker|Kunsthandwerker|Spieleautor|Heilpraktiker|Hebamme|Übersetzer|Illustrator|Imker|Hochzeitsplaner|Nachhilfelehrer|Babysitter|Putzhilfe/.test(j.titel) && zT.chance(0.6)) p.erwerbsform = 'selbststaendig';
      if (p.erwerbsform === 'angestellt' && zT.chance((SELBST[p.land] ?? 0.1) * 0.25) && ['handwerk', 'bau', 'it', 'medien', 'beauty', 'verkehr', 'kunst'].includes(j.branche)) p.erwerbsform = 'selbststaendig';
      if (p.land === 'TR' && p.erwerbsform === 'angestellt' && ['industrie', 'bau', 'landwirtschaft', 'gastro', 'handel', 'reinigung', 'haushalt'].includes(j.branche) && zT.chance(0.35)) p.erwerbsform = 'ohne Anmeldung';
      if (p.alter < 18 && p.land === 'TR') p.erwerbsform = 'ohne Anmeldung';
      p.arbeitszeit = { umfang: teilzeit(p, j) ? 'Teilzeit' : 'Vollzeit', zeiten: j.zeiten.filter(x => x !== 'teilzeit') };
    }
    const nebenP = p.status === 'studium' ? (['TR', 'AZ'].includes(p.land) ? 0.3 : 0.5) : (p.status === 'schule' && p.alter >= 16) ? 0.15 : p.status === 'rente' && p.alter < 72 ? (p.land === 'TR' && p.geschlecht === 'm' ? 0.2 : 0.08) : 0;
    if (nebenP && zT.chance(nebenP)) {
      const j = waehleBeruf({ ...p, bildung: { abschluss: 'anlern' } }, { ohneVielfalt: true, filter: x => x.sb <= 1 && ['gastro', 'handel', 'logistik', 'plattform', 'bildung', 'haushalt', 'buero', 'sport'].includes(x.branche) && !/Inhaber|Betreiber/.test(x.titel), jung: p.alter < 18 });
      if (j) p.nebenjob = j;
    }
  }

  // Sprachen (Englisch haengt von Status und Bildung ab, deshalb erst hier)
  for (const p of F) p.sprachen = sprachenFuer(p);

  // ---------- 10. Betriebe und Kollegen ----------
  const zBt = Z('betriebe');
  const BETRIEBE = [];
  const namenBenutzt = new Set();
  // Fantasiewort: Grundwort, bei Deutsch und Tuerkisch auch zusammengesetzt (mehr Vielfalt, weniger Wiederholung)
  const VORSILBE = { de: ['Linden', 'Rosen', 'Birken', 'Falken', 'Quell', 'Stern', 'Eichen', 'Ahorn', 'Kranich', 'Weiden', 'Sonnen', 'Mühlen'], tr: ['Yeni', 'Altın', 'Mavi', 'Yeşil', 'Güneş', 'Ay', 'Deniz', 'Gök'] };
  const NACHSILBE = { de: ['hof', 'hain', 'feld', 'blick', 'grund', 'tal', 'stein', 'bach', 'eck', 'weg'], tr: ['yıldız', 'ışık', 'vadi', 'köprü', 'bahçe', 'kule', 'liman', 'yol'] };
  function fantasie(sp) {
    const F_ = FANTASIE[sp] || FANTASIE.de;
    if (VORSILBE[sp] && zBt.chance(0.6)) { const w = zBt.wahl(VORSILBE[sp]) + zBt.wahl(NACHSILBE[sp]); return sp === 'tr' ? w.charAt(0) + w.slice(1).toLocaleLowerCase('tr') : w; }
    return zBt.wahl(F_);
  }
  function nameAusVorlage(art, sub, land, o, nachnamePool) {
    const sp = SPRACHE_LAND[land] || 'de';
    const s = sub && BETRIEB_SUB_NAMEN[sub];
    if (s && s.oeff) return null;
    const def = BETRIEB[art];
    if (!s && (!def || def.privat || def.oeff)) return null;
    const vor = s ? (s[sp] || s[sp === 'az' || sp === 'bg' ? (s.tr && sp === 'az' ? 'tr' : 'en') : 'de'] || s.de) : (def.v[sp] || def.v.de);
    for (let t = 0; t < 12; t++) {
      const v = zBt.wahl(vor);
      const nn = zBt.wahl(nachnamePool).split('/')[0];
      const name = v.replace('{F}', fantasie(sp)).replace('{N}', nn);
      if (!namenBenutzt.has(o.id + '|' + name)) { namenBenutzt.add(o.id + '|' + name); return name; }
    }
    return null;
  }
  function nachnamenPoolFuer(o) {
    const h = Object.entries(o.herkunft).sort((a, b) => b[1] - a[1])[0][0];
    const pool = NP[h]?.nachnamen || NP[{ eu_expat: 'it' }[h]]?.nachnamen || NP.tr.nachnamen;
    return (zBt.chance(0.7) ? pool : (NP[zBt.wahl(Object.keys(o.herkunft))]?.nachnamen || pool)).filter(n => !AUS_N.has(normName(n.split('/')[0])));
  }
  const arbeitende = F.filter(p => p.job && (p.status === 'erwerbstaetig' || p.status === 'elternzeit'));
  const nachOrtArt = new Map();
  for (const p of arbeitende) {
    const art = betriebsArt(p.job); const sub = ['plattform', 'privat', 'schule', 'hochschule'].includes(art) ? '' : (betriebsSub(p.job) || '');
    p.betriebsArt = art;
    const k = p.ort + '|' + art + '|' + sub; if (!nachOrtArt.has(k)) nachOrtArt.set(k, []); nachOrtArt.get(k).push(p);
  }
  const TEAMBAR = new Set(['krankenhaus', 'pflegeheim', 'pflegedienst', 'praxis', 'kita', 'traeger', 'laden', 'gastro', 'lebensmittel', 'logistik', 'verkehr', 'baufirma', 'handwerk', 'werkstatt', 'fabrik', 'stadtwerke', 'firma', 'kanzlei', 'gericht', 'amt', 'polizei', 'feuerwehr', 'armee', 'sicherheit', 'salon', 'sport', 'reinigung', 'medien', 'schule', 'hochschule', 'apotheke', 'gemeinde', 'hof']);
  for (const [k, liste] of [...nachOrtArt.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [oid, art, sub] = k.split('|');
    const o = ORT[oid];
    zBt.mischen(liste);
    if (art === 'plattform' || art === 'privat') { for (const p of liste) p.arbeitgeber = art === 'privat' ? 'Privathaushalt' : 'über Plattformen und Apps, ohne festen Betrieb'; continue; }
    if (art === 'schule') {
      for (const p of liste) {
        const typen = /Grundschul/.test(p.job.titel) ? [] : /Berufsschul/.test(p.job.titel) ? ['beruf'] : /Gymnasial/.test(p.job.titel) ? ['gymnasium'] : Object.keys(SCHULEN_ORT[oid]).filter(t => t !== 'beruf');
        p.arbeitgeber = typen.length ? waehleSchule(p, typen, 'sonstige') : ersatzSchule(o, 'grundschule_' + (fnv(p.stadtteil) % 2), p.stadtteil);
      }
    } else if (art === 'hochschule') {
      for (const p of liste) p.arbeitgeber = zBt.wahl(B.bildung.hochschulen_real[oid] || ['Hochschule am Ort']);
    }
    // Teams bilden: ein Teil arbeitet mit anderen Figuren zusammen
    const pTeam = sub === 'kanal' || sub === 'freiberuflich' ? 0 : TEAMBAR.has(art) ? (['krankenhaus', 'schule', 'fabrik', 'logistik', 'amt', 'polizei', 'verkehr', 'laden', 'gastro', 'baufirma', 'firma'].includes(art) ? 0.6 : 0.4) : 0;
    let i = 0;
    while (i < liste.length) {
      const rest = liste.length - i;
      let n = 1;
      if (rest >= 2 && zBt.chance(pTeam)) n = Math.min(rest, zBt.gewichtet([[2, 0.45], [3, 0.3], [4, 0.17], [5, 0.08]]));
      const team = liste.slice(i, i + n);
      i += n;
      const bid = 'B' + String(BETRIEBE.length + 1).padStart(3, '0');
      let name = team[0].arbeitgeber || null;
      let oeffentlich = false;
      if (!name) {
        const def = BETRIEB[art];
        const sd = sub && BETRIEB_SUB_NAMEN[sub];
        const sp = SPRACHE_LAND[o.land] || 'de';
        const ortsteil = ' in ' + team[0].stadtteil.split(' (')[0];
        if (art === 'armee') { name = ARMEE[o.land] || 'Streitkräfte'; oeffentlich = true; }
        else if (sd && sd.oeff) { name = sd.d + (sd.ohneOrt ? '' : ortsteil); oeffentlich = true; }
        else if (!sd && def && def.oeff) { name = (def.d[sp] || def.d.de || art) + ortsteil; oeffentlich = true; }
        else name = nameAusVorlage(art, sub, o.land, o, nachnamenPoolFuer(o)) || ('Betrieb' + ortsteil);
      } else oeffentlich = true;
      if (team.length === 1 && team[0].erwerbsform === 'selbststaendig' && !oeffentlich) name = 'eigener Betrieb: ' + name;
      BETRIEBE.push({ betrieb_id: bid, name, art, ort: oid, stadtteil: team[0].stadtteil, mitglieder: team });
      for (const p of team) { p.arbeitgeber = name; p.betrieb = bid; p.team = team; }
    }
  }

  // ---------- 11. Einkommen und Schicht ----------
  const zE2 = Z('schicht');
  const EUR = B.taetigkeiten.einkommen.monat_brutto_vollzeit_je_stufe;
  function einkommenPerson(p) {
    const tab = EUR[p.land]; const s1 = tab['1'];
    switch (p.status) {
      case 'erwerbstaetig': return tab[String(p.job.stufe)] * (p.arbeitszeit?.umfang === 'Teilzeit' ? 0.6 : 1) * (p.erwerbsform === 'ohne Anmeldung' ? 0.85 : 1);
      case 'elternzeit': return tab[String(p.job?.stufe ?? 2)] * 0.6;
      case 'rente': return tab[String(p.frueherJob?.stufe ?? 2)] * (p.land === 'TR' ? 0.55 : 0.48);
      case 'arbeitslos': return s1 * 0.45;
      case 'erwerbsunfaehig': return s1 * 0.4;
      case 'studium': case 'ausbildung': return s1 * 0.4 + (p.nebenjob ? s1 * 0.2 : 0);
      case 'dienst': return s1 * 0.25;
      default: return p.nebenjob ? s1 * 0.15 : 0;
    }
  }
  const einheiten = [];
  for (const hh of HAUSHALTE) {
    if (hh.art === 'wg_sonstige' && hh.form !== 'geschwister') { for (const p of hh.mitglieder) einheiten.push({ land: hh.land, mit: [p], alle: [p], hh }); }
    else einheiten.push({ land: hh.land, mit: hh.mitglieder.filter(istFigur), alle: hh.mitglieder, hh });
  }
  for (const e of einheiten) {
    const ek = summe(e.mit.map(einkommenPerson));
    const erw = e.alle.filter(p => p.alter >= 14).length, kl = e.alle.filter(p => p.alter < 14).length;
    const aeq = 1 + 0.5 * Math.max(0, erw - 1) + 0.3 * kl;
    const lage = summe(stTreffer(ST_LAGE, e.hh.o.id, e.hh.st.name).map(x => x[2]));
    let s = (ek + 1) / aeq * Math.exp(0.3 * lage) * Math.exp(0.3 * zE2.normal());
    if (e.hh.form === 'arbeiterunterkunft') s *= 0.5;
    if (e.mit.some(p => p.info.kinderAusserhalb && p.hh.form === 'arbeiterunterkunft')) s *= 0.8;
    e.score = s;
  }
  const SCH = ['knapp', 'untere_mitte', 'mitte', 'obere_mitte', 'wohlhabend'];
  const VERT = B.taetigkeiten.einkommen.schicht.verteilung;
  for (const land of LAENDER) {
    const ziel = land === 'AE' ? { knapp: 0.35, untere_mitte: 0.2, mitte: 0.15, obere_mitte: 0.2, wohlhabend: 0.1 } : ['TR', 'BG', 'AZ'].includes(land) ? ohneMeta(VERT.TR) : ohneMeta(VERT.DE);
    const es = einheiten.filter(e => e.land === land).sort((a, b) => a.score - b.score);
    const n = summe(es.map(e => e.mit.length));
    let kum = 0;
    const grenzen = []; let acc = 0; for (const s of SCH) { acc += ziel[s]; grenzen.push(acc); }
    for (const e of es) {
      const mitte = (kum + e.mit.length / 2) / n;
      let k = grenzen.findIndex(g => mitte <= g + 1e-9); if (k < 0) k = 4;
      for (const p of e.mit) p.schicht = SCH[k];
      kum += e.mit.length;
    }
  }
  for (const p of F) p.einkommen = EINKOMMEN_AUS_SCHICHT[p.schicht];

  // ---------- 12. Denkstil (zuletzt im Sinn von unabhaengig: nur zufaellig, dann ausbalanciert) ----------
  const zD = Z('denkstil');
  const KI_ZIEL = Math.round(1000 * (B.denkstil.verteilung.KI ?? 0.3));
  const gruppenDef = [p => 'land:' + p.land, p => 'band:' + band(p.alter), p => 'g:' + p.geschlecht, p => 'schicht:' + p.schicht, p => 'gruppe:' + (WESTEN.has(p.land) ? 'westen' : p.land === 'TR' ? 'tr' : 'andere')];
  const gruppen = new Map();
  for (const p of F) for (const f of gruppenDef) { const k = f(p); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(p.i); }
  const ki = new Uint8Array(1000);
  zD.mischen([...F.keys()]).slice(0, KI_ZIEL).forEach(i => { ki[i] = 1; });
  const gKeys = [...gruppen.keys()];
  const gIndex = F.map(p => gruppenDef.map(f => f(p)));
  const gN = new Map(gKeys.map(k => [k, gruppen.get(k).length]));
  const gK = new Map(gKeys.map(k => [k, gruppen.get(k).filter(i => ki[i]).length]));
  const kosten = (k, kk) => { const n = gN.get(k); const w = n >= 30 ? 1 : 0.3; return w * Math.pow(kk - 0.3 * n, 2) / n; };
  for (let it = 0; it < 60000; it++) {
    const a = zD.ganz(0, 999), b = zD.ganz(0, 999);
    if (ki[a] === ki[b]) continue;
    const [an, aus] = ki[a] ? [b, a] : [a, b];
    let delta = 0; const betr = new Map();
    for (const k of gIndex[an]) betr.set(k, (betr.get(k) || 0) + 1);
    for (const k of gIndex[aus]) betr.set(k, (betr.get(k) || 0) - 1);
    for (const [k, d] of betr) if (d) delta += kosten(k, gK.get(k) + d) - kosten(k, gK.get(k));
    if (delta < 0) { ki[an] = 1; ki[aus] = 0; for (const [k, d] of betr) if (d) gK.set(k, gK.get(k) + d); }
  }
  const SPIELARTEN = B.denkstil.ki.spielarten;
  const kiListe = zD.mischen(F.filter(p => ki[p.i]));
  let pos = 0;
  const artZahlen = SPIELARTEN.map(s => [s, Math.round(s.anteil * KI_ZIEL)]);
  let diff = KI_ZIEL - summe(artZahlen.map(x => x[1])); let ai = 0;
  while (diff !== 0) { artZahlen[ai % artZahlen.length][1] += Math.sign(diff); diff -= Math.sign(diff); ai++; }
  for (const [s, n] of artZahlen) for (let k = 0; k < n; k++) { const p = kiListe[pos++]; p.denkstil = 'KI'; p.denkstilArt = s.name; p.denkstilCode = s.code; }
  const FAERB = B.denkstil.mensch.faerbungen;
  for (const p of F) if (!ki[p.i]) { p.denkstil = 'Mensch'; p.denkstilArt = zD.wahl(FAERB); }

  // ---------- 13. Geraete ----------
  const zGe = Z('geraete');
  const G = B.geraete;
  const iosBasis = l => G.iphone_vorgabe[l] ?? G.ios_anteil[l].oktober_2026;
  const altMod = a => G.iphone_modifikatoren.alter[a <= 17 ? '12-17' : a <= 29 ? '18-29' : a <= 49 ? '30-49' : a <= 64 ? '50-64' : '65+'];
  for (const land of LAENDER) {
    const ps = F.filter(p => p.land === land);
    const ohneHandy = ps.filter(p => p.alter <= 13 && zGe.chance(G.zustand.kein_eigenes_handy_12_13));
    ohneHandy.forEach(p => { p.ohneHandy = true; });
    const mit = ps.filter(p => !p.ohneHandy);
    let k = Math.round(iosBasis(land) * mit.length);
    // Efraimidis-Spirakis: gewichtete Ziehung ohne Zuruecklegen, genau k iPhones je Land
    const schl = mit.map(p => {
      let w = altMod(p.alter) * G.iphone_modifikatoren.schicht[p.schicht];
      if (land === 'AE' && ARBEITSMIGRATION_AE.has(p.herkunft[0]) && p.hh.form === 'arbeiterunterkunft') w *= 0.2;
      return [p, Math.pow(zGe.z(), 1 / w)];
    }).sort((a, b) => b[1] - a[1]);
    schl.forEach(([p], i) => { p.iphone = i < k; });
  }
  const klassenVert = l => ohneMeta(G.handy_klassen.verteilung[l === 'DE' ? 'DE' : l === 'TR' ? 'TR' : l === 'AE' ? 'AE' : ['BG', 'AZ'].includes(l) ? 'BG_AZ' : 'NL_BE_AT_CH_GB_US_FR']);
  const ANDROID = { DE: { Samsung: 0.55, Xiaomi: 0.29, Google: 0.02, Huawei: 0.02, Motorola: 0.05, Oppo: 0.03, Nothing: 0.02, Fairphone: 0.02 },
    TR: { Samsung: 0.39, Xiaomi: 0.29, Oppo: 0.06, Realme: 0.05, Tecno: 0.03, Infinix: 0.02, Honor: 0.03, Reeder: 0.02, Casper: 0.015, 'General Mobile': 0.015, Huawei: 0.03, Vivo: 0.03 },
    andere: { Samsung: 0.48, Xiaomi: 0.26, Oppo: 0.05, Realme: 0.04, Honor: 0.04, Huawei: 0.04, Google: 0.03, Motorola: 0.03, Tecno: 0.03 } };
  const konsoleHH = new Map(), tabletHH = new Map();
  const konsoleRoh = new Map();
  for (const hh of HAUSHALTE) {
    const kinder8_17 = hh.mitglieder.some(p => p.alter >= 8 && p.alter <= 17), jungM = hh.mitglieder.some(p => p.geschlecht === 'm' && p.alter >= 16 && p.alter <= 40);
    const alt = hh.mitglieder.every(p => p.alter >= 65);
    let q = (kinder8_17 ? 1.6 : 1) * (jungM ? 1.4 : 1) * (alt ? 0.15 : 1);
    const sch = hh.mitglieder.find(istFigur)?.schicht;
    if (sch === 'knapp') q *= 0.6; if (sch === 'wohlhabend') q *= 1.3;
    if (hh.form === 'arbeiterunterkunft') q *= 0.1;
    konsoleRoh.set(hh, q);
    const tq = (hh.land === 'TR' ? 0.3 : 0.45) * (kinder8_17 ? 1.3 : 1) * (sch === 'knapp' ? 0.7 : 1);
    if (zGe.chance(Math.min(0.9, tq))) tabletHH.set(hh, true);
  }
  // je Land so skalieren, dass der Anteil der Figuren mit Konsole im Haushalt dem Bauplan entspricht
  const nFig = hh => hh.mitglieder.filter(istFigur).length;
  for (const land of LAENDER) {
    // gewichtete Ziehung ohne Zuruecklegen, bis der Figurenanteil mit Konsole dem Bauplan entspricht
    const hs = HAUSHALTE.filter(h => h.land === land);
    const ziel = (G.konsole_pc_tablet.konsole_im_haushalt[land] ?? 0.3) * summe(hs.map(nFig));
    const reihe = hs.map(h => [h, Math.pow(zGe.z(), 1 / Math.max(1e-6, konsoleRoh.get(h)))]).sort((a, b) => b[1] - a[1]);
    let n = 0;
    for (const [h] of reihe) { const f = nFig(h); if (n + f <= ziel + f / 2) { konsoleHH.set(h, zGe.gewichtet(ohneMeta(G.konsole_pc_tablet.konsolen_marken))); n += f; } }
  }
  for (const p of F) {
    const l = p.land;
    let handy, klasse;
    if (p.ohneHandy) { handy = 'kein eigenes Handy'; klasse = null; }
    else if (p.iphone) { handy = 'iPhone'; klasse = zGe.gewichtet({ oberklasse: p.schicht === 'knapp' ? 0.35 : 0.62, mittel: 0.12, alt: p.schicht === 'knapp' ? 0.5 : 0.26 }); }
    else {
      const marke = zGe.gewichtet(l === 'DE' ? ANDROID.DE : l === 'TR' ? ANDROID.TR : ANDROID.andere);
      handy = 'Android (' + marke + ')';
      const v = klassenVert(l);
      const pI = iosBasis(l);
      const r = {};
      for (const [c, t] of Object.entries(v)) { const i = { oberklasse: 0.62, mittel: 0.12, alt: 0.26, einsteiger: 0 }[c] ?? 0; r[c] = Math.max(0.02, (t - pI * i) / (1 - pI)); }
      const f = { knapp: { einsteiger: 1.5, alt: 1.5, oberklasse: 0.4 }, untere_mitte: { einsteiger: 1.2, oberklasse: 0.7 }, obere_mitte: { oberklasse: 1.6, einsteiger: 0.7 }, wohlhabend: { oberklasse: 2.2, einsteiger: 0.4, alt: 0.6 } }[p.schicht] || {};
      for (const c of Object.keys(r)) r[c] *= f[c] ?? 1;
      klasse = zGe.gewichtet(r);
    }
    const zustand = [];
    if (!p.ohneHandy) {
      const Z_ = G.zustand;
      if (zGe.chance(Z_.speicher_fast_voll * (klasse === 'einsteiger' || klasse === 'alt' ? 1.4 : 0.8))) zustand.push('Speicher fast voll');
      if (zGe.chance(Z_.akku_haelt_keinen_abend * (klasse === 'alt' ? 2 : 0.85))) zustand.push('Akku hält keinen Abend');
      if (zGe.chance(Z_.display_gesprungen * (p.alter < 30 ? 1.4 : 0.8))) zustand.push('Display gesprungen');
      const dv = (Z_.datenvolumen_knapp[l] ?? Z_.datenvolumen_knapp.andere) * (p.schicht === 'knapp' ? 1.8 : p.schicht === 'untere_mitte' ? 1.2 : 0.6);
      if (zGe.chance(dv)) zustand.push('Datenvolumen knapp');
      if (p.alter <= 15 && zGe.chance(Z_.eltern_kontrolle_12_15)) zustand.push('Eltern begrenzen Bildschirmzeit und Apps');
      if (p.status === 'erwerbstaetig' && zGe.chance(Z_.zweithandy_fuer_arbeit)) zustand.push('zweites Handy für die Arbeit');
    }
    const sonst = [];
    if (konsoleHH.has(p.hh)) sonst.push(konsoleHH.get(p.hh) + (p.hh.mitglieder.filter(istFigur).length > 1 ? ' im Haushalt' : ''));
    const pcBasis = G.konsole_pc_tablet.gaming_pc_oder_laptop[l] ?? G.konsole_pc_tablet.gaming_pc_oder_laptop[['NL', 'BE', 'AT', 'CH', 'GB', 'FR'].includes(l) ? 'NL_BE_AT_CH_GB_FR' : 'DE'] ?? 0.2;
    const pcW = pcBasis * (p.geschlecht === 'm' && p.alter >= 12 && p.alter <= 35 ? 2 : p.geschlecht === 'w' ? 0.5 : 1) * (p.alter >= 50 ? 0.3 : 1) * (p.schicht === 'knapp' ? 0.6 : 1);
    if (zGe.chance(Math.min(0.8, pcW))) sonst.push('Gaming-PC oder Gaming-Laptop');
    else if (p.alter >= 16 && zGe.chance((p.status === 'studium' || p.bildung?.abschluss === 'bachelor' || p.bildung?.abschluss === 'master' ? 0.75 : 0.35) * (p.alter >= 70 ? 0.3 : 1))) sonst.push('Laptop');
    if (tabletHH.has(p.hh)) sonst.push('Tablet' + (p.hh.mitglieder.length > 1 ? ' (Familie)' : ''));
    p.geraet = { handy, klasse, zustand, sonst };
  }

  // ---------- 14. Probleme ----------
  const zP = Z('probleme');
  const PA = B.probleme.arten;
  const trLike = l => ['TR', 'AZ', 'BG'].includes(l);
  function problemBasis(code, p) {
    const art = PA.find(x => x.code === code);
    const ag = altersgruppe5(p.alter);
    const tab = art[trLike(p.land) ? 'TR' : 'DE'] || art.DE;
    let q = tab ? (tab[ag] ?? 0) : 0;
    const s = p.schicht;
    const hh = p.hh;
    switch (code) {
      case 'schulden': q *= { knapp: 2, untere_mitte: 1.3, mitte: 0.8, obere_mitte: 0.4, wohlhabend: 0.2 }[s]; if (p.land === 'US') q *= 1.3; if (hh.form === 'arbeiterunterkunft') q = 0.3; break;
      case 'geldsorgen': q = { knapp: 0.8, untere_mitte: 0.3, mitte: 0.07, obere_mitte: 0.02, wohlhabend: 0 }[s] * (p.status === 'arbeitslos' ? 1.3 : 1); break;
      case 'jobverlust_jobunsicherheit': q = p.status === 'arbeitslos' ? 0.7 : p.status === 'erwerbstaetig' ? q * 1.2 * (p.erwerbsform === 'ohne Anmeldung' ? 1.6 : 1) : 0; break;
      case 'chronische_krankheit': if (p.status === 'erwerbsunfaehig') q = 0.85; break;
      case 'depression_angst': q *= p.geschlecht === 'w' ? 1.25 : 0.75; if (p.geschlecht === 'w' && ag === '18-29' && !trLike(p.land)) q = 0.47; break;
      case 'pflege_angehoerige': q *= p.geschlecht === 'w' ? 1.4 : 0.6; if (hh.mitglieder.some(x => x.alter >= 80 && x !== p)) q *= 2.5; break;
      case 'trennung': q *= ['geschieden', 'getrennt lebend'].includes(p.familienstand) ? (p.alter < 60 ? 4 : 1.5) : hh.art === 'alleinerziehend' ? 3 : ['verheiratet', 'zusammenlebend'].includes(p.familienstand) ? 0.1 : 1; break;
      case 'liebeskummer_beziehungsstress': if (p.partner) q *= 1.2; break;
      case 'pruefungsstress': q *= ['schule', 'studium', 'ausbildung'].includes(p.status) ? 1.6 : 0.2; if (p.land === 'AZ' && p.alter <= 17) q = Math.max(q, 0.45); break;
      case 'wohnkosten_wohnungsnot': q *= (GROSSSTADT.has(p.ort) ? 1.3 : istLaendlich(p.ort, p.stadtteil) ? 0.7 : 1) * ({ knapp: 1.8, untere_mitte: 1.2, mitte: 0.8, obere_mitte: 0.4, wohlhabend: 0.2 }[s]); break;
      case 'aufenthalt_unsicher': {
        const h = p.herkunft[0]; q = 0;
        if (p.gen === 1) {
          if (p.land === 'TR' && h === 'ar_levante') q = 0.85; else if (p.land === 'TR' && h === 'af') q = 0.7;
          else if (['DE', 'AT'].includes(p.land) && h === 'ar_levante') q = 0.25; else if (['DE', 'AT'].includes(p.land) && h === 'af') q = 0.4;
          else if (['DE', 'AT'].includes(p.land) && h === 'ua') q = 0.3; else if (['DE', 'FR', 'BE'].includes(p.land) && h.startsWith('afr')) q = 0.2;
          else if (p.land === 'US' && h === 'hisp') q = 0.08; else if (p.land === 'AE' && h !== 'ar_golf') q = 0.12;
        }
        break;
      }
      case 'diskriminierung': {
        const h = p.herkunft;
        q = 0.06;
        if (WESTEN.has(p.land) && h.some(x => RASSISTISCH_MARKIERT.has(x))) q = 0.5;
        if (p.land === 'TR' && (h.some(x => ['ku', 'ar_levante', 'af', 'roma'].includes(x)) || p.glaube?.richtung === 'alevitisch')) q = 0.3;
        if (p.info.queer && ['TR', 'AE', 'AZ', 'BG'].includes(p.land)) q = 0.6;
        if (p.geschlecht === 'w' && p.status === 'erwerbstaetig') q = Math.max(q, 0.15);
        if (p.alter >= 50 && p.status === 'arbeitslos') q = Math.max(q, 0.1);
        break;
      }
      case 'ueberlastung': if (hh.art === 'alleinerziehend' || p.arbeitszeit?.zeiten?.includes('schicht') || p.erwerbsform === 'selbststaendig') q *= 2; break;
      case 'sucht_risiko': q *= p.geschlecht === 'm' ? 1.4 : 0.6; break;
      case 'flucht_krieg': {
        const h = p.herkunft[0]; q = 0;
        if (p.gen === 1) q = { ar_levante: 0.7, af: 0.6, ua: 0.6, afr_ost: 0.6, ku: 0.15 }[h] ?? (h === 'ex_yu' && p.alter >= 40 ? 0.4 : 0);
        break;
      }
      case 'erdbeben_2023': q = p.ort === 'diyarbakir' ? 0.25 : p.land === 'TR' ? 0.05 : (p.herkunft.includes('ku') ? 0.05 : 0); break;
      case 'kind_krank': q = (p.kinder.length || (p.kleineKinderAlter || []).length) ? art.anteil_bei_eltern : 0; break;
      default: break;
    }
    return Math.max(0, Math.min(0.95, q || 0));
  }
  const PCODES = PA.map(a => a.code);
  const basisP = F.map(p => PCODES.map(c => problemBasis(c, p)));
  const erwartung = f => summe(basisP.map(ps => 1 - ps.reduce((pr, q) => pr * (1 - Math.min(0.95, q * f)), 1))) / F.length;
  let lo = 0.05, hi = 2;
  for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (erwartung(m) < 0.6) lo = m; else hi = m; }
  const PFAKTOR = (lo + hi) / 2;
  for (const p of F) {
    p.probleme = [];
    PCODES.forEach((c, k) => { if (zP.chance(Math.min(0.95, basisP[p.i][k] * PFAKTOR))) p.probleme.push(c); });
  }
  // Feinsteuerung auf 60 % +- 1 (wiederholbar)
  let mitProblem = F.filter(p => p.probleme.length).length;
  const reihe = zP.mischen([...F]);
  for (const p of reihe) {
    if (mitProblem > 610 && p.probleme.length === 1) { p.probleme = []; mitProblem--; }
    else if (mitProblem < 590 && !p.probleme.length) {
      const opts = PCODES.map((c, k) => [c, basisP[p.i][k]]).filter(([, w]) => w > 0);
      if (opts.length) { p.probleme.push(zP.gewichtet(opts)); mitProblem++; }
    }
  }

  // ---------- 15. Lebensereignis ----------
  const zLe = Z('lebensereignis');
  const LE = B.probleme.lebensereignisse.liste;
  function leGewicht(e, p) {
    const [a0, a1] = e.alter === 'alle' ? [12, 99] : e.alter.split('-').map(Number);
    if (p.alter < a0 || p.alter > a1) return 0;
    const t = e.ereignis;
    if (t.startsWith('verliebt')) return ['ledig', 'in Beziehung', 'zusammenlebend'].includes(p.familienstand) ? e.anteil * (p.familienstand === 'in Beziehung' ? 2 : 1) : 0;
    if (t.startsWith('Hochzeit')) return p.familienstand === 'verlobt' ? 1 : ['in Beziehung', 'zusammenlebend'].includes(p.familienstand) ? 0.2 : 0;
    if (t.startsWith('Baby')) return (p.kleineKinderAlter || []).includes(0) ? 0.8 : ['verheiratet', 'zusammenlebend'].includes(p.familienstand) ? 0.1 : 0;
    if (t.startsWith('neuer Job')) return p.status === 'erwerbstaetig' ? 0.1 : 0;
    if (t.startsWith('Führerschein')) return e.anteil;
    if (t.startsWith('Studium oder Ausbildung')) return (p.status === 'studium' && p.bildung.semester <= 1) || (p.status === 'ausbildung' && p.bildung.lehrjahr === 1) ? 0.6 : p.status === 'schule' && p.alter >= 17 ? 0.1 : 0;
    if (t.startsWith('eigenes Geschäft')) return p.erwerbsform === 'selbststaendig' ? 0.15 : 0;
    if (t.startsWith('Enkelkind')) return p.kinder.length || p.info.kinderAusserhalb ? 0.1 : 0;
    if (t.startsWith('Rente')) return p.status === 'rente' && p.alter <= 67 ? 0.3 : 0;
    if (t.startsWith('Sommerurlaub')) return e.anteil * (p.gen ? 1.2 : 1) * (p.schicht === 'knapp' ? 0.5 : 1);
    return e.anteil;
  }
  const lePlan = F.map(p => LE.map(e => leGewicht(e, p)));
  const leErw = f => summe(lePlan.map(ws => 1 - ws.reduce((pr, w) => pr * (1 - Math.min(0.95, w * f)), 1))) / F.length;
  let l1 = 0.05, l2 = 3; for (let it = 0; it < 40; it++) { const m = (l1 + l2) / 2; if (leErw(m) < 0.4) l1 = m; else l2 = m; }
  const LF = (l1 + l2) / 2;
  for (const p of F) {
    p.lebensereignis = null;
    for (const k of zLe.mischen(LE.map((_, i) => i))) if (zLe.chance(Math.min(0.95, lePlan[p.i][k] * LF))) { p.lebensereignis = LE[k].ereignis; break; }
  }

  // ---------- 16. Einsamkeit, Freundeszahl, Kreisziel ----------
  const zSo = Z('sozial');
  const SO = B.sozial;
  const einsamBasis = a => SO.einsamkeit.anteil_einsam[a <= 17 ? '12-17' : a <= 29 ? '18-29' : a <= 49 ? '30-49' : a <= 74 ? '50-74' : '75+'];
  const roh = F.map(p => {
    let q = einsamBasis(p.alter) * (SO.einsamkeit.laenderfaktor[p.land] ?? 1);
    if (p.hh.art === 'allein') q *= 1.8;
    if (p.familienstand === 'verwitwet') q *= 1.6;
    if (p.hh.art === 'alleinerziehend' && p.kinder.length) q *= 1.5;
    if (p.status === 'arbeitslos') q *= 1.8;
    if (p.schicht === 'knapp') q *= 1.4;
    if (p.probleme.includes('depression_angst')) q *= 2;
    if (p.probleme.includes('chronische_krankheit')) q *= 1.4;
    if (p.probleme.includes('pflege_angehoerige')) q *= 1.3;
    if (p.gen === 1 && p.seit && JAHR - p.seit < 4) q *= 1.6;
    if (p.hh.form === 'arbeiterunterkunft') q *= 2;
    if (p.ort === 'kardschali' && p.alter >= 60 && p.info.kinderAusserhalb) q *= 1.5;
    if (p.status === 'studium' || p.status === 'schule') q *= 0.85;
    return q;
  });
  const EINSAM_ZIEL = 0.155;
  let ef = 1; for (let it = 0; it < 40; it++) { const m = summe(roh.map(q => Math.min(0.9, q * ef))) / 1000; ef *= EINSAM_ZIEL / m; }
  for (const p of F) p.einsam = zSo.chance(Math.min(0.9, roh[p.i] * ef));
  const GRAD = ohneMeta(SO.netz_in_der_welt.grad);
  const gradOhne = { ...GRAD }; delete gradOhne['0-2'];
  // Kreise bringen von selbst ein bis zwei Freunde mehr; das Ziel liegt deshalb etwas niedriger als die Bauplan-Verteilung
  gradOhne['3-5'] *= 1.5; gradOhne['6-10'] *= 0.8; gradOhne['11-20'] *= 0.85;
  const ZIELGRAD = F.map(p => {
    if (p.einsam) return zSo.gewichtet({ 0: 0.3, 1: 0.35, 2: 0.35 }) * 1;
    const g = { ...gradOhne };
    if (p.alter <= 29) { g['6-10'] *= 1.25; g['11-20'] *= 1.4; g['21+'] *= 1.6; }
    if (p.alter >= 70) { g['3-5'] *= 1.4; g['11-20'] *= 0.6; g['21+'] *= 0.3; }
    if (p.status === 'studium') { g['11-20'] *= 1.5; g['21+'] *= 2; }
    if (p.arbeitszeit?.zeiten?.some(z => ['schicht', 'nacht'].includes(z)) || p.probleme.includes('pflege_angehoerige') || (p.kleineKinderAlter || []).some(x => x < 6)) { g['3-5'] *= 1.4; g['11-20'] *= 0.7; g['21+'] *= 0.5; }
    if (p.alter > 45 || p.alter < 14) g['21+'] *= 0.3;
    if (p.gen === 1 && p.seit && JAHR - p.seit <= 6) { g['3-5'] *= 1.5; g['11-20'] *= 0.5; g['21+'] *= 0.2; }
    const b = zSo.gewichtet(g);
    const r = { '3-5': [3, 5], '6-10': [6, 10], '11-20': [11, 20], '21+': [21, 26] }[b];
    return zSo.ganz(r[0], r[1]);
  });
  // Kreise je Figur: Einsame haben 0 oder 1 Kreis; die uebrigen so, dass die ganze Welt der Bauplan-Verteilung folgt
  const MITGL = ohneMeta(SO.kreise.mitgliedschaften_je_figur);
  const anteilEinsam = F.filter(p => p.einsam).length / F.length;
  const MITGL_REST = { ...MITGL };
  MITGL_REST['0'] = Math.max(0, MITGL['0'] - anteilEinsam * 0.5); MITGL_REST['1'] = Math.max(0, MITGL['1'] - anteilEinsam * 0.5);
  const KREISZIEL = F.map(p => {
    if (p.einsam) return zSo.chance(0.5) ? 1 : 0;
    const d = { ...MITGL_REST }; if (p.alter <= 29) { d['3'] *= 1.3; d['4+'] *= 1.5; d['0'] *= 0.5; }
    if (p.alter >= 75) { d['0'] *= 1.5; d['3'] *= 0.7; d['4+'] *= 0.5; }
    const x = zSo.gewichtet(d); return x === '4+' ? 4 : Number(x);
  });
  for (const p of F) p.freundeAusserhalb = p.einsam ? zSo.gewichtet({ keine: 0.4, wenige: 0.6 }) : zSo.gewichtet({ wenige: 0.25, einige: 0.5, viele: 0.25 });

  // ---------- 17. Spielen und Medien ----------
  const zSp = Z('spielen');
  const SPL = B.spielen;
  const spielAgeKey = a => (a <= 17 ? '12-17' : a <= 29 ? '18-29' : a <= 39 ? '30-39' : a <= 49 ? '40-49' : a <= 59 ? '50-59' : a <= 69 ? '60-69' : '70+');
  function spieleListe(p) {
    const BS = SPL.beliebte_spiele; const a = p.alter; const ag = a <= 17 ? '12-17' : a <= 29 ? '18-29' : a <= 49 ? '30-49' : '50+';
    let l = p.land === 'DE' || p.land === 'TR' ? BS[p.land][ag] : (p.land === 'AT' || p.land === 'CH') ? BS.AT_CH : (BS[p.land] || []);
    if (p.land !== 'TR' && p.herkunft.some(h => TUERKISCHSPRACHIG.has(h) || h === 'az')) {
      // erste Generation spielt eher, was sie aus der Tuerkei kennt; zweite mischt; dritte eher wie das Land
      const tr = BS.TR[ag];
      if (p.gen === 1) l = tr.concat(l);
      else if (p.gen === 2) { const m = []; for (let i = 0; i < Math.max(l.length, tr.length); i++) { if (l[i]) m.push(l[i]); if (tr[i]) m.push(tr[i]); } l = m; }
      else l = l.concat(tr);
    }
    if (!['DE', 'TR'].includes(p.land)) l = l.concat(BS.DE[ag].filter(x => VIDEOSPIELE.has(x)));
    return [...new Set(l)];
  }
  // analoge Spiele: Neigung je Figur, je Land auf den Bauplan-Anteil (mindestens monatlich) skaliert
  const analogRoh = F.map(p => {
    let q = 1;
    if (['TR', 'AZ', 'BG'].includes(p.land) && p.geschlecht === 'm' && p.alter >= 40) q *= 1.5;
    if (p.hh.mitglieder.some(x => x.alter >= 6 && x.alter <= 14) && p.alter >= 25) q *= 1.2;
    if (p.status === 'studium') q *= 1.2;
    if (p.alter >= 75) q *= 0.8;
    return q;
  });
  const analogJa = new Set();
  for (const land of LAENDER) {
    const ps = F.filter(p => p.land === land); const k = Math.round((SPL.analoge_spiele.mindestens_monatlich[land] ?? 0.3) * ps.length);
    ps.map(p => [p.i, Math.pow(zSp.z(), 1 / analogRoh[p.i])]).sort((a, b) => b[1] - a[1]).slice(0, k).forEach(([i]) => analogJa.add(i));
  }
  for (const p of F) {
    const ak = spielAgeKey(p.alter);
    const anteil = (SPL.videospiele.anteil_spielend[ak]?.[p.geschlecht] ?? 0.3) * (SPL.videospiele.laenderfaktor[p.land] ?? 1);
    let video = 'nie';
    if (zSp.chance(Math.min(0.97, anteil * (p.einsam && p.alter < 30 ? 1.1 : 1)))) {
      const d = { ...ohneMeta(SPL.videospiele.intensitaet_bei_spielenden) };
      if (p.geschlecht === 'm' && p.alter <= 29) { d.vielspieler *= 2; d.regelmaessig *= 1.4; }
      if (p.alter >= 50) { d.selten *= 1.6; d.vielspieler *= 0.3; }
      if (p.probleme.includes('ueberlastung') || p.probleme.includes('pflege_angehoerige')) { d.selten *= 1.5; d.vielspieler *= 0.5; }
      if (p.einsam && p.alter < 35) { d.vielspieler *= 1.6; d.regelmaessig *= 1.3; }
      video = zSp.gewichtet(d);
    }
    const teehaus = ['TR', 'AZ', 'BG'].includes(p.land) && p.geschlecht === 'm' && p.alter >= 40;
    let analog = 'nie';
    if (analogJa.has(p.i)) analog = teehaus && p.alter >= 50 ? zSp.gewichtet({ monatlich: 0.3, woechentlich: 0.35, taeglich: 0.35 }) : zSp.gewichtet({ monatlich: 0.6, woechentlich: 0.33, taeglich: 0.07 });
    else if (zSp.chance(0.35)) analog = 'selten';
    const vL = { nie: 0, selten: 1, gelegentlich: 2, regelmaessig: 3, vielspieler: 4 }[video];
    const aL = { nie: 0, selten: 1, monatlich: 2, woechentlich: 3, taeglich: 4 }[analog];
    p.spielneigung = Math.min(5, Math.max(vL, aL) + (vL >= 2 && aL >= 2 ? 1 : 0));
    // Lieblingsspiele passend zu dem, was gespielt wird
    let liste = spieleListe(p);
    if (video === 'nie') liste = liste.filter(x => !VIDEOSPIELE.has(x));
    if (analog === 'nie' || analog === 'selten') liste = liste.filter(x => VIDEOSPIELE.has(x) || zSp.chance(0.25));
    const anzahl = p.spielneigung === 0 ? 0 : p.spielneigung <= 2 ? zSp.ganz(1, 2) : zSp.ganz(2, 3);
    const lieblings = [];
    const pool2 = liste.map((x, i) => [x, 1 / (1 + 0.15 * i)]);
    while (lieblings.length < anzahl && pool2.length) { const x = zSp.gewichtet(pool2); lieblings.push(x); pool2.splice(pool2.findIndex(y => y[0] === x), 1); }
    const bl = { ...ohneMeta(SPL.bluff_freude.verteilung) };
    if (p.alter < 30) { bl.liebt_es *= 1.4; bl.mag_es *= 1.2; } if (p.alter >= 60) { bl.unwohl *= 1.3; bl.hasst_es *= 1.3; bl.liebt_es *= 0.6; }
    if (p.probleme.includes('depression_angst')) { bl.unwohl *= 1.4; }
    if (p.denkstil === 'KI') { bl.neutral *= 1.3; bl.liebt_es *= 0.8; }
    if (p.denkstilArt === 'Gesellige/r, die oder der mitzieht') { bl.liebt_es *= 1.5; bl.mag_es *= 1.3; }
    if (p.denkstilArt === 'Harmoniesuchende/r') { bl.unwohl *= 1.5; bl.hasst_es *= 1.4; }
    const eh = { ...ohneMeta(SPL.ehrgeiz.verteilung) };
    if (p.geschlecht === 'm' && p.alter < 35) { eh.sehr_ehrgeizig *= 1.4; eh.ehrgeizig *= 1.2; }
    if (p.denkstilCode === 'optimierer') { eh.sehr_ehrgeizig *= 2.5; }
    if (p.denkstilArt === 'Rechthaber/in') eh.sehr_ehrgeizig *= 1.8;
    const an = { ...ohneMeta(SPL.anleitung.verteilung) };
    if (p.denkstil === 'KI') an.liest_vollstaendig *= 2;
    if (p.denkstilCode === 'regel_pruefer') an.liest_vollstaendig *= 1.8;
    if (p.alter <= 17) an.probiert_einfach *= 1.6; if (p.alter >= 60) an.laesst_sich_erklaeren *= 1.5;
    const RS = SPL.partyspiele.kennt_ein_bluff_oder_rollenspiel;
    const rq = RS[p.alter <= 17 ? '12-17' : p.alter <= 29 ? '18-29' : p.alter <= 49 ? '30-49' : '50+'];
    p.spielen = { videospiele: video, analog, lieblingsspiele: lieblings, bluff: zSp.gewichtet(bl), ehrgeiz: zSp.gewichtet(eh), anleitung: zSp.gewichtet(an), kennt_rollenspiel: zSp.chance(rq) };
    // Medien
    const DM = B.digital_medien;
    const na = DM.messenger_und_social_media.nach_alter[p.alter <= 17 ? '12-17' : p.alter <= 29 ? '18-29' : p.alter <= 49 ? '30-49' : p.alter <= 64 ? '50-64' : '65+'];
    const apps = [];
    if (!p.ohneHandy && zSp.chance(p.alter >= 75 ? 0.8 : 0.96)) apps.push('WhatsApp');
    for (const [app, q] of Object.entries(ohneMeta(na))) {
      let qq = q;
      if (p.land === 'TR' && app === 'Instagram') qq = Math.min(0.95, q * 1.15);
      if (app === 'Discord' && ['regelmaessig', 'vielspieler'].includes(video)) qq = Math.min(0.9, q * 2);
      if (zSp.chance(qq)) apps.push(app);
    }
    if (p.land === 'TR' && p.alter >= 18 && zSp.chance(0.15)) apps.push('X');
    const kiQ = (p.alter <= 15 ? 0.5 : p.alter <= 24 ? 0.64 : p.alter <= 54 ? 0.36 : p.alter <= 64 ? 0.15 : p.alter <= 74 ? 0.07 : 0.03) * (['TR', 'AZ'].includes(p.land) ? 0.6 : 1) * (['bachelor', 'master', 'staatsexamen', 'promotion'].includes(p.bildung?.abschluss) || p.status === 'studium' ? 1.4 : 1);
    const ki_ = zSp.chance(Math.min(0.92, kiQ)) ? (zSp.chance(0.45) ? 'regelmäßig' : 'manchmal') : 'nie';
    const animeQ = DM.anime.nach_alter[p.alter <= 17 ? '12-17' : p.alter <= 29 ? '18-29' : p.alter <= 49 ? '30-49' : '50+'];
    const onlineQ = p.alter < 16 ? 0.3 : (p.land === 'TR' ? 0.6 : p.land === 'DE' ? 0.8 : 0.7) * (p.alter >= 70 ? 0.5 : 1);
    p.medien = { apps: [...new Set(apps)], ki_nutzung: ki_, anime: zSp.chance(animeQ), kauft_online: zSp.chance(onlineQ) };
  }

  // ---------- 18. Freundesnetz und Kreise ----------
  const zK = Z('netz');
  const FR = F.map(() => new Set()), ON = F.map(() => new Set()), KOLL = F.map(() => new Set()), KLA = F.map(() => new Set());
  const KANTEN = new Map();
  const KZ = new Uint8Array(1000);
  const KREISE = [];
  const grad = i => FR[i].size + ON[i].size;
  const kantenSchl = (i, j) => (i < j ? i + '|' + j : j + '|' + i);
  const kern = (i, j) => famKern(F[i], F[j]);
  const budget = i => (F[i].einsam ? ZIELGRAD[i] - grad(i) : Infinity);
  function staerke(art) { return zK.gewichtet(art === 'familie_und_verwandte' || art === 'freundeskreis' ? { eng: 0.5, normal: 0.4, locker: 0.1 } : ohneMeta(SO.netz_in_der_welt.staerke)); }
  function freund(i, j, art) {
    if (i === j || FR[i].has(j) || ON[i].has(j) || kern(i, j)) return false;
    if (budget(i) <= 0 || budget(j) <= 0) return false;
    FR[i].add(j); FR[j].add(i); KANTEN.set(kantenSchl(i, j), { art: art === 'freundeskreis' ? 'schule_oder_uni' : art, staerke: staerke(art), online: false });
    return true;
  }
  function online(i, j) {
    if (i === j || FR[i].has(j) || ON[i].has(j) || kern(i, j)) return false;
    if (budget(i) <= 0 || budget(j) <= 0) return false;
    ON[i].add(j); ON[j].add(i); KANTEN.set(kantenSchl(i, j), { art: 'online', staerke: zK.gewichtet({ eng: 0.2, normal: 0.45, locker: 0.35 }), online: true });
    return true;
  }
  const kennen = (i, j) => FR[i].has(j) || ON[i].has(j) || KOLL[i].has(j) || KLA[i].has(j) || kern(i, j);
  // Kanten in Kreisen: dicht, solange beide unter ihrer Zielzahl an Freunden liegen, danach selten
  function kreisKante(i, j, art, p) {
    const ueber = (grad(i) >= ZIELGRAD[i] ? 1 : 0) + (grad(j) >= ZIELGRAD[j] ? 1 : 0);
    const q = ueber === 0 ? p : ueber === 1 ? p * 0.15 : p * 0.03;
    if (!zK.chance(q)) return false;
    return art === 'online' ? online(i, j) : freund(i, j, art);
  }
  const hatKinder = p => p.kinder.some(k => k.alter < 18) || (p.kleineKinderAlter || []).length > 0;
  function kreis(art, unterart, mitglieder, ortId, stadtteil) {
    if (mitglieder.length < 2) return null;
    const m = mitglieder.slice(0, 10);
    const k = { art, unterart, ort: ortId, stadtteil: stadtteil || null, mitglieder: m };
    KREISE.push(k); for (const i of m) KZ[i]++;
    return k;
  }
  function sicherKennen(k, art) {
    for (const i of k.mitglieder) {
      if (k.mitglieder.some(j => j !== i && kennen(i, j))) continue;
      const ziel = [...k.mitglieder].filter(j => j !== i && !F[j].einsam).sort((a, b) => grad(a) - grad(b))[0];
      if (ziel !== undefined) { if (art === 'online') online(i, ziel); else freund(i, ziel, art); }
    }
    // wer immer noch niemanden kennt (z. B. Einsame ohne Budget), verlaesst den Kreis
    const raus = k.mitglieder.filter(i => !k.mitglieder.some(j => j !== i && kennen(i, j)));
    for (const i of raus) { k.mitglieder.splice(k.mitglieder.indexOf(i), 1); KZ[i]--; }
  }
  const frei = i => KZ[i] < Math.min(4, KREISZIEL[i]);
  function gruppiere(kand, lo, hi, schl) {
    const l = zK.mischen([...kand]);
    if (schl) l.sort((a, b) => schl(a) - schl(b));
    const out = []; let i = 0;
    while (l.length - i >= lo) { const n = Math.min(hi, l.length - i, zK.ganz(lo, hi)); out.push(l.slice(i, i + n)); i += n; }
    return out;
  }
  // a) Familie: verbundene Familienteile mit mindestens 3 Figuren
  const famBesucht = new Uint8Array(1000);
  const famNachbarn = i => {
    const p = F[i]; const s = new Set();
    const partner = p.partner && p.partner.hh === p.hh ? p.partner : null;   // feste Paare im Haushalt; Beziehungen ohne Haushalt verbinden keine Familien
    for (const x of [partner, ...p.eltern, ...p.kinder, ...geschwister(p)]) if (x && istFigur(x)) s.add(x.i);
    return [...s];
  };
  for (const p of F) {
    if (famBesucht[p.i]) continue;
    const komp = []; const st = [p.i]; famBesucht[p.i] = 1;
    while (st.length) { const i = st.pop(); komp.push(i); for (const j of famNachbarn(i)) if (!famBesucht[j]) { famBesucht[j] = 1; st.push(j); } }
    if (komp.length < 3) continue;
    let mit = komp;
    if (komp.length > 10) {
      const start = zK.wahl(komp); const seen = new Set([start]); const q = [start];
      while (q.length && seen.size < 10) { const i = q.shift(); for (const j of famNachbarn(i)) if (!seen.has(j) && seen.size < 10) { seen.add(j); q.push(j); } }
      mit = [...seen];
    }
    const orte = new Set(mit.map(i => F[i].ort));
    const k = kreis('Familie', 'familie_verwandte', mit, orte.size === 1 ? F[mit[0]].ort : 'mehrere', null);
    if (!k) continue;
    // Verwandte, die keine Kernfamilie sind (Cousins, Schwager, Tanten): teils Freundschaftskanten
    for (let a = 0; a < mit.length; a++) for (let b = a + 1; b < mit.length; b++) {
      const i = mit[a], j = mit[b];
      if (kern(i, j) || F[i].hh === F[j].hh) continue;
      kreisKante(i, j, 'familie_und_verwandte', (Math.abs(F[i].alter - F[j].alter) <= 12 ? 0.4 : 0.15) * (F[i].ort === F[j].ort ? 1 : 0.5));
    }
  }
  // b) Klasse: gleiche Schule und Klasse; Berufsschule: gleiches Alter; Studium: gleiche Hochschule und Fach
  const klassen = new Map();
  for (const p of F) {
    let key = null;
    if (p.status === 'schule' && p.bildung?.klasse) key = 'S|' + p.ort + '|' + p.bildung.schule + '|' + p.bildung.klasse + '|' + p.alter;
    else if (p.status === 'ausbildung' && p.bildung?.berufsschule) key = 'B|' + p.ort + '|' + p.bildung.berufsschule + '|' + p.alter;
    if (key) { if (!klassen.has(key)) klassen.set(key, []); klassen.get(key).push(p.i); }
  }
  for (const [key, mit] of klassen) {
    for (const i of mit) for (const j of mit) if (i !== j) KLA[i].add(j);
    if (mit.length >= 2) {
      const k = kreis('Klasse', key.startsWith('S') ? 'clique_schule' : 'berufsschulklasse', mit.filter(frei).length >= 2 ? mit.filter(frei) : mit, F[mit[0]].ort, null);
      if (k) { for (let a = 0; a < k.mitglieder.length; a++) for (let b = a + 1; b < k.mitglieder.length; b++) kreisKante(k.mitglieder[a], k.mitglieder[b], 'schule_oder_uni', 0.55); sicherKennen(k, 'schule_oder_uni'); }
    }
  }
  const studis = F.filter(p => p.status === 'studium');
  for (const a of studis) for (const b of studis) if (a !== b && a.ort === b.ort && a.bildung.hochschule === b.bildung.hochschule && a.bildung.fach === b.bildung.fach && Math.abs(a.alter - b.alter) <= 3) KLA[a.i].add(b.i);
  // c) Arbeit: Teams
  for (const bt of BETRIEBE) {
    const mit = bt.mitglieder.map(p => p.i);
    for (const i of mit) for (const j of mit) if (i !== j) KOLL[i].add(j);
    if (mit.length >= 3) {
      const k = kreis('Arbeit', 'arbeitskollegen', mit.filter(frei).length >= 2 ? mit.filter(frei) : mit, bt.ort, bt.stadtteil);
      if (k) { for (let a = 0; a < k.mitglieder.length; a++) for (let b = a + 1; b < k.mitglieder.length; b++) kreisKante(k.mitglieder[a], k.mitglieder[b], 'arbeit', 0.4); }
    }
  }
  // d) Verein, Gemeinde, Teehaus, Hobby
  const religionsFamilie = r => (/sunnit|muslim/.test(r) ? 'Moscheegemeinde' : /schiit/.test(r) ? 'schiitische Moscheegemeinde' : /alevit/.test(r) ? 'Cemevi' : /jued/.test(r) ? 'Synagogengemeinde' : /hindu/.test(r) ? 'Tempelgemeinde' : /buddh/.test(r) ? 'Pagode und Ahnenverehrung' : /jesid/.test(r) ? 'jesidischer Verein' : /orthodox/.test(r) ? 'orthodoxe Gemeinde' : /evangelikal|freikirch/.test(r) ? 'Freikirche' : 'Kirchengemeinde');
  const vereinsTopf = new Map();
  const inTopf = (k, i) => { if (!vereinsTopf.has(k)) vereinsTopf.set(k, []); vereinsTopf.get(k).push(i); };
  for (const p of F) {
    if (p.einsam || !frei(p.i)) continue;
    const g = p.glaube;
    if (g && g.praxis && zK.chance(g.praxis === 'stark' ? 0.6 : g.praxis === 'mittel' ? 0.25 : 0.04)) inTopf('gemeinde|' + p.ort + '|' + religionsFamilie(g.richtung), p.i);
    const tee = p.geschlecht === 'm' && p.alter >= 45 && (['TR', 'AZ', 'BG'].includes(p.land) ? 0.4 : p.herkunft.some(h => TUERKISCHSPRACHIG.has(h) || h === 'az') ? 0.22 : p.alter >= 55 ? 0.07 : 0);
    if (tee && zK.chance(tee)) inTopf('teehaus|' + p.ort, p.i);
    const sp = p.alter <= 17 ? 0.32 : p.alter <= 29 ? 0.22 : p.alter <= 49 ? 0.14 : p.alter <= 62 ? 0.07 : 0;
    if (sp && zK.chance(sp)) inTopf('sport|' + p.ort + '|' + (p.alter <= 15 ? 'u16' : p.alter <= 19 ? 'u20' : p.alter <= 35 ? '20-35' : '36-60') + '|' + (p.alter <= 19 ? p.geschlecht : 'x'), p.i);
    if (p.alter >= 16 && zK.chance(0.11)) inTopf('hobby|' + p.ort + '|' + zK.wahl(['Chor', 'Angeln', 'Kochen', 'Brettspiele', 'Musik', 'Kleingarten', 'Handarbeit', 'Fotografie', 'Lesekreis', 'Laufgruppe']), p.i);
  }
  const VEREIN_UNTERART = { gemeinde: 'gemeinde', teehaus: 'teehaus_stammtisch', sport: 'verein_sport', hobby: 'hobbygruppe' };
  for (const [key, kand] of [...vereinsTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [typ, oid, x] = key.split('|');
    for (const gr of gruppiere(kand.filter(frei), 3, typ === 'hobby' ? 7 : 10, i => F[i].alter)) {
      const k = kreis('Verein', VEREIN_UNTERART[typ], gr, oid, null);
      if (!k) continue;
      if (typ === 'gemeinde') k.gemeinde = x; if (typ === 'hobby') k.hobby = x; if (typ === 'sport') k.sport = zK.wahl(['Fußball', 'Fußball', 'Basketball', 'Volleyball', 'Kampfsport', 'Tanz', 'Schwimmen', 'Fitness']);
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) kreisKante(gr[a], gr[b], typ === 'gemeinde' ? 'gemeinde' : 'verein_sport_hobby', 0.3);
      sicherKennen(k, typ === 'gemeinde' ? 'gemeinde' : 'verein_sport_hobby');
    }
  }
  // e) Nachbarschaft und Eltern-Kontakte (je Stadtteil, hoechstens eine Person je Haushalt)
  const nachbarTopf = new Map();
  for (const p of F) {
    if (p.einsam || !frei(p.i) || p.alter < 22) continue;
    const eltern = (p.kleineKinderAlter || []).length > 0 && p.alter <= 50;
    if (!zK.chance(eltern ? 0.55 : 0.4)) continue;
    const k = p.ort + '|' + p.stadtteil + '|' + (eltern ? 'eltern' : 'nachbarn');
    if (!nachbarTopf.has(k)) nachbarTopf.set(k, []); nachbarTopf.get(k).push(p.i);
  }
  for (const [key, kand0] of [...nachbarTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [oid, st, typ] = key.split('|');
    const proHH = new Map(); for (const i of zK.mischen([...kand0])) if (!proHH.has(F[i].hh)) proHH.set(F[i].hh, i);
    for (const gr of gruppiere([...proHH.values()].filter(frei), 3, 6, typ === 'eltern' ? i => F[i].alter : null)) {
      const k = kreis('Nachbarschaft', typ === 'eltern' ? 'eltern_kontakte' : 'nachbarschaft', gr, oid, st);
      if (!k) continue;
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) kreisKante(gr[a], gr[b], typ === 'eltern' ? 'eltern_kontakte' : 'nachbarschaft', 0.4);
      sicherKennen(k, typ === 'eltern' ? 'eltern_kontakte' : 'nachbarschaft');
    }
  }
  // f) Online-Gruppen (ueber Orte hinweg, nach gemeinsamer Sprache)
  const onlineSprache = p => {
    const s = new Set(p.sprachen.filter(x => ['Muttersprache', 'sehr gut', 'gut'].includes(x.niveau)).map(x => x.sprache));
    if (s.has('Türkisch') && (p.land === 'TR' || zK.chance(0.4))) return 'Türkisch';
    if (s.has('Deutsch') || s.has('Schweizerdeutsch')) return 'Deutsch';
    if (s.has('Englisch')) return 'Englisch';
    if (s.has('Niederländisch')) return 'Niederländisch';
    if (s.has('Französisch')) return 'Französisch';
    if (s.has('Aserbaidschanisch')) return 'Türkisch';
    if (s.has('Arabisch')) return 'Arabisch';
    return 'Englisch';
  };
  const onlineAktiv = F.filter(p => p.alter <= 45 && (['regelmaessig', 'vielspieler'].includes(p.spielen.videospiele) || (p.spielen.videospiele === 'gelegentlich' && p.alter < 30 && zK.chance(0.3))));
  for (const p of onlineAktiv) p.onlineSprache = onlineSprache(p);
  const onlineAktivSet = new Set(onlineAktiv.map(p => p.i));
  const onlineAktivListe = onlineAktiv.map(p => p.i);
  const onlineTopf = new Map();
  for (const p of onlineAktiv) {
    if (!frei(p.i) || !zK.chance(0.75)) continue;
    if (p.einsam && ZIELGRAD[p.i] < 2) continue;
    const k = p.onlineSprache + '|' + (p.alter <= 17 ? '12-17' : p.alter <= 29 ? '18-29' : '30-45');
    if (!onlineTopf.has(k)) onlineTopf.set(k, []); onlineTopf.get(k).push(p.i);
  }
  for (const [key, kand] of [...onlineTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const gr0 of gruppiere(kand.filter(frei), 3, 6, null)) {
      // Einsame nur in Dreiergruppen (hoechstens zwei Online-Freunde)
      const gr = gr0.length > 3 ? gr0.filter(i => !F[i].einsam) : gr0;
      if (gr.length < 3) continue;
      const k = kreis('Online', 'online_gruppe', gr, 'online', null);
      if (!k) continue;
      k.sprache = key.split('|')[0];
      k.spiel = zK.wahl([...new Set(gr.flatMap(i => F[i].spielen.lieblingsspiele.filter(x => VIDEOSPIELE.has(x))))].concat(['verschiedene Online-Spiele']));
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) kreisKante(gr[a], gr[b], 'online', 0.9);
      sicherKennen(k, 'online');
    }
  }
  // g) Freunde: Uni-Freunde und Freundescliquen im Ort
  const uniTopf = new Map();
  for (const p of studis) { if (p.einsam || !frei(p.i)) continue; const k = p.ort + '|' + p.bildung.hochschule; if (!uniTopf.has(k)) uniTopf.set(k, []); uniTopf.get(k).push(p.i); }
  for (const [key, kand] of [...uniTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const gr of gruppiere(kand.filter(frei), 3, 6, i => F[i].alter)) {
      const k = kreis('Freunde', 'uni_freunde', gr, key.split('|')[0], null);
      if (!k) continue; k.hochschule = key.split('|')[1];
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) kreisKante(gr[a], gr[b], 'schule_oder_uni', 0.65);
      sicherKennen(k, 'schule_oder_uni');
    }
  }
  const cliquenTopf = new Map();
  for (const p of F) {
    if (p.einsam || !frei(p.i)) continue;
    if (!zK.chance(p.alter <= 29 ? 0.92 : p.alter <= 59 ? 0.75 : 0.6)) continue;
    const k = p.ort + '|' + (p.alter <= 15 ? 'a' : p.alter <= 19 ? 'b' : p.alter <= 25 ? 'c' : p.alter <= 35 ? 'd' : p.alter <= 50 ? 'e' : p.alter <= 65 ? 'f' : 'g');
    if (!cliquenTopf.has(k)) cliquenTopf.set(k, []); cliquenTopf.get(k).push(p.i);
  }
  for (const [key, kand] of [...cliquenTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const jung = 'abc'.includes(key.split('|')[1]);
    // aehnliche Herkunft oder Sprache liegt naeher beieinander, Mischung bleibt moeglich
    const sortKey = i => (F[i].herkunft[0] < 'm' ? 0 : 1) * 0.5 + zK.z() + (F[i].stadtteil.charCodeAt(0) % 7) * 0.3;
    for (const gr of gruppiere(kand.filter(frei), 3, 6, sortKey)) {
      const k = kreis('Freunde', jung ? 'clique' : 'freundeskreis', gr, key.split('|')[0], null);
      if (!k) continue;
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) {
        const art = jung ? (zK.chance(0.75) ? 'schule_oder_uni' : 'nachbarschaft') : zK.gewichtet({ arbeit: 0.3, nachbarschaft: 0.3, schule_oder_uni: 0.25, verein_sport_hobby: 0.15 });
        kreisKante(gr[a], gr[b], art, 0.7);
      }
      sicherKennen(k, 'nachbarschaft');
    }
  }
  // h) Kreise auffuellen: Wer weniger Kreise hat als vorgesehen, schliesst sich einem passenden Kreis an
  const artVonKreis = k => (k.art === 'Online' ? 'online' : k.unterart === 'gemeinde' ? 'gemeinde' : k.art === 'Verein' ? 'verein_sport_hobby' : k.unterart === 'eltern_kontakte' ? 'eltern_kontakte' : k.art === 'Nachbarschaft' ? 'nachbarschaft' : 'schule_oder_uni');
  const median = arr => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const fuellReihe = zK.mischen(F.filter(p => !p.einsam).map(p => p.i));
  for (let runde = 0; runde < 5; runde++) for (const i of fuellReihe) {
    if (KZ[i] >= Math.min(4, KREISZIEL[i])) continue;
    const p = F[i];
    const passend = KREISE.filter(k => k.mitglieder.length >= 2 && k.mitglieder.length < 10 && !k.mitglieder.includes(i)
      && ['Freunde', 'Verein', 'Nachbarschaft', 'Online'].includes(k.art)
      && (k.art === 'Online' ? (onlineAktivSet.has(i) && k.sprache === p.onlineSprache) : k.ort === p.ort)
      && (k.art !== 'Nachbarschaft' || k.stadtteil === p.stadtteil)
      && (k.unterart !== 'gemeinde' || (p.glaube?.praxis && ['stark', 'mittel'].includes(p.glaube.praxis) && religionsFamilie(p.glaube.richtung) === k.gemeinde))
      && (k.unterart !== 'teehaus_stammtisch' || (p.geschlecht === 'm' && p.alter >= 40))
      && (k.unterart !== 'eltern_kontakte' || hatKinder(p))
      && (k.unterart !== 'uni_freunde' || (p.status === 'studium' && p.bildung.hochschule === k.hochschule))
      && Math.abs(p.alter - median(k.mitglieder.map(j => F[j].alter))) <= (k.art === 'Nachbarschaft' || k.unterart === 'gemeinde' ? 30 : p.alter < 20 ? 3 : 12));
    if (!passend.length) continue;
    // lieber Kreise, in denen die Figur schon jemanden kennt
    const k = zK.gewichtet(passend.map(k => [k, k.mitglieder.some(j => kennen(i, j)) ? 4 : 1]));
    const art = artVonKreis(k);
    k.mitglieder.push(i); KZ[i]++;
    if (!k.mitglieder.some(j => j !== i && kennen(i, j))) {
      const j = k.mitglieder.filter(j => j !== i && !F[j].einsam).sort((a, b) => (grad(a) - ZIELGRAD[a]) - (grad(b) - ZIELGRAD[b]))[0];
      if (j !== undefined) { if (art === 'online') online(i, j); else freund(i, j, art); }
    }
    if (!k.mitglieder.some(j => j !== i && kennen(i, j))) { k.mitglieder.pop(); KZ[i]--; }
  }
  // wer danach noch Platz hat, bildet mit Gleichaltrigen im Ort einen weiteren Freundeskreis
  const restTopf = new Map();
  for (const i of fuellReihe) {
    if (KZ[i] >= Math.min(4, KREISZIEL[i])) continue;
    const p = F[i];
    const k = p.ort + '|' + (p.alter <= 17 ? Math.floor(p.alter / 2) : p.alter <= 30 ? 'j' : p.alter <= 50 ? 'm' : p.alter <= 68 ? 'a' : 's');
    if (!restTopf.has(k)) restTopf.set(k, []); restTopf.get(k).push(i);
  }
  for (const [key, kand] of [...restTopf.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const gr of gruppiere(kand, 3, 5, i => F[i].alter + (F[i].stadtteil.charCodeAt(0) % 5) * 0.4)) {
      const k = kreis('Freunde', F[gr[0]].alter <= 25 ? 'clique' : 'freundeskreis', gr, key.split('|')[0], null);
      if (!k) continue;
      for (let a = 0; a < gr.length; a++) for (let b = a + 1; b < gr.length; b++) kreisKante(gr[a], gr[b], F[gr[a]].alter <= 25 ? 'schule_oder_uni' : 'nachbarschaft', 0.55);
      sicherKennen(k, 'nachbarschaft');
    }
  }
  // i) Auffuellen bis zur Zielzahl an Freunden: erst die Art der Beziehung (Bauplan kanten_arten), dann eine passende Person
  const proOrt = new Map(); for (const p of F) { if (!proOrt.has(p.ort)) proOrt.set(p.ort, []); proOrt.get(p.ort).push(p.i); }
  const proLand = new Map(); for (const p of F) { if (!proLand.has(p.land)) proLand.set(p.land, []); proLand.get(p.land).push(p.i); }
  const proStadtteil = new Map(); for (const p of F) { const k = p.ort + '|' + p.stadtteil; if (!proStadtteil.has(k)) proStadtteil.set(k, []); proStadtteil.get(k).push(p.i); }
  const nachHerkunft = new Map(); for (const p of F) for (const h of p.herkunft) { if (!nachHerkunft.has(h)) nachHerkunft.set(h, []); nachHerkunft.get(h).push(p.i); }
  const teilt = (i, j) => { let n = 0; for (const x of FR[i]) if (FR[j].has(x)) n++; return n; };
  const sprachSet = F.map(p => new Set(p.sprachen.filter(x => ['Muttersprache', 'sehr gut', 'gut'].includes(x.niveau)).map(x => x.sprache)));
  const gemeinsameSprache = (i, j) => { for (const s of sprachSet[i]) if (sprachSet[j].has(s)) return true; return false; };
  const religioes = p => p.glaube?.praxis === 'stark' || p.glaube?.praxis === 'mittel';
  const KA = ohneMeta(SO.netz_in_der_welt.kanten_arten);
  const trSpr = x => x.herkunft.some(h => TUERKISCHSPRACHIG.has(h));
  function verwandtOrt(a, q) {
    if (q.ort === a.ort) return 1;
    if (trSpr(a) && trSpr(q) && (a.land === 'TR') !== (q.land === 'TR')) return 0.3;   // Diaspora und Tuerkei
    if (a.herkunft.includes('tr_balkan') && q.herkunft.includes('tr_balkan')) return 0.4;
    if (a.land === 'TR' && q.land === 'TR') return 0.15;   // Binnenwanderung
    if (a.herkunft.includes('az') && q.herkunft.includes('az')) return 0.3;
    return a.land === q.land ? 0.03 : 0;
  }
  function basisGewicht(i, j) {
    const a = F[i], b = F[j];
    if (j === i || b.einsam || FR[i].has(j) || ON[i].has(j) || kern(i, j)) return 0;
    if (grad(j) >= ZIELGRAD[j] + 1) return 0;
    if (a.alter < 18 || b.alter < 18) { if (Math.abs(a.alter - b.alter) > 3) return 0; }
    let w = grad(j) < ZIELGRAD[j] ? 2 : 0.5;
    w *= 1 + 1.5 * teilt(i, j);
    if (a.alter < 18 && b.alter < 18) w *= a.geschlecht === b.geschlecht ? 1.6 : 0.6;
    return w;
  }
  function kandidaten(i, art) {
    const a = F[i]; const out = [];
    const d = q => Math.abs(q.alter - a.alter);
    const nimm = (liste, f) => { for (const j of liste) { const x = f(F[j]); if (!(x > 0)) continue; const w = basisGewicht(i, j); if (w) out.push([j, w * x]); } };
    switch (art) {
      case 'familie_und_verwandte': {
        // Verwandte leben meist im selben Ort; in rund jedem fuenften Fall anderswo (Diaspora und Tuerkei, Binnenwanderung)
        const quer = zK.chance(0.12);
        const pool = new Set(); for (const h of a.herkunft) for (const j of nachHerkunft.get(h) || []) pool.add(j);
        nimm([...pool], q => (q.hh === a.hh || !gemeinsameSprache(i, q.i) || (quer ? q.ort === a.ort : q.ort !== a.ort) ? 0 : verwandtOrt(a, q) * Math.exp(-d(q) / 25)));
        break;
      }
      case 'schule_oder_uni': {
        const weit = a.alter >= 22 && zK.chance(0.12);
        nimm(weit ? proLand.get(a.land) : proOrt.get(a.ort), q => (d(q) <= (Math.min(a.alter, q.alter) < 25 ? 2 : 4) && gemeinsameSprache(i, q.i) ? Math.exp(-d(q) / 2) * (KLA[i].has(q.i) ? 3 : 1) : 0));
        break;
      }
      case 'arbeit': {
        const arbeitet = x => ['erwerbstaetig', 'elternzeit'].includes(x.status) || !!x.frueherJob;
        if (!arbeitet(a)) return out;
        nimm(proOrt.get(a.ort), q => (arbeitet(q) && d(q) <= 15 && gemeinsameSprache(i, q.i) ? (KOLL[i].has(q.i) ? 4 : 1) : 0));
        break;
      }
      case 'nachbarschaft': nimm(proStadtteil.get(a.ort + '|' + a.stadtteil) || [], q => (q.hh !== a.hh && d(q) <= 25 && gemeinsameSprache(i, q.i) ? Math.exp(-d(q) / 15) : 0)); break;
      case 'verein_sport_hobby': nimm(proOrt.get(a.ort), q => (d(q) <= 12 && gemeinsameSprache(i, q.i) ? Math.exp(-d(q) / 8) : 0)); break;
      case 'gemeinde':
        if (!religioes(a)) return out;
        nimm(proOrt.get(a.ort), q => (religioes(q) && religionsFamilie(q.glaube.richtung) === religionsFamilie(a.glaube.richtung) && gemeinsameSprache(i, q.i) ? Math.exp(-d(q) / 20) : 0));
        break;
      case 'online':
        if (!onlineAktivSet.has(i) && !(a.alter <= 35 && a.spielen.videospiele !== 'nie')) return out;
        nimm(onlineAktivListe, q => (d(q) <= 6 && gemeinsameSprache(i, q.i) ? (q.ort === a.ort ? 3 : 1) : 0));
        break;
      case 'eltern_kontakte':
        if (!hatKinder(a)) return out;
        nimm(proStadtteil.get(a.ort + '|' + a.stadtteil) || [], q => (hatKinder(q) && q.hh !== a.hh && d(q) <= 12 ? 1 : 0));
        break;
      default: break;
    }
    return out;
  }
  const auffuellReihe = zK.mischen([...F.keys()]);
  for (let runde = 0; runde < 30; runde++) {
    let neu = 0;
    for (const i of auffuellReihe) {
      if (F[i].einsam || grad(i) >= ZIELGRAD[i]) continue;
      for (let t = 0; t < 5; t++) {
        const art = zK.gewichtet(KA);
        const kand = kandidaten(i, art);
        if (!kand.length) continue;
        const j = zK.gewichtet(kand);
        if (art === 'online' ? online(i, j) : freund(i, j, art)) { neu++; break; }
      }
    }
    if (!neu) break;
  }
  // Einzelne Online-Freundschaften (Bauplan: mindestens ein Online-Freund nach Alter)
  const OQ = SO.online_freundschaften.mindestens_ein_online_freund;
  for (const p of F) {
    if (ON[p.i].size || p.einsam && budget(p.i) <= 0) continue;
    if (p.alter < 30 && grad(p.i) > ZIELGRAD[p.i]) continue;
    const q = OQ[p.alter <= 17 ? '12-17' : p.alter <= 29 ? '18-29' : p.alter <= 49 ? '30-49' : p.alter <= 64 ? '50-64' : '65+'];
    if (!zK.chance(q * 0.5)) continue;
    const kand = F.filter(x => x !== p && !x.einsam && Math.abs(x.alter - p.alter) <= (p.alter < 18 ? 3 : 10) && gemeinsameSprache(p.i, x.i) && !FR[p.i].has(x.i));
    if (kand.length) online(p.i, zK.gewichtet(kand.map(x => [x.i, x.ort === p.ort ? 2 : 1])));
  }

  // ---------- 19. Freie Zeit und Treffen ----------
  const zF = Z('freizeit');
  const MUSTER = Object.fromEntries(SO.freie_zeiten.muster.map(m => [m.code, m]));
  for (const p of F) {
    const z = p.arbeitszeit?.zeiten || [];
    const kleinU6 = (p.kleineKinderAlter || []).some(x => x < 6);
    const vereinFest = p.einsam ? false : KREISE.some(k => k.mitglieder.includes(p.i) && ['teehaus_stammtisch', 'verein_sport', 'gemeinde', 'hobbygruppe'].includes(k.unterart));
    let m;
    if (p.probleme.includes('pflege_angehoerige') && zF.chance(0.6)) m = 'kaum_frei';
    else if (p.hh.art === 'alleinerziehend' && p.kinder.length && kleinU6 && zF.chance(0.6)) m = 'kaum_frei';
    else if (p.status === 'schule') m = (p.probleme.includes('pruefungsstress') && zF.chance(0.5)) ? 'kaum_frei' : zF.gewichtet({ nachmittags: 0.55, spaet_abends_und_nachts: p.alter >= 15 ? 0.3 : 0.1, werktags_abends_und_wochenende: 0.12, nur_wochenende: p.alter >= 15 ? 0.08 : 0.05, kaum_frei: 0.05 });
    else if (z.includes('schicht') || z.includes('nacht')) m = 'nach_schichtplan';
    else if (p.erwerbsform === 'selbststaendig' || p.job?.branche === 'plattform' || z.includes('saison') || z.includes('unregelmaessig')) m = zF.chance(0.6) ? 'unregelmaessig_spontan' : 'nur_wochenende';
    else if (z.includes('lange_tage') || z.includes('reise') || (p.status === 'erwerbstaetig' && GROSSSTADT.has(p.ort) && zF.chance(0.15))) m = 'nur_wochenende';
    else if (p.status === 'studium' || (p.alter <= 29 && p.spielneigung >= 4 && zF.chance(0.6))) m = zF.chance(0.65) ? 'spaet_abends_und_nachts' : 'werktags_abends_und_wochenende';
    else if (p.status === 'rente') m = vereinFest && zF.chance(0.5) ? 'feste_runde' : zF.gewichtet({ nachmittags: 0.42, werktags_abends_und_wochenende: 0.18, unregelmaessig_spontan: 0.17, feste_runde: 0.1, kaum_frei: p.alter >= 80 ? 0.15 : 0.05 });
    else if (['haushalt', 'elternzeit'].includes(p.status)) m = kleinU6 && zF.chance(0.5) ? 'kaum_frei' : zF.gewichtet({ nachmittags: 0.45, werktags_abends_und_wochenende: 0.25, unregelmaessig_spontan: 0.15, feste_runde: vereinFest ? 0.2 : 0.03 });
    else if (['arbeitslos', 'erwerbsunfaehig', 'neet'].includes(p.status)) m = zF.gewichtet({ unregelmaessig_spontan: 0.35, nachmittags: 0.3, spaet_abends_und_nachts: p.alter < 35 ? 0.3 : 0.05, werktags_abends_und_wochenende: 0.1 });
    else m = vereinFest && zF.chance(0.3) ? 'feste_runde' : 'werktags_abends_und_wochenende';
    p.freizeit = m;
  }
  const TE = SO.treff_erlaubnis;
  const hhStrenge = new Map();
  for (const hh of HAUSHALTE) hhStrenge.set(hh, { s: zF.z(), bias: zF.gewichtet({ keiner: 0.7, toechter: 0.2, soehne: 0.1 }) });
  for (const p of F) {
    const a = p.alter;
    let stufe, grund = null;
    if (a <= 17 && !p.info.ausnahme) {
      const d = TE.verteilung[a <= 15 ? '12-15' : '16-17'];
      const st = hhStrenge.get(p.hh);
      // Geschwister aehneln sich, aber nicht immer: ein Teil der Jugendlichen hat eigene Regeln (Alter, Vertrauen, Anlass)
      const basis = zF.chance(0.35) ? zF.z() : st.s;
      let s = basis + ((st.bias === 'toechter' && p.geschlecht === 'w') || (st.bias === 'soehne' && p.geschlecht === 'm') ? 0.08 : 0);
      s = Math.min(0.999, s);
      const c1 = d.frei, c2 = c1 + d.abgesprochen, c3 = c2 + d.eingeschraenkt;
      stufe = s < c1 ? 'frei' : s < c2 ? 'abgesprochen' : s < c3 ? 'eingeschraenkt' : 'kaum';
      if (stufe === 'eingeschraenkt' || stufe === 'kaum') grund = 'strenge Eltern (Uhrzeit, gemischte Gruppen, Übernachten)';
    } else {
      const gruende = [];
      if ((p.kleineKinderAlter || []).some(x => x < 6) && (p.hh.art === 'alleinerziehend' || zF.chance(0.2))) gruende.push('kleine Kinder ohne Betreuung');
      if (p.probleme.includes('pflege_angehoerige')) gruende.push('Pflege eines Angehörigen');
      if (p.freizeit === 'nach_schichtplan' && zF.chance(0.25)) gruende.push('Schichtplan');
      if ((p.probleme.includes('chronische_krankheit') || p.probleme.includes('behinderung')) && zF.chance(0.45)) gruende.push('Krankheit oder Behinderung');
      if (p.schicht === 'knapp' && zF.chance(0.2)) gruende.push('Geld');
      if (p.probleme.includes('depression_angst') && zF.chance(0.3)) gruende.push('Angst oder Unsicherheit');
      if (p.hh.form === 'arbeiterunterkunft' || p.hh.form === 'wohnheim' || p.info.ausnahme) gruende.push('Regeln im Wohnheim oder in der Unterkunft');
      if (p.partner && zF.chance(0.03)) gruende.push('Partner oder Partnerin will mitbestimmen oder ist eifersüchtig');
      if (zF.chance(0.02)) gruende.push('Erwartungen der Familie oder Gemeinde');
      const d = { ...ohneMeta(TE.verteilung[a <= 29 ? '18-29' : a <= 64 ? '30-64' : '65+']) };
      const gebrechlich = (a >= 75 && (p.probleme.includes('chronische_krankheit') || p.probleme.includes('behinderung'))) || a >= 88;
      if (gebrechlich && zF.chance(0.65)) { stufe = 'kaum'; grund = 'Krankheit oder Behinderung'; }
      else if (gruende.length && zF.chance(0.5)) { stufe = gruende.length >= 2 && zF.chance(0.6) ? 'kaum' : 'eingeschraenkt'; grund = gruende[0]; }
      else { delete d.eingeschraenkt; delete d.kaum; stufe = zF.gewichtet(d); if (stufe === 'abgesprochen' && !p.partner && p.hh.mitglieder.length === 1 && zF.chance(0.5)) stufe = 'frei'; }
    }
    p.treffen = stufe; p.treffenGrund = grund;
    // Hindernisse in einer typischen Woche
    const h = [];
    const z = p.arbeitszeit?.zeiten || [];
    const add = (t, q) => { if (zF.chance(q)) h.push(t); };
    if (z.some(x => ['schicht', 'nacht', 'wochenende'].includes(x))) add('Schicht-, Nacht- oder Wochenendarbeit', 0.75);
    if ((p.kleineKinderAlter || []).some(x => x < 6)) add('kleine Kinder unter 6 ohne Betreuung am Abend', 0.85);
    if (z.includes('lange_tage') || z.includes('reise') || p.nebenjob || p.freizeit === 'nur_wochenende' || ['Esenyurt', 'Bağcılar'].some(x => p.stadtteil.startsWith(x))) add('lange Arbeitstage, Zweitjob oder langes Pendeln', 0.6);
    else if (p.status === 'erwerbstaetig' && (p.land === 'TR' || p.erwerbsform === 'selbststaendig' || GROSSSTADT.has(p.ort))) add('lange Arbeitstage, Zweitjob oder langes Pendeln', 0.2);
    if (p.probleme.includes('pruefungsstress') || (p.status === 'schule' && ['TR', 'AZ'].includes(p.land) && [13, 14, 17].includes(p.alter))) add('Prüfungen und Lernen', 0.85);
    else if (['schule', 'studium', 'ausbildung'].includes(p.status)) add('Prüfungen und Lernen', 0.3);
    if (p.schicht === 'knapp' || (['schule', 'studium', 'ausbildung', 'arbeitslos'].includes(p.status) && p.schicht === 'untere_mitte')) add('Geld knapp für Café, Fahrt oder Eintritt', 0.55);
    if ((a <= 17 && ['eingeschraenkt', 'kaum'].includes(stufe)) || (p.treffenGrund || '').startsWith('Partner')) add('Erlaubnis der Eltern oder des Partners', 0.8);
    if (istLaendlich(p.ort, p.stadtteil) || (p.ort === 'paterson' && (p.alter < 18 || p.schicht === 'knapp'))) add('Entfernung und schlechte Verbindung', 0.75);
    else if (['Spandau', 'Marzahn', 'Esenyurt', 'Chorweiler', 'Rheinhausen', 'Etimesgut', 'Floridsdorf', 'Riehen', 'Clifton', 'Talas', 'Sabunçu'].some(x => p.stadtteil.startsWith(x))) add('Entfernung und schlechte Verbindung', 0.2);
    if (p.probleme.includes('pflege_angehoerige')) add('Pflege eines Angehörigen', 0.85);
    else if (a >= 25 && a <= 70 && p.hh.mitglieder.some(x => x !== p && istFigur(x) && (x.alter >= 80 || (x.probleme || []).includes('behinderung')))) add('Pflege eines Angehörigen', 0.35);
    if (p.probleme.some(x => ['chronische_krankheit', 'behinderung', 'ueberlastung'].includes(x)) || (p.probleme.includes('depression_angst') && zF.chance(0.4))) add('Krankheit, Schmerzen, Erschöpfung', 0.5);
    if (a <= 35 && (p.probleme.includes('depression_angst') || p.probleme.includes('mobbing') || p.einsam)) add('soziale Angst oder Schüchternheit', 0.5);
    add('keine Lust, müde, lieber zu Hause', 0.21);
    if (p.land === 'TR' || p.land === 'AZ' || p.land === 'BG' || p.herkunft.some(x => TR_WURZELN.has(x))) add('Familienpflichten (Besuche, Hochzeiten, Beerdigungen, Feste)', 0.17);
    if (p.glaube && /sunnit|schiit|muslim|alevit/.test(p.glaube.richtung) && p.glaube.praxis === 'stark') add('Fastenmonat und religiöse Pflichten verschieben die Zeit', 0.6);
    if (p.hh.mitglieder.length >= 6 || p.hh.form === 'arbeiterunterkunft' || p.hh.form === 'wohnheim' || (p.hh.mitglieder.length >= 4 && p.schicht === 'knapp')) add('kein Platz für Gäste in der Wohnung', 0.5);
    if (WETTER_ORTE.has(p.ort)) add('Wetter und Jahreszeit', 0.4);
    else if (p.alter >= 70) add('Wetter und Jahreszeit', 0.05);
    const landSpr = p.sprachen.find(s => s.sprache === LANDESSPRACHE[p.land] || (p.land === 'CH' && s.sprache === 'Schweizerdeutsch'));
    if (p.gen === 1 && ((p.seit && JAHR - p.seit <= 4) || !landSpr || ['Grundkenntnisse', 'mittel'].includes(landSpr.niveau))) add('Sprache', 0.6);
    p.hindernisse = h.slice(0, 3);
  }

  // ---------- 20. Ausgabe ----------
  const id = x => (x ? x.id : null);
  const ids = arr => [...new Set(arr.filter(Boolean).map(x => x.id))].sort();
  const figuren = F.map(p => {
    const kleineKinder = [...(p.kleineKinderAlter || [])].sort((a, b) => a - b);
    const kleineGeschw = [];
    for (const e of p.eltern) for (const k of e.kinder) if (!istFigur(k) && !kleineGeschw.includes(k)) kleineGeschw.push(k);
    const f = {
      id: p.id, haushalt_id: p.hh.id, vorname: p.vorname, nachname: p.nachname, name: p.vorname + ' ' + p.nachname,
      alter: p.alter, geschlecht: p.geschlecht, herkunft: p.herkunft,
      einwanderung: p.gen === null ? null : (p.gen === 1 ? { generation: 1, seit: p.seit } : { generation: p.gen }),
      land: p.land, ort: p.ort, stadtteil: p.stadtteil, sprachen: p.sprachen,
      glaube: p.glaube,
      bildung: p.bildung,
      status: p.status, taetigkeit: taetigkeitText(p), beruf: p.status === 'erwerbstaetig' || p.status === 'elternzeit' ? p.job.titel : null,
      arbeitszeit: p.arbeitszeit || null,
      einkommen: p.einkommen, schicht: p.schicht,
      familienstand: p.familienstand || 'ledig', partner_id: id(p.partner),
      kinder_ids: ids(p.kinder.filter(istFigur)), kleine_kinder: kleineKinder, eltern_ids: ids(p.eltern.filter(istFigur)), geschwister_ids: ids(geschwister(p)),
      freunde_ids: [...FR[p.i]].map(j => F[j].id).sort(), kollegen_ids: [...KOLL[p.i]].map(j => F[j].id).sort(),
      klassen_ids: [...KLA[p.i]].map(j => F[j].id).sort(), online_freunde_ids: [...ON[p.i]].map(j => F[j].id).sort(),
      kreise_ids: [], einsam: p.einsam, freunde_ausserhalb: p.freundeAusserhalb,
      geraet: p.geraet,
      denkstil: p.denkstil, denkstil_art: p.denkstilArt,
      freizeit_muster: p.freizeit, treffen_erlaubt: p.treffen, treffen_hindernis: p.hindernisse,
      problem_arten: p.probleme, lebensereignis: p.lebensereignis,
      spielneigung: p.spielneigung, spielen: p.spielen, medien: p.medien,
    };
    // optionale Felder nur, wenn sie zutreffen
    if (p.geburtsname !== p.nachname) f.geburtsname = p.geburtsname;
    if (p.betrieb) { f.arbeitgeber = p.arbeitgeber; f.betrieb_id = p.betrieb; } else if (p.arbeitgeber) f.arbeitgeber = p.arbeitgeber;
    if (p.erwerbsform) f.erwerbsform = p.erwerbsform;
    if (p.nebenjob) f.nebenjob = gendern(p.nebenjob.titel, p.geschlecht);
    if (p.frueherJob) f.frueherer_beruf = p.frueherJob.titel;
    if (p.bildungAusnahme) f.bildung_ausnahme = p.bildungAusnahme;
    if (p.bildungHinweis) f.bildung_hinweis = p.bildungHinweis;
    if (p.info.partnerGrund) f.partner_grund = p.info.partnerGrund;
    if (p.info.partnerExtern) f.partner_extern = p.info.partnerExtern;
    if (p.info.kinderAusserhalb) f.kinder_ausserhalb = p.info.kinderAusserhalb;
    if (p.info.kinderNotiz) f.kinder_hinweis = p.info.kinderNotiz;
    if (kleineGeschw.length) f.kleine_geschwister = kleineGeschw.map(k => k.alter).sort((a, b) => a - b);
    if (p.info.ausnahme) f.ausnahme = p.info.ausnahme;
    if (p.treffenGrund) f.treffen_grund = p.treffenGrund;
    if (p.info.queer) f.queer = p.info.queer;
    if (p.status === 'dienst') f.abwesend = dienstText(p);
    return f;
  });
  function taetigkeitText(p) {
    const g = p.geschlecht, w = g === 'w';
    switch (p.status) {
      case 'erwerbstaetig': return gendern(p.job.titel, g) + (p.arbeitszeit?.umfang === 'Teilzeit' ? ' (Teilzeit)' : '');
      case 'schule': return (w ? 'Schülerin' : 'Schüler') + ', ' + p.bildung.klasse + ' (' + p.bildung.schulform + ')';
      case 'ausbildung': return 'Ausbildung: ' + gendern(p.bildung.beruf, g) + ', ' + p.bildung.lehrjahr + '. Lehrjahr';
      case 'studium': return 'Studium ' + p.bildung.fach + ', ' + p.bildung.semester + '. Semester (' + p.bildung.hochschule + ')';
      case 'arbeitslos': return 'arbeitssuchend' + (p.frueherJob ? ', zuletzt ' + gendern(p.frueherJob.titel, g) : '');
      case 'haushalt': return (w ? 'Hausfrau' : 'Hausmann') + (p.frueherJob ? ', früher ' + gendern(p.frueherJob.titel, g) : '');
      case 'elternzeit': return 'Elternzeit, sonst ' + gendern(p.job.titel, g);
      case 'rente': return (w ? 'Rentnerin' : 'Rentner') + (p.frueherJob ? ', früher ' + gendern(p.frueherJob.titel, g) : p.renteHinweis ? ' (' + p.renteHinweis + ')' : '');
      case 'erwerbsunfaehig': return 'erwerbsunfähig' + (p.frueherJob ? ', früher ' + gendern(p.frueherJob.titel, g) : '');
      case 'dienst': return dienstText(p);
      case 'neet': return 'ohne Arbeit, Schule oder Ausbildung';
      default: return p.status;
    }
  }
  function dienstText(p) {
    return { TR: 'Wehrdienst (Askerlik), stationiert außerhalb', AZ: 'Wehrdienst (Hərbi xidmət)', AT: p.geschlecht === 'm' && zF.chance(0.5) ? 'Zivildienst' : 'Grundwehrdienst', CH: 'Rekrutenschule (Militärdienst)' }[p.land] || 'Freiwilligendienst (FSJ oder BFD)';
  }
  const kreiseAus = KREISE.filter(k => k.mitglieder.length >= 2).map((k, n) => {
    const kid = 'K' + String(n + 1).padStart(3, '0');
    const art = SO.kreise.arten.find(a => a.art === k.unterart);
    const o = { kreis_id: kid, art: k.art, unterart: k.unterart, ort: k.ort };
    if (k.stadtteil) o.stadtteil = k.stadtteil;
    if (k.gemeinde) o.gemeinde = k.gemeinde; if (k.hobby) o.hobby = k.hobby; if (k.sport) o.sport = k.sport;
    if (k.sprache) o.sprache = k.sprache; if (k.spiel) o.spiel = k.spiel; if (k.hochschule) o.hochschule = k.hochschule;
    o.mitglieder = k.mitglieder.map(i => F[i].id).sort();
    if (art) { o.treffen = art.treffen; o.typisch = art.typisch; }
    else if (k.unterart === 'clique' || k.unterart === 'freundeskreis') { o.treffen = 'wöchentlich bis monatlich'; o.typisch = 'abhängen, reden, essen, ausgehen, spielen'; }
    else if (k.unterart === 'berufsschulklasse') { o.treffen = 'an Berufsschultagen'; o.typisch = 'Pausen, Lerngruppen, ab und zu abends'; }
    for (const i of k.mitglieder) figuren[i].kreise_ids.push(kid);
    return o;
  });
  const haushalte = sortiertHH.map(hh => {
    const o = { haushalt_id: hh.id, art: hh.art, land: hh.land, ort: hh.o.id, stadtteil: hh.st.name, mitglieder: hh.mitglieder.filter(istFigur).map(p => p.id) };
    const klein = hh.mitglieder.filter(p => !istFigur(p)).map(p => ({ alter: p.alter, geschlecht: p.geschlecht, eltern_ids: p.eltern.map(e => e.id).filter(Boolean) }));
    if (klein.length) o.kleine_kinder = klein;
    if (hh.form) o.form = hh.form;
    if (hh.hinweis) o.hinweis = hh.hinweis;
    return o;
  });
  const betriebe = BETRIEBE.map(b => ({ betrieb_id: b.betrieb_id, name: b.name, art: b.art, ort: b.ort, stadtteil: b.stadtteil, mitglieder: b.mitglieder.map(p => p.id) }));
  const netz = [...KANTEN.entries()].map(([k, v]) => { const [i, j] = k.split('|').map(Number); return { a: F[i].id, b: F[j].id, art: v.art, staerke: v.staerke }; })
    .sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : 1));
  const meta = {
    titel: 'Skelett der MSY-Welt (1000 Figuren)',
    version: '1.0',
    erzeugt_mit: 'werkzeug/welt-skelett.mjs',
    startwert: SEED,
    bauplan_version: B.meta?.version ?? null,
    stichtag: STICHTAG,
    hinweis: 'Alle Figuren, Schulen und Betriebe sind erfunden. Übereinstimmungen mit echten Personen, Schulen oder Firmen sind Zufall. Echte Orte, Stadtteile und öffentliche Hochschulen werden genannt. Das Skelett legt die Fakten fest; Steckbriefe (figuren-01.json bis figuren-10.json) übernehmen diese Felder unverändert und ergänzen das Leben.',
    felder: {
      id: 'F0001 bis F1000', haushalt_id: 'Haushalt (siehe haushalte)', name: 'Vorname und Nachname, wie im Alltag', herkunft: 'Codes der Herkunftsgruppen (bauplan.herkunft.gruppen), bei gemischten Wurzeln zwei',
      einwanderung: 'null = keine Einwanderungsgeschichte im Land; generation 1 = selbst zugewandert (seit Jahr), 2 = Eltern, 3 = Großeltern', ort: 'Ort-ID aus bauplan.orte',
      sprachen: 'Sprachen mit Niveau', glaube: 'richtung (bauplan.herkunft.gruppen.glaube) und praxis (stark, mittel, kaum, gar_nicht; null ohne Religion)',
      bildung: 'stufe schule (schulform, schule, klasse), ausbildung (beruf, berufsschule, lehrjahr), studium (hochschule, fach, semester) oder abschluss; abschluss = Code aus bauplan.bildung.abschluss_codes',
      status: 'Code aus bauplan.taetigkeiten.status.codes', taetigkeit: 'Tätigkeit in Worten', beruf: 'Berufsbezeichnung aus dem Katalog (bei erwerbstaetig und elternzeit)',
      arbeitszeit: 'umfang und zeiten (bauplan.taetigkeiten.zeiten_legende)', einkommen: 'knapp, mittel oder gut (aus der Schicht des Haushalts)', schicht: 'knapp, untere_mitte, mitte, obere_mitte, wohlhabend',
      familienstand: 'ledig, in Beziehung, verlobt, zusammenlebend, verheiratet, getrennt lebend, geschieden, verwitwet', partner_id: 'Partnerfigur; lebt im selben Haushalt oder partner_grund nennt den Grund',
      kleine_kinder: 'Alter eigener Kinder unter 12 (keine Figuren), auch wenn sie anderswo leben', kinder_ausserhalb: 'Zahl weiterer eigener Kinder ab 12, die keine Figuren sind',
      freunde_ids: 'Freundschaften unter Figuren (Netz)', kollegen_ids: 'Figuren im selben Team (betriebe)', klassen_ids: 'Mitschüler derselben Klasse, Berufsschulklasse oder desselben Studiengangs',
      online_freunde_ids: 'Freundschaften, die vor allem online bestehen', kreise_ids: 'Freundeskreise (kreise.json)', einsam: 'true = höchstens zwei Freunde in der Welt und kaum Kontakte',
      freunde_ausserhalb: 'wie viele Freunde außerhalb der Welt (keine, wenige, einige, viele)', geraet: 'handy, klasse (einsteiger, mittel, oberklasse, alt), zustand, sonst (Konsole, PC, Tablet)',
      denkstil: 'Mensch oder KI', denkstil_art: 'Färbung (Mensch) oder Spielart (KI) aus bauplan.denkstil', freizeit_muster: 'Code aus bauplan.sozial.freie_zeiten.muster',
      treffen_erlaubt: 'frei, abgesprochen, eingeschraenkt, kaum', treffen_hindernis: 'Hindernisse in einer typischen Woche (bauplan.sozial.treff_hindernisse)',
      problem_arten: 'Codes aus bauplan.probleme.arten', spielneigung: '0 = spielt nie bis 5 = spielt sehr viel', spielen: 'videospiele, analog, lieblingsspiele, bluff, ehrgeiz, anleitung, kennt_rollenspiel',
      medien: 'apps, ki_nutzung, anime, kauft_online',
    },
  };
  const skelett = { meta, haushalte, betriebe, netz, figuren };
  const kreise = { meta: { titel: 'Freundeskreise der MSY-Welt', version: '1.0', erzeugt_mit: 'werkzeug/welt-skelett.mjs', startwert: SEED, stichtag: STICHTAG, arten: KREIS_ARTEN, hinweis: 'Kreise entstehen aus dem Netz: Jedes Mitglied kennt mindestens ein anderes Mitglied (Familie, Freundschaft, online, Team oder Klasse). ort = Ort-ID, mehrere oder online.' }, kreise: kreiseAus };
  const statistik = { verknuepfteFamilien: verknuepft, beziehungenOhneHaushalt: beziehungen, problemFaktor: PFAKTOR, wohngruppen };
  return { skelett, kreise, statistik };
}

// ------------------------------------------------------------------------------------------------
// Datei schreiben: Listen mit einer Zeile je Eintrag (gut lesbar, gezielt zu laden)
// ------------------------------------------------------------------------------------------------
export function jsonZeilen(obj, listen) {
  const teile = [];
  for (const [k, v] of Object.entries(obj)) {
    if (listen.includes(k) && Array.isArray(v)) teile.push(JSON.stringify(k) + ': [\n' + v.map(x => JSON.stringify(x)).join(',\n') + '\n]');
    else teile.push(JSON.stringify(k) + ': ' + JSON.stringify(v, null, 1));
  }
  return '{\n' + teile.join(',\n') + '\n}\n';
}

function hauptprogramm() {
  const hier = dirname(fileURLToPath(import.meta.url));
  const A = argumente(process.argv.slice(2));
  const welt = resolve(A.welt || join(hier, '..', 'welt'));
  const bauplanDatei = resolve(A.bauplan || join(welt, 'bauplan.json'));
  const aus = resolve(A.aus || welt);
  const seed = A.seed !== undefined ? Number(A.seed) : STANDARD_SEED;
  const B = JSON.parse(readFileSync(bauplanDatei, 'utf8'));
  const P = ladePrivat(A.privat);
  if (P.gefunden) B.namen.ausschluss_vornamen = { ...(B.namen.ausschluss_vornamen || {}), liste: P.vornamen, nachnamen: P.nachnamen };
  else console.log('Hinweis: private Liste fehlt (' + P.datei + '), es werden keine Vornamen ausgeschlossen; die Namen koennen vom veroeffentlichten Skelett abweichen.');
  const t0 = Date.now();
  const { skelett, kreise, statistik } = erzeugeWelt(B, seed);
  mkdirSync(aus, { recursive: true });
  writeFileSync(join(aus, 'skelett.json'), jsonZeilen(skelett, ['haushalte', 'betriebe', 'netz', 'figuren']), 'utf8');
  writeFileSync(join(aus, 'kreise.json'), jsonZeilen(kreise, ['kreise']), 'utf8');
  const F = skelett.figuren;
  const zaehle = f => { const m = {}; for (const x of F) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; };
  const berufe = new Set(F.filter(p => p.status === 'erwerbstaetig').map(p => p.beruf));
  console.log('Skelett erzeugt in ' + (Date.now() - t0) + ' ms, Startwert ' + seed);
  console.log('Figuren: ' + F.length + ', Haushalte: ' + skelett.haushalte.length + ', Betriebe: ' + skelett.betriebe.length + ', Kanten: ' + skelett.netz.length + ', Kreise: ' + kreise.kreise.length);
  console.log('Länder: ' + JSON.stringify(zaehle(p => p.land)));
  console.log('Minderjährige: ' + F.filter(p => p.alter <= 17).length + ', Denkstil: ' + JSON.stringify(zaehle(p => p.denkstil)));
  console.log('Erwerbstätige: ' + F.filter(p => p.status === 'erwerbstaetig').length + ', verschiedene Berufe: ' + berufe.size);
  console.log('Mit Problem: ' + F.filter(p => p.problem_arten.length).length + ', einsam: ' + F.filter(p => p.einsam).length + ', 0-2 Freunde: ' + F.filter(p => p.freunde_ids.length + p.online_freunde_ids.length <= 2).length);
  console.log('Statistik: ' + JSON.stringify(statistik));
  console.log('Geschrieben: ' + join(aus, 'skelett.json') + ' und ' + join(aus, 'kreise.json'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) hauptprogramm();
