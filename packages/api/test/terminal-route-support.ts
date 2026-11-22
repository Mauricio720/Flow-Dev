export const ORIGIN = "https://flow.test";
export const URL_BASE = `${ORIGIN}/api/terminal-attachments`;

export function uploadRequest(setup: { project: { id: string }; taskId: string }, options: { origin?: string | null; name?: string; content?: string } = {}) {
  const form = new FormData();
  form.set("projectId", setup.project.id);
  form.set("taskId", setup.taskId);
  form.set("file", new File([options.content ?? "conteudo"], options.name ?? "nota.md"));
  const headers = options.origin === null ? {} : { origin: options.origin ?? ORIGIN };
  return new Request(URL_BASE, { method: "POST", headers, body: form });
}

export const reasonOf = async (response: Response) => (await response.json() as { error: { reason: string; message: string } }).error;
export const params = (attachmentId: string) => ({ params: Promise.resolve({ attachmentId }) });
export const deleteRequest = (id: string, origin = ORIGIN) => new Request(`${URL_BASE}/${id}`, { method: "DELETE", headers: { origin } });

