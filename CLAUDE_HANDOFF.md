# Prompt para continuar no Claude

Continue este projeto e publique uma versão funcional para usar no celular. Leia o README e o código antes de editar. Preserve a calculadora existente e o modo escuro obrigatório, sem seletor de tema.

O que já funciona:
- Interface para celular em dist/, sem bibliotecas externas.
- Arroba informada, ajuste comercial com sinal e oferta em R$/kg vivo.
- Equivalência para rendimentos de 50%, 52% e 55%, com diferença percentual da oferta.
- Entrada decimal com vírgula ou ponto, troca de sinal acessível e persistência local.
- Testes do cálculo e validação em tests/.
- Leitor da cotação em server/quotes.mjs, com exports fetchQuote() e parseQuoteHtml(), testes e fixture factual. Ainda não conectado à interface ou a um servidor publicado.

O que falta fazer:
1. Integrar a cotação diária usando uma fonte gratuita confiável. Foi testado o widget público do próprio Notícias Agrícolas: https://www.noticiasagricolas.com.br/widgets/cotacoes?id=248 . A página oficial que oferece os widgets é https://www.noticiasagricolas.com.br/widgets/ e o histórico é https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/boi-gordo-b3-prego-regular . Verifique os módulos e testes em server/ e tests/ que já existirem e reaproveite-os.
2. Fazer a busca no servidor, não contornar CORS no navegador. Escolha uma hospedagem simples; pode usar Apps Script se for a melhor opção disponível. Não há dependência de uma hospedagem anterior nem credenciais no repositório.
3. Carregar automaticamente o último fechamento publicado ao abrir a calculadora e oferecer atualização. Exibir data do pregão, contrato/vencimento, tipo de preço, fonte com link e horário da coleta. Se implementar agendamento enquanto o app está fechado, configure-o e teste-o de verdade; não confundir atualização ao abrir com rotina diária agendada.
4. Selecionar o primeiro vencimento válido publicado, com regra explícita. Não prometer coincidência exata com BGI1! do TradingView, que tem regra própria de rolagem e pode mostrar ajuste em vez do último fechamento. Não trocar futuros por indicador físico sem informar o usuário.
5. Validar HTML, data, mês/ano, unidade e preço positivo. Ignorar linhas com mês inválido como GO RD; não aproveitar outro produto, outra tabela ou um dia antigo por acidente. Use apenas dados, nunca execute scripts da página fonte.
6. Manter o último dado válido identificado com sua data se a fonte falhar, mostrar falha/defasagem e permitir informar cotação manual. Nunca apresentar 398 ou qualquer valor de exemplo como cotação diária atualizada.
7. Manter os três rendimentos como hipóteses, sem concluir rendimento por raça ou por preço. Não chamar diferença de preço de lucro, nem gerar recomendação automática de venda.
8. Testar cálculo, leitura da fonte, fallback, vírgula decimal, persistência e celular de 320 a 430 px. Rodar npm test e revisar o navegador antes de publicar.
9. Subir os commits no GitHub e entregar o link live com os limites reais da atualização. Não considerar a tarefa concluída só com o preview local.

O usuário usa TradingView gratuito e autorizou outra fonte confiável. Não precisa de cotação em tempo real: o objetivo é o último fechamento disponível por pregão. A preferência é simplicidade e uso prático no celular.
