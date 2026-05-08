'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WhiteboardNote, NoteContentType, Stroke, NotePosition, NoteSize } from '@/lib/whiteboard-types';
import { getStoredUser } from '@/lib/players';

const POLL_INTERVAL_MS = 1500;
const ACTIVITY_THROTTLE_MS = 60_000; // 1 notification per note per minute

/**
 * Tracks last activity insert time per note+action key.
 * Module-level so it persists across re-renders but resets on page reload.
 */
const activityThrottleMap = new Map<string, number>();

/**
 * Returns true if this note+action combination should be allowed to fire,
 * i.e., no activity was logged for it within the last ACTIVITY_THROTTLE_MS.
 * Updates the map timestamp if allowed.
 */
function shouldLogActivity(noteId: string, action: string): boolean {
  const key = `${noteId}:${action}`;
  const now = Date.now();
  const lastFired = activityThrottleMap.get(key);
  if (lastFired !== undefined && now - lastFired < ACTIVITY_THROTTLE_MS) {
    return false;
  }
  activityThrottleMap.set(key, now);
  return true;
}

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredUser()?.name ?? sessionStorage.getItem('player-name') ?? localStorage.getItem('player-name');
}

interface UseWhiteboardReturn {
  notes: WhiteboardNote[];
  loading: boolean;
  error: string | null;
  createNote: (params: {
    contentType: NoteContentType;
    textContent?: string;
    drawingData?: Stroke[];
    position: NotePosition;
    color: string;
  }) => Promise<WhiteboardNote | null>;
  updateNotePosition: (noteId: string, position: NotePosition) => Promise<void>;
  updateNoteContent: (noteId: string, params: {
    textContent?: string;
    drawingData?: Stroke[];
  }) => Promise<void>;
  updateNoteColor: (noteId: string, color: string) => Promise<void>;
  updateNoteSize: (noteId: string, size: NoteSize) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

export function useWhiteboard(): UseWhiteboardReturn {
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deletedIds = useRef<Set<string>>(new Set());

  const fetchNotes = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data, error: fetchError } = await supabase
      .from('whiteboard_notes')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return null;
    }
    const currentUser = getStoredUser();
    if (!currentUser?.boundUserId) return [];

    return (data as WhiteboardNote[]).filter((note) => {
      const scoped = note as WhiteboardNote & { owner_user_id?: string | null; partner_user_id?: string | null };
      if (!scoped.owner_user_id && !scoped.partner_user_id) return true;
      return (
        (scoped.owner_user_id === currentUser.id && scoped.partner_user_id === currentUser.boundUserId) ||
        (scoped.owner_user_id === currentUser.boundUserId && scoped.partner_user_id === currentUser.id)
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const data = await fetchNotes();
      if (cancelled) return;
      if (data) {
        setNotes(data);
      }
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchNotes]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await fetchNotes();
      if (!fresh) return;

      const filtered = fresh.filter((n) => !deletedIds.current.has(n.id));

      for (const id of deletedIds.current) {
        if (!fresh.find((n) => n.id === id)) {
          deletedIds.current.delete(id);
        }
      }

      setNotes(filtered);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchNotes]);

  const createNote = useCallback(
    async (params: {
      contentType: NoteContentType;
      textContent?: string;
      drawingData?: Stroke[];
      position: NotePosition;
      color: string;
    }): Promise<WhiteboardNote | null> => {
      const myName = getMyName();
      const currentUser = getStoredUser();
      const { supabase } = await import('@/lib/supabase');

      const { data, error: insertError } = await supabase
        .from('whiteboard_notes')
        .insert({
          content_type: params.contentType,
          text_content: params.textContent ?? '',
          drawing_data: params.drawingData ?? null,
          position_x: params.position.x,
          position_y: params.position.y,
          color: params.color,
          created_by_name: myName,
          owner_user_id: currentUser?.id ?? null,
          partner_user_id: currentUser?.boundUserId ?? null,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const created = data as WhiteboardNote;
      setNotes((prev) => [...prev, created]);
      setError(null);

      // Fire-and-forget: log activity after note is created (throttled to 1 per note per minute)
      if (shouldLogActivity(created.id, 'created')) {
        const preview = params.contentType === 'drawing'
          ? '[drawing]'
          : (params.textContent ?? '').slice(0, 50) || null;
        supabase
          .from('whiteboard_activity')
          .insert({
            note_id: created.id,
            action: 'created',
            actor_name: myName,
            actor_user_id: currentUser?.id ?? null,
            note_preview: preview,
            note_color: params.color,
          })
          .then(() => {});
      }

      return created;
    },
    []
  );

  const updateNotePosition = useCallback(
    async (noteId: string, position: NotePosition): Promise<void> => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, position_x: position.x, position_y: position.y }
            : n
        )
      );

      const { supabase } = await import('@/lib/supabase');
      const { error: updateError } = await supabase
        .from('whiteboard_notes')
        .update({
          position_x: position.x,
          position_y: position.y,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);
      }
    },
    []
  );

  const updateNoteContent = useCallback(
    async (noteId: string, params: { textContent?: string; drawingData?: Stroke[] }): Promise<void> => {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n;
          return {
            ...n,
            ...(params.textContent !== undefined && { text_content: params.textContent }),
            ...(params.drawingData !== undefined && { drawing_data: params.drawingData }),
          };
        })
      );

      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (params.textContent !== undefined) {
        updateFields.text_content = params.textContent;
      }
      if (params.drawingData !== undefined) {
        updateFields.drawing_data = params.drawingData;
      }

      const { supabase } = await import('@/lib/supabase');
      const { error: updateError } = await supabase
        .from('whiteboard_notes')
        .update(updateFields)
        .eq('id', noteId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);

        // Fire-and-forget: log content update activity (throttled to 1 per note per minute)
        const myName = getMyName();
        const currentUser = getStoredUser();
        if (myName && shouldLogActivity(noteId, 'updated')) {
          const preview = params.drawingData !== undefined
            ? '[drawing]'
            : (params.textContent ?? '').slice(0, 50) || null;
          supabase
            .from('whiteboard_activity')
            .insert({
              note_id: noteId,
              action: 'updated',
              actor_name: myName,
              actor_user_id: currentUser?.id ?? null,
              note_preview: preview,
              note_color: null,
            })
            .then(() => {});
        }
      }
    },
    []
  );

  const updateNoteColor = useCallback(
    async (noteId: string, color: string): Promise<void> => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, color } : n))
      );

      const { supabase } = await import('@/lib/supabase');
      const { error: updateError } = await supabase
        .from('whiteboard_notes')
        .update({ color, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);
      }
    },
    []
  );

  const updateNoteSize = useCallback(
    async (noteId: string, size: NoteSize): Promise<void> => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, width: size.width, height: size.height } : n))
      );

      const { supabase } = await import('@/lib/supabase');
      const { error: updateError } = await supabase
        .from('whiteboard_notes')
        .update({ width: size.width, height: size.height, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);
      }
    },
    []
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      // Capture note data before removing from state for activity logging
      const noteToDelete = notes.find((n) => n.id === noteId);
      const { supabase } = await import('@/lib/supabase');

      deletedIds.current.add(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));

      // Fire-and-forget: log delete activity (throttled to 1 per note per minute)
      const myName = getMyName();
      const currentUser = getStoredUser();
      if (myName && noteToDelete && shouldLogActivity(noteId, 'deleted')) {
        const preview = noteToDelete.content_type === 'drawing'
          ? '[drawing]'
          : noteToDelete.text_content.slice(0, 50) || null;
        supabase
          .from('whiteboard_activity')
          .insert({
            note_id: noteId,
            action: 'deleted',
            actor_name: myName,
            actor_user_id: currentUser?.id ?? null,
            note_preview: preview,
            note_color: noteToDelete.color,
          })
          .then(() => {});
      }

      const { error: deleteError } = await supabase
        .from('whiteboard_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) {
        deletedIds.current.delete(noteId);
        setError(deleteError.message);
        const fresh = await fetchNotes();
        if (fresh) setNotes(fresh);
      } else {
        setError(null);
      }
    },
    [fetchNotes, notes]
  );

  return {
    notes,
    loading,
    error,
    createNote,
    updateNotePosition,
    updateNoteContent,
    updateNoteColor,
    updateNoteSize,
    deleteNote,
  };
}
