import type { KnowledgeDomain, TaskType, ComplexityLevel } from '@agenttailor/shared';

const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  FRONTEND: [
    'react', 'vue', 'angular', 'svelte', 'component', 'ui', 'css', 'html', 'dom',
    'browser', 'client', 'frontend', 'front-end', 'responsive', 'animation', 'tailwind',
    'webpack', 'vite', 'jsx', 'tsx', 'sass', 'scss', 'accessibility', 'a11y', 'spa',
    'rendering', 'hydration', 'nextjs', 'nuxt', 'remix', 'typescript', 'javascript',
  ],
  BACKEND: [
    'api', 'endpoint', 'server', 'express', 'middleware', 'route', 'rest', 'graphql',
    'grpc', 'microservice', 'service', 'handler', 'controller', 'request', 'response',
    'http', 'https', 'websocket', 'socket', 'node', 'fastify', 'koa', 'hono',
    'backend', 'back-end', 'rate limiting', 'rate limit', 'throttle', 'payload',
    'header', 'cors', 'session', 'cookie', 'jwt', 'token', 'webhook',
  ],
  DATABASE: [
    'database', 'db', 'sql', 'nosql', 'query', 'schema', 'migration', 'index',
    'table', 'collection', 'document', 'record', 'orm', 'prisma', 'sequelize',
    'mongoose', 'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
    'transaction', 'join', 'relation', 'foreign key', 'primary key', 'crud',
    'insert', 'update', 'delete', 'select', 'aggregate', 'pipeline',
  ],
  DEVOPS: [
    'docker', 'kubernetes', 'k8s', 'container', 'deployment', 'ci', 'cd', 'pipeline',
    'github actions', 'jenkins', 'terraform', 'ansible', 'aws', 'gcp', 'azure',
    'cloud', 'infra', 'infrastructure', 'devops', 'helm', 'nginx', 'load balancer',
    'autoscaling', 'monitoring', 'logging', 'observability', 'prometheus', 'grafana',
    'environment', 'env', 'secret', 'config map', 'pod', 'service mesh', 'istio',
  ],
  SECURITY: [
    'security', 'auth', 'authentication', 'authorization', 'permission', 'role',
    'oauth', 'saml', 'sso', 'encryption', 'hash', 'password', 'secret', 'vulnerability',
    'xss', 'csrf', 'injection', 'sanitize', 'validate', 'firewall', 'ssl', 'tls',
    'certificate', 'rate limiting', 'brute force', 'ddos', 'attack', 'exploit',
    'audit', 'compliance', 'gdpr', 'pii', 'token', 'api key', 'scope', 'claim',
  ],
  TESTING: [
    'test', 'testing', 'unit test', 'integration test', 'e2e', 'end-to-end',
    'vitest', 'jest', 'mocha', 'chai', 'supertest', 'playwright', 'cypress',
    'mock', 'stub', 'spy', 'fixture', 'snapshot', 'coverage', 'assertion',
    'spec', 'describe', 'it block', 'expect', 'tdd', 'bdd', 'regression',
    'benchmark', 'performance test', 'load test',
  ],
  DESIGN: [
    'design', 'ux', 'ui', 'wireframe', 'mockup', 'prototype', 'figma', 'sketch',
    'user experience', 'user interface', 'layout', 'typography', 'color', 'palette',
    'icon', 'illustration', 'branding', 'style guide', 'design system', 'component library',
    'interaction', 'flow', 'journey', 'persona', 'heuristic', 'usability',
  ],
  ARCHITECTURE: [
    'architecture', 'microservice', 'monolith', 'pattern', 'design pattern', 'system design',
    'scalability', 'high availability', 'fault tolerance', 'event driven', 'cqrs',
    'event sourcing', 'saga', 'domain driven', 'ddd', 'hexagonal', 'clean architecture',
    'dependency injection', 'inversion of control', 'solid', 'separation of concerns',
    'distributed', 'messaging', 'queue', 'pub sub', 'broker', 'service bus',
    'payment system', 'payment gateway', 'checkout', 'transaction', 'workflow',
  ],
  DOCUMENTATION: [
    'documentation', 'docs', 'readme', 'guide', 'tutorial', 'how-to', 'reference',
    'api docs', 'openapi', 'swagger', 'jsdoc', 'typedoc', 'wiki', 'knowledge base',
    'onboarding', 'user guide', 'manual', 'specification', 'requirement', 'changelog',
    'contributing', 'comment', 'annotation', 'docstring',
  ],
  BUSINESS: [
    'business', 'requirement', 'stakeholder', 'product', 'feature', 'roadmap',
    'sprint', 'agile', 'scrum', 'kanban', 'backlog', 'user story', 'epic',
    'kpi', 'metric', 'analytics', 'revenue', 'customer', 'client', 'market',
    'strategy', 'goal', 'objective', 'okr', 'roi', 'cost', 'budget', 'pricing',
  ],
  DATA_SCIENCE: [
    'machine learning', 'ml', 'ai', 'model', 'training', 'inference', 'prediction',
    'classification', 'regression', 'neural network', 'deep learning', 'nlp',
    'data pipeline', 'etl', 'dataset', 'feature engineering', 'embedding',
    'vector', 'similarity', 'clustering', 'pandas', 'numpy', 'pytorch', 'tensorflow',
    'scikit', 'jupyter', 'notebook', 'statistical', 'probability',
  ],
  GENERAL: [],
};

