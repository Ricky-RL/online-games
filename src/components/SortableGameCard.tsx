'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableGameCardProps {
  id: string;
  editMode: boolean;
  children: React.ReactNode;
}

export function SortableGameCard({ id, editMode, children }: SortableGameCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {editMode && (
        <button
          {...listeners}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-surface-hover/80 backdrop-blur-sm border border-border text-text-secondary hover:text-text-primary cursor-grab active:cursor-grabbing transition-colors"
          aria-label="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}
      {children}
    </div>
  );
}
