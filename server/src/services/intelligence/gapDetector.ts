import type { TaskAnalysis, ScoredChunk, KnowledgeDomain } from '@agenttailor/shared';
import type { Gap, GapReport } from '@agenttailor/shared';

// Keywords per domain used for simple coverage matching
const DOMAIN_KEYWORDS: Record<KnowledgeDomain, string[]> = {
  FRONTEND: ['react', 'vue', 'angular', 'html', 'css', 'ui', 'component', 'dom', 'browser', 'typescript', 'javascript', 'vite', 'webpack', 'tailwind'],
  BACKEND: ['server', 'api', 'express', 'node', 'fastapi', 'django', 'flask', 'rest', 'graphql', 'endpoint', 'route', 'controller', 'middleware'],
  DATABASE: ['database', 'sql', 'postgres', 'mysql', 'mongodb', 'redis', 'query', 'schema', 'migration', 'orm', 'prisma', 'sequelize', 'index'],
  DEVOPS: ['docker', 'kubernetes', 'ci', 'cd', 'deploy', 'pipeline', 'aws', 'gcp', 'azure', 'terraform', 'nginx', 'helm', 'container'],
  SECURITY: ['auth', 'authentication', 'authorization', 'jwt', 'oauth', 'csrf', 'xss', 'https', 'encrypt', 'permission', 'role', 'token'],
  TESTING: ['test', 'spec', 'mock', 'stub', 'assert', 'jest', 'vitest', 'cypress', 'playwright', 'coverage', 'unit', 'integration', 'e2e'],
  DESIGN: ['design', 'ux', 'ui', 'figma', 'wireframe', 'prototype', 'color', 'typography', 'layout', 'accessibility', 'a11y', 'aria'],
  ARCHITECTURE: ['architecture', 'pattern', 'design pattern', 'microservice', 'monolith', 'event', 'domain', 'bounded context', 'aggregate', 'cqrs', 'saga'],
  DOCUMENTATION: ['documentation', 'readme', 'docs', 'comment', 'jsdoc', 'tsdoc', 'swagger', 'openapi', 'wiki', 'guide'],
  BUSINESS: ['business', 'product', 'requirement', 'user story', 'stakeholder', 'kpi', 'metric', 'revenue', 'cost', 'roadmap'],
  DATA_SCIENCE: ['data', 'model', 'ml', 'machine learning', 'neural', 'training', 'dataset', 'feature', 'prediction', 'classification', 'regression'],
  GENERAL: [],
};

const CODE_INDICATORS = ['```', 'function', 'class ', 'const ', 'import ', 'export ', 'return ', '=>', 'async ', 'await '];

const SHALLOW_COVERAGE_SCORE_THRESHOLD = 0.5;
const SHALLOW_COVERAGE_CHUNK_MINIMUM = 2;
const NO_CONTEXT_SCORE_THRESHOLD = 0.2;
const WEB_SEARCH_COVERAGE_THRESHOLD = 0.6;

export type GapDetectorConfig = {
  shallowScoreThreshold?: number;
  shallowChunkMinimum?: number;
};

function domainCoverageFor(
  domain: KnowledgeDomain,
  scoredChunks: ScoredChunk[],
): { covered: boolean; matchingChunks: ScoredChunk[] } {
  if (domain === 'GENERAL') {
    return { covered: scoredChunks.length > 0, matchingChunks: scoredChunks };
  }

  const keywords = DOMAIN_KEYWORDS[domain];
  const matchingChunks = scoredChunks.filter((chunk) => {
    const lower = chunk.content.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });

  return { covered: matchingChunks.length > 0, matchingChunks };
}