const TASK_TYPE_PATTERNS: Record<TaskType, RegExp[]> = {
  CODING: [
    /\b(implement|build|create|develop|write|add|integrate|refactor|code)\b/i,
    /\b(function|class|module|component|feature|endpoint|api)\b/i,
  ],
  WRITING: [
    /\b(write|draft|compose|document|describe|explain|summarize|create)\b.*\b(doc|guide|readme|article|post|content|copy)\b/i,
    /\b(user documentation|user guide|onboarding|tutorial|how-to)\b/i,
  ],
  ANALYSIS: [
    /\b(analyze|analyse|review|audit|assess|evaluate|investigate|measure|profile)\b/i,
    /\b(performance|bottleneck|memory leak|metrics|benchmark|report)\b/i,
  ],
  RESEARCH: [
    /\b(research|explore|investigate|survey|compare|evaluate|study|look into)\b/i,
    /\b(best practice|option|alternative|approach|technology|library|tool)\b/i,
  ],
  DEBUGGING: [
    /\b(debug|fix|troubleshoot|diagnose|resolve|investigate)\b.*\b(bug|issue|error|problem|crash|fail)\b/i,
    /\b(why|reason|cause)\b.*\b(not working|broken|failing|dropping|error)\b/i,
  ],
  DESIGN: [
    /\b(design|architect|plan|model|structure|diagram)\b.*\b(system|architecture|schema|database|flow)\b/i,
    /\b(microservice|monolith|pattern|ddd|event.driven)\b/i,
  ],
  PLANNING: [
    /\b(plan|outline|roadmap|strategy|breakdown|organize|prioritize|schedule)\b/i,
    /\b(phase|milestone|sprint|epic|story|backlog)\b/i,
  ],
  OTHER: [],
};

const INTEGRATION_KEYWORDS = [
  'integrate', 'distributed', 'microservice', 'cross', 'multi', 'complex',
  'scalable', 'enterprise', 'production', 'real-time', 'high availability',
  'fault tolerant', 'payment', 'authentication', 'authorization',
];

const EXPERT_KEYWORDS = [
  'zero-downtime', 'consensus', 'raft', 'paxos', 'byzantine', 'sharding',
  'partitioning', 'consistent hashing', 'cap theorem', 'eventual consistency',
  'distributed transaction', 'two-phase commit', 'saga pattern', 'cqrs',
  'event sourcing', 'blockchain', 'cryptography',
];

export function classifyDomains(text: string): KnowledgeDomain[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);
  const wordCount = words.length || 1;

  const scores: Partial<Record<KnowledgeDomain, number>> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [KnowledgeDomain, string[]][]) {
    if (domain === 'GENERAL' || keywords.length === 0) continue;

    let score = 0;
    for (const keyword of keywords) {
      if (keyword.includes(' ')) {
        if (lower.includes(keyword)) score += 2;
      } else {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lower)) {
          score += 1;
          // Density bonus: keyword count / word count
          const matches = lower.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
          if (matches && matches.length > 1) score += 0.5 * (matches.length - 1);
        }
      }
    }

    // Normalize by text length to get density
    const normalized = score / Math.sqrt(wordCount);
    if (normalized > 0) scores[domain] = normalized;
  }

  // Sort domains by score descending
  const sorted = (Object.entries(scores) as [KnowledgeDomain, number][])
    .sort(([, a], [, b]) => b - a);

  // Threshold: include domains with score >= 20% of top domain
  const topScore = sorted[0]?.[1] ?? 0;
  const threshold = topScore * 0.2;

  const domains = sorted
    .filter(([, score]) => score >= threshold && score > 0)
    .map(([domain]) => domain)
    .slice(0, 5); // cap at 5 domains

  return domains.length > 0 ? domains : ['GENERAL'];
}

export function detectTaskType(text: string): TaskType {
  const scores: Partial<Record<TaskType, number>> = {};

  for (const [type, patterns] of Object.entries(TASK_TYPE_PATTERNS) as [TaskType, RegExp[]][]) {
    if (type === 'OTHER') continue;
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score += 1;
    }
    if (score > 0) scores[type] = score;
  }

  const sorted = (Object.entries(scores) as [TaskType, number][])
    .sort(([, a], [, b]) => b - a);

  return sorted[0]?.[0] ?? 'OTHER';
}

export function assessComplexity(text: string, domains: KnowledgeDomain[]): ComplexityLevel {
  const lower = text.toLowerCase();
  let score = 0;

  // Domain count factor
  const nonGeneralDomains = domains.filter((d) => d !== 'GENERAL');
  score += nonGeneralDomains.length * 2;

  // Integration keywords
  for (const keyword of INTEGRATION_KEYWORDS) {
    if (lower.includes(keyword)) score += 2;
  }

  // Expert keywords
  for (const keyword of EXPERT_KEYWORDS) {
    if (lower.includes(keyword)) score += 4;
  }

  // Text length factor (longer descriptions usually indicate more complexity)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 50) score += 2;
  if (wordCount > 100) score += 2;

  // Specific complexity indicators
  if (/\b(multiple|several|various|many|different)\b/i.test(text)) score += 1;
  if (/\b(scale|performance|optimize|efficient)\b/i.test(text)) score += 2;
  if (/\b(simple|basic|quick|straightforward|easy)\b/i.test(text)) score -= 3;
  if (/\b(hello world|example|sample|demo|poc|prototype)\b/i.test(text)) score -= 2;

  if (score <= 2) return 'LOW';
  if (score <= 6) return 'MEDIUM';
  if (score <= 12) return 'HIGH';
  return 'EXPERT';
}
