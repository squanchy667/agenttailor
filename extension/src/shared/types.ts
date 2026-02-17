/**
 * Shared types for AgentTailor Chrome extension messaging
 */

import type { Platform } from '@agenttailor/shared';

/**
 * Typed messages for extension inter-component communication
 */
export type ExtensionMessage =
  | { type: 'PING' }
  | {
      type: 'PLATFORM_STATUS';
      platform: Platform;
      ready: boolean;
      conversationId: string | null;
      inputDetected: boolean;
    }
  | {
      type: 'TRIGGER_TAILOR';
      taskText: string;
      projectId: string;
      platform: Platform;
    }
  | {
      type: 'TAILOR_PROGRESS';
      status: string;
      progress: number;
    }
  | {
      type: 'TAILOR_COMPLETE';
      context: string;
      metadata: unknown;
    }
  | {
      type: 'INJECT_CONTEXT';
      context: string;
    }
  | {
      type: 'INJECTION_RESULT';
      success: boolean;
      error?: string;
    };

/**
 * Response messages sent back from background to content scripts / popup
 */
export type ExtensionResponse =
  | { type: 'PONG'; timestamp: number }
  | { type: 'ACK' }
  | { type: 'ERROR'; message: string };

/**
 * Extension settings stored in chrome.storage.sync
 */
export interface ExtensionSettings {
  enabled: boolean;
  activeProjectId: string | null;
  /** API base URL. Empty string means use the default proxy/production URL. */
  apiEndpoint: string;
  /** Automatically trigger context assembly when a task is detected. */
  autoTailor: boolean;
  /** Include web search results in assembled context. */
  webSearchEnabled: boolean;
  /** Color theme preference. */
  theme: 'light' | 'dark' | 'system';
}

/**
 * Supported platform domains
 */
export const SUPPORTED_DOMAINS = {
  CHATGPT: 'chatgpt.com',
  CLAUDE: 'claude.ai',
} as const;
