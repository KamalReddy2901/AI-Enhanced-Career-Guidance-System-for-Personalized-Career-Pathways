/**
 * Skip Navigation Link
 *
 * WCAG 2.1 Success Criterion 2.4.1 (Level A): Bypass Blocks
 *
 * Provides keyboard users a way to skip repeated navigation and jump
 * directly to main content. Hidden visually but available to keyboard
 * and screen reader users.
 */

export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-black focus:bg-[#e7ff57] focus:px-4 focus:py-2 focus:font-mono-ui focus:text-xs focus:font-black focus:uppercase focus:shadow-[4px_4px_0_#111]"
    >
      Skip to main content
    </a>
  );
}
