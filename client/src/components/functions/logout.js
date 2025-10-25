export function createLogout({ socket, setSocket, setId, setUsername }) {
  return async function logout() {
    if (!socket) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4040';
      await fetch(`${backendUrl}/user/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      socket.disconnect();
      setSocket(null);
      setId(null);
      setUsername(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
}
