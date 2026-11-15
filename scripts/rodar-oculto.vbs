' Roda atualizar-cotacao.cmd sem abrir janela e guarda a saida em cotacao.log.
' Usado pela tarefa agendada do Windows (ver instalar.ps1). Devolve o codigo de saida do script.
Option Explicit
Dim fso, sh, pasta, comando
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
comando = "cmd.exe /c """"" & pasta & "\atualizar-cotacao.cmd"" >> """ & pasta & "\cotacao.log"" 2>&1"""
WScript.Quit sh.Run(comando, 0, True)
