---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/application/services/spec/normalizeSpecEvent.ts
line: 61
severity: medium
author: claude-code
provider_ref:
---

# Issue 015: Corte de eventos é quadrático e bloqueia o event loop do worker

## Review Comment

`clip` reduz o texto um caractere por vez e recalcula o tamanho em bytes do prefixo inteiro a cada passo:

```ts
let end = Math.min(text.length, maxBytes);
while (end > 0 && specTextByteLength(text.slice(0, end)) > maxBytes) end -= 1;
```

Para o limite de detalhe de 1 MiB, um texto com caracteres multibyte obriga o laço a recuar dezenas ou centenas de milhares de posições, e cada iteração aloca e mede uma string de cerca de 1 MiB:

- Saída em pt-BR com ~5% de acentos e pouco acima de 1 MiB: ~50 mil iterações, dezenas de GiB varridos.
- Texto CJK ou com emojis: centenas de milhares de iterações.

O conteúdo vem do agente (resultado de ferramenta, mensagem), então é controlável pelo repositório analisado. O cálculo é síncrono, dentro de `ingestEvents`: enquanto roda, o event loop do worker para, o heartbeat não dispara, o lease de 30 s expira e nenhuma outra tentativa, stop ou aprovação é processada.

Há também um defeito de correção: `slice(0, end)` pode cortar no meio de um par substituto e gravar um caractere inválido no payload.

O mesmo `clip` roda duas vezes por evento (detalhe e prévia).

Correção sugerida:

- Cortar por bytes em tempo linear: codificar uma vez, recuar até um limite de caractere UTF-8 e decodificar.

```ts
const bytes = Buffer.from(text, "utf8");
let end = maxBytes;
while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end -= 1;
return bytes.subarray(0, end).toString("utf8");
```

- Adicionar teste com 2 MiB de texto multibyte e limite de tempo, e um caso com emoji na fronteira.

## Triage

- Decision: `VALID`
- Notes: Byte clipping was quadratic and could split surrogate pairs. It now truncates a UTF-8 byte buffer at a code-point boundary.
