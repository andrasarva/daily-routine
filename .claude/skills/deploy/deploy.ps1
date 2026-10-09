# Napi Rutin telepítése IIS alá: build → célmappa ürítése → dist másolása → ellenőrzés.
# Használat: powershell -ExecutionPolicy Bypass -File .claude\skills\deploy\deploy.ps1 [-Target <mappa>] [-Url <cím>]
param(
  [string]$Target = 'C:\inetpub\wwwroot\DailyRoutine',
  [string]$Url = 'http://localhost/DailyRoutine/'
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$dist = Join-Path $repo 'dist'

# --- Biztonsági ellenőrzés: a törlés csak egy "rendes" almappát érinthet ---
$full = [IO.Path]::GetFullPath($Target).TrimEnd('\')
$depth = ($full -split '\\').Count
if ($depth -lt 3) { throw "A célmappa túl közel van a meghajtó gyökeréhez, nem törlöm: $full" }
if ($full -ieq $repo.TrimEnd('\') -or $repo.StartsWith($full + '\', 'OrdinalIgnoreCase') -or $full.StartsWith($repo.TrimEnd('\') + '\', 'OrdinalIgnoreCase')) {
  throw "A célmappa a repóval átfed, nem törlöm: $full"
}

# --- 1. Build ---
Write-Host "==> Build ($repo)"
Push-Location $repo
try {
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'A build sikertelen. A célmappához nem nyúltam.' }
} finally {
  Pop-Location
}
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw 'Hiányzik a dist\index.html. A célmappához nem nyúltam.' }

# --- 2. Célmappa ürítése ---
if (Test-Path $full) {
  $old = @(Get-ChildItem -LiteralPath $full -Force)
  Write-Host "==> Törlés: $full ($($old.Count) elem)"
  $old | Remove-Item -Recurse -Force
} else {
  Write-Host "==> Célmappa létrehozása: $full"
  New-Item -ItemType Directory -Path $full | Out-Null
}

# --- 3. Másolás ---
Write-Host '==> Másolás: dist -> célmappa'
Copy-Item -Path (Join-Path $dist '*') -Destination $full -Recurse -Force

# --- 4. Ellenőrzés: ugyanazok a fájlok, ugyanakkora méretben ---
$rel = { param($root) Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length).TrimStart('\') + '|' + $_.Length } | Sort-Object }
$diff = Compare-Object (& $rel $dist) (& $rel $full)
if ($diff) {
  $diff | Format-Table -AutoSize | Out-String | Write-Host
  throw 'A célmappa tartalma eltér a dist-től.'
}
$count = @(Get-ChildItem -LiteralPath $full -Recurse -File).Count
Write-Host "==> OK: $count fájl a célmappában"

# --- 5. HTTP ellenőrzés (csak figyelmeztet, ha nem érhető el) ---
foreach ($p in @('', 'manifest.webmanifest', 'sw.js')) {
  try {
    $r = Invoke-WebRequest -Uri ($Url + $p) -UseBasicParsing -TimeoutSec 10
    Write-Host ("    {0,-24} {1} {2}" -f ('/' + $p), $r.StatusCode, $r.Headers['Content-Type'])
  } catch {
    Write-Warning ("{0}: {1}" -f ($Url + $p), $_.Exception.Message)
  }
}
