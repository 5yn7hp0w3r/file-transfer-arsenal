# 15 - For Blue Team (defense and detection)

> [← README](../../README.md)

This section is for the defender. It doesn't teach you how to get files out; it shows what that activity leaves in the logs, where to catch it, and what to close off in advance.

The scope is file transfer and exfiltration: HTTP/SMB/FTP/SSH, BITS, LOLBins, DNS/ICMP tunnels, steganography, cloud, and email. Attacker techniques are in sections 01–14.

> The `LHOST`/`RHOST` variables aren't used here. Links to the attack sections are for context only.

---

## Navigation

|  |  |
|---|---|
| [1. What we protect](#1-what-we-protect) | [2. What a transfer looks like](#2-what-a-transfer-looks-like) |
| [3. What to close off in advance](#3-what-to-close-off-in-advance) | [4. Telemetry](#4-telemetry) |
| [5. Detection by channel](#5-detection-by-channel) | [6. Hunting](#6-hunting) |
| [7. MITRE ATT&CK](#7-mitre-attck) | [8. Response](#8-response) |
| [9. Tools](#9-tools) | [10. Checklist](#10-checklist) |
| [11. References](#11-references) |  |

---

## 1. What we protect

Three things matter to a defender when it comes to file transfer:

1. **Where a host can go.** If only the egress you actually need is allowed, half the channels disappear on their own.
2. **What a host can execute.** `certutil`, `bitsadmin`, PowerShell, and Office are legitimate tools, which is exactly why attackers like them.
3. **What we manage to see.** Without logs and a sane response time, the answer will be "the file is already gone."

The beginner's mistake is hunting only for "a virus." During exfiltration there's often no malware and no suspicious binary at all: just the stock `certutil`, BITS, `curl`, or DNS queries.

---

## 2. What a transfer looks like

A typical chain:

```text
1. Delivery to the target  -> HTTP/SMB/FTP/SSH, BITS, LOLBins
2. Staging and packing     -> archive, base64, encryption
3. Transfer from target    -> HTTP upload, SMB, SSH, email, cloud
4. Quiet channels          -> DNS, ICMP, steganography
```

In practice the stages are often mixed. For example, `certutil` can both download a file and encode it as base64, while `bitsadmin` can pull a payload and leave behind a job that survives a reboot.

The defender doesn't need to catch a specific binary. They need to see the **anomaly in the chain**: who spawned the process, where it went, what it wrote to disk, and what it sent out.

---

## 3. What to close off in advance

### 3.1. Egress

An egress allow-list works better than a block-list, but it takes discipline: the list of domains and ports has to be maintained. Leave it as "allow everything except the bad stuff" and an attacker simply moves to another domain.

Worth closing or restricting:

- non-standard ports: 4444, 9001, 8000, 1337, 2121 and the like;
- direct SMB (445) outbound;
- SMBv1, LLMNR, and NBT-NS;
- outbound ICMP where it isn't needed for diagnostics;
- DoH/DoT that bypasses corporate DNS, if policy requires DNS control;
- personal clouds and file-sharing services the business doesn't need.

Separately, verify that the proxy and firewall **log** denials. A blocked channel is a signal too: a host tried to go somewhere.

### 3.2. Windows

- WDAC or AppLocker for everything you can restrict.
- Defender ASR rules: block execution from macros, email, and scripts in user directories.
- PowerShell: Constrained Language Mode, Script Block Logging (4104), Module Logging (4103), Transcription.
- AMSI enabled; verify it hasn't been turned off by policy.
- Sysmon with a sane config, not "installed and forgotten."
- EDR on workstations **and** servers.

Restrict LOLBins selectively. Ban `certutil` outright and PKI plus updates break. Ban `bitsadmin` and updates and some enterprise agents may suffer. So: inventory first, then rules with exceptions.

Worth checking separately:

- `certutil -urlcache`, `-verifyctl`, `-URL` - download;
- `bitsadmin /transfer`, `Start-BitsTransfer` - BITS;
- `mshta`, `regsvr32 /i:http`, `msiexec /i http://...` - execution from a URL;
- `rundll32 url.dll,FileProtocolHandler` - opening a URL;
- Office applications launched with a URL in their arguments.

### 3.3. DNS and proxy

DNS is one of the most underrated sources. Turn on:

- query logging on clients;
- RPZ/category filtering;
- DoH/DoT control;
- a dedicated alert for long, high-entropy names;
- at least 30 days of retention, otherwise hunting "what happened last month" doesn't work.

On the proxy, look past the URL at:

- method (POST/PUT);
- request body size;
- User-Agent;
- SNI and JA3/JA4;
- non-standard ports;
- uploads to file-sharing sites and personal clouds.

TLS inspection helps, but it isn't a silver bullet: some traffic stays encrypted, and policy may forbid inspection.

### 3.4. Email

- SPF, DKIM, DMARC (`p=reject`).
- Sandboxing for attachments and links.
- Blocking/converting ISO, LNK, OneNote, CHM, and scripts.
- Checking display name, `Return-Path`, `Reply-To`: display-name spoofing still works today.
- Gateway logs should retain attachments, hashes, and sandbox results.

### 3.5. Data and access

- Data classification and sensitivity labels.
- DLP for email, web, removable media, and cloud.
- Encryption at rest and key management.
- Least privilege, MFA, LAPS, Credential Guard.
- Dedicated service accounts with limited rights and rotation.

### 3.6. Logging

Without this section, the rest of the detections are theory:

- centralized logging in a SIEM;
- protection of logs against deletion and modification;
- NTP on every source;
- process creation auditing **with the command line** (4688 plus the "Include command line in process creation events" policy);
- PowerShell 4103/4104;
- Sysmon;
- DNS, proxy, firewall, BITS, Defender, mail gateway.

If you don't have a SIEM, start with Sysmon + PowerShell 4104 + BITS + DNS. That already gets you further than searching by file name.

PowerShell logs aren't a panacea. 4104 won't show up if Script Block Logging is off, and commands can be encoded or split apart. In those cases, look at the parent process, network connections, and module loads.

---

## 4. Telemetry

| Source | What it gives you |
|---|---|
| **Sysmon** | processes, network, files, DLLs, registry, DNS, ADS |
| **Windows Security** | 4688, 4624/4625, 4672, 4697, 4698, 4720, 4768/4769, 4776, 5140/5145, 1102 |
| **System** | 7045 (service installation), driver errors |
| **PowerShell Operational** | 4103 (module logging), 4104 (script block) |
| **BITS-Client/Operational** | 3, 4, 59, 60, 61: jobs and URLs |
| **Defender** | 1116/1117, detections and actions |
| **DNS logs** | QNAME, NXDOMAIN, TXT/NULL, anomalies |
| **Proxy / SWG** | URL, method, UA, sizes, SNI/JA3/JA4 |
| **Zeek / Suricata** | DNS, TLS, HTTP, SMB, ICMP, flow |
| **NetFlow / IPFIX** | volumes, directions, beaconing |
| **EDR** | processes, injections, memory, channels |
| **Linux auditd / eBPF** | execve, connect, open/write, DNS |
| **Cloud audit** | CloudTrail, Azure Activity, GCP Audit |
| **CASB / DLP** | cloud, uploads, sensitive data |
| **Mail gateway** | attachments, links, sandbox |

### Sysmon: what to enable

| EID | Event | Why |
|---|---|---|
| 1 | Process Create | command line, parent-child, LOLBins |
| 3 | Network Connect | where the process goes |
| 7 | Image Load | sideloading, `qmgrprxy.dll` and other libraries |
| 8 | CreateRemoteThread | injections |
| 10 | ProcessAccess | access to process memory |
| 11 | File Create | dropped files and stubs |
| 12/13/14 | Registry | autorun, policies, settings |
| 15 | FileCreateStreamHash | NTFS ADS |
| 17/18 | Pipe | named pipes, C2 |
| 19/20/21 | WMI | subscriptions and delivery |
| 22 | DNS Query | DNS tunnels and rare domains |
| 23 | FileDelete | covering tracks |
| 25 | ProcessTampering | hollowing/injection |
| 26 | FileDeleteDetected | file deletions |

> EID 22 and 7 depend on the Sysmon config. If you see no DNS queries, check the config first instead of concluding "DNS isn't used."

### Windows Security: what to look at

- `4688` - process creation; without the separate command-line policy it won't have one.
- `4624`/`4625` - successful and failed logons; check the logon type (3, 10, 7).
- `4672` - special privileges.
- `4697` - service installation; `7045` in System is the duplicate.
- `4698`/`4702` - task creation/modification.
- `4720`/`4732` - new users and groups.
- `4768`/`4769`/`4776` - Kerberos and NTLM.
- `5140`/`5145` - SMB share access.
- `1102` - log cleared; a red flag on its own.

### BITS

BITS is useful to attackers because it's a stock Windows service and it can resume downloads after a reboot. The main log:

`Microsoft-Windows-Bits-Client/Operational`

The log is usually enabled, but on many estates nobody ships it to the SIEM. If the channel is missing, you won't see BITS even with Sysmon.

What to look at:

- **3** - job created: name, owner, creating process;
- **59** - transfer started: URL;
- **60** - transfer stopped: URL and result code;
- **61** - error;
- **4** - job completed.

BITS network traffic comes from `svchost.exe`, not from `bitsadmin.exe`. So watching the `bitsadmin` process alone isn't enough. Look for the chain: who created the job (3) → where the URL went (59) → what appeared on disk (Sysmon 11).

The BITS job name is set by whoever created it, so "Chrome Update" in the name proves nothing. Look at the creating process and the URL. Events 59/60 carry no process - correlate them with event 3 by Job ID.

Another indicator: `qmgrprxy.dll` loaded by a process that isn't a normal BITS consumer - PowerShell, `wscript`, a user binary out of `AppData`. That's a good reason to dig in.

### Network

- **DNS**: QNAME length, entropy, NXDOMAIN ratio, TXT/NULL/SRV, rare subdomains.
- **Proxy**: POST/PUT, body size, UA, SNI, JA3/JA4, file-sharing domains.
- **Zeek/Suricata**: `conn.log`, `dns.log`, `http.log`, `ssl.log`, `smb_files.log`, `icmp`.
- **NetFlow**: volume, periodicity, directions, "small and frequent" sessions.

---

## 5. Detection by channel

| Channel | What to look at | Where |
|---|---|---|
| HTTP(S) | POST/PUT with a large body, unusual UA, downloads of `.exe/.ps1/.hta` | proxy, Zeek, EDR |
| SMB | writes to a share, 445 outbound, guest/anonymous access | 5140/5145, Zeek |
| WebDAV | `WebClient`, `PROPFIND`/`PUT` to external hosts | Sysmon 3, proxy |
| FTP | outbound sessions, `STOR`/`RETR` to unusual hosts | proxy, Zeek |
| SCP/SFTP | outbound SSH from workstations, large volumes | Zeek, EDR |
| Netcat | `nc`/`ncat`/`nc.exe`, listeners, `/dev/tcp` | Sysmon 1, EDR, auditd |
| RDP/WinRM | RDP/WinRM from workstations, unusual sessions | Security, EDR |
| LOLBins | `certutil -urlcache`, `bitsadmin`, `mshta`, `regsvr32 /i:http`, `msiexec /i http` | Sysmon 1/3 |
| BITS | jobs, URLs, creating process | BITS 3/59/60 |
| Encoding | long base64/hex, `-EncodedCommand` | 4104, Sysmon 1 |
| Encryption | password-protected archives, gpg/openssl/7z with a password | EDR, DLP |
| DNS tunnel | long names, entropy, TXT/NULL, subdomain spikes | DNS, Zeek |
| ICMP tunnel | large payload, high rate, single address | Zeek, NetFlow |
| Steganography | invisible Unicode, trailing whitespace, LSB anomalies | DLP, steganalysis |
| Cloud | bulk uploads to personal Dropbox/Drive/Mega | CASB, cloud audit |
| Email | large attachments and bodies to external addresses | mail gateway, DLP |

A few practical notes:

- **Don't alert on every `certutil`.** It's needed for PKI. Look at the arguments and the parent process.
- **BITS does updates too.** Filter by URL and process first, alert second.
- **DNS length is easy to catch and easy to drown in noise.** Compare against a baseline per domain and host.
- **Steganography is probabilistic detection.** A single `zsteg -a` hit isn't proof.
- **`/dev/tcp` on Linux** is invisible to Sysmon; you need auditd/eBPF/EDR.

---

## 6. Hunting

### 6.1. BITS

Start with the question: "Who created BITS jobs this week that didn't exist before?"

Look at:

- the job name and owner;
- the creating process (event 3);
- the URL (59/60);
- the local path where the file landed;
- jobs still present after completion;
- `qmgrprxy.dll` loaded by a non-standard process.

Normal BITS jobs are usually tied to updates, Intune, SCCM, Edge/Chrome. Everything else deserves a look.

### 6.2. DNS

Look for:

- labels longer than 40-50 characters;
- a base32/hex alphabet in subdomains;
- many NXDOMAINs for a single domain;
- TXT/NULL/SRV queries that didn't exist before;
- queries to one subdomain from different hosts;
- a sharp jump in DNS traffic from a host that's usually quiet.

Don't confuse this with CDNs, telemetry, and AV clouds: they have long names too. You need a baseline.

### 6.3. Beaconing

Signs:

- a consistent delta between connections, even with jitter;
- small, stable volumes;
- rare new domains;
- connections outside business hours;
- the same set of ports/SNI.

Tools: RITA, Zeek `conn.log`, NetFlow. RITA shows periodicity well, but it doesn't replace process analysis.

### 6.4. HTTP, SMB, SSH

- A large POST/PUT to a domain never seen before.
- Downloads of `.exe`, `.dll`, `.ps1`, `.hta` with an atypical UA.
- SMB writes to a share from a workstation, especially outside business hours.
- Outbound SSH from a host that doesn't normally administer servers.
- RDP/WinRM from a workstation to an external address.

### 6.5. Steganography and DLP

Stego is almost never caught by a single rule. It's more practical to look for:

- abnormally large images/audio in email and messengers;
- invisible Unicode and trailing whitespace in documents;
- files noticeably larger than the original;
- images with high LSB entropy;
- repeated "harmless" attachments from one sender.

DLP, meanwhile, can't see encrypted archives or DNS/ICMP. Don't assume DLP closes off exfiltration completely.

### 6.6. Example queries

**KQL (Microsoft Sentinel), cloud uploads:**

```text
CloudAppEvents
| where ActionType in ("FileUploaded","FileDownloaded")
| where Application has_any ("Dropbox","Google Drive","Mega","OneDrive")
| summarize count() by AccountDisplayName, Application
```

`CloudAppEvents` requires Defender for Cloud Apps to be connected. Without it the table is empty.

**Splunk, LOLBins:**

```text
index=windows EventCode=1
| where Image IN ("*\\certutil.exe","*\\bitsadmin.exe","*\\mshta.exe","*\\regsvr32.exe","*\\msiexec.exe")
| where CommandLine match "(urlcache|/transfer|http|/i:http|ms-appinstaller)"
| table _time, ComputerName, User, Image, CommandLine
```

**Zeek, long DNS queries:**

```text
cat dns.log | zeek-cut query | awk '{ if (length($0) > 60) print }' | sort | uniq -c | sort -rn
```

That's a rough filter. Next, look at which domains and hosts produce the length, and compare against your baseline.

### 6.7. False positives

Common "false" sources:

- `certutil` from PKI/updates;
- BITS from Windows Update, Intune, SCCM, browsers;
- long DNS names from CDNs and telemetry;
- base64 in legitimate scripts and APIs;
- password-protected archives in accounting/HR;
- "suspicious" images from email.

The rule is simple: **context first, verdict second**. A single IOC without the process and network chain proves nothing.

---

## 7. MITRE ATT&CK

| ID | Technique | Section |
|---|---|---|
| T1105 | Ingress Tool Transfer | 01, 09 |
| T1197 | BITS Jobs | 09 |
| T1041 | Exfiltration Over C2 Channel | 02, 06, 07 |
| T1048 | Exfiltration Over Alternative Protocol | 05, 07, 12 |
| T1048.003 | Exfiltration Over Unencrypted Non-C2 Protocol | 05, 07, 12 |
| T1071.001 | Application Layer Protocol: Web | 02, 06, 07 |
| T1071.004 | Application Layer Protocol: DNS | 12 |
| T1095 | Non-Application Layer Protocol | 12 |
| T1571 | Non-Standard Port | 02, 05, 07 |
| T1572 | Protocol Tunneling | 12 |
| T1573 | Encrypted Channel | 06, 11 |
| T1074 | Data Staged | 10 |
| T1560 | Archive Collected Data | 10 |
| T1020 | Automated Exfiltration | 02 |
| T1218 | System Binary Proxy Execution | 09 |
| T1059 | Command and Scripting Interpreter | 01, 09 |
| T1027 | Obfuscated Files or Information | 10, 11 |
| T1564.004 | Hide Artifacts: NTFS File Attributes | 13 |
| T1562.001 | Impair Defenses | 07, 14 |

This is an approximate mapping, not the final word. In a real report, back the technique up with telemetry rather than just the technique name.

---

## 8. Response

### 8.1. Triage

1. Establish what happened: host, user, channel, time.
2. Assess the scope: how many hosts, which accounts, what data could have left.
3. Preserve the sources: EVTX, PCAP, DNS logs, proxy, EDR.

### 8.2. Containment

- Isolate the host in EDR, but don't power it off: you can lose memory and unflushed logs.
- Block the domains/IPs/URLs on the proxy, DNS, and firewall.
- Revoke third-party service tokens and OAuth applications.
- Disable compromised accounts and sessions.
- Check BITS jobs, scheduled tasks, services, Run keys, and WMI subscriptions.

### 8.3. Evidence collection

- **Memory:** WinPmem + Volatility, `avml`.
- **Disk:** KAPE, Velociraptor, FTK Imager.
- **Network:** PCAP, Zeek logs, NetFlow.
- **Cloud:** CloudTrail, Azure Activity, GCP Audit, CASB.
- **Host:** Sysmon EVTX, Security EVTX, PowerShell logs, BITS logs.

### 8.4. Eradication and recovery

- Remove implants, jobs, services, Run keys, WMI subscriptions.
- Restore from trusted backups and verify integrity.
- Reset credentials, update detection rules.
- Check that no BITS job is left that will pull the payload down again after a reboot.

### 8.5. Lessons learned

- Update detections based on what actually happened: what wasn't caught, and why.
- Run a purple team exercise: replay the technique and confirm it's caught now.
- Record the IOCs and add them to MISP/TAXII.

---

## 9. Tools

| Tool | Purpose |
|---|---|
| **Sysmon** | host events: processes, network, DLLs, ADS |
| **Zeek** | network metadata and protocols |
| **Suricata** | signature-based IDS/IPS |
| **Sigma** | detection rules, converted into SIEM queries |
| **RITA** | beaconing/C2 analysis over NetFlow |
| **Arkime** | PCAP capture and search |
| **Security Onion** | network monitoring distro |
| **Wazuh** | HIDS/SIEM, FIM, logs |
| **Velociraptor** | DFIR and artifact collection |
| **KAPE** | fast artifact collection and triage |
| **Chainsaw** | EVTX search |
| **Hayabusa** | Windows log analysis |
| **YARA** | file and memory signatures |
| **Falco** | Linux/k8s runtime security |
| **MISP** | indicator sharing |
| **TheHive + Cortex** | incident management |

---

## 10. Checklist

**Network**

- [ ] Egress by allow-list; non-standard ports closed.
- [ ] SMB signing, SMBv1 off, 445 outbound closed.
- [ ] LLMNR/NBT-NS off.
- [ ] DNS filtering and logging; DoH/DoT under control.
- [ ] Proxy + TLS inspection where permitted.
- [ ] CASB/DLP for cloud.
- [ ] NRD and dynamic DNS blocked.

**Endpoints**

- [ ] WDAC/AppLocker.
- [ ] ASR rules.
- [ ] PowerShell CLM + 4104 + Transcription.
- [ ] Sysmon + EDR on every host, servers included.
- [ ] Macros off; ISO/LNK/OneNote blocked.
- [ ] LOLBins restricted where they aren't needed, with business exceptions.
- [ ] BITS-Client/Operational enabled and shipped to the SIEM.

**Data and access**

- [ ] Classification, DLP, encryption.
- [ ] Least privilege, MFA, LAPS, Credential Guard.

**Detection and response**

- [ ] SIEM with retention; time synchronized.
- [ ] Detections for the channels in §5 and the MITRE mapping in §7.
- [ ] IR playbook and contacts; regular exercises.
- [ ] Purple team: techniques from 01–13 are replayed and caught.

---

## 11. References

**Standards and matrices**

- MITRE ATT&CK — https://attack.mitre.org/
- NIST SP 800-61 (IR) — https://csrc.nist.gov/pubs/sp/800/61/r2/final
- CISA — https://www.cisa.gov/

**Technique catalogs**

- LOLBAS — https://lolbas-project.github.io/
- GTFOBins — https://gtfobins.github.io/
- HijackLibs — https://hijacklibs.net/
- LOLC2 — https://lolc2.github.io/
- LOLEXFIL — https://lolexfil.github.io/
- LOLFSaaS — https://lolfsaas.github.io/
- LOTS Project — https://lots-project.com/

**Rules and hunting**

- Sigma — https://github.com/SigmaHQ/sigma
- YARA — https://github.com/VirusTotal/yara
- Sysmon — https://learn.microsoft.com/sysinternals/downloads/sysmon
- Sysmon config — https://github.com/SwiftOnSecurity/sysmon-config
- Sysmon modular — https://github.com/olafhartong/sysmon-modular
- RITA — https://github.com/activecm/rita
- Velociraptor — https://docs.velociraptor.app/
- Chainsaw — https://github.com/WithSecureLabs/chainsaw
- Hayabusa — https://github.com/Yamato-Security/hayabusa
- Atomic Red Team — https://github.com/redcanaryco/atomic-red-team

---

**See also:** [01 - Attacker → Target](01-attacker-to-target.md) · [02 - Target → Attacker](02-target-to-attacker.md) · [03 - SMB](03-smb.md) · [04 - WebDAV](04-webdav.md) · [05 - FTP](05-ftp.md) · [06 - SCP/SFTP/rsync](06-scp-sftp-rsync.md) · [07 - Netcat](07-netcat.md) · [08 - RDP/WinRM](08-rdp-winrm.md) · [09 - LOLBins](09-lolbins.md) · [10 - Encoding](10-encoding.md) · [11 - Encryption](11-encryption.md) · [12 - DNS / ICMP](12-dns-icmp.md) · [13 - Steganography](13-stegano.md) · [14 - Troubleshooting](14-troubleshooting.md)

---

[← Back to the index](../../README.md)
