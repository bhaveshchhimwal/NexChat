import axios from "axios";
import { UserContextProvider } from "./context/UserContext.jsx";
import Routes from "./routes/Routes.jsx";

function App() {

  axios.defaults.baseURL = import.meta.env.VITE_API_URL 
    || (import.meta.env.MODE === 'development' 
        ? 'http://localhost:4040' 
        : 'https://nexchat223.onrender.com');
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
