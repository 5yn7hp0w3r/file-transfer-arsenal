(function () {
  "use strict";

  const EXAMPLE = {
    lhost: "10.10.14.5",
    lport: "8000",
    direction: "deliver",
    profile: "all",
    channel: "http",
    os: "windows",
    file: "payload.exe",
    file_exfil: "secrets.zip",
    remote: "C:\\Users\\Public",
    lhost_path: "/tmp/share",
    fileAuto: true,
    rhost: "10.10.10.10",
    rhost_user: "rhost_user",
    lhost_user: "lhost_user",
    domain: "inlanefreight.local",
    rhost_pass: "Password0@",
    share_name: "share",
    share_user: "test",
    share_pass: "test",
    ssh_port: "22",
    ssh_key: "~/.ssh/id_rsa"
  };

  const COPY = {
    en: {
      navGenerator: "Generator",
      navGithub: "GitHub",
      heroEyebrow: "Field manual / file transfer",
      heroTitle: "FILE TRANSFER ARSENAL",
      heroLede: "Set the direction, choose a channel, and copy the commands that fit the target. Everything is generated in your browser.",
      heroNote: "Use only in isolated labs or authorized penetration tests. The author is not responsible for misuse.",
      heroCaption: "TABULA / FIELD MANUAL / 2026",
      formEyebrow: "Configuration",
      formIntro: "Pick the direction first. The tabula updates as you type.",
      exampleHint: "Example values are loaded. Edit them before copying.",
      scenarioLabel: "Scenario",
      channelLabel: "Channel",
      both: "Both",
      flowDeliver: "Deliver / LHOST → RHOST",
      flowExfil: "Exfiltrate / RHOST → LHOST",
      directionNote: "Deliver moves a file from LHOST to RHOST. Exfiltrate pulls it back.",
      directionNoteDeliver: "Deliver moves a file from LHOST to RHOST. Pick the channel the target can reach.",
      directionNoteExfil: "Exfiltrate moves a file from RHOST to LHOST. Start the receiver first.",
      directionNoteBoth: "Both shows download and upload paths for channels that support them.",
      directionDeliverDesc: "Start the source on LHOST and download the file on RHOST. Use this for payloads, tools, scripts and updates.",
      directionExfilDesc: "Start the receiver on LHOST and send the file from RHOST. Use this for loot, documents, dumps and backups.",
      channelNote: "Channels are grouped by family. Choose the transport the target can reach.",
      channelBoth: "This channel supports both directions.",
      channelDeliveryOnly: "This channel is delivery-only in the catalogue.",
      channelExfilOnly: "This channel is exfiltration-only.",
      channelUnavailable: "No methods for this target OS and scenario.",
      channelSwitched: "Channel switched to",
      directionSwitched: "Direction switched to",
      noDualChannel: "No channel supports both directions for this OS; switched to Deliver.",
      coverageLabel: "Coverage filter",
      profileLabel: "Profile",
      profileAll: "Every method in the catalogue.",
      profileCore: "Common OSCP and CPTS paths.",
      profileExotic: "Non-standard delivery channels and TLS.",
      profileLolbins: "Built-in binaries and native tools.",
      profileNote: "Every method. Lab-only and noisier entries included.",
      profileAllNote: "Every method. Lab-only and noisier entries included.",
      profileCoreNote: "OSCP and CPTS oriented. Verify against the current exam rules.",
      profileExoticNote: "Non-standard channels. Slower and often more visible.",
      profileLolbinsNote: "Only built-in or native tools on the target.",
      endpointsLabel: "Endpoints",
      lhostLabel: "LHOST",
      lhostHint: "Your address",
      lportLabel: "LPORT",
      lportHint: "Listener port",
      targetLabel: "Target OS",
      directionLabel: "Direction",
      windows: "Windows",
      linux: "Linux",
      deliver: "Deliver",
      exfiltrate: "Exfiltrate",
      bothDirections: "Both directions",
      smbBothDirections: "SMB share is dual-use: download and exfiltration.",
      webdavBothDirections: "WebDAV is dual-use: download and exfiltration.",
      sshBothDirections: "SSH is dual-use: SCP and rsync work in both directions.",
      ftpBothDirections: "FTP is dual-use: download and upload.",
      rdpBothDirections: "RDP drive mount is dual-use: download and exfiltration.",
      toolsLabel: "Install / Tools",
      toolNote: "Tools marked * may need installation on LHOST. Pick one to see install and start steps; the method list is filtered by this tool.",
      toolPipelineLabel: "Install / tools pipeline",
      installTitle: "Install",
      prepareTitle: "Prepare",
      startTitle: "Start",
      advanced: "Advanced parameters",
      fileLabel: "File (download)",
      fileHint: "File to deliver",
      fileExfilLabel: "File (exfil)",
      fileExfilHint: "File to exfiltrate",
      remoteLabel: "RHOST path",
      remoteHint: "Path on the target",
      lhostPathLabel: "LHOST path",
      lhostPathHint: "Path on LHOST",
      rhostLabel: "RHOST",
      rhostHint: "Target address",
      rhostUserLabel: "RHOST user",
      rhostUserHint: "Target account",
      lhostUserLabel: "LHOST user",
      lhostUserHint: "Our account",
      domainLabel: "Domain",
      domainHint: "AD or DNS domain",
      rhostPassLabel: "RHOST password",
      rhostPassHint: "Used only in this page",
      shareNameLabel: "Share name",
      shareNameHint: "SMB share name",
      shareUserLabel: "Share user",
      shareUserHint: "SMB / WebDAV / FTP account",
      sharePassLabel: "Share password",
      sharePassHint: "Used only in this page",
      sshPortLabel: "SSH port",
      sshPortHint: "sshd port",
      sshKeyLabel: "SSH key",
      sshKeyHint: "Private key path",
      loadExample: "Load example",
      reset: "Reset",
      formPrivacy: "No data leaves this page. Passwords and key paths are never written to the URL.",
      outputEyebrow: "Generated tabula",
      copyAll: "Copy all",
      print: "Print",
      emptyTitle: "Awaiting endpoints",
      emptyText: "Set LHOST and LPORT to compose the tabula.",
      invalidTitle: "Nota",
      invalidText: "Check the highlighted fields.",
      invalidHost: "Use an IPv4 address, IPv6 address, or hostname.",
      invalidPort: "LPORT must be between 1 and 65535.",
      noMethodsTitle: "No methods",
      noMethodsText: "No methods for this channel, target, and scenario. Try another channel or set Coverage to ALL.",
      noMethodsProfile: "This coverage filter hides every method for the current selection. Switch Coverage to ALL.",
      noMatchesTitle: "No matches",
      noMatchesText: "Nothing in the current tabula matches the search.",
      clearSearch: "Clear search",
      methods: "methods",
      copy: "Copy",
      copied: "Copied",
      copyPair: "Copy pair",
      copyGroup: "Copy group",
      helperBadge: "HELPER",
      helperFileLabel: "Helper file",
      helperIntro: "Create {name} in your directory on {side} and copy the code below.",
      cleanupTitle: "Cleanup after transfer",
      alternativeServers: "Alternative servers",
      collapseAll: "Collapse all",
      expandAll: "Expand all",
      lhost: "LHOST",
      rhost: "RHOST",
      requires: "Requires",
      source: "Source",
      verifyTitle: "Verify",
      verifyNote: "Compare the hash before using the file.",
      searchLabel: "Search",
      searchPlaceholder: "certutil, powershell, upload…",
      searchNote: "{shown} of {total} {word}",
      switchLanguage: "Switch language",
      footerLeft: "TABULA / FILE TRANSFER ARSENAL",
      footerRight: "Use only in isolated labs or authorized penetration tests. The author is not responsible for misuse.",
      family_native: "Native",
      family_lolbin: "LOLBins",
      family_powershell: "PowerShell",
      family_interpreter: "Interpreters",
      family_shell: "Shell only",
      family_impacket: "Impacket",
      family_cmd: "CMD",
      family_scp: "SCP",
      family_pscp: "PSCP",
      family_sftp: "SFTP",
      family_rsync: "rsync",
      family_stream: "Streaming",
      family_sshfs: "sshfs",
      family_diagnostics: "Diagnostics",
      family_tunnel: "Tunnel",
      family_script: "Script",
      family_gui: "GUI session",
      family_winrm: "WinRM",
      family_reverse: "Reverse (target dials out)",
      family_bind: "Bind (target listens)",
      family_tcp: "TCP",
      family_tls: "TLS",
      family_udp: "UDP",
      family_acl: "IP allowlist",
      family_base64: "Base64",
      family_base32: "Base32",
      family_hex: "Hex",
      family_compression: "Compression",
      family_archive: "Archive",
      family_obfuscation: "Obfuscation",
      family_chisel: "chisel",
      family_ssh: "SSH forward",
      family_ligolo: "ligolo-ng",
      family_mount: "Filesystem mount",
      family_openssl: "OpenSSL",
      family_uploadserver: "uploadserver TLS",
      family_updog: "updog TLS",
      family_servpy: "serv.py TLS",
      family_curl: "curl",
      family_ftp: "ftp client",
      family_wget: "wget",
      family_python: "Python ftplib",
      family_unicode: "Unicode-кодировки",
      family_yenc: "yEnc",
      family_octal: "Восьмеричное",
      family_classic: "Классические шифры",
      family_numeric: "Числа / Морзе",
      family_pgp: "PGP armor",
      family_unicode: "Unicode encodings",
      family_yenc: "yEnc",
      family_octal: "Octal",
      family_classic: "Classic ciphers",
      family_numeric: "Numeric / Morse",
      family_pgp: "PGP armor",
      family_base58: "Base58",
      family_base45: "Base45",
      family_base91: "Base91",
      family_base62: "Base62",
      family_base85: "Base85",
      family_text: "Text escaping",
      family_qr: "QR",
      family_zero: "Zero-width",
      family_gpg: "GPG",
      family_age: "age",
      family_7z: "7z",
      family_steghide: "steghide",
      family_openstego: "OpenStego",
      family_outguess: "outguess",
      family_snow: "snow",
      family_stegseek: "stegseek",
      family_mp4: "MP4 attachment",
      family_pdf: "PDF attachment",
      family_ads: "NTFS ADS",
      family_append: "Append after EOF",
      family_setup: "Setup",
      family_copy: "Copy-Item",
      family_cloudflared: "cloudflared"
    },
    ru: {
      navGenerator: "Генератор",
      navGithub: "GitHub",
      heroEyebrow: "Полевой справочник / передача файлов",
      heroTitle: "FILE TRANSFER ARSENAL",
      heroLede: "Укажите направление, выберите канал и скопируйте команды для цели. Всё генерируется в браузере.",
      heroNote: "Используйте только в изолированных лабораториях или авторизованных пентестах. Автор не несёт ответственности за неправомерное использование.",
      heroCaption: "TABULA / ПОЛЕВОЙ СПРАВОЧНИК / 2026",
      formEyebrow: "Конфигурация",
      formIntro: "Сначала направление. Табличка обновляется по мере ввода.",
      exampleHint: "Загружены примерные значения. Измените их перед копированием.",
      scenarioLabel: "Сценарий",
      channelLabel: "Канал",
      both: "Оба",
      flowDeliver: "Доставить / LHOST → RHOST",
      flowExfil: "Вытащить / RHOST → LHOST",
      directionNote: "Доставка ведёт файл с LHOST на RHOST. Эксфил забирает его обратно.",
      directionNoteDeliver: "Доставка ведёт файл с LHOST на RHOST. Выберите канал, доступный с цели.",
      directionNoteExfil: "Эксфил ведёт файл с RHOST на LHOST. Сначала поднимите приёмник.",
      directionNoteBoth: "Оба направления показывают скачивание и загрузку для каналов, которые их поддерживают.",
      directionDeliverDesc: "Поднимите источник на LHOST и скачайте файл на RHOST. Для payload, инструментов, скриптов и обновлений.",
      directionExfilDesc: "Поднимите приёмник на LHOST и отправьте файл с RHOST. Для loot, документов, дампов и бэкапов.",
      channelNote: "Каналы сгруппированы по семействам. Выберите транспорт, доступный с цели.",
      channelBoth: "Этот канал работает в обе стороны.",
      channelDeliveryOnly: "В каталоге этот канал только для доставки.",
      channelExfilOnly: "Этот канал только для эксфила.",
      channelUnavailable: "Нет методов для этой ОС и сценария.",
      channelSwitched: "Канал переключён на",
      directionSwitched: "Направление переключено на",
      noDualChannel: "Для этой ОС нет канала с двумя направлениями; включена доставка.",
      coverageLabel: "Фильтр покрытия",
      profileLabel: "Профиль",
      profileAll: "Все методы каталога.",
      profileCore: "Основные пути для OSCP и CPTS.",
      profileExotic: "Нестандартные каналы доставки и TLS.",
      profileLolbins: "Штатные бинари и нативные инструменты.",
      profileNote: "Все методы. Включая лабораторные и более шумные варианты.",
      profileAllNote: "Все методы. Включая лабораторные и более шумные варианты.",
      profileCoreNote: "Ориентировано на OSCP и CPTS. Сверяйте методы с актуальными правилами экзаменов.",
      profileExoticNote: "Нестандартные каналы. Медленнее и заметнее в трафике.",
      profileLolbinsNote: "Только штатные или нативные инструменты на цели.",
      endpointsLabel: "Адреса",
      lhostLabel: "LHOST",
      lhostHint: "Ваш адрес",
      lportLabel: "LPORT",
      lportHint: "Порт приёмника",
      targetLabel: "ОС цели",
      directionLabel: "Направление",
      windows: "Windows",
      linux: "Linux",
      deliver: "Доставить",
      exfiltrate: "Вытащить",
      bothDirections: "Оба направления",
      smbBothDirections: "SMB-шара работает в обе стороны: скачивание и эксфил.",
      webdavBothDirections: "WebDAV работает в обе стороны: скачивание и эксфил.",
      ftpBothDirections: "FTP работает в обе стороны: скачивание и загрузка.",
      sshBothDirections: "SSH работает в обе стороны: SCP и rsync.",
      rdpBothDirections: "RDP drive mount работает в обе стороны: скачивание и эксфил.",
      toolsLabel: "Установка / инструменты",
      toolNote: "Инструменты со * могут требовать установки на LHOST. Выберите его, чтобы увидеть установку и запуск; список методов фильтруется по инструменту.",
      toolPipelineLabel: "Установка / запуск инструмента",
      installTitle: "Установка",
      prepareTitle: "Подготовка",
      startTitle: "Запуск",
      advanced: "Дополнительные параметры",
      fileLabel: "Файл (download)",
      fileHint: "Файл для доставки",
      fileExfilLabel: "Файл (exfil)",
      fileExfilHint: "Файл для эксфила",
      remoteLabel: "Путь RHOST",
      remoteHint: "Путь на цели",
      lhostPathLabel: "Путь LHOST",
      lhostPathHint: "Путь на LHOST",
      rhostLabel: "RHOST",
      rhostHint: "Адрес цели",
      rhostUserLabel: "Пользователь RHOST",
      rhostUserHint: "Учётка на цели",
      lhostUserLabel: "Пользователь LHOST",
      lhostUserHint: "Наша учётка",
      domainLabel: "Домен",
      domainHint: "AD или DNS-домен",
      rhostPassLabel: "Пароль RHOST",
      rhostPassHint: "Используется только на странице",
      shareNameLabel: "Имя шары",
      shareNameHint: "Имя SMB-шары",
      shareUserLabel: "Пользователь шары",
      shareUserHint: "Учётка SMB / WebDAV / FTP",
      sharePassLabel: "Пароль шары",
      sharePassHint: "Используется только на странице",
      sshPortLabel: "SSH-порт",
      sshPortHint: "Порт sshd",
      sshKeyLabel: "SSH-ключ",
      sshKeyHint: "Путь к приватному ключу",
      loadExample: "Загрузить пример",
      reset: "Сбросить",
      formPrivacy: "Данные не покидают страницу. Пароли и пути к ключам не пишутся в URL.",
      outputEyebrow: "Готовая табличка",
      copyAll: "Копировать всё",
      print: "Печать",
      emptyTitle: "Ожидание адресов",
      emptyText: "Укажите LHOST и LPORT, чтобы собрать табличку.",
      invalidTitle: "Nota",
      invalidText: "Проверьте выделенные поля.",
      invalidHost: "Укажите IPv4, IPv6 или hostname.",
      invalidPort: "LPORT должен быть от 1 до 65535.",
      noMethodsTitle: "Нет методов",
      noMethodsText: "Для этого канала, цели и сценария методов нет. Попробуйте другой канал или поставьте покрытие ALL.",
      noMethodsProfile: "Этот фильтр покрытия скрывает все методы для текущего выбора. Переключите покрытие на ALL.",
      noMatchesTitle: "Ничего не найдено",
      noMatchesText: "В текущей табличке нет методов под этот поиск.",
      clearSearch: "Очистить поиск",
      methods: "методов",
      copy: "Копировать",
      copied: "Скопировано",
      copyPair: "Копировать пару",
      copyGroup: "Копировать группу",
      helperBadge: "ХЕЛПЕР",
      helperFileLabel: "Файл-помощник",
      helperIntro: "Создайте {name} в своём каталоге на {side} и скопируйте код ниже.",
      cleanupTitle: "Отключение после передачи",
      alternativeServers: "Альтернативные серверы",
      collapseAll: "Свернуть всё",
      expandAll: "Развернуть всё",
      lhost: "LHOST",
      rhost: "RHOST",
      requires: "Требуется",
      source: "Источник",
      verifyTitle: "Проверка",
      verifyNote: "Сравните hash до использования файла.",
      searchLabel: "Поиск",
      searchPlaceholder: "certutil, powershell, upload…",
      searchNote: "{shown} из {total} {word}",
      switchLanguage: "Сменить язык",
      footerLeft: "TABULA / FILE TRANSFER ARSENAL",
      footerRight: "Используйте только в изолированных лабораториях или авторизованных пентестах. Автор не несёт ответственности за неправомерное использование.",
      family_native: "Штатные",
      family_lolbin: "LOLBins",
      family_powershell: "PowerShell",
      family_interpreter: "Интерпретаторы",
      family_shell: "Только shell",
      family_impacket: "Impacket",
      family_cmd: "CMD",
      family_scp: "SCP",
      family_pscp: "PSCP",
      family_sftp: "SFTP",
      family_rsync: "rsync",
      family_stream: "Поток",
      family_sshfs: "sshfs",
      family_diagnostics: "Диагностика",
      family_tunnel: "Туннель",
      family_script: "Скрипт",
      family_gui: "GUI-сессия",
      family_winrm: "WinRM",
      family_reverse: "Reverse (цель стучится наружу)",
      family_bind: "Bind (цель слушает)",
      family_tcp: "TCP",
      family_tls: "TLS",
      family_udp: "UDP",
      family_acl: "IP allowlist",
      family_base64: "Base64",
      family_base32: "Base32",
      family_hex: "Hex",
      family_compression: "Сжатие",
      family_archive: "Архив",
      family_obfuscation: "Обфускация",
      family_chisel: "chisel",
      family_ssh: "SSH forward",
      family_ligolo: "ligolo-ng",
      family_mount: "Монтирование",
      family_openssl: "OpenSSL",
      family_uploadserver: "uploadserver TLS",
      family_updog: "updog TLS",
      family_servpy: "serv.py TLS",
      family_curl: "curl",
      family_ftp: "ftp-клиент",
      family_wget: "wget",
      family_python: "Python ftplib",
      family_base58: "Base58",
      family_base45: "Base45",
      family_base91: "Base91",
      family_base62: "Base62",
      family_base85: "Base85",
      family_text: "Текстовое экранирование",
      family_qr: "QR",
      family_zero: "Zero-width",
      family_gpg: "GPG",
      family_age: "age",
      family_7z: "7z",
      family_steghide: "steghide",
      family_openstego: "OpenStego",
      family_outguess: "outguess",
      family_snow: "snow",
      family_stegseek: "stegseek",
      family_mp4: "MP4-вложение",
      family_pdf: "PDF-вложение",
      family_ads: "NTFS ADS",
      family_append: "Append after EOF",
      family_setup: "Настройка",
      family_copy: "Copy-Item",
      family_cloudflared: "cloudflared"
    }
  };

  const FAMILY_DESCRIPTIONS = {
    en: {
      "7z": "Password-protected 7z archives with AES-256 and hidden file names.",
      acl: "Listener restricted to a single source IP.",
      age: "Modern authenticated encryption with age.",
      append: "Append the payload after the cover file's EOF.",
      archive: "Pack files or directories into an archive.",
      base32: "Case-insensitive Base32 text encoding.",
      base45: "Base45 text encoding for QR and text channels.",
      base58: "Base58 with the Bitcoin alphabet.",
      base62: "URL-safe Base62 with letters and digits.",
      base64: "Universal Base64 text encoding.",
      base85: "Compact Base85/Ascii85 text encoding.",
      base91: "Dense Base91 text encoding.",
      bind: "The target listens and the attacker connects.",
      chisel: "HTTP(S) reverse tunnel through the target.",
      cloudflared: "Expose the target's local service through a public URL.",
      cmd: "Windows CMD built-ins and UNC file operations.",
      compression: "Compress the file and wrap it in text.",
      copy: "Copy files through a PowerShell remoting session.",
      diagnostics: "Connectivity, authentication and protocol checks.",
      gpg: "GnuPG symmetric or ASCII-armored encryption.",
      gui: "Interactive RDP session with a mounted drive.",
      hex: "Hex text encoding.",
      impacket: "Authenticated impacket SMB share on LHOST.",
      interpreter: "Use an installed language interpreter instead of curl/wget.",
      ligolo: "IP-level reverse tunnel with ligolo-ng.",
      lolbin: "Living-off-the-land binaries; noisy and often monitored.",
      mount: "Mount the share as a filesystem, copy, then unmount.",
      native: "Built-in or native client for this channel.",
      openssl: "Self-signed HTTPS server using openssl s_server -WWW.",
      uploadserver: "Multipart receiver over TLS.",
      updog: "updog with an ad-hoc TLS certificate.",
      servpy: "serv.py raw POST/PUT receiver over TLS.",
      curl: "curl FTP download and upload.",
      ftp: "Interactive or heredoc ftp client.",
      wget: "wget FTP download.",
      python: "Python ftplib when no FTP client is installed.",
      unicode: "Base2048/32768/65536 for text-only chats and social channels.",
      yenc: "Compact Usenet-style binary encoding.",
      octal: "Octal byte representation.",
      classic: "ROT, Atbash and Caesar substitutions; obfuscation only.",
      numeric: "Binary, decimal, A1Z26 and Morse text representations.",
      pgp: "ASCII-armored PGP data.",
      obfuscation: "Hide signatures with XOR, double encoding or AES+Base64.",
      openstego: "Hide data in PNG/BMP with OpenStego.",
      outguess: "JPEG steganography with outguess.",
      powershell: "PowerShell-based transfer technique.",
      pscp: "PuTTY pscp.exe transfers from a Windows attacker.",
      qr: "Encode through a QR image and scan it back.",
      reverse: "The target dials out to the attacker.",
      rsync: "rsync over SSH for large files and resumed transfers.",
      scp: "SCP upload and download over SSH.",
      script: "Script-based helper for this channel.",
      setup: "Enable and prepare the remote service.",
      sftp: "Interactive and batch SFTP transfers.",
      shell: "Pure shell redirection with no external client.",
      snow: "Hide small payloads in text whitespace with snow.",
      stegseek: "Detect and brute-force steghide carriers.",
      mp4: "Attach a payload to an MP4 container with ffmpeg.",
      pdf: "Attach a payload to a PDF with pdfattach.",
      ads: "Hide data in an NTFS alternate data stream.",
      ssh: "Reverse SSH forwarding through ssh -R.",
      sshfs: "Mount a remote directory over SSH.",
      steghide: "Hide data inside JPEG/BMP/WAV/AU with steghide.",
      stream: "Stream files, archives or base64 over a single connection.",
      tcp: "Plain TCP relay with socat.",
      text: "Escape data for URL, HTML, MIME or text channels.",
      tls: "TLS-encrypted raw channel.",
      tunnel: "Carry another protocol through a reverse or covert tunnel.",
      udp: "UDP transfer for small payloads; no delivery guarantees.",
      winrm: "WinRM session through evil-winrm.",
      zero: "Hide bits in invisible Unicode characters."
    },
    ru: {
      "7z": "Архивы 7z с паролем, AES-256 и скрытыми именами файлов.",
      acl: "Приёмник, ограниченный одним IP-источником.",
      age: "Современное аутентифицированное шифрование через age.",
      append: "Дописывает payload после EOF файла-носителя.",
      archive: "Упаковывает файлы или каталоги в архив.",
      base32: "Регистронезависимое текстовое кодирование Base32.",
      base45: "Кодирование Base45 для QR и текстовых каналов.",
      base58: "Base58 с биткоин-алфавитом.",
      base62: "URL-safe Base62 из букв и цифр.",
      base64: "Универсальное текстовое кодирование Base64.",
      base85: "Компактное кодирование Base85/Ascii85.",
      base91: "Плотное кодирование Base91.",
      bind: "Цель слушает, атакующий подключается.",
      chisel: "HTTP(S)-реверс-туннель через цель.",
      cloudflared: "Публичный URL для локального сервиса на цели.",
      cmd: "Штатные команды Windows CMD и операции с UNC.",
      compression: "Сжимает файл и оборачивает его в текст.",
      copy: "Копирование файлов через сессию PowerShell Remoting.",
      diagnostics: "Проверки связи, аутентификации и протокола.",
      gpg: "Симметричное или ASCII-armored шифрование GnuPG.",
      gui: "Интерактивная RDP-сессия с примонтированным диском.",
      hex: "Текстовое кодирование Hex.",
      impacket: "SMB-шара impacket с аутентификацией на LHOST.",
      interpreter: "Интерпретатор языка вместо curl/wget.",
      ligolo: "IP-туннель через ligolo-ng.",
      lolbin: "Штатные бинарники Windows; шумно и часто детектится.",
      mount: "Монтирует шару, копирует файл и размонтирует.",
      native: "Штатный или нативный клиент для этого канала.",
      openssl: "HTTPS-сервер с самоподписанным сертификатом через openssl s_server -WWW.",
      uploadserver: "Multipart-приёмник с TLS.",
      updog: "updog с временным TLS-сертификатом.",
      servpy: "serv.py raw POST/PUT приёмник с TLS.",
      curl: "Скачивание и загрузка через curl FTP.",
      ftp: "Интерактивный ftp-клиент или heredoc.",
      wget: "Скачивание по FTP через wget.",
      python: "Python ftplib, когда FTP-клиента нет.",
      unicode: "Base2048/32768/65536 для текстовых чатов и соцсетей.",
      yenc: "Компактное Usenet-кодирование.",
      octal: "Восьмеричное представление байтов.",
      classic: "Замены ROT, Atbash и Цезаря; только обфускация.",
      numeric: "Binary, decimal, A1Z26 и Morse представления.",
      pgp: "Данные в PGP ASCII armor.",
      obfuscation: "Скрывает сигнатуры через XOR, двойное кодирование или AES+Base64.",
      openstego: "Скрывает данные в PNG/BMP через OpenStego.",
      outguess: "JPEG-стеганография через outguess.",
      powershell: "Метод передачи на PowerShell.",
      pscp: "Передача через PuTTY pscp.exe с Windows-атакующего.",
      qr: "Кодирование в QR-изображение и обратное считывание.",
      reverse: "Цель сама подключается к атакующему.",
      rsync: "rsync поверх SSH для больших файлов и докачки.",
      scp: "Загрузка и скачивание через SCP поверх SSH.",
      script: "Скриптовый helper для этого канала.",
      setup: "Включает и подготавливает удалённый сервис.",
      sftp: "Интерактивные и batch-передачи SFTP.",
      shell: "Чистое перенаправление shell без внешнего клиента.",
      snow: "Скрывает небольшие payload в пробелах текста через snow.",
      stegseek: "Поиск и брутфорс steghide-носителей.",
      mp4: "Прикрепляет payload к MP4 через ffmpeg.",
      pdf: "Прикрепляет payload к PDF через pdfattach.",
      ads: "Скрывает данные в NTFS alternate data stream.",
      ssh: "Реверс-форвардинг SSH через ssh -R.",
      sshfs: "Монтирование удалённого каталога по SSH.",
      steghide: "Скрывает данные в JPEG/BMP/WAV/AU через steghide.",
      stream: "Потоковая передача файлов, архивов или base64 по одному соединению.",
      tcp: "Обычный TCP-релей через socat.",
      text: "Экранирование для URL, HTML, MIME и текстовых каналов.",
      tls: "Сырой канал с шифрованием TLS.",
      tunnel: "Передача другого протокола через реверс- или скрытый туннель.",
      udp: "UDP-передача для небольших данных без гарантий доставки.",
      winrm: "Сессия WinRM через evil-winrm.",
      zero: "Скрывает биты в невидимых Unicode-символах."
    }
  };

  const state = {
    lhost: EXAMPLE.lhost,
    lport: EXAMPLE.lport,
    direction: EXAMPLE.direction,
    profile: EXAMPLE.profile,
    channel: EXAMPLE.channel,
    os: EXAMPLE.os,
    file: EXAMPLE.file,
    file_exfil: EXAMPLE.file_exfil,
    fileAuto: EXAMPLE.fileAuto,
    remote: EXAMPLE.remote,
    lhost_path: EXAMPLE.lhost_path,
    rhost: EXAMPLE.rhost,
    rhost_user: EXAMPLE.rhost_user,
    lhost_user: EXAMPLE.lhost_user,
    domain: EXAMPLE.domain,
    rhost_pass: EXAMPLE.rhost_pass,
    share_name: EXAMPLE.share_name,
    share_user: EXAMPLE.share_user,
    share_pass: EXAMPLE.share_pass,
    ssh_port: EXAMPLE.ssh_port,
    ssh_key: EXAMPLE.ssh_key,
    query: "",
    lang: "en"
  };

  const methods = Array.isArray(window.TABULA_METHODS) ? window.TABULA_METHODS : [];
  const TOOLS = window.TABULA_TOOLS || {};
  const CHANNEL_GROUPS = window.TABULA_CHANNEL_GROUPS || {};
  const SOURCE_BASE = "https://github.com/5yn7hp0w3r/file-transfer-arsenal/blob/main/docs/";
  const URL_KEYS = ["lhost", "lport", "direction", "profile", "channel", "os", "file", "file_exfil", "remote", "lhost_path", "rhost", "rhost_user", "lhost_user", "domain", "share_name", "share_user", "ssh_port", "lang"];

  let uiNote = "";
  let groupsOpen = true;

  const $ = (selector) => document.querySelector(selector);
  const output = $("#output");
  const outputTitle = $("#output-title");
  const outputMeta = $("#output-meta");
  const methodCount = $("#method-count");
  const copyAll = $("#copy-all");
  const exampleHint = $("#example-hint");
  const searchNote = $("#search-note");

  function t(key) {
    return (COPY[state.lang] && COPY[state.lang][key]) || COPY.en[key] || key;
  }

  function tf(key, vars) {
    return t(key).replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match;
    });
  }

  function methodWord(count) {
    if (state.lang === "ru") {
      const n = Math.abs(count) % 100;
      const n1 = n % 10;
      if (n1 === 1 && n !== 11) return "МЕТОД";
      if (n1 >= 2 && n1 <= 4 && (n < 12 || n > 14)) return "МЕТОДА";
      return "МЕТОДОВ";
    }
    return count === 1 ? "METHOD" : "METHODS";
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function inlineContent(text) {
    const fragment = document.createDocumentFragment();
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\bLHOST\b|\bRHOST\b)/g;
    let last = 0;
    let match;
    const value = String(text);
    while ((match = pattern.exec(value)) !== null) {
      if (match.index > last) {
        fragment.appendChild(document.createTextNode(value.slice(last, match.index)));
      }
      const token = match[0];
      if (token === "LHOST" || token === "RHOST") {
        fragment.appendChild(el("strong", token === "LHOST" ? "side-lhost" : "side-rhost", token));
      } else if (token.slice(0, 2) === "**") {
        fragment.appendChild(el("strong", "", token.slice(2, -2)));
      } else {
        fragment.appendChild(el("code", "", token.slice(1, -1)));
      }
      last = pattern.lastIndex;
    }
    if (last < value.length) {
      fragment.appendChild(document.createTextNode(value.slice(last)));
    }
    return fragment;
  }

  function defaultDownloadFile() {
    return state.os === "windows" ? "payload.exe" : "payload.sh";
  }

  function normalizeFile() {
    return (state.file || "").trim() || defaultDownloadFile();
  }

  function normalizeExfilFile() {
    return (state.file_exfil || "").trim() || "secrets.zip";
  }

  function normalizeRemote() {
    return (state.remote || "").trim() || (state.os === "windows" ? "C:\\Users\\Public" : "/tmp");
  }

  function normalizeLhostPath() {
    return (state.lhost_path || "").trim() || "/tmp/share";
  }

  function joinPath(dir, name) {
    const clean = dir.replace(/[\\/]+$/, "");
    return state.os === "windows" ? clean + "\\" + name : clean + "/" + name;
  }

  function fileFor(direction) {
    return direction === "exfil" ? normalizeExfilFile() : normalizeFile();
  }

  function remoteFileFor(direction) {
    return joinPath(normalizeRemote(), fileFor(direction));
  }

  function withExtension(name, ext) {
    return String(name).replace(/\.[^./\\]+$/, "") + "." + ext;
  }

  function methodFileFor(method, direction) {
    const base = fileFor(direction);
    return method && method.fileExt ? withExtension(base, method.fileExt) : base;
  }

  function remoteFileForMethod(method, direction) {
    return joinPath(normalizeRemote(), methodFileFor(method, direction));
  }

  function valueMap(direction, method) {
    const file = methodFileFor(method, direction);
    return {
      lhost: state.lhost.trim(),
      lport: state.lport.trim(),
      file: file,
      file_deliver: method && method.fileExt ? withExtension(normalizeFile(), method.fileExt) : normalizeFile(),
      file_exfil: method && method.fileExt ? withExtension(normalizeExfilFile(), method.fileExt) : normalizeExfilFile(),
      remote: normalizeRemote(),
      rhostpath: normalizeRemote(),
      lhostpath: normalizeLhostPath(),
      remotefile: remoteFileForMethod(method, direction),
      lhostfile: joinPath(normalizeLhostPath(), file),
      rhost: state.rhost.trim(),
      rhost_user: state.rhost_user.trim(),
      lhost_user: state.lhost_user.trim(),
      domain: state.domain.trim(),
      rhost_pass: state.rhost_pass,
      share_name: state.share_name.trim(),
      share_user: state.share_user.trim(),
      share_pass: state.share_pass,
      ssh_port: state.ssh_port.trim(),
      ssh_key: state.ssh_key.trim()
    };
  }

  function fill(template, direction, method) {
    const values = valueMap(direction || state.direction, method);
    return String(template).replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  function methodSteps(method) {
    if (Array.isArray(method.steps)) return method.steps;
    const steps = [];
    if (method.server) {
      steps.push({ side: "lhost", shell: method.server.shell, text: method.server.text });
    }
    const clients = Array.isArray(method.client) ? method.client : [method.client];
    clients.filter(Boolean).forEach(function (client) {
      steps.push({ side: "rhost", shell: client.shell, text: client.text });
    });
    return steps;
  }

  function sourceUrl(method) {
    const localized = state.lang === "ru" ? method.docs.replace("/en/", "/ru/") : method.docs;
    if (/^https?:\/\//i.test(localized)) {
      return localized + (method.anchor ? "#" + method.anchor : "");
    }
    const relative = localized
      .replace(/^\.\.\//, "")
      .replace(/^docs\//, "")
      .replace(/^\/+/, "");
    return SOURCE_BASE + relative + (method.anchor ? "#" + method.anchor : "");
  }

  function osMatch(method) {
    return Array.isArray(method.os) ? method.os.includes(state.os) : method.os === state.os;
  }

  function channelsSorted() {
    return Object.keys(TOOLS).sort(function (a, b) {
      return (TOOLS[a].order || 999) - (TOOLS[b].order || 999);
    });
  }

  function channelCaps(channel) {
    const list = methods.filter(function (method) {
      return method.channel === channel && osMatch(method);
    });
    return {
      deliver: list.some(function (method) { return method.direction === "deliver"; }),
      exfil: list.some(function (method) { return method.direction === "exfil"; })
    };
  }

  function channelUsable(channel, direction) {
    const caps = channelCaps(channel);
    if (direction === "both") return caps.deliver && caps.exfil;
    return Boolean(caps[direction]);
  }

  function usableChannels(direction) {
    return channelsSorted().filter(function (channel) {
      return channelUsable(channel, direction);
    });
  }

  function pickChannel(direction) {
    const usable = usableChannels(direction);
    const preferred = PREFERRED_CHANNELS[direction] || [];
    for (let i = 0; i < preferred.length; i += 1) {
      if (usable.indexOf(preferred[i]) !== -1) return preferred[i];
    }
    return usable[0];
  }

  function ensureChannelForDirection() {
    if (usableChannels(state.direction).indexOf(state.channel) !== -1) return "";
    const next = pickChannel(state.direction);
    if (!next) {
      if (state.direction === "both") {
        state.direction = "deliver";
        const inner = ensureChannelForDirection();
        return [t("noDualChannel"), inner].filter(Boolean).join(" ");
      }
      return "";
    }
    state.channel = next;
    return t("channelSwitched") + " " + (TOOLS[next] ? TOOLS[next].label : next) + ".";
  }

  function ensureChannelForOs() {
    if (usableChannels(state.direction).indexOf(state.channel) !== -1) return "";
    const next = pickChannel(state.direction);
    if (next) {
      state.channel = next;
      return t("channelSwitched") + " " + (TOOLS[next] ? TOOLS[next].label : next) + ".";
    }
    if (state.direction === "both") {
      state.direction = "deliver";
      return ensureChannelForOs();
    }
    const other = state.direction === "deliver" ? "exfil" : "deliver";
    const fallback = pickChannel(other);
    if (fallback) {
      state.direction = other;
      state.channel = fallback;
      return t("directionSwitched") + " " + t(other === "deliver" ? "deliver" : "exfiltrate") + ".";
    }
    return "";
  }

  function constrainDirection() {
    const caps = channelCaps(state.channel);
    if (state.direction === "both" && !(caps.deliver && caps.exfil)) {
      state.direction = caps.deliver ? "deliver" : "exfil";
      return t("directionSwitched") + " " + t(state.direction === "deliver" ? "deliver" : "exfiltrate") + ".";
    }
    if (state.direction === "deliver" && !caps.deliver) {
      state.direction = "exfil";
      return t("directionSwitched") + " " + t("exfiltrate") + ".";
    }
    if (state.direction === "exfil" && !caps.exfil) {
      state.direction = "deliver";
      return t("directionSwitched") + " " + t("deliver") + ".";
    }
    return "";
  }

  function isExample() {
    return state.lhost === EXAMPLE.lhost &&
      state.lport === EXAMPLE.lport &&
      state.direction === EXAMPLE.direction &&
      state.profile === EXAMPLE.profile &&
      state.channel === EXAMPLE.channel &&
      state.os === EXAMPLE.os &&
      state.file === EXAMPLE.file &&
      state.file_exfil === EXAMPLE.file_exfil &&
      state.remote === EXAMPLE.remote &&
      state.lhost_path === EXAMPLE.lhost_path &&
      state.rhost === EXAMPLE.rhost &&
      state.rhost_user === EXAMPLE.rhost_user &&
      state.lhost_user === EXAMPLE.lhost_user &&
      state.domain === EXAMPLE.domain &&
      state.rhost_pass === EXAMPLE.rhost_pass &&
      state.share_name === EXAMPLE.share_name &&
      state.share_user === EXAMPLE.share_user &&
      state.share_pass === EXAMPLE.share_pass &&
      state.ssh_port === EXAMPLE.ssh_port &&
      state.ssh_key === EXAMPLE.ssh_key;
  }

  function validate() {
    const host = state.lhost.trim();
    const port = state.lport.trim();
    const hostOk = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(host);
    const portOk = /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;

    const hostInput = $("#lhost");
    const portInput = $("#lport");
    const hostError = $("#lhost-error");
    const portError = $("#lport-error");

    hostInput.setAttribute("aria-invalid", String(!hostOk));
    portInput.setAttribute("aria-invalid", String(!portOk));
    hostError.textContent = hostOk ? "" : t("invalidHost");
    portError.textContent = portOk ? "" : t("invalidPort");

    return hostOk && portOk;
  }

  const PROFILE_LABELS = {
    all: "ALL",
    core: "OSCP & CPTS",
    exotic: "EXOTIC",
    lolbins: "LOLBINS"
  };

  const PREFERRED_CHANNELS = {
    deliver: ["http", "https", "smb", "webdav", "ftp", "ssh", "rdp", "winrm", "nc", "git"],
    exfil: ["servpy", "uploadserver", "https", "nc", "smb", "ftp", "ssh", "rdp", "winrm", "webdav", "nginx", "updog", "icmp", "dns", "socat", "openssl", "tunnel", "tftp", "encoding"],
    both: ["smb", "ssh", "ftp", "webdav", "nc", "rdp", "winrm"]
  };

  function matchesQuery(method, query) {
    if (!query) return true;
    const haystack = [
      method.title,
      method.id,
      method.channel,
      method.family,
      method.source,
      Array.isArray(method.requires) ? method.requires.join(" ") : "",
      method.note ? method.note.en : "",
      method.note ? method.note.ru : ""
    ].join(" ").toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function baseMethods() {
    return methods.filter(function (method) {
      const profileOk = state.profile === "all" || method.profiles.indexOf(state.profile) !== -1;
      const directionOk = state.direction === "both" ||
        (state.direction === "deliver" ? method.direction === "deliver" : method.direction === "exfil");
      return profileOk && osMatch(method) && directionOk;
    });
  }

  function channelMethods() {
    return baseMethods().filter(function (method) {
      return method.channel === state.channel;
    });
  }

  function filteredMethods(list) {
    const query = state.query.trim().toLowerCase();
    return list.filter(function (method) {
      return matchesQuery(method, query);
    });
  }

  function familyRank(channel, family) {
    const tool = TOOLS[channel];
    if (!tool || !Array.isArray(tool.families)) return 99;
    const index = tool.families.indexOf(family);
    return index === -1 ? 99 : index;
  }

  function sortMethods(list) {
    return list.slice().sort(function (a, b) {
      const directionRank = (a.direction === "deliver" ? 0 : 1) - (b.direction === "deliver" ? 0 : 1);
      const family = familyRank(state.channel, a.family) - familyRank(state.channel, b.family);
      const priority = (a.priority || 100) - (b.priority || 100);
      return directionRank || family || priority || a.title.localeCompare(b.title);
    });
  }

  function updateExampleHint() {
    if (!exampleHint) return;
    exampleHint.classList.toggle("is-hidden", !isExample());
  }

  function updateProfileNote() {
    const note = $("#profile-note");
    if (!note) return;
    const key = {
      all: "profileAllNote",
      core: "profileCoreNote",
      exotic: "profileExoticNote",
      lolbins: "profileLolbinsNote"
    }[state.profile] || "profileAllNote";
    note.textContent = t(key);
    const current = $("#coverage-current");
    if (current) current.textContent = PROFILE_LABELS[state.profile] || state.profile.toUpperCase();
  }

  function updateDirectionState() {
    const caps = channelCaps(state.channel);
    if (state.direction === "both" && !(caps.deliver && caps.exfil)) {
      state.direction = caps.deliver ? "deliver" : "exfil";
    } else if (state.direction !== "both" && !caps[state.direction]) {
      state.direction = caps.deliver ? "deliver" : "exfil";
    }

    const note = $("#direction-note");
    if (!note) return;
    const base = state.direction === "both"
      ? t("directionNoteBoth")
      : state.direction === "deliver" ? t("directionNoteDeliver") : t("directionNoteExfil");
    note.textContent = uiNote ? uiNote + " " + base : base;
  }

  function updateChannelNote() {
    const note = $("#channel-note");
    if (!note) return;
    const caps = channelCaps(state.channel);
    const base = caps.deliver && caps.exfil
      ? t("channelBoth")
      : caps.deliver ? t("channelDeliveryOnly") : t("channelExfilOnly");
    note.textContent = base;
  }

  function updateSearchNote(shown, total) {
    if (!searchNote) return;
    if (!state.query) {
      searchNote.textContent = "";
      return;
    }
    searchNote.textContent = tf("searchNote", {
      shown: String(shown),
      total: String(total),
      word: methodWord(total)
    });
  }

  function updateGroupToggle() {
    const button = $("#toggle-groups");
    if (!button) return;
    button.textContent = t(groupsOpen ? "collapseAll" : "expandAll");
    button.setAttribute("aria-expanded", String(groupsOpen));
  }

  function updateDirectionDescription() {
    const node = $("#output-direction-desc");
    if (!node) return;
    if (state.direction === "both") {
      node.textContent = "";
      node.classList.add("is-hidden");
      return;
    }
    node.textContent = t(state.direction === "deliver" ? "directionDeliverDesc" : "directionExfilDesc");
    node.classList.remove("is-hidden");
  }

  function updateSummary(count) {
    const directionLabel = state.direction === "both"
      ? t("bothDirections")
      : t(state.direction === "deliver" ? "deliver" : "exfiltrate");
    const os = t(state.os === "windows" ? "windows" : "linux");
    const tool = TOOLS[state.channel];
    outputTitle.textContent = directionLabel.toUpperCase() + " / " + os.toUpperCase() + " / " + (tool ? tool.label : state.channel.toUpperCase());
    outputMeta.textContent = "LHOST " + (state.lhost.trim() || "-") +
      " / LPORT " + (state.lport.trim() || "-") +
      " / FILE D/L " + normalizeFile() +
      " / FILE EXFIL " + normalizeExfilFile() +
      " / RHOST " + (state.rhost.trim() || "-");
    methodCount.textContent = String(count).padStart(2, "0") + " " + methodWord(count);
  }

  function emptyState(title, text, isError, action) {
    const wrap = el("div", "empty-state" + (isError ? " is-error" : ""));
    wrap.appendChild(el("p", "empty-numeral", isError ? "!" : "I"));
    wrap.appendChild(el("h2", "", title));
    wrap.appendChild(el("p", "", text));
    if (action) {
      const button = el("button", "text-button empty-action", action.label);
      button.type = "button";
      button.addEventListener("click", action.run);
      wrap.appendChild(button);
    }
    return wrap;
  }

  function toolSetupSteps() {
    const tool = TOOLS[state.channel];
    if (!tool) return [];
    const steps = [];
    if (Array.isArray(tool.install) && tool.install.length) {
      steps.push({ title: t("installTitle"), commands: tool.install, direction: state.direction });
    }

    const directions = state.direction === "both" ? ["deliver", "exfil"] : [state.direction];
    const seen = new Set();

    directions.forEach(function (direction) {
      const localState = Object.assign({}, state, { direction: direction });
      const prepare = typeof tool.prepare === "function" ? tool.prepare(localState) : tool.prepare;
      const start = typeof tool.start === "function" ? tool.start(localState) : tool.start;
      [["prepareTitle", prepare], ["startTitle", start]].forEach(function (pair) {
        if (!Array.isArray(pair[1]) || !pair[1].length) return;
        const signature = JSON.stringify(pair[1]);
        if (seen.has(signature)) return;
        seen.add(signature);
        const suffix = state.direction === "both"
          ? " · " + t(direction === "deliver" ? "deliver" : "exfiltrate")
          : "";
        steps.push({ title: t(pair[0]) + suffix, commands: pair[1], direction: direction });
      });
    });

    return steps;
  }

  function renderToolPipeline() {
    const tool = TOOLS[state.channel];
    if (!tool) return null;

    const section = el("section", "tool-pipeline");
    const head = el("div", "tool-pipeline-head");
    head.appendChild(el("p", "eyebrow", t("toolPipelineLabel").toUpperCase()));
    head.appendChild(el("h3", "", tool.label));
    section.appendChild(head);
    if (tool.purpose && tool.purpose[state.lang]) {
      section.appendChild(el("p", "tool-purpose", tool.purpose[state.lang]));
    }

    const steps = toolSetupSteps();
    const list = el("ol", "pipeline-list");
    steps.forEach(function (step, index) {
      const item = el("li", "pipeline-step");
      const stepHead = el("div", "pipeline-step-head");
      stepHead.appendChild(el("span", "pipeline-num", String(index + 1).padStart(2, "0")));
      stepHead.appendChild(el("h4", "", step.title));
      item.appendChild(stepHead);
      step.commands.forEach(function (command) {
        item.appendChild(commandBlock("lhost", command.shell, fill(command.text, step.direction), "pipeline-command"));
      });
      list.appendChild(item);
    });
    section.appendChild(list);

    if (Array.isArray(tool.alternatives) && tool.alternatives.length) {
      const alternatives = el("details", "pipeline-alternatives");
      alternatives.appendChild(el("summary", "pipeline-alternatives-summary", t("alternativeServers").toUpperCase()));
      tool.alternatives.forEach(function (alternative) {
        const label = alternative.label && (alternative.label[state.lang] || alternative.label.en);
        if (label) alternatives.appendChild(el("p", "pipeline-alt-title", label));
        alternatives.appendChild(commandBlock("lhost", alternative.shell, fill(alternative.text, state.direction), "pipeline-command"));
      });
      section.appendChild(alternatives);
    }

    if (tool.note && tool.note[state.lang]) {
      section.appendChild(el("p", "pipeline-note", tool.note[state.lang]));
    }
    if (tool.warning && tool.warning[state.lang] && !Array.isArray(tool.cleanup)) {
      const warning = el("p", "pipeline-warning");
      warning.appendChild(inlineContent(tool.warning[state.lang]));
      section.appendChild(warning);
    }
    return section;
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    const originalLabel = button.textContent;
    button.textContent = t("copied");
    button.dataset.copied = "true";
    window.setTimeout(function () {
      button.textContent = originalLabel;
      delete button.dataset.copied;
    }, 1200);
  }

  function commandBlock(sideKey, shell, text, className) {
    const wrap = el("div", "command-wrap" + (className ? " " + className : ""));
    const label = el("div", "command-label");
    const left = el("span", "command-side");
    const sideStrong = el("strong", "side-" + sideKey, t(sideKey));
    left.appendChild(sideStrong);
    left.appendChild(document.createTextNode(" / "));
    left.appendChild(document.createTextNode(shell.toUpperCase()));
    const copy = el("button", "copy-button", t("copy"));
    copy.type = "button";
    label.appendChild(left);
    label.appendChild(copy);
    const pre = el("pre", "command", text);
    wrap.appendChild(label);
    wrap.appendChild(pre);
    copy.addEventListener("click", function () {
      copyText(text, copy);
    });
    return wrap;
  }

  function helperBlock(helper, method) {
    const text = fill(helper.text, method.direction, method);
    const section = el("section", "method-helper");
    const head = el("div", "helper-head");
    const title = el("div", "helper-title");
    title.appendChild(el("span", "helper-kicker", t("helperFileLabel")));
    title.appendChild(el("h4", "", helper.name));
    const copy = el("button", "copy-button", t("copy"));
    copy.type = "button";
    head.appendChild(title);
    head.appendChild(copy);
    section.appendChild(head);
    const intro = el("p", "helper-intro");
    intro.appendChild(inlineContent(tf("helperIntro", {
      name: "**" + helper.name + "**",
      side: t(helper.side === "rhost" ? "rhost" : "lhost")
    })));
    section.appendChild(intro);
    section.appendChild(el("pre", "command helper-code", text));
    copy.addEventListener("click", function () {
      copyText(text, copy);
    });
    return section;
  }

  function methodCard(method, index) {
    const article = el("article", "method");
    const head = el("div", "method-head");
    const titleWrap = el("div", "method-title-wrap");
    titleWrap.appendChild(el("span", "method-index", String(index + 1).padStart(2, "0")));
    titleWrap.appendChild(el("h3", "", method.title));
    head.appendChild(titleWrap);
    const steps = methodSteps(method);
    const meta = el("div", "method-meta");
    meta.appendChild(el("span", "method-direction", t(method.direction === "deliver" ? "deliver" : "exfiltrate").toUpperCase()));
    meta.appendChild(el("span", "shell-tag", steps[0] ? steps[0].shell : "text"));
    if (method.fileExt) {
      meta.appendChild(el("span", "file-tag", "FILE " + methodFileFor(method, method.direction)));
    }
    if (Array.isArray(method.helpers)) {
      method.helpers.forEach(function (helper) {
        meta.appendChild(el("span", "helper-tag", t("helperBadge") + " " + helper.name));
      });
    }
    head.appendChild(meta);
    article.appendChild(head);

    if (Array.isArray(method.helpers)) {
      method.helpers.forEach(function (helper) {
        article.appendChild(helperBlock(helper, method));
      });
    }

    if (method.warning && method.warning[state.lang]) {
      const warning = el("p", "method-warning");
      warning.appendChild(inlineContent(method.warning[state.lang]));
      article.appendChild(warning);
    }

    steps.forEach(function (step) {
      article.appendChild(commandBlock(step.side, step.shell, fill(step.text, method.direction, method)));
    });

    const foot = el("div", "method-foot");
    const pair = el("button", "copy-button pair-button", t("copyPair"));
    pair.type = "button";
    pair.addEventListener("click", function () {
      const pairText = steps.map(function (step) {
        return t(step.side) + " [" + step.shell + "]\n" + fill(step.text, method.direction, method);
      });
      copyText(pairText.join("\n\n"), pair);
    });
    foot.appendChild(pair);

    if (method.requires && method.requires.length) {
      foot.appendChild(el("span", "requires", t("requires") + ": " + method.requires.join(", ")));
    }

    const docs = el("a", "source-link", t("source") + " " + method.source);
    docs.href = sourceUrl(method);
    docs.target = "_blank";
    docs.rel = "noopener";
    foot.appendChild(docs);
    article.appendChild(foot);

    if (method.note && method.note[state.lang]) {
      const note = el("p", "method-note");
      note.appendChild(inlineContent(method.note[state.lang]));
      article.appendChild(note);
    }

    return article;
  }

  function familyLabel(family) {
    return t("family_" + family);
  }

  function familyDescription(family) {
    const map = FAMILY_DESCRIPTIONS[state.lang] || FAMILY_DESCRIPTIONS.en;
    return map[family] || "";
  }

  function groupedFragment(found) {
    const fragment = document.createDocumentFragment();
    const directions = state.direction === "both" ? ["deliver", "exfil"] : [state.direction];
    let index = 0;
    let rendered = 0;

    directions.forEach(function (direction) {
      const list = found.filter(function (method) { return method.direction === direction; });
      if (!list.length) return;
      rendered += list.length;

      const block = el("section", "direction-block");
      if (state.direction === "both") {
        const heading = el("div", "direction-head");
        heading.appendChild(el("h3", "", t(direction === "deliver" ? "flowDeliver" : "flowExfil")));
        heading.appendChild(el("span", "direction-count", String(list.length).padStart(2, "0") + " " + methodWord(list.length)));
        block.appendChild(heading);
        block.appendChild(el("p", "direction-desc", t(direction === "deliver" ? "directionDeliverDesc" : "directionExfilDesc")));
      }

      const families = [];
      list.forEach(function (method) {
        if (families.indexOf(method.family) === -1) families.push(method.family);
      });
      families.sort(function (a, b) {
        return familyRank(state.channel, a) - familyRank(state.channel, b);
      });

      families.forEach(function (family) {
        const items = list.filter(function (method) { return method.family === family; })
          .sort(function (a, b) {
            return (a.priority || 100) - (b.priority || 100) || a.title.localeCompare(b.title);
          });

        const group = el("details", "method-group family-" + family);
        group.open = groupsOpen;
        if (groupsOpen) group.setAttribute("open", "");
        const summary = el("summary", "method-group-head");
        summary.appendChild(el("span", "method-group-title", familyLabel(family)));
        summary.appendChild(el("span", "method-group-count", String(items.length).padStart(2, "0")));
        group.appendChild(summary);

        const body = el("div", "method-group-body");
        const description = familyDescription(family);
        if (description) {
          body.appendChild(el("p", "method-group-desc", description));
        }
        const bar = el("div", "method-group-bar");
        const groupCopy = el("button", "copy-button group-button", t("copyGroup"));
        groupCopy.type = "button";
        groupCopy.addEventListener("click", function () {
          copyMethods(items, groupCopy, familyLabel(family));
        });
        bar.appendChild(groupCopy);
        body.appendChild(bar);

        items.forEach(function (method) {
          body.appendChild(methodCard(method, index));
          index += 1;
        });
        group.appendChild(body);
        block.appendChild(group);
      });

      fragment.appendChild(block);
    });

    return { fragment: fragment, count: rendered };
  }

  function verifyEntries(found) {
    const entries = [];
    found.forEach(function (method) {
      const target = remoteFileForMethod(method, method.direction);
      const duplicate = entries.some(function (entry) {
        return entry.direction === method.direction && entry.path === target;
      });
      if (!duplicate) entries.push({ direction: method.direction, path: target });
    });
    return entries;
  }

  function verifyBlock(found) {
    const entries = verifyEntries(found);
    if (!entries.length) return null;

    const section = el("section", "verify");
    section.appendChild(el("h3", "", t("verifyTitle")));
    section.appendChild(el("p", "verify-note", t("verifyNote")));
    entries.forEach(function (entry) {
      section.appendChild(el("p", "verify-label",
        t(entry.direction === "deliver" ? "deliver" : "exfiltrate").toUpperCase() + " · " + entry.path));
      const command = state.os === "windows"
        ? "certutil -hashfile \"" + entry.path + "\" SHA256"
        : "sha256sum \"" + entry.path + "\"";
      section.appendChild(commandBlock("rhost", state.os === "windows" ? "cmd" : "bash", command));
    });
    return section;
  }

  function cleanupBlock() {
    const tool = TOOLS[state.channel];
    if (!tool || !Array.isArray(tool.cleanup) || !tool.cleanup.length) return null;

    const section = el("section", "tool-cleanup");
    section.appendChild(el("h3", "", t("cleanupTitle")));
    if (tool.warning && tool.warning[state.lang]) {
      const warning = el("p", "pipeline-warning");
      warning.appendChild(inlineContent(tool.warning[state.lang]));
      section.appendChild(warning);
    }
    tool.cleanup.forEach(function (command) {
      if (command.os && command.os !== state.os) return;
      section.appendChild(commandBlock(command.side || "lhost", command.shell, fill(command.text, state.direction), "pipeline-command"));
    });
    return section;
  }

  function clearFieldErrors() {
    $("#lhost").setAttribute("aria-invalid", "false");
    $("#lport").setAttribute("aria-invalid", "false");
    $("#lhost-error").textContent = "";
    $("#lport-error").textContent = "";
  }

  function render() {
    updateExampleHint();
    updateDirectionState();
    updateChannelNote();
    updateProfileNote();
    updateGroupToggle();
    updateDirectionDescription();

    const host = state.lhost.trim();
    const port = state.lport.trim();

    if (!host && !port) {
      clearFieldErrors();
      outputTitle.textContent = t("emptyTitle").toUpperCase();
      outputMeta.textContent = "LHOST / LPORT";
      methodCount.textContent = "00 " + methodWord(0);
      copyAll.disabled = true;
      updateSearchNote(0, 0);
      output.replaceChildren(emptyState(t("emptyTitle"), t("emptyText"), false));
      writeUrl();
      return;
    }

    const valid = validate();
    const all = valid ? baseMethods() : [];
    const channelList = all.filter(function (method) { return method.channel === state.channel; });
    const found = sortMethods(filteredMethods(channelList));

    if (!valid) {
      outputTitle.textContent = t("invalidTitle").toUpperCase();
      outputMeta.textContent = "LHOST / LPORT";
      methodCount.textContent = "00 " + methodWord(0);
      copyAll.disabled = true;
      updateSearchNote(0, 0);
      output.replaceChildren(emptyState(t("invalidTitle"), t("invalidText"), true));
      writeUrl();
      return;
    }

    updateSummary(found.length);
    updateSearchNote(found.length, channelList.length);
    copyAll.disabled = found.length === 0;

    const fragment = document.createDocumentFragment();
    const pipeline = renderToolPipeline();
    if (pipeline) fragment.appendChild(pipeline);

    if (!found.length) {
      if (state.query) {
        fragment.appendChild(emptyState(t("noMatchesTitle"), t("noMatchesText"), false, {
          label: t("clearSearch"),
          run: function () {
            state.query = "";
            const search = $("#method-search");
            if (search) search.value = "";
            render();
          }
        }));
      } else if (state.profile !== "all" && !baseMethods().some(function (method) { return method.channel === state.channel; })) {
        fragment.appendChild(emptyState(t("noMethodsTitle"), t("noMethodsProfile"), false));
      } else {
        fragment.appendChild(emptyState(t("noMethodsTitle"), t("noMethodsText"), false));
      }
      output.replaceChildren(fragment);
      writeUrl();
      return;
    }

    const grouped = groupedFragment(found);
    fragment.appendChild(grouped.fragment);
    const verify = verifyBlock(found);
    if (verify) fragment.appendChild(verify);
    const cleanup = cleanupBlock();
    if (cleanup) fragment.appendChild(cleanup);
    output.replaceChildren(fragment);
    writeUrl();
  }

  function renderChannels() {
    const container = $("#channel-groups");
    if (!container) return;
    container.replaceChildren();

    const groups = Object.keys(CHANNEL_GROUPS).sort(function (a, b) {
      return CHANNEL_GROUPS[a].order - CHANNEL_GROUPS[b].order;
    });

    groups.forEach(function (groupKey) {
      const channels = channelsSorted().filter(function (channel) {
        return TOOLS[channel].group === groupKey && channelUsable(channel, state.direction);
      });
      if (!channels.length) return;

      const section = el("div", "channel-group");
      const label = CHANNEL_GROUPS[groupKey].label;
      section.appendChild(el("p", "channel-group-label", (label && label[state.lang]) || groupKey));

      const grid = el("div", "choice-grid tool-grid");
      channels.forEach(function (channel) {
        const tool = TOOLS[channel];
        const choice = el("label", "choice");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "channel";
        input.value = channel;
        input.checked = channel === state.channel;
        if (tool.purpose && tool.purpose[state.lang]) choice.title = tool.purpose[state.lang];

        const span = document.createElement("span");
        span.appendChild(document.createTextNode(tool.label));
        if (Array.isArray(tool.install) && tool.install.length) {
          const sup = document.createElement("sup");
          sup.textContent = "*";
          span.appendChild(sup);
        }
        choice.appendChild(input);
        choice.appendChild(span);
        grid.appendChild(choice);
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function syncInputs() {
    updateDirectionState();
    renderChannels();
    $("#lhost").value = state.lhost;
    $("#lport").value = state.lport;
    $("#file").value = state.file;
    $("#file_exfil").value = state.file_exfil;
    $("#remote").value = state.remote;
    $("#lhost_path").value = state.lhost_path;
    $("#rhost").value = state.rhost;
    $("#rhost_user").value = state.rhost_user;
    $("#lhost_user").value = state.lhost_user;
    $("#domain").value = state.domain;
    $("#rhost_pass").value = state.rhost_pass;
    $("#share_name").value = state.share_name;
    $("#share_user").value = state.share_user;
    $("#share_pass").value = state.share_pass;
    $("#ssh_port").value = state.ssh_port;
    $("#ssh_key").value = state.ssh_key;
    document.querySelectorAll('input[name="profile"]').forEach(function (input) {
      input.checked = input.value === state.profile;
    });
    document.querySelectorAll('input[name="os"]').forEach(function (input) {
      input.checked = input.value === state.os;
    });
    document.querySelectorAll('input[name="direction"]').forEach(function (input) {
      input.checked = input.value === state.direction;
    });
    updateProfileNote();
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      const key = node.getAttribute("data-i18n");
      if (COPY[state.lang][key] !== undefined) node.textContent = COPY[state.lang][key];
    });
    const langButton = $("#lang-button");
    langButton.textContent = state.lang === "en" ? "RU" : "EN";
    langButton.setAttribute("aria-label", t("switchLanguage"));
    const search = $("#method-search");
    if (search) search.placeholder = t("searchPlaceholder");
    updateProfileNote();
    syncInputs();
    render();
  }

  function setState(patch) {
    Object.assign(state, patch);
    syncInputs();
    render();
  }

  function loadExample() {
    uiNote = "";
    state.query = "";
    const search = $("#method-search");
    if (search) search.value = "";
    setState({
      lhost: EXAMPLE.lhost,
      lport: EXAMPLE.lport,
      direction: EXAMPLE.direction,
      profile: EXAMPLE.profile,
      channel: EXAMPLE.channel,
      os: EXAMPLE.os,
      file: EXAMPLE.file,
      file_exfil: EXAMPLE.file_exfil,
      fileAuto: true,
      remote: EXAMPLE.remote,
      lhost_path: EXAMPLE.lhost_path,
      rhost: EXAMPLE.rhost,
      rhost_user: EXAMPLE.rhost_user,
      lhost_user: EXAMPLE.lhost_user,
      domain: EXAMPLE.domain,
      rhost_pass: EXAMPLE.rhost_pass,
      share_name: EXAMPLE.share_name,
      share_user: EXAMPLE.share_user,
      share_pass: EXAMPLE.share_pass,
      ssh_port: EXAMPLE.ssh_port,
      ssh_key: EXAMPLE.ssh_key
    });
  }

  function reset() {
    uiNote = "";
    state.query = "";
    const search = $("#method-search");
    if (search) search.value = "";
    setState({
      lhost: "",
      lport: "",
      direction: "deliver",
      profile: "all",
      channel: "http",
      os: "windows",
      file: "payload.exe",
      file_exfil: "secrets.zip",
      fileAuto: true,
      remote: "C:\\Users\\Public",
      lhost_path: "/tmp/share",
      rhost: "10.10.10.10",
      rhost_user: "rhost_user",
      lhost_user: "lhost_user",
      domain: "inlanefreight.local",
      rhost_pass: "Password0@",
      share_name: "share",
      share_user: "test",
      share_pass: "test",
      ssh_port: "22",
      ssh_key: "~/.ssh/id_rsa"
    });
  }

  function methodLines(method, index) {
    const lines = [];
    lines.push(String(index + 1).padStart(2, "0") + " " + method.title +
      " [" + t(method.direction === "deliver" ? "deliver" : "exfiltrate").toUpperCase() + "]");
    methodSteps(method).forEach(function (step) {
      lines.push(t(step.side) + " [" + step.shell + "]\n" + fill(step.text, method.direction, method));
    });
    lines.push("");
    return lines;
  }

  function headerLines(found) {
    const directionLabel = state.direction === "both"
      ? t("bothDirections")
      : t(state.direction === "deliver" ? "deliver" : "exfiltrate");
    const tool = TOOLS[state.channel];
    const special = [];
    found.forEach(function (method) {
      if (method.fileExt) {
        const name = methodFileFor(method, method.direction);
        if (special.indexOf(name) === -1) special.push(name);
      }
    });
    const lines = [
      "TABULA / FILE TRANSFER ARSENAL",
      directionLabel.toUpperCase() + " / " +
        t(state.os === "windows" ? "windows" : "linux").toUpperCase() + " / " +
        (tool ? tool.label : state.channel.toUpperCase()),
      "LHOST: " + state.lhost.trim(),
      "LPORT: " + state.lport.trim(),
      "FILE (DOWNLOAD): " + normalizeFile(),
      "FILE (EXFIL): " + normalizeExfilFile()
    ];
    if (special.length) lines.push("SPECIAL FILES: " + special.join(", "));
    lines.push("RHOST PATH: " + normalizeRemote());
    lines.push("LHOST PATH: " + normalizeLhostPath());
    lines.push("");
    return lines;
  }

  function copyMethods(list, button, label) {
    const lines = [];
    lines.push("TABULA / " + (label || TOOLS[state.channel].label));
    lines.push("");
    list.forEach(function (method, index) {
      lines.push.apply(lines, methodLines(method, index));
    });
    copyText(lines.join("\n"), button);
  }

  function copyAllCommands() {
    const found = sortMethods(filteredMethods(baseMethods().filter(function (method) {
      return method.channel === state.channel;
    })));
    if (!found.length) return;

    const lines = headerLines(found);
    const tool = TOOLS[state.channel];
    if (tool) {
      lines.push("TOOL: " + tool.label);
      toolSetupSteps().forEach(function (step) {
        lines.push(step.title.toUpperCase());
        step.commands.forEach(function (command) {
          lines.push(t("lhost") + " [" + command.shell + "]\n" + fill(command.text, step.direction));
        });
      });
      if (Array.isArray(tool.alternatives) && tool.alternatives.length) {
        lines.push(t("alternativeServers").toUpperCase());
        tool.alternatives.forEach(function (alternative) {
          const label = alternative.label && (alternative.label[state.lang] || alternative.label.en);
          if (label) lines.push(label.toUpperCase());
          lines.push(t("lhost") + " [" + alternative.shell + "]\n" + fill(alternative.text, state.direction));
        });
      }
      if (tool.warning && tool.warning[state.lang] && !Array.isArray(tool.cleanup)) {
        lines.push("WARNING: " + tool.warning[state.lang].replace(/\*\*/g, "").replace(/`/g, ""));
      }
      lines.push("");
    }

    found.forEach(function (method, index) {
      lines.push.apply(lines, methodLines(method, index));
    });

    const entries = verifyEntries(found);
    if (entries.length) {
      lines.push(t("verifyTitle").toUpperCase());
      entries.forEach(function (entry) {
        const verify = state.os === "windows"
          ? "certutil -hashfile \"" + entry.path + "\" SHA256"
          : "sha256sum \"" + entry.path + "\"";
        lines.push(t(entry.direction === "deliver" ? "deliver" : "exfiltrate").toUpperCase() + " · " + entry.path);
        lines.push(t("rhost") + " [" + (state.os === "windows" ? "cmd" : "bash") + "]\n" + verify);
      });
    }

    if (tool && Array.isArray(tool.cleanup) && tool.cleanup.length) {
      lines.push("");
      lines.push(t("cleanupTitle").toUpperCase());
      if (tool.warning && tool.warning[state.lang]) {
        lines.push("WARNING: " + tool.warning[state.lang].replace(/\*\*/g, "").replace(/`/g, ""));
      }
      tool.cleanup.forEach(function (command) {
        if (command.os && command.os !== state.os) return;
        lines.push(t(command.side || "lhost") + " [" + command.shell + "]\n" + fill(command.text, state.direction));
      });
    }

    copyText(lines.join("\n"), copyAll);
  }

  function readUrl() {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const params = new URLSearchParams(raw);
    URL_KEYS.forEach(function (key) {
      if (params.has(key)) state[key] = params.get(key);
    });
    state.fileAuto = params.get("fileAuto") !== "0";

    if (!TOOLS[state.channel]) state.channel = EXAMPLE.channel;
    if (["deliver", "exfil", "both"].indexOf(state.direction) === -1) state.direction = EXAMPLE.direction;
    if (["windows", "linux"].indexOf(state.os) === -1) state.os = EXAMPLE.os;
    if (["all", "core", "exotic", "lolbins"].indexOf(state.profile) === -1) state.profile = EXAMPLE.profile;
    if (["en", "ru"].indexOf(state.lang) === -1) state.lang = "en";

    if (state.os === "linux" && state.remote === "C:\\Users\\Public") state.remote = "/tmp";
    if (state.os === "windows" && state.remote === "/tmp") state.remote = "C:\\Users\\Public";
    if (state.fileAuto) state.file = defaultDownloadFile();

    uiNote = ensureChannelForDirection();
  }

  function writeUrl() {
    const params = new URLSearchParams();
    URL_KEYS.forEach(function (key) {
      const value = state[key];
      params.set(key, value === undefined || value === null ? "" : value);
    });
    params.set("fileAuto", state.fileAuto ? "1" : "0");
    const next = "#" + params.toString();
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }

  function init() {
    readUrl();

    document.addEventListener("change", function (event) {
      const input = event.target;
      if (!input || !input.name) return;
      if (["direction", "os", "channel", "profile"].indexOf(input.name) === -1) return;

      uiNote = "";
      if (input.name === "direction") {
        state.direction = input.value;
        uiNote = ensureChannelForDirection();
      }
      if (input.name === "os") {
        const previous = state.os;
        state.os = input.value;
        if (previous !== state.os) {
          if (state.fileAuto) state.file = defaultDownloadFile();
          if (state.remote === (previous === "windows" ? "C:\\Users\\Public" : "/tmp")) {
            state.remote = state.os === "windows" ? "C:\\Users\\Public" : "/tmp";
          }
        }
        uiNote = ensureChannelForOs();
      }
      if (input.name === "channel") {
        state.channel = input.value;
        uiNote = constrainDirection();
        uiNote = ensureChannelForDirection() || uiNote;
        if (["ssh", "rdp", "winrm"].indexOf(state.channel) !== -1) {
          $("#advanced").open = true;
        }
      }
      if (input.name === "profile") {
        state.profile = input.value;
      }

      syncInputs();
      render();
    });

    const bindings = {
      "#lhost": "lhost",
      "#lport": "lport",
      "#file": "file",
      "#file_exfil": "file_exfil",
      "#lhost_path": "lhost_path",
      "#remote": "remote",
      "#rhost": "rhost",
      "#rhost_user": "rhost_user",
      "#lhost_user": "lhost_user",
      "#domain": "domain",
      "#rhost_pass": "rhost_pass",
      "#share_name": "share_name",
      "#share_user": "share_user",
      "#share_pass": "share_pass",
      "#ssh_port": "ssh_port",
      "#ssh_key": "ssh_key"
    };

    Object.keys(bindings).forEach(function (selector) {
      const key = bindings[selector];
      $(selector).addEventListener("input", function (event) {
        state[key] = event.target.value;
        if (key === "file") state.fileAuto = false;
        render();
      });
    });

    const search = $("#method-search");
    if (search) {
      search.addEventListener("input", function (event) {
        state.query = event.target.value;
        if (state.query.trim()) groupsOpen = true;
        render();
      });
    }

    const toggleGroups = $("#toggle-groups");
    if (toggleGroups) {
      toggleGroups.addEventListener("click", function () {
        groupsOpen = !groupsOpen;
        document.querySelectorAll("details.method-group").forEach(function (group) {
          group.open = groupsOpen;
          if (groupsOpen) {
            group.setAttribute("open", "");
          } else {
            group.removeAttribute("open");
          }
        });
        updateGroupToggle();
      });
    }

    $("#load-example").addEventListener("click", loadExample);
    $("#reset").addEventListener("click", reset);
    $("#copy-all").addEventListener("click", copyAllCommands);
    $("#print").addEventListener("click", function () {
      window.print();
    });
    $("#lang-button").addEventListener("click", function () {
      state.lang = state.lang === "en" ? "ru" : "en";
      applyLanguage();
    });

    window.addEventListener("beforeprint", function () {
      document.querySelectorAll("details.method-group").forEach(function (group) {
        group.open = true;
      });
    });

    syncInputs();
    updateProfileNote();
    applyLanguage();
  }

  init();
})();
