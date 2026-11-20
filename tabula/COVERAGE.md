# TABULA coverage

Snapshot after the current content pass. Counts are generated from
`methods.js`; the right-hand column lists the largest remaining gaps against
the handbook.

| Channel / area | Methods | Still missing from docs |
|---|---:|---|
| HTTP | 28 | complete for 01 basics; more LOLBins and server variants (PHP/Ruby/busybox/HTTPS) |
| HTTPS | 9 | TLS via openssl s_server, uploadserver, updog and serv.py; WebDAV HTTPS is in the WebDAV channel |
| serv.py / uploadserver | 6 | Windows/Linux variants are covered; more raw-body senders |
| nginx / updog | 7 | PUT and multipart receivers covered; TLS/password variants are pipeline notes |
| WebDAV | 13 | diagnostics; HTTP/HTTPS, WebClient, davfs2 and curl covered; RHOST cleanup at the bottom |
| SMB | 11 | Samba server path, more smbclient masks and diagnostics |
| FTP | 23 | FTPS and passive NAT variants remain; anonymous/auth clients covered |
| SSH | 28 | SSH is broadly covered; WinRM setup/commands are outside this channel |
| RDP / WinRM | 8 | rdesktop, mstsc, more WinRM session/management helpers |
| Netcat / ncat / socat / OpenSSL | 33 | reverse/bind, TLS, UDP, PowerShell TCP, tar, base64; diagnostics included |
| Tunnels | 4 | cloudflared/ngrok, SOCKS through chisel |
| ICMP | 3 | dnsteal, icmpsh, icmpdoor, hping3 variants |
| TFTP | 5 | Windows TFTP enable/disable and server cleanup covered |
| DNS | 4 | dnsteal and the PowerShell dnscat2 client still missing |
| Git | 1 | - |
| SMTP | 2 | STARTTLS/SMTPS variants, external relays, attachment decoding |
| Encoding | 88 | Punycode; bzip2/zlib/lz4/brotli; ZIP/7z/RAR/CAB; SoundCloud dead drop |
| Encryption | 8 | gpg asymmetric, age key-based, CMS/PKCS#7, PowerShell AES, chunked encryption |
| Steganography | 18 | stegpy, jsteg, MP3/audio, stegcloak/Cloakify, Office XML, ZIP comment, network stego |
| Blue team | 0 | detection/hunting content is intentionally outside the generator |

## Next content batches

1. **09 - LOLBins**: remaining URL downloaders, UNC copy tools, upload/exfil
   LOLBins, and the exotic section.
2. **10 - Encoding**: Punycode, bzip2/zlib/lz4/brotli, ZIP/7z/RAR/CAB,
   SoundCloud dead drop.
3. **11 / 13**: gpg asymmetric, age keys, CMS/PKCS#7, stegpy, jsteg,
   MP3/audio, stegcloak/Cloakify, Office XML, ZIP comment, network stego.
4. **Smaller gaps**: Samba server, FTPS/passive FTP, rdesktop/mstsc,
   interactsh/Collaborator, SMTP STARTTLS/SMTPS, external relays.

## Verification

```bash
node tabula/check.js
node tabula/audit.js
```

`audit.js` substitutes sample values and syntax-checks all bash and PowerShell
steps. It does not prove that a command works against a live service; run the
high-risk ones in a disposable lab.
