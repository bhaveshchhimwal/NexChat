export function createLogout({ socket, setSocket, setId, setUsername }) {
  return async function logout() {
    try {
      const backendUrl = "https://nexchat223.onrender.com";

      // Call backend logout to clear cookie
      await fetch(`${backendUrl}/user/logout`, {
        method: 'POST',
        credentials: 'include', // important to send JWT cookie
      });

      // Disconnect socket if exists
      if (socket) socket.disconnect();

      // Reset frontend state
      setSocket(null);
      setId(null);
      setUsername(null);

    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
}
