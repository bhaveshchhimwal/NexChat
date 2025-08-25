import { useContext, useEffect, useRef, useState, useCallback } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";
import aiLogo from "./assets/generative.png";

// Updated to use production backend URL
axios.defaults.baseURL = "https://nexchat223.onrender.com";
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
  const [aiLoading, setAiLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  const handleMessage = useCallback((ev) => {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData || "file" in messageData) {
      setMessages((prev) => {
        let filtered = prev.filter(
          (m) =>
            !(
              m.sender === messageData.sender &&
              m.recipient === messageData.recipient &&
              m.text === messageData.text &&
              m.file === messageData.file &&
              m._id.startsWith("temp")
            )
        );
        return uniqBy([...filtered, messageData], "_id");
      });
    }
  }, []);

  // ---------------- WebSocket connection ----------------
  useEffect(() => {
    let ws;

    function connectToWs() {
      // Updated WebSocket URL to use secure WebSocket (wss) for production
      ws = new WebSocket("wss://nexchat223.onrender.com");

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
  }, [handleMessage]);

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

    const tempId = "temp" + Date.now().toString() + Math.random().toString().slice(2, 11);
    const newSentMessage = {
      _id: tempId,
      sender: id,
      recipient: selectedUserId,
      text: newMessageText,
      file: file ? file.name : null,
      deleted: false,
    };
    setMessages((prev) => [...prev, newSentMessage]);

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
  }, [onlinePeople, id]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id").filter(message => {
    return (message.sender === selectedUserId && message.recipient === id) ||
           (message.sender === id && message.recipient === selectedUserId);
  });

  // -------------- AI Assistant ----------------
  async function askAI() {
    if (!aiQuestion.trim()) return;
    setAiResponse("");
    setAiLoading(true);
    try {
      const res = await axios.post("/api/ai", { message: aiQuestion });
      setAiResponse(res.data.reply);
      setAiQuestion("");
    } catch (err) {
      console.error(err);
      setAiResponse("Error getting response from AI.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  }

  // Close sidebar when selecting a user on mobile
  function selectUser(userId) {
    setSelectedUserId(userId);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }

  return (
    <div className="flex h-screen relative">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-30 p-3 flex items-center justify-between">
        <button
          onClick={() => setShowSidebar(true)}
          className="p-2 text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span className="font-medium text-gray-800">
          {selectedUserId ? (onlinePeople[selectedUserId] || offlinePeople[selectedUserId]?.username) : 'Chat'}
        </span>
        <button
          onClick={logout}
          className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm"
        >
          logout
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {showSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`bg-white flex flex-col transition-transform duration-300 ease-in-out z-50
        md:relative md:w-1/3 md:translate-x-0
        ${showSidebar 
          ? 'fixed inset-y-0 left-0 w-80 translate-x-0' 
          : 'fixed inset-y-0 left-0 w-80 -translate-x-full md:translate-x-0'
        }`}>
        
        {/* Mobile sidebar header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Logo />
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          <div className="hidden md:block">
            <Logo />
          </div>
          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeopleExclOurUser[userId]}
              onClick={() => selectUser(userId)}
              selected={userId === selectedUserId}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => selectUser(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        
        <div className="hidden md:flex p-2 text-center items-center justify-center">
          <span className="mr-2 text-sm text-gray-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm">logout</button>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex flex-col bg-blue-50 w-full md:w-2/3 p-2 md:p-2 relative pt-16 md:pt-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full flex-grow items-center justify-center">
              <div className="text-gray-300 text-center px-4">
                <div className="md:hidden mb-2">Tap the menu button to select a contact</div>
                <div className="hidden md:block">&larr; Select a person from the sidebar</div>
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
                    <div
                      className={
                        "inline-block p-2 rounded-md text-sm max-w-xs md:max-w-xs " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                      style={{ maxWidth: 'calc(100% - 2rem)' }}
                    >
                      {message.text && message.text.trim() && (
                        <div className={message.file ? "mb-2" : ""}>
                          {message.text}
                        </div>
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
                              onClick={() => window.open(
                                message.file.startsWith("http")
                                  ? message.file
                                  : axios.defaults.baseURL + "/uploads/" + message.file,
                                '_blank'
                              )}
                              onError={(e) => {
                                e.target.style.display = 'none';
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

        {/* Message input */}
        {!!selectedUserId && (
          <form className="flex gap-2 relative" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2 text-sm md:text-base"
            />

            <button
              type="button"
              onClick={() => setShowAIAssistant((prev) => !prev)}
              className="bg-blue-200 p-2 text-gray-600 rounded-sm border border-blue-200 flex items-center justify-center hover:bg-blue-300 transition-colors"
              title="AI Assistant"
            >
              <img src={aiLogo} alt="AI Assistant" className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200 hover:bg-blue-300 transition-colors">
              <input type="file" className="hidden" onChange={sendFile} />
              <span className="text-sm md:text-base">📎</span>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 text-white rounded-sm hover:bg-blue-600 transition-colors"
            >
              <span className="text-sm md:text-base">➤</span>
            </button>

            {showAIAssistant && (
              <div className={`absolute bottom-12 z-50 bg-white shadow-lg rounded-md border flex flex-col
                right-0 w-full max-w-sm h-80
                md:right-16 md:w-96 md:h-96`}>
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="text-sm font-semibold">AI Assistant</h3>
                  <button
                    onClick={() => setShowAIAssistant(false)}
                    className="text-gray-500 hover:text-gray-700 text-lg font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="flex-grow flex flex-col overflow-hidden">
                  <div className="flex-grow overflow-y-auto p-3 bg-gray-50">
                    {aiLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin border-2 border-gray-300 border-t-blue-500 w-5 h-5 rounded-full"></div>
                      </div>
                    ) : aiResponse ? (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {aiResponse}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 text-center">
                        AI response will appear here...
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t bg-white">
                    <textarea
                      className="w-full border rounded-md p-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="Ask your question..."
                      rows="2"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyDown={handleAiKeyDown}
                    ></textarea>
                    <button
                      type="button"
                      onClick={askAI}
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="mt-2 w-full bg-blue-500 text-white text-sm py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {aiLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
} 