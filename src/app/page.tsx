'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { SettingsButton } from '@/components/SettingsButton';
import { Leaderboard } from '@/components/Leaderboard';
import { MatchHistory } from '@/components/MatchHistory';
import { ResetStatsDialog } from '@/components/ResetStatsDialog';
import { useMatchHistory } from '@/hooks/useMatchHistory';
import { Inbox } from '@/components/inbox';
import { type PlayerName, PLAYER_IDS } from '@/lib/players';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableGameCard } from '@/components/SortableGameCard';
import { useGameOrder } from '@/hooks/useGameOrder';
import { DEFAULT_GAME_ORDER, DEFAULT_SLUG_ORDER } from '@/lib/game-registry';

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
      transition={{ duration: 0.4, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
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

function WordleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="1" y="4" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="7.5" y="4" width="5" height="5" rx="1" fill="#B59F3B" />
      <rect x="14" y="4" width="5" height="5" rx="1" fill="#3A3A3C" />
      <rect x="20.5" y="4" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="1" y="11.5" width="5" height="5" rx="1" fill="#3A3A3C" />
      <rect x="7.5" y="11.5" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="14" y="11.5" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="20.5" y="11.5" width="5" height="5" rx="1" fill="#B59F3B" />
      <rect x="1" y="19" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="7.5" y="19" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="14" y="19" width="5" height="5" rx="1" fill="#538D4E" />
      <rect x="20.5" y="19" width="5" height="5" rx="1" fill="#538D4E" />
    </svg>
  );
}

function CheckersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="9" cy="9" r="4.5" fill="#A0724A" opacity="0.9" />
      <circle cx="19" cy="9" r="4.5" fill="#E63946" opacity="0.9" />
      <circle cx="9" cy="19" r="4.5" fill="#FFBE0B" opacity="0.9" />
      <circle cx="19" cy="19" r="4.5" fill="#A0724A" opacity="0.9" />
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

function JengaIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="10" y="34" width="28" height="6" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="12" y="26" width="7" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="21" y="26" width="7" height="8" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="30" y="26" width="7" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="10" y="18" width="28" height="6" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="12" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="21" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="30" y="10" width="7" height="8" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function SnakesAndLaddersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="6" y1="24" x2="12" y2="4" stroke="#538D4E" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="24" x2="16" y2="4" stroke="#538D4E" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="20" x2="11" y2="20" stroke="#538D4E" strokeWidth="1.5" />
      <line x1="8" y1="15" x2="12" y2="15" stroke="#538D4E" strokeWidth="1.5" />
      <line x1="9.5" y1="10" x2="13.5" y2="10" stroke="#538D4E" strokeWidth="1.5" />
      <path d="M18 6C20 5 23 6 22 9C21 12 17 11 18 14C19 17 22 16 23 18C24 20 22 23 20 22" stroke="#E63946" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}


function MiniGolfIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="21" r="4" fill="#06D6A0" opacity="0.9" />
      <line x1="14" y1="17" x2="14" y2="4" stroke="#06D6A0" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="14" y1="4" x2="22" y2="8" stroke="#06D6A0" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function WordSearchIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="24" height="24" rx="3" stroke="#6B48FF" strokeWidth="2" fill="none" opacity="0.8" />
      <text x="5" y="12" fontSize="6" fill="#6B48FF" opacity="0.9" fontFamily="monospace" fontWeight="bold">WO</text>
      <text x="5" y="22" fontSize="6" fill="#6B48FF" opacity="0.9" fontFamily="monospace" fontWeight="bold">RD</text>
      <line x1="5" y1="9" x2="18" y2="9" stroke="#E63946" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function MonopolyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 24h20M7 24V10l7-5 7 5v14" stroke="#008000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <rect x="11" y="16" width="6" height="8" rx="0.5" fill="#008000" opacity="0.6" />
      <rect x="10" y="11" width="3" height="3" rx="0.5" fill="#008000" opacity="0.4" />
      <rect x="15" y="11" width="3" height="3" rx="0.5" fill="#008000" opacity="0.4" />
    </svg>
  );
}

function PoolIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="10" cy="11" r="4" fill="#FFD700" opacity="0.9" />
      <circle cx="18" cy="11" r="4" fill="#0000FF" opacity="0.9" />
      <circle cx="14" cy="18" r="4" fill="#000000" opacity="0.9" />
    </svg>
  );
}

function CupPongIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" fill="#E63946" opacity="0.8" />
      <circle cx="14" cy="14" r="6" fill="#E63946" opacity="0.5" />
      <circle cx="14" cy="14" r="3" fill="rgba(0,0,0,0.2)" />
      <circle cx="22" cy="8" r="3" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" stroke="#9B59B6" strokeWidth="2" opacity="0.9" />
      <rect x="15" y="3" width="10" height="10" rx="2" stroke="#9B59B6" strokeWidth="2" opacity="0.6" />
      <rect x="3" y="15" width="10" height="10" rx="2" stroke="#9B59B6" strokeWidth="2" opacity="0.6" />
      <rect x="15" y="15" width="10" height="10" rx="2" stroke="#9B59B6" strokeWidth="2" opacity="0.9" />
      <circle cx="8" cy="8" r="2" fill="#9B59B6" opacity="0.5" />
      <circle cx="20" cy="20" r="2" fill="#9B59B6" opacity="0.5" />
    </svg>
  );
}

function ReactionIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M16 3L6 16h6l-2 9 10-13h-6l2-9z" fill="#FF6B35" opacity="0.9" />
    </svg>
  );
}


