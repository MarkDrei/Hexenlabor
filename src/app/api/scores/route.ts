import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface ScoreEntry {
  name: string;
  stars: number;
  level: number;
  date: string;
}

interface SessionData {
  playerName?: string;
  lastScore?: number;
}

// In-memory top scores (resets on restart — no DB needed)
const topScores: ScoreEntry[] = [];
const MAX_SCORES = 10;

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || 'hexenlabor-super-secret-key-min-32-chars!!',
  cookieName: 'hexenlabor-session',
};

export async function GET() {
  return NextResponse.json({ scores: topScores.slice(0, MAX_SCORES) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.slice(0, 20) : 'Hexe';
  const stars = typeof body.stars === 'number' ? Math.max(0, Math.floor(body.stars)) : 0;
  const level = typeof body.level === 'number' ? Math.max(1, Math.min(5, Math.floor(body.level))) : 1;

  const entry: ScoreEntry = {
    name,
    stars,
    level,
    date: new Date().toISOString(),
  };

  topScores.push(entry);
  topScores.sort((a, b) => b.stars - a.stars);
  if (topScores.length > MAX_SCORES) {
    topScores.length = MAX_SCORES;
  }

  // Store in session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
  session.playerName = name;
  session.lastScore = stars;
  await session.save();

  return NextResponse.json({ success: true, rank: topScores.indexOf(entry) + 1 });
}
