/**
 * Analytics data aggregation service.
 * Provides time-series, project stats, plan usage, and summary data.
 */
import { prisma } from '../lib/prisma.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DailySessionCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface DailyQualityStats {
  date: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
}

export interface ProjectStat {
  projectId: string;
  projectName: string;
  sessionCount: number;
  avgQuality: number;
  documentCount: number;
}

export interface PlanUsageInfo {
  used: number;
  limit: number;
  planTier: string;
  periodStart: string;
  periodEnd: string;
  percentUsed: number;
}

export interface SummaryStats {
  totalSessions: number;
  totalDocuments: number;
  avgQualityAllTime: number;
  activeProjects: number;
}

// ── Plan limits (mirrored from shared, kept local to avoid import dep) ──────

const PLAN_DAILY_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 500,
  TEAM: 2000,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function todayUTCStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function tomorrowUTCStart(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── Service functions ────────────────────────────────────────────────────────

export async function getSessionsOverTime(
  userId: string,
  days: number,
): Promise<DailySessionCount[]> {
  const since = daysAgoDate(days);

  const sessions = await prisma.tailoringSession.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const date = s.createdAt.toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  // Fill gaps with zeros
  const result: DailySessionCount[] = [];
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    const date = cursor.toISOString().slice(0, 10);
    result.push({ date, count: counts.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export async function getQualityTrend(
  userId: string,
  days: number,
): Promise<DailyQualityStats[]> {
  const since = daysAgoDate(days);

  const sessions = await prisma.tailoringSession.findMany({
    where: { userId, createdAt: { gte: since }, qualityScore: { not: null } },
    select: { createdAt: true, qualityScore: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const groups = new Map<string, number[]>();
  for (const s of sessions) {
    const date = s.createdAt.toISOString().slice(0, 10);
    const scores = groups.get(date) ?? [];
    scores.push((s.qualityScore ?? 0) * 100); // Convert 0-1 to 0-100
    groups.set(date, scores);
  }

  // Fill gaps
  const result: DailyQualityStats[] = [];
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    const date = cursor.toISOString().slice(0, 10);
    const scores = groups.get(date);
    if (scores && scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      result.push({
        date,
        avgScore: Math.round(avg * 10) / 10,
        minScore: Math.round(Math.min(...scores) * 10) / 10,
        maxScore: Math.round(Math.max(...scores) * 10) / 10,
      });
    } else {
      result.push({ date, avgScore: 0, minScore: 0, maxScore: 0 });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export async function getProjectStats(userId: string): Promise<ProjectStat[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      _count: { select: { documents: true, tailoringSessions: true } },
      tailoringSessions: {
        select: { qualityScore: true },
        where: { qualityScore: { not: null } },
      },
    },
  });

  return projects.map((p) => {
    const scores = p.tailoringSessions
      .map((s) => s.qualityScore ?? 0)
      .filter((s) => s > 0);
    const avg = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      sessionCount: p._count.tailoringSessions,
      avgQuality: Math.round(avg * 100),
      documentCount: p._count.documents,
    };
  });
}

export async function getPlanUsage(userId: string): Promise<PlanUsageInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const tier = user?.plan ?? 'FREE';
  const limit = PLAN_DAILY_LIMITS[tier] ?? 50;

  const periodStart = todayUTCStart();
  const periodEnd = tomorrowUTCStart();

  const used = await prisma.tailoringSession.count({
    where: {
      userId,
      createdAt: { gte: periodStart, lt: periodEnd },
    },
  });

  return {
    used,
    limit,
    planTier: tier,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
  };
}

export async function getSummaryStats(userId: string): Promise<SummaryStats> {
  const [totalSessions, totalDocuments, activeProjects, qualityAgg] = await Promise.all([
    prisma.tailoringSession.count({ where: { userId } }),
    prisma.document.count({
      where: { project: { userId } },
    }),
    prisma.project.count({ where: { userId } }),
    prisma.tailoringSession.aggregate({
      where: { userId, qualityScore: { not: null } },
      _avg: { qualityScore: true },
    }),
  ]);

  return {
    totalSessions,
    totalDocuments,
    avgQualityAllTime: Math.round((qualityAgg._avg.qualityScore ?? 0) * 100),
    activeProjects,
  };
}
