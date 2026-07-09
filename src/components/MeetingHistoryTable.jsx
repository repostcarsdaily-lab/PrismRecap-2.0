function MeetingHistoryTable({ meetings, onOpen, onTogglePin, onArchive, onDelete, onDuplicate, onExport }) {
  return (
    <div className="table-shell">
      <table className="meeting-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Date</th>
            <th>Department</th>
            <th>Participants</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => (
            <tr key={meeting.id}>
              <td>
                <strong>{meeting.title || 'Untitled Meeting'}</strong>
                <div className="table-subtext">{meeting.executiveSummary?.slice(0, 70) || 'No summary'}</div>
              </td>
              <td>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : '—'}</td>
              <td>{meeting.department || 'Product'}</td>
              <td>{meeting.participants?.join(', ') || 'Team'}</td>
              <td>{meeting.archived ? 'Archived' : meeting.status || 'Active'}</td>
              <td>
                <div className="table-actions">
                  <button className="ghost-btn small" type="button" onClick={() => onOpen(meeting)}>Open</button>
                  <button className="ghost-btn small" type="button" onClick={() => onTogglePin(meeting)}>{meeting.pinned ? 'Unpin' : 'Pin'}</button>
                  <button className="ghost-btn small" type="button" onClick={() => onArchive(meeting)}>{meeting.archived ? 'Restore' : 'Archive'}</button>
                  <button className="ghost-btn small" type="button" onClick={() => onDelete(meeting)}>Delete</button>
                  <button className="ghost-btn small" type="button" onClick={() => onDuplicate(meeting)}>Copy</button>
                  <button className="secondary-btn small" type="button" onClick={() => onExport(meeting, 'txt')}>Export</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MeetingHistoryTable;
