import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";
import { Trash2 } from "lucide-react";
import aiLogo from "./assets/generative.png";

axios.defaults.baseURL = "http://localhost:4040";
axios.defaults.withCredentials = true;

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
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

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData || "file" in messageData) {
      if (messageData.sender === selectedUserId || messageData.sender === id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === messageData._id)) return prev; // ✅ avoid duplicates
          return [...prev, messageData];
        });
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

  function logout() {
    axios.post("/logout").then(() => {
      if (ws) ws.close();
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

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

    setNewMessageText("");
  }

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

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) div.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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

  async function askAI() {
    if (!aiQuestion.trim()) return;
    try {
      const res = await axios.post("/api/ai", { message: aiQuestion });
      setAiResponse(res.data.reply);
    } catch (err) {
      console.error(err);
      setAiResponse("Error getting response from AI.");
    }
  }

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
      <div className="flex flex-col bg-blue-50 w-2/3 p-2 relative">
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
          <form className="flex gap-2 relative" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2"
            />

            <button
              type="button"
              onClick={() => setShowAIAssistant((prev) => !prev)}
              className="bg-blue-200 p-2 text-gray-600 rounded-sm border border-blue-200 flex items-center justify-center"
              title="AI Assistant"
            >
              <img src={aiLogo} alt="AI Assistant" className="w-5 h-5" />
            </button>

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

            {showAIAssistant && (
              <div className="absolute bottom-12 right-16 w-64 bg-white shadow-lg rounded-md p-3 border">
                <h3 className="text-sm font-semibold mb-2">Ask AI Assistant</h3>
                <textarea
                  className="w-full border rounded-md p-2 text-sm focus:outline-none"
                  placeholder="Ask your question..."
                  rows="3"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                ></textarea>
                <button
                  type="button"
                  onClick={askAI}
                  className="mt-2 w-full bg-blue-500 text-white text-sm py-1 rounded-md hover:bg-blue-600"
                >
                  Send
                </button>
                {aiResponse && (
                  <div className="mt-2 p-2 text-sm bg-gray-50 border rounded">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
