# Conta da arroba

Calculadora para celular, somente em modo escuro. Compara uma oferta por kg vivo com três hipóteses de rendimento de carcaça: 50%, 52% e 55%.

## Estado atual

- Interface estática funcional em `dist/`, sem dependências.
- Aceita vírgula ou ponto decimal; botão para trocar o sinal do ajuste comercial.
- Guarda os últimos valores válidos no navegador.
- Fórmula: `arroba × rendimento_percentual / 1500 × (1 + ajuste_percentual / 100)`.
- A diferença percentual compara a oferta ao equivalente; não representa lucro nem recomendação de venda.
- Rendimentos são cenários, sem associação automática à raça.
- A entrada da cotação ainda é manual. A integração de cotação diária e a publicação são trabalho pendente.
- O leitor da fonte diária já está implementado em `server/quotes.mjs`, com testes e fixture; falta conectá-lo a um servidor e à interface.
- Nenhum site foi publicado. Este repositório não configura publicação automática.

## Usar localmente

```sh
python -m http.server 8769 --bind 127.0.0.1 --directory dist
```

Abra `http://127.0.0.1:8769/`. Para os testes, use Node.js e `npm test`; não há pacotes para instalar.

## Cotação diária: fonte encontrada

O Notícias Agrícolas oferece um widget público próprio com a tabela de boi gordo B3:

- Widget: https://www.noticiasagricolas.com.br/widgets/cotacoes?id=248
- Histórico: https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/boi-gordo-b3-prego-regular
- Página dos widgets: https://www.noticiasagricolas.com.br/widgets/

Em 15/11/2026, a tabela identificava fechamento de 13/11/2026, novembro/2026 a R$ 402,10/@. Esse é um dado de verificação, não um valor a fixar no código. A integração deve buscar a tabela no servidor, validar a data e o contrato e atribuir a fonte.

O fechamento publicado nessa tabela pode diferir do ajuste mostrado no TradingView. Não chamar a seleção do primeiro vencimento publicado de reprodução exata de `BGI1!`. Ignorar linhas com mês inválido; uma linha de abril apareceu como `GO RD` na fonte.

Consulte `CLAUDE_HANDOFF.md` para continuar.
