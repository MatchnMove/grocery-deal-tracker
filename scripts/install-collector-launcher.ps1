param([string]$RepositoryPath = (Split-Path -Parent $PSScriptRoot))

$installDirectory = Join-Path $env:LOCALAPPDATA "GroceryDealTrackerCollector"
$launcherPath = Join-Path $installDirectory "start-collector.cmd"
$protocolKey = "HKCU:\Software\Classes\grocerycollector"
New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
$launcher = "@echo off`r`ncd /d `"$RepositoryPath`"`r`nrailway run -- npm run collector`r`npause`r`n"
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding ASCII
New-Item -Path $protocolKey -Force | Out-Null
Set-ItemProperty -Path $protocolKey -Name "(default)" -Value "URL:Grocery Deal Tracker Collector"
New-ItemProperty -Path $protocolKey -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null
New-Item -Path "$protocolKey\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$protocolKey\shell\open\command" -Name "(default)" -Value "`"$launcherPath`" `"%1`""
Write-Host "Collector launcher installed. The Open desktop collector button can now start it."
