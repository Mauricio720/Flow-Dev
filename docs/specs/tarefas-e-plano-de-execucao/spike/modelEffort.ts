import { query } from "@anthropic-ai/claude-agent-sdk";
import { allCombos } from "./combos";
import type { Combo } from "./combos";
import { buildOptions, runOnce } from "./runCombo";
import type { Observation } from "./runCombo";
import { createLog, verdict } from "./spikeLog";
import type { Log } from "./spikeLog";
import { makeRepo } from "./spikeRepo";

type Classification = "aceita" | "recusada" | "ignorada";

function classify(combo: Combo, observation: Observation): Classification {
  if (observation.thrown || observation.isError || observation.assistantError) return "recusada";
  if (!observation.initModel?.toLowerCase().includes(combo.model)) return "ignorada";
  return "aceita";
}

async function runCombo(combo: Combo, repo: string, log: Log) {
  const label = `COMBO ${combo.model}/${combo.effort}`;
  const observation = await runOnce({ options: buildOptions(repo, combo), log, label });
  const classification = classify(combo, observation);
  verdict(log, `V-33a ${combo.model}/${combo.effort}`, classification === "aceita", `${classification} init=${observation.initModel} erro=${observation.thrown ?? observation.assistantError ?? (observation.isError ? observation.resultText : null)}`);
  return observation;
}

async function matrix() {
  const log = createLog("matrix");
  const repo = await makeRepo();
  for (const combo of allCombos()) await runCombo(combo, repo, log);
}

async function maxEffort() {
  const log = createLog("max");
  const repo = await makeRepo();
  const observation = await runCombo({ model: "opus", effort: "max" }, repo, log);
  verdict(log, "V-33d", !observation.isError && !observation.thrown && observation.resultSubtype === "success", `result=${observation.resultSubtype} texto=${observation.resultText}`);
}

async function resume() {
  const log = createLog("resume");
  const repo = await makeRepo();
  const first = await runOnce({ options: buildOptions(repo, { model: "sonnet", effort: "high" }), log, label: "START sonnet/high" });
  verdict(log, "V-33b-start", Boolean(first.sessionId), `session=${first.sessionId} init=${first.initModel}`);
  if (!first.sessionId) return;
  const same = await runOnce({ options: buildOptions(repo, { model: "sonnet", effort: "high", resume: first.sessionId }), log, label: "RESUME sonnet/high" });
  verdict(log, "V-33c-com-escolha", Boolean(same.initModel?.includes("sonnet")), `init=${same.initModel}`);
  const bare = await runOnce({ options: buildOptions(repo, { resume: first.sessionId }), log, label: "RESUME sem model/effort" });
  verdict(log, "V-33c-sem-escolha", Boolean(bare.initModel?.includes("sonnet")), `init=${bare.initModel} (herda=${Boolean(bare.initModel?.includes("sonnet"))})`);
}

async function haikuInit() {
  const log = createLog("haiku");
  const repo = await makeRepo();
  const observation = await runOnce({ options: buildOptions(repo, { model: "haiku" }), log, label: "START haiku" });
  verdict(log, "V-33b", Boolean(observation.initModel?.toLowerCase().includes("haiku")), `init=${observation.initModel}`);
}

async function models() {
  const log = createLog("models");
  const repo = await makeRepo();
  const session = query({ prompt: "Responda só OK.", options: buildOptions(repo, {}) });
  log.json("SUPPORTED_MODELS", await session.supportedModels());
  session.close();
}

async function invalid() {
  const log = createLog("invalid");
  const repo = await makeRepo();
  const unknownModel = await runOnce({ options: buildOptions(repo, { model: "modelo-inexistente-v33" }), log, label: "MODELO INEXISTENTE" });
  verdict(log, "V-33e-modelo", Boolean(unknownModel.thrown || unknownModel.isError || unknownModel.assistantError), `thrown=${unknownModel.thrown} is_error=${unknownModel.isError} assistantError=${unknownModel.assistantError} texto=${unknownModel.resultText}`);
  const badEffort = await runOnce({ options: buildOptions(repo, { model: "sonnet", effort: "turbo" as Combo["effort"] }), log, label: "ESFORCO INVALIDO" });
  verdict(log, "V-33e-esforco", Boolean(badEffort.thrown || badEffort.isError || badEffort.assistantError), `thrown=${badEffort.thrown} is_error=${badEffort.isError} assistantError=${badEffort.assistantError} init=${badEffort.initModel}`);
}

const COMMANDS: Record<string, () => Promise<void>> = { matrix, resume, max: maxEffort, haiku: haikuInit, models, invalid };

async function main() {
  const [command] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (process.argv.includes("--dry-run")) return allCombos().forEach((combo, index) => console.log(`${index + 1}. ${combo.model} · ${combo.effort}`));
  const run = COMMANDS[command ?? ""];
  if (!run) throw new Error(`uso: modelEffort.ts <${Object.keys(COMMANDS).join("|")}> | --dry-run`);
  await run();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
