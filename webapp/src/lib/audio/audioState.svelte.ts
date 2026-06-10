/**
 * Whether the AudioContext has been resumed by a user gesture yet.
 *
 * Browsers refuse to start audio until the user interacts with the page, so we
 * hold off creating any Tone.js nodes until this flips true (see engine.ts).
 * It lives in its own rune module so both the toolbar and the engine share one
 * reactive source of truth.
 */
export const audioState = $state({ started: false });
