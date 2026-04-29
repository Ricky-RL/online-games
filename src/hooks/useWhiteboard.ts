'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { WhiteboardNote, NoteContentType, Stroke, NotePosition, NoteSize } from '@/lib/whiteboard-types';

const POLL_INTERVAL_MS = 1500;

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
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
    const { data, error: fetchError } = await supabase
      .from('whiteboard_notes')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return null;
    }
    return data as WhiteboardNote[];
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

      // Fire-and-forget: log activity after note is created (needs the ID)
      const preview = params.contentType === 'drawing'
        ? '[drawing]'
        : (params.textContent ?? '').slice(0, 50) || null;
      supabase
        .from('whiteboard_activity')
        .insert({
          note_id: created.id,
          action: 'created',
          actor_name: myName,
          note_preview: preview,
          note_color: params.color,
        })
        .then(() => {});

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

      const { error: updateError } = await supabase
        .from('whiteboard_notes')
        .update(updateFields)
        .eq('id', noteId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);

        // Fire-and-forget: log content update activity
        const myName = getMyName();
        if (myName) {
          const preview = params.drawingData !== undefined
            ? '[drawing]'
            : (params.textContent ?? '').slice(0, 50) || null;
          supabase
            .from('whiteboard_activity')
            .insert({
              note_id: noteId,
              action: 'updated',
              actor_name: myName,
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

      deletedIds.current.add(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));

      // Fire-and-forget: log delete activity alongside the delete
      const myName = getMyName();
      if (myName && noteToDelete) {
        const preview = noteToDelete.content_type === 'drawing'
          ? '[drawing]'
          : noteToDelete.text_content.slice(0, 50) || null;
        supabase
          .from('whiteboard_activity')
          .insert({
            note_id: noteId,
            action: 'deleted',
            actor_name: myName,
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
