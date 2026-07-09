function MeetingHistoryCard({ meeting, onOpen, onTogglePin, onArchive, onDelete, onDuplicate, onExport }) {
  const statusText = meeting.archived ? 'Archived' : meeting.status || 'Active';

  return (
    <article className="meeting-card">
      <div className="meeting-card-header">
        <div>
          <p className="eyebrow">{meeting.department || 'Operations'}</p>
          <h3>{meeting.title || 'Untitled Meeting'}</h3>
        </div>
        <div className="meeting-card-badges">
          {meeting.pinned ? <span className="tag">Pinned</span> : null}
          <span className="tag">{statusText}</span>
        </div>
      </div>

      <div className="meeting-card-body">
        <p>{meeting.executiveSummary || 'No summary available yet.'}</p>
        <div className="meeting-card-meta">
          <span>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : 'No timestamp'}</span>
          <span>{meeting.participants?.join(', ') || 'Team'}</span>
        </div>
        <div className="meeting-card-meta">
          <span>{meeting.linkedKanbanTasks?.length || 0} linked tasks</span>
          <span>{meeting.actionItems?.length || 0} action items</span>
        </div>
      </div>

      <div className="task-actions meeting-actions">
        <button className="ghost-btn small" type="button" onClick={() => onOpen(meeting)}>Open</button>
        <button className="ghost-btn small" type="button" onClick={() => onTogglePin(meeting)}>{meeting.pinned ? 'Unpin' : 'Pin'}</button>
        <button className="ghost-btn small" type="button" onClick={() => onArchive(meeting)}>{meeting.archived ? 'Restore' : 'Archive'}</button>
        <button className="ghost-btn small" type="button" onClick={() => onDuplicate(meeting)}>Duplicate</button>
        <button className="ghost-btn small" type="button" onClick={() => onDelete(meeting)}>Delete</button>
      </div>
      <div className="task-actions meeting-actions">
        <button className="secondary-btn small" type="button" onClick={() => onExport(meeting, 'txt')}>TXT</button>
        <button className="secondary-btn small" type="button" onClick={() => onExport(meeting, 'docx')}>DOCX</button>
        <button className="secondary-btn small" type="button" onClick={() => onExport(meeting, 'pdf')}>PDF</button>
      </div>
    </article>
  );
}

export default MeetingHistoryCard;
