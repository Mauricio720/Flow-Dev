import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def send(process, message):
    process.stdin.write(json.dumps(message) + "\n")
    process.stdin.flush()


def receive(process, request_id):
    while True:
        line = process.stdout.readline()
        if not line:
            raise RuntimeError("app-server encerrou antes da resposta")
        message = json.loads(line)
        if message.get("id") == request_id:
            return message


def request(process, request_id, method, params):
    send(process, {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
    response = receive(process, request_id)
    if "error" in response:
        raise RuntimeError(f"{method} rejeitado")
    return response.get("result", {})


def start_thread(process, request_id, workspace, model, approval, sandbox, ephemeral=True):
    result = request(process, request_id, "thread/start", {"cwd": workspace, "model": model, "approvalPolicy": approval, "sandbox": sandbox, "ephemeral": ephemeral})
    return result["thread"]["id"]


def question_turn(process, request_id, thread_id):
    send(process, {"jsonrpc": "2.0", "id": request_id, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": "Use a ferramenta request_user_input para perguntar se devo continuar, com opções Sim e Não. Depois de receber a resposta, responda apenas recebido."}]}})
    seen = False
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("method") == "item/tool/requestUserInput":
            seen = True
            send_question_answer(process, message)
        if message.get("method") == "turn/completed":
            return seen, message["params"]["turn"]["status"]


def send_question_answer(process, message):
    params = message["params"]
    answers = {}
    for question in params["questions"]:
        options = question.get("options") or []
        answers[question["id"]] = {"answers": [options[0]["label"] if options else "Sim"]}
    send(process, {"jsonrpc": "2.0", "id": message["id"], "result": {"answers": answers}})


def permission_turn(process, request_id, workspace, model, mode):
    approval, sandbox = mode
    thread_id = start_thread(process, request_id, workspace, model, approval, sandbox)
    prompt = f"No diretório atual, crie o arquivo {request_id}.txt com a palavra OK. Depois execute separadamente ls, cat README.md, pwd e python3 -c 'print(\"CODEX_UNTRUSTED_SENTINEL\")'. Não execute outras ações."
    send(process, {"jsonrpc": "2.0", "id": request_id + 100, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": prompt}]}})
    approvals = []
    while True:
        message = json.loads(process.stdout.readline())
        method = message.get("method", "")
        if method in ("item/commandExecution/requestApproval", "item/fileChange/requestApproval"):
            params = message.get("params", {})
            command = params.get("command", "")
            actions = params.get("commandActions", [])
            kinds = sorted({action.get("type", "unknown") for action in actions})
            kind = "python" if "python3" in command else "pwd" if "pwd" in command else "cat" if "cat README.md" in command else "ls" if "ls" in command else "file_write"
            approvals.append(f"{method}:{kind}:{','.join(kinds)}")
            send(process, {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": "accept"}})
        if method == "turn/completed":
            return approvals, message["params"]["turn"]["status"]


def permission_matrix(process, workspace, models):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    Path(workspace, "README.md").write_text("SPIKE_READ_ONLY\n")
    modes = [("never", "danger-full-access"), ("untrusted", "workspace-write"), ("untrusted", "read-only")]
    for index, mode in enumerate(modes, 20):
        approvals, status = permission_turn(process, index, workspace, model, mode)
        created = Path(workspace, f"{index}.txt").is_file()
        print(f"permissões={mode[0]}/{mode[1]}; approvals={approvals}; arquivo={created}; turn={status}")


def policy_alternatives(process, workspace, models):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    modes = [("on-request", "read-only"), ("on-request", "workspace-write")]
    for index, mode in enumerate(modes, 30):
        approvals, status = permission_turn(process, index, workspace, model, mode)
        print(f"alternativa={mode[0]}/{mode[1]}; approvals={approvals}; turn={status}")


def file_edit_probe(process, workspace, models):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    thread_id = start_thread(process, 35, workspace, model, "untrusted", "workspace-write")
    send(process, {"jsonrpc": "2.0", "id": 135, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": "Use somente a ferramenta de edição nativa do Codex, sem shell, para criar native-edit.txt com a palavra OK."}]}})
    approvals = []
    while True:
        message = json.loads(process.stdout.readline())
        method = message.get("method", "")
        if method in ("item/commandExecution/requestApproval", "item/fileChange/requestApproval"):
            approvals.append(method)
            send(process, {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": "accept"}})
        if method == "turn/completed":
            exists = Path(workspace, "native-edit.txt").is_file()
            print(f"aprovações={approvals}; arquivo criado={exists}; turn={message['params']['turn']['status']}")
            return


def repeated_command_turn(process, request_id, workspace, model, repeat):
    thread_id = start_thread(process, request_id, workspace, model, "untrusted", "workspace-write")
    count = 0
    repetitions = "duas vezes em chamadas separadas" if repeat else "uma vez"
    prompt = f"Execute {repetitions} exatamente o comando python3 -c \"print('FLOW_DEV_SESSION_APPROVAL')\". Não execute outros comandos."
    send(process, {"jsonrpc": "2.0", "id": request_id + 100, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": prompt}]}})
    while True:
        message = json.loads(process.stdout.readline())
        method = message.get("method", "")
        if method == "item/commandExecution/requestApproval":
            count += 1
            decision = "acceptForSession" if repeat and count == 1 else "accept"
            send(process, {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": decision}})
        if method == "turn/completed":
            return count, message["params"]["turn"]["status"]


def persistent_rule_turn(process, request_id, workspace, model, persist):
    thread_id = start_thread(process, request_id, workspace, model, "untrusted", "workspace-write")
    prompt = "Execute uma vez exatamente python3 -c \"print('FLOW_DEV_PERSISTENT_RULE')\". Não execute outros comandos."
    send(process, {"jsonrpc": "2.0", "id": request_id + 100, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": prompt}]}})
    count = 0
    amendment = None
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("method") == "item/commandExecution/requestApproval":
            count += 1
            if persist:
                option = next((value for value in message["params"].get("availableDecisions", []) if isinstance(value, dict) and "acceptWithExecpolicyAmendment" in value), None)
                if option:
                    amendment = option["acceptWithExecpolicyAmendment"]["execpolicy_amendment"]
                    decision = {"acceptWithExecpolicyAmendment": {"execpolicy_amendment": amendment}}
                else:
                    decision = "accept"
            else:
                decision = "accept"
            send(process, {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": decision}})
        if message.get("method") == "turn/completed":
            return count, amendment, message["params"]["turn"]["status"]


def persistent_rule_probe(process, workspace, models):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    first = persistent_rule_turn(process, 50, workspace, model, True)
    other_project = Path(workspace).parent / "flow-dev-codex-other-project"
    other_project.mkdir(exist_ok=True)
    second = persistent_rule_turn(process, 51, str(other_project), model, False)
    matched = bool(first[1]) and second[0] == 0
    print(f"regra proposta={bool(first[1])}; aprovações no projeto seguinte={second[0]}; persistiu no perfil temporário={matched}; turns={first[2]}/{second[2]}")


def launch_server(codex, workspace, env):
    process = subprocess.Popen([codex, "app-server", "--listen", "stdio://"], cwd=workspace, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)
    send(process, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"clientInfo": {"name": "flow_dev_spike", "title": "Flow Dev Spike", "version": "0.1.0"}}})
    if "error" in receive(process, 1):
        raise RuntimeError("segundo app-server não inicializou")
    send(process, {"jsonrpc": "2.0", "method": "initialized"})
    return process


def wait_turn(process, request_id, thread_id, prompt):
    send(process, {"jsonrpc": "2.0", "id": request_id, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": prompt}]}})
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("method") == "turn/completed":
            return message["params"]["turn"]["status"]


def wait_turn_text(process, request_id, thread_id, prompt):
    send(process, {"jsonrpc": "2.0", "id": request_id, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": prompt}]}})
    output = ""
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("id") == request_id and "error" in message:
            return output.strip(), f"error:{message['error'].get('code', 'rpc')}"
        if message.get("method") == "item/agentMessage/delta":
            output += message.get("params", {}).get("delta", "")
        if message.get("method") == "turn/completed":
            return output.strip(), message["params"]["turn"]["status"]


def kill_server(process):
    os.killpg(process.pid, signal.SIGKILL)
    process.wait(timeout=5)


def resume_probe(process, workspace, models, codex, env):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    current = process
    try:
        idle_thread = start_thread(current, 70, workspace, model, "never", "danger-full-access", ephemeral=False)
        first, first_status = wait_turn_text(current, 170, idle_thread, "Memorize o token SPIKE_IDLE_73. Responda somente pronto.")
        kill_server(current)
        current = launch_server(codex, workspace, env)
        resumed = send_resume(current, idle_thread, workspace, model)
        answer, resume_status = wait_turn_text(current, 171, idle_thread, "Qual token eu pedi para memorizar? Responda somente o token.")
        active_thread = start_thread(current, 72, workspace, model, "never", "danger-full-access", ephemeral=False)
        send(current, {"jsonrpc": "2.0", "id": 172, "method": "turn/start", "params": {"threadId": active_thread, "input": [{"type": "text", "text": "Execute exatamente sleep 30 e depois responda concluído."}]}})
        wait_for_sleep_start(current)
        kill_server(current)
        current = launch_server(codex, workspace, env)
        reply = send_resume(current, active_thread, workspace, model)
        after_command, after_status = wait_turn_text(current, 173, active_thread, "Qual comando estava em execução quando o processo caiu? Responda somente o comando.") if reply[0] else ("", reply[1])
        print(f"ociosa: inicial={first_status}/{first}; retomada={resumed[0]}/{resume_status}/{answer}; durante comando: {reply[0]} {after_status}/{after_command}")
        return current
    except BaseException:
        if current.poll() is None:
            kill_server(current)
        raise


def send_resume(process, thread_id, workspace, model):
    send(process, {"jsonrpc": "2.0", "id": 2, "method": "thread/resume", "params": {"threadId": thread_id, "cwd": workspace, "model": model, "approvalPolicy": "never", "sandbox": "danger-full-access"}})
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("id") != 2:
            continue
        if "error" in message:
            return False, str(message["error"].get("code", "erro"))
        return True, "resumed"


def interrupt_probe(process, workspace, models, codex, env):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    thread_id = start_thread(process, 60, workspace, model, "never", "danger-full-access")
    send(process, {"jsonrpc": "2.0", "id": 160, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "text", "text": "Execute exatamente sleep 30 e depois responda concluído."}]}})
    turn_id = wait_for_sleep_start(process)
    other = launch_server(codex, workspace, env)
    try:
        other_thread = start_thread(other, 61, workspace, model, "never", "danger-full-access")
        first_other = wait_turn(other, 161, other_thread, "Responda exatamente B_SESSION_OK.")
        started = time.monotonic()
        send(process, {"jsonrpc": "2.0", "id": 162, "method": "turn/interrupt", "params": {"threadId": thread_id, "turnId": turn_id}})
        interrupted = wait_turn_status(process, 162)
        elapsed = time.monotonic() - started
        second_other = wait_turn(other, 163, other_thread, "Responda exatamente B_SESSION_STILL_ALIVE.")
        print(f"turn interrompida={interrupted}; segundos={elapsed:.2f}; outra sessão={first_other}/{second_other}")
    finally:
        os.killpg(other.pid, signal.SIGTERM)
        other.wait(timeout=5)


def wait_for_sleep_start(process):
    while True:
        message = json.loads(process.stdout.readline())
        params = message.get("params", {})
        item = params.get("item", {})
        if message.get("method") == "item/started" and item.get("type") == "commandExecution" and "sleep 30" in item.get("command", ""):
            return params["turnId"]


def wait_turn_status(process, request_id):
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("id") == request_id:
            continue
        if message.get("method") == "turn/completed":
            return message["params"]["turn"]["status"]


def session_approval_probe(process, workspace, models, env):
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    same_session = repeated_command_turn(process, 40, workspace, model, True)
    os.killpg(process.pid, signal.SIGTERM)
    process.wait(timeout=5)
    process = subprocess.Popen(process.args, cwd=workspace, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)
    send(process, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"clientInfo": {"name": "flow_dev_spike", "title": "Flow Dev Spike", "version": "0.1.0"}}})
    if "error" in receive(process, 1):
        raise RuntimeError("segundo app-server não inicializou")
    send(process, {"jsonrpc": "2.0", "method": "initialized"})
    new_session = repeated_command_turn(process, 41, workspace, model, False)
    print(f"aceite nesta sessão: pedidos={same_session[0]}, turn={same_session[1]}; sessão nova: pedidos={new_session[0]}, turn={new_session[1]}")
    return process


def question_matrix(process, workspace, models):
    model = next((item["id"] for item in models if item["isDefault"] and not item["hidden"]), models[0]["id"])
    modes = [("never", "danger-full-access"), ("untrusted", "workspace-write"), ("untrusted", "read-only")]
    for index, (approval, sandbox) in enumerate(modes, 10):
        thread_id = start_thread(process, index, workspace, model, approval, sandbox)
        seen, status = question_turn(process, index + 100, thread_id)
        print(f"permissões={approval}/{sandbox}; requestUserInput={seen}; turn={status}")


def prepare_skills(workspace):
    context_skill = Path(workspace, "context", "skills", "spec-writer")
    clone_skill = Path(workspace, ".agents", "skills", "spec-writer")
    context_skill.mkdir(parents=True, exist_ok=True)
    clone_skill.mkdir(parents=True, exist_ok=True)
    (context_skill / "SKILL.md").write_text("---\nname: spec-writer\ndescription: Context skill canary\n---\nReply only FLOW_SKILL_USED.\n")
    (clone_skill / "SKILL.md").write_text("---\nname: spec-writer\ndescription: Clone skill canary\n---\nReply only CLONE_SKILL_USED.\n")
    return context_skill / "SKILL.md", context_skill.parent


def skill_turn(process, request_id, workspace, model, skill_path):
    thread_id = start_thread(process, request_id, workspace, model, "untrusted", "read-only")
    send(process, {"jsonrpc": "2.0", "id": request_id + 100, "method": "turn/start", "params": {"threadId": thread_id, "input": [{"type": "skill", "name": "spec-writer", "path": str(skill_path)}, {"type": "text", "text": "Use a habilidade e responda somente com o token que ela pede."}]}})
    output = ""
    events = set()
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("method"):
            item_type = message.get("params", {}).get("item", {}).get("type", "")
            events.add(f"{message['method']}:{item_type}".rstrip(":"))
        if message.get("method") == "item/agentMessage/delta":
            output += message.get("params", {}).get("delta", "")
        if message.get("method") == "turn/completed":
            return output.strip(), message["params"]["turn"]["status"], sorted(events)


def skill_probe(process, workspace, models):
    skill_path, root = prepare_skills(workspace)
    request(process, 4, "skills/extraRoots/set", {"extraRoots": [str(root)]})
    listed = request(process, 5, "skills/list", {"cwds": [workspace], "forceReload": True})
    paths = [skill["path"] for entry in listed.get("data", []) for skill in entry.get("skills", []) if skill["name"] == "spec-writer"]
    model = next(item["id"] for item in models if item["isDefault"] and not item["hidden"])
    output, status, events = skill_turn(process, 6, workspace, model, skill_path)
    print(f"skill paths={len(paths)}; context path listed={str(skill_path) in paths}; output={output}; turn={status}; events={events}")


def run(workspace):
    codex = shutil.which("codex")
    auth = Path.home() / ".codex" / "auth.json"
    if not codex or not auth.is_file():
        raise RuntimeError("codex ou autenticação local não disponível")
    with tempfile.TemporaryDirectory(prefix="flow-dev-codex-home-") as codex_home:
        Path(codex_home, "auth.json").symlink_to(auth)
        if "--preserve-config" in sys.argv:
            personal_home = Path.home() / ".codex"
            for name in ("config.toml", "rules"):
                personal_path = personal_home / name
                if personal_path.exists():
                    Path(codex_home, name).symlink_to(personal_path)
        env = {**os.environ, "CODEX_HOME": codex_home}
        process = subprocess.Popen([codex, "app-server", "--listen", "stdio://", "--enable", "default_mode_request_user_input"], cwd=workspace, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)
        try:
            send(process, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"clientInfo": {"name": "flow_dev_spike", "title": "Flow Dev Spike", "version": "0.1.0"}}})
            response = receive(process, 1)
            if "error" in response:
                raise RuntimeError("initialize rejeitado")
            send(process, {"jsonrpc": "2.0", "method": "initialized"})
            roots = Path(workspace, "skills")
            roots.mkdir(exist_ok=True)
            request(process, 2, "skills/extraRoots/set", {"extraRoots": [str(roots)]})
            models = request(process, 3, "model/list", {})
            print(f"initialize: OK; skills/extraRoots/set: OK; model/list: {len(models.get('data', []))} modelos")
            if "--questions" in sys.argv:
                question_matrix(process, workspace, models.get("data", []))
            if "--skill" in sys.argv:
                skill_probe(process, workspace, models.get("data", []))
            if "--permissions" in sys.argv:
                permission_matrix(process, workspace, models.get("data", []))
            if "--policy-alternatives" in sys.argv:
                policy_alternatives(process, workspace, models.get("data", []))
            if "--file-edit" in sys.argv:
                file_edit_probe(process, workspace, models.get("data", []))
            if "--session-approval" in sys.argv:
                process = session_approval_probe(process, workspace, models.get("data", []), env)
            if "--persistent-rule" in sys.argv:
                persistent_rule_probe(process, workspace, models.get("data", []))
            if "--interrupt" in sys.argv:
                interrupt_probe(process, workspace, models.get("data", []), codex, env)
            if "--resume" in sys.argv:
                process = resume_probe(process, workspace, models.get("data", []), codex, env)
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                process.wait(timeout=5)


if __name__ == "__main__":
    run(sys.argv[1])
