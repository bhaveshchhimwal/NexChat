import RegisterAndLoginForm from "../components/auth/RegisterAndLoginForm.jsx";
import {useContext} from "react";
import {UserContext} from "../context/UserContext.jsx";
import  Layout from "../components/chat/Layout.jsx";

export default function Routes() {
  const {username, id} = useContext(UserContext);

  if (username) {
    return <Layout />;
  }

  return (
    <RegisterAndLoginForm />
  );
}