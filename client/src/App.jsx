import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4040';
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <div style={{ width: '100%', minHeight: '100vh', boxSizing: 'border-box' }}>
        <Routes />
      </div>
    </UserContextProvider>
  )
}

export default App;
