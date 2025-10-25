export function createSelectUser(setSelectedUserId, setShowSidebar) {
  return function selectUser(userId) {
    setSelectedUserId(userId);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };
}
