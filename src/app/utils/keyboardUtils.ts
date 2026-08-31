/**
 * Keyboard Navigation Utilities
 * 
 * Helpers for implementing accessible keyboard interactions
 * per WCAG 2.1 Success Criterion 2.1.1 (Level A)
 */

export type KeyboardKey = 
  | 'Escape' 
  | 'Enter' 
  | 'Space' 
  | 'Tab'
  | 'ArrowUp' 
  | 'ArrowDown' 
  | 'ArrowLeft' 
  | 'ArrowRight'
  | 'Home'
  | 'End';

export function isKey(event: React.KeyboardEvent, key: KeyboardKey): boolean {
  return event.key === key;
}

export function isEscape(event: React.KeyboardEvent): boolean {
  return isKey(event, 'Escape');
}

export function isEnter(event: React.KeyboardEvent): boolean {
  return isKey(event, 'Enter');
}

export function isSpace(event: React.KeyboardEvent): boolean {
  return isKey(event, 'Space');
}

export function isActivationKey(event: React.KeyboardEvent): boolean {
  return isEnter(event) || isSpace(event);
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(selector));
}

/**
 * Trap focus within a container (for modals/dialogs)
 */
export function trapFocus(event: React.KeyboardEvent, container: HTMLElement): void {
  if (!isKey(event, 'Tab')) return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Handle keyboard navigation in a list
 */
export function handleListNavigation(
  event: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onIndexChange: (index: number) => void,
): void {
  if (isKey(event, 'ArrowDown')) {
    event.preventDefault();
    onIndexChange(Math.min(currentIndex + 1, itemCount - 1));
  } else if (isKey(event, 'ArrowUp')) {
    event.preventDefault();
    onIndexChange(Math.max(currentIndex - 1, 0));
  } else if (isKey(event, 'Home')) {
    event.preventDefault();
    onIndexChange(0);
  } else if (isKey(event, 'End')) {
    event.preventDefault();
    onIndexChange(itemCount - 1);
  }
}
