import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, FIRESTORE_COLLECTIONS } from '../services/firebase';
import NotificationBell from './notifications/NotificationBell';
import NotificationToast from './notifications/NotificationToast';

const NOTIFICATION_TYPES = ['All', 'Meeting', 'Task', 'Chat', 'Email', 'System'];

function NotificationCenterPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [readFilter, setReadFilter] = useState('All');
  const [preferences, setPreferences] = useState({
    email: true,
    inApp: true,
    sound: false,
    desktop: false,
    chat: true,
    meeting: true,
    task: true,
  });
  const [toastMessage, setToastMessage] = useState('');
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.notifications), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Unable to load notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((entry) => {
      const matchesSearch = !search || [entry.title, entry.message, entry.type].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All' || entry.type === typeFilter;
      const matchesDate = !dateFilter || (entry.createdAt || '').slice(0, 10) === dateFilter;
      const matchesRead = readFilter === 'All' || (readFilter === 'Read' ? entry.read : !entry.read);
      return matchesSearch && matchesType && matchesDate && matchesRead;
    });
  }, [notifications, search, typeFilter, dateFilter, readFilter]);

  const unreadCount = notifications.filter((entry) => !entry.read).length;

  const markAllAsRead = async () => {
    try {
      await Promise.all(notifications.filter((entry) => !entry.read).map((entry) => updateDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, entry.id), { read: true, readAt: new Date().toISOString() })));
      setToastMessage('All notifications marked as read');
    } catch (err) {
      setError(err.message || 'Unable to update notifications');
    }
  };

  const markAsRead = async (entry) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, entry.id), { read: true, readAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Unable to mark notification as read');
    }
  };

  const deleteNotification = async (entry) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.notifications, entry.id));
    } catch (err) {
      setError(err.message || 'Unable to delete notification');
    }
  };

  const updatePreference = async (key, value) => {
    const nextPreferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.users, profile?.uid || 'guest'), { notificationPreferences: nextPreferences }, { merge: true });
    } catch (err) {
      setError(err.message || 'Unable to save preferences');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">NC</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Notification Center</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <NotificationBell count={unreadCount} onOpen={() => setBellOpen((current) => !current)} />
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="ghost-btn" type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Signals & updates</p>
            <h2>Stay on top of every meeting, task, message, and delivery update.</h2>
            <p>Track your environment in real time with an elegant, searchable notification workspace.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Realtime alerts</div>
            <div className="summary-value">{unreadCount} unread</div>
            <p>Notifications are generated for meetings, tasks, chat, and delivery events.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Preferences</h3>
          </div>
          <div className="preference-grid">
            {[
              ['email', 'Email notifications'],
              ['inApp', 'In-app notifications'],
              ['sound', 'Sound on/off'],
              ['desktop', 'Desktop notifications'],
              ['chat', 'Chat notifications'],
              ['meeting', 'Meeting notifications'],
              ['task', 'Task notifications'],
            ].map(([key, label]) => (
              <label key={key} className="preference-pill">
                <input checked={preferences[key]} type="checkbox" onChange={(event) => updatePreference(key, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Notifications</h3>
            <div className="hero-actions">
              <button className="ghost-btn" type="button" onClick={markAllAsRead}>Mark all read</button>
            </div>
          </div>
          <div className="filter-grid">
            <input className="input-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications" />
            <select className="input-field" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {NOTIFICATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input className="input-field" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            <select className="input-field" value={readFilter} onChange={(event) => setReadFilter(event.target.value)}>
              <option value="All">All</option>
              <option value="Unread">Unread</option>
              <option value="Read">Read</option>
            </select>
          </div>
          {loading ? <div className="loading-screen">Loading notifications…</div> : (
            <div className="history-list">
              {visibleNotifications.map((entry) => (
                <article key={entry.id} className={`history-card ${entry.read ? '' : 'unread-card'}`}>
                  <div className="history-card-header">
                    <div>
                      <h3>{entry.title || 'Notification'}</h3>
                      <p>{entry.message}</p>
                    </div>
                    <div className="meeting-card-badges">
                      <span className="tag">{entry.type || 'System'}</span>
                      {entry.read ? null : <span className="tag">Unread</span>}
                    </div>
                  </div>
                  <div className="meeting-card-meta">
                    <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Pending'}</span>
                    <span>{entry.read ? 'Read' : 'Unread'}</span>
                  </div>
                  <div className="task-actions">
                    <button className="ghost-btn small" type="button" onClick={() => markAsRead(entry)}>Mark read</button>
                    <button className="ghost-btn small" type="button" onClick={() => deleteNotification(entry)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {error ? <p className="auth-message">{error}</p> : null}
        </section>
      </main>

      {bellOpen ? <div className="notification-popover panel">{notifications.slice(0, 5).map((entry) => <div key={entry.id} className="notification-pill">{entry.message}</div>)}</div> : null}
      <NotificationToast message={toastMessage} visible={Boolean(toastMessage)} onClose={() => setToastMessage('')} />
    </div>
  );
}

export default NotificationCenterPage;
