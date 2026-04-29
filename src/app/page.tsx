'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { createEmptyBoard } from '@/lib/game-logic';

type PlayerName = 'Ricky' | 'Lilian';

interface ClickableGameCardProps {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  delay?: number;
  onClick: () => void;
  loading?: boolean;
}

function ClickableGameCard({ title, description, color, icon, delay = 0, onClick, loading }: ClickableGameCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <button
        ref={ref}
        onClick={onClick}
        disabled={loading}
        className="group block relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-10 transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.03] hover:-translate-y-1 hover:border-transparent w-full text-left cursor-pointer disabled:opacity-70 disabled:cursor-wait"
      >
        {/* Subtle gradient overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at top right, ${color}08 0%, transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col gap-6">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${color}12` }}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary group-hover:text-text-primary/90 transition-colors">
              {title}
            </h2>
            <p className="text-base text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>

          {/* Play indicator */}
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
            <span>{loading ? 'Connecting...' : 'Play'}</span>
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function ConnectFourIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="9" cy="9" r="4.5" fill="#E63946" opacity="0.9" />
      <circle cx="19" cy="9" r="4.5" fill="#FFBE0B" opacity="0.9" />
      <circle cx="9" cy="19" r="4.5" fill="#FFBE0B" opacity="0.9" />
      <circle cx="19" cy="19" r="4.5" fill="#E63946" opacity="0.9" />
    </svg>
  );
}

function ComingSoonCard({ delay = 0 }: { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative overflow-hidden rounded-3xl border border-dashed border-border/80 bg-surface/50 p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[220px]"
    >
      <div className="w-14 h-14 rounded-2xl bg-border/30 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary/40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-text-secondary/60">More games coming</p>
        <p className="text-sm text-text-secondary/40">Stay tuned</p>
      </div>
    </motion.div>
  );
}

function PlayerSelector({ onSelect }: { onSelect: (name: PlayerName) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="flex flex-col items-center gap-8 text-center"
    >
      <p className="text-lg sm:text-xl text-text-secondary leading-relaxed">
        Who are you?
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => onSelect('Ricky')}
          className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player1 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl cursor-pointer min-w-[160px]"
        >
          I&apos;m Ricky
        </button>
        <span className="text-text-secondary font-medium">or</span>
        <button
          onClick={() => onSelect('Lilian')}
          className="px-8 py-4 text-lg font-semibold rounded-2xl bg-player2 text-text-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl cursor-pointer min-w-[160px]"
        >
          I&apos;m Lilian
        </button>
      </div>
    </motion.div>
  );
}

const PLAYER_IDS: Record<PlayerName, string> = {
  Ricky: '00000000-0000-0000-0000-000000000001',
  Lilian: '00000000-0000-0000-0000-000000000002',
};

function GameSelection({ playerName, onChangePlayer }: { playerName: PlayerName; onChangePlayer: () => void }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const handlePlayConnectFour = useCallback(async () => {
    setConnecting(true);

    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    async function findGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', 'connect-four')
        .is('winner', null)
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyGame(games: any[] | null) {
      if (!games) return { activeGame: null, joinableGame: null };

      const activeGame = games.find((g) => {
        if (isRicky) return g.player1_name === 'Ricky';
        return g.player2_name === 'Lilian';
      }) || null;

      const joinableGame = games.find((g) => {
        if (isRicky) {
          return g.player1_name === null && g.player2_name === 'Lilian';
        } else {
          return g.player2_name === null && g.player1_name === 'Ricky';
        }
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const updateField = isRicky
        ? { player1_id: myId, player1_name: playerName }
        : { player2_id: myId, player2_name: playerName };

      const { error: joinError } = await supabase
        .from('games')
        .update({
          ...updateField,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(false);
        return false;
      }
      return true;
    }

    // First attempt
    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);

    if (activeGame) {
      router.push(`/connect-four/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/connect-four/${joinableGame.id}`);
      }
      return;
    }

    // Wait and retry to avoid race condition
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));

    if (activeGame) {
      router.push(`/connect-four/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/connect-four/${joinableGame.id}`);
      }
      return;
    }

    // No game found -- create one
    const insertData = isRicky
      ? {
          game_type: 'connect-four',
          board: createEmptyBoard(),
          current_turn: 1 as const,
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'connect-four',
          board: createEmptyBoard(),
          current_turn: 1 as const,
          winner: null,
          player1_id: null,
          player1_name: null,
          player2_id: myId,
          player2_name: playerName,
        };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      setConnecting(false);
      return;
    }

    router.push(`/connect-four/${data.id}`);
  }, [playerName, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-full"
    >
      {/* Player greeting and switch */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <p className="text-lg text-text-secondary">
          Playing as <span className="font-semibold text-text-primary">{playerName}</span>
        </p>
        <button
          onClick={onChangePlayer}
          className="text-sm text-text-secondary/60 hover:text-text-primary transition-colors underline underline-offset-2 cursor-pointer"
        >
          switch
        </button>
      </div>

      {/* Games grid */}
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ClickableGameCard
            title="Connect Four"
            description="Drop pieces, connect four in a row. Classic strategy for two."
            color="#E63946"
            icon={<ConnectFourIcon />}
            delay={0.2}
            onClick={handlePlayConnectFour}
            loading={connecting}
          />
          <ComingSoonCard delay={0.35} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerName | null>(null);

  // On mount, check if a player was previously selected
  useEffect(() => {
    const stored = localStorage.getItem('player-name');
    if (stored === 'Ricky' || stored === 'Lilian') {
      setSelectedPlayer(stored);
    }
  }, []);

  const handleSelectPlayer = (name: PlayerName) => {
    setSelectedPlayer(name);
    sessionStorage.setItem('player-name', name);
    localStorage.setItem('player-name', name);
  };

  const handleChangePlayer = () => {
    setSelectedPlayer(null);
    sessionStorage.removeItem('player-name');
    localStorage.removeItem('player-name');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Hero section */}
      <header className="flex flex-col items-center justify-center px-6 pt-24 pb-16 sm:pt-32 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="flex flex-col items-center gap-6 text-center max-w-xl"
        >
          {/* Decorative dots */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-player1 opacity-70" />
            <div className="w-2 h-2 rounded-full bg-player2 opacity-60" />
            <div className="w-1.5 h-1.5 rounded-full bg-board opacity-40" />
          </motion.div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-text-primary leading-[0.95]">
            game night
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-md">
            A tiny collection of two-player games.
            <br className="hidden sm:block" />
            <span className="sm:inline"> Pick one and play together.</span>
          </p>
        </motion.div>
      </header>

      {/* Step 1: Player selection / Step 2: Game selection */}
      <main className="flex-1 px-6 pb-24 sm:pb-32">
        <AnimatePresence mode="wait">
          {selectedPlayer === null ? (
            <PlayerSelector key="player-selector" onSelect={handleSelectPlayer} />
          ) : (
            <GameSelection
              key="game-selection"
              playerName={selectedPlayer}
              onChangePlayer={handleChangePlayer}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="max-w-3xl mx-auto flex items-center justify-center"
        >
          <p className="text-xs text-text-secondary/40 tracking-wide">
            made with care
          </p>
        </motion.div>
      </footer>
    </div>
  );
}
