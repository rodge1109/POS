$lines = Get-Content 'src/App.jsx'
$part1 = $lines[0..7205]
$part2 = $lines[9184..($lines.Count - 1)]
$newLines = $part1 + $part2
$newLines | Out-File -FilePath 'src/App.jsx' -Encoding utf8
