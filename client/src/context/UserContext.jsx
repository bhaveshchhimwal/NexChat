import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);

  useEffect(() => {
    const baseUrl =
      import.meta.env.VITE_BACKEND_URL ||
      (import.meta.env.MODE === "development"
        ? "http://localhost:4040"
        : "https://nexchat223.onrender.com");

    axios
      .get(`${baseUrl}/user/profile`, { withCredentials: true })
      .then((response) => {
        setId(response.data.userId);
        setUsername(response.data.username);
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
