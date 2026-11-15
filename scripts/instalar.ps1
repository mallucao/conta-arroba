<#
Instala neste computador a atualização automática da cotação do "Conta da arroba".

O que faz: confere Node.js, Git e GitHub CLI (instala pelo winget se faltarem), confere o login
no GitHub e registra uma tarefa agendada do Windows que roda scripts\atualizar-cotacao.cmd
todo dia às 18h40 (repetindo a cada 70 min até 22h40) e às 9h15, sem abrir janela.
A cotação só muda em dia de pregão; nos outros dias o script apenas constata que não há novidade.

Uso, na pasta do projeto clonada FORA do Google Drive (por exemplo %LOCALAPPDATA%\conta-arroba):
  powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
Remover a tarefa:
  powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Remover
#>
[CmdletBinding()]
param(
  [switch]$Remover,
  [switch]$SemTeste,
  [string]$NomeTarefa = 'Conta da arroba - cotacao'
)

$ErrorActionPreference = 'Continue'
$pasta = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$scripts = Join-Path $pasta 'scripts'
$log = Join-Path $scripts 'cotacao.log'
$cmd = Join-Path $scripts 'atualizar-cotacao.cmd'
$vbs = Join-Path $scripts 'rodar-oculto.vbs'
$site = 'https://mallucao.github.io/conta-arroba/'

