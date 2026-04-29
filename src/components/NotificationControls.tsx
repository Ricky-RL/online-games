'use client';

interface NotificationControlsProps {
  permissionState: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
}

export function NotificationControls({
  permissionState,
  requestPermission,
  isMuted,
  toggleMute,
}: NotificationControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleMute}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
        title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
        aria-label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {permissionState !== 'unsupported' && permissionState !== 'denied' && (
        <button
          onClick={requestPermission}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            permissionState === 'granted'
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
          title={
            permissionState === 'granted'
              ? 'Browser notifications enabled'
              : 'Enable browser notifications'
          }
          aria-label={
            permissionState === 'granted'
              ? 'Browser notifications enabled'
              : 'Enable browser notifications'
          }
          disabled={permissionState === 'granted'}
        >
          {permissionState === 'granted' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
