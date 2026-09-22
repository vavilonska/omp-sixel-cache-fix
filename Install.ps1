param([ValidateSet('Install', 'Update', 'Uninstall')][string]$Action = 'Install')
$ErrorActionPreference = 'Stop'
$packageSource = Join-Path $PSScriptRoot 'plugin'
$extensionsRoot = [IO.Path]::GetFullPath((Join-Path ([Environment]::GetFolderPath('UserProfile')) '.omp\agent\extensions'))
$installTarget = [IO.Path]::GetFullPath((Join-Path $extensionsRoot 'omp-sixel-cache-fix'))
$packageFiles = @('package.json', 'cache-patch.ts', 'README.md', 'LICENSE', 'index.ts')
if ([IO.Path]::GetDirectoryName($installTarget) -ne $extensionsRoot) { throw 'Unexpected installation boundary.' }
if ((Get-Content -LiteralPath (Join-Path $packageSource 'package.json') -Raw | ConvertFrom-Json).name -ne 'omp-sixel-cache-fix') { throw 'Unexpected source package.' }
foreach ($packageFile in $packageFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $packageSource $packageFile) -PathType Leaf)) { throw "Source file missing: $packageFile" }
}
$backupPath = $null
if (Test-Path -LiteralPath $installTarget) {
    $existing = Get-Item -LiteralPath $installTarget -Force
    if (($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Refusing to change a linked installation directory.' }
    $existingFiles = @(Get-ChildItem -LiteralPath $installTarget -Force)
    if ($existingFiles.Count -ne $packageFiles.Count) { throw 'Installation contains unexpected or missing files. Preserve and inspect it before updating.' }
    if ((Get-Content -LiteralPath (Join-Path $installTarget 'package.json') -Raw | ConvertFrom-Json).name -ne 'omp-sixel-cache-fix') { throw 'Unexpected installed package.' }
    $differs = $false
    foreach ($existingFile in $existingFiles) {
        if ($existingFile.PSIsContainer -or $existingFile.Name -notin $packageFiles -or ($existingFile.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Unexpected installed entry: $($existingFile.Name)" }
        if ((Get-FileHash -LiteralPath $existingFile.FullName).Hash -ne (Get-FileHash -LiteralPath (Join-Path $packageSource $existingFile.Name)).Hash) { $differs = $true }
    }
    if ($differs -and $Action -ne 'Update') { throw 'Installed files differ and were preserved. Use -Action Update to back up and update this plugin.' }
    if ($Action -eq 'Uninstall') {
        # Absolute target, package identity, exact entries and contents checked above.
        Remove-Item -LiteralPath $installTarget -Recurse -Force
        Write-Output 'Uninstalled. Reload or restart OMP after the active task finishes.'
        exit 0
    }
    if (-not $differs) {
        Write-Output "Already installed and verified: $installTarget"
        exit 0
    }
    $backupPath = Join-Path $PSScriptRoot ("work\install-backups\" + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fffffff'))
    New-Item -ItemType Directory -Path $backupPath | Out-Null
    foreach ($packageFile in $packageFiles) {
        $installedPath = Join-Path $installTarget $packageFile
        $savedPath = Join-Path $backupPath $packageFile
        Copy-Item -LiteralPath $installedPath -Destination $savedPath
        if ((Get-FileHash -LiteralPath $installedPath).Hash -ne (Get-FileHash -LiteralPath $savedPath).Hash) { throw "Backup verification failed: $packageFile" }
    }
    Write-Output "Previous plugin backed up and verified: $backupPath"
}
if ($Action -eq 'Uninstall') { Write-Output 'Already uninstalled.'; exit 0 }
if (-not (Test-Path -LiteralPath $installTarget)) { New-Item -ItemType Directory -Path $installTarget | Out-Null }
try {
    foreach ($packageFile in $packageFiles) {
        $sourcePath = Join-Path $packageSource $packageFile
        $targetPath = Join-Path $installTarget $packageFile
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
        if ((Get-FileHash -LiteralPath $sourcePath).Hash -ne (Get-FileHash -LiteralPath $targetPath).Hash) { throw "Installation verification failed: $packageFile" }
    }
} catch {
    if ($backupPath) {
        foreach ($packageFile in $packageFiles) { Copy-Item -LiteralPath (Join-Path $backupPath $packageFile) -Destination (Join-Path $installTarget $packageFile) -Force }
    }
    throw
}
Write-Output "Installed and verified: $installTarget"
Write-Output 'After the active task finishes, run /reload and /image-cache-fix status in OMP.'
