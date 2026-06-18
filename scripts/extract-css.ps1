# Kopiuje CSS z ipad.html do ipad.css (ipad.html = źródło prawdy w runtime).
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$utf8 = New-Object System.Text.UTF8Encoding $false
$html = [System.IO.File]::ReadAllText((Join-Path $repo 'ipad.html'), $utf8)
$start = $html.IndexOf('<style>') + 7
$end = $html.IndexOf('</style>')
if ($start -lt 7 -or $end -lt 0) { Write-Error 'Brak <style> w ipad.html'; exit 1 }
$css = $html.Substring($start, $end - $start).Trim()
$header = "/* Źródło: wbudowane w ipad.html — edytuj ipad.html, potem ten skrypt */`n"
[System.IO.File]::WriteAllText((Join-Path $repo 'ipad.css'), $header + $css, $utf8)
Write-Output 'OK: ipad.html -> ipad.css'
