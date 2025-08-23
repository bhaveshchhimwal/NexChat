import Avatar from "./Avatar.jsx";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div
      key={id}
      onClick={() => onClick(id)}
      className={`flex items-center gap-4 p-4 cursor-pointer rounded-lg transition
        ${selected ? "bg-blue-100" : "hover:bg-gray-100"}`}
    >
      <Avatar online={online} username={username} userId={id} size="md" />

      {/* Username */}
      <span
        className={`text-xl font-bold text-gray-600 tracking-wide 
        ${selected ? "text-gray-800" : ""}`}
        style={{
          textShadow: "0px 2px 3px rgba(0,0,0,0.2)", // stronger but still soft
        }}
      >
        {username}
      </span>
    </div>
  );
}
