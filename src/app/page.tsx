'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { SettingsButton } from '@/components/SettingsButton';
import { Leaderboard } from '@/components/Leaderboard';
import { MatchHistory } from '@/components/MatchHistory';
import { ResetStatsDialog } from '@/components/ResetStatsDialog';
import { useMatchHistory } from '@/hooks/useMatchHistory';
import { useFavorites } from '@/hooks/useFavorites';
import { Inbox } from '@/components/inbox';
import { clearStoredUser, getStoredUser, setStoredUser, type BoundAppUser, type StoredUser } from '@/lib/players';
import { findOrCreateBoundGame } from '@/lib/matchmaking';
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
import { DEFAULT_GAME_ORDER, DEFAULT_SLUG_ORDER, type GameCategory } from '@/lib/game-registry';

interface ClickableGameCardProps {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  delay?: number;
  onClick: () => void;
  loading?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

function ClickableGameCard({ title, description, color, icon, delay = 0, onClick, loading, isFavorite, onToggleFavorite }: ClickableGameCardProps) {
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
        {/* Heart favorite button */}
        {onToggleFavorite && (
          <motion.div
            className="absolute top-4 right-4 z-10"
            whileTap={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <div
              role="switch"
              aria-checked={isFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleFavorite();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border/50 hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isFavorite ? '#E63946' : 'none'}
                stroke={isFavorite ? '#E63946' : 'currentColor'}
                strokeWidth={2}
                className={isFavorite ? '' : 'text-text-secondary'}
                animate={isFavorite ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
              </motion.svg>
            </div>
          </motion.div>
        )}

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

function MathTriviaIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="24" height="24" rx="3" stroke="#F97316" strokeWidth="2" fill="none" opacity="0.8" />
      <text x="5" y="13" fontSize="7" fill="#F97316" opacity="0.9" fontFamily="monospace" fontWeight="bold">1+2</text>
      <text x="5" y="23" fontSize="7" fill="#F97316" opacity="0.7" fontFamily="monospace" fontWeight="bold">3×4</text>
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

function SudokuIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
      <rect x="10.5" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
      <rect x="19" y="2" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
      <rect x="2" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
      <rect x="10.5" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
      <rect x="19" y="10.5" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
      <rect x="2" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
      <rect x="10.5" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.6" />
      <rect x="19" y="19" width="7" height="7" rx="1" stroke="#4A90D9" strokeWidth="1.5" opacity="0.8" />
    </svg>
  );
}

function SolitaireIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3C14 3 7 9 7 14C7 17.9 10.1 21 14 21C17.9 21 21 17.9 21 14C21 9 14 3 14 3Z" fill="#2D5016" opacity="0.8" />
      <rect x="12.5" y="20" width="3" height="5" rx="1" fill="#2D5016" opacity="0.6" />
    </svg>
  );
}

function Big2Icon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="7" width="10" height="15" rx="2" fill="#FFFFFF" stroke="#C2410C" strokeWidth="1.5" transform="rotate(-10 4 7)" />
      <rect x="11" y="5" width="10" height="15" rx="2" fill="#FFFFFF" stroke="#C2410C" strokeWidth="1.5" transform="rotate(8 11 5)" />
      <text x="7" y="17" fontSize="8" fill="#C2410C" fontFamily="serif" fontWeight="bold">2</text>
      <text x="15" y="15" fontSize="8" fill="#111827" fontFamily="serif" fontWeight="bold">A</text>
    </svg>
  );
}

function UnoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <ellipse cx="14" cy="14" rx="10" ry="7.5" fill="#DC2626" opacity="0.85" />
      <text x="10.2" y="17" fontSize="8" fill="white" fontFamily="sans-serif" fontWeight="bold">U</text>
    </svg>
  );
}


