import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { createNamedCollectionItem, db, FIRESTORE_COLLECTIONS } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import MeetingHistoryCard from './MeetingHistoryCard';
import MeetingHistoryTable from './MeetingHistoryTable';
import MeetingHistoryTimeline from './MeetingHistoryTimeline';
import MeetingDetailModal from './MeetingDetailModal';
import JSZip from 'jszip';

const PAGE_SIZE = 6;

function slugify(value) {
  return String(value || 'meeting')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildMeetingText(meeting) {
  return [
    `Meeting: ${meeting.title || 'Untitled Meeting'}`,
    `Date: ${meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : 'Not recorded'}`,
    `Department: ${meeting.department || 'Product'}`,
    `Participants: ${meeting.participants?.join(', ') || 'Team'}`,
    '',
    'Executive Summary',
    meeting.executiveSummary || 'No summary captured.',
    '',
    'Key Highlights',
    ...(meeting.keyHighlights || []).map((item) => `- ${item}`),
    '',
    'Decisions',
    ...(meeting.decisions || []).map((item) => `- ${item}`),
    '',
    'Action Items',
    ...(meeting.actionItems || []).map((item) => `- ${item}`),
    '',
    'Linked Kanban Tasks',
    ...(meeting.linkedKanbanTasks || []).map((task) => `- ${task.title || 'Untitled task'}`),
  ].join('\n');
}

async function downloadTextFile(meeting, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(meeting.title)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadDocxFile(meeting, content) {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>')}</w:t></w:r></w:p></w:body></w:document>`;
  const zip = new JSZip();
  zip.file('word/document.xml', xml);
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(meeting.title)}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

function printPdf(meeting, content) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><title>${meeting.title}</title><style>body{font-family:Inter,Segoe UI,sans-serif;padding:24px;line-height:1.5}pre{white-space:pre-wrap}</style></head><body><h1>${meeting.title}</h1><pre>${content}</pre></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function MeetingHistoryPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [participantFilter, setParticipantFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('card');
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.meetingHistory), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setMeetings(items);
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Unable to load meeting history');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, participantFilter, statusFilter, dateFilter, sortBy]);

  const visibleMeetings = useMemo(() => {
    const normalized = meetings.filter((meeting) => {
      const matchesSearch = !search || [meeting.title, meeting.executiveSummary, meeting.department, meeting.participants?.join(' ')].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = departmentFilter === 'All' || meeting.department === departmentFilter;
      const matchesParticipant = participantFilter === 'All' || meeting.participants?.includes(participantFilter);
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Archived' ? meeting.archived : (meeting.status || 'Active') === statusFilter);
      const matchesDate = !dateFilter || (meeting.dateTime || '').slice(0, 10) === dateFilter;
      return matchesSearch && matchesDepartment && matchesParticipant && matchesStatus && matchesDate;
    });

    return normalized.sort((left, right) => {
      if (sortBy === 'alphabetical') {
        return (left.title || '').localeCompare(right.title || '');
      }
      if (sortBy === 'oldest') {
        return new Date(left.dateTime || left.createdAt || 0) - new Date(right.dateTime || right.createdAt || 0);
      }
      return new Date(right.dateTime || right.createdAt || 0) - new Date(left.dateTime || left.createdAt || 0);
    });
  }, [meetings, search, departmentFilter, participantFilter, statusFilter, dateFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visibleMeetings.length / PAGE_SIZE));
  const pagedMeetings = visibleMeetings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleUpdateTitle = async (meeting, title) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.meetingHistory, meeting.id), {
        title,
        updatedAt: new Date().toISOString(),
      });
      setActiveMeeting((current) => current ? { ...current, title } : current);
    } catch (err) {
      setError(err.message || 'Unable to update meeting title');
    }
  };

  const handleTogglePin = async (meeting) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.meetingHistory, meeting.id), {
        pinned: !meeting.pinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Unable to update pin state');
    }
  };

  const handleArchive = async (meeting) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.meetingHistory, meeting.id), {
        archived: !meeting.archived,
        status: meeting.archived ? 'Active' : 'Archived',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Unable to update archive state');
    }
  };

  const handleDelete = async (meeting) => {
    if (!window.confirm(`Delete ${meeting.title || 'this meeting'}?`)) return;
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.meetingHistory, meeting.id));
      setActiveMeeting(null);
    } catch (err) {
      setError(err.message || 'Unable to delete meeting');
    }
  };

  const handleDuplicate = async (meeting) => {
    try {
      const copyId = `${meeting.id || 'meeting'}-copy-${Date.now()}`;
      await createNamedCollectionItem(FIRESTORE_COLLECTIONS.meetingHistory, copyId, {
        ...meeting,
        id: copyId,
        title: `${meeting.title || 'Untitled Meeting'} Copy`,
        meetingId: copyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pinned: false,
        archived: false,
        status: 'Active',
      });
    } catch (err) {
      setError(err.message || 'Unable to duplicate meeting');
    }
  };

  const handleExport = async (meeting, format) => {
    const content = buildMeetingText(meeting);
    if (format === 'txt') {
      await downloadTextFile(meeting, content);
      return;
    }
    if (format === 'docx') {
      await downloadDocxFile(meeting, content);
      return;
    }
    printPdf(meeting, content);
  };

  const handleOpenTask = (task) => {
    navigate(`/kanban?taskId=${task.id}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">MH</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Meeting History</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="ghost-btn" type="button" onClick={() => navigate('/meeting-processing')}>New Meeting</button>
          <button className="ghost-btn" type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Archive & Search</p>
            <h2>Review every processed meeting with structured context.</h2>
            <p>Search, filter, sort, export and revisit the full narrative of each session from a premium history workspace.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">{visibleMeetings.length} recorded meetings</div>
            <div className="summary-value">{meetings.filter((meeting) => meeting.pinned).length} pinned</div>
            <p>Each history record ties back to the Kanban workflow so follow-ups stay connected.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>History Controls</h3>
          </div>
          <div className="filter-grid">
            <input className="input-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings" />
            <select className="input-field" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="All">All Departments</option>
              {Array.from(new Set(meetings.map((meeting) => meeting.department).filter(Boolean))).map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select className="input-field" value={participantFilter} onChange={(event) => setParticipantFilter(event.target.value)}>
              <option value="All">All Participants</option>
              {Array.from(new Set(meetings.flatMap((meeting) => meeting.participants || []).filter(Boolean))).map((participant) => <option key={participant} value={participant}>{participant}</option>)}
            </select>
            <select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="Completed">Completed</option>
            </select>
            <input className="input-field" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            <select className="input-field" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>

          <div className="hero-actions">
            <button className={`ghost-btn ${viewMode === 'card' ? 'active' : ''}`} type="button" onClick={() => setViewMode('card')}>Card View</button>
            <button className={`ghost-btn ${viewMode === 'timeline' ? 'active' : ''}`} type="button" onClick={() => setViewMode('timeline')}>Timeline View</button>
            <button className={`ghost-btn ${viewMode === 'table' ? 'active' : ''}`} type="button" onClick={() => setViewMode('table')}>Table View</button>
          </div>
          {error ? <p className="auth-message">{error}</p> : null}
        </section>

        {loading ? <div className="loading-screen">Loading your meeting history…</div> : null}

        {!loading && !visibleMeetings.length ? <div className="panel empty-state">No meetings match the current filters.</div> : null}

        {!loading && visibleMeetings.length ? (
          <>
            {viewMode === 'card' ? (
              <div className="meeting-grid">
                {pagedMeetings.map((meeting) => (
                  <MeetingHistoryCard
                    key={meeting.id}
                    meeting={meeting}
                    onOpen={setActiveMeeting}
                    onTogglePin={handleTogglePin}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                  />
                ))}
              </div>
            ) : null}

            {viewMode === 'timeline' ? <MeetingHistoryTimeline meetings={pagedMeetings} onOpen={setActiveMeeting} /> : null}
            {viewMode === 'table' ? <MeetingHistoryTable meetings={pagedMeetings} onOpen={setActiveMeeting} onTogglePin={handleTogglePin} onArchive={handleArchive} onDelete={handleDelete} onDuplicate={handleDuplicate} onExport={handleExport} /> : null}

            <div className="pagination-controls">
              <button className="ghost-btn" type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {page} of {pageCount}</span>
              <button className="ghost-btn" type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
            </div>
          </>
        ) : null}
      </main>

      <MeetingDetailModal
        meeting={activeMeeting}
        onClose={() => setActiveMeeting(null)}
        onExport={handleExport}
        onUpdateTitle={handleUpdateTitle}
        onTogglePin={handleTogglePin}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onOpenTask={handleOpenTask}
      />
    </div>
  );
}

export default MeetingHistoryPage;