export function detectGaps(
  taskAnalysis: TaskAnalysis,
  scoredChunks: ScoredChunk[],
  config?: GapDetectorConfig,
): GapReport {
  const shallowScoreThreshold = config?.shallowScoreThreshold ?? SHALLOW_COVERAGE_SCORE_THRESHOLD;
  const shallowChunkMinimum = config?.shallowChunkMinimum ?? SHALLOW_COVERAGE_CHUNK_MINIMUM;

  const gaps: Gap[] = [];

  // d. Total failure: no chunks or all scores below threshold
  const allScoresLow =
    scoredChunks.length > 0 && scoredChunks.every((c) => c.finalScore < NO_CONTEXT_SCORE_THRESHOLD);

  if (scoredChunks.length === 0 || allScoresLow) {
    gaps.push({
      type: 'NO_CONTEXT',
      severity: 'CRITICAL',
      description:
        scoredChunks.length === 0
          ? 'No relevant chunks were retrieved for this task. The knowledge base may be empty or missing entirely.'
          : 'All retrieved chunks scored below the minimum relevance threshold. The available documents do not appear relevant to this task.',
      affectedDomains: taskAnalysis.domains,
      suggestedActions: ['web_search', 'upload_document'],
      suggestedQueries: taskAnalysis.suggestedSearchQueries,
    });

    return {
      gaps,
      overallCoverage: 0,
      isActionable: true,
      estimatedQualityWithoutFilling: 0.1,
      estimatedQualityWithFilling: 0.7,
    };
  }

  // Track coverage per domain for weighted average calculation
  const domainCoverageScores: number[] = [];

  for (const domain of taskAnalysis.domains) {
    const { covered, matchingChunks } = domainCoverageFor(domain, scoredChunks);

    // a. Coverage analysis: missing domain
    if (!covered) {
      gaps.push({
        type: 'MISSING_DOMAIN',
        severity: 'HIGH',
        description: `No chunks found covering the ${domain} domain. This topic is required for the task but absent from the knowledge base.`,
        affectedDomains: [domain],
        suggestedActions: ['web_search', 'upload_document'],
        suggestedQueries: [
          `${domain.toLowerCase()} ${taskAnalysis.keyEntities.slice(0, 2).join(' ')}`.trim(),
          ...taskAnalysis.suggestedSearchQueries.slice(0, 1),
        ],
      });
      domainCoverageScores.push(0);
      continue;
    }

    // b. Depth analysis: shallow coverage
    const topChunk = matchingChunks.sort((a, b) => b.finalScore - a.finalScore)[0];
    const topScore = topChunk?.finalScore ?? 0;
    const isShallow = topScore < shallowScoreThreshold || matchingChunks.length < shallowChunkMinimum;

    if (isShallow) {
      gaps.push({
        type: 'SHALLOW_COVERAGE',
        severity: topScore < shallowScoreThreshold * 0.6 ? 'MEDIUM' : 'LOW',
        description:
          `Coverage for the ${domain} domain is shallow: top score is ${topScore.toFixed(2)} ` +
          `(threshold: ${shallowScoreThreshold}) with ${matchingChunks.length} matching chunk(s) ` +
          `(minimum: ${shallowChunkMinimum}). More detailed documents may improve response quality.`,
        affectedDomains: [domain],
        suggestedActions: ['upload_document', 'web_search'],
        suggestedQueries: [
          `${domain.toLowerCase()} detailed guide ${taskAnalysis.keyEntities.slice(0, 2).join(' ')}`.trim(),
        ],
      });
      // Partial coverage score
      const depthScore = Math.min(topScore / shallowScoreThreshold, 1) * 0.6;
      domainCoverageScores.push(depthScore);
    } else {
      // Good coverage
      const coverageScore = Math.min(topScore, 1);
      domainCoverageScores.push(coverageScore);
    }
  }

  // c. Example detection: CODING / DEBUGGING tasks need code chunks
  if (taskAnalysis.taskType === 'CODING' || taskAnalysis.taskType === 'DEBUGGING') {
    const hasCodeChunks = scoredChunks.some((chunk) =>
      CODE_INDICATORS.some((indicator) => chunk.content.includes(indicator)),
    );

    if (!hasCodeChunks) {
      gaps.push({
        type: 'MISSING_EXAMPLES',
        severity: 'MEDIUM',
        description:
          `The task type is ${taskAnalysis.taskType} but no code examples were found in retrieved chunks. ` +
          'Code snippets and working examples would significantly improve the response quality.',
        affectedDomains: taskAnalysis.domains.filter((d) =>
          ['FRONTEND', 'BACKEND', 'TESTING'].includes(d),
        ),
        suggestedActions: ['web_search', 'upload_document'],
        suggestedQueries: [
          `${taskAnalysis.keyEntities.slice(0, 3).join(' ')} code example`.trim(),
          `${taskAnalysis.keyEntities[0] ?? ''} implementation example`.trim(),
        ].filter(Boolean),
      });
    }
  }

  // e. Calculate overallCoverage as weighted average of domain coverages
  const overallCoverage =
    domainCoverageScores.length > 0
      ? domainCoverageScores.reduce((sum, s) => sum + s, 0) / domainCoverageScores.length
      : 0;

  // f. isActionable = any HIGH or CRITICAL gaps
  const isActionable = gaps.some((g) => g.severity === 'HIGH' || g.severity === 'CRITICAL');

  // g–h. Estimate quality scores
  const criticalGapCount = gaps.filter((g) => g.severity === 'CRITICAL').length;
  const highGapCount = gaps.filter((g) => g.severity === 'HIGH').length;
  const qualityPenalty = criticalGapCount * 0.3 + highGapCount * 0.15;

  const estimatedQualityWithoutFilling = Math.max(0, overallCoverage - qualityPenalty);
  const fillGain = gaps.length > 0 ? Math.min(0.4, gaps.length * 0.1) : 0;
  const estimatedQualityWithFilling = Math.min(1, estimatedQualityWithoutFilling + fillGain);

  return {
    gaps,
    overallCoverage,
    isActionable,
    estimatedQualityWithoutFilling,
    estimatedQualityWithFilling,
  };
}

