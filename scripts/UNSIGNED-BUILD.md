# ⚠️ Unsigned Build — Why These Scripts Are Here

This release was built by **CI without a paid code-signing certificate**.
Each operating system has its own security mechanism that blocks unsigned
apps downloaded from the internet. These helper scripts work around that
for demo and evaluation purposes.

---

## macOS — Gatekeeper

macOS tags every file downloaded from the internet with a **quarantine
attribute**. When you try to open an unsigned `.app`, Gatekeeper shows:

> *"BoxLang Starter Desktop.app" is damaged and can't be opened.
> You should move it to the Trash.*

The app is **not** actually damaged. It just lacks an Apple Developer ID
signature and notarization.

### Fix — option 1: use the helper script

```bash
bash mac-open.sh
```

This runs `xattr -cr` to strip the quarantine flag, then opens the app.

### Fix — option 2: manual terminal command

```bash
xattr -cr "/path/to/BoxLang Starter Desktop.app"
open "/path/to/BoxLang Starter Desktop.app"
```

### Fix — option 3: right-click

Right-click (or Control-click) the `.app` → **Open** → click **Open** in
the dialog. This only works once per app on some macOS versions.

---

## Windows — SmartScreen

Windows SmartScreen blocks unsigned executables downloaded from the
internet with:

> *Windows protected your PC — Microsoft Defender SmartScreen prevented
> an unrecognized app from starting.*

### Fix — option 1: use the helper script

Open PowerShell and run:

```powershell
.\win-unblock.ps1
```

This runs `Unblock-File` to remove the Mark-of-the-Web stream, then
launches the installer.

### Fix — option 2: manual

Right-click the `.exe` → **Properties** → check **Unblock** at the
bottom → **OK** → run the installer.

### Fix — option 3: SmartScreen dialog

Click **More info** in the SmartScreen dialog → **Run anyway**.

---

## Linux

Linux distributions do not have an equivalent quarantine mechanism.
The `.deb`, `.rpm`, and `.flatpak` packages should install and run
without any extra steps, though your package manager may warn about
unknown sources. Install with:

```bash
# Debian / Ubuntu
sudo dpkg -i "boxlang-starter-desktop_*.deb"

# RHEL / Fedora
sudo rpm -i "boxlang-starter-desktop-*.rpm"

# Flatpak
flatpak install --user "boxlang-starter-desktop-*.flatpak"
```

---

## Why not just sign the app?

Proper code signing requires:

- **macOS**: Apple Developer Program membership ($99/yr), a Developer ID
  Application certificate, and Apple Notarization.
- **Windows**: An EV or OV code-signing certificate from a trusted CA
  (~$200–$500/yr).

For a demo build this overhead is skipped. Production releases of
BoxLang Starter Desktop will be fully signed and notarized.
