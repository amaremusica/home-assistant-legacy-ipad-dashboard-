# Wkleja ipad.css do <style> w ipad.html (UTF-8).
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$utf8 = New-Object System.Text.UTF8Encoding $false
$htmlPath = Join-Path $repo 'ipad.html'
$cssPath = Join-Path $repo 'ipad.css'
$html = [System.IO.File]::ReadAllText($htmlPath, $utf8)
$css = [System.IO.File]::ReadAllText($cssPath, $utf8)
if ($css.StartsWith('/*')) {
  $nl = $css.IndexOf("`n")
  if ($nl -gt 0) { $css = $css.Substring($nl + 1) }
}
$start = $html.IndexOf('<style>')
$end = $html.IndexOf('</style>')
if ($start -lt 0 -or $end -lt 0) { Write-Error 'Brak <style> w ipad.html'; exit 1 }
$newHtml = $html.Substring(0, $start + 7) + "`n" + $css.Trim() + "`n" + $html.Substring($end)
[System.IO.File]::WriteAllText($htmlPath, $newHtml, $utf8)
Write-Output 'OK: ipad.css -> ipad.html'
