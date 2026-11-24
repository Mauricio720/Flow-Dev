import { Marked, type Tokens } from "marked";

const HEADING_DEPTH_OFFSET = 2;
const MAX_HEADING_DEPTH = 6;
const SAFE_LINK_PATTERN = /^(https?:\/\/|mailto:|#)/i;
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);
}

const markdown = new Marked({
  gfm: true,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    heading({ tokens, depth }: Tokens.Heading) {
      const level = Math.min(depth + HEADING_DEPTH_OFFSET, MAX_HEADING_DEPTH);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    link({ href, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      if (!SAFE_LINK_PATTERN.test(href.trim())) return text;
      return `<a href="${escapeHtml(href.trim())}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
    image({ text }: Tokens.Image) {
      return escapeHtml(text);
    },
  },
});

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const TABLE_SCROLL_OPEN = '<div class="md-table-scroll"><table>';
const TABLE_SCROLL_CLOSE = "</table></div>";

export function splitFrontmatter(source: string): { meta: string | null; body: string } {
  const match = FRONTMATTER_PATTERN.exec(source);
  return match ? { meta: match[1] ?? "", body: source.slice(match[0].length) } : { meta: null, body: source };
}

export function renderArtifactMarkdown(source: string): string {
  const html = markdown.parse(source, { async: false });
  return html.replaceAll("<table>", TABLE_SCROLL_OPEN).replaceAll("</table>", TABLE_SCROLL_CLOSE);
}
