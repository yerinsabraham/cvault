# Namecheap DNS Configuration for CVault

## Quick Setup Guide

### 1. Log in to Namecheap
1. Go to: https://www.namecheap.com
2. Sign in to your account
3. Click "Domain List" in the left sidebar
4. Find "creovine.com" and click "Manage"

### 2. Go to Advanced DNS
1. Click the "Advanced DNS" tab
2. You'll see a list of DNS records

### 3. Add These DNS Records

Click "Add New Record" for each of the following:

#### Record 1: API Subdomain
```
Type: A Record
Host: api
Value: 165.22.138.31
TTL: Automatic
```

**Purpose:** Points `api.creovine.com` to your DigitalOcean server where the backend runs

---

#### Record 2: CVault Product Subdomain
```
Type: A Record
Host: cvault
Value: 165.22.138.31
TTL: Automatic
```

**Purpose:** Points `cvault.creovine.com` to your server (for landing page)

**Alternative:** If you want to host the landing page elsewhere (Vercel, GitHub Pages), use a CNAME record instead:
```
Type: CNAME Record
Host: cvault
Value: your-vercel-domain.vercel.app
TTL: Automatic
```

---

#### Record 3: Download Subdomain (Optional)
```
Type: CNAME Record
Host: download
Value: api.creovine.com
TTL: Automatic
```

**Purpose:** `download.creovine.com` can serve app installers

---

## What It Should Look Like

After adding all records, your "Host Records" section should show:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `api` | `165.22.138.31` | Automatic |
| A Record | `cvault` | `165.22.138.31` | Automatic |
| CNAME | `download` | `api.creovine.com.` | Automatic |

## Verify DNS Propagation

**Wait:** DNS changes take 5-30 minutes to propagate worldwide.

**Check if it's working:**

**Option 1: Online Tool**
- Visit: https://dnschecker.org
- Enter: `api.creovine.com`
- Should show: `165.22.138.31` across most locations

**Option 2: Terminal**
```bash
# Check api subdomain
nslookup api.creovine.com
# Should return: 165.22.138.31

# Check cvault subdomain  
nslookup cvault.creovine.com
# Should return: 165.22.138.31
```

**Option 3: Ping**
```bash
ping api.creovine.com
# Should show: PING api.creovine.com (165.22.138.31)
```

## Troubleshooting

### DNS not resolving after 1 hour?
1. Check you saved the records (blue "Save All Changes" button)
2. Verify Host is just `api`, not `api.creovine.com`
3. Clear your DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   ```

### Getting wrong IP address?
- Make sure Value is `165.22.138.31` (no extra spaces)
- Check for duplicate records with same Host name
- Delete old/conflicting records

### SSL certificate fails?
- Wait for DNS to fully propagate (use dnschecker.org)
- Run: `sudo certbot --nginx -d api.creovine.com`
- Check your email for Let's Encrypt verification

## When DNS is Ready

You'll know DNS is working when:
1. `nslookup api.creovine.com` returns `165.22.138.31`
2. `curl http://api.creovine.com` doesn't show "connection refused"
3. dnschecker.org shows green checkmarks globally

**Then you can:**
- Run the SSL setup: `sudo certbot --nginx -d api.creovine.com`
- Test the API: `curl https://api.creovine.com/health`
- Build and test the production desktop app

## Future Subdomains

As you add more products to Creovine, just add more A records:

```
Type: A Record
Host: product2
Value: 165.22.138.31
TTL: Automatic
```

Then configure Nginx to route `api.creovine.com/product2/` to the right backend service.

## Summary

**Minimum required:** Just the `api` A record pointing to `165.22.138.31`

**Recommended:** All three records (api, cvault, download)

**Total cost:** $0 (domain already purchased, DNS is free)

**Time to propagate:** 5-30 minutes typically, up to 48 hours maximum

---

**Need help?** Check DNS status with: https://dnschecker.org/?domain=api.creovine.com
