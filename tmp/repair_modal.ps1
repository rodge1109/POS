$file = "c:\website\pos-system\src\App.jsx"
$content = Get-Content $file
$newContent = @()
for ($i=0; $i -lt $content.Length; $i++) {
    if ($i -eq 8958) {
        $newContent += "            </form>"
        $newContent += "          </div>"
    } else {
        $newContent += $content[$i]
    }
}
$newContent | Set-Content $file
