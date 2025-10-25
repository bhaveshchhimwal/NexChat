import React from "react";
import axios from "axios";

export function ChatWindow({ messages, messagesWithoutDupes, id, divUnderMessages }) {
  return (
    <div className="flex-grow">
      {!messagesWithoutDupes.length && (
        <div className="flex h-full flex-grow items-center justify-center">
          <div className="text-gray-300 text-center px-4">
            <div className="md:hidden mb-2">Tap the menu button to select a contact</div>
            <div className="hidden md:block">&larr; Select a person from the sidebar</div>
          </div>
        </div>
      )}
      {!!messagesWithoutDupes.length && (
        <div className="relative h-full">
          <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
            {messagesWithoutDupes.map((message) => (
              <div
                key={message._id}
                className={message.sender === id ? "flex justify-end my-2" : "flex justify-start my-2"}
              >
                <div
                  className={
                    "inline-block p-2 rounded-md text-sm max-w-xs md:max-w-xs " +
                    (message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")
                  }
                  style={{ maxWidth: "calc(100% - 2rem)" }}
                >
                  {message.text && message.text.trim() && (
                    <div className={message.file ? "mb-2" : ""}>{message.text}</div>
                  )}

                  {message.file && (
                    <div>
                      {(message.file.endsWith(".png") ||
                        message.file.endsWith(".jpg") ||
                        message.file.endsWith(".jpeg") ||
                        message.file.endsWith(".gif") ||
                        message.file.endsWith(".webp")) ? (
                        <img
                          src={
                            message.file.startsWith("http")
                              ? message.file
                              : axios.defaults.baseURL + "/uploads/" + message.file
                          }
                          alt="shared image"
                          className="max-w-48 max-h-64 rounded cursor-pointer block object-cover"
                          onClick={() =>
                            window.open(
                              message.file.startsWith("http")
                                ? message.file
                                : axios.defaults.baseURL + "/uploads/" + message.file,
                              "_blank"
                            )
                          }
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
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
                </div>
              </div>
            ))}
            <div ref={divUnderMessages}></div>
          </div>
        </div>
      )}
    </div>
  );
}
