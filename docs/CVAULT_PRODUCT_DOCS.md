# CVault VPN — Product Documentation

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Publisher:** Creovine  

---

## Introduction

CVault is a privacy-first VPN application and SDK built by Creovine.
It encrypts your internet traffic and routes it through a secure WireGuard tunnel,
protecting your data and masking your IP address.

Available as:
- macOS desktop app
- Windows desktop app *(coming soon)*
- Android APK *(coming soon)*
- iOS app *(coming soon)*
- Flutter SDK (embed VPN into your own app)

---

## Versions

| Version | Date | Platforms | What Changed |
|---|---|---|---|
| 1.0.0 | Feb 24, 2026 | macOS | Initial release — WireGuard tunnel, IP display, kill switch |

---

## Download & Installation

### macOS

**Requirements:** macOS 12 (Monterey) or later, Apple Silicon or Intel

**Steps:**

1. Download `CVault.dmg` from your [Creovine Dashboard](https://creovine.com/dashboard/downloads)
2. Open the `.dmg` file
3. Drag the **CVault** icon into your **Applications** folder
4. Open CVault from Applications or Launchpad

#### "Developer Not Known" Warning

When you first open CVault, macOS will show a security warning:

> *"CVault cannot be opened because it is from an unidentified developer"*

or

> *"macOS cannot verify that this app is free from malware"*

This appears because CVault is currently **not enrolled in the Apple Developer Program** ($99/year) for notarization. The app is safe. To bypass this warning:

**Method 1 (Recommended):**
1. Open **System Settings → Privacy & Security**
2. Scroll down to the **Security** section
3. You will see: *"CVault was blocked from use because it is not from an identified developer"*
4. Click **Open Anyway**
5. Enter your Mac password if prompted
6. CVault will open — you will not see this warning again

**Method 2:**
1. Right-click (or Control-click) the CVault app icon
2. Select **Open** from the context menu
3. Click **Open** on the dialog that appears

**Why this happens:** Apple requires a paid Developer Program membership to sign and notarize apps for distribution outside the App Store. Notarized builds will be available in a future version.

---

**First Launch — Admin Permission:**

CVault needs administrator access to configure the WireGuard network tunnel.
On first launch, you will be prompted to enter your Mac password once.
This sets up a passwordless tunnel management rule so you are not prompted again.

---

### Windows *(Coming Soon)*

**Requirements:** Windows 10 or later (64-bit), WireGuard installed

1. Install [WireGuard for Windows](https://www.wireguard.com/install/) first
2. Download `CVaultSetup.exe` from your dashboard
3. Run the installer — it will ask for UAC (admin) confirmation once
4. Launch CVault from the Start Menu or desktop shortcut

---

### Android APK *(Coming Soon)*

**Requirements:** Android 8.0 or later

1. Enable **Install from Unknown Sources** in your device Settings
2. Download `CVault.apk` from your dashboard
3. Tap the downloaded file to install
4. Open CVault and follow setup

---

### Flutter SDK

Add to your `pubspec.yaml`:

```yaml
dependencies:
  cvault_sdk:
    git:
      url: https://github.com/yerinsabraham/cvault.git
      path: sdk/flutter
```

Then initialize:

```dart
import 'package:cvault_sdk/cvault_sdk.dart';

final vault = CVaultSDK.init(
  licenseKey: 'cvlt_trial_xxx',   // from your Creovine dashboard
  apiKey: 'your_tenant_api_key',  // from your Creovine dashboard
);

await vault.connect();
```

---

## Features by Plan

| Feature | Trial | Starter | Pro | Enterprise |
|---|---|---|---|---|
| VPN Connects | 5 total | 100 / month | Unlimited | Unlimited |
| Devices | 1 | 3 | 10 | Unlimited |
| Bandwidth | 500 MB | 10 GB | 100 GB | Unlimited |
| Kill Switch | ✅ | ✅ | ✅ | ✅ |
| Real IP masking | ✅ | ✅ | ✅ | ✅ |
| SDK access | ✅ | ✅ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| SLA guarantee | ❌ | ❌ | ❌ | ✅ |

---

## Usage & Limits

### Trial Plan

The Trial plan gives you **5 VPN connection sessions** at no cost.
Each time you press **Connect**, one session is consumed.
Disconnecting and reconnecting counts as a new session.

When your 5 sessions are used up, you will see an upgrade prompt.
Your data and account are preserved — upgrading restores access immediately.

### Checking Your Usage

- Open the **CVault app** → bottom of the Connect screen shows sessions remaining
- Or visit your [Creovine Dashboard](https://creovine.com/dashboard/usage)

---

## Privacy & Security

- **Protocol:** WireGuard — the fastest and most modern VPN protocol available
- **Encryption:** ChaCha20 (256-bit keys)
- **No-logs policy:** CVault does not log which websites you visit
- **Kill switch:** If the VPN drops, all traffic is blocked until it reconnects
  (prevents accidental IP leaks)
- **IP masking:** Your real IP is replaced with the VPN server IP for all connections
- **Local config only:** WireGuard config files are written to `/tmp/` (macOS) or
  `%TEMP%` (Windows) and deleted when you disconnect

---

## Troubleshooting

### "Could not connect to VPN server"
- Check your internet connection is working without VPN
- Try again — the server may be temporarily unreachable
- If it persists more than 5 minutes, contact support

### "Trial limit reached"
- You have used all 5 free sessions
- Visit your [dashboard](https://creovine.com/dashboard/billing) to upgrade

### IP address is not changing after connect
- Disconnect and reconnect once
- If problem persists, restart the CVault app

### macOS keeps asking for password every connect
- Go to **Settings → Setup Admin Access** in the app to re-run the sudoers setup
- This configures passwordless tunnel management

### App crashes on launch (macOS)
- Make sure you are running macOS 12 or later
- Try right-clicking → Open instead of double-clicking
- If the problem persists, delete `~/Library/Application Support/CVault` and relaunch

---

## API Integration (for Developers)

If you are integrating CVault's VPN functionality into your own backend:

**Base URL:** `https://api.creovine.com/cvault/v1`

**Authentication:**
```
x-api-key: <your tenant API key>
Content-Type: application/json
```

**Connect:**
```http
POST /vpn/connect
{
  "licenseKey": "cvlt_trial_xxx",
  "deviceName": "My MacBook"
}
```

**Disconnect:**
```http
POST /vpn/disconnect
{
  "sessionId": "sess_xxx"
}
```

**Validate license:**
```http
POST /licenses/validate
{
  "licenseKey": "cvlt_trial_xxx"
}

Response:
{
  "valid": true,
  "plan": "TRIAL",
  "usesRemaining": 4
}
```

Full API reference at: `https://api.creovine.com/cvault/v1/docs`

---

## Support

- **Email:** support@creovine.com
- **Dashboard:** [creovine.com/dashboard](https://creovine.com/dashboard)
- **GitHub Issues:** [github.com/yerinsabraham/cvault](https://github.com/yerinsabraham/cvault)

---

## License

CVault is proprietary software. The trial is free to use.
Paid plans require an active subscription from the Creovine platform.
Redistribution or reverse engineering is not permitted.

© 2026 Creovine. All rights reserved.
