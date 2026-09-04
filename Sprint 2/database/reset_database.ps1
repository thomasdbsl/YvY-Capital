[CmdletBinding()]
param(
    [string]$HostName = $(if ($env:FUNDS_MANAGER_DB_HOST) { $env:FUNDS_MANAGER_DB_HOST } else { '127.0.0.1' }),
    [int]$Port = $(if ($env:FUNDS_MANAGER_DB_PORT) { [int]$env:FUNDS_MANAGER_DB_PORT } else { 3306 }),
    [string]$User = $(if ($env:FUNDS_MANAGER_DB_USER) { $env:FUNDS_MANAGER_DB_USER } else { 'root' }),
    [string]$MySqlExecutable = $(if ($env:MAMP_MYSQL_EXECUTABLE) { $env:MAMP_MYSQL_EXECUTABLE } else { 'C:\MAMP\bin\mysql\bin\mysql.exe' })
)

$ErrorActionPreference = 'Stop'
$databaseRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$schema = Join-Path $databaseRoot 'schema.sql'
$seed = Join-Path $databaseRoot 'seed.sql'

if (-not (Test-Path -LiteralPath $MySqlExecutable)) {
    throw "MySQL client not found. Set MAMP_MYSQL_EXECUTABLE to the mysql executable used by MAMP."
}
if (-not $env:MYSQL_PWD) {
    throw 'Set MYSQL_PWD only in the current terminal before running this reset, then remove it afterward.'
}

Get-Content -LiteralPath $schema -Raw | & $MySqlExecutable --host=$HostName --port=$Port --user=$User
if ($LASTEXITCODE -ne 0) { throw 'schema.sql import failed.' }

Get-Content -LiteralPath $seed -Raw | & $MySqlExecutable --host=$HostName --port=$Port --user=$User
if ($LASTEXITCODE -ne 0) { throw 'seed.sql import failed.' }

Write-Output 'The yvy_funds_manager_demo database was reset with synthetic data only.'
