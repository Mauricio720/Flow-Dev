const TITLES: Record<string, string> = {
  overview: "Visão geral", goals: "Objetivos", "user stories": "Histórias de usuário", "core features": "Funcionalidades principais",
  "business rules": "Regras de negócio", "user experience": "Experiência de uso", "high-level technical constraints": "Restrições técnicas",
  "non-goals": "Fora do escopo", "non-goals (out of scope)": "Fora do escopo", "open questions": "Perguntas em aberto", "unresolved questions": "Perguntas em aberto",
  "success metrics": "Métricas de sucesso", "phased rollout plan": "Plano de entrega", risks: "Riscos", "executive summary": "Resumo executivo",
  "mvp boundary": "Limite do MVP", "developer experience": "Experiência de desenvolvimento", "system architecture": "Arquitetura do sistema",
  "architectural boundaries": "Fronteiras de arquitetura", "implementation design": "Desenho da implementação", "core interfaces": "Interfaces principais",
  "data models": "Modelos de dados", "api endpoints": "Endpoints de API", "integration points": "Pontos de integração", "impact analysis": "Análise de impacto",
  "extensibility integration plan": "Extensibilidade", "agent manageability plan": "Operação por agentes", "config lifecycle": "Configuração",
  "testing approach": "Abordagem de testes", "development sequencing": "Sequência de desenvolvimento", "build order": "Ordem de construção",
  "technical dependencies": "Dependências técnicas", "monitoring and observability": "Monitoramento", "technical considerations": "Considerações técnicas",
  "key decisions": "Decisões principais", "known risks": "Riscos conhecidos", "safety invariants": "Invariantes de segurança", "file references": "Arquivos de referência",
  "assumptions and defaults": "Premissas e padrões", assumptions: "Premissas", "architecture decision records": "Registros de decisão", strategy: "Estratégia",
  "coverage matrix": "Matriz de cobertura", "unit tests": "Testes unitários", "integration tests": "Testes de integração", "end-to-end tests": "Testes ponta a ponta",
  "coverage decisions": "Decisões de cobertura", "design constraints": "Restrições de design", "surface map": "Mapa de superfícies", "component plan": "Plano de componentes",
  rules: "Regras", "new ui primitives": "Novos primitivos de UI", "new domain components": "Novos componentes de domínio", "signal and state mapping": "Sinais e estados",
  requirements: "Requisitos", subtasks: "Subtarefas", "implementation details": "Detalhes de implementação", "success criteria": "Critérios de sucesso",
  "relevant files": "Arquivos relevantes", "dependent files": "Arquivos dependentes", deliverables: "Entregas", tests: "Testes", context: "Contexto",
  "acceptance criteria": "Critérios de aceite", dependencies: "Dependências", summary: "Resumo", scope: "Escopo", "out of scope": "Fora do escopo",
};

export function friendlyTitle(original: string) {
  const key = original.trim().replace(/:$/, "").toLocaleLowerCase("en");
  return TITLES[key] ?? original.trim();
}
