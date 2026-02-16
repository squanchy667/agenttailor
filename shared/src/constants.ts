/**
 * Platform identifiers
 */
export const PLATFORMS = {
  CHATGPT: 'chatgpt',
  CLAUDE: 'claude',
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/**
 * Default token limits per platform
 */
export const DEFAULT_TOKEN_LIMITS = {
  [PLATFORMS.CHATGPT]: 8000,
  [PLATFORMS.CLAUDE]: 100000,
} as const;

/**
 * API version
 */
export const API_VERSION = 'v1';
