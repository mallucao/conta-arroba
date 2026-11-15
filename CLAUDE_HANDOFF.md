# Handoff para continuar (Codex ou Claude Code)

Estado em 15/11/2026: calculadora publicada em https://mallucao.github.io/conta-arroba/ com cotação automática. Leia o README antes de editar.

## Decisões a preservar

- Modo escuro obrigatório, sem seletor de tema: fundo quase preto, cartões cinza-escuro, texto claro, verde só como cor de atenção e âmbar para aviso/valor manual.
- 52% é a hipótese principal e aparece grande, com a conta escrita embaixo. 50% e 55% ficam recolhidos em "Outras hipóteses".
- Botões − e + por unidade: arroba R$ 1, oferta R$ 0,10, ajuste 1 ponto. Mexer na arroba vira "Valor manual" com botão "Usar cotação".
- Oferta recebida é opcional; a comparação nunca é chamada de lucro nem vira recomendação de venda.
- Sem valor de exemplo em lugar nenhum: a arroba começa vazia até a cotação chegar ou o usuário digitar.
- Cotação: só o widget público do Notícias Agrícolas, lido no servidor (GitHub Actions). A página oficial da B3 proíbe coleta automatizada; use B3 e TradingView apenas para conferência manual. Não trocar futuro por indicador físico sem avisar.
- O app valida o arquivo de cotação (`validateQuote` em `dist/core.js`): data no formato ISO e não futura pelo calendário de São Paulo, preço positivo, contrato `BGI` com código de mês válido, preço principal igual ao do contrato selecionado.
- `server/update-quote.mjs` nunca substitui por pregão mais antigo e mantém o arquivo anterior se a fonte falhar.

## Fluxo de publicação

1. `npm test`.
2. Commit e push na `main`. O workflow `.github/workflows/quote.yml` roda os testes, busca a cotação, grava `dist/quote.json` se mudou e publica `dist/` no GitHub Pages (`build_type: workflow`).
3. Rodadas agendadas em dias úteis (UTC): 21h40, 22h50, 01h20 e 12h15. Rodada manual: aba Actions, "Run workflow".
4. Conferir o site no celular e a aba Actions se a data da cotação parar de avançar (o GitHub pausa agendamentos após 60 dias sem atividade em repositório público).

## Projeto vizinho

No mesmo espaço de trabalho existe `apps-script-gado/`, o app principal de piquetes, pesagens, manejo e resultados em Google Apps Script, com planilha própria. Os projetos são separados; não misturar arquivos. Ideia registrada: um botão no app de gado que abre esta calculadora.

## Testes

`npm test` cobre cálculo, botões, validação do arquivo de cotação, restauração do estado local, leitor da fonte com fixture factual e a regra de gravação do arquivo. Antes de publicar mudanças de tela, abrir em 320 a 430 px e conferir sem erros no console.