function PlayerSelector({ onSelect }: { onSelect: (user: StoredUser) => void }) {
  const [users, setUsers] = useState<BoundAppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [createdUser, setCreatedUser] = useState<BoundAppUser | null>(null);
  const [bindCode, setBindCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data, error: fetchError } = await supabase
      .from('app_users')
      .select('id,name,bound_user_id,created_at,updated_at,bound_user:bound_user_id(id,name,bound_user_id)')
      .order('created_at', { ascending: true });

    if (!fetchError && data) {
      setUsers(data as unknown as BoundAppUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const selectUser = useCallback((user: BoundAppUser) => {
    if (!user.bound_user_id || !user.bound_user) return;
    const stored: StoredUser = {
      id: user.id,
      name: user.name,
      boundUserId: user.bound_user_id,
      boundUserName: user.bound_user.name,
    };
    setStoredUser(stored);
    onSelect(stored);
  }, [onSelect]);

  const createUser = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name first.');
      return;
    }

    setBusy(true);
    setError(null);
    const { supabase } = await import('@/lib/supabase');
    const { data, error: createError } = await supabase.rpc('create_app_user', { _name: trimmed });
    setBusy(false);

    if (createError || !data) {
      setError(createError?.message ?? 'Could not create user.');
      return;
    }

    const user = data as BoundAppUser;
    setCreatedUser({ ...user, bound_user: null });
    setName('');
    await loadUsers();
  }, [loadUsers, name]);

  const generateCode = useCallback(async () => {
    if (!createdUser) return;
    setBusy(true);
    setError(null);
    const { supabase } = await import('@/lib/supabase');
    const { data, error: codeError } = await supabase.rpc('generate_binding_code', { _creator_user_id: createdUser.id });
    setBusy(false);

    if (codeError || !data) {
      setError(codeError?.message ?? 'Could not generate a binding code.');
      return;
    }
    setGeneratedCode(String(data));
  }, [createdUser]);

  const redeemCode = useCallback(async () => {
    if (!createdUser) return;
    const code = bindCode.trim();
    if (!code) {
      setError('Enter a binding code first.');
      return;
    }

    setBusy(true);
    setError(null);
    const { supabase } = await import('@/lib/supabase');
    const { data, error: redeemError } = await supabase.rpc('redeem_binding_code', {
      _code: code,
      _user_id: createdUser.id,
    });
    setBusy(false);

    if (redeemError || !data?.[0]) {
      setError(redeemError?.message ?? 'Could not bind with that code.');
      return;
    }

    const row = data[0] as { user_id: string; user_name: string; bound_user_id: string; bound_user_name: string };
    const stored: StoredUser = {
      id: row.user_id,
      name: row.user_name,
      boundUserId: row.bound_user_id,
      boundUserName: row.bound_user_name,
    };
    setStoredUser(stored);
    await loadUsers();
    onSelect(stored);
  }, [bindCode, createdUser, loadUsers, onSelect]);

  const deleteUser = useCallback(async (user: BoundAppUser) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        user.bound_user
          ? `Delete ${user.name}? This will unbind ${user.bound_user.name} as well.`
          : `Delete ${user.name}?`
      );
      if (!confirmed) return;
    }

    setDeletingUserId(user.id);
    setError(null);
    const { supabase } = await import('@/lib/supabase');
    const { error: deleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('id', user.id);
    setDeletingUserId(null);

    if (deleteError) {
      setError(deleteError.message ?? 'Could not delete user.');
      return;
    }

    if (createdUser?.id === user.id) {
      setCreatedUser(null);
      setGeneratedCode(null);
      setBindCode('');
    }

    await loadUsers();
  }, [createdUser?.id, loadUsers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="max-w-4xl mx-auto w-full space-y-8"
    >
      <div className="text-center space-y-2">
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed">Choose a user or create a new match.</p>
        <p className="text-sm text-text-secondary/60">No passwords here, just names and pair codes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="rounded-3xl border border-border bg-surface p-6 text-text-secondary">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-6 text-text-secondary">No users yet.</div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              role="button"
              tabIndex={!user.bound_user_id || !user.bound_user || deletingUserId === user.id ? -1 : 0}
              onClick={() => {
                if (!user.bound_user_id || !user.bound_user || deletingUserId === user.id) return;
                selectUser(user);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                if (!user.bound_user_id || !user.bound_user || deletingUserId === user.id) return;
                event.preventDefault();
                selectUser(user);
              }}
              className={
                'relative rounded-3xl border border-border bg-surface p-6 text-left transition-all ' +
                (!user.bound_user_id || !user.bound_user || deletingUserId === user.id
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer')
              }
            >
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteUser(user);
                }}
                disabled={deletingUserId === user.id}
                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-border bg-background text-text-secondary hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label={`Delete ${user.name}`}
                title={`Delete ${user.name}`}
              >
                {deletingUserId === user.id ? '…' : '×'}
              </button>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {user.bound_user ? 'Bound with ' + user.bound_user.name : 'Not bound yet'}
                  </p>
                </div>
                <span className={
                  'text-xs rounded-full px-3 py-1 mr-10 ' +
                  (user.bound_user ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')
                }>
                  {user.bound_user ? 'ready' : 'needs code'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Create a user</h2>
          <p className="text-sm text-text-secondary mt-1">Names are unique. After creating one, bind with an existing code or generate a code for someone else.</p>
        </div>

        {!createdUser ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="User name"
              className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-player1/30"
            />
            <button
              onClick={createUser}
              disabled={busy}
              className="px-5 py-3 rounded-2xl bg-player1 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Creating...' : 'Create'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-background border border-border p-4">
              <p className="text-sm text-text-secondary">Created user</p>
              <p className="text-lg font-semibold text-text-primary">{createdUser.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <h3 className="font-semibold text-text-primary">Bind with a code</h3>
                <input
                  value={bindCode}
                  onChange={(event) => setBindCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-player1/30"
                />
                <button
                  onClick={redeemCode}
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-xl bg-player1 text-white font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  Bind user
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-border p-4">
                <h3 className="font-semibold text-text-primary">Start a new match</h3>
                <p className="text-sm text-text-secondary">Generate a one-time code for the other user to enter.</p>
                <button
                  onClick={generateCode}
                  disabled={busy || !!generatedCode}
                  className="w-full px-4 py-3 rounded-xl border border-border font-semibold text-text-primary hover:bg-background disabled:opacity-50 cursor-pointer"
                >
                  {generatedCode ? 'Code generated' : 'Generate code'}
                </button>
                {generatedCode && (
                  <div className="rounded-xl bg-background border border-border p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-text-secondary">Binding code</p>
                    <p className="text-3xl font-black tracking-[0.25em] text-text-primary mt-1">{generatedCode}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </motion.div>
  );
}

function GameSelection({ currentUser, onChangePlayer }: { currentUser: StoredUser; onChangePlayer: () => void }) {
  const playerName = currentUser.name;
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showWordleMode, setShowWordleMode] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { results, stats, loading, clearAll } = useMatchHistory(currentUser.id, currentUser.boundUserId);
  const { order, loading: orderLoading, saveOrder, resetOrder } = useGameOrder(playerName, currentUser.id);
  const { favorites, toggleFavorite, isFavorite } = useFavorites(playerName, currentUser.id);
  const [editMode, setEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState<string[]>(order);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<GameCategory[]>([]);

  useEffect(() => {
    if (!editMode) {
      setEditOrder(order);
    }
  }, [order, editMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Derive all categories that exist in the registry
  const allCategories = useMemo<GameCategory[]>(() => {
    const cats = new Set<GameCategory>();
    DEFAULT_GAME_ORDER.forEach((g) => g.categories.forEach((c) => cats.add(c)));
    return Array.from(cats);
  }, []);

  // Filter the order list based on search query and active category filters
  const filteredOrder = useMemo(() => {
    const currentOrder = editMode ? editOrder : order;
    if (!searchQuery && activeCategories.length === 0) return currentOrder;

    return currentOrder.filter((slug) => {
      const game = DEFAULT_GAME_ORDER.find((g) => g.slug === slug);
      if (!game) return false;

      // Search filter (AND with categories)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          game.title.toLowerCase().includes(q) ||
          game.description.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Category filter (OR logic among active categories)
      if (activeCategories.length > 0) {
        const matchesCategory = activeCategories.some((cat) =>
          game.categories.includes(cat),
        );
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [editMode, editOrder, order, searchQuery, activeCategories]);

  function toggleCategory(cat: GameCategory) {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

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

  const handlePlayDailyWordle = useCallback(async () => {
    setConnecting('wordle');

    const res = await fetch('/api/daily-wordle');
    if (!res.ok) {
      alert("Couldn't fetch today's word. Try again or use Random.");
      setConnecting(null);
      return;
    }
    const { word: dailyWord } = await res.json();

    const gameId = await findOrCreateBoundGame({
      table: 'wordle_games',
      gameType: 'wordle',
      currentUser,
      statusFilter: 'wordle',
      filterGame: (game) => game.answer_index === -1 && game.answer_word === dailyWord,
      createData: () => ({
        game_type: 'wordle',
        answer_index: -1,
        answer_word: dailyWord,
        guesses: [],
        guess_count: 0,
        status: 'playing',
        winner: null,
      }),
    });

    if (gameId) router.push('/wordle/' + gameId);
    else setConnecting(null);
  }, [currentUser, router]);

  const gameProps: Record<string, { icon: React.ReactNode; onClick: () => void; loading?: boolean }> = {
    'connect-four': { icon: <ConnectFourIcon />, onClick: () => router.push('/connect-four') },
    'wordle': { icon: <WordleIcon />, onClick: () => setShowWordleMode(true), loading: connecting === 'wordle' },
    'tic-tac-toe': { icon: <TicTacToeIcon />, onClick: () => router.push('/tic-tac-toe') },
    'checkers': { icon: <CheckersIcon />, onClick: () => router.push('/checkers') },
    'whiteboard': { icon: <WhiteboardIcon />, onClick: () => router.push('/whiteboard') },
    'battleship': { icon: <BattleshipIcon />, onClick: () => router.push('/battleship') },
    'mini-golf': { icon: <MiniGolfIcon />, onClick: () => router.push('/mini-golf') },
    'jenga': { icon: <JengaIcon />, onClick: () => router.push('/jenga') },
    'snakes-and-ladders': { icon: <SnakesAndLaddersIcon />, onClick: () => router.push('/snakes-and-ladders') },
    'word-search': { icon: <WordSearchIcon />, onClick: () => router.push('/word-search') },
    'monopoly': { icon: <MonopolyIcon />, onClick: () => router.push('/monopoly') },
    'memory': { icon: <MemoryIcon />, onClick: () => router.push('/memory') },
    'math-trivia': { icon: <MathTriviaIcon />, onClick: () => router.push('/math-trivia') },
    'pool': { icon: <PoolIcon />, onClick: () => router.push('/pool') },
    'cup-pong': { icon: <CupPongIcon />, onClick: () => router.push('/cup-pong') },
    'reaction': { icon: <ReactionIcon />, onClick: () => router.push('/reaction') },
    'sudoku': { icon: <SudokuIcon />, onClick: () => router.push('/sudoku') },
    'solitaire': { icon: <SolitaireIcon />, onClick: () => router.push('/solitaire') },
    'big-2': { icon: <Big2Icon />, onClick: () => router.push('/big-2') },
    'uno': { icon: <UnoIcon />, onClick: () => router.push('/uno') },
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

      {/* Search and category filters (hidden in edit mode) */}
      {!editMode && (
        <div className="max-w-5xl mx-auto mb-8 space-y-4">
          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]/50 transition-all"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-all cursor-pointer ${
                  activeCategories.includes(cat)
                    ? 'bg-player1 text-white border-transparent'
                    : 'border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
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

      {/* Favorites section */}
      {favorites.length > 0 && (
        <div className="max-w-5xl mx-auto mb-10">
          <div className="flex items-center gap-2 mb-5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#E63946"
              stroke="#E63946"
              strokeWidth={2}
              className="opacity-80"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-text-primary">Favorites</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {order
              .filter((slug) => favorites.includes(slug))
              .map((slug, index) => {
                const game = DEFAULT_GAME_ORDER.find((g) => g.slug === slug);
                const props = gameProps[slug];
                if (!game || !props) return null;

                return (
                  <ClickableGameCard
                    key={`fav-${slug}`}
                    title={game.title}
                    description={game.description}
                    color={game.color}
                    icon={props.icon}
                    delay={index * 0.05}
                    onClick={props.onClick}
                    loading={props.loading}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(slug)}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Games grid */}
      <div className="max-w-5xl mx-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={editMode ? editOrder : order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredOrder.map((slug, index) => {
                  const game = DEFAULT_GAME_ORDER.find((g) => g.slug === slug);
                  const props = gameProps[slug];
                  if (!game || !props) return null;

                  if (slug === 'wordle' && !editMode && showWordleMode) {
                    return (
                      <motion.div
                        key={slug}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                      >
                        <SortableGameCard id={slug} editMode={false}>
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
                                onClick={() => { setShowWordleMode(false); router.push('/wordle'); }}
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
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={slug}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                    >
                      <SortableGameCard id={slug} editMode={editMode}>
                        <ClickableGameCard
                          title={game.title}
                          description={game.description}
                          color={game.color}
                          icon={props.icon}
                          delay={index * 0.05}
                          onClick={editMode ? () => {} : props.onClick}
                          loading={!editMode && props.loading}
                          isFavorite={isFavorite(slug)}
                          onToggleFavorite={editMode ? undefined : () => toggleFavorite(slug)}
                        />
                      </SortableGameCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>

        {/* No games found message */}
        {!editMode && filteredOrder.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <p className="text-lg text-text-secondary">No games found</p>
            <p className="text-sm text-text-secondary/60 mt-1">Try a different search or filter</p>
          </motion.div>
        )}
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
  const [selectedUser, setSelectedUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setSelectedUser(getStoredUser());
  }, []);

  const handleSelectUser = (user: StoredUser) => {
    setSelectedUser(user);
  };

  const handleChangePlayer = () => {
    setSelectedUser(null);
    clearStoredUser();
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
          {selectedUser === null ? (
            <PlayerSelector key="player-selector" onSelect={handleSelectUser} />
          ) : (
            <GameSelection
              key="game-selection"
              currentUser={selectedUser}
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

