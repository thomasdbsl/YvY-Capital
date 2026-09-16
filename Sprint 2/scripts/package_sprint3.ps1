[CmdletBinding()]
param(
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
$deliveryRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'delivery'))
$stagingRoot = [System.IO.Path]::GetFullPath((Join-Path $deliveryRoot 'source'))
$verificationRoot = [System.IO.Path]::GetFullPath((Join-Path $deliveryRoot 'verify'))
if (-not $OutputPath) {
    $OutputPath = Join-Path $deliveryRoot 'YvY_Capital_Funds_Manager_Sprint_3.zip'
}
$archivePath = [System.IO.Path]::GetFullPath($OutputPath)
$archiveHashPath = $archivePath + '.sha256'

function Assert-ChildPath {
    param([string]$Candidate, [string]$Parent, [string]$Label)
    $prefix = $Parent.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $Candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label must remain inside $Parent"
    }
}

function Get-VerifiedRelativePath {
    param([string]$Candidate, [string]$Parent, [string]$Label)
    $fullCandidate = [System.IO.Path]::GetFullPath($Candidate)
    $fullParent = [System.IO.Path]::GetFullPath($Parent)
    Assert-ChildPath -Candidate $fullCandidate -Parent $fullParent -Label $Label
    $prefix = $fullParent.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    return $fullCandidate.Substring($prefix.Length)
}

Assert-ChildPath -Candidate $stagingRoot -Parent $deliveryRoot -Label 'Staging path'
Assert-ChildPath -Candidate $verificationRoot -Parent $deliveryRoot -Label 'Verification path'
Assert-ChildPath -Candidate $archivePath -Parent $deliveryRoot -Label 'Archive path'
Assert-ChildPath -Candidate $archiveHashPath -Parent $deliveryRoot -Label 'Archive hash path'

if (Test-Path -LiteralPath $stagingRoot) {
    $verifiedStaging = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stagingRoot).Path)
    Assert-ChildPath -Candidate $verifiedStaging -Parent $deliveryRoot -Label 'Existing staging path'
    Remove-Item -LiteralPath $verifiedStaging -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

$allowedExtensions = @('.css', '.csv', '.html', '.js', '.json', '.md', '.mjs', '.mmd', '.php', '.ps1', '.py', '.sql')
$rootFiles = @(
    '.env.example',
    '.gitignore',
    'README.md',
    'MAMP_MYSQL_SETUP.md',
    'RELEASE_NOTES.md',
    'package.json',
    'package-lock.json',
    'Sprint 2/README.md',
    'Sprint 2/src/README.md',
    'Sprint 2/database/sprint3_schema.sql'
)
$allowedDirectories = @(
    'Sprint 2/api',
    'Sprint 2/config',
    'Sprint 2/data/contracts',
    'Sprint 2/scripts',
    'Sprint 2/src/app',
    'Sprint 2/src/pipeline',
    'Sprint 2/tests',
    'docs/architecture',
    'docs/sprint3'
)

$relativeFiles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($relative in $rootFiles) {
    $source = Join-Path $repositoryRoot $relative
    if (Test-Path -LiteralPath $source -PathType Leaf) {
        [void]$relativeFiles.Add($relative)
    }
}
foreach ($relativeDirectory in $allowedDirectories) {
    $sourceDirectory = Join-Path $repositoryRoot $relativeDirectory
    if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
        throw "Required delivery directory is missing: $relativeDirectory"
    }
    Get-ChildItem -LiteralPath $sourceDirectory -Recurse -File | Where-Object {
        $allowedExtensions -contains $_.Extension.ToLowerInvariant() -and
        $_.FullName -notmatch '[\\/](__pycache__|output|output_sprint3|\.work|node_modules|test-results|playwright-report)[\\/]'
    } | ForEach-Object {
        [void]$relativeFiles.Add((Get-VerifiedRelativePath -Candidate $_.FullName -Parent $repositoryRoot -Label 'Delivery source file'))
    }
}

foreach ($relative in ($relativeFiles | Sort-Object)) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $relative))
    Assert-ChildPath -Candidate $source -Parent $repositoryRoot -Label 'Source file'
    $destination = Join-Path $stagingRoot $relative
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

$forbiddenPathPattern = '(?i)(^|[\\/])(data_YvY|node_modules|__pycache__|output_sprint3|output|\.work|test-results|playwright-report)([\\/]|$)|(?i)(data_YvY\.zip|\.env|config\.php|\.pdf|\.pptx|\.docx|\.zip|\.pyc)$'
$forbiddenContentPatterns = @(
    '(?i)BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY',
    '(?i)\b(?:gh[pousr]_|sk-)[A-Za-z0-9_-]{20,}\b',
    '\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b',
    '\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b',
    '(?i)[A-Z]:\\Users\\[^<\\\s]+'
)

