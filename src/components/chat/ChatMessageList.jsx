function ChatMessageList({ messages, currentUserId, onEdit, onDelete, onReply, onReact, mentionUsers }) {
  return (
    <div className="chat-message-list">
      {messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        return (
          <article key={message.id} className={`chat-message ${isMine ? 'mine' : ''}`}>
            <div className="chat-message-header">
              <strong>{message.senderName || 'Team member'}</strong>
              <span>{message.sentAt ? new Date(message.sentAt).toLocaleTimeString() : ''}</span>
            </div>
            <p>{message.text}</p>
            {message.attachments?.length ? (
              <div className="attachment-list">
                {message.attachments.map((attachment) => (
                  <a key={attachment.name} className="tag" href={attachment.url} target="_blank" rel="noreferrer">{attachment.name}</a>
                ))}
              </div>
            ) : null}
            {message.replyTo ? <div className="reply-pill">↳ {message.replyTo}</div> : null}
            <div className="chat-action-row">
              <button className="ghost-btn small" type="button" onClick={() => onReply(message)}>Reply</button>
              <button className="ghost-btn small" type="button" onClick={() => onReact(message, '👍')}>👍</button>
              <button className="ghost-btn small" type="button" onClick={() => onReact(message, '🎉')}>🎉</button>
              {isMine ? (
                <>
                  <button className="ghost-btn small" type="button" onClick={() => onEdit(message)}>Edit</button>
                  <button className="ghost-btn small" type="button" onClick={() => onDelete(message)}>Delete</button>
                </>
              ) : null}
            </div>
            {message.mentions?.length ? <div className="mention-pill">Mentions: {message.mentions.join(', ')}</div> : null}
          </article>
        );
      })}
    </div>
  );
}

export default ChatMessageList;
