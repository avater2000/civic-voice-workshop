import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { AdminPage } from "./pages/AdminPage";
import { CitizenPage } from "./pages/CitizenPage";
import { LoginPage } from "./pages/LoginPage";
import { removeSession, restoreSession, saveSession } from "./session";
import { applyTheme, getInitialTheme, saveTheme } from "./theme";

export default function App() {
  const [session, setSession] = useState(() => restoreSession(window.localStorage));
  const [theme, setTheme] = useState(() => getInitialTheme(
    window.localStorage,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  ));

  useEffect(() => {
    applyTheme(document, theme);
    saveTheme(window.localStorage, theme);
  }, [theme]);

  function handleLogin(nextSession) {
    saveSession(window.localStorage, nextSession);
    setSession(nextSession);
  }

  function handleLogout() {
    removeSession(window.localStorage);
    setSession(null);
  }

  return (
    <>
      <Header
        user={session?.user}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />
      {!session && <LoginPage onLogin={handleLogin} />}
      {session?.user.role === "citizen" && <CitizenPage user={session.user} />}
      {session?.user.role === "admin" && <AdminPage session={session} />}
    </>
  );
}
