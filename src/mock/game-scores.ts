// Made-up coworkers and their Desk Defense totals, so the leaderboard has
// people on it before anyone plays. The real app would load these from the
// server. Every name and address here is made up.

export interface Player {
  name: string;
  email: string;
}

export interface ScoreRow extends Player {
  score: number;
}

export const COWORKER_SCORES: ScoreRow[] = [
  { name: "Jordan Example", email: "jordan.example@example.com", score: 18450 },
  { name: "Taylor Sample", email: "taylor.sample@example.com", score: 12900 },
  { name: "Morgan Test", email: "morgan.test@example.com", score: 9320 },
  { name: "Casey Demo", email: "casey.demo@example.com", score: 6780 },
  { name: "Riley Mock", email: "riley.mock@example.com", score: 4150 },
  { name: "Quinn Placeholder", email: "quinn.p@example.com", score: 2600 },
  { name: "Drew Fake", email: "drew.fake@example.com", score: 1240 },
];

// The same made-up coworkers in Cubicle Clash: their trophies and how far
// their head office has grown. Their bases are built from these in
// src/games/cubicle-clash/rivals.ts. The real app would load all of it.
export interface Rival extends Player {
  trophies: number;
  office: number;
}

export const CLASH_RIVALS: Rival[] = [
  {
    name: "Jordan Example",
    email: "jordan.example@example.com",
    trophies: 1180,
    office: 5,
  },
  {
    name: "Taylor Sample",
    email: "taylor.sample@example.com",
    trophies: 940,
    office: 4,
  },
  {
    name: "Morgan Test",
    email: "morgan.test@example.com",
    trophies: 760,
    office: 4,
  },
  {
    name: "Casey Demo",
    email: "casey.demo@example.com",
    trophies: 520,
    office: 3,
  },
  {
    name: "Riley Mock",
    email: "riley.mock@example.com",
    trophies: 360,
    office: 2,
  },
  {
    name: "Quinn Placeholder",
    email: "quinn.p@example.com",
    trophies: 210,
    office: 2,
  },
  {
    name: "Drew Fake",
    email: "drew.fake@example.com",
    trophies: 90,
    office: 1,
  },
  {
    name: "Sam Sample",
    email: "sam.sample@example.com",
    trophies: 40,
    office: 1,
  },
];
