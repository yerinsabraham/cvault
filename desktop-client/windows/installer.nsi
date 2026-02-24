; CVault Windows Installer Script (NSIS)
; Build with: makensis windows\installer.nsi
; Produces: build\CVaultSetup.exe

!include "MUI2.nsh"
!include "LogicLib.nsh"

; ── App metadata ─────────────────────────────────────────────────────────────
Name        "CVault"
OutFile     "build\CVaultSetup.exe"
InstallDir  "$PROGRAMFILES64\CVault"
InstallDirRegKey HKLM "Software\CVault" "Install_Dir"
RequestExecutionLevel admin

; ── Versioning ───────────────────────────────────────────────────────────────
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName"     "CVault"
VIAddVersionKey "CompanyName"     "Creovine"
VIAddVersionKey "FileDescription" "CVault VPN Installer"
VIAddVersionKey "FileVersion"     "1.0.0"
VIAddVersionKey "LegalCopyright"  "Copyright (C) 2026 Creovine"

; ── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON   "windows\runner\resources\app_icon.ico"
!define MUI_UNICON "windows\runner\resources\app_icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; ── Install ───────────────────────────────────────────────────────────────────
Section "CVault" SecMain
  SectionIn RO

  ; Check that WireGuard is installed
  IfFileExists "$PROGRAMFILES64\WireGuard\wireguard.exe" wg_ok
  IfFileExists "$PROGRAMFILES\WireGuard\wireguard.exe"   wg_ok
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "WireGuard is required but not installed.$\n$\nDo you want to open the WireGuard download page?" \
      IDNO wg_ok
    ExecShell "open" "https://www.wireguard.com/install/"
    Abort "Please install WireGuard first, then run this installer again."
  wg_ok:

  SetOutPath "$INSTDIR"

  ; Copy all release files from the Flutter build output
  File /r "build\windows\x64\runner\Release\*.*"

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\CVault"
  CreateShortcut "$SMPROGRAMS\CVault\CVault.lnk" "$INSTDIR\CVault.exe"
  CreateShortcut "$SMPROGRAMS\CVault\Uninstall CVault.lnk" "$INSTDIR\Uninstall.exe"

  ; Desktop shortcut
  CreateShortcut "$DESKTOP\CVault.lnk" "$INSTDIR\CVault.exe"

  ; Add/Remove Programs entry
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "DisplayName"          "CVault"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "DisplayVersion"       "1.0.0"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "Publisher"            "Creovine"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "UninstallString"      "$INSTDIR\Uninstall.exe"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "DisplayIcon"          "$INSTDIR\CVault.exe"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "URLInfoAbout"         "https://creovine.com"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "NoModify"             1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault" "NoRepair"             1
SectionEnd

; ── Uninstall ─────────────────────────────────────────────────────────────────
Section "Uninstall"
  ; Remove installed files
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\CVault\CVault.lnk"
  Delete "$SMPROGRAMS\CVault\Uninstall CVault.lnk"
  RMDir  "$SMPROGRAMS\CVault"
  Delete "$DESKTOP\CVault.lnk"

  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CVault"
  DeleteRegKey HKLM "Software\CVault"
SectionEnd
