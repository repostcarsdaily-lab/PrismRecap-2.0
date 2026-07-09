import { describe, expect, it } from 'vitest';
import { summarizeAnalytics } from './analytics';

describe('summarizeAnalytics', () => {
  it('computes real KPIs from collections', () => {
    const result = summarizeAnalytics({
      referenceDate: new Date('2026-07-04T12:00:00.000Z'),
      meetings: [
        { id: '1', createdAt: '2026-07-01T10:00:00.000Z', duration: 45, processingTime: 20, aiProcessed: true, summary: 'ok', actionItems: ['a'] },
        { id: '2', createdAt: '2026-06-20T10:00:00.000Z', duration: 30, processingTime: 12 },
      ],
      tasks: [
        { id: '1', status: 'Done', department: 'Product' },
        { id: '2', status: 'In Progress', department: 'Product', dueDate: '2026-06-01T00:00:00.000Z' },
      ],
      emailHistory: [{ id: 'a', createdAt: '2026-07-02T00:00:00.000Z' }],
      messages: [{ id: 'm1', sentAt: '2026-07-02T00:00:00.000Z' }],
      users: [{ id: 'u1', name: 'Ava', department: 'Product' }],
    });

    expect(result.kpis.totalMeetings).toBe(2);
    expect(result.kpis.meetingsProcessedThisWeek).toBe(1);
    expect(result.kpis.totalActionItems).toBe(2);
    expect(result.kpis.completedTasks).toBe(1);
    expect(result.kpis.pendingTasks).toBe(1);
    expect(result.kpis.overdueTasks).toBe(1);
    expect(result.kpis.productivityScore).toBe(50);
    expect(result.kpis.averageMeetingDuration).toBe(38);
    expect(result.kpis.aiUsageStatistics).toBe(1);
    expect(result.kpis.emailsSent).toBe(1);
    expect(result.kpis.chatActivity).toBe(1);
    expect(result.kpis.activeUsers).toBe(1);
  });
});