export function shouldTriggerWebSearch(gapReport: GapReport): boolean {
  if (gapReport.overallCoverage < WEB_SEARCH_COVERAGE_THRESHOLD) {
    return true;
  }
  if (gapReport.gaps.some((g) => g.severity === 'CRITICAL')) {
    return true;
  }
  return false;
}

export function generateSearchQueries(gaps: Gap[]): string[] {
  const queries = new Set<string>();
  for (const gap of gaps) {
    if (gap.severity === 'CRITICAL' || gap.severity === 'HIGH') {
      for (const q of gap.suggestedQueries) {
        queries.add(q);
      }
    }
  }
  return Array.from(queries).slice(0, 5); // max 5 queries
}

export function generateUserPrompt(gapReport: GapReport): string {
  if (gapReport.gaps.length === 0) {
    return 'Your knowledge base provides good coverage for this task. No additional information is needed.';
  }

  const lines: string[] = [];

  lines.push(
    `Knowledge base coverage: ${Math.round(gapReport.overallCoverage * 100)}% ` +
      `(estimated response quality: ${Math.round(gapReport.estimatedQualityWithoutFilling * 100)}%).`,
  );

  lines.push('');

  const critical = gapReport.gaps.filter((g) => g.severity === 'CRITICAL');
  const high = gapReport.gaps.filter((g) => g.severity === 'HIGH');
  const other = gapReport.gaps.filter((g) => g.severity !== 'CRITICAL' && g.severity !== 'HIGH');

  if (critical.length > 0) {
    lines.push('Critical issues found:');
    for (const gap of critical) {
      lines.push(`  - ${gap.description}`);
    }
  }

  if (high.length > 0) {
    lines.push('High-priority gaps:');
    for (const gap of high) {
      lines.push(`  - ${gap.description}`);
    }
  }

  if (other.length > 0) {
    lines.push('Additional gaps:');
    for (const gap of other) {
      lines.push(`  - ${gap.description}`);
    }
  }

  lines.push('');

  const webSearchGaps = gapReport.gaps.filter((g) => g.suggestedActions.includes('web_search'));
  const uploadGaps = gapReport.gaps.filter((g) => g.suggestedActions.includes('upload_document'));
  const askGaps = gapReport.gaps.filter((g) => g.suggestedActions.includes('ask_user'));

  lines.push('Recommended actions:');

  if (webSearchGaps.length > 0) {
    lines.push('  - A web search will be performed automatically to fill the gaps.');
  }

  if (uploadGaps.length > 0) {
    lines.push(
      `  - Consider uploading additional documents covering: ${uploadGaps
        .flatMap((g) => g.affectedDomains)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(', ')}.`,
    );
  }

  if (askGaps.length > 0) {
    lines.push('  - Providing more details about your task would improve the response.');
  }

  lines.push('');
  lines.push(
    `Filling these gaps could improve response quality to approximately ${Math.round(gapReport.estimatedQualityWithFilling * 100)}%.`,
  );

  return lines.join('\n');
}