function Passo($texto) { Write-Host ''; Write-Host "== $texto" -ForegroundColor Cyan }
function Ok($texto) { Write-Host "   [ok] $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "   [!] $texto" -ForegroundColor Yellow }
function Parar($texto) { Write-Host "   [x] $texto" -ForegroundColor Red; exit 1 }
function Tem($programa) { return [bool](Get-Command $programa -ErrorAction SilentlyContinue) }
function AtualizarPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Instalar($id, $nome) {
  if (-not (Tem 'winget')) { Parar "Falta $nome e o winget não está disponível. Instale $nome manualmente e rode de novo." }
  Aviso "Instalando $nome pelo winget (pacote oficial $id). Pode aparecer um pedido de permissão do Windows."
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent | Out-Host
  AtualizarPath
}

if ($Remover) {
  Passo "Removendo a tarefa agendada '$NomeTarefa'"
  if (Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $NomeTarefa -Confirm:$false
    Ok 'Tarefa removida. A pasta do projeto e o site continuam como estão.'
  } else {
    Aviso 'Não havia tarefa com esse nome.'
  }
  exit 0
}

Passo 'Pasta do projeto'
if (-not (Test-Path (Join-Path $pasta '.git'))) {
  Parar "A pasta $pasta não é um clone do repositório. Clone antes: git clone https://github.com/mallucao/conta-arroba.git"
}
if ($pasta -match 'Google Drive|Meu Drive|My Drive') {
  Aviso "A pasta parece estar dentro do Google Drive. Prefira um clone fora dele (ex.: $env:LOCALAPPDATA\conta-arroba) para a sincronização não brigar com o git."
}
Set-Location $pasta
Ok $pasta

Passo 'Programas necessários'
if (-not (Tem 'git')) { Instalar 'Git.Git' 'Git' }
if (-not (Tem 'git')) { Parar 'Git não encontrado mesmo após instalar. Feche e abra o terminal e rode de novo.' }
Ok ((git --version) -replace '^git version ', 'Git ')

if (-not (Tem 'node')) { Instalar 'OpenJS.NodeJS.LTS' 'Node.js' }
if (-not (Tem 'node')) { Parar 'Node.js não encontrado mesmo após instalar. Feche e abra o terminal e rode de novo.' }
$versaoNode = (node -v).TrimStart('v')
if ([int]($versaoNode.Split('.')[0]) -lt 20) {
  Parar "Node.js $versaoNode é antigo; precisa da versão 20 ou mais nova (winget install --id OpenJS.NodeJS.LTS -e)."
}
Ok "Node.js $versaoNode"

if (-not (Tem 'gh')) { Instalar 'GitHub.cli' 'GitHub CLI' }
if (-not (Tem 'gh')) { Parar 'GitHub CLI (gh) não encontrado mesmo após instalar. Feche e abra o terminal e rode de novo.' }
Ok (((gh --version) | Select-Object -First 1) -replace '^gh version ', 'GitHub CLI ')

Passo 'Acesso ao GitHub'
cmd /c 'gh auth status >nul 2>&1'
if ($LASTEXITCODE -ne 0) {
  Parar 'Este computador ainda não está logado no GitHub. Rode no terminal:  gh auth login   (GitHub.com, HTTPS, autenticar o Git: sim, "Login with a web browser"). Depois rode este instalador de novo.'
}
$conta = cmd /c 'gh api user --jq .login 2>nul'
$remoto = git remote get-url origin
Ok "Logado como $conta; repositório $remoto"

cmd /c 'gh auth setup-git >nul 2>&1'
if ($LASTEXITCODE -eq 0) { Ok 'O git vai usar o login do gh (sem pedir senha na tarefa agendada)' }

$nomeGit = git config --get user.name
if (-not $nomeGit) {
  $idConta = cmd /c 'gh api user --jq .id 2>nul'
  git config user.name 'Conta da arroba (robo)'
  git config user.email "$idConta+$conta@users.noreply.github.com"
  Ok 'Identidade do git definida só nesta pasta, com o e-mail noreply do GitHub'
} else {
  Ok "Identidade do git já configurada ($nomeGit)"
}

$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
cmd /c 'git push --dry-run origin main >nul 2>&1'
if ($LASTEXITCODE -ne 0) {
  Parar "A conta $conta não consegue enviar para $remoto. Precisa ser a dona do repositório (ou ter permissão de escrita)."
}
Ok 'Permissão de envio confirmada (teste a seco; nada foi enviado)'

Passo 'Tarefa agendada'
$fuso = Get-TimeZone
if ($fuso.Id -ne 'E. South America Standard Time') {
  Aviso "Fuso horário deste computador: $($fuso.Id). Os horários da tarefa seguem o relógio dele."
}
if (Test-Path "$env:windir\System32\wscript.exe") {
  $acao = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //Nologo `"$vbs`"" -WorkingDirectory $scripts
} else {
  Aviso 'wscript.exe não encontrado; a tarefa vai abrir uma janela preta por alguns segundos a cada rodada.'
  $acao = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"`"$cmd`" >> `"$log`" 2>&1`"" -WorkingDirectory $scripts
}
$noite = New-ScheduledTaskTrigger -Daily -At '18:40'
$repeticao = New-ScheduledTaskTrigger -Once -At '18:40' -RepetitionInterval (New-TimeSpan -Minutes 70) -RepetitionDuration (New-TimeSpan -Hours 4)
$noite.Repetition = $repeticao.Repetition
$manha = New-ScheduledTaskTrigger -Daily -At '09:15'
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$descricao = "Busca o fechamento do boi gordo (B3 via Noticias Agricolas) e envia dist/quote.json para $remoto. Script: $cmd. Registro: $log"
Register-ScheduledTask -TaskName $NomeTarefa -Action $acao -Trigger @($noite, $manha) -Settings $config -Description $descricao -Force | Out-Null
if (-not (Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue)) {
  Parar 'Não consegui registrar a tarefa agendada. Veja a mensagem de erro acima.'
}
Ok "Tarefa '$NomeTarefa' registrada: todo dia 18h40 (repete a cada 70 min até 22h40) e 9h15"

if (-not $SemTeste) {
  Passo 'Teste: rodando a tarefa agora'
  $inicio = (Get-Date).AddSeconds(-5)
  Start-ScheduledTask -TaskName $NomeTarefa
  $limite = (Get-Date).AddSeconds(120)
  do {
    Start-Sleep -Seconds 3
    $estado = (Get-ScheduledTask -TaskName $NomeTarefa).State
    $info = Get-ScheduledTaskInfo -TaskName $NomeTarefa
    $terminou = ($estado -ne 'Running') -and ($info.LastRunTime -ge $inicio)
  } while (-not $terminou -and (Get-Date) -lt $limite)
  if (-not $terminou) {
    Aviso "A tarefa ainda não terminou; confira o registro mais tarde: $log"
  } elseif ($info.LastTaskResult -eq 0) {
    Ok 'Rodou e terminou bem (código 0)'
  } else {
    Aviso ("A tarefa terminou com código {0}; veja o registro abaixo" -f $info.LastTaskResult)
  }
  if (Test-Path $log) {
    Write-Host ''
    Write-Host "   Últimas linhas de $log" -ForegroundColor DarkGray
    Get-Content $log -Tail 8 | ForEach-Object { Write-Host "   $_" }
  } else {
    Aviso "O registro $log não foi criado; a tarefa não chegou a rodar o script."
  }
}

Passo 'Pronto'
$info = Get-ScheduledTaskInfo -TaskName $NomeTarefa
Write-Host "   Tarefa: $NomeTarefa"
Write-Host ('   Próxima rodada: {0:dd/MM/yyyy HH:mm}' -f $info.NextRunTime)
Write-Host '   A cotação só muda em dia de pregão; o site mostra a data do pregão e a hora da coleta.'
Write-Host "   Registro: $log"
Write-Host "   Site: $site"
Write-Host "   Para remover: powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Remover"
