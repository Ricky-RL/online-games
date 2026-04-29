'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { createEmptyBoard } from '@/lib/game-logic';
import { generateRandomPlacement } from '@/lib/battleship-logic';
import type { BattleshipBoardState } from '@/lib/types';
import { SettingsButton } from '@/components/SettingsButton';

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

function TicTacToeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* X mark */}
      <line x1="4" y1="4" x2="11" y2="11" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="11" y1="4" x2="4" y2="11" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* O mark */}
      <circle cx="21" cy="7.5" r="4" fill="none" stroke="#FFBE0B" strokeWidth="2.5" opacity="0.9" />
      {/* X mark bottom */}
      <line x1="4" y1="17" x2="11" y2="24" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="11" y1="17" x2="4" y2="24" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      {/* O mark bottom */}
      <circle cx="21" cy="20.5" r="4" fill="none" stroke="#FFBE0B" strokeWidth="2.5" opacity="0.9" />
    </svg>
  );
}

function WhiteboardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="5" width="22" height="18" rx="2" stroke="#FFBE0B" strokeWidth="2" fill="none" />
      <rect x="7" y="9" width="6" height="6" rx="1" fill="#FFEB3B" opacity="0.8" />
      <rect x="15" y="12" width="6" height="6" rx="1" fill="#80D8FF" opacity="0.8" />
      <rect x="10" y="15" width="6" height="5" rx="1" fill="#FF8A80" opacity="0.7" />
    </svg>
  );
}


function BattleshipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 18L6 22H22L24 18H4Z" fill="#E63946" opacity="0.8" />
      <rect x="8" y="14" width="12" height="4" rx="1" fill="#FFBE0B" opacity="0.7" />
      <rect x="13" y="8" width="2" height="6" fill="#FFBE0B" opacity="0.6" />
      <path d="M15 8L20 10L15 12Z" fill="#E63946" opacity="0.7" />
      <path d="M2 24Q7 22 14 24Q21 26 26 24" stroke="#80D8FF" strokeWidth="1.5" fill="none" opacity="0.5" />
    </svg>
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
  const [connectingBattleship, setConnectingBattleship] = useState(false);

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
          current_turn: 2 as const,
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

  const handlePlayBattleship = useCallback(async () => {
    setConnectingBattleship(true);

    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    async function findGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', 'battleship')
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
      const { data: gameData } = await supabase
        .from('games')
        .select('board')
        .eq('id', gameId)
        .single();

      if (!gameData) {
        setConnectingBattleship(false);
        return false;
      }

      const currentBoard = gameData.board as BattleshipBoardState;
      const updatedBoard: BattleshipBoardState = {
        ...currentBoard,
        player1Ships: isRicky ? generateRandomPlacement() : currentBoard.player1Ships,
        player2Ships: isRicky ? currentBoard.player2Ships : generateRandomPlacement(),
        phase: 'playing',
      };

      const updateField = isRicky
        ? { player1_id: myId, player1_name: playerName }
        : { player2_id: myId, player2_name: playerName };

      const { error: joinError } = await supabase
        .from('games')
        .update({
          ...updateField,
          board: updatedBoard,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnectingBattleship(false);
        return false;
      }
      return true;
    }

    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);

    if (activeGame) {
      router.push(`/battleship/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/battleship/${joinableGame.id}`);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));

    if (activeGame) {
      router.push(`/battleship/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/battleship/${joinableGame.id}`);
      }
      return;
    }

    const board: BattleshipBoardState = {
      player1Ships: isRicky ? generateRandomPlacement() : [],
      player2Ships: isRicky ? [] : generateRandomPlacement(),
      player1Attacks: [],
      player2Attacks: [],
      phase: 'setup',
    };

    const insertData = isRicky
      ? {
          game_type: 'battleship',
          board,
          current_turn: 1 as const,
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'battleship',
          board,
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
      setConnectingBattleship(false);
      return;
    }

    router.push(`/battleship/${data.id}`);
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
          <ClickableGameCard
            title="Tic Tac Toe"
            description="X and O, three in a row. Quick rounds, pure fun."
            color="#FFBE0B"
            icon={<TicTacToeIcon />}
            delay={0.35}
            onClick={() => router.push('/tic-tac-toe')}
          />
          <ClickableGameCard
            title="Whiteboard"
            description="Shared sticky notes and doodles. Think together, draw together."
            color="#FFBE0B"
            icon={<WhiteboardIcon />}
            delay={0.45}
            onClick={() => router.push('/whiteboard')}
          />
          <ClickableGameCard
            title="Battleship"
            description="Hunt and sink the fleet. Fire shots, track hits, claim the sea."
            color="#1D3557"
            icon={<BattleshipIcon />}
            delay={0.5}
            onClick={handlePlayBattleship}
            loading={connectingBattleship}
          />
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
      <SettingsButton />
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
