#!/usr/bin/env node

/**
 * AgentTailor MCP Server
 *
 * Provides context tailoring tools and document resources for Claude Desktop
 * and Claude Code via the Model Context Protocol (stdio transport).
 *
 * Claude Desktop configuration (add to claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "agent-tailor": {
 *       "command": "npx",
 *       "args": ["agent-tailor-mcp"],
 *       "env": {
 *         "AGENTTAILOR_API_URL": "http://localhost:3000",
 *         "AGENTTAILOR_API_KEY": "your-api-key"
 *       }
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from './lib/apiClient.js';
import { TAILOR_CONTEXT_TOOL, handleTailorContext } from './tools/tailorContext.js';

// ── Initialize ──────────────────────────────────────────────────────────────

const apiClient = new ApiClient();

const server = new Server(
  { name: 'agenttailor', version: '1.0.0' },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ── Tools ───────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [TAILOR_CONTEXT_TOOL],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'tailor_context':
      return handleTailorContext(apiClient, args ?? {});
    default:
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentTailor MCP server running on stdio');
  console.error(`  Tools: ${[TAILOR_CONTEXT_TOOL.name].join(', ')}`);
  console.error(`  API URL: ${process.env['AGENTTAILOR_API_URL'] ?? 'http://localhost:3000'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