function PlayerSelector({ onSelect }: { onSelect: (name: PlayerName) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
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

function GameSelection({ playerName, onChangePlayer }: { playerName: PlayerName; onChangePlayer: () => void }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showWordleMode, setShowWordleMode] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { results, stats, loading, clearAll } = useMatchHistory();
  const { order, loading: orderLoading, saveOrder, resetOrder } = useGameOrder(playerName);
  const [editMode, setEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState<string[]>(order);

  useEffect(() => {
    if (!editMode) {
      setEditOrder(order);
    }
  }, [order, editMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function handleEditDone() {
    saveOrder(editOrder);
    setEditMode(false);
  }

  function handleEditCancel() {
    setEditOrder(order);
    setEditMode(false);
  }

  function handleResetOrder() {
    resetOrder();
    setEditOrder([...DEFAULT_SLUG_ORDER]);
    setEditMode(false);
  }

  const handleResetConfirm = async () => {
    await clearAll();
    setShowResetDialog(false);
  };

  const handlePlayConnectFour = useCallback(async () => {
    setConnecting('connect-four');

    const [{ supabase }, { createEmptyBoard }] = await Promise.all([
      import('@/lib/supabase'),
      import('@/lib/game-logic'),
    ]);

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
        return g.player1_name === playerName || g.player2_name === playerName;
      }) || null;

      const joinableGame = games.find((g) => {
        return g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName;
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const { error: joinError } = await supabase
        .from('games')
        .update({
          player2_id: myId,
          player2_name: playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(null);
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

    // No game found -- create one. Creator is always player1 and goes first.
    const insertData = {
      game_type: 'connect-four',
      board: createEmptyBoard(),
      current_turn: 1 as const,
      winner: null,
      player1_id: myId,
      player1_name: playerName,
      player2_id: null,
      player2_name: null,
    };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      setConnecting(null);
      return;
    }

    router.push(`/connect-four/${data.id}`);
  }, [playerName, router]);

  const handlePlayWordle = useCallback(async () => {
    setConnecting('wordle');

    const [{ supabase }, { generateAnswerIndex }] = await Promise.all([
      import('@/lib/supabase'),
      import('@/lib/wordle-logic'),
    ]);

    const myId = PLAYER_IDS[playerName];

    async function findGames() {
      const { data } = await supabase
        .from('wordle_games')
        .select('*')
        .eq('game_type', 'wordle')
        .eq('status', 'playing')
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyGame(games: any[] | null) {
      if (!games) return { activeGame: null, joinableGame: null };

      const activeGame = games.find((g) => {
        return g.player1_name === playerName || g.player2_name === playerName;
      }) || null;

      const joinableGame = games.find((g) => {
        return g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName;
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const { error: joinError } = await supabase
        .from('wordle_games')
        .update({
          player2_id: myId,
          player2_name: playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(null);
        return false;
      }
      return true;
    }

    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);

    if (activeGame) {
      router.push(`/wordle/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/wordle/${joinableGame.id}`);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));

    if (activeGame) {
      router.push(`/wordle/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinGame(joinableGame.id)) {
        router.push(`/wordle/${joinableGame.id}`);
      }
      return;
    }

    // Creator is always player1 and goes first
    const insertData = {
      game_type: 'wordle',
      answer_index: generateAnswerIndex(),
      guesses: [],
      guess_count: 0,
      status: 'playing',
      winner: null,
      player1_id: myId,
      player1_name: playerName,
      player2_id: null,
      player2_name: null,
    };

    const { data, error } = await supabase
      .from('wordle_games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      setConnecting(null);
      return;
    }

    router.push(`/wordle/${data.id}`);
  }, [playerName, router]);

  const handlePlayDailyWordle = useCallback(async () => {
    setConnecting('wordle');

    const res = await fetch('/api/daily-wordle');
    if (!res.ok) {
      alert("Couldn't fetch today's word. Try again or use Random.");
      setConnecting(null);
      return;
    }
    const { word: dailyWord } = await res.json();

    const { supabase } = await import('@/lib/supabase');

    const isRicky = playerName === 'Ricky';
    const myId = PLAYER_IDS[playerName];

    // Matchmaking: look for an existing daily wordle game to join or resume
    async function findDailyGames() {
      const { data } = await supabase
        .from('wordle_games')
        .select('*')
        .eq('game_type', 'wordle')
        .eq('answer_index', -1)
        .eq('answer_word', dailyWord)
        .eq('status', 'playing')
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyDailyGame(games: any[] | null) {
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

    async function joinDailyGame(gameId: string) {
      const updateField = isRicky
        ? { player1_id: myId, player1_name: playerName }
        : { player2_id: myId, player2_name: playerName };

      const { error: joinError } = await supabase
        .from('wordle_games')
        .update({
          ...updateField,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining daily game:', joinError);
        setConnecting(null);
        return false;
      }
      return true;
    }

    const existingGames = await findDailyGames();
    let { activeGame, joinableGame } = findMyDailyGame(existingGames);

    if (activeGame) {
      router.push(`/wordle/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinDailyGame(joinableGame.id)) {
        router.push(`/wordle/${joinableGame.id}`);
      }
      return;
    }

    // Brief wait and retry in case the other player just created a game
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const retryGames = await findDailyGames();
    ({ activeGame, joinableGame } = findMyDailyGame(retryGames));

    if (activeGame) {
      router.push(`/wordle/${activeGame.id}`);
      return;
    }

    if (joinableGame) {
      if (await joinDailyGame(joinableGame.id)) {
        router.push(`/wordle/${joinableGame.id}`);
      }
      return;
    }

    // No existing game found — create a new one
    const insertData = isRicky
      ? {
          game_type: 'wordle',
          answer_index: -1,
          answer_word: dailyWord,
          guesses: [],
          guess_count: 0,
          status: 'playing',
          winner: null,
          player1_id: myId,
          player1_name: playerName,
          player2_id: null,
          player2_name: null,
        }
      : {
          game_type: 'wordle',
          answer_index: -1,
          answer_word: dailyWord,
          guesses: [],
          guess_count: 0,
          status: 'playing',
          winner: null,
          player1_id: null,
          player1_name: null,
          player2_id: myId,
          player2_name: playerName,
        };

    const { data, error } = await supabase
      .from('wordle_games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating daily wordle game:', error);
      setConnecting(null);
      return;
    }

    router.push(`/wordle/${data.id}`);
  }, [playerName, router]);

  const handlePlayBattleship = useCallback(async () => {
    setConnecting('battleship');

    const [{ supabase }, { generateRandomPlacement }] = await Promise.all([
      import('@/lib/supabase'),
      import('@/lib/battleship-logic'),
    ]);

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
        return g.player1_name === playerName || g.player2_name === playerName;
      }) || null;

      const joinableGame = games.find((g) => {
        // Join any game created by the other player where player2 slot is empty
        return g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName;
      }) || null;

      return { activeGame, joinableGame };
    }

    async function joinGame(gameId: string) {
      const { error: joinError } = await supabase
        .from('games')
        .update({
          player2_id: myId,
          player2_name: playerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining game:', joinError);
        setConnecting(null);
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

    const board = {
      player1Ships: generateRandomPlacement(),
      player2Ships: generateRandomPlacement(),
      player1Attacks: [],
      player2Attacks: [],
      phase: 'playing',
    };

    // Creator is always player1 and goes first
    const insertData = {
      game_type: 'battleship',
      board,
      current_turn: 1 as const,
      winner: null,
      player1_id: myId,
      player1_name: playerName,
      player2_id: null,
      player2_name: null,
    };

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating game:', error);
      setConnecting(null);
      return;
    }

    router.push(`/battleship/${data.id}`);
  }, [playerName, router]);

  const handlePlayMonopolyGame = useCallback(async () => {
    setConnecting('monopoly');
    const [{ supabase }, { createInitialBoard }] = await Promise.all([
      import('@/lib/supabase'),
      import('@/lib/monopoly/logic'),
    ]);
    const myId = PLAYER_IDS[playerName];
    async function findGames() {
      const { data } = await supabase.from('games').select('*').eq('game_type', 'monopoly').is('winner', null).order('created_at', { ascending: false }).limit(10);
      return data;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findMyGame(games: any[] | null) {
      if (!games) return { activeGame: null, joinableGame: null };
      const activeGame = games.find((g) => g.player1_name === playerName || g.player2_name === playerName) || null;
      const joinableGame = games.find((g) => g.player2_name === null && g.player1_name !== null && g.player1_name !== playerName) || null;
      return { activeGame, joinableGame };
    }
    async function joinGame(gameId: string) {
      const { error: joinError } = await supabase.from('games').update({ player2_id: myId, player2_name: playerName, updated_at: new Date().toISOString() }).eq('id', gameId).select().single();
      if (joinError) { setConnecting(null); return false; }
      return true;
    }
    const existingGames = await findGames();
    let { activeGame, joinableGame } = findMyGame(existingGames);
    if (activeGame) { router.push(`/monopoly/${activeGame.id}`); return; }
    if (joinableGame) { if (await joinGame(joinableGame.id)) router.push(`/monopoly/${joinableGame.id}`); return; }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const retryGames = await findGames();
    ({ activeGame, joinableGame } = findMyGame(retryGames));
    if (activeGame) { router.push(`/monopoly/${activeGame.id}`); return; }
    if (joinableGame) { if (await joinGame(joinableGame.id)) router.push(`/monopoly/${joinableGame.id}`); return; }
    // Creator is always player1 and goes first
    const insertData = { game_type: 'monopoly', board: createInitialBoard(1), current_turn: 1 as const, winner: null, player1_id: myId, player1_name: playerName, player2_id: null, player2_name: null };
    const { data, error } = await supabase.from('games').insert(insertData).select('id').single();
    if (error || !data) { setConnecting(null); return; }
    router.push(`/monopoly/${data.id}`);
  }, [playerName, router]);

  const gameProps: Record<string, { icon: React.ReactNode; onClick: () => void; loading?: boolean }> = {
    'connect-four': { icon: <ConnectFourIcon />, onClick: handlePlayConnectFour, loading: connecting === 'connect-four' },
    'wordle': { icon: <WordleIcon />, onClick: () => setShowWordleMode(true), loading: connecting === 'wordle' },
    'tic-tac-toe': { icon: <TicTacToeIcon />, onClick: () => router.push('/tic-tac-toe') },
    'checkers': { icon: <CheckersIcon />, onClick: () => router.push('/checkers') },
    'whiteboard': { icon: <WhiteboardIcon />, onClick: () => router.push('/whiteboard') },
    'battleship': { icon: <BattleshipIcon />, onClick: handlePlayBattleship, loading: connecting === 'battleship' },
    'mini-golf': { icon: <MiniGolfIcon />, onClick: () => router.push('/mini-golf') },
    'jenga': { icon: <JengaIcon />, onClick: () => router.push('/jenga') },
    'snakes-and-ladders': { icon: <SnakesAndLaddersIcon />, onClick: () => router.push('/snakes-and-ladders') },
    'word-search': { icon: <WordSearchIcon />, onClick: () => router.push('/word-search') },
    'monopoly': { icon: <MonopolyIcon />, onClick: handlePlayMonopolyGame, loading: connecting === 'monopoly' },
    'memory': { icon: <MemoryIcon />, onClick: () => router.push('/memory') },
    'pool': { icon: <PoolIcon />, onClick: () => router.push('/pool') },
    'cup-pong': { icon: <CupPongIcon />, onClick: () => router.push('/cup-pong') },
    'reaction': { icon: <ReactionIcon />, onClick: () => router.push('/reaction') },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-full"
    >
      {/* Player greeting, switch, and edit mode toggle */}
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
        <button
          onClick={() => editMode ? handleEditCancel() : setEditMode(true)}
          disabled={orderLoading}
          className={`ml-2 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            editMode
              ? 'bg-player1/10 text-player1'
              : 'text-text-secondary/60 hover:text-text-primary hover:bg-surface-hover'
          }`}
          aria-label={editMode ? 'Cancel reordering' : 'Reorder games'}
          title={editMode ? 'Cancel reordering' : 'Reorder games'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h12M3 9h12M3 13h12" strokeLinecap="round" />
            <path d="M14 3l2 2-2 2M14 11l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Edit mode controls */}
      {editMode && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={handleEditDone}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-player1 text-white hover:bg-player1/90 transition-colors cursor-pointer"
          >
            Done
          </button>
          <button
            onClick={handleEditCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleResetOrder}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Reset to default
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {stats && (
        <Leaderboard
          stats={stats}
          onReset={() => setShowResetDialog(true)}
          loading={loading}
        />
      )}

      {/* Inbox */}
      <Inbox playerName={playerName} />

      {/* Games grid */}
      <div className="max-w-5xl mx-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={editMode ? editOrder : order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(editMode ? editOrder : order).map((slug, index) => {
                const game = DEFAULT_GAME_ORDER.find((g) => g.slug === slug);
                const props = gameProps[slug];
                if (!game || !props) return null;

                if (slug === 'wordle' && !editMode && showWordleMode) {
                  return (
                    <SortableGameCard key={slug} id={slug} editMode={false}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-3xl border border-border bg-surface p-6 flex flex-col items-center justify-center gap-4"
                      >
                        <button
                          onClick={() => setShowWordleMode(false)}
                          className="absolute top-3 right-3 text-text-secondary hover:text-text-primary text-lg cursor-pointer"
                        >
                          ✕
                        </button>
                        <div className="text-2xl">
                          <WordleIcon />
                        </div>
                        <p className="text-sm font-medium text-text-secondary">Choose mode</p>
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => { setShowWordleMode(false); handlePlayWordle(); }}
                            disabled={connecting === 'wordle'}
                            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-surface text-text-primary hover:bg-surface-hover shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                          >
                            Random
                          </button>
                          <button
                            onClick={() => { setShowWordleMode(false); handlePlayDailyWordle(); }}
                            disabled={connecting === 'wordle'}
                            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-[#538D4E]/30 bg-[#538D4E]/10 text-[#538D4E] hover:bg-[#538D4E]/20 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                          >
                            Daily
                          </button>
                        </div>
                      </motion.div>
                    </SortableGameCard>
                  );
                }

                return (
                  <SortableGameCard key={slug} id={slug} editMode={editMode}>
                    <ClickableGameCard
                      title={game.title}
                      description={game.description}
                      color={game.color}
                      icon={props.icon}
                      delay={index * 0.05}
                      onClick={editMode ? () => {} : props.onClick}
                      loading={!editMode && props.loading}
                    />
                  </SortableGameCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Match History */}
      <MatchHistory results={results} loading={loading} />

      {/* Reset confirmation dialog */}
      <ResetStatsDialog
        open={showResetDialog}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetDialog(false)}
      />
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
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="flex flex-col items-center gap-6 text-center max-w-xl"
        >
          {/* Decorative dots */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
          transition={{ duration: 0.6, delay: 0.4 }}
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
