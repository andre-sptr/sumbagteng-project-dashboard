import { db } from './db';

export interface KPIStats {
  totalProjects: number;
  completedProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  slaComplianceRate: number;
  totalBoqValue: number;
  avgCompletionPercentage: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface DurationStat {
  status: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
}

export interface TrendData {
  period: string;
  created: number;
  completed: number;
}

interface ProjectAnalyticsRow {
  status: string;
  golive_target: string | null;
  golive_actual: string | null;
}

interface HistoryStatusEntry {
  status?: string;
  timestamp?: string;
}

export class AnalyticsService {
  /**
   * Get high-level KPI overview
   */
  static async getKPIs(): Promise<KPIStats> {
    const projects = db.prepare('SELECT status, golive_target, golive_actual FROM projects').all() as ProjectAnalyticsRow[];

    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'DONE' || p.status === 'GOLIVE').length;
    const { total: totalBoqValue } = db.prepare(
      'SELECT COALESCE(SUM(total), 0) AS total FROM boq_ut_items'
    ).get() as { total: number };
    const avgCompletionPercentage = 0;

    // SLA Compliance: Actual <= Target for completed projects
    const completedWithDates = projects.filter(
      (p): p is ProjectAnalyticsRow & { golive_actual: string; golive_target: string } =>
        Boolean(p.golive_actual && p.golive_target)
    );
    const compliantCount = completedWithDates.filter(p => new Date(p.golive_actual) <= new Date(p.golive_target)).length;
    const slaComplianceRate = completedWithDates.length > 0 ? (compliantCount / completedWithDates.length) * 100 : 0;

    // Simple At-Risk logic: Completion < 50% and Target Date passed or near
    const now = new Date();
    const nearFuture = new Date();
    nearFuture.setDate(now.getDate() + 7);

    const atRiskProjects = projects.filter(p => {
      if (p.status === 'DONE' || p.status === 'GOLIVE') return false;
      if (!p.golive_target) return false;
      return new Date(p.golive_target) < nearFuture;
    }).length;

    const onTrackProjects = totalProjects - atRiskProjects - completedProjects;

    return {
      totalProjects,
      completedProjects,
      onTrackProjects,
      atRiskProjects,
      slaComplianceRate,
      totalBoqValue,
      avgCompletionPercentage
    };
  }

  /**
   * Get status distribution for pie charts
   */
  static async getStatusDistribution(): Promise<StatusDistribution[]> {
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM projects 
      GROUP BY status 
      ORDER BY count DESC
    `).all() as { status: string, count: number }[];

    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return rows.map(r => ({
      status: r.status,
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0
    }));
  }

  /**
   * Calculate average duration in each status based on history
   */
  static async getDurationStats(): Promise<DurationStat[]> {
    const projects = db.prepare('SELECT history FROM projects WHERE history IS NOT NULL').all() as { history: string }[];
    
    const statusDurations: Record<string, number[]> = {};

    projects.forEach(p => {
      try {
        const history = JSON.parse(p.history) as unknown;
        if (!Array.isArray(history) || history.length < 2) return;

        for (let i = 0; i < history.length - 1; i++) {
          const current = history[i] as HistoryStatusEntry;
          const next = history[i + 1] as HistoryStatusEntry;
          
          if (current.status && current.timestamp && next.timestamp) {
            const duration = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            if (duration >= 0) {
              if (!statusDurations[current.status]) statusDurations[current.status] = [];
              statusDurations[current.status].push(duration);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    return Object.entries(statusDurations).map(([status, durations]) => ({
      status,
      avgDays: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDays: Math.min(...durations),
      maxDays: Math.max(...durations)
    })).sort((a, b) => b.avgDays - a.avgDays);
  }

  /**
   * Get monthly trends for the last 6 months
   */
  static async getTrendData(): Promise<TrendData[]> {
    // This is a simplified trend based on last_changed_at or similar
    // In a real app, we might want a separate 'events' table for better accuracy
    const projects = db.prepare(`
      SELECT 
        strftime('%Y-%m', last_changed_at) as month,
        status,
        COUNT(*) as count
      FROM projects
      WHERE last_changed_at >= date('now', '-6 months')
      GROUP BY month, status
    `).all() as { month: string, status: string, count: number }[];

    const months: Record<string, TrendData> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().substring(0, 7);
      months[m] = { period: m, created: 0, completed: 0 };
    }

    projects.forEach(p => {
      if (months[p.month]) {
        if (p.status === 'DONE' || p.status === 'GOLIVE') {
          months[p.month].completed += p.count;
        } else {
          // Approximation for 'created' or 'in progress'
          months[p.month].created += p.count;
        }
      }
    });

    return Object.values(months);
  }

  /**
   * Simple linear forecasting for completion
   */
  static async getPredictiveInsights() {
    const kpis = await this.getKPIs();
    const trend = await this.getTrendData();
    
    const avgCompletionRate = trend.reduce((sum, t) => sum + t.completed, 0) / trend.length;
    const remainingProjects = kpis.totalProjects - kpis.completedProjects;
    
    const estimatedMonthsToFinish = avgCompletionRate > 0 
      ? remainingProjects / avgCompletionRate 
      : Infinity;

    return {
      avgMonthlyCompletion: avgCompletionRate.toFixed(1),
      remainingProjects,
      estimatedMonthsToFinish: estimatedMonthsToFinish === Infinity ? 'N/A' : estimatedMonthsToFinish.toFixed(1),
      confidenceScore: trend.length >= 3 ? 0.7 : 0.4
    };
  }
}
