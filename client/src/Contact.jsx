import Avatar from "./Avatar.jsx";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div
      key={id}
      onClick={() => onClick(id)}
      className={`flex items-center gap-3 cursor-pointer px-4 py-3 transition-all 
        ${selected ? "bg-blue-100 border-l-4 border-blue-500" : "hover:bg-gray-100"} `}
    >
      <Avatar online={online} username={username} userId={id} size="md" />
      <span className="text-gray-800 font-medium text-lg">{username}</span>
    </div>
  );
}
