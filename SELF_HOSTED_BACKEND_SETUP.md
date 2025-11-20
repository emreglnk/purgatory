# 🖥️ Self-Hosted Backend Setup Guide

Bu rehber, backend'i kendi sunucunuzda GitHub self-hosted runner ile deploy etmeniz için gerekli adımları içerir.

---

## 📋 Ön Gereksinimler

### Sunucu Gereksinimleri
- **OS:** Ubuntu 20.04+ / Debian 11+ (Linux)
- **RAM:** Minimum 1GB (2GB önerilir)
- **CPU:** 1 core minimum
- **Disk:** 10GB boş alan
- **Node.js:** v20+
- **Internet:** Stable connection

### Gerekli Bilgiler
- ✅ Sui wallet private key (reaper için)
- ✅ Supabase project URL ve service key
- ✅ GitHub repository erişimi

---

## 🚀 Kurulum Adımları

### 1. Sunucuya SSH Bağlantısı

```bash
ssh user@your-server-ip
```

### 2. Sistem Güncellemesi

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Node.js Kurulumu

```bash
# Node.js 20 kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version
```

### 4. PM2 Kurulumu

```bash
sudo npm install -g pm2

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup
# Gösterilen komutu çalıştırın (sudo ile başlayan)
```

### 5. GitHub Runner Kurulumu

```bash
# Runner için dizin oluştur
mkdir -p ~/actions-runner && cd ~/actions-runner

# GitHub'dan runner'ı indir (en son sürümü kullanın)
# https://github.com/YOUR_USERNAME/purgatory/settings/actions/runners/new adresinden
# kendi işletim sisteminiz için komutları alın

# Örnek (Linux x64):
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-*.tar.gz

# Configure runner
./config.sh --url https://github.com/YOUR_USERNAME/purgatory --token YOUR_TOKEN

# Kurulum sırasında:
# - Runner name: purgatory-backend (veya istediğiniz isim)
# - Runner group: Default
# - Labels: self-hosted,Linux,X64

# Runner'ı servis olarak kur (otomatik başlasın)
sudo ./svc.sh install
sudo ./svc.sh start

# Status kontrol
sudo ./svc.sh status
```

### 6. GitHub Secrets Ayarla

GitHub repository'nizde **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Aşağıdaki secret'ları ekleyin:

```
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=suiprivkey1... (reaper wallet private key)
PURGATORY_PACKAGE_ID=0xda37e846ff23a56de6e21606778edd9974357b9e830bdd2fa46c3024fbfb131f
GLOBAL_PURGATORY_ID=0xa4ae907455c747ff4261d1f5d7f786f33dd1df88333c861efe7df1d7babf02fc
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (service_role key, anon değil!)
```

### 7. İlk Deployment

Artık her `main` branch'e push yaptığınızda backend otomatik deploy olacak!

```bash
# Local'den test push
git push origin main

# GitHub Actions → "Deploy Backend to Self-Hosted Runner" workflow'unu izleyin
```

---

## 🔍 Monitoring & Management

### PM2 Komutları

```bash
# Servisleri listele
pm2 list

# Logları izle (tüm servisler)
pm2 logs

# Belirli bir servisi izle
pm2 logs purgatory-indexer
pm2 logs purgatory-api
pm2 logs purgatory-reaper

# Servisleri yeniden başlat
pm2 restart all
pm2 restart purgatory-indexer

# Servisleri durdur
pm2 stop all
pm2 stop purgatory-api

# Servis durumunu göster
pm2 monit

# Detaylı bilgi
pm2 show purgatory-indexer
```

### API Health Check

```bash
# API çalışıyor mu?
curl http://localhost:3000/health

# Reputation query
curl http://localhost:3000/api/malicious?limit=5

# Stats
curl http://localhost:3000/api/stats
```

### Supabase Database Check

```bash
# psql ile bağlan (eğer kuruluysa)
# Veya Supabase Dashboard → SQL Editor

# Toplam kayıt sayısı
SELECT COUNT(*) FROM purgatory_items;

# Disposal reason dağılımı
SELECT disposal_reason, COUNT(*) 
FROM purgatory_items 
GROUP BY disposal_reason;

# Reputation stats
SELECT * FROM collection_reputation 
ORDER BY malicious_count DESC 
LIMIT 10;
```

