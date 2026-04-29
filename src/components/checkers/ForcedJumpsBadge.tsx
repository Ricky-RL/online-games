'use client';

interface ForcedJumpsBadgeProps {
  enabled: boolean;
}

export function ForcedJumpsBadge({ enabled }: ForcedJumpsBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${enabled ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-amber-500' : 'bg-gray-400'}`} />
      {enabled ? 'Forced Jumps' : 'Free Moves'}
    </div>
  );
}
