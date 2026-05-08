'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePairChat } from '@/hooks/usePairChat';

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatWidget() {
  const { loading, canChat, myUserId, partnerName, messages, unreadCount, sendMessage, markRead } = usePairChat();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || unreadCount === 0) return;
    void markRead();
  }, [isOpen, unreadCount, markRead]);

  useEffect(() => {
    if (!isOpen) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [isOpen, messages.length]);

  if (loading || !canChat || !myUserId) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    const sent = await sendMessage(draft);
    setSending(false);
    if (!sent) return;
    setDraft('');
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setIsOpen(true)}
        className="fixed left-2 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full border border-border bg-surface shadow-lg hover:shadow-xl hover:bg-surface/95 transition-all cursor-pointer flex items-center justify-center"
        aria-label="Open chat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-secondary">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-player1 text-white text-[10px] font-bold leading-4 text-center border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 cursor-pointer"
              aria-label="Close chat"
            />
            <motion.section
              initial={{ opacity: 0, x: -18, y: '-50%' }}
              animate={{ opacity: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, x: -18, y: '-50%' }}
              transition={{ duration: 0.18 }}
              className="fixed z-50 left-4 right-4 sm:right-auto sm:w-[22rem] sm:left-16 top-1/2 max-h-[min(70vh,34rem)] rounded-2xl border border-border bg-surface shadow-2xl flex flex-col overflow-hidden"
              aria-label="Pair chat panel"
            >
              <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Chat</p>
                  <p className="text-xs text-text-secondary">
                    with {partnerName ?? 'your partner'}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full border border-border hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  aria-label="Close chat panel"
                >
                  X
                </button>
              </header>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-background/40 min-h-40"
              >
                {messages.length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-10">
                    Say hi to start chatting.
                  </p>
                )}
                {messages.map((message) => {
                  const mine = message.sender_user_id === myUserId;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          mine
                            ? 'bg-player1 text-white'
                            : 'bg-surface border border-border text-text-primary'
                        }`}
                      >
                        <p className="text-sm leading-snug whitespace-pre-wrap break-words">{message.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-white/80' : 'text-text-secondary'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="p-3 border-t border-border flex items-end gap-2 bg-surface">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a message"
                  rows={1}
                  maxLength={500}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946]/40"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="px-3 py-2 text-sm font-medium rounded-xl bg-player1 text-white hover:bg-player1/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Send
                </button>
              </form>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
