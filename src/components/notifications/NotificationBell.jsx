function NotificationBell({ count, onOpen }) {
  return (
    <button className="ghost-btn notification-bell" type="button" onClick={onOpen}>
      🔔
      {count ? <span className="notification-badge">{count}</span> : null}
    </button>
  );
}

export default NotificationBell;
