function NotificationToast({ message, visible, onClose }) {
  if (!visible) return null;

  return (
    <div className="toast-card" role="status">
      <strong>Notification</strong>
      <p>{message}</p>
      <button className="ghost-btn small" type="button" onClick={onClose}>Close</button>
    </div>
  );
}

export default NotificationToast;
