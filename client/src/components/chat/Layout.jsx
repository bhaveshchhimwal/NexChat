import { useContext, useEffect, useRef, useState } from "react";
import { uniqBy } from "lodash";
import axios from "axios";
import { UserContext } from "../../context/UserContext.jsx";
import { MobileHeader } from "./MobileHeader.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { ChatWindow } from "./ChatWindow.jsx";
import { MessageInput } from "./MessageInput.jsx";
import aiLogo from "../../assets/generative.png"; 
import { createSendMessage } from "../functions/sendMessage.js"; 
import { createSendFile } from "../functions/sendFile.js";
import { createAskAI, createHandleAiKeyDown } from "../functions/aiFunctions.js";
import { createLogout } from "../functions/logout.js";
import { createShowOnlinePeople } from "../functions/onlineFunctions.js";
import { createSelectUser } from "../functions/sidebarFunctions.js";
import { createSocketIO } from "../functions/useSocketIO.js"; 

axios.defaults.baseURL = "https://nexchat223.onrender.com";
axios.defaults.withCredentials = true;

export default function Layout() {
  const { username, id, setId, setUsername } = useContext(UserContext);

  const [socket, setSocket] = useState(null);
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
  const divUnderMessages = useRef();

  const showOnlinePeople = createShowOnlinePeople(setOnlinePeople);
  const handleSelectUser = createSelectUser(setSelectedUserId, setShowSidebar);

  useEffect(() => {
    const socketInstance = createSocketIO({
      id,
      setMessages,
      showOnlinePeople,
      setSocket,
    })();

    return () => {
      if (socketInstance) socketInstance.disconnect();
    };
  }, [id]);

  const sendMessage = createSendMessage({
    socket, 
    selectedUserId,
    messages,
    setMessages,
    newMessageText,
    setNewMessageText,
    id,
  });

  const sendFile = createSendFile(sendMessage);
  const askAI = createAskAI({ aiQuestion, setAiResponse, setAiQuestion, setAiLoading });
  const handleAiKeyDown = createHandleAiKeyDown(askAI);
  const logoutFn = createLogout({ socket, setSocket, setId, setUsername });

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) div.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    axios.get("/user/people").then((res) => {
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
      axios.get("/message/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id").filter(
    (message) =>
      (message.sender === selectedUserId && message.recipient === id) ||
      (message.sender === id && message.recipient === selectedUserId)
  );

  return (
    <div className="flex h-screen relative">
      
      <MobileHeader
        selectedUserId={selectedUserId}
        onlinePeople={onlinePeople}
        offlinePeople={offlinePeople}
        setShowSidebar={setShowSidebar}
      />

      <Sidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        onlinePeopleExclOurUser={onlinePeopleExclOurUser}
        offlinePeople={offlinePeople}
        selectUser={handleSelectUser}
        selectedUserId={selectedUserId}
        username={username}
        logout={logoutFn}
      />

      <div className="flex flex-col bg-blue-50 w-full md:w-2/3 p-2 md:p-2 relative pt-16 md:pt-2">
        <ChatWindow
          messages={messages}
          messagesWithoutDupes={messagesWithoutDupes}
          id={id}
          divUnderMessages={divUnderMessages}
          socket={socket}
          selectedChat={selectedUserId}    
        />

        {!!selectedUserId && (
          <MessageInput
            newMessageText={newMessageText}
            setNewMessageText={setNewMessageText}
            sendMessage={sendMessage}
            sendFile={sendFile}
            showAIAssistant={showAIAssistant}
            setShowAIAssistant={setShowAIAssistant}
            aiLogo={aiLogo}
            aiQuestion={aiQuestion}
            setAiQuestion={setAiQuestion}
            aiResponse={aiResponse}
            aiLoading={aiLoading}
            askAI={askAI}
            handleAiKeyDown={handleAiKeyDown}
          />
        )}
      </div>
    </div>
  );
}
