import { NextResponse } from 'next/server';
import { WORDLE_VALID_GUESSES } from '@/lib/wordle-valid-guesses';
import { WORDLE_ANSWERS } from '@/lib/wordle-answers';

export async function GET() {
  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${dateStr}.json`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch daily word' }, { status: 502 });
    }

    const data = await res.json();
    const solution: string = data.solution;

    if (!solution || solution.length !== 5) {
      return NextResponse.json({ error: 'Invalid word from source' }, { status: 502 });
    }

    const upper = solution.toUpperCase();
    const validSet = new Set([...WORDLE_VALID_GUESSES, ...WORDLE_ANSWERS]);
    if (!validSet.has(upper)) {
      return NextResponse.json({ error: 'Daily word not in valid guess list' }, { status: 502 });
    }

    return NextResponse.json({ word: upper });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch daily word' }, { status: 502 });
  }
}
