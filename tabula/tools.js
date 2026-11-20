/* Tool setup pipelines and channel metadata for TABULA. */
window.TABULA_CHANNEL_GROUPS = {
  web: { order: 10, label: { en: "Web / HTTP", ru: "Web / HTTP" } },
  share: { order: 20, label: { en: "File shares", ru: "Файловые шары" } },
  remote: { order: 30, label: { en: "Remote access", ru: "Удалённый доступ" } },
  raw: { order: 40, label: { en: "Raw TCP", ru: "Сырой TCP" } },
  tunnel: { order: 50, label: { en: "Tunnels", ru: "Туннели" } },
  covert: { order: 60, label: { en: "Covert channels", ru: "Скрытые каналы" } },
  source: { order: 70, label: { en: "Source control", ru: "Системы контроля версий" } },
  mail: { order: 75, label: { en: "Mail", ru: "Почта" } },
  transform: { order: 80, label: { en: "Transform", ru: "Преобразование" } }
};

window.TABULA_TOOLS = {
  http: {
    label: "HTTP",
    group: "web",
    order: 10,
    families: ["native", "powershell", "script", "interpreter", "shell", "lolbin"],
    purpose: { en: "Source HTTP server for delivery from LHOST to RHOST. Use it when the target can download over plain HTTP.", ru: "Исходный HTTP-сервер для доставки с LHOST на RHOST. Используйте, когда цель может скачивать по обычному HTTP." },
    install: [],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0" }
    ],
    note: {
      en: "Built into Python. No installation is required; start it from the directory you want to serve.",
      ru: "Встроено в Python. Установка не нужна; запускайте из каталога, который нужно раздавать."
    }
  },
  https: {
    label: "HTTPS",
    group: "web",
    order: 15,
    families: ["openssl", "powershell", "uploadserver", "updog", "servpy"],
    purpose: { en: "TLS-encrypted HTTP transfer. Use it when plain HTTP is blocked or the channel must be encrypted.", ru: "HTTP-передача с шифрованием TLS. Используйте, когда обычный HTTP заблокирован или канал нужно шифровать." },
    install: [
      { shell: "bash", text: "sudo apt install -y openssl" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" },
      { shell: "bash", text: "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem" }
    ],
    start: [
      { shell: "bash", text: "cd {lhostpath} && openssl s_server -accept {lport} -cert /tmp/server.crt -key /tmp/server.key -WWW" }
    ],
    note: {
      en: "The default pipeline serves files over HTTPS for download. Upload methods start uploadserver, updog or serv.py with TLS on their own. Clients use -k or -SkipCertificateCheck because the certificate is self-signed.",
      ru: "Пайплайн по умолчанию раздаёт файлы по HTTPS для скачивания. Методы загрузки сами запускают uploadserver, updog или serv.py с TLS. Клиенты используют -k или -SkipCertificateCheck, потому что сертификат самоподписанный."
    }
  },
  servpy: {
    label: "SERV.PY",
    group: "web",
    order: 20,
    families: ["native", "powershell", "lolbin"],
    purpose: { en: "Receiver for exfiltration from RHOST to LHOST. Use it when you need raw POST/PUT bodies, any multipart field name, a configurable port and directory, size limits, optional token/TLS, and SHA-256 output without installing an external upload server.", ru: "Приёмник для эксфила с RHOST на LHOST. Используйте, когда нужны raw POST/PUT, любое имя multipart-поля, настраиваемые порт и каталог, лимит размера, опциональные token/TLS и SHA-256 без установки внешнего upload-сервера." },
    install: [],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "python3 serv.py -p {lport} -d {lhostpath}" }
    ],
    note: {
      en: "No installation. Copy scripts/upload/serv.py to LHOST and run it from the directory where you keep the script.",
      ru: "Установка не нужна. Скопируйте scripts/upload/serv.py на LHOST и запускайте из каталога со скриптом."
    },
    warning: {
      en: "Upload limit defaults to **1 GiB**. If the file is larger than 1 GB, add `--max-size 2G` (or higher) to the start command.",
      ru: "Лимит загрузки по умолчанию — **1 GiB**. Если файл больше 1 ГБ, добавьте `--max-size 2G` (или больше) к команде запуска."
    }
  },
  uploadserver: {
    label: "UPLOADSRV",
    group: "web",
    order: 30,
    families: ["native"],
    purpose: { en: "Multipart receiver for exfiltration. Use it when the target can POST a multipart field named files.", ru: "Multipart-приёмник для эксфила. Используйте, когда цель может отправить multipart-поле с именем files." },
    install: [
      { shell: "bash", text: "pipx install uploadserver" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "cd {lhostpath} && uploadserver {lport}" }
    ],
    note: {
      en: "Multipart uploads only; the field name must be files.",
      ru: "Только multipart-загрузки; имя поля должно быть files."
    }
  },
  nginx: {
    label: "NGINX",
    group: "web",
    order: 35,
    families: ["native", "powershell"],
    purpose: { en: "nginx HTTP PUT receiver. Use it when you need PUT specifically or uploadserver is unavailable.", ru: "HTTP PUT-приёмник на nginx. Используйте, когда нужен именно PUT или uploadserver недоступен." },
    install: [
      { shell: "bash", text: "sudo apt install -y nginx" }
    ],
    prepare: [
      { shell: "bash", text: "sudo mkdir -p /var/www/uploads/SecretUploadDirectory" },
      { shell: "bash", text: "sudo chown -R www-data:www-data /var/www/uploads/SecretUploadDirectory" }
    ],
    start: [
      { shell: "bash", text: "sudo tee /etc/nginx/sites-available/tabula-upload.conf >/dev/null <<'CONF'\nserver {\n    listen {lport};\n    client_max_body_size 0;\n    location /SecretUploadDirectory/ {\n        root /var/www/uploads;\n        dav_methods PUT;\n        create_full_put_path on;\n    }\n}\nCONF" },
      { shell: "bash", text: "sudo ln -sf /etc/nginx/sites-available/tabula-upload.conf /etc/nginx/sites-enabled/tabula-upload.conf" },
      { shell: "bash", text: "sudo rm -f /etc/nginx/sites-enabled/default" },
      { shell: "bash", text: "sudo nginx -t && sudo systemctl restart nginx" }
    ],
    note: {
      en: "Files land in /var/www/uploads/SecretUploadDirectory. A browser GET on the directory returns 403; that is normal.",
      ru: "Файлы попадают в /var/www/uploads/SecretUploadDirectory. GET каталога в браузере возвращает 403 — это нормально."
    },
    warning: {
      en: "After the transfer, disable the upload config and stop nginx on LHOST. If nginx serves other sites, remove only the upload config and reload instead of stopping the service.",
      ru: "После передачи отключите конфиг загрузки и остановите nginx на LHOST. Если nginx обслуживает другие сайты, удалите только конфиг загрузки и сделайте reload вместо остановки сервиса."
    },
    cleanup: [
      { shell: "bash", text: "sudo rm -f /etc/nginx/sites-enabled/tabula-upload.conf" },
      { shell: "bash", text: "sudo systemctl stop nginx" }
    ]
  },
  updog: {
    label: "UPDOG",
    group: "web",
    order: 36,
    families: ["native"],
    purpose: { en: "Modern HTTP/HTTPS file server with upload and download. Use it when the target can POST multipart and you want a ready web UI.", ru: "Современный HTTP/HTTPS-сервер с загрузкой и скачиванием. Используйте, когда цель может отправлять multipart и нужен готовый web UI." },
    install: [
      { shell: "bash", text: "pipx install updog" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "updog -d {lhostpath} -p {lport}" }
    ],
    note: {
      en: "Add --ssl for TLS or --password 'S3cret' for basic auth. Requires Python 3.11+.",
      ru: "Добавьте --ssl для TLS или --password 'S3cret' для basic auth. Требуется Python 3.11+."
    }
  },
  webdav: {
    label: "WEBDAV",
    group: "web",
    order: 40,
    families: ["setup", "native", "cmd"],
    purpose: { en: "WebDAV server for download and exfiltration. Use it when HTTP is allowed but you want a filesystem-like upload path.", ru: "WebDAV-сервер для скачивания и эксфила. Используйте, когда HTTP разрешён, но нужен путь загрузки, похожий на файловую систему." },
    install: [
      { shell: "bash", text: "python3 -m venv /tmp/webdav-venv && /tmp/webdav-venv/bin/pip install wsgidav cheroot" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous" }
    ],
    alternatives: [
      {
        label: { en: "rclone (basic auth)", ru: "rclone (basic auth)" },
        shell: "bash",
        text: "sudo rclone serve webdav {lhostpath} --addr :{lport} --user {share_user} --pass {share_pass}"
      },
      {
        label: { en: "rclone HTTPS (self-signed)", ru: "rclone HTTPS (самоподписанный)" },
        shell: "bash",
        text: "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && cp server.crt server.pem && sudo rclone serve webdav . --addr :{lport} --user {share_user} --pass {share_pass} --cert server.pem --key server.key"
      },
      {
        label: { en: "dufs HTTPS (self-signed)", ru: "dufs HTTPS (самоподписанный)" },
        shell: "bash",
        text: "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && sudo dufs --tls-cert server.crt --tls-key server.key -A -b 0.0.0.0 -p {lport} ."
      },
      {
        label: { en: "wsgidav with Linux users (pam-login)", ru: "wsgidav с системными пользователями (pam-login)" },
        shell: "bash",
        text: "/tmp/webdav-venv/bin/pip install 'wsgidav[pam]' && sudo /tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=pam-login"
      },
      {
        label: { en: "dufs install (Rust)", ru: "Установка dufs (Rust)" },
        shell: "bash",
        text: "cargo install dufs"
      },
      {
        label: { en: "dufs (anonymous, upload/delete)", ru: "dufs (анонимно, upload/delete)" },
        shell: "bash",
        text: "sudo dufs -A -b 0.0.0.0 -p {lport} {lhostpath}"
      },
      {
        label: { en: "dufs (basic auth)", ru: "dufs (basic auth)" },
        shell: "bash",
        text: "sudo dufs -a '{share_user}:{share_pass}@/:rw' -b 0.0.0.0 -p {lport} {lhostpath}"
      },
      {
        label: { en: "wsgidav in Docker", ru: "wsgidav в Docker" },
        shell: "bash",
        text: "docker run --rm -it -p {lport}:8080 -v \"{lhostpath}:/var/wsgidav-root\" mar10/wsgidav"
      }
    ],
    note: {
      en: "wsgidav runs with anonymous access. For user:pass use the rclone or dufs alternative. If the port is below 1024, prefix the command with sudo. HTTPS uses the rclone/dufs alternatives with a self-signed certificate; curl methods use -k. Enable WebClient and the registry values on RHOST in the Setup family.",
      ru: "wsgidav запускается с анонимным доступом. Для user:pass используйте альтернативу rclone или dufs. Если порт ниже 1024, добавьте sudo. HTTPS использует альтернативы rclone/dufs с самоподписанным сертификатом; curl-методы используют -k. Включите WebClient и значения реестра на RHOST в семействе Setup."
    },
    warning: {
      en: "Cleanup on RHOST: unmount the WebDAV drive and stop WebClient only if you enabled it for this transfer. If WebClient was already running, leave it alone.",
      ru: "Очистка на RHOST: размонтируйте WebDAV-диск и остановите WebClient только если включали его для этой передачи. Если WebClient работал до этого, не трогайте его."
    },
    cleanup: [
      { side: "rhost", shell: "cmd", text: "net use I: /delete" },
      { side: "rhost", shell: "cmd", text: "net stop WebClient" }
    ]
  },
  smb: {
    label: "SMB",
    group: "share",
    order: 50,
    families: ["impacket", "cmd", "native", "mount", "diagnostics"],
    purpose: { en: "Authenticated SMB share for download and exfiltration. Use it when 445/tcp is reachable and native Windows file operations are available.", ru: "SMB-шара с аутентификацией для скачивания и эксфила. Используйте, когда доступен 445/tcp и есть штатные файловые операции Windows." },
    install: [
      { shell: "bash", text: "pipx install impacket" },
      { shell: "bash", text: "sudo apt install -y smbclient" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}" }
    ],
    note: {
      en: "An authenticated SMB share on LHOST. Set Share name, Share user and Share password in Advanced parameters; the same share works for delivery and exfiltration.",
      ru: "SMB-шара с аутентификацией на LHOST. Укажите имя шары, пользователя и пароль в Advanced parameters; одна и та же шара работает для доставки и эксфила."
    },
    warning: {
      en: "If Linux mount.cifs returns error(5) Input/output error against impacket, use vers=2.0,sec=ntlmssp,nounix. If it still fails, use the smbclient methods. Cleanup: unmount /mnt/smb on Linux or delete the net use mapping on Windows, then stop impacket-smbserver with Ctrl+C.",
      ru: "Если Linux mount.cifs возвращает error(5) Input/output error на impacket, используйте vers=2.0,sec=ntlmssp,nounix. Если не помогло, используйте методы smbclient. Очистка: размонтируйте /mnt/smb на Linux или удалите маппинг net use на Windows, затем остановите impacket-smbserver через Ctrl+C."
    },
    cleanup: [
      { side: "rhost", shell: "bash", os: "linux", text: "sudo umount /mnt/smb 2>/dev/null || true; sudo rmdir /mnt/smb 2>/dev/null || true" },
      { side: "rhost", shell: "cmd", os: "windows", text: "net use \\\\{lhost}\\{share_name} /delete >nul 2>&1" }
    ]
  },
  ftp: {
    label: "FTP",
    group: "share",
    order: 60,
    families: ["powershell", "cmd", "curl", "ftp", "wget", "python", "diagnostics"],
    purpose: { en: "FTP server for download and upload. Use it when 21/tcp is allowed and FTP clients are available.", ru: "FTP-сервер для скачивания и загрузки. Используйте, когда разрешён 21/tcp и есть FTP-клиенты." },
    install: [
      { shell: "bash", text: "sudo apt install -y python3-pyftpdlib" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}" }
    ],
    warning: {
      en: "pyftpdlib is required. If Python says `No module named pyftpdlib`, run the Install step or `sudo apt install -y python3-pyftpdlib`. Authenticated methods start their own server with `--username` and `--password`.",
      ru: "Нужен pyftpdlib. Если Python пишет `No module named pyftpdlib`, выполните Install или `sudo apt install -y python3-pyftpdlib`. Authenticated-методы сами запускают сервер с `--username` и `--password`."
    },
    note: {
      en: "The pipeline starts anonymous read/write FTP. Authenticated methods start pyftpdlib with Share user and Share password. Windows GUI: open ftp://LHOST:PORT/.",
      ru: "Пайплайн запускает анонимный FTP с записью. Authenticated-методы запускают pyftpdlib с пользователем и паролем шары. Windows GUI: откройте ftp://LHOST:PORT/."
    }
  },
  ssh: {
    label: "SSH",
    group: "remote",
    order: 70,
    families: ["scp", "pscp", "sftp", "rsync", "stream", "sshfs", "diagnostics"],
    purpose: { en: "Native SSH transfers. Use it when sshd is reachable and you have credentials or keys.", ru: "Штатные передачи через SSH. Используйте, когда доступен sshd и есть учётные данные или ключи." },
    install: [
      { shell: "bash", text: "sudo apt install -y openssh-client rsync" }
    ],
    prepare: [],
    start: [],
    note: {
      en: "There is no server to start here: sshd must already run on RHOST. Set RHOST and RHOST user in Advanced parameters.",
      ru: "Запускать сервер здесь не нужно: sshd уже должен работать на RHOST. Укажите RHOST и пользователя в Advanced parameters."
    }
  },
  rdp: {
    label: "RDP",
    group: "remote",
    order: 80,
    families: ["gui"],
    purpose: { en: "RDP drive redirection. Use it when you have an interactive RDP session and need a mounted drive.", ru: "Перенаправление диска через RDP. Используйте, когда есть интерактивная RDP-сессия и нужен примонтированный диск." },
    install: [
      { shell: "bash", text: "sudo apt install -y freerdp2-x11" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [],
    note: {
      en: "Start an interactive RDP session with a mounted drive. Set RHOST, user, domain, and password in Advanced parameters.",
      ru: "Запустите интерактивную RDP-сессию с примонтированным диском. Укажите RHOST, пользователя, домен и пароль в Advanced parameters."
    }
  },
  winrm: {
    label: "WINRM",
    group: "remote",
    order: 90,
    families: ["winrm", "setup", "diagnostics", "copy"],
    purpose: { en: "WinRM session through evil-winrm. Use it when 5985/5986 is reachable and credentials work.", ru: "Сессия WinRM через evil-winrm. Используйте, когда доступен 5985/5986 и работают учётные данные." },
    install: [
      { shell: "bash", text: "sudo gem install evil-winrm" }
    ],
    prepare: [],
    start: [],
    note: {
      en: "evil-winrm is interactive: start the session, then run the upload or download command shown in the method.",
      ru: "evil-winrm интерактивен: запустите сессию, затем выполните команду upload или download из метода."
    },
    warning: {
      en: "If you enabled WinRM and relaxed authentication for this transfer, disable it and restore Basic=false / AllowUnencrypted=false afterwards. Do not disable WinRM on a host where it was already in use.",
      ru: "Если вы включали WinRM и ослабляли аутентификацию для этой передачи, отключите его и верните Basic=false / AllowUnencrypted=false. Не отключайте WinRM на хосте, где он уже использовался."
    },
    cleanup: [
      { side: "rhost", shell: "powershell", os: "windows", text: "Disable-PSRemoting -Force" },
      { side: "rhost", shell: "powershell", os: "windows", text: "winrm set winrm/config/service/auth '@{Basic=\"false\"}'" },
      { side: "rhost", shell: "powershell", os: "windows", text: "winrm set winrm/config/service '@{AllowUnencrypted=\"false\"}'" }
    ]
  },
  nc: {
    label: "NETCAT",
    group: "raw",
    order: 100,
    families: ["reverse", "bind", "powershell", "shell", "stream", "udp", "diagnostics"],
    purpose: { en: "Raw TCP source or receiver. Use it when HTTP is unavailable and you can open a single TCP port. Reverse is the default: the target dials out.", ru: "Сырой TCP-источник или приёмник. Используйте, когда HTTP недоступен, но можно открыть один TCP-порт. По умолчанию reverse: цель сама стучится наружу." },
    install: [
      { shell: "bash", text: "sudo apt install -y netcat-openbsd" }
    ],
    prepare: function (state) {
      return state.direction === "exfil"
        ? [{ shell: "bash", text: "mkdir -p {lhostpath}" }]
        : [];
    },
    start: function (state) {
      return state.direction === "deliver"
        ? [{ shell: "bash", text: "nc -lvnp {lport} -q 0 < \"{lhostpath}/{file}\"" }]
        : [{ shell: "bash", text: "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}\"" }];
    },
    note: {
      en: "Use a compatible netcat on both sides. Switch -q 0 to -N on OpenBSD netcat. Reverse means RHOST connects to LHOST; bind means RHOST listens.",
      ru: "Используйте совместимый netcat с обеих сторон. В OpenBSD netcat замените -q 0 на -N. Reverse: RHOST подключается к LHOST; bind: RHOST слушает."
    }
  },
  ncat: {
    label: "NCAT",
    group: "raw",
    order: 105,
    families: ["reverse", "tls", "acl"],
    purpose: { en: "Modern netcat from nmap with TLS, IPv6, proxy and ACL support. Use it when plain nc is missing or the channel needs --ssl.", ru: "Современный netcat из nmap с TLS, IPv6, прокси и ACL. Используйте, когда нет обычного nc или каналу нужен --ssl." },
    install: [
      { shell: "bash", text: "sudo apt install -y ncat" }
    ],
    prepare: function (state) {
      return state.direction === "exfil"
        ? [{ shell: "bash", text: "mkdir -p {lhostpath}" }]
        : [];
    },
    start: function (state) {
      return state.direction === "deliver"
        ? [{ shell: "bash", text: "ncat -lvnp {lport} < \"{lhostpath}/{file}\"" }]
        : [{ shell: "bash", text: "ncat -lvnp {lport} > \"{lhostpath}/{file}\"" }];
    },
    note: {
      en: "ncat closes on EOF without -q. Add --ssl on both sides for TLS; the listener can pin the client with --allow.",
      ru: "ncat закрывает соединение по EOF без -q. Для TLS добавьте --ssl с обеих сторон; приёмник может ограничить клиента через --allow."
    }
  },
  socat: {
    label: "SOCAT",
    group: "raw",
    order: 110,
    families: ["tcp", "tls", "udp"],
    purpose: { en: "Bidirectional relay for TCP, TLS and UDP. Use it when you need a one-way file channel, reconnects, or a self-signed TLS listener.", ru: "Двунаправленный релей для TCP, TLS и UDP. Используйте, когда нужен однонаправленный файловый канал, переподключения или TLS-приёмник с самоподписанным сертификатом." },
    install: [
      { shell: "bash", text: "sudo apt install -y socat openssl" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" },
      { shell: "bash", text: "openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\"" },
      { shell: "bash", text: "cat server.crt server.key > server.pem" }
    ],
    start: function (state) {
      return state.direction === "deliver"
        ? [{ shell: "bash", text: "socat -u FILE:\"{lhostpath}/{file}\" TCP-LISTEN:{lport},reuseaddr,fork" }]
        : [{ shell: "bash", text: "socat -u TCP-LISTEN:{lport},reuseaddr,fork OPEN:\"{lhostpath}/{file}\",creat,append" }];
    },
    note: {
      en: "The pipeline starts a plain TCP listener. TLS and UDP variants are in the methods; server.pem is generated during Prepare.",
      ru: "Пайплайн запускает обычный TCP-приёмник. TLS и UDP варианты находятся в методах; server.pem создаётся на этапе Prepare."
    }
  },
  openssl: {
    label: "OPENSSL",
    group: "raw",
    order: 120,
    families: ["stream"],
    purpose: { en: "Password-based AES-256-CBC piped through netcat. Use it when TCP is available and the channel must be encrypted without a TLS certificate.", ru: "AES-256-CBC с паролем через netcat. Используйте, когда доступен TCP и канал нужно шифровать без TLS-сертификата." },
    install: [
      { shell: "bash", text: "sudo apt install -y openssl netcat-openbsd" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [],
    note: {
      en: "The method below starts the receiver and sender; use a strong shared password in Advanced parameters. For certificate-based TLS use the SOCAT or NCAT channel.",
      ru: "Метод ниже запускает приёмник и отправителя; задайте надёжный общий пароль в Advanced parameters. Для TLS с сертификатом используйте канал SOCAT или NCAT."
    }
  },
  tunnel: {
    label: "TUNNELS",
    group: "tunnel",
    order: 130,
    families: ["chisel", "ssh", "ligolo", "cloudflared"],
    purpose: { en: "Reverse tunnels where the target dials out and exposes a service to LHOST. Use chisel for HTTP/SOCKS, ssh -R for SSH, ligolo-ng for IP-level routing.", ru: "Реверс-туннели, где цель сама стучится наружу и публикует сервис на LHOST. chisel для HTTP/SOCKS, ssh -R для SSH, ligolo-ng для IP-маршрутизации." },
    install: [
      { shell: "bash", text: "curl https://i.jpillora.com/chisel! | sudo bash" }
    ],
    prepare: [],
    start: [
      { shell: "bash", text: "chisel server -p {lport} --reverse" }
    ],
    note: {
      en: "The pipeline starts the chisel server. ligolo-ng and ssh -R start their own listeners in the methods; sshd must already run on RHOST for ssh -R.",
      ru: "Пайплайн запускает chisel-сервер. ligolo-ng и ssh -R запускают свои слушатели в методах; для ssh -R на RHOST уже должен работать sshd."
    }
  },
  icmp: {
    label: "ICMP",
    group: "covert",
    order: 140,
    families: ["script", "tunnel", "stream"],
    purpose: { en: "ICMP payload transfer. Use it when only ping/ICMP is allowed. Slow and lossy, with no ACKs.", ru: "Передача в ICMP payload. Используйте, когда разрешён только ping/ICMP. Медленно и с потерей пакетов, без ACK." },
    install: [
      { shell: "bash", text: "sudo apt install -y python3-scapy" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "sudo python3 scripts/icmp/icmp_recv.py -o {lhostpath}/{file}" }
    ],
    note: {
      en: "Copy icmp_send.py to RHOST and run the receiver from the repository root. ICMP transfer has no ACKs or retransmits.",
      ru: "Скопируйте icmp_send.py на RHOST и запускайте приёмник из корня репозитория. У ICMP-передачи нет ACK и повторов."
    }
  },
  tftp: {
    label: "TFTP",
    group: "covert",
    order: 145,
    families: ["setup", "native"],
    purpose: { en: "UDP 69 file transfer with no authentication. Use it only on a trusted lab segment.", ru: "Передача файлов по UDP 69 без аутентификации. Используйте только в доверенном лабораторном сегменте." },
    install: [
      { shell: "bash", text: "sudo apt install -y atftpd" }
    ],
    prepare: [
      { shell: "bash", text: "sudo mkdir -p /tftp && sudo chmod 777 /tftp" }
    ],
    start: [
      { shell: "bash", text: "sudo atftpd --daemon --port 69 /tftp" }
    ],
    warning: {
      en: "atftpd has no --create flag. Uploads rely on /tftp being writable (the pipeline runs chmod 777), and UDP/69 must be allowed through the firewall. On Windows, enable the TFTP client in the Setup family and disable it after the transfer.",
      ru: "У atftpd нет флага --create. Загрузка зависит от прав на /tftp (пайплайн делает chmod 777), а UDP/69 должен быть разрешён в файрволе. В Windows включите TFTP-клиент в семействе Setup и отключите после передачи."
    },
    note: {
      en: "The TFTP root is /tftp, not the LHOST path field. Put payload.exe in /tftp. TFTP is unauthenticated and unencrypted.",
      ru: "Корень TFTP — /tftp, а не поле LHOST path. Положите payload.exe в /tftp. TFTP без аутентификации и шифрования."
    },
    cleanup: [
      { shell: "bash", text: "sudo pkill atftpd" },
      { side: "rhost", shell: "powershell", os: "windows", text: "Disable-WindowsOptionalFeature -Online -FeatureName TFTP -NoRestart" }
    ]
  },
  dns: {
    label: "DNS",
    group: "covert",
    order: 150,
    families: ["script", "tunnel"],
    purpose: { en: "DNS query exfiltration. Use it when outbound DNS is allowed and you control a domain.", ru: "Эксфил через DNS-запросы. Используйте, когда разрешён исходящий DNS и вы контролируете домен." },
    install: [
      { shell: "bash", text: "sudo apt install -y dnsutils xxd tcpdump" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [
      { shell: "bash", text: "sudo tcpdump -i any -n -s0 udp port 53 -l | tee {lhostpath}/dns.log" }
    ],
    note: {
      en: "Capture DNS queries on LHOST, then reassemble the hex chunks from the log. Set a domain you control in Advanced parameters.",
      ru: "Захватывайте DNS-запросы на LHOST и собирайте hex-чанки из лога. Укажите свой домен в Advanced parameters."
    }
  },
  git: {
    label: "GIT",
    group: "source",
    order: 160,
    families: ["native"],
    purpose: { en: "Git over HTTPS. Use it when the payload lives in a repository and git is available on the target.", ru: "Git поверх HTTPS. Используйте, когда payload лежит в репозитории и на цели есть git." },
    install: [
      { shell: "bash", text: "sudo apt install -y git" }
    ],
    prepare: [],
    start: [],
    note: {
      en: "Replace the example repository URL with your own. The clone lands under the LHOST path.",
      ru: "Замените пример URL репозитория на свой. Клон появится в каталоге LHOST."
    }
  },
  smtp: {
    label: "SMTP",
    group: "mail",
    order: 170,
    families: ["native", "powershell"],
    purpose: { en: "Exfiltration by e-mail attachment. Use it when the target can send mail outbound and a mailbox or SMTP interceptor is available.", ru: "Эксфил вложением в письме. Используйте, когда цель может отправлять почту наружу и есть ящик или SMTP-перехватчик." },
    install: [
      { shell: "bash", text: "pipx install aiosmtpd" }
    ],
    prepare: [],
    start: [
      { shell: "bash", text: "aiosmtpd -n -l 0.0.0.0:{lport}" }
    ],
    note: {
      en: "Port 25 usually needs root. aiosmtpd prints the message to stdout; decode the attachment manually. For 587/465 configure TLS certificates in the pipeline.",
      ru: "Для порта 25 обычно нужен root. aiosmtpd печатает письмо в stdout; вложение декодируйте вручную. Для 587/465 настройте TLS-сертификаты в пайплайне."
    }
  },
  encoding: {
    label: "ENCODING",
    group: "transform",
    order: 200,
    families: ["base64", "base32", "base58", "base45", "base91", "base62", "base85", "unicode", "yenc", "hex", "octal", "compression", "archive", "text", "classic", "numeric", "pgp", "qr", "zero", "obfuscation"],
    purpose: { en: "Turn a file into text on one side and restore it on the other. This is a transform layer, not a transport: pair it with HTTP, SMB, netcat or anything else.", ru: "Превращает файл в текст на одной стороне и восстанавливает на другой. Это слой преобразования, а не транспорт: используйте вместе с HTTP, SMB, netcat или другим каналом." },
    install: [],
    prepare: [],
    start: [],
    note: {
      en: "The encoded file is written next to the source with a codec suffix. Transfer that file, then run the decode step on the receiving side.",
      ru: "Закодированный файл пишется рядом с исходником с суффиксом кодека. Передайте этот файл и выполните декодирование на принимающей стороне."
    }
  },
  encryption: {
    label: "ENCRYPTION",
    group: "transform",
    order: 210,
    families: ["gpg", "age", "7z"],
    purpose: { en: "Encrypt a file before transfer and decrypt it on the other side. This is a transform layer; pair it with any transport.", ru: "Шифрует файл перед передачей и расшифровывает на другой стороне. Это слой преобразования; используйте с любым транспортом." },
    install: [
      { shell: "bash", text: "sudo apt install -y gnupg age p7zip-full" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [],
    note: {
      en: "gpg and 7z use the Advanced password. age prompts for a password. Treat ciphertext as binary unless the method says ASCII armor.",
      ru: "gpg и 7z используют пароль из Advanced. age спрашивает пароль. Считайте ciphertext бинарным, если метод не указывает ASCII armor."
    }
  },
  stegano: {
    label: "STEGANO",
    group: "transform",
    order: 220,
    families: ["steghide", "openstego", "outguess", "snow", "stegseek", "mp4", "pdf", "ads", "append"],
    purpose: { en: "Hide a payload inside a cover file before transfer and extract it on the other side. This is a transform layer; pair it with any transport.", ru: "Прячет payload в файле-носителе перед передачей и извлекает на другой стороне. Это слой преобразования; используйте с любым транспортом." },
    install: [
      { shell: "bash", text: "sudo apt install -y steghide openstego outguess snow ffmpeg poppler-utils" }
    ],
    prepare: [
      { shell: "bash", text: "mkdir -p {lhostpath}" }
    ],
    start: [],
    note: {
      en: "You must provide cover.jpg or cover.png yourself (same directory as the payload). Steghide supports JPEG/BMP/WAV/AU; OpenStego supports PNG/BMP.",
      ru: "Файл cover.jpg или cover.png нужно подготовить самостоятельно (в том же каталоге, что и payload). Steghide поддерживает JPEG/BMP/WAV/AU; OpenStego — PNG/BMP."
    }
  }
};
