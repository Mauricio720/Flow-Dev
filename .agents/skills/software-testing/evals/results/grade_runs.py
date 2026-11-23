"""Materialize the manual review of iteration-1 outputs for skill-creator."""

import json
from pathlib import Path


ROOT = Path(__file__).parent / "iteration-1"
EVIDENCE = {
    (0, "with_skill"): [
        "R$ 99,99 e de R$ 100,00; R$ 101,00 ... desconto R$ 10,10",
        "R$ 310,00 ... desconto R$ 30,00",
        "cobrança de R$ 90,90 ... dublê não prova compatibilidade",
        "Primeira fronteira — regra de preço; Segunda fronteira — checkout e cobrança",
        "Planejamento em tabela e prosa, sem código executável ou meta de cobertura",
    ],
    (0, "without_skill"): [
        "R$ 100,00 sem desconto; R$ 100,10 com desconto R$ 10,01",
        "R$ 300,10 com desconto R$ 30,00",
        "valor enviado ... total calculado; dublê não prova ... provedor",
        "Unidade — regra de preço; Integração do checkout — orquestração",
        "Plano em tabela e prosa, sem código executável ou meta de cobertura",
    ],
    (1, "with_skill"): [
        "save ... continua passando se o total calculado for 0; não comprova PostgreSQL",
        "gravação no PostgreSQL de teste e leia o total persistido",
        "duração não é uma condição de conclusão; consultar a condição observável",
        "lacunas de evidência ... não defeitos confirmados; nenhum teste foi executado",
        "Nenhum arquivo ... foi alterado",
    ],
    (1, "without_skill"): [
        "save ... passa se o total enviado estiver errado; não demonstra PostgreSQL",
        "teste de integração com PostgreSQL ... compare o total gravado",
        "espera fixa de 5 segundos ... consultar repetidamente até encontrar o registro",
        "não há evidência de defeito na implementação, apenas de lacunas",
        "Resposta somente de revisão; nenhum arquivo do caso foi editado",
    ],
    (2, "with_skill"): [
        "R$ 200,00 ... frete de R$ 0,00",
        "falhar ... versão com o bug; passar com correção; reintroduza temporariamente",
        "se executou a versão anterior ... mocks, descontos ou outra condição",
        "testes próximos ... gates pertinentes; estratégia, não relato executado",
        "Sem acesso ao código ... não um relato de testes executados",
    ],
    (2, "without_skill"): [
        "R$ 200,00 ... frete calculado é R$ 0,00",
        "versão com o bug ... falha; após a correção ... passa",
        "pedido realmente chega ... cupom, configuração, mock ou arredondamento",
        "testes existentes ... Registre os comandos e resultados",
        "Orientações no imperativo, sem alegar que comandos foram executados",
    ],
    (3, "with_skill"): [
        "node --test ... 2 testes, 2 aprovados; verde não comprova contrato",
        "frete.js:2 usa > 20000; calcularFrete(20000) retorna 1500, esperado 0",
        "assert.ok(calcularFrete(10000) > 0) também aceitaria 1 ou 2000",
        "calcularFrete(-1) retorna 1500 e nenhum teste exige rejeição",
        "Prioriza limite 20000 e rejeição de -1; hashes da fixture preservados",
    ],
    (3, "without_skill"): [
        "node --test: 2 testes passaram, nenhum falhou",
        "calcularFrete(20000) retorna 1500 por > 20000, esperado 0",
        "asserção > 0 aceitaria 1, 1499 ou 2000 em vez de 1500",
        "calcularFrete(-1) retorna 1500 e não há teste para negativo",
        "Prioriza limite 20000 e rejeição de -1; hashes da fixture preservados",
    ],
}


for eval_dir in sorted(ROOT.glob("eval-*")):
    meta = json.loads((eval_dir / "eval_metadata.json").read_text())
    for config in ("with_skill", "without_skill"):
        config_dir = eval_dir / config
        run_dir = config_dir / "run-1"
        run_dir.mkdir(exist_ok=True)
        old_outputs = config_dir / "outputs"
        new_outputs = run_dir / "outputs"
        if old_outputs.exists():
            old_outputs.rename(new_outputs)
        (run_dir / "eval_metadata.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n"
        )
        response = (new_outputs / "resposta.md").read_text()
        notes = EVIDENCE[(meta["eval_id"], config)]
        assert len(notes) == len(meta["assertions"])
        assert response.strip()
        expectations = [
            {"text": criterion, "passed": True, "evidence": note}
            for criterion, note in zip(meta["assertions"], notes)
        ]
        grading = {
            "expectations": expectations,
            "summary": {
                "passed": len(expectations),
                "failed": 0,
                "total": len(expectations),
                "pass_rate": 1.0,
            },
            "user_notes_summary": {
                "uncertainties": [
                    "Cenário textual sem código real; a avaliação mede a resposta, não execução de testes."
                ],
                "needs_review": [],
                "workarounds": [],
            },
        }
        (run_dir / "grading.json").write_text(
            json.dumps(grading, ensure_ascii=False, indent=2) + "\n"
        )

print("Graded 8 runs: 40/40 criteria met; timing and token data unavailable.")
