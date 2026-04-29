
export type InboxGameType = 'connect-four' | 'tic-tac-toe' | 'checkers' | 'battleship' | 'mini-golf' | 'jenga';


export interface InboxGame {
  id: string;
  game_type: InboxGameType;
  current_turn: 1 | 2;
  player1_name: string | null;
  player2_name: string | null;
  updated_at: string;
  isMyTurn: boolean;
  isWaitingForOpponent: boolean;
}

export interface WhiteboardActivityItem {
  id: string;
  note_id: string;
  action: 'created' | 'updated' | 'deleted';
  actor_name: string;
  note_preview: string | null;
  note_color: string | null;
  created_at: string;
  isUnread: boolean;
}

export interface UseInboxReturn {
  games: InboxGame[];
  gamesLoading: boolean;
  whiteboardActivity: WhiteboardActivityItem[];
  whiteboardLoading: boolean;
  unreadGamesCount: number;
  unreadWhiteboardCount: number;
  markGamesRead: () => Promise<void>;
  markWhiteboardRead: () => Promise<void>;
  dismissItem: (itemType: 'game' | 'whiteboard', itemId: string) => Promise<void>;
}
