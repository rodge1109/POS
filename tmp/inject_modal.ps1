$clean = Get-Content "c:\website\pos-system\tmp\clean_product_modal.jsx"
$app = Get-Content "c:\website\pos-system\src\App.jsx"
$new = $app[0..8661]
foreach ($line in $clean) {
    $new += $line
}
for ($i=8979; $i -lt $app.Length; $i++) {
    $new += $app[$i]
}
$new | Set-Content "c:\website\pos-system\src\App.jsx"
