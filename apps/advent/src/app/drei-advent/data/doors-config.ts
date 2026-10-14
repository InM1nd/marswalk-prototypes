// Single source of truth for the advent calendar. Re-skin for another client by
// editing CAMPAIGN + DOORS only: texts, prizes, codes, quiz questions and the
// mechanic per door all live here. Prizes and codes are fictional (pitch demo).

export type Mechanic = 'scratch' | 'quiz' | 'gift';

/** Maps to public/assets/icon-<name>.png (see ASSET_BRIEF.md), with a lucide fallback. */
export type PrizeIconName =
  | 'data' | 'headphones' | 'music' | 'plane' | 'giftcard' | 'smartwatch' | 'smartphone'
  | 'sim' | 'powerbank' | 'coins' | 'cloud' | 'delivery' | 'tablet' | 'router';

export interface Prize {
  title: string;
  code: string;
  /** Raffle tickets ("Glückslose") this door adds to the grand-prize draw. */
  tickets: number;
}

export interface QuizConfig {
  question: string;
  options: string[];
  /** Index into options. */
  correct: number;
}

export interface DoorConfig {
  day: number;
  mechanic: Mechanic;
  /** Gold animated border + double-width cell. */
  special?: boolean;
  /** Short label shown on special doors. */
  label?: string;
  /** Cover art for special doors, from public/assets. */
  cover?: string;
  icon: PrizeIconName;
  prize: Prize;
  quiz?: QuizConfig;
}

export const CAMPAIGN = {
  brand: 'Drei',
  title: 'Drei Adventskalender',
  year: 2026,
  headline: ['Jeden Tag ein', 'Weihnachtswunder.'],
  intro: 'Öffne bis Heiligabend jeden Tag ein Türchen, sichere dir Geschenke von Drei und sammle Glückslose für die große Weihnachts-Verlosung.',
  grandPrize: 'iPhone 16 Pro + 1 Jahr Drei Unlimited',
  grandPrizeShort: 'iPhone 16 Pro',
  ctaLabel: 'Jetzt bei drei.at einlösen',
  ctaUrl: 'https://www.drei.at',
  storageKey: 'marswalk:drei-advent:v1',
} as const;

const q = (question: string, options: string[], correct = 0): QuizConfig => ({ question, options, correct });

