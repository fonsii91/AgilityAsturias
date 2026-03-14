$deployDir = "c:\Users\Usuario\Desktop\AgilityAsturiass\deploy_package"
Get-ChildItem $deployDir -Recurse -Directory |
    Select-Object FullName, @{Name="SizeMB";Expression={
        $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        [math]::Round($size / 1MB, 2)
    }} | Sort-Object SizeMB -Descending | Select-Object -First 10 | Format-Table -AutoSize
