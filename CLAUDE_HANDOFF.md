# Handoff para continuar (Codex ou Claude Code)

Estado em 15/11/2026: calculadora publicada em https://mallucao.github.io/conta-arroba/ com cotação automática. Leia o README antes de editar.

## Decisões a preservar

- Modo escuro obrigatório, sem seletor de tema: fundo quase preto, cartões cinza-escuro, texto claro, verde só como cor de atenção e âmbar para aviso/valor manual.
- 52% é a hipótese principal e aparece grande, com a conta escrita embaixo. 50% e 55% ficam recolhidos em "Outras hipóteses".
- Botões − e + por unidade: arroba R$ 1, oferta R$ 0,10, ajuste 1 ponto. Mexer na arroba vira "Valor manual" com botão "Usar cotação".
- Oferta recebida é opcional; a comparação nunca é chamada de lucro nem vira recomendação de venda.
- Sem valor de exemplo em lugar nenhum: a arroba começa vazia até a cotação chegar ou o usuário digitar.
- Cotação: só o widget público do Notícias Agrícolas, lido fora do navegador. A fonte responde HTTP 403 aos servidores do GitHub (testado em 15/11/2026); não tentar disfarçar os pedidos. A busca agendada roda no computador do dono via `scripts/atualizar-cotacao.cmd`, que envia `dist/quote.json`; o GitHub só publica. A página oficial da B3 proíbe coleta automatizada; use B3 e TradingView apenas para conferência manual. Não trocar futuro por indicador físico sem avisar.
- O app valida o arquivo de cotação (`validateQuote` em `dist/core.js`): data no formato ISO e não futura pelo calendário de São Paulo, preço positivo, contrato `BGI` com código de mês válido, preço principal igual ao do contrato selecionado.
- `server/update-quote.mjs` nunca substitui por pregão mais antigo e mantém o arquivo anterior se a fonte falhar.

## Fluxo de publicação

1. `npm test`.
2. Commit e push na `main`. O workflow `.github/workflows/quote.yml` roda os testes, tenta a busca (hoje recebe 403, então mantém o arquivo enviado) e publica `dist/` no GitHub Pages (`build_type: workflow`).
3. Atualização da cotação: tarefa agendada no Windows chamando `scripts/atualizar-cotacao.cmd` em dias úteis (18h40, 19h50, 22h20 e 9h15, horário de Brasília). O script usa o `git` e as credenciais já configuradas na máquina. Para registrar em outra máquina, o comando `schtasks` está no README.
4. Se a data da cotação parar de avançar: conferir se a máquina agendada está ligada, rodar `npm run quote` e `git push` na pasta do projeto, e olhar a aba Actions do repositório.

## Projeto vizinho

No mesmo espaço de trabalho existe `apps-script-gado/`, o app principal de piquetes, pesagens, manejo e resultados em Google Apps Script, com planilha própria. Os projetos são separados; não misturar arquivos. Ideia registrada: um botão no app de gado que abre esta calculadora.

## Testes

`npm test` cobre cálculo, botões, validação do arquivo de cotação, restauração do estado local, leitor da fonte com fixture factual e a regra de gravação do arquivo. Antes de publicar mudanças de tela, abrir em 320 a 430 px e conferir sem erros no console.
