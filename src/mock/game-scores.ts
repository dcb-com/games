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
