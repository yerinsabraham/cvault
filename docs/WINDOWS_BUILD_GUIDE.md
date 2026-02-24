# CVault — Windows Build Guide

This guide walks you through everything needed to build and package the CVault VPN app
on a Windows PC, producing a `CVaultSetup.exe` installer ready for distribution.

---

## Overview

| What | Details |
|---|---|
| App | CVault VPN desktop client |
| Framework | Flutter (Dart) |
| VPN layer | WireGuard for Windows |
| Elevation | UAC prompt on app launch (admin required to manage tunnels) |
| Output | `CVaultSetup.exe` — a one-click installer |

---

## Step 1 — Machine Requirements

You need a **Windows 10 or Windows 11** machine (64-bit).  
All of the following must be installed before building.

### 1.1 Install Git

1. Download from https://git-scm.com/download/win
2. Install with default options
3. Verify in a new terminal:
   ```powershell
   git --version
   ```

### 1.2 Install Flutter

1. Download the Flutter SDK from https://docs.flutter.dev/get-started/install/windows
2. Extract to a folder with no spaces, e.g. `C:\flutter`
3. Add `C:\flutter\bin` to your system `PATH`
   - Search "Environment Variables" in Start → Edit "Path" → Add `C:\flutter\bin`
4. Open a new PowerShell window and verify:
   ```powershell
   flutter --version
   ```
5. Enable Windows desktop support:
   ```powershell
   flutter config --enable-windows-desktop
   ```

### 1.3 Install Visual Studio (required by Flutter for Windows)

Flutter for Windows needs the **C++ build tools** from Visual Studio.

1. Download **Visual Studio Community 2022** (free) from https://visualstudio.microsoft.com/
2. During install, select the workload:
   - ✅ **Desktop development with C++**
3. Complete the install (this will take a while — ~5 GB)

### 1.4 Install WireGuard for Windows

Required on the build machine to test the app, and required on end-user machines to run it.

1. Download from https://www.wireguard.com/install/
2. Install with default options
3. Default install path: `C:\Program Files\WireGuard\wireguard.exe`

### 1.5 Install NSIS (Installer Packager)

NSIS creates the `CVaultSetup.exe` installer.

1. Download from https://nsis.sourceforge.io/Download
2. Install with default options
3. Default install path: `C:\Program Files (x86)\NSIS\`

---

## Step 2 — Get the Code

Open **PowerShell** and clone (or pull) the repository:

```powershell
# If you don't have the repo yet:
git clone <your-repo-url> C:\Projects\cvault
cd C:\Projects\cvault\desktop-client

# If you already have it, just pull latest:
cd C:\Projects\cvault
git pull
cd desktop-client
```

---

## Step 3 — Run Flutter Doctor

This checks everything is set up correctly. Run inside the `desktop-client` folder:

```powershell
flutter doctor
```

You want to see ✅ next to at minimum:
- Flutter
- Windows Version
- Visual Studio

Example healthy output:
```
[✓] Flutter (Channel stable, ...)
[✓] Windows Version (Windows 11, ...)
[✓] Visual Studio - develop Windows apps (Visual Studio 2022 ...)
```

If anything shows `[✗]` or `[!]`, follow the instructions it prints before continuing.

---

## Step 4 — Get Flutter Dependencies

```powershell
flutter pub get
```

This downloads all Dart packages the app depends on. You'll see output like:
```
Resolving dependencies...
Got dependencies!
```

---

## Step 5 — Build the Release App

```powershell
flutter build windows --release
```

This compiles the app. It will take 1–3 minutes the first time.

On success you'll see:
```
✓ Built build\windows\x64\runner\Release\CVault.exe
```

The build output folder is:
```
desktop-client\build\windows\x64\runner\Release\
```

It contains `CVault.exe` plus required DLLs and Flutter data files.
**All of these files are needed** — the installer will bundle them together.

---

## Step 6 — Package into an Installer (CVaultSetup.exe)

Use the NSIS installer script included in the repo:

```powershell
& "C:\Program Files (x86)\NSIS\makensis.exe" windows\installer.nsi
```

On success you'll see:
```
Output: "build\CVaultSetup.exe"
Install: 7 sections, 0 instructions
```

The installer is now at:
```
desktop-client\build\CVaultSetup.exe
```

---

## Step 7 — Test the Installer

1. Double-click `CVaultSetup.exe`
2. Windows UAC will ask: *"Do you want to allow this app to make changes to your device?"* → click **Yes**
3. Follow the install wizard → Installs to `C:\Program Files\CVault\`
4. A desktop shortcut **CVault** is created automatically
5. Launch CVault from the desktop shortcut
6. On launch, Windows UAC will prompt again (once per session) — this is expected and normal; the app needs admin rights to manage WireGuard tunnels

---

## (Optional) One-Command Build Script

Instead of running steps 4–6 manually, you can use the included PowerShell script:

```powershell
.\build_windows.ps1
```

This runs `pub get` → `flutter build windows --release` → `makensis` in one go and reports any errors.

---

## What the Windows Build Does Differently from macOS

| | macOS | Windows |
|---|---|---|
| WireGuard command | `wg-quick up /tmp/cvault.conf` | `wireguard.exe /installtunnel C:\Temp\cvault.conf` |
| Elevation method | One-time sudoers setup via `osascript` | UAC prompt on every app launch (no setup dialog needed) |
| Password dialogs | Asked once, never again | UAC shown by Windows automatically |
| Config file location | `/tmp/cvault.conf` | `%TEMP%\cvault.conf` |
| WireGuard tunnel name | `cvault` (interface name) | `cvault` (Windows Service: `WireGuardTunnel$cvault`) |

---

## Troubleshooting

### `flutter build windows` fails with "MSBuild not found"
→ Visual Studio C++ workload is not installed. Re-run the Visual Studio installer and add **Desktop development with C++**.

### `flutter build windows` fails with "CMake not found"
→ Same fix — CMake is included in the Visual Studio C++ workload.

### App opens but VPN won't connect — "WireGuard is not installed"
→ Install WireGuard from https://www.wireguard.com/install/ on the user's machine. The installer script already checks for this and shows a prompt.

### NSIS `makensis` is not recognised
→ NSIS is not in your PATH. Use the full path:
```powershell
& "C:\Program Files (x86)\NSIS\makensis.exe" windows\installer.nsi
```

### App launches but immediately closes
→ Right-click the desktop shortcut → **Run as administrator**. If that works, the UAC manifest may not have applied. Rebuild with `flutter build windows --release`.

### `flutter doctor` shows "Android Studio" warnings
→ These can be ignored for Windows desktop builds. Only the Visual Studio ✅ matters.

---

## Distributing the App

Once you have `CVaultSetup.exe`:

1. Upload it to your website or CDN
2. Users download and double-click it — no technical knowledge needed
3. Add a note on your download page:
   > *"Windows will ask for administrator permission on install and on first launch — this is required for VPN tunnel management."*

---

## File Reference

```
desktop-client/
├── build_windows.ps1        ← one-command build script (run on Windows)
├── windows/
│   ├── installer.nsi        ← NSIS installer definition
│   ├── runner/
│   │   ├── runner.exe.manifest   ← UAC elevation config (requireAdministrator)
│   │   └── Runner.rc             ← Windows version/product info
│   └── CMakeLists.txt       ← binary name = CVault
└── lib/
    └── services/
        └── wireguard_service.dart  ← platform-aware: macOS + Windows logic
```
