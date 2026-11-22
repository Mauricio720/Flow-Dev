const UPLOAD_PATH = "/api/terminal-attachments";
const SERVER_ERROR_STATUS = 500;
const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;
const NETWORK_FAILURE_MESSAGE = "Falha de rede ao enviar este arquivo.";

export type UploadedAttachment = { id: string; name: string; contentType: string; byteSize: number };
export type UploadScope = { projectId: string; taskId: string };
export type UploadRequest = UploadScope & { file: File; onProgress: (fraction: number) => void };

export class UploadError extends Error {
  constructor(readonly kind: "rejected" | "failed", message: string) {
    super(message);
  }
}

function failureOf(request: XMLHttpRequest) {
  const serverFailure = request.status >= SERVER_ERROR_STATUS;
  let message = NETWORK_FAILURE_MESSAGE;
  try {
    message = (JSON.parse(request.responseText) as { error?: { message?: string } }).error?.message ?? message;
  } catch {
    message = NETWORK_FAILURE_MESSAGE;
  }
  return new UploadError(serverFailure ? "failed" : "rejected", message);
}

export function uploadTerminalAttachment(request: UploadRequest): Promise<UploadedAttachment> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("projectId", request.projectId);
    form.set("taskId", request.taskId);
    form.set("file", request.file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", UPLOAD_PATH);
    xhr.upload.onprogress = (event) => event.lengthComputable && request.onProgress(event.loaded / event.total);
    xhr.onerror = () => reject(new UploadError("failed", NETWORK_FAILURE_MESSAGE));
    xhr.onload = () => (xhr.status === HTTP_CREATED ? resolve(JSON.parse(xhr.responseText) as UploadedAttachment) : reject(failureOf(xhr)));
    xhr.send(form);
  });
}

export async function deleteTerminalAttachment(attachmentId: string) {
  const response = await fetch(`${UPLOAD_PATH}/${attachmentId}`, { method: "DELETE" });
  return response.status === HTTP_NO_CONTENT;
}
