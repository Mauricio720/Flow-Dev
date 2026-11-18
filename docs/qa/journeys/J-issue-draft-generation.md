# Gerar e revisar o draft de uma Issue

```mermaid
flowchart TD
  A[Marina abre Issues do projeto] --> B[Envia uma intenção]
  B --> C[Issue Author consulta o contexto disponível]
  C --> D{Resultado da geração}
  D -->|draft válido| E[Marina revisa o draft]
  D -->|falha| F[Marina confere a falha e decide tentar novamente]
  F -->|tentar novamente| C
  F -->|abandonar| G[Volta depois à intenção salva]
  E --> H[Recarrega e confirma o draft salvo]
```

Persona: Marina. Entrada: workspace de Issues do projeto. Objetivo: obter um draft salvo que possa revisar antes de publicar. O limite das consultas de contexto pode interromper novas buscas sem invalidar um draft válido baseado nas evidências já disponíveis. Uma falha deve manter a intenção acessível para uma tentativa posterior.
