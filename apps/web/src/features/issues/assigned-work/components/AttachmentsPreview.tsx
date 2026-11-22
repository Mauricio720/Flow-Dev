import type { TerminalAttachments } from "../hooks/useTerminalAttachments";
import { PREVIEW_CAPTION, PREVIEW_HEADING, PREVIEW_PATH_NOTE } from "../terminalCopy";

type Line = { key: string; name: string; contentType: string };

function previewLines(attachments: TerminalAttachments): Line[] {
  const images = attachments.selectedImages.map((image) => ({ key: image.id, name: image.name, contentType: image.contentType }));
  const uploads = attachments.items.filter((item) => item.state === "uploaded").map((item) => ({ key: item.localId, name: item.name, contentType: item.contentType ?? "arquivo" }));
  return [...images, ...uploads];
}

export function AttachmentsPreview({ attachments }: { attachments: TerminalAttachments }) {
  const lines = previewLines(attachments);
  if (lines.length === 0) return null;
  return (
    <section aria-label="Prévia dos anexos do prompt" className="space-y-1 rounded-md bg-surface px-3 py-2">
      <p className="font-mono text-xs font-medium">{PREVIEW_HEADING}</p>
      <ul className="space-y-0.5 font-mono text-xs text-ink-2">{lines.map((line) => <li key={line.key} className="[overflow-wrap:anywhere]">{`- ${line.name} (${line.contentType}): (${PREVIEW_PATH_NOTE})`}</li>)}</ul>
      <p className="text-xs text-ink-3">{PREVIEW_CAPTION}</p>
    </section>
  );
}
