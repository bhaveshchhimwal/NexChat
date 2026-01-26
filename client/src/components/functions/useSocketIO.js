import { uniqBy } from "lodash";
import { io } from "socket.io-client";

export function createSocketIO({ id, setMessages, showOnlinePeople, setSocket }) {
  let socket;

  function connect() {
    const backendUrl = "https://nexchat223.onrender.com";

    socket = io(backendUrl, {
      withCredentials: true, 
    });

    
    socket.on("online-users", (online) => {
      showOnlinePeople(online);
    });

    
    socket.on("receive-message", (messageData) => {
      if (messageData.sender === id || messageData.recipient === id) {
        setMessages((prev) => {
      
          const filtered = prev.filter((m) => {
           
            if (!m._id.startsWith("temp")) return true;
            
            return !(
              m.sender === messageData.sender &&
              m.recipient === messageData.recipient
            );
          });
          
          return uniqBy([...filtered, messageData], "_id");
        });
      }
    });


    socket.on("message-updated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMsg._id
            ? {
                ...msg,
                text: updatedMsg.text,
                updatedAt: updatedMsg.updatedAt,
                isEdited: updatedMsg.isEdited,
              }
            : msg
        )
      );
    });

    socket.on("message-deleted", ({ _id }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === _id
            ? {
                ...msg,
                text: "message deleted",
                file: null,
                isDeleted: true,
              }
            : msg
        )
      );
    });

   
    socket.on("connect", () => {
      console.log(" Socket.IO connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.warn(" Socket.IO disconnected. Attempting reconnect...");
    });

    if (setSocket) setSocket(socket);

    return socket;
  }

  return connect;
}
