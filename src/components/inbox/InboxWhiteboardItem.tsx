'use client';

import { motion } from 'framer-motion';
import type { WhiteboardActivityItem } from '@/lib/inbox-types';
import { relativeTime } from './relative-time';

interface InboxWhiteboardItemProps {
  item: WhiteboardActivityItem;
  onClick: () => void;
  onDismiss: () => void;
}

function ActionIndicator({ action }: { action: WhiteboardActivityItem['action'] }) {
  if (action === 'created') {
    return (
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (action === 'updated') {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 7.5L7 2.5M7 2.5L7 5.5M7 2.5L4 2.5" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // deleted
  return (
    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <line x1="2.5" y1="5" x2="7.5" y2="5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function actionVerb(action: WhiteboardActivityItem['action']): string {
  switch (action) {
    case 'created':
      return 'created a note';
    case 'updated':
      return 'updated a note';
    case 'deleted':
      return 'deleted a note';
  }
}

export function InboxWhiteboardItem({ item, onClick, onDismiss }: InboxWhiteboardItemProps) {
  const preview = item.note_preview ?? null;

  return (
    <div className="relative group/item">
      <motion.button
        onClick={onClick}
        className="w-full flex items-start gap-2.5 p-3 rounded-xl border border-border bg-surface/50 hover:bg-surface hover:border-border/80 transition-all cursor-pointer text-left group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Unread dot */}
        {item.isUnread && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#E63946] mt-2 flex-shrink-0" />
        )}

        {/* Action indicator */}
        <ActionIndicator action={item.action} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${item.isUnread ? 'font-medium text-text-primary' : 'text-text-primary/80'}`}>
            <span className="font-medium">{item.actor_name}</span>{' '}
            <span className="text-text-secondary">{actionVerb(item.action)}</span>
          </p>

          {preview && (
            <p className="text-xs text-text-secondary/70 truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>

        {/* Color swatch + timestamp */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.note_color && (
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.note_color }}
            />
          )}
          <span className="text-[11px] text-text-secondary/60 whitespace-nowrap">
            {relativeTime(item.created_at)}
          </span>
        </div>
      </motion.button>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-surface border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-text-secondary/60"
        aria-label="Dismiss notification"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
