# Instalar a atualização da cotação no PC que fica ligado

Este arquivo é para o Claude Code **do outro computador** (o PC de mesa que fica sempre ligado). Quem lê o arquivo é o Claude; você só precisa digitar uma frase.

## O que você digita no Claude do PC

Cole ou digite só isto:

> Clone o repositório público https://github.com/mallucao/conta-arroba na pasta %LOCALAPPDATA%\conta-arroba, leia o arquivo scripts\INSTALAR-NO-PC.md que está nele e faça o que ele pede.

Se o PC já tiver a pasta Gado sincronizada pelo Google Drive, também vale: "leia o arquivo scripts\INSTALAR-NO-PC.md da pasta Gado\conta-arroba e faça o que ele pede". Ele vai clonar de novo fora do Drive mesmo assim; a cópia do Drive não serve para a tarefa.

Depois de instalado, nada mais precisa ser feito nesse PC. Não envolve IA: é uma tarefa agendada do Windows que roda um script, e o site passa a se atualizar sozinho nos dias de pregão.

## Instruções para o Claude (no PC)

Você está no PC de mesa do Vina, que fica sempre ligado. A tarefa é registrar aqui a atualização automática da cotação do site "Conta da arroba" (https://mallucao.github.io/conta-arroba/). O Vina é médico, não é de TI: fale em português simples, diga em uma frase o que vai instalar antes de instalar, e senha quem digita é ele.

1. Clone `https://github.com/mallucao/conta-arroba.git` em `%LOCALAPPDATA%\conta-arroba` (fora do Google Drive). Se a pasta já existir e for um clone, só rode `git pull`. Não use nem rode git em uma cópia que esteja dentro do Google Drive: duas máquinas mexendo no mesmo `.git` sincronizado estragam o repositório.
2. Leia `scripts\instalar.ps1`, `scripts\atualizar-cotacao.cmd` e a seção "Instalar no computador que fica ligado" do `README.md` antes de rodar qualquer coisa.
3. Na pasta do clone, rode: `powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1`
   - Se faltar Node.js, Git ou GitHub CLI, o instalador os instala pelo winget (pacotes oficiais `OpenJS.NodeJS.LTS`, `Git.Git`, `GitHub.cli`). Avise o Vina do que está sendo instalado; pode aparecer a janela de permissão do Windows para ele clicar em Sim.
   - Se o instalador parar dizendo que falta login no GitHub: abra um terminal visível e rode `gh auth login` nele para o Vina responder (GitHub.com, HTTPS, autenticar o Git: sim, "Login with a web browser"). A conta precisa ser `mallucao`, dona do repositório. Depois rode o instalador de novo.
   - Se parar por outro motivo, leia a mensagem e resolva. Não edite `dist/quote.json` à mão nem mude horários ou nomes sem o Vina pedir.
4. No final o instalador roda a tarefa uma vez e mostra as últimas linhas de `scripts\cotacao.log`. Em fim de semana ou feriado é normal aparecer "sem mudanca no arquivo": não há pregão novo.
5. Confirme com `Get-ScheduledTask -TaskName 'Conta da arroba - cotacao'` que a tarefa existe e está "Ready". Diga ao Vina em duas frases se deu certo e quando é a próxima rodada.
