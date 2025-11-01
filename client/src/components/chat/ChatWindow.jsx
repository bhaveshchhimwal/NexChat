import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MoreVertical, Edit, Trash2 } from "lucide-react";

import {
  canEditOrDelete,
  handleSaveEdit,
  handleEditKeyDown,
  confirmDelete,
} from "../functions/editDelete.js";

export function ChatWindow({ messagesWithoutDupes, id, divUnderMessages, socket }) {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const menuRefs = useRef({}); 
  const [messages, setMessages] = useState(messagesWithoutDupes);

  useEffect(() => {
    setMessages(messagesWithoutDupes);
  }, [messagesWithoutDupes]);

  useEffect(() => {
    const handleClickOutside = (e) => {
    
      const clickedOutside = Object.values(menuRefs.current).every(
        ref => !ref || !ref.contains(e.target)
      );
      if (clickedOutside) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("message-updated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === updatedMsg._id
            ? { ...m, text: updatedMsg.text, isEdited: true, updatedAt: updatedMsg.updatedAt }
            : m
        )
      );
    });

    socket.on("message-deleted", (deletedMsg) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === deletedMsg._id
            ? { ...m, text: "message deleted", isDeleted: true, file: null }
            : m
        )
      );
    });

    return () => {
      socket.off("message-updated");
      socket.off("message-deleted");
    };
  }, [socket]);

  const handleEdit = (message) => {
    setEditingMessageId(message._id);
    setEditText(message.text);
    setMenuOpenId(null);
  };

  const handleSave = () =>
    handleSaveEdit({ editText, editingMessageId, socket, setEditingMessageId, setEditText });

  const handleKeyDown = (e) =>
    handleEditKeyDown(e, handleSave, setEditingMessageId, setEditText);

  const handleDeleteClick = (messageId) => {
    setDeleteConfirmId(messageId);
    setMenuOpenId(null);
  };

  const handleConfirmDelete = () =>
    confirmDelete({ socket, deleteConfirmId, setDeleteConfirmId });

  const cancelDelete = () => setDeleteConfirmId(null);

  return (
    <div className="flex-grow relative">
      {!messages.length && (
        <div className="flex h-full items-center justify-center text-gray-300 px-4">
          <div className="md:hidden mb-2">Tap the menu button to select a contact</div>
          <div className="hidden md:block">&larr; Select a person from the sidebar</div>
        </div>
      )}

      {!!messages.length && (
        <div className="relative h-full">
          <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
            {messages.map((message) => {
              const isOwn = message.sender === id;
              const showMenu = menuOpenId === message._id;
              const canModify = canEditOrDelete(message);
              const hasImage =
                message.file &&
                (message.file.endsWith(".png") ||
                  message.file.endsWith(".jpg") ||
                  message.file.endsWith(".jpeg") ||
                  message.file.endsWith(".gif") ||
                  message.file.endsWith(".webp"));

              return (
                <div
                  key={message._id}
                  className={`flex items-start my-2 gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                 
                  {isOwn ? (
                    <div className="w-7 flex-shrink-0 flex items-start pt-1">
                      {!message.isDeleted && canModify && (
                        <div className="relative" ref={el => menuRefs.current[message._id] = el}>
                          <button
                            onClick={() => setMenuOpenId(showMenu ? null : message._id)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {showMenu && (
                            <div className="absolute right-0 mt-1 w-24 bg-gray-800 text-white rounded shadow-lg z-10 text-sm">
                              {!hasImage && (
                                <button
                                  onClick={() => handleEdit(message)}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 w-full text-left"
                                >
                                  <Edit size={14} /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(message._id)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 w-full text-left"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div
                    className={`inline-block p-2 rounded-md text-sm max-w-xs whitespace-pre-wrap ${
                      message.isDeleted
                        ? "bg-gray-200 text-gray-500 italic"
                        : isOwn
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-700"
                    }`}
                  >
                    {editingMessageId === message._id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="p-1 rounded text-black w-full resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-1 text-xs justify-end">
                          <button onClick={handleSave} className="text-green-300 hover:underline">
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditText("");
                            }}
                            className="text-gray-200 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`${message.file ? "mb-2" : ""}`}>
                          {message.isDeleted ? (
                            <i className="text-gray-500">message deleted</i>
                          ) : (
                            <>
                              {message.text}
                              {message.isEdited && (
                                <span className="text-xs opacity-70 ml-1">(edited)</span>
                              )}
                            </>
                          )}
                        </div>

                        {!message.isDeleted && message.file && (
                          <div>
                            {hasImage ? (
                              <img
                                src={
                                  message.file.startsWith("http")
                                    ? message.file
                                    : axios.defaults.baseURL + "/uploads/" + message.file
                                }
                                alt=""
                                className="max-w-48 max-h-64 rounded cursor-pointer block object-cover"
                                onClick={() =>
                                  window.open(
                                    message.file.startsWith("http")
                                      ? message.file
                                      : axios.defaults.baseURL + "/uploads/" + message.file,
                                    "_blank"
                                  )
                                }
                              />
                            ) : (
                              <a
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 border-b"
                                href={
                                  message.file.startsWith("http")
                                    ? message.file
                                    : axios.defaults.baseURL + "/uploads/" + message.file
                                }
                              >
                                📎 {message.file.split("/").pop()}
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={divUnderMessages}></div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="absolute bottom-8 right-8 bg-gray-800 text-white rounded-lg p-4 shadow-xl z-30 border border-gray-700">
          <p className="text-sm mb-3">Delete this message?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={cancelDelete}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}