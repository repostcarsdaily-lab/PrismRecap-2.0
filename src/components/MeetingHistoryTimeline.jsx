function MeetingHistoryTimeline({ meetings, onOpen }) {
  return (
    <div className="timeline-shell">
      {meetings.map((meeting) => (
        <article key={meeting.id} className="timeline-item" onClick={() => onOpen(meeting)}>
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-header">
              <h3>{meeting.title || 'Untitled Meeting'}</h3>
              <span>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : 'No timestamp'}</span>
            </div>
            <p>{meeting.executiveSummary || 'No summary available yet.'}</p>
            <div className="meeting-card-meta">
              <span>{meeting.department || 'Product'}</span>
              <span>{meeting.participants?.join(', ') || 'Team'}</span>
              <span>{meeting.linkedKanbanTasks?.length || 0} linked tasks</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default MeetingHistoryTimeline;
