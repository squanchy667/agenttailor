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
import { SEARCH_DOCS_TOOL, handleSearchDocs } from './tools/searchDocs.js';
import { UPLOAD_DOCUMENT_TOOL, handleUploadDocument } from './tools/uploadDocument.js';
import { LIST_PROJECTS_TOOL, handleListProjects } from './tools/listProjects.js';

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
    tools: [TAILOR_CONTEXT_TOOL, SEARCH_DOCS_TOOL, UPLOAD_DOCUMENT_TOOL, LIST_PROJECTS_TOOL],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'tailor_context':
      return handleTailorContext(apiClient, args ?? {});
    case 'search_docs':
      return handleSearchDocs(apiClient, args ?? {});
    case 'upload_document':
      return handleUploadDocument(apiClient, args ?? {});
    case 'list_projects':
      return handleListProjects(apiClient);
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
  const toolNames = [TAILOR_CONTEXT_TOOL, SEARCH_DOCS_TOOL, UPLOAD_DOCUMENT_TOOL, LIST_PROJECTS_TOOL].map((t) => t.name);
  console.error(`  Tools: ${toolNames.join(', ')}`);
  console.error(`  API URL: ${process.env['AGENTTAILOR_API_URL'] ?? 'http://localhost:3000'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
