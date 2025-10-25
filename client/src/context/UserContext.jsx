import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(() => {
    const baseUrl = "https://nexchat223.onrender.com";

    axios
      .get(`${baseUrl}/user/profile`, { withCredentials: true })
      .then((response) => {
        // backend returns { userId, username } from profile
        const userData = response.data;
        setId(userData.userId || userData.id);
        setUsername(userData.username);
      })
      .catch((err) => {
        console.error("Failed to fetch user profile:", err);
      });
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
