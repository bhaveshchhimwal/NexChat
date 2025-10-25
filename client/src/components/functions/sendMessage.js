export function createSendMessage({
  socket,
  selectedUserId,
  messages,
  setMessages,
  newMessageText,
  setNewMessageText,
  id,
}) {
  return function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault();
    if (!socket) return;

    const hasText = newMessageText && newMessageText.trim().length > 0;
    const hasFile = file && file.name;

    if (!hasText && !hasFile) return;

    const tempId = "temp" + Date.now().toString() + Math.random().toString().slice(2, 11);

    const newSentMessage = {
      _id: tempId,
      sender: id,
      recipient: selectedUserId,
      text: hasText ? newMessageText.trim() : "",
      file: hasFile ? file.name : null,
      deleted: false,
    };

    setMessages([...messages, newSentMessage]);

    socket.emit("send-message", {
      recipient: selectedUserId,
      text: hasText ? newMessageText.trim() : "",
      file, 
    });

    setNewMessageText("");
  };
}
