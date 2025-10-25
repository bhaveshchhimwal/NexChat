import { uniqBy } from "lodash";
import { io } from "socket.io-client";

export function createSocketIO({ id, setMessages, showOnlinePeople, setSocket }) {
  let socket;

  function connect() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    socket = io(backendUrl, {
      withCredentials: true, // sends cookies for JWT
    });

    // Online users
    socket.on("online-users", (online) => {
      showOnlinePeople(online);
    });

    // Incoming messages
    socket.on("receive-message", (messageData) => {
      if (messageData.sender === id || messageData.recipient === id) {
        setMessages((prev) => {
          const filtered = prev.filter(
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
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected. Reconnecting...");
      // Socket.IO automatically reconnects, no need for manual reconnect
    });

    if (setSocket) setSocket(socket);

    return socket;
  }

  return connect;
}
