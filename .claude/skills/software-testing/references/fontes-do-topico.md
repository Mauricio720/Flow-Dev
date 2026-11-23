# Proveniência da síntese

Esta skill foi preparada a partir do tópico local `testes/` do vault MEMORY_IA_PALACE. Consulte `testes/wiki/index/Concept Index.md` antes de atualizá-la. O guia `testes/outputs/queries/2026-10-21 Guia objetivo para aprender testes de software.md` resume o caminho inicial.

| Critério na skill | Base local |
|---|---|
| Unidade definida pela fronteira e pela API pública; testes rápidos, legíveis e pouco acoplados à estrutura | `testes/wiki/concepts/Unit test.md` (compilado) |
| Integração estreita/ampla, banco real ou em memória, dublês de serviço externo e seus limites | `testes/wiki/concepts/Integration test.md` (compilado) |
| Escolher casos pela falha detectada, evitar proporção fixa entre níveis e não repetir toda a tabela da regra em integração | `testes/outputs/queries/2026-10-21 Guia objetivo para aprender testes de software.md` (síntese dos dois artigos compilados) |
| Testar comportamento observável e desconfiar de asserções sobre implementação | `testes/raw/articles/testing-implementation-details.md`; `testes/raw/articles/software-engineering-at-google.md` (fontes brutas) |
| Investigar flakiness, isolamento e ambiente | `testes/raw/articles/google-testing-blog-test-flakiness-one-of-the-main-challenges-of-automated-testing.md` (fonte bruta) |
| Mutação dirigida como inspeção da capacidade de detectar falhas | `testes/raw/articles/google-testing-blog-mutation-testing.md` (fonte bruta) |
| Distinguir escrever testes de procurar defeitos por exploração | `testes/raw/youtube/keynote-mauricio-aniche-escrever-testes-vs-testar.md` (transcrição bruta) |

Os artigos `Test coverage`, `Test doubles`, `Non-deterministic tests`, `Testing behavior versus implementation details` e `Writing tests versus testing` ainda constam como *stubs* no índice. As orientações correspondentes são síntese operacional das fontes brutas e raciocínio de engenharia, não conclusões de artigos já compilados. Ao expandir ou corrigir esta skill, verifique as fontes e preserve divergências de definição e estratégia.
