# Spec worker with a ChatGPT-signed-in Codex

The `codex` provider uses a ChatGPT subscription login, not an OpenAI API key. Keep its login in a dedicated directory outside both the repository checkout and `SPEC_WORKSPACE_ROOT`. The worker never mounts the operator's default `~/.codex` directory.

```bash
export FLOW_SPEC_CODEX_HOME="$HOME/flow-spec-codex-auth"
install -d -m 700 "$FLOW_SPEC_CODEX_HOME"
CODEX_HOME="$FLOW_SPEC_CODEX_HOME" codex login -c cli_auth_credentials_store=file
CODEX_HOME="$FLOW_SPEC_CODEX_HOME" codex login status -c cli_auth_credentials_store=file
stat -c '%a %n' "$FLOW_SPEC_CODEX_HOME" "$FLOW_SPEC_CODEX_HOME/auth.json"
```

The status must say `Logged in using ChatGPT`; permissions must be `700` for the directory and `600` for `auth.json`. Protect `auth.json` like a password. Do not commit it, paste it into chat, or put it in `.env.local`.

Set `SPEC_PROVIDER=codex` and `SPEC_CODEX_HOME` to the dedicated absolute directory in the worker's private environment configuration. Keep `SPEC_MODEL` aligned with a model accepted by the pinned Compozy Codex provider. `SPEC_PROVIDER_ACCOUNT_REF` is not needed for this mode.

This authentication setup alone does not make the worker runnable. The pinned runtime image, managed `flow-spec` agent, documentation proxy, and restricted `flow-spec-egress` network must still be provisioned and tested before enabling a Spec attempt. Do not run migrations as part of this authentication setup.
