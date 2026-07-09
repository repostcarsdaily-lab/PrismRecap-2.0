import { useEffect, useState } from 'react';

function MeetingDetailModal({ meeting, onClose, onExport, onUpdateTitle, onTogglePin, onArchive, onDelete, onDuplicate, onOpenTask }) {
  const [draftTitle, setDraftTitle] = useState(meeting?.title || '');

  useEffect(() => {
    setDraftTitle(meeting?.title || '');
  }, [meeting]);

  if (!meeting) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card meeting-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Meeting details</p>
            <h3>{meeting.title || 'Untitled Meeting'}</h3>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn small" type="button" onClick={() => onTogglePin(meeting)}>{meeting.pinned ? 'Unpin' : 'Pin'}</button>
            <button className="ghost-btn small" type="button" onClick={() => onArchive(meeting)}>{meeting.archived ? 'Restore' : 'Archive'}</button>
            <button className="ghost-btn small" type="button" onClick={() => onDelete(meeting)}>Delete</button>
            <button className="ghost-btn small" type="button" onClick={() => onDuplicate(meeting)}>Duplicate</button>
          </div>
        </div>

        <div className="meeting-detail-grid">
          <label className="meeting-field">
            <span>Meeting title</span>
            <input className="input-field" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          </label>
          <button className="primary-btn" type="button" onClick={() => onUpdateTitle(meeting, draftTitle)}>Save title</button>
        </div>

        <div className="meeting-detail-grid">
          <div className="meeting-field">
            <span>Date & time</span>
            <strong>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : 'Not recorded'}</strong>
          </div>
          <div className="meeting-field">
            <span>Department</span>
            <strong>{meeting.department || 'Product'}</strong>
          </div>
          <div className="meeting-field">
            <span>Participants</span>
            <strong>{meeting.participants?.join(', ') || 'Team'}</strong>
          </div>
          <div className="meeting-field">
            <span>Status</span>
            <strong>{meeting.archived ? 'Archived' : meeting.status || 'Active'}</strong>
          </div>
        </div>

        <div className="content-grid">
          <article className="panel">
            <div className="panel-header"><h3>Executive Summary</h3></div>
            <p>{meeting.executiveSummary || 'No summary captured.'}</p>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Key Highlights</h3></div>
            <ul className="item-list">{(meeting.keyHighlights || []).map((item) => <li key={item}><span>{item}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Decisions</h3></div>
            <ul className="item-list">{(meeting.decisions || []).map((item) => <li key={item}><span>{item}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Action Items</h3></div>
            <ul className="item-list">{(meeting.actionItems || []).map((item) => <li key={item}><span>{item}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Assignees & Deadlines</h3></div>
            <ul className="item-list">{(meeting.assignees || []).map((item, index) => <li key={`${item}-${index}`}><span>{item}</span><span>{meeting.deadlines?.[index] || 'TBD'}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Risks & Open Questions</h3></div>
            <ul className="item-list">{(meeting.risks || []).map((item) => <li key={item}><span>{item}</span></li>)}{(meeting.openQuestions || []).map((item) => <li key={item}><span>{item}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Next Steps</h3></div>
            <ul className="item-list">{(meeting.nextSteps || []).map((item) => <li key={item}><span>{item}</span></li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Linked Kanban Tasks</h3></div>
            {meeting.linkedKanbanTasks?.length ? (
              <ul className="item-list">
                {meeting.linkedKanbanTasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.title || 'Untitled task'}</span>
                    <button className="ghost-btn small" type="button" onClick={() => onOpenTask(task)}>Open</button>
                  </li>
                ))}
              </ul>
            ) : <p>No linked tasks yet.</p>}
          </article>
        </div>

        <div className="hero-actions">
          <button className="secondary-btn" type="button" onClick={() => onExport(meeting, 'txt')}>Export TXT</button>
          <button className="secondary-btn" type="button" onClick={() => onExport(meeting, 'docx')}>Export DOCX</button>
          <button className="secondary-btn" type="button" onClick={() => onExport(meeting, 'pdf')}>Export PDF</button>
          <button className="ghost-btn" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default MeetingDetailModal;
