/**
 * Haptic feedback utility.
 * Calls navigator.vibrate() if available; no-op on unsupported platforms.
 */
export function haptic(pattern: number | number[] = 50): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore — vibration not supported
  }
}

/** Short tap — button press */
export const hapticTap = () => haptic(10);

/** Standard feedback — correct answer, fav toggle */
export const hapticLight = () => haptic(50);

/** Warning — wrong answer */
export const hapticWarn = () => haptic(200);

/** Celebration — badge unlock, simulation complete */
export const hapticSuccess = () => haptic([50, 30, 50]);
