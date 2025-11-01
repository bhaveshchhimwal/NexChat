import Logo from "../logo/Logo.jsx";
import Contact from "./Contact.jsx";

export  function Sidebar({
  onlinePeopleExclOurUser,
  offlinePeople,
  selectedUserId,
  selectUser,
  username,
  logout,
  showSidebar,
  setShowSidebar
}) {
  return (
    <div className={`bg-white flex flex-col transition-transform duration-300 ease-in-out z-50
      md:relative md:w-1/3 md:translate-x-0
      ${showSidebar
        ? 'fixed inset-y-0 left-0 w-80 translate-x-0'
        : 'fixed inset-y-0 left-0 w-80 -translate-x-full md:translate-x-0'
      }`}>

      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Logo />
        </div>
        <button
          onClick={() => setShowSidebar(false)}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="hidden md:block">
          <Logo />
        </div>
        {Object.keys(onlinePeopleExclOurUser).map((userId) => (
          <Contact
            key={userId}
            id={userId}
            online={true}
            username={onlinePeopleExclOurUser[userId]}
            onClick={() => selectUser(userId)}
            selected={userId === selectedUserId}
          />
        ))}
        {Object.keys(offlinePeople).map((userId) => (
          <Contact
            key={userId}
            id={userId}
            online={false}
            username={offlinePeople[userId].username}
            onClick={() => selectUser(userId)}
            selected={userId === selectedUserId}
          />
        ))}
      </div>


      <div className="flex p-2 text-center items-center justify-center border-t">
        <span className="mr-2 text-sm text-gray-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
          <span className="ml-1">{username}</span>
        </span>
        <button
          onClick={logout}
          className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm hover:bg-blue-200 transition-colors">
          logout
        </button>
      </div>
    </div>
  );
}
