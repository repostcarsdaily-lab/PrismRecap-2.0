import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { db, FIRESTORE_COLLECTIONS } from '../services/firebase';
import ChatSidebar from './chat/ChatSidebar';
import ChatMessageList from './chat/ChatMessageList';
import ChatComposer from './chat/ChatComposer';

const CHANNELS = ['Marketing', 'Sales', 'Finance', 'Human Resources', 'Technology', 'Operations', 'Management'];
const REACTION_OPTIONS = ['👍', '🎉', '🔥', '👏'];

function TeamChatPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [channels] = useState(CHANNELS);
  const [activeChannel, setActiveChannel] = useState('Technology');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [typing, setTyping] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const currentUserId = profile?.uid || 'guest';
  const currentUserName = profile?.name || 'Team Member';

  useEffect(() => {
    const usersQuery = query(collection(db, FIRESTORE_COLLECTIONS.users));
    const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    const notificationsQuery = query(collection(db, FIRESTORE_COLLECTIONS.notifications), orderBy('createdAt', 'desc'));
    const notificationsUnsub = onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => {
      usersUnsub();
      notificationsUnsub();
    };
  }, []);

  useEffect(() => {
    const messageQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.messages),
      where('channel', '==', activeChannel),
      orderBy('sentAt', 'asc')
    );
    const unsub = onSnapshot(messageQuery, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setMessages(items);
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Unable to load messages');
      setLoading(false);
    });

    return () => unsub();
  }, [activeChannel]);

  useEffect(() => {
    const counts = {};
    messages.forEach((message) => {
      if (message.senderId !== currentUserId && !message.readBy?.includes(currentUserId)) {
        counts[activeChannel] = (counts[activeChannel] || 0) + 1;
      }
    });
    setUnreadCounts((current) => ({ ...current, [activeChannel]: counts[activeChannel] || 0 }));
  }, [messages, activeChannel, currentUserId]);

  const visibleMessages = useMemo(() => {
    return messages.filter((message) => {
      const matchesSearch = !search || [message.text, message.senderName].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || (filter === 'Unread' ? !message.readBy?.includes(currentUserId) : message.senderId === currentUserId);
      return matchesSearch && matchesFilter;
    });
  }, [messages, search, filter, currentUserId]);

  const uploadAttachments = async (selectedFiles) => {
    const storage = getStorage();
    const uploaded = [];
    for (const file of selectedFiles) {
      const storageRef = ref(storage, `chat/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({ name: file.name, url, type: file.name.split('.').pop()?.toLowerCase() || 'file' });
    }
    return uploaded;
  };

  const sendMessage = async () => {
    if (!draft.trim() && !attachments.length) return;
    setError('');
    try {
      const uploadedFiles = attachments.length ? await uploadAttachments(attachments) : [];
      const payload = {
        channel: activeChannel,
        conversationId: activeConversation,
        text: draft.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        sentAt: new Date().toISOString(),
        readBy: [currentUserId],
        mentions: draft.match(/@([a-zA-Z0-9_.-]+)/g)?.map((mention) => mention.slice(1)) || [],
        attachments: uploadedFiles,
        replyTo: replyTo ? `${replyTo.senderName}: ${replyTo.text}` : null,
      };
      await addDoc(collection(db, FIRESTORE_COLLECTIONS.messages), payload);
      if (replyTo) {
        await addDoc(collection(db, FIRESTORE_COLLECTIONS.notifications), {
          message: `${currentUserName} replied to a message`,
          createdAt: new Date().toISOString(),
        });
      }
      setDraft('');
      setAttachments([]);
      setReplyTo(null);
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Message send failed');
    }
  };

  const updateMessage = async (message) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.messages, message.id), {
        text: draft,
        editedAt: new Date().toISOString(),
      });
      setDraft('');
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Edit failed');
    }
  };

  const deleteMessage = async (message) => {
    if (message.senderId !== currentUserId) return;
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.messages, message.id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  const reactToMessage = async (message, emoji) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.messages, message.id), {
        reactions: [...(message.reactions || []), emoji],
      });
    } catch (err) {
      setError(err.message || 'Reaction failed');
    }
  };

  const handleAttachment = async (event) => {
    const files = Array.from(event.target.files || []);
    setAttachments(files);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">TC</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Team Chat</h1>
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
            <p className="eyebrow">Real-time workspace</p>
            <h2>Keep your internal teams aligned with channel and private conversations.</h2>
            <p>Share updates, mention teammates, attach files, and maintain context in a premium team chat experience.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Live Firestore chat</div>
            <div className="summary-value">{messages.length} messages</div>
            <p>Presence, typing indicators, and notifications keep collaboration flowing.</p>
          </div>
        </section>

        <section className="chat-shell">
          <ChatSidebar
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={setActiveChannel}
            users={users}
            activeConversation={activeConversation}
            onSelectConversation={setActiveConversation}
            currentUserId={currentUserId}
            unreadCounts={unreadCounts}
            notifications={notifications}
          />

          <div className="chat-main panel">
            <div className="panel-header">
              <h3>{activeChannel}</h3>
              <div className="hero-actions">
                <input className="input-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" />
                <select className="input-field" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="All">All</option>
                  <option value="Unread">Unread</option>
                  <option value="Mine">Mine</option>
                </select>
              </div>
            </div>
            {loading ? <div className="loading-screen">Loading team chat…</div> : (
              <>
                <ChatMessageList
                  messages={visibleMessages}
                  currentUserId={currentUserId}
                  onEdit={(message) => {
                    setEditingId(message.id);
                    setDraft(message.text);
                  }}
                  onDelete={deleteMessage}
                  onReply={(message) => setReplyTo(message)}
                  onReact={reactToMessage}
                  mentionUsers={users}
                />
                <ChatComposer
                  value={draft}
                  onChange={setDraft}
                  onSend={() => editingId ? updateMessage({ id: editingId }) : sendMessage()}
                  onAttach={handleAttachment}
                  typing={typing}
                  mentionUsers={users}
                />
                <div className="reaction-row">
                  {REACTION_OPTIONS.map((emoji) => <button key={emoji} className="ghost-btn small" type="button" onClick={() => setDraft((current) => `${current} ${emoji}`)}>{emoji}</button>)}
                </div>
              </>
            )}
            {error ? <p className="auth-message">{error}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

export default TeamChatPage;
