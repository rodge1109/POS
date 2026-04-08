$content = Get-Content "c:\website\pos-system\src\App.jsx"
$tags = @()
$openBraces = 0
$lineNum = 0
foreach ($line in $content) {
    $lineNum++
    # Find JSX tags like <div>, </div>, <form>, </form>
    # Very simple regex
    $matches = [regex]::Matches($line, "<(/?)(div|form)")
    foreach ($m in $matches) {
        $isClosing = $m.Groups[1].Value -eq "/"
        $tagName = $m.Groups[2].Value
        if (-not $isClosing) {
            $tags += @{ name = $tagName; line = $lineNum }
        } else {
            if ($tags.Count -gt 0) {
                $last = $tags[-1]
                if ($last.name -eq $tagName) {
                    $tags = $tags[0..($tags.Count - 2)]
                } else {
                    Write-Host "Mismatched tag: Expected </$($last.name)> (from line $($last.line)) but found </$tagName> at line $lineNum"
                    # Try to find the opener for this closer
                    $found = $false
                    for ($i = $tags.Count - 1; $i -ge 0; $i--) {
                        if ($tags[$i].name -eq $tagName) {
                            Write-Host "Auto-skipping mismatched tags between line $($tags[$i].line) and $lineNum"
                            $tags = $tags[0..($i - 1)]
                            $found = $true
                            break
                        }
                    }
                }
            } else {
                Write-Host "Closing tag </$tagName> at line $lineNum has no opening tag"
            }
        }
    }
}

foreach ($t in $tags) {
    Write-Host "Unclosed tag: <$($t.name)> at line $($t.line)"
}