export const DOORS: DoorConfig[] = [
  { day: 1, mechanic: 'scratch', icon: 'data', prize: { title: 'Gratis 50 GB 5G-Datenvolumen für 1 Monat', code: 'DREI-XMAS-50GB', tickets: 1 } },
  {
    day: 2, mechanic: 'quiz', icon: 'headphones',
    prize: { title: '10 € Gutschein auf Zubehör im Drei Shop', code: 'DREI-ZUBEHOER10', tickets: 1 },
    quiz: q('Wofür steht das „G“ in 5G?', ['Generation', 'Geschwindigkeit', 'Gigabyte']),
  },
  { day: 3, mechanic: 'gift', icon: 'music', prize: { title: '3 Monate Musik-Streaming gratis', code: 'DREI-MUSIK3', tickets: 5 } },
  { day: 4, mechanic: 'scratch', icon: 'plane', prize: { title: 'Gratis EU-Roaming-Paket für 7 Tage', code: 'DREI-ROAM7', tickets: 1 } },
  { day: 5, mechanic: 'gift', icon: 'giftcard', prize: { title: '15 € Shop-Gutschein', code: 'DREI-SHOP15', tickets: 5 } },
  {
    day: 6, mechanic: 'quiz', special: true, label: 'Nikolaus', icon: 'smartwatch', cover: 'door-06-nikolaus.webp',
    prize: { title: '-20% auf alle Audio- & Smartwatches im Drei Shop', code: 'NIKOLAUS-20', tickets: 1 },
    quiz: q('Welches Netz wurde mehrfach für das schnellste 5G-Erlebnis in Österreich ausgezeichnet?', ['Drei 5G', 'Rauchzeichen', 'Brieftaube']),
  },
  { day: 7, mechanic: 'scratch', icon: 'data', prize: { title: 'Doppelte Daten am Wochenende', code: 'DREI-DOPPELT', tickets: 1 } },
  {
    day: 8, mechanic: 'quiz', icon: 'smartphone',
    prize: { title: 'Gratis Handyhülle zum neuen Smartphone', code: 'DREI-HUELLE', tickets: 1 },
    quiz: q('Was sinkt mit 5G im Vergleich zu 4G typischerweise deutlich?', ['Die Latenz', 'Die Bildschirmgröße', 'Die Anzahl der Feiertage']),
  },
  { day: 9, mechanic: 'gift', icon: 'sim', prize: { title: 'Gratis SIM-Aktivierung', code: 'DREI-AKTIV0', tickets: 5 } },
  { day: 10, mechanic: 'scratch', icon: 'powerbank', prize: { title: 'Gratis Powerbank im Drei Shop', code: 'DREI-POWER', tickets: 1 } },
  { day: 11, mechanic: 'gift', icon: 'coins', prize: { title: '1 Monat Grundgebühr geschenkt', code: 'DREI-GRATISMONAT', tickets: 5 } },
  {
    day: 12, mechanic: 'quiz', icon: 'smartphone',
    prize: { title: 'Gratis Displayschutz inklusive Montage', code: 'DREI-SCHUTZ', tickets: 1 },
    quiz: q('Welche Einheit misst die Datenübertragungsrate?', ['Mbit/s', 'Kilometer pro Stunde', 'Kilowattstunden']),
  },
  { day: 13, mechanic: 'scratch', icon: 'data', prize: { title: '20 GB 5G-Bonus für 14 Tage', code: 'DREI-20GB', tickets: 1 } },
  {
    day: 14, mechanic: 'quiz', icon: 'sim',
    prize: { title: 'Gratis eSIM-Aktivierung', code: 'DREI-ESIM', tickets: 1 },
    quiz: q('Was ist eine eSIM?', ['Eine digitale SIM-Karte ohne Plastik', 'Eine Sim-Karte für Elektroautos', 'Ein Spiel für Smartphones']),
  },
  { day: 15, mechanic: 'gift', icon: 'smartphone', prize: { title: '30 € Rabatt auf ein neues Smartphone', code: 'DREI-PHONE30', tickets: 5 } },
  { day: 16, mechanic: 'scratch', icon: 'cloud', prize: { title: '30 Tage Cloud-Speicher gratis', code: 'DREI-CLOUD', tickets: 1 } },
  { day: 17, mechanic: 'gift', icon: 'delivery', prize: { title: 'Gratis Express-Lieferung', code: 'DREI-EXPRESS', tickets: 5 } },
  {
    day: 18, mechanic: 'quiz', icon: 'tablet',
    prize: { title: '-10% auf Tablets im Drei Shop', code: 'DREI-TABLET10', tickets: 1 },
    quiz: q('Was ermöglicht WLAN-Calling?', ['Telefonieren über WLAN', 'Schneefall vorhersagen', 'Geschenke verpacken']),
  },
  { day: 19, mechanic: 'scratch', icon: 'router', prize: { title: '25 € Rabatt auf 5G Home-Internet', code: 'DREI-HOME25', tickets: 1 } },
  {
    day: 20, mechanic: 'quiz', icon: 'sim',
    prize: { title: 'Gratis Zusatz-SIM für die Familie', code: 'DREI-FAMILIE', tickets: 1 },
    quiz: q('Wie heißt der 24. Dezember in Österreich?', ['Heiligabend', 'Silvester', 'Nikolaus']),
  },
  { day: 21, mechanic: 'gift', icon: 'giftcard', prize: { title: '20 € Guthaben auf deine Wertkarte', code: 'DREI-GUTHABEN20', tickets: 5 } },
  { day: 22, mechanic: 'scratch', icon: 'headphones', prize: { title: '-40% auf Kopfhörer im Drei Shop', code: 'DREI-SOUND40', tickets: 1 } },
  { day: 23, mechanic: 'gift', icon: 'data', prize: { title: 'Silvester-Datenpaket: 100 GB für 1 Woche', code: 'DREI-SILVESTER', tickets: 5 } },
  { day: 24, mechanic: 'gift', special: true, label: 'Heiligabend', icon: 'giftcard', cover: 'door-24-heiligabend.webp', prize: { title: '50 € Drei Shop Gutschein + Weihnachts-Jackpot-Lose', code: 'DREI-FINALE-50', tickets: 5 } },
];

export const MAX_TICKETS = DOORS.reduce((sum, d) => sum + d.prize.tickets, 0);
