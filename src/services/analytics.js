const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  if (value?.toDate) return value.toDate();
  return null;
};

export function summarizeAnalytics({ meetings = [], tasks = [], emailHistory = [], messages = [], users = [], referenceDate = new Date() }) {
  const now = toDateValue(referenceDate) || new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const meetingsThisWeek = meetings.filter((meeting) => {
    const createdAt = toDateValue(meeting.createdAt);
    return createdAt && createdAt >= weekStart;
  });

  const meetingsThisMonth = meetings.filter((meeting) => {
    const createdAt = toDateValue(meeting.createdAt);
    return createdAt && createdAt >= startOfMonth;
  });

  const completedTasks = tasks.filter((task) => task.status === 'Done' || task.status === 'Completed' || task.status === 'Complete');
  const pendingTasks = tasks.filter((task) => !['Done', 'Completed', 'Complete'].includes(task.status));
  const overdueTasks = tasks.filter((task) => {
    if (['Done', 'Completed', 'Complete'].includes(task.status)) return false;
    if (!task.dueDate) return false;
    const dueDate = toDateValue(task.dueDate);
    return dueDate && Number.isFinite(dueDate.getTime()) && dueDate < now;
  });

  const totalDuration = meetings.reduce((sum, meeting) => sum + Number(meeting.duration || 0), 0);
  const avgMeetingDuration = meetings.length ? Math.round(totalDuration / meetings.length) : 0;

  const processingDurations = meetings
    .filter((meeting) => Number.isFinite(Number(meeting.processingTime)))
    .map((meeting) => Number(meeting.processingTime));
  const averageProcessingTime = processingDurations.length
    ? Math.round(processingDurations.reduce((sum, value) => sum + value, 0) / processingDurations.length)
    : 0;

  const aiUsageStats = meetings.filter((meeting) => meeting.aiProcessed || meeting.aiUsed || meeting.summary || meeting.actionItems?.length);
  const productivityScore = meetings.length ? Math.round((completedTasks.length / Math.max(tasks.length, 1)) * 100) : 0;

  const meetingsPerDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const count = meetings.filter((meeting) => {
      const createdAt = toDateValue(meeting.createdAt);
      return createdAt && createdAt.toISOString().slice(0, 10) === key;
    }).length;
    return { label: date.toLocaleDateString('en', { weekday: 'short' }), value: count };
  });

  const meetingsPerMonth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('en', { month: 'short' });
    const count = meetings.filter((meeting) => {
      const meetingDate = toDateValue(meeting.createdAt);
      return meetingDate && meetingDate.getFullYear() === date.getFullYear() && meetingDate.getMonth() === date.getMonth();
    }).length;
    return { label, value: count };
  });

  const taskOverTime = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('en', { month: 'short' });
    const count = tasks.filter((task) => {
      const taskDate = toDateValue(task.completedAt);
      return taskDate && taskDate.getFullYear() === date.getFullYear() && taskDate.getMonth() === date.getMonth();
    }).length;
    return { label, value: count };
  });

  const departmentProductivity = Array.from(new Set((users || []).map((user) => user.department).filter(Boolean))).map((department) => {
    const departmentTasks = tasks.filter((task) => task.department === department);
    const completed = departmentTasks.filter((task) => ['Done', 'Completed', 'Complete'].includes(task.status)).length;
    const value = departmentTasks.length ? Math.round((completed / departmentTasks.length) * 100) : 0;
    return { label: department, value };
  });

  const aiUsageSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('en', { month: 'short' });
    const count = meetings.filter((meeting) => {
      const meetingDate = toDateValue(meeting.createdAt);
      return meetingDate && meetingDate.getFullYear() === date.getFullYear() && meetingDate.getMonth() === date.getMonth() && (meeting.aiProcessed || meeting.summary);
    }).length;
    return { label, value: count };
  });

  const emailActivity = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('en', { month: 'short' });
    const count = emailHistory.filter((entry) => {
      const sentDate = toDateValue(entry.createdAt);
      return sentDate && sentDate.getFullYear() === date.getFullYear() && sentDate.getMonth() === date.getMonth();
    }).length;
    return { label, value: count };
  });

  const chatActivity = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('en', { month: 'short' });
    const count = messages.filter((message) => {
      const messageDate = toDateValue(message.sentAt);
      return messageDate && messageDate.getFullYear() === date.getFullYear() && messageDate.getMonth() === date.getMonth();
    }).length;
    return { label, value: count };
  });

  return {
    kpis: {
      totalMeetings: meetings.length,
      meetingsProcessedThisWeek: meetingsThisWeek.length,
      meetingsProcessedThisMonth: meetingsThisMonth.length,
      totalActionItems: tasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      productivityScore,
      averageMeetingDuration: avgMeetingDuration,
      averageProcessingTime: averageProcessingTime,
      aiUsageStatistics: aiUsageStats.length,
      emailsSent: emailHistory.length,
      chatActivity: messages.length,
      activeUsers: users.length,
    },
    charts: {
      meetingsPerDay,
      meetingsPerMonth,
      tasksCompletedOverTime: taskOverTime,
      departmentProductivity,
      aiUsage: aiUsageSeries,
      emailActivity,
      chatActivity,
    },
    filters: {
      departments: Array.from(new Set((users || []).map((user) => user.department).filter(Boolean))),
      users: users.map((user) => ({ id: user.id, label: user.name || user.email || user.id })),
      meetings: meetings.map((meeting) => ({ id: meeting.id, label: meeting.title || `Meeting ${meeting.id}` })),
    },
  };
}
