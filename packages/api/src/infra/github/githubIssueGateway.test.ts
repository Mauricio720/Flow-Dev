import { describe, expect, it, vi } from "vitest";
import { GitHubHttpIssueGateway } from "./githubIssueGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const input = { repositoryId: "202", owner: "acme", name: "cart", token: "personal-token", publisherGithubId: "501", title: "Corrigir total", body: "## Contexto\n\nTotal incorreto", labels: [] as string[] };
const createdIssue = { id: 4101, node_id: "ISSUE41", number: 41, html_url: "https://github.com/acme/cart/issues/41", created_at: "2026-10-01T12:00:00Z", user: { id: 501 } };

describe("GitHubIssueGateway", () => {
  it("UT-083 requires personal authorization even when a public repository is readable", async () => {
    const fetcher = vi.fn();
    await expect(new GitHubHttpIssueGateway(fetcher).eligibility({ ...input, token: " " })).rejects.toThrowError(new TaskError("repository_authorization_needed"));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("UT-082 accepts personal read access for content-only Issue publication", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: 501 })).mockResolvedValueOnce(Response.json({ id: 202, archived: false, has_issues: true, permissions: { pull: true, push: false } }));
    const eligibility = await new GitHubHttpIssueGateway(fetcher).eligibility(input);
    expect(eligibility.canRead).toBe(true);
    expect(eligibility.canCreateIssues).toBe(true);
    expect(eligibility.issuesEnabled).toBe(true);
  });
  it("recognizes GitHub triage permission as Issue creation access", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: 501 })).mockResolvedValueOnce(Response.json({ id: 202, archived: false, has_issues: true, permissions: { pull: true, triage: true, push: false } }));
    await expect(new GitHubHttpIssueGateway(fetcher).eligibility(input)).resolves.toMatchObject({ canRead: true, canCreateIssues: true });
  });
  it("UT-033 returns a verified receipt from one content-only creation request", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ title: input.title, body: input.body });
      return Response.json(createdIssue, { status: 201 });
    });
    await expect(new GitHubHttpIssueGateway(fetcher).create(input)).resolves.toMatchObject({ status: "created", receipt: { number: 41, repositoryId: "202", publisherGithubId: "501" } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("UT-034 keeps ambiguous delivery uncertain and never retries creation", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("connection reset"));
    await expect(new GitHubHttpIssueGateway(fetcher).create(input)).resolves.toEqual({ status: "uncertain", reason: "delivery_unknown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("UT-084 classifies a received 503 as uncertain", async () => {
    const unavailable = new GitHubHttpIssueGateway(async () => new Response("", { status: 503 }));
    await expect(unavailable.create(input)).resolves.toMatchObject({ status: "uncertain" });
  });

  it("UT-085 classifies a malformed 201 as uncertain", async () => {
    const malformed = new GitHubHttpIssueGateway(async () => Response.json({ title: "created" }, { status: 201 }));
    await expect(malformed.create(input)).resolves.toMatchObject({ status: "uncertain" });
  });

  it("UT-086 classifies a fully received 422 as definitive rejection", async () => {
    const content = new GitHubHttpIssueGateway(async () => new Response("", { status: 422 }));
    await expect(content.create(input)).resolves.toMatchObject({ status: "rejected", reason: "content_rejected" });
  });

  it("UT-087 classifies a fully received 410 as issues disabled", async () => {
    const disabled = new GitHubHttpIssueGateway(async () => new Response("", { status: 410 }));
    await expect(disabled.create(input)).resolves.toMatchObject({ status: "rejected", reason: "issues_disabled" });
  });
  it("UT-088 treats an unverified 404 during receipt lookup as unavailable", async () => {
    const gateway = new GitHubHttpIssueGateway(async () => new Response("", { status: 404 }));
    await expect(gateway.verify({ ...input, issueNumber: 41 })).rejects.toThrowError(new TaskError("destination_unavailable"));
  });
  it("treats an untrusted receipt URL as uncertain", async () => {
    const gateway = new GitHubHttpIssueGateway(async () => Response.json({ ...createdIssue, html_url: "https://evil.example/41" }, { status: 201 }));
    await expect(gateway.create(input)).resolves.toMatchObject({ status: "uncertain", reason: "invalid_creation_receipt" });
  });
  it("sends the task labels with the creation request", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => Response.json(createdIssue, { status: 201 }));
    await new GitHubHttpIssueGateway(fetcher).create({ ...input, labels: ["frontend", "backend"] });
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ title: input.title, body: input.body, labels: ["frontend", "backend"] });
  });
  it("adds labels to an existing Issue and reports a missing permission", async () => {
    const target = { owner: "acme", name: "cart", token: "personal-token", issueNumber: 41, labels: ["frontend"] };
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => Response.json([], { status: 200 }));
    await expect(new GitHubHttpIssueGateway(fetcher).label(target)).resolves.toBe("labelled");
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://api.github.com/repos/acme/cart/issues/41/labels");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ labels: ["frontend"] });
    await expect(new GitHubHttpIssueGateway(async () => new Response(null, { status: 403 })).label(target)).resolves.toBe("denied");
    await expect(new GitHubHttpIssueGateway(async () => new Response(null, { status: 404 })).label(target)).resolves.toBe("missing");
  });
  it("creates a label definition and recolors an existing one only when asked", async () => {
    const definition = { owner: "acme", name: "cart", token: "personal-token", label: "frontend", color: "7c4dff", description: "Interface", overwrite: false };
    const creating = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => Response.json({}, { status: 201 }));
    await expect(new GitHubHttpIssueGateway(creating).define(definition)).resolves.toBe("created");
    expect(JSON.parse(String(creating.mock.calls[0]?.[1]?.body))).toEqual({ name: "frontend", color: "7c4dff", description: "Interface" });
    const existing = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => (init?.method === "PATCH" ? Response.json({}) : new Response(null, { status: 422 })));
    await expect(new GitHubHttpIssueGateway(existing).define(definition)).resolves.toBe("kept");
    await expect(new GitHubHttpIssueGateway(existing).define({ ...definition, overwrite: true })).resolves.toBe("updated");
    expect(String(existing.mock.calls.at(-1)?.[0])).toBe("https://api.github.com/repos/acme/cart/labels/frontend");
    await expect(new GitHubHttpIssueGateway(async () => new Response(null, { status: 404 })).define(definition)).resolves.toBe("denied");
  });
});
