# Conta da arroba

Calculadora para celular, em modo escuro, que converte o último fechamento do boi gordo na B3 em reais por kg vivo a **52% de rendimento** e compara com a oferta recebida.

Site: https://mallucao.github.io/conta-arroba/

## Como usar

1. Abra o site no celular (iPhone ou Android). Para deixar como aplicativo, use "Adicionar à tela de início" no navegador.
2. A arroba já vem preenchida com o último fechamento publicado. Toque em outro mês para trocar o vencimento, ou digite um valor; "Usar cotação" volta ao publicado.
3. O preço grande é o equivalente a 52% de rendimento, com a conta logo abaixo.
4. Informe a oferta recebida (R$/kg vivo) para ver quanto ela está acima ou abaixo do equivalente.
5. "Ajuste comercial" (desconto ou ágio em %) e "Outras hipóteses" (50% e 55%) ficam recolhidos.

Os botões **−** e **+** mexem a arroba em R$ 1, a oferta em R$ 0,10 e o ajuste em 1 ponto. Aceita vírgula ou ponto nos decimais. Os valores ficam guardados no aparelho e o app funciona sem internet com a última cotação baixada.

## A conta

```
equivalente (R$/kg vivo) = arroba × rendimento ÷ 15 × (1 + ajuste ÷ 100)
exemplo: 402,10 × 52% ÷ 15 = 13,94
```

A diferença é `(oferta ÷ equivalente − 1) × 100`. "Acima" e "abaixo" comparam preços; não indicam lucro nem recomendação de venda. Os rendimentos são hipóteses, sem associação automática à raça.

## Cotação

- Fonte: tabela pública do Notícias Agrícolas com o fechamento do boi gordo na B3 (pregão regular): https://www.noticiasagricolas.com.br/widgets/cotacoes?id=248 (histórico em https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/boi-gordo-b3-prego-regular).
- O app mostra data do pregão, contrato/vencimento, tipo de preço, fonte com link e horário da coleta.
- Vencimento padrão: o primeiro mês publicado igual ou posterior ao mês do pregão. Linhas com mês inválido (como `GO RD`) são ignoradas.
- Não é cotação em tempo real nem reprodução do `BGI1!` do TradingView, que pode mostrar o último negócio ou o ajuste. Em 13/11/2026, por exemplo, a fonte trazia 402,10 e o TradingView 402,15 para Novembro/2026.
- Atualização automática: o Notícias Agrícolas responde HTTP 403 a pedidos vindos dos servidores do GitHub, então a busca roda no computador do dono do projeto. Uma tarefa agendada do Windows (registrada por `scripts/instalar.ps1`) chama `scripts/atualizar-cotacao.cmd` todo dia às 18h40, repetindo a cada 70 minutos até 22h40, e às 9h15, no relógio do computador. O script primeiro atualiza a própria cópia (`git pull`, então melhorias enviadas ao GitHub chegam sozinhas), grava `dist/quote.json` só quando há pregão novo ou preço diferente e envia o commit; o GitHub Actions então publica o site. Se a fonte falhar, o último dado válido é mantido com a sua data e o app avisa quando pode haver pregão mais recente.
- Se a data parar de avançar: conferir se o computador agendado está ligado, ler `scripts/cotacao.log` nele e, se preciso, rodar `npm run quote` e depois `git push` na pasta do projeto.

## Desenvolvimento

Sem dependências. Node.js 22 ou mais novo.

```sh
npm test                       # cálculo, validação do arquivo, leitor da fonte
node server/update-quote.mjs   # busca a cotação e grava dist/quote.json se houver novidade
python -m http.server 8769 --bind 127.0.0.1 --directory dist   # abre em http://127.0.0.1:8769/
```

Estrutura:

- `dist/` site estático publicado (HTML, CSS, `core.js` com o cálculo, `app.js` com a tela, `sw.js` para uso sem internet, `quote.json`).
- `server/quotes.mjs` leitor e validador da fonte; `server/update-quote.mjs` grava o arquivo.
- `scripts/atualizar-cotacao.cmd` busca a cotação e envia o commit; `scripts/rodar-oculto.vbs` o chama sem abrir janela; `scripts/instalar.ps1` registra a tarefa agendada; `scripts/INSTALAR-NO-PC.md` é o roteiro para o Claude Code fazer isso em outro computador.
- `tests/` testes com fixture factual da fonte.
- `.github/workflows/quote.yml` testes e publicação no GitHub Pages a cada push.

### Instalar no computador que fica ligado

A tarefa precisa de um clone do repositório fora de pastas sincronizadas (Google Drive, OneDrive), porque a sincronização briga com o `git`. No Prompt de Comando:

```
git clone https://github.com/mallucao/conta-arroba.git %LOCALAPPDATA%\conta-arroba
cd %LOCALAPPDATA%\conta-arroba
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
```

O instalador confere Node.js, Git e GitHub CLI (instala pelo winget o que faltar), exige que o `gh auth login` já tenha sido feito com a conta dona do repositório, faz um teste de envio a seco, registra a tarefa "Conta da arroba - cotacao" (todo dia 18h40 com repetições até 22h40, e 9h15; sem janela, via `rodar-oculto.vbs`), roda a tarefa uma vez e mostra as últimas linhas de `scripts\cotacao.log`. Nos fins de semana o script só constata que não há pregão novo.

Para remover a tarefa: `powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Remover`. Para fazer tudo isso pelo Claude Code sem digitar comandos, veja `scripts/INSTALAR-NO-PC.md`.
