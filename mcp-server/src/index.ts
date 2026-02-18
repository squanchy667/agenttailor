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
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from './lib/apiClient.js';
import { TAILOR_CONTEXT_TOOL, handleTailorContext } from './tools/tailorContext.js';
import { SEARCH_DOCS_TOOL, handleSearchDocs } from './tools/searchDocs.js';
import { UPLOAD_DOCUMENT_TOOL, handleUploadDocument } from './tools/uploadDocument.js';
import { LIST_PROJECTS_TOOL, handleListProjects } from './tools/listProjects.js';
import {
  DOCUMENT_RESOURCE_TEMPLATES,
  PROJECTS_RESOURCE,
  listDocumentResources,
  readDocumentResource,
} from './resources/documents.js';
import {
  SESSION_RESOURCE_TEMPLATES,
  listSessionResources,
  readSessionResource,
} from './resources/sessions.js';

// ── Initialize ──────────────────────────────────────────────────────────────

const apiClient = new ApiClient();

const server = new Server(
  { name: 'agenttailor', version: '1.0.0' },
  {
    capabilities: {
      tools: {},
      resources: {},
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

// ── Resources ───────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [...DOCUMENT_RESOURCE_TEMPLATES, ...SESSION_RESOURCE_TEMPLATES],
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // Return the top-level projects resource as a static entry point
  return {
    resources: [PROJECTS_RESOURCE],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Route to the correct resource handler based on URI pattern
  if (uri === 'agenttailor://projects') {
    const result = await listDocumentResources(apiClient, uri);
    return {
      contents: result.resources.map((r) => ({
        uri: r.uri,
        text: `${r.name}${r.description ? ` — ${r.description}` : ''}`,
        mimeType: 'text/plain',
      })),
    };
  }

  // List documents in a project
  if (/^agenttailor:\/\/projects\/[^/]+\/documents$/.test(uri)) {
    const result = await listDocumentResources(apiClient, uri);
    return {
      contents: result.resources.map((r) => ({
        uri: r.uri,
        text: `${r.name}${r.description ? ` — ${r.description}` : ''}`,
        mimeType: 'text/plain',
      })),
    };
  }

  // Read a specific document
  if (/^agenttailor:\/\/projects\/[^/]+\/documents\/[^/]+$/.test(uri)) {
    return readDocumentResource(apiClient, uri);
  }

  // List sessions in a project
  if (/^agenttailor:\/\/projects\/[^/]+\/sessions$/.test(uri)) {
    const result = await listSessionResources(apiClient, uri);
    return {
      contents: result.resources.map((r) => ({
        uri: r.uri,
        text: `${r.name}${r.description ? ` — ${r.description}` : ''}`,
        mimeType: 'text/plain',
      })),
    };
  }

  // Read a specific session
  if (/^agenttailor:\/\/projects\/[^/]+\/sessions\/[^/]+$/.test(uri)) {
    return readSessionResource(apiClient, uri);
  }

  throw new Error(`Unknown resource URI: ${uri}`);
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
