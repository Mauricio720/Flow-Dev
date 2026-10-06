import { describe, expect, it } from "vitest";
import { applySelectedFields, changedDraftPaths, authoredFields, keepLabels, keepPriorityPoints } from "./draftMerge";
import { parseIssueDraft, previewHash, renderIssueBody, validatePublicationDraft } from "./draftRules";
import { TaskError } from "./taskErrors";
import { classifySource, sourceClaimHash, validateSource, type EvidenceRecord } from "./sourceRules";

const draft = { title: "Corrigir total", context: "Ao remover item o total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [], priorityPoints: null, labels: [] };
const evidence: EvidenceRecord = { id: "F1", repositoryId: "202", type: "project-file", path: "src/cart.ts", commitSha: "c1", fromLine: 8, toLine: 12, issueId: null, issueNumber: null, url: "https://github.com/acme/cart/blob/c1/src/cart.ts" };

describe("task draft rules", () => {
  it("UT-021 accepts a complete minimal publication draft", () => expect(() => validatePublicationDraft(draft)).not.toThrow());
  it("UT-023 renders the minimal canonical body exactly", () => expect(renderIssueBody(draft)).toBe("## Contexto\n\nAo remover item o total permanece antigo\n\n## Objetivo\n\nRecalcular total"));
  it("UT-022 requires a meaningful objective for publication", () => expect(() => validatePublicationDraft({ ...draft, objective: "   " })).toThrowError(new TaskError("invalid_draft", { objective: "required" })));
  it("UT-024 rejects unsafe reference protocols", () => expect(() => renderIssueBody({ ...draft, references: [{ type: "github-issue", path: null, line: null, repository: "acme/cart", issueNumber: 1, url: "javascript:alert(1)" }] })).toThrowError(new TaskError("unsafe_source")));
  it("UT-075 rejects a title over 256 code points", () => expect(() => validatePublicationDraft({ ...draft, title: "a".repeat(257) })).toThrowError(new TaskError("input_limit", { title: "input_limit" })));
  it("UT-076 rejects a body over 60,000 UTF-8 bytes", () => expect(() => validatePublicationDraft({ ...draft, constraints: Array(7).fill("a".repeat(9_999)) })).toThrowError(new TaskError("input_limit", { bodyMarkdown: "input_limit" })));
  it("UT-078 rejects more than 100 constraints without truncating", () => expect(() => parseIssueDraft({ ...draft, constraints: Array(101).fill("constraint") })).toThrowError(new TaskError("input_limit", { constraints: "input_limit" })));
  it("UT-077 rejects more than three product considerations", () => expect(() => parseIssueDraft({ ...draft, productConsiderations: ["1", "2", "3", "4"] })).toThrowError(new TaskError("input_limit", { productConsiderations: "input_limit" })));
  it("UT-025 preserves unselected fields byte-for-byte", () => expect(applySelectedFields({ ...draft, context: "Preservar regra fiscal" }, { ...draft, title: "Novo título", context: "Substituir tudo" }, ["title"]).context).toBe("Preservar regra fiscal"));
  it("UT-026 rejects protected field paths", () => expect(() => applySelectedFields(draft, draft, ["authorUserId"])).toThrowError(new TaskError("invalid_field_path")));
  it("reads a stored draft without priority points as unprioritized", () => expect(parseIssueDraft({ ...draft, priorityPoints: undefined }).priorityPoints).toBeNull());
  it("accepts priority points from 1 to 5 and rejects values outside the scale", () => {
    expect(parseIssueDraft({ ...draft, priorityPoints: 5 }).priorityPoints).toBe(5);
    for (const priorityPoints of [0, 6, 2.5]) expect(() => parseIssueDraft({ ...draft, priorityPoints })).toThrowError(TaskError);
  });
  it("keeps priority points out of the published body", () => expect(renderIssueBody({ ...draft, priorityPoints: 4 })).toBe(renderIssueBody(draft)));
  it("tracks priority points as an edited path and keeps them across a generated draft", () => {
    const prioritized = { ...draft, priorityPoints: 3 };
    expect(changedDraftPaths(draft, prioritized)).toEqual(["priorityPoints"]);
    expect(keepPriorityPoints({ ...draft, title: "Novo título" }, prioritized)).toEqual({ ...prioritized, title: "Novo título" });
    expect(keepPriorityPoints(prioritized, null).priorityPoints).toBeNull();
    expect(authoredFields(prioritized)).not.toHaveProperty("priorityPoints");
  });
  it("UT-027 binds a source to repository, path, commit and range", () => expect(validateSource({ type: "project-file", path: "src/cart.ts", line: 10, repository: null, issueNumber: null, url: null }, "202", [evidence])).toBe(evidence));
  it("UT-028 rejects a different path with matching line numbers", () => expect(() => validateSource({ type: "project-file", path: "src/payment.ts", line: 10, repository: null, issueNumber: null, url: null }, "202", [evidence])).toThrowError(new TaskError("invalid_agent_source")));
  it("rejects a project file URL for a different repository or commit", () => {
    const source = { type: "project-file" as const, path: "src/cart.ts", line: 10, repository: null, issueNumber: null, url: "https://github.com/evil/other/blob/wrong/src/cart.ts#L10" };
    expect(() => validateSource(source, "202", [evidence])).toThrowError(new TaskError("invalid_agent_source"));
  });
  it("IT-183 rejects an Issue URL outside the task repository evidence", () => expect(() => validateSource({ type: "github-issue", path: null, line: null, repository: "evil/other", issueNumber: 41, url: "https://github.com/evil/other/issues/41" }, "202", [evidence])).toThrowError(new TaskError("invalid_agent_source")));
  it("UT-081 rejects a generated reference without retrieved evidence", () => expect(() => validateSource({ type: "project-file", path: "src/missing.ts", line: 10, repository: null, issueNumber: null, url: null }, "202", [evidence])).toThrowError(new TaskError("invalid_agent_source")));
  it("UT-079 labels an edited source claim as author edited", () => expect(classifySource({ previousHash: "old", statement: "changed", generated: false }).verification).toBe("author-edited"));
  it("UT-080 keeps an unchanged source claim as historical evidence", () => {
    const statement = "Preservar regra fiscal";
    expect(classifySource({ previousHash: sourceClaimHash(statement), statement, generated: true }).verification).toBe("historical");
  });
  it("IT-188 keeps a source claim historical when its pinned commit is no longer current", () => {
    const statement = "Validar o cálculo em src/cart.ts";
    expect(classifySource({ previousHash: sourceClaimHash(statement), statement, generated: true }).verification).toBe("historical");
  });
  it("classifies a stored draft without labels and keeps the labels an author chose", () => {
    expect(parseIssueDraft({ ...draft, labels: undefined }).labels).toEqual(["generica"]);
    expect(parseIssueDraft({ ...draft, labels: ["docs", "frontend", "docs"] }).labels).toEqual(["frontend", "docs"]);
    expect(() => parseIssueDraft({ ...draft, labels: ["urgente"] })).toThrowError(TaskError);
  });
  it("tracks labels as an edited path, keeps them across a generated draft and out of agent input", () => {
    const labelled = { ...draft, labels: ["backend" as const] };
    expect(changedDraftPaths(draft, labelled)).toEqual(["labels"]);
    expect(keepLabels({ ...draft, title: "Ajustar o layout da tela" }, labelled).labels).toEqual(["backend"]);
    expect(keepLabels({ ...draft, title: "Ajustar o layout da tela" }, null).labels).toEqual(["frontend"]);
    expect(authoredFields(labelled)).not.toHaveProperty("labels");
    expect(renderIssueBody(labelled)).toBe(renderIssueBody(draft));
  });
  it("invalidates a preview hash when the labels change", () => {
    const base = { revisionId: "R7", body: "body", title: "title", repositoryId: "202", owner: "acme", name: "cart", publisherGithubId: "501" };
    expect(previewHash({ ...base, labels: ["frontend"] })).not.toBe(previewHash({ ...base, labels: ["backend"] }));
  });
  it("UT-108 invalidates a preview hash when its destination is renamed", () => {
    const first = previewHash({ revisionId: "R7", body: "body", title: "title", repositoryId: "202", owner: "acme", name: "cart", publisherGithubId: "501", labels: [] });
    const renamed = previewHash({ revisionId: "R7", body: "body", title: "title", repositoryId: "202", owner: "acme", name: "cart-renamed", publisherGithubId: "501", labels: [] });
    expect(first).not.toBe(renamed);
  });
});
