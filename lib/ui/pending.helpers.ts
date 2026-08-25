/**
 * A pending fetch shorter than this is not worth a skeleton - flashing a
 * loader for a 100 ms quote is the flicker we are trying to avoid.
 */
export const SKELETON_DELAY_MS = 500
