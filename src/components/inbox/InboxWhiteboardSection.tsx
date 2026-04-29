'use client';

import { motion } from 'framer-motion';
import type { WhiteboardActivityItem } from '@/lib/inbox-types';
import { InboxWhiteboardItem } from './InboxWhiteboardItem';

interface InboxWhiteboardSectionProps {
  activity: WhiteboardActivityItem[];
  onItemClick: () => void;
  onDismiss: (itemId: string) => void;
}

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

export function InboxWhiteboardSection({ activity, onItemClick, onDismiss }: InboxWhiteboardSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
          Whiteboard
        </h3>
      </div>

      {/* Activity list */}
      {activity.length === 0 ? (
        <p className="text-sm text-text-secondary/60 py-2">No recent activity</p>
      ) : (
        <motion.div
          className="flex flex-col gap-2"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {activity.map((item) => (
            <motion.div key={item.id} variants={listItem}>
              <InboxWhiteboardItem item={item} onClick={onItemClick} onDismiss={() => onDismiss(item.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
