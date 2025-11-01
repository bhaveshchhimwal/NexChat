const EDIT_DELETE_LIMIT_MS = 5 * 60 * 1000;

export function canEditOrDelete(message) {
    if (!message?._id) return false;
    
    const msgTime = message.createdAt 
        ? new Date(message.createdAt).getTime()
        : new Date(parseInt(message._id.substring(0, 8), 16) * 1000).getTime();
    
    const now = Date.now();
    return now - msgTime < EDIT_DELETE_LIMIT_MS;
}
export function handleSaveEdit({
    editText,
    editingMessageId,
    socket,
    setEditingMessageId,
    setEditText,
}) {
    if (!editText.trim()) return;

    socket.emit("update-message", {
        messageId: editingMessageId,
        newText: editText.trim(),
    });

    setEditingMessageId(null);
    setEditText("");
}


export function handleEditKeyDown(e, onSave, setEditingMessageId, setEditText) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSave();
    } else if (e.key === "Escape") {
        setEditingMessageId(null);
        setEditText("");
    }
}


export function confirmDelete({ socket, deleteConfirmId, setDeleteConfirmId }) {
    socket.emit("delete-message", { messageId: deleteConfirmId });
    setDeleteConfirmId(null);
}
