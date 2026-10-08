#!/bin/sh
set -eu

HOME=/var/lib/compozy
COMPOZY_HOME="$HOME/.compozy"
SOCKET=/run/flow-spec/daemon.sock
GRANTS_ROOT="${FLOW_GRANTS_ROOT:-/run/grants}"
export HOME COMPOZY_HOME

mkdir -p "$COMPOZY_HOME/agents/flow-spec"
cp /opt/flow-runtime/agents/flow-spec/AGENT.md "$COMPOZY_HOME/agents/flow-spec/AGENT.md"

provider_block() {
  overlay=$1
  kind=$2
  connection=$3
  home="$GRANTS_ROOT/$connection"
  case "$kind" in
    codex)
      command="env CODEX_HOME='$home' npx -y @agentclientprotocol/codex-acp"
      status="env CODEX_HOME='$home' codex login status -c cli_auth_credentials_store=file"
      ;;
    claude)
      command="env CLAUDE_CONFIG_DIR='$home' npx -y @agentclientprotocol/claude-agent-acp"
      status="env CLAUDE_CONFIG_DIR='$home' claude auth status"
      ;;
    *) exit 64 ;;
  esac
  printf '\n[providers.%s]\nauth_mode = "native_cli"\nauth_status_command = "%s"\ncommand = "%s"\ndisplay_name = "%s"\nenv_policy = "filtered"\nhome_policy = "operator"\nruntime_provider = "%s"\n' "$overlay" "$status" "$command" "$overlay" "$kind"
}

valid_entry() {
  case "$1" in
    *[!a-z0-9-]*|"") return 1 ;;
  esac
}

valid_connection() {
  case "$1" in
    *[!0-9a-f-]*|"") return 1 ;;
  esac
}

{
  printf '[daemon]\nsocket = "%s"\n\n[http]\nhost = "127.0.0.1"\nport = 2123\n' "$SOCKET"
  IFS=';'
  for entry in ${FLOW_PROVIDERS:-}; do
    overlay=${entry%%:*}
    rest=${entry#*:}
    kind=${rest%%:*}
    connection=${rest#*:}
    valid_entry "$overlay" && valid_entry "$kind" && valid_connection "$connection" || exit 64
    provider_block "$overlay" "$kind" "$connection"
  done
  unset IFS
} > "$COMPOZY_HOME/config.toml"

exec compozy daemon start --foreground
