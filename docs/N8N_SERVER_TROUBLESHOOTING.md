# 🔧 N8N Server Troubleshooting Guide

## 🚨 Mevcut Durum
- **Domain**: www.n8n.botfusions.com
- **Status**: "no available server"
- **API Token**: ✅ Güncel (iat: 1758977039)

## 🔍 Server Durumu Kontrol Adımları

### 1. Manuel Browser Kontrolü
```
1. Browser'da açın: https://www.n8n.botfusions.com
2. Login sayfası görünüyor mu kontrol edin
3. Error message'ları not edin
```

### 2. Server/Container Status Kontrolü
Eğer kendi server'ınızdaysanız:

```bash
# Docker container kontrolü
docker ps | grep n8n
docker logs n8n-container-name

# Service kontrolü
sudo systemctl status n8n
sudo journalctl -u n8n -f

# Port kontrolü
netstat -tulpn | grep 5678
lsof -i :5678
```

### 3. DNS/Network Kontrolü
```bash
# DNS resolution
nslookup www.n8n.botfusions.com
dig www.n8n.botfusions.com

# Ping test
ping www.n8n.botfusions.com

# Port connectivity
telnet www.n8n.botfusions.com 443
telnet www.n8n.botfusions.com 80
```

## 🚀 Server Başlatma Adımları

### Docker Deployment
```bash
# N8N Docker container başlatma
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e WEBHOOK_URL=https://www.n8n.botfusions.com \
  -e GENERIC_TIMEZONE=Europe/Istanbul \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Background'da çalıştırma
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -e WEBHOOK_URL=https://www.n8n.botfusions.com \
  -e GENERIC_TIMEZONE=Europe/Istanbul \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Docker Compose (Önerilen)
```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - WEBHOOK_URL=https://www.n8n.botfusions.com
      - GENERIC_TIMEZONE=Europe/Istanbul
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your_password
    volumes:
      - ~/.n8n:/home/node/.n8n
```

```bash
# Compose ile başlatma
docker-compose up -d
```

### Native Installation
```bash
# NPM ile global install
npm install n8n -g

# N8N başlatma
n8n start --tunnel

# Background'da çalıştırma
nohup n8n start &
```

## 🔧 Proxy/Reverse Proxy Konfigürasyonu

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name www.n8n.botfusions.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName www.n8n.botfusions.com

    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key

    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:5678/
    ProxyPassReverse / http://localhost:5678/

    # WebSocket support
    ProxyPass /socket.io/ ws://localhost:5678/socket.io/
    ProxyPassReverse /socket.io/ ws://localhost:5678/socket.io/
</VirtualHost>
```

## 📱 Alternative Access Methods

### 1. Localhost Access
Eğer server'da çalışıyorsanız:
```
http://localhost:5678
```

### 2. IP Direct Access
```
http://your-server-ip:5678
```

### 3. Tunnel Service (Development)
```bash
# N8N built-in tunnel
n8n start --tunnel

# ngrok tunnel
ngrok http 5678
```

## 🧪 Server Test Script

```bash
#!/bin/bash
# n8n-health-check.sh

URL="https://www.n8n.botfusions.com"
TOKEN="YOUR_N8N_API_TOKEN"

echo "🔍 N8N Health Check Starting..."

# 1. Basic connectivity
echo "1. Basic connectivity test..."
response=$(curl -s -k -w "%{http_code}" "$URL" -o /dev/null)
echo "HTTP Status: $response"

# 2. API endpoint test
echo "2. API endpoint test..."
api_response=$(curl -s -k -H "Authorization: Bearer $TOKEN" "$URL/api/v1/workflows" -w "%{http_code}")
echo "API Response: $api_response"

# 3. Health endpoint test
echo "3. Health endpoint test..."
health_response=$(curl -s -k "$URL/healthz" -w "%{http_code}")
echo "Health Response: $health_response"

echo "✅ Health check completed."
```

## 🔄 Import Alternative: Manual File Upload

Eğer API çalışmıyorsa, manuel import yapabilirsiniz:

### Manuel Import Adımları:
1. **N8N Web UI'ya erişin** (server aktif olduğunda)
2. **Workflows > Import from file**
3. **JSON dosyalarını sırayla yükleyin:**
   - `corrected-chat-rag-workflow.json` → RAG Chat Main Workflow
   - `supabase-only-chat-workflow.json` → RAG Chat Supabase Simple
   - `improved-document-processing-workflow.json` → RAG Document Processing

## 📞 Sonraki Adımlar

**Server aktif olduktan sonra bana bildirin:**
1. ✅ Server status (UP/DOWN)
2. ✅ Web UI erişimi (login yapabilme)
3. ✅ Workflow import durumu
4. ✅ Webhook URL'leri

**Test için hazır:**
- ✅ Test dashboard: `tests/n8n-test-dashboard.html`
- ✅ Test scripts: `tests/n8n-workflow-tests.js`
- ✅ Import files: `docs/n8n-workflows/*.json`

---
Generated with Claude Code (claude.ai/code)