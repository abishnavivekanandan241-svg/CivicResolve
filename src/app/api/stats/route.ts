import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrTranslateEntityFields } from '@/lib/translation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = (searchParams.get('lang') || 'en').toLowerCase().trim();
    const issues = await prisma.issue.findMany({
      select: {
        id: true,
        status: true,
        priority: true,
        priorityScore: true,
        category: true,
        department: true,
        ward: true,
        createdAt: true,
        resolvedAt: true,
        slaDueAt: true,
      },
    });

    const now = new Date();
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter((i) => i.status === 'RESOLVED');
    const inProgressIssues = issues.filter((i) => i.status === 'IN_PROGRESS');
    const reportedIssues = issues.filter((i) => i.status === 'REPORTED');
    const criticalIssues = issues.filter((i) => i.priority === 'CRITICAL' && i.status !== 'RESOLVED');
    const slaBreachedIssues = issues.filter(
      (i) => i.status !== 'RESOLVED' && i.slaDueAt && new Date(i.slaDueAt) < now
    );

    const resolvedPercentage = totalIssues > 0 ? Math.round((resolvedIssues.length / totalIssues) * 100) : 0;

    // Calculate Average Resolution Hours for resolved issues
    let totalResolutionHours = 0;
    let resolvedWithDatesCount = 0;
    resolvedIssues.forEach((i) => {
      if (i.resolvedAt && i.createdAt) {
        const diffMs = new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime();
        totalResolutionHours += Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
        resolvedWithDatesCount++;
      }
    });
    const avgResolutionHours = resolvedWithDatesCount > 0 ? Math.round(totalResolutionHours / resolvedWithDatesCount) : 18;

    // Group by Category
    const categoryMap = new Map<string, number>();
    issues.forEach((i) => {
      categoryMap.set(i.category, (categoryMap.get(i.category) || 0) + 1);
    });
    const categoryStats = Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    // Group by Department
    const departmentMap = new Map<string, { total: number; resolved: number }>();
    issues.forEach((i) => {
      const current = departmentMap.get(i.department) || { total: 0, resolved: 0 };
      current.total++;
      if (i.status === 'RESOLVED') current.resolved++;
      departmentMap.set(i.department, current);
    });
    const departmentStats = Array.from(departmentMap.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      resolved: data.resolved,
      pending: data.total - data.resolved,
    }));

    // Ward Leaderboard
    const wardMap = new Map<string, { total: number; resolved: number; inProgress: number; reported: number; resolutionHours: number[] }>();
    issues.forEach((i) => {
      const current = wardMap.get(i.ward) || {
        total: 0,
        resolved: 0,
        inProgress: 0,
        reported: 0,
        resolutionHours: [],
      };
      current.total++;
      if (i.status === 'RESOLVED') {
        current.resolved++;
        if (i.resolvedAt && i.createdAt) {
          const diff = (new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60);
          current.resolutionHours.push(diff);
        }
      } else if (i.status === 'IN_PROGRESS') {
        current.inProgress++;
      } else {
        current.reported++;
      }
      wardMap.set(i.ward, current);
    });

    const wardLeaderboard = Array.from(wardMap.entries()).map(([ward, data]) => {
      const resolutionRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
      const avgHours = data.resolutionHours.length > 0
        ? Math.round(data.resolutionHours.reduce((a, b) => a + b, 0) / data.resolutionHours.length)
        : 24;
      return {
        ward,
        total: data.total,
        resolved: data.resolved,
        inProgress: data.inProgress,
        reported: data.reported,
        resolutionRate,
        avgResolutionHours: avgHours,
      };
    }).sort((a, b) => b.resolutionRate - a.resolutionRate);

    // Priority Distribution
    const priorityStats = [
      { priority: 'CRITICAL', count: issues.filter((i) => i.priority === 'CRITICAL').length },
      { priority: 'HIGH', count: issues.filter((i) => i.priority === 'HIGH').length },
      { priority: 'MEDIUM', count: issues.filter((i) => i.priority === 'MEDIUM').length },
      { priority: 'LOW', count: issues.filter((i) => i.priority === 'LOW').length },
    ];

    // Translate names if target language is not English
    let finalCategoryStats = categoryStats;
    let finalDepartmentStats = departmentStats;
    let finalWardLeaderboard = wardLeaderboard;

    if (lang !== 'en') {
      const transPayload: Record<string, string> = {};
      categoryStats.forEach((c, idx) => {
        transPayload[`cat_${idx}`] = c.name;
      });
      departmentStats.forEach((d, idx) => {
        transPayload[`dept_${idx}`] = d.name;
      });
      wardLeaderboard.forEach((w, idx) => {
        transPayload[`ward_${idx}`] = w.ward;
      });

      const translated = await getOrTranslateEntityFields({
        entityType: 'StatsMetadata',
        entityId: 'global',
        fields: transPayload,
        targetLang: lang,
      });

      finalCategoryStats = categoryStats.map((c, idx) => ({
        ...c,
        name: translated[`cat_${idx}`] || c.name,
      }));

      finalDepartmentStats = departmentStats.map((d, idx) => ({
        ...d,
        name: translated[`dept_${idx}`] || d.name,
      }));

      finalWardLeaderboard = wardLeaderboard.map((w, idx) => ({
        ...w,
        ward: translated[`ward_${idx}`] || w.ward,
      }));
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalIssues,
        resolvedCount: resolvedIssues.length,
        inProgressCount: inProgressIssues.length,
        reportedCount: reportedIssues.length,
        criticalCount: criticalIssues.length,
        slaBreachedCount: slaBreachedIssues.length,
        resolvedPercentage,
        avgResolutionHours,
        categoryStats: finalCategoryStats,
        departmentStats: finalDepartmentStats,
        wardLeaderboard: finalWardLeaderboard,
        priorityStats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}

