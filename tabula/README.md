# TABULA

A static command generator for moving files between an attacker box and a
target. No build step and no backend: the page reads the catalogue from
`methods.js`, channel metadata and tool pipelines from `tools.js`, and renders
everything in the browser.

## Preview locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/tabula/
```

The banner is bundled in `tabula/assets/`, so the same page is served as the
GitHub Pages root at `https://5yn7hp0w3r.github.io/file-transfer-arsenal/`.

## Information architecture

The generator follows the same order as the handbook:

1. **Scenario** - deliver, exfiltrate, or both.
2. **Target OS** - Windows or Linux.
3. **Channel** - HTTP, HTTPS, serv.py, uploadserver, nginx, updog, WebDAV, SMB, FTP,
   SSH, RDP, WinRM, netcat, ncat, socat, OpenSSL, tunnels, ICMP, TFTP, DNS,
   git, SMTP, and the Transform channels (Encoding, Encryption, Stegano).
   Channels are grouped by family and filtered by what the chosen scenario and
   OS can use.
4. **Endpoints** - LHOST and LPORT.
5. **Advanced parameters** - paths, accounts, domain, RHOST password, SMB
   share name/user/password, SSH port/key.

`Coverage filter` is a secondary switch, not a primary step.

### Coverage lenses

- **ALL** - every method, including noisy, dangerous and lab-only paths.
- **OSCP & CPTS** - standard, reliable methods suitable for exam labs;
  excludes noisy, danger and transform-heavy entries.
- **EXOTIC** - non-standard channels, TLS/UDP, covert tricks and heavy
  transforms (encoding, encryption, steganography).
- **LOLBINS** - Windows built-in binaries and LOLBins. Linux native tools
  (curl, wget, bash `/dev/tcp`, base64, tar, ...) are covered by OSCP & CPTS.

A method can belong to several lenses; the filters are not exclusive.

## Catalogue schema

Each entry in `methods.js` declares:

| Field | Meaning |
|---|---|
| `id` | stable identifier |
| `title` | display name |
| `channel` | transport key (`http`, `smb`, `ssh`, ...) |
| `family` | sub-group inside the channel (`lolbin`, `powershell`, `scp`, `sftp`, ...) |
| `priority` | order inside the family; lower comes first |
| `profiles` | coverage lenses that include the method |
| `os` | `windows`, `linux`, or an array of both |
| `direction` | `deliver` or `exfil` |
| `source` | handbook section number |
| `docs` | path to the source document |
| `anchor` | optional heading anchor inside `docs` |
| `fileExt` | optional forced extension for methods that need a specific payload (`.ps1`, `.hta`, `.sct`) |
| `helpers` | optional list of `{ name, text }` helper files shown as copyable code blocks |
| `warning` | optional EN/RU warning rendered as a highlighted block above the commands |
| `requires` | binaries or services needed |
| `note` | EN/RU note shown under the method |
| `steps` | ordered `{ side, shell, text }` blocks |
| `server` / `client` | legacy shorthand, still supported |

Ordering is deterministic: direction, then the channel's `families` order from
`tools.js`, then `priority`, then title. There is no implicit ordering based on
the order of the file.

## Channels and pipelines

`tools.js` also defines `TABULA_CHANNEL_GROUPS` and, for every channel:

- `label`, `group`, `order`;
- `families` - the display order of method families;
- `install`, `prepare`, `start` - the LHOST pipeline;
- `warning`, `cleanup` - optional tool-level warning and post-transfer cleanup
  commands rendered at the bottom of the output;
- `purpose` and `note` in EN/RU.

Selecting a channel renders its pipeline above the methods. When the scenario
is **Both**, direction-dependent pipeline steps (netcat is the main example) are
rendered once per direction and labelled.

## Output

- methods are grouped by direction (when Both) and by family, in collapsible
  sections;
- `Collapse all` / `Expand all` switches every family at once;
- search filters the current tabula by title, id, requirements, and notes;
- `Copy group` copies one family, `Copy all` copies the visible tabula;
- an integrity-check block is generated for every direction in view;
- source links open the matching file in the GitHub repository
  (`main/docs/en` or `main/docs/ru`, depending on the interface language);
- the URL keeps the non-secret configuration (passwords and key paths are never
  written to it).

## Data quality rules

- a method must declare `channel`, `family`, and `priority`;
- a method may be dual-use only by existing twice, once per direction;
- commands on the target must write to `{remotefile}`, never to `{lhostpath}`;
- a method that needs a specific payload type must declare `fileExt`; the
  renderer then substitutes `payload.ps1`, `payload.hta`, `payload.sct`, etc.
  instead of the global `payload.exe`;
- a method that depends on an auxiliary file must declare `helpers`, so the
  card shows the full code with a Copy button;
- source links should point at the closest heading via `anchor` when known.

Validate the catalogue after edits:

```bash
node tabula/check.js
node tabula/audit.js
```

`check.js` validates the schema and docs paths. `audit.js` substitutes sample
values and syntax-checks every bash and PowerShell step (interactive shells and
cmd steps are skipped).

## Current scope

- 299 methods across 25 channels;
- profile lenses: ALL, OSCP & CPTS, EXOTIC, LOLBINS;
- coverage sizes: ALL 299 · OSCP & CPTS 150 · EXOTIC 186 · LOLBINS 60;
- targets: Windows, Linux;
- directions: Deliver, Exfiltrate, Both;
- EN/RU interface and notes;
- copy, copy pair, copy group, copy all, print;
- no analytics and no external API calls.

The catalogue is still being expanded. New methods should declare their channel
and family in `methods.js`, reuse the channel pipeline in `tools.js`, and link
back to the exact handbook heading. See [COVERAGE.md](COVERAGE.md) for the
current gap list.
