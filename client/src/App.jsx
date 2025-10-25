import axios from "axios";
import { UserContextProvider } from "./context/UserContext.jsx";
import Routes from "./routes/Routes.jsx";

function App() {

  const backendUrl = import.meta.env.VITE_BACKEND_URL 
    || (import.meta.env.MODE === 'development' 
        ? 'http://localhost:4040' 
        : 'https://nexchat223.onrender.com');

  axios.defaults.baseURL = backendUrl;
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <div style={{ width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
        <Routes />
      </div>
    </UserContextProvider>
  );
}

export default App;
