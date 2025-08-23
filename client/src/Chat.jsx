import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";
import { Trash2 } from "lucide-react";

axios.defaults.baseURL = "http://localhost:4040";
axios.defaults.withCredentials = true;

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  // ---------------- WebSocket connection ----------------
  useEffect(() => {
    let ws;

    function connectToWs() {
      ws = new WebSocket("ws://localhost:4040");

      ws.addEventListener("open", () => {
        console.log("WebSocket connected");
      });

      ws.addEventListener("message", handleMessage);

      ws.addEventListener("close", () => {
        console.log("Disconnected. Trying to reconnect.");
        setTimeout(connectToWs, 1000);
      });

      setWs(ws);
    }

    connectToWs();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // ---------------- Handle online users ----------------
  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  // ---------------- Handle incoming messages ----------------
  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData || "file" in messageData) {
      if (messageData.sender === selectedUserId || messageData.sender === id) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    } else if (messageData.type === "delete") {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageData.messageId
            ? { ...m, text: "Message deleted", file: null, deleted: true }
            : m
        )
      );
    }
  }

  // ---------------- Logout ----------------
  function logout() {
    axios.post("/logout").then(() => {
      if (ws) ws.close();
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  // ---------------- Send message ----------------
  function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault();
    if (!ws) return;

    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        text: newMessageText,
        sender: id,
        recipient: selectedUserId,
        file: file ? file.data : null,
        _id: Date.now(),
      },
    ]);

    setNewMessageText("");
  }

  // ---------------- Send file ----------------
  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  // ---------------- Scroll to bottom ----------------
  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) div.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ---------------- Load offline people ----------------
  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  // ---------------- Load messages for selected user ----------------
  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id");

  // ---------------- Delete message ----------------
  function deleteMessage(messageId) {
    if (window.confirm("Are you sure you want to delete this message?")) {
      axios.delete(`/messages/${messageId}`).then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, text: "Message deleted", file: null, deleted: true }
              : m
          )
        );
        if (ws) {
          ws.send(JSON.stringify({ type: "delete", messageId }));
        }
      });
    }
  }

  // ---------------- JSX ----------------
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeopleExclOurUser[userId]}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-600 flex items-center">
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm"
          >
            logout
          </button>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full flex-grow items-center justify-center">
              <div className="text-gray-300">
                &larr; Select a person from the sidebar
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id
                        ? "flex justify-end my-2"
                        : "flex justify-start my-2"
                    }
                  >
                    {message.sender === id && !message.deleted && (
                      <button
                        onClick={() => deleteMessage(message._id)}
                        className="text-red-500 mr-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    <div
                      className={
                        "inline-block p-2 rounded-md text-sm max-w-xs " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.deleted ? (
                        "Message deleted"
                      ) : (
                        <>
                          {message.text}
                          {!message.deleted && message.file && (
                            <div>
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
                                {message.file.split("/").pop()}
                              </a>
                              {(message.file.endsWith(".png") ||
                                message.file.endsWith(".jpg") ||
                                message.file.endsWith(".jpeg")) && (
                                <img
                                  src={
                                    message.file.startsWith("http")
                                      ? message.file
                                      : axios.defaults.baseURL + "/uploads/" + message.file
                                  }
                                  alt="file"
                                  className="max-w-xs mt-1"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>

        {/* Message input */}
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2"
            />
            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              📎
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm"
            >
              ➤
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
