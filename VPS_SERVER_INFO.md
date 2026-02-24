# CVault VPS Server Information

**Date Configured:** February 24, 2026

---

## Server Details

**Provider:** DigitalOcean  
**IP Address:** `165.22.138.31`  
**Hostname:** `cvault-vpn-server`  
**Region:** (as configured)  
**SSH Access:** `ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31`

---

## WireGuard Configuration

**Interface:** `wg0`  
**Server IP (VPN):** `10.8.0.1/16`  
**Listen Port:** `51820/udp`  
**Public Key:** `ugJvPBwy++vfwEl31oGjoio5Vx2T+DLvdPqfcuzyRU8=`  
**Private Key:** `WA/dJRUvnm6O5wsAX01EHC3RI0FTLY70Q2KYIxuM52I=` *(stored on server)*

---

## IP Pool

**Total Range:** `10.8.0.0/16` (65,534 usable IPs)  
**Server:** `10.8.0.1`  
**Clients:** `10.8.0.2 - 10.8.255.254`

---

## Firewall Rules (UFW)

- **SSH:** Port 22/tcp (from anywhere)
- **WireGuard:** Port 51820/udp (from anywhere)
- **Default Incoming:** DENY
- **Default Outgoing:** ALLOW

---

## Services Running

- **WireGuard:** `wg-quick@wg0.service` ✅ Active
- **UFW Firewall:** ✅ Enabled
- **Fail2ban:** ✅ Installed (needs configuration)

---

## Useful Commands

### Check WireGuard Status
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'wg show'
```

### Add New Peer
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'wg set wg0 peer <PUBLIC_KEY> allowed-ips <IP>/32'
```

### Remove Peer
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'wg set wg0 peer <PUBLIC_KEY> remove'
```

### Restart WireGuard
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'systemctl restart wg-quick@wg0'
```

### Check Firewall Status
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'ufw status verbose'
```

### View System Resources
```bash
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31 'free -h && df -h'
```

---

## Test Client Configuration

A test client config has been created: `test_vpn_client.conf`

**Test Client IP:** `10.8.0.2`  
**Public Key:** `MGK0+4Z1xuV5zAEE5kmE4bYDMocUoWD3PAEyP0KNEmg=`

---

## Next Steps

1. ✅ VPS configured
2. ✅ WireGuard installed and running
3. ✅ Firewall configured
4. ✅ Test client created
5. ⏳ Test VPN connection from Mac
6. ⏳ Set up AWS backend (EC2, RDS)
7. ⏳ Configure backend to manage WireGuard dynamically

---

## Security Notes

⚠️ **Current setup is for testing only!**

For production:
- [ ] Configure Fail2ban properly
- [ ] Set up automated backups
- [ ] Enable monitoring
- [ ] Implement peer cleanup automation
- [ ] Add rate limiting
- [ ] Configure log rotation
- [ ] Set up automated security updates
