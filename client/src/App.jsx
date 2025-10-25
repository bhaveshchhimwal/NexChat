import axios from "axios";
import { UserContextProvider } from "./context/UserContext.jsx";
import Routes from "./routes/Routes.jsx";

function App() {
  // Base URL: use environment variable
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Configure Axios
  axios.defaults.baseURL = backendUrl;
  axios.defaults.withCredentials = true;
console.log(import.meta.env.VITE_BACKEND_URL);

  return (
    <UserContextProvider>
      <div style={{ width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
        <Routes />
      </div>
    </UserContextProvider>
  );
} 

export default App;
