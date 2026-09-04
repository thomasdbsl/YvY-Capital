[CmdletBinding()]
param(
    [string]$InputPath,
    [string]$DatabaseName = $(if ($env:FUNDS_MANAGER_DB_NAME) { $env:FUNDS_MANAGER_DB_NAME } else { 'yvy_funds_manager' }),
    [switch]$Reset
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$pipeline = Join-Path $PSScriptRoot '..\src\pipeline\run_sprint3.py'
if (-not $InputPath) {
    $InputPath = Join-Path $repositoryRoot 'data_YvY'
}

if (-not (Test-Path -LiteralPath $InputPath -PathType Container)) {
    throw "Source directory not found: $InputPath"
}
if (-not $env:FUNDS_MANAGER_DB_PASSWORD -and -not $env:MYSQL_PWD) {
    throw 'Set FUNDS_MANAGER_DB_PASSWORD in the current terminal. Never store the password in Git.'
}

Push-Location $repositoryRoot
try {
    $arguments = @($pipeline, '--input', $InputPath, '--database', $DatabaseName)
    if ($Reset) {
        $arguments += '--reset-database'
    }
    py -3.12 @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Sprint 3 ingestion failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

Write-Output "The governed Sprint 3 database '$DatabaseName' is ready. Running this command again is idempotent. Use -Reset for a complete rebuild."
