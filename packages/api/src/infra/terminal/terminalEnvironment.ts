const ALLOWED_NAMES = new Set(["PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LANGUAGE", "TERM", "COLORTERM", "TZ", "TMPDIR", "DISPLAY", "WAYLAND_DISPLAY", "XAUTHORITY", "DBUS_SESSION_BUS_ADDRESS", "SESSION_MANAGER", "SSH_AUTH_SOCK", "CLAUDE_CONFIG_DIR", "http_proxy", "https_proxy", "no_proxy", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"]);
const ALLOWED_PREFIXES = ["LC_", "XDG_", "GNOME_", "GTK_", "QT_"];

function isAllowed(name: string) {
  return ALLOWED_NAMES.has(name) || ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function terminalEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const entries = Object.entries(source).filter(([name, value]) => value !== undefined && isAllowed(name));
  return Object.fromEntries(entries) as NodeJS.ProcessEnv;
}