$packagedFiles = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File
foreach ($file in $packagedFiles) {
    $relative = Get-VerifiedRelativePath -Candidate $file.FullName -Parent $stagingRoot -Label 'Packaged file'
    if ($relative -match $forbiddenPathPattern) {
        throw "Forbidden path in delivery: $relative"
    }
    if ($file.Length -gt 10MB) {
        throw "File exceeds the 10 MB delivery limit: $relative"
    }
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    foreach ($pattern in $forbiddenContentPatterns) {
        if ($content -match $pattern) {
            throw "Potential secret or private identifier in delivery file: $relative"
        }
    }
}

$manifestLines = foreach ($file in ($packagedFiles | Sort-Object FullName)) {
    $relative = (Get-VerifiedRelativePath -Candidate $file.FullName -Parent $stagingRoot -Label 'Manifest file').Replace('\', '/')
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $relative"
}
$manifestPath = Join-Path $stagingRoot 'DELIVERY_MANIFEST.sha256'
[System.IO.File]::WriteAllLines($manifestPath, $manifestLines, [System.Text.UTF8Encoding]::new($false))

if (Test-Path -LiteralPath $archivePath) {
    $verifiedArchive = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $archivePath).Path)
    Assert-ChildPath -Candidate $verifiedArchive -Parent $deliveryRoot -Label 'Existing archive path'
    Remove-Item -LiteralPath $verifiedArchive -Force
}
Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal

if (Test-Path -LiteralPath $verificationRoot) {
    $verifiedVerification = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $verificationRoot).Path)
    Assert-ChildPath -Candidate $verifiedVerification -Parent $deliveryRoot -Label 'Existing verification path'
    Remove-Item -LiteralPath $verifiedVerification -Recurse -Force
}
New-Item -ItemType Directory -Path $verificationRoot -Force | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $verificationRoot -Force

$extractedManifest = Join-Path $verificationRoot 'DELIVERY_MANIFEST.sha256'
if (-not (Test-Path -LiteralPath $extractedManifest -PathType Leaf)) {
    throw 'Archive integrity check failed: manifest is missing'
}
$manifestEntries = Get-Content -LiteralPath $extractedManifest | Where-Object { $_ -ne '' }
foreach ($entry in $manifestEntries) {
    if ($entry -notmatch '^([a-f0-9]{64})  (.+)$') {
        throw "Archive integrity check failed: invalid manifest entry $entry"
    }
    $expectedHash = $Matches[1]
    $relative = $Matches[2].Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $extractedFile = [System.IO.Path]::GetFullPath((Join-Path $verificationRoot $relative))
    Assert-ChildPath -Candidate $extractedFile -Parent $verificationRoot -Label 'Extracted manifest file'
    if (-not (Test-Path -LiteralPath $extractedFile -PathType Leaf)) {
        throw "Archive integrity check failed: missing $relative"
    }
    $actualHash = (Get-FileHash -LiteralPath $extractedFile -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHash) {
        throw "Archive integrity check failed: hash mismatch for $relative"
    }
}

$extractedFiles = Get-ChildItem -LiteralPath $verificationRoot -Recurse -File
if ($extractedFiles.Count -ne ($manifestEntries.Count + 1)) {
    throw 'Archive integrity check failed: extracted file count does not match manifest'
}
foreach ($file in $extractedFiles) {
    $relative = Get-VerifiedRelativePath -Candidate $file.FullName -Parent $verificationRoot -Label 'Extracted file'
    if ($relative -match $forbiddenPathPattern) {
        throw "Forbidden path in extracted archive: $relative"
    }
    if ($file.Name -ne 'DELIVERY_MANIFEST.sha256') {
        $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
        foreach ($pattern in $forbiddenContentPatterns) {
            if ($content -match $pattern) {
                throw "Potential secret or private identifier in extracted archive: $relative"
            }
        }
    }
}

$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText($archiveHashPath, "$archiveHash  $([System.IO.Path]::GetFileName($archivePath))`n", [System.Text.UTF8Encoding]::new($false))
Remove-Item -LiteralPath $verificationRoot -Recurse -Force

$archive = Get-Item -LiteralPath $archivePath
Write-Output "Sprint 3 delivery created: $($archive.FullName)"
Write-Output "Files: $($packagedFiles.Count + 1)"
Write-Output "Bytes: $($archive.Length)"
Write-Output "SHA-256: $archiveHash"
Write-Output 'Archive extraction, manifest hashes, forbidden paths, and secret patterns verified.'
