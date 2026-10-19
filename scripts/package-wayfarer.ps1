$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$reviewPath = Join-Path (Split-Path -Parent $projectRoot) 'output/wayfarer-review'
$reportPath = Join-Path $reviewPath 'validation.json'
if (!(Test-Path -LiteralPath $reportPath)) { throw 'Run check-wayfarer-art.mjs first.' }
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($report.parts -ne 79 -or $report.errors.Count -gt 0 -or ($report.records | Where-Object { $_.edgeFrames -gt 0 -or $_.emptyFrames -gt 0 })) {
    throw 'Art validation is not passing; handoff was not packaged.'
}
$zipPath = Join-Path $reviewPath 'wayfarer-painted-v2.zip'
Add-Type -AssemblyName System.IO.Compression
$kitPath = Join-Path $projectRoot 'public/sprites/wayfarer'
$archiveStream = [System.IO.File]::Create($zipPath)
$archive = [System.IO.Compression.ZipArchive]::new($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = @(Get-ChildItem -LiteralPath $kitPath -File -Recurse) + @(Get-Item -LiteralPath (Join-Path $projectRoot 'CHARACTER_ART_GUIDE.md'), $reportPath)
    foreach ($file in $files) {
        $name = if ($file.FullName.StartsWith($kitPath + '\')) { 'wayfarer/' + $file.FullName.Substring($kitPath.Length + 1).Replace('\','/') } else { $file.Name }
        $entryStream = $archive.CreateEntry($name).Open()
        $sourceStream = [System.IO.File]::Open($file.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        try { $sourceStream.CopyTo($entryStream) } finally { $sourceStream.Dispose(); $entryStream.Dispose() }
    }
} finally { $archive.Dispose(); $archiveStream.Dispose() }
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
