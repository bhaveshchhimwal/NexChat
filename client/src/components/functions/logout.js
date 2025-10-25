
export function createLogout({ socket, setSocket, setId, setUsername }) {
  return async function logout() {
    if (!socket) return;

    try {
      await fetch('http://localhost:4040/user/logout'|| process.env.VITE_BACKEND_URL + '/user/logout', {
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
