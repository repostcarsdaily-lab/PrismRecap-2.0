function ChatSidebar({
  channels,
  activeChannel,
  onSelectChannel,
  users,
  activeConversation,
  onSelectConversation,
  currentUserId,
  unreadCounts,
  notifications,
}) {
  return (
    <aside className="chat-sidebar panel">
      <div className="panel-header">
        <h3>Channels</h3>
      </div>
      <div className="channel-list">
        {channels.map((channel) => (
          <button
            key={channel}
            className={`channel-item ${activeChannel === channel ? 'active' : ''}`}
            type="button"
            onClick={() => onSelectChannel(channel)}
          >
            <span>#{channel}</span>
            {unreadCounts[channel] ? <span className="counter">{unreadCounts[channel]}</span> : null}
          </button>
        ))}
      </div>

      <div className="panel-header" style={{ marginTop: 16 }}>
        <h3>Private</h3>
      </div>
      <div className="channel-list">
        {users.filter((user) => user.id !== currentUserId).map((user) => (
          <button
            key={user.id}
            className={`channel-item ${activeConversation === user.id ? 'active' : ''}`}
            type="button"
            onClick={() => onSelectConversation(user.id)}
          >
            <span>{user.name || user.email || 'User'}</span>
            <span className={`status-dot ${user.online ? 'online' : 'offline'}`} />
          </button>
        ))}
      </div>

      <div className="panel-header" style={{ marginTop: 16 }}>
        <h3>Notifications</h3>
      </div>
      <div className="channel-list">
        {notifications.slice(0, 4).map((notification) => (
          <div key={notification.id} className="notification-pill">
            <span>{notification.message}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default ChatSidebar;
