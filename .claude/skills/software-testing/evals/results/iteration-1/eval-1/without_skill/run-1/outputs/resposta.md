# Revisão dos testes

1. **O teste com repositório mockado não protege o cálculo nem a gravação.** Verificar apenas que `save` foi chamado também passa se o total enviado estiver errado. O mock tampouco demonstra que o registro foi persistido no PostgreSQL. **Menor correção:** usar pedidos com valores distintos e afirmar o total exato no argumento de `save`. Para cobrir a gravação, manter ou acrescentar um teste de integração com PostgreSQL que consulte o registro por uma chave própria do teste e compare o total gravado.

2. **A espera fixa de 5 segundos torna o teste lento e não garante sincronização.** Ele pode falhar se a gravação levar mais tempo e sempre desperdiça 5 segundos quando termina antes. **Menor correção:** se a operação for síncrona, consultar logo após seu retorno; se for assíncrona, aguardar o sinal de conclusão ou consultar repetidamente até encontrar o registro e o total esperados, com prazo máximo e erro claro ao expirar.

**Evidências que faltam:** o diff completo dos testes e o contrato de execução (síncrono ou assíncrono); uma asserção do valor calculado; resultado de uma consulta ao PostgreSQL real, em dados isolados, depois da gravação; e execução desses testes no CI. Com a descrição fornecida, não há evidência de defeito na implementação, apenas de lacunas e instabilidade nos testes.
