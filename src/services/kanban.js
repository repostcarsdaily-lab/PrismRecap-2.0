export function createTaskFromGroqAction(action, meetingId, profile) {
  return {
    title: action.title || action || 'New Action Item',
    description: action.description || 'Created from meeting processing',
    priority: action.priority || 'Medium',
    status: 'To Do',
    department: action.department || profile?.department || 'Product',
    assignee: action.assignee || profile?.name || 'Unassigned',
    dueDate: action.deadline || '',
    labels: (action.labels || []).join(', '),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
    activity: [{ type: 'created', detail: 'Created from Groq meeting result', timestamp: new Date().toISOString() }],
    attachments: [],
    meetingId,
  };
}
