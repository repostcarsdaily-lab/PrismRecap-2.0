function ChatComposer({ value, onChange, onSend, onAttach, typing, mentionUsers }) {
  return (
    <div className="chat-composer panel">
      <div className="composer-row">
        <textarea className="rich-text-editor" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write a message or mention someone with @username" />
        <input className="input-field" type="file" multiple onChange={onAttach} />
      </div>
      <div className="hero-actions">
        <button className="primary-btn" type="button" onClick={onSend}>Send</button>
      </div>
      {typing ? <p className="typing-indicator">Someone is typing…</p> : null}
    </div>
  );
}

export default ChatComposer;
