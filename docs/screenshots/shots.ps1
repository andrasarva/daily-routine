param([string]$Out = "$PSScriptRoot")
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
New-Item -ItemType Directory -Force $Out | Out-Null
$routes = @{
  'setup'    = 'http://localhost:4173/'
  'picker'   = 'http://localhost:4173/?demo#/'
  'home'     = 'http://localhost:4173/?demo#/c/bence'
  'list'     = 'http://localhost:4173/?demo#/c/bence/l/reggel'
  'listdino' = 'http://localhost:4173/?demo#/c/mate/l/este'
  'stickers' = 'http://localhost:4173/?demo#/c/bence/matricak'
}
foreach ($k in $routes.Keys) {
  $prof = Join-Path $env:TEMP ("nr-prof-" + $k + "-" + [guid]::NewGuid())
  & $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$prof" --window-size=1280,800 --virtual-time-budget=4000 --screenshot="$Out\$k.png" $routes[$k] 2>$null | Out-Null
  Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
}
Get-ChildItem $Out
