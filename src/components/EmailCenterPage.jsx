import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { createCollectionItem, createNamedCollectionItem, createNotification, db, FIRESTORE_COLLECTIONS } from '../services/firebase';

const TEMPLATE_OPTIONS = [
  { id: 'meeting-summary', label: 'Meeting Summary', subject: 'Meeting Summary Update', body: '<p>Hello team,</p><p>Please review the latest meeting highlights and next steps below.</p><ul><li>Executive summary</li><li>Key decisions</li><li>Action items</li></ul>' },
  { id: 'executive-report', label: 'Executive Report', subject: 'Executive Report', body: '<p>Hello leadership team,</p><p>Please find the latest executive report and status update attached.</p>' },
  { id: 'action-items', label: 'Action Items', subject: 'Action Items Reminder', body: '<p>Hello team,</p><p>The following action items need your attention this week.</p>' },
  { id: 'weekly-report', label: 'Weekly Report', subject: 'Weekly Report', body: '<p>Hello team,</p><p>Here is the weekly report with progress, blockers, and recommendations.</p>' },
];

const DEFAULT_ATTACHMENTS = [
  { name: 'meeting-summary.pdf', type: 'pdf' },
  { name: 'meeting-summary.docx', type: 'docx' },
  { name: 'meeting-summary.txt', type: 'txt' },
];

function EmailCenterPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0].id);
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientGroup, setRecipientGroup] = useState('Leadership');
  const [body, setBody] = useState(TEMPLATE_OPTIONS[0].body);
  const [attachments, setAttachments] = useState([]);
  const [draftType, setDraftType] = useState('meeting-summary');

  useEffect(() => {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.emailHistory), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setHistory(items);
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Unable to load email history');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleHistory = useMemo(() => {
    return history.filter((entry) => {
      const matchesSearch = !search || [entry.recipient, entry.subject, entry.status].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'All' || entry.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [history, search, filterStatus]);

  const selectedTemplate = TEMPLATE_OPTIONS.find((item) => item.id === template) || TEMPLATE_OPTIONS[0];

  const handleTemplateSelect = (nextTemplate) => {
    const found = TEMPLATE_OPTIONS.find((item) => item.id === nextTemplate);
    if (!found) return;
    setTemplate(found.id);
    setDraftType(found.id);
    setSubject(found.subject);
    setBody(found.body);
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    const mapped = files.map((file) => ({ name: file.name, type: file.name.split('.').pop()?.toLowerCase() || 'txt', content: '', file }));
    setAttachments((current) => [...current, ...mapped]);
  };

  const buildAttachmentPayload = async (files) => {
    return Promise.all(files.map(async (fileItem) => {
      if (fileItem.file) {
        const arrayBuffer = await fileItem.file.arrayBuffer();
        const content = Buffer.from(arrayBuffer).toString('base64');
        return { filename: fileItem.name, content, contentType: fileItem.file.type || 'application/octet-stream' };
      }
      return { filename: fileItem.name, content: '', contentType: 'text/plain' };
    }));
  };

  const handleSend = async () => {
    if (!recipients.trim() || !subject.trim()) {
      setError('Please provide recipients and a subject.');
      return;
    }

    setSending(true);
    setError('');

    const emailRecipients = recipients.split(',').map((item) => item.trim()).filter(Boolean);
    const status = 'Queued';
    const createdEntry = {
      recipient: emailRecipients.join(', '),
      subject,
      body,
      template: selectedTemplate.label,
      type: draftType,
      departmentGroup: recipientGroup,
      status,
      opened: false,
      createdAt: new Date().toISOString(),
      createdBy: profile?.uid || 'anonymous',
    };

    try {
      const entryId = await createCollectionItem(FIRESTORE_COLLECTIONS.emailHistory, createdEntry);
      const payload = {
        to: emailRecipients,
        subject,
        html: body,
        text: body.replace(/<[^>]+>/g, ' '),
        attachments: await buildAttachmentPayload(attachments.length ? attachments : DEFAULT_ATTACHMENTS.map((item) => ({ ...item, file: null, content: '' }))),
      };

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Email delivery failed');
      }

      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.emailHistory, entryId), {
        status: 'Delivered',
        sentAt: new Date().toISOString(),
        deliveryId: result.id || '',
      });
      await createNotification({
        title: 'Email delivered',
        message: `Your message to ${emailRecipients.join(', ')} was sent successfully.`,
        type: 'Email',
        userId: profile?.uid || 'guest',
      });
    } catch (err) {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.emailHistory, entryId), {
        status: 'Failed',
        errorMessage: err.message || 'Delivery failed',
      });
      await createNotification({
        title: 'Email delivery failed',
        message: err.message || 'Your email could not be sent.',
        type: 'Email',
        userId: profile?.uid || 'guest',
      });
      setError(err.message || 'Email failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (entry) => {
    try {
      setError('');
      const payload = {
        to: entry.recipient.split(',').map((item) => item.trim()).filter(Boolean),
        subject: entry.subject,
        html: entry.body || '<p>Resent message</p>',
        text: entry.body?.replace(/<[^>]+>/g, ' ') || 'Resent message',
        attachments: [],
      };
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Resend failed');
      }
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.emailHistory, entry.id), {
        status: 'Delivered',
        resentAt: new Date().toISOString(),
      });
      await createNotification({
        title: 'Email resent',
        message: `Your message to ${entry.recipient} was resent successfully.`,
        type: 'Email',
        userId: profile?.uid || 'guest',
      });
    } catch (err) {
      setError(err.message || 'Resend failed');
    }
  };

  const handleDuplicate = async (entry) => {
    try {
      await createNamedCollectionItem(FIRESTORE_COLLECTIONS.emailHistory, `${entry.id}-copy-${Date.now()}`, {
        ...entry,
        id: undefined,
        status: 'Queued',
        createdAt: new Date().toISOString(),
        resentAt: null,
      });
    } catch (err) {
      setError(err.message || 'Duplicate failed');
    }
  };

  const handleDelete = async (entry) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.emailHistory, entry.id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">EC</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Email Center</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="ghost-btn" type="button" onClick={() => navigate('/meeting-history')}>Meeting History</button>
          <button className="ghost-btn" type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Communication Hub</p>
            <h2>Send polished meeting updates and executive reports in seconds.</h2>
            <p>Use reusable templates, attach reports, and track delivery history from one premium workspace.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Resend delivery</div>
            <div className="summary-value">{history.length} emails</div>
            <p>Every send is recorded in Firebase for follow-up and auditability.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h3>Compose</h3></div>
          <div className="filter-grid">
            <select className="input-field" value={template} onChange={(event) => handleTemplateSelect(event.target.value)}>
              {TEMPLATE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <input className="input-field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
            <input className="input-field" value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="Recipients (comma separated)" />
            <select className="input-field" value={recipientGroup} onChange={(event) => setRecipientGroup(event.target.value)}>
              <option value="Leadership">Leadership</option>
              <option value="Product">Product</option>
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div className="email-editor-shell">
            <label className="upload-card">
              <span>Email body</span>
              <textarea className="rich-text-editor" value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <label className="upload-card">
              <span>Attachments</span>
              <input type="file" multiple onChange={handleAttachmentChange} />
              <small>PDF, DOCX, TXT and other files are supported.</small>
              <div className="attachment-list">
                {attachments.length ? attachments.map((attachment) => <span key={attachment.name} className="tag">{attachment.name}</span>) : <span className="tag">No attachments</span>}
              </div>
            </label>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
            <button className="secondary-btn" type="button" onClick={() => navigate('/kanban')}>Open Kanban</button>
          </div>
          {error ? <p className="auth-message">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header"><h3>Email History</h3></div>
          <div className="filter-grid">
            <input className="input-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history" />
            <select className="input-field" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Queued">Queued</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          {loading ? <div className="loading-screen">Loading email history…</div> : (
            <div className="history-list">
              {visibleHistory.map((entry) => (
                <article key={entry.id} className="history-card">
                  <div className="history-card-header">
                    <div>
                      <h3>{entry.subject}</h3>
                      <p>{entry.recipient}</p>
                    </div>
                    <div className="meeting-card-badges">
                      <span className="tag">{entry.status}</span>
                      {entry.opened ? <span className="tag">Opened</span> : null}
                    </div>
                  </div>
                  <div className="meeting-card-meta">
                    <span>{entry.template}</span>
                    <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Pending'}</span>
                  </div>
                  <div className="task-actions">
                    <button className="ghost-btn small" type="button" onClick={() => handleResend(entry)}>Resend</button>
                    <button className="ghost-btn small" type="button" onClick={() => handleDuplicate(entry)}>Duplicate</button>
                    <button className="ghost-btn small" type="button" onClick={() => handleDelete(entry)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default EmailCenterPage;
