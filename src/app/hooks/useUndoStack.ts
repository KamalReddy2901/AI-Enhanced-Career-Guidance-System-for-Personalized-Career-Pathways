import { useState, useCallback, useEffect } from 'react';
import type { CareerPassport } from '../engine/types';

const UNDO_STACK_KEY = 'cc_passport_undo_stack';
const MAX_UNDO_HISTORY = 20;

interface UndoStack {
  past: CareerPassport[];
  present: CareerPassport | null;
  future: CareerPassport[];
}

export function useUndoStack(initialPassport: CareerPassport | null) {
  const [stack, setStack] = useState<UndoStack>(() => {
    try {
      const stored = localStorage.getItem(UNDO_STACK_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UndoStack;
        return {
          past: parsed.past || [],
          present: initialPassport,
          future: parsed.future || [],
        };
      }
    } catch {
      // Ignore parsing errors
    }
    return {
      past: [],
      present: initialPassport,
      future: [],
    };
  });

  // Update present when passport changes externally
  useEffect(() => {
    setStack(prev => ({
      ...prev,
      present: initialPassport,
    }));
  }, [initialPassport]);

  // Save to localStorage whenever stack changes
  useEffect(() => {
    try {
      localStorage.setItem(UNDO_STACK_KEY, JSON.stringify({
        past: stack.past,
        future: stack.future,
      }));
    } catch {
      // localStorage full
    }
  }, [stack]);

  const pushState = useCallback((newPassport: CareerPassport) => {
    setStack(prev => {
      if (!prev.present) {
        return {
          past: [],
          present: newPassport,
          future: [],
        };
      }

      // Add current state to past
      const newPast = [...prev.past, prev.present].slice(-MAX_UNDO_HISTORY);

      return {
        past: newPast,
        present: newPassport,
        future: [], // Clear future when new change is made
      };
    });
  }, []);

  const undo = useCallback((): CareerPassport | null => {
    if (stack.past.length === 0) return null;

    const previous = stack.past[stack.past.length - 1];
    const newPast = stack.past.slice(0, -1);

    setStack(prev => ({
      past: newPast,
      present: previous,
      future: prev.present ? [prev.present, ...prev.future] : prev.future,
    }));

    return previous;
  }, [stack.past]);

  const redo = useCallback((): CareerPassport | null => {
    if (stack.future.length === 0) return null;

    const next = stack.future[0];
    const newFuture = stack.future.slice(1);

    setStack(prev => ({
      past: prev.present ? [...prev.past, prev.present] : prev.past,
      present: next,
      future: newFuture,
    }));

    return next;
  }, [stack.future]);

  const canUndo = stack.past.length > 0;
  const canRedo = stack.future.length > 0;

  const clearHistory = useCallback(() => {
    setStack(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }));
    try {
      localStorage.removeItem(UNDO_STACK_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
