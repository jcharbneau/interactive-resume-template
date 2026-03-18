import { useEffect } from 'react';

/**
 * Keyboard navigation hook for InteractiveResume.
 * Maps ↑↓ / j/k to era navigation. Skips when focus is in an input.
 *
 * @param {{ eraCount: number, activeIndex: number, onNavigate: (i: number) => void, onFirstPress?: () => void }} opts
 */
export function useKeyboardNav({ eraCount, activeIndex, onNavigate, onFirstPress }) {
  useEffect(() => {
    let hasFired = false;

    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        next = Math.min(activeIndex + 1, eraCount - 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        next = Math.max(activeIndex - 1, -1); // -1 = intro section
      }

      if (next !== null) {
        if (!hasFired) {
          hasFired = true;
          onFirstPress?.();
        }
        onNavigate(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, eraCount, onNavigate, onFirstPress]);
}
