export function createLogout({ socket, setSocket, setId, setUsername }) {
  return async function logout() {
    try {
      const backendUrl = "https://nexchat223.onrender.com";

     
      await fetch(`${backendUrl}/user/logout`, {
        method: 'POST',
        credentials: 'include', 
      });

      if (socket) socket.disconnect();

      setSocket(null);
      setId(null);
      setUsername(null);

    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
}
