@echo off
rem Busca o ultimo fechamento publicado e, se mudou, envia dist/quote.json para o GitHub.
rem Pensado para o Agendador de Tarefas do Windows (dias uteis, fim de tarde e noite).
setlocal
cd /d "%~dp0.."
echo [%date% %time%] inicio
node server\update-quote.mjs
if errorlevel 1 (
  echo [%date% %time%] falha ao buscar a cotacao; arquivo anterior mantido
  exit /b 1
)
git diff --quiet -- dist\quote.json
if not errorlevel 1 (
  echo [%date% %time%] sem mudanca no arquivo
  exit /b 0
)
for /f "usebackq delims=" %%s in (`node -e "const q=require('./dist/quote.json');const p=q.tradeDate.split('-');console.log(p[2]+'/'+p[1]+'/'+p[0]+' '+q.contractLabel+' R$ '+q.price.toFixed(2).replace('.',','))"`) do set "SUMMARY=%%s"
git add dist\quote.json
git commit -q -m "Cotacao: %SUMMARY%"
if errorlevel 1 (
  echo [%date% %time%] nao foi possivel criar o commit
  exit /b 1
)
git pull --rebase -q origin main
git push -q origin main
if errorlevel 1 (
  echo [%date% %time%] commit criado, mas o envio falhou; tente de novo mais tarde
  exit /b 1
)
echo [%date% %time%] enviado: %SUMMARY%
exit /b 0
