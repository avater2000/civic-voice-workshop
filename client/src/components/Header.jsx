export function Header({ user, onLogout, theme, onThemeToggle }) {
  return (
    <header className="site-header">
      <a className="brand" href="/">
        <span className="brand-mark">C</span>
        <span>CivicVoice</span>
      </a>
      <div className="header-actions">
        <button
          className="theme-toggle"
          type="button"
          aria-pressed={theme === "dark"}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={onThemeToggle}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        {user && <span className="signed-in">Signed in as {user.name}</span>}
        {user && <button className="text-button" onClick={onLogout}>Sign out</button>}
      </div>
    </header>
  );
}
