@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  set "TYPEFLOW_NODE=node"
) else (
  set "TYPEFLOW_NODE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
echo Typing Animation: http://localhost:3000
echo Keep this window open while using the editor.
"%TYPEFLOW_NODE%" server.mjs
pause
