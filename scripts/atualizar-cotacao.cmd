@echo off
rem Busca o ultimo fechamento publicado e, se mudou, envia dist/quote.json para o GitHub.
rem Roda pela tarefa agendada do Windows (ver scripts\instalar.ps1); nunca pede senha nem trava.
setlocal
set GIT_TERMINAL_PROMPT=0
set GCM_INTERACTIVE=never
cd /d "%~dp0.."
echo [%date% %time%] inicio

rem Deixa a copia local igual ao GitHub: traz melhorias do script e cotacoes enviadas de outra maquina.
git pull --rebase -q origin main
if errorlevel 1 echo [%date% %time%] aviso: nao consegui atualizar a copia local; seguindo com o que tem

node server\update-quote.mjs
if errorlevel 1 (
  echo [%date% %time%] falha ao buscar a cotacao; arquivo anterior mantido
  exit /b 1
)

for /f "usebackq delims=" %%s in (`node -e "const q=require('./dist/quote.json');const p=q.tradeDate.split('-');console.log(p[2]+'/'+p[1]+'/'+p[0]+' '+q.contractLabel+' R$ '+q.price.toFixed(2).replace('.',','))"`) do set "SUMMARY=%%s"

git diff --quiet -- dist\quote.json
if errorlevel 1 goto :commit

rem Nada mudou agora; so envia se sobrou commit de uma rodada anterior que ficou sem internet.
git status -sb | findstr /c:"ahead" >nul
if errorlevel 1 (
  echo [%date% %time%] sem mudanca no arquivo: %SUMMARY%
  exit /b 0
)
echo [%date% %time%] commit pendente de rodada anterior; tentando enviar
goto :push

:commit
git add dist\quote.json
git commit -q -m "Cotacao: %SUMMARY%"
if errorlevel 1 (
  echo [%date% %time%] nao foi possivel criar o commit
  exit /b 1
)

:push
git pull --rebase -q origin main
git push -q origin main
if errorlevel 1 (
  echo [%date% %time%] commit criado, mas o envio falhou; a proxima rodada tenta de novo
  exit /b 1
)
echo [%date% %time%] enviado: %SUMMARY%
exit /b 0
