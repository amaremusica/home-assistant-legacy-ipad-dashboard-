# Dodaje git z GitHub Desktop do PATH użytkownika (Windows).
# Uruchom po aktualizacji GitHub Desktop, gdy zmieni się folder app-*.

$gitCmd = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd" -Directory -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1

if (-not $gitCmd) {
  Write-Error "Nie znaleziono git w GitHub Desktop."
  exit 1
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$parts = @()
if ($userPath) {
  $parts = $userPath -split ';' | Where-Object {
    $_ -and $_ -notmatch '\\GitHubDesktop\\app-[^\\]+\\resources\\app\\git\\cmd$'
  }
}
$newPath = ($parts + $gitCmd.FullName) -join ';'
[Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
Write-Output "Dodano do PATH: $($gitCmd.FullName)"
Write-Output "Zrestartuj terminal / Cursor."
