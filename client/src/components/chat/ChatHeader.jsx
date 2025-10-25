import Logo from "../logo/Logo.jsx";

export default function ChatHeader({ selectedUserId, onlinePeople, offlinePeople, showSidebar, setShowSidebar }) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-30 p-3 flex items-center justify-between">
      <button onClick={() => setShowSidebar(true)} className="p-2 text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <span className="font-medium text-gray-800">
        {selectedUserId ? (onlinePeople[selectedUserId] || offlinePeople[selectedUserId]?.username) : 'Chat'}
      </span>
      <div></div>
    </div>
  );
}
