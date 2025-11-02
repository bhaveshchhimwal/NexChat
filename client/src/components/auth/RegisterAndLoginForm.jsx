import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../../context/UserContext.jsx";
import Logo from "../logo/Logo.jsx";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const [error, setError] = useState("");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
async function handleSubmit(ev) {
  ev.preventDefault();
  setError("");

  if (isLoginOrRegister === "register" && password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

const baseUrl = "https://nexchat223.onrender.com";
const endpoint = isLoginOrRegister === "register" ? "register" : "login";
const url = `${baseUrl}/user/${endpoint}`;


  try {
    const payload = isLoginOrRegister === "register"
      ? { username, password, confirmPassword }
      : { username, password };

    const { data } = await axios.post(url, payload, { withCredentials: true });

    setLoggedInUsername(username);
    setId(data.id);


    if (isLoginOrRegister === "register") setConfirmPassword("");
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      setError(err.response.data.message);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }
}


  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-80 text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isLoginOrRegister === "login"
              ? "Welcome back! Login to your account"
              : "Create your NexChat account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={username}
            onChange={(ev) => setUsername(ev.target.value)}
            type="text"
            placeholder="Username"
            className="block w-full rounded-lg p-2 border border-gray-300 focus:ring-2 focus:ring-purple-400 outline-none"
          />
          <input
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            type="password"
            placeholder="Password"
            className="block w-full rounded-lg p-2 border border-gray-300 focus:ring-2 focus:ring-purple-400 outline-none"
          />

          {isLoginOrRegister === "register" && (
            <input
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              type="password"
              placeholder="Confirm Password"
              className="block w-full rounded-lg p-2 border border-gray-300 focus:ring-2 focus:ring-purple-400 outline-none"
            />
          )}


          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition">
            {isLoginOrRegister === "register" ? "Register" : "Login"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          {isLoginOrRegister === "register" ? (
            <p>
              Already a member?
              <button
                type="button"
                className="ml-1 text-purple-600 font-medium hover:underline"
                onClick={() => setIsLoginOrRegister("login")}
              >
                Login here
              </button>
            </p>
          ) : (
            <p>
              Don’t have an account?
              <button
                type="button"
                className="ml-1 text-purple-600 font-medium hover:underline"
                onClick={() => setIsLoginOrRegister("register")}
              >
                Register
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