---

## 🔒 Güvenlik Önerileri

### 1. Firewall Kurulumu

```bash
# UFW firewall kur
sudo apt install ufw

# SSH izin ver (önce bunu yap!)
sudo ufw allow 22

# API için port aç (opsiyonel - eğer dışarıdan erişilecekse)
# sudo ufw allow 3000

# Firewall'u aktif et
sudo ufw enable

# Status
sudo ufw status
```

### 2. Nginx Reverse Proxy (Opsiyonel - HTTPS için)

Eğer API'yi dışarıya açmak istiyorsanız:

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Nginx config
sudo nano /etc/nginx/sites-available/purgatory-api

# İçeriği:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable config
sudo ln -s /etc/nginx/sites-available/purgatory-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

### 3. Private Key Güvenliği

```bash
# .env dosyası sadece owner okuyabilsin
chmod 600 ~/purgatory/reaper/.env

# Runner user dışında kimse erişemesin
ls -la ~/purgatory/reaper/.env
# -rw------- 1 runner runner ... .env
```

---

## 🐛 Sorun Giderme

### Runner çalışmıyor

```bash
# Runner status
cd ~/actions-runner
sudo ./svc.sh status

# Log kontrol
journalctl -u actions.runner.* -f

# Restart
sudo ./svc.sh stop
sudo ./svc.sh start
```

### PM2 servisleri başlamıyor

```bash
# PM2 loglarını kontrol et
pm2 logs --err

# .env dosyası var mı?
cat ~/purgatory/reaper/.env

# Node modules kurulu mu?
cd ~/purgatory/reaper
npm install

# Manuel başlat
cd ~/purgatory/reaper
npm run indexer
```

### API'ye erişilemiyor

```bash
# Port dinliyor mu?
sudo netstat -tlnp | grep 3000

# Firewall?
sudo ufw status

# PM2 status
pm2 show purgatory-api

# Logs
pm2 logs purgatory-api --lines 50
```

### Supabase bağlantı hatası

```bash
# .env'de SUPABASE_SERVICE_KEY doğru mu? (anon değil, service_role!)
cat ~/purgatory/reaper/.env | grep SUPABASE

# Test et
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://your-project.supabase.co/rest/v1/purgatory_items?limit=1
```

---

## 📊 Performans İzleme

### Sistem Kaynakları

```bash
# CPU & RAM kullanımı
htop

# Disk kullanımı
df -h

# PM2 metrics
pm2 monit
```

### Log Rotasyonu

```bash
# PM2 log dosyaları büyümesin diye
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

---

## 🔄 Güncelleme

### Manual Update

```bash
cd ~/purgatory
git pull origin main
cd reaper
npm install
npm run build
pm2 restart all
```

### Auto Update via GitHub Actions

Artık sadece `git push origin main` yapmanız yeterli!
GitHub Actions otomatik olarak:
1. Code'u checkout eder
2. Dependencies'i yükler
3. Build eder
4. PM2 servisleri restart eder

---

## 💰 Maliyet

| Bileşen | Maliyet |
|---------|---------|
| **VPS (Hetzner)** | €4/month (~$4) |
| **Supabase Free Tier** | $0/month |
| **Domain (opsiyonel)** | ~$10/year |
| **Total** | **~$4/month** |

Railway'e göre **$60/year tasarruf!** (Railway $5/service × 3 = $15/mo)

---

## 🎉 Başarı Kriterleri

Deployment başarılı olduğunda:

```bash
# PM2'de 3 servis çalışıyor olmalı
pm2 list
# ├─ purgatory-indexer │ online │
# ├─ purgatory-api     │ online │
# └─ purgatory-reaper  │ online │

# API yanıt veriyor
curl http://localhost:3000/health
# {"status":"ok","timestamp":...}

# Supabase'de kayıtlar artıyor
# (Her disposal sonrası purgatory_items tablosuna bakın)
```

---

## 📞 Destek

Sorun yaşarsanız:

1. **Logs:** `pm2 logs --lines 100`
2. **GitHub Actions:** Workflow log'larını inceleyin
3. **Database:** Supabase dashboard → Logs
4. **Health:** `curl localhost:3000/health`

**Tebrikler! Self-hosted backend'iniz hazır! 🚀**

