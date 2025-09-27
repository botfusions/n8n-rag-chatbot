# N8N RAG Chat Dashboard - Deployment Rehberi

Bu rehber N8N RAG Chat Dashboard projesinin production ortamında deployment işlemlerini açıklar.

## 🎯 Deployment Seçenekleri

### 1. Coolify ile Deployment (Önerilen)
### 2. Docker Compose ile Manual Deployment
### 3. Kubernetes ile Deployment (Advanced)

---

## 🚀 Coolify Deployment

### Ön Gereksinimler

1. **Coolify Server** kurulu ve çalışır durumda
2. **Domain** ve DNS konfigürasyonu
3. **SSL Certificate** (Let's Encrypt otomatik)
4. **Supabase** self-hosted veya cloud instance
5. **N8N** self-hosted instance

### Adım 1: Repository Setup

```bash
# Git repository'yi Coolify'a bağlayın
# Source: GitHub/GitLab repository
# Branch: main
# Deploy Key: SSH key oluşturun
```

### Adım 2: Environment Variables

Coolify dashboard'da aşağıdaki environment variables'ları tanımlayın:

```env
# Database
SUPABASE_URL=https://your-supabase-instance.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-instance.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
NODE_ENV=production

# Security
JWT_SECRET=your-32-char-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key

# N8N
N8N_WEBHOOK_BASE_URL=https://n8n.your-domain.com/webhook

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://your-redis-instance:6379
REDIS_PASSWORD=your-redis-password

# Monitoring
SENTRY_DSN=your-sentry-dsn (optional)
```

### Adım 3: Service Configuration

#### Frontend Service (Next.js)
```yaml
# coolify-frontend.yml
name: rag-frontend
build:
  context: ./frontend
  dockerfile: ../docker/Dockerfile.frontend
port: 3000
domain: your-domain.com
ssl: true
```

#### Backend Service (Express.js)
```yaml
# coolify-backend.yml
name: rag-backend
build:
  context: ./backend
  dockerfile: ../docker/Dockerfile.backend
port: 3001
domain: api.your-domain.com
ssl: true
```

### Adım 4: Database Setup

```sql
-- Supabase'de database schema'yı çalıştırın
psql -h your-supabase-host -U postgres -d postgres -f docs/database-schema.sql
```

### Adım 5: N8N Workflow Import

1. **N8N dashboard'a giriş yapın**
2. **Workflows > Import** sekmesine gidin
3. **docs/n8n-workflows/** klasöründeki JSON dosyalarını import edin
4. **Environment variables'ları N8N'de tanımlayın**

---

## 🐳 Docker Compose Deployment

### Adım 1: Server Preparation

```bash
# Ubuntu/Debian server
sudo apt update
sudo apt install docker.io docker-compose git

# Docker'ı başlat
sudo systemctl start docker
sudo systemctl enable docker

# User'ı docker grubuna ekle
sudo usermod -aG docker $USER
```

### Adım 2: Project Clone

```bash
git clone https://github.com/your-org/n8n-rag-chatbot.git
cd n8n-rag-chatbot
```

### Adım 3: Environment Configuration

```bash
# Environment dosyası oluştur
cp .env.example .env

# Değerleri düzenle
nano .env
```

### Adım 4: SSL Certificate Setup (Optional)

```bash
# Let's Encrypt ile SSL
sudo apt install certbot

# Certificate oluştur
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com

# Certificate'leri Docker'a kopyala
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/ssl/key.pem
```

### Adım 5: Build and Deploy

```bash
# Production build
docker-compose -f docker/docker-compose.yml build

# Services'leri başlat
docker-compose -f docker/docker-compose.yml up -d

# Logları kontrol et
docker-compose -f docker/docker-compose.yml logs -f
```

### Adım 6: Health Check

```bash
# Frontend health check
curl -f https://your-domain.com/api/health

# Backend health check
curl -f https://api.your-domain.com/api/health

# Services status
docker-compose -f docker/docker-compose.yml ps
```

---

## ☸️ Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rag-chat-dashboard
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: rag-chat-dashboard
data:
  NODE_ENV: "production"
  NEXT_PUBLIC_APP_URL: "https://your-domain.com"
  # ... diğer non-secret config değerleri
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: rag-chat-dashboard
type: Opaque
stringData:
  SUPABASE_SERVICE_ROLE_KEY: "your-service-role-key"
  OPENAI_API_KEY: "sk-your-openai-api-key"
  JWT_SECRET: "your-jwt-secret"
  # ... diğer secret değerler
```

### Deployment

```bash
# Kubernetes deployment
kubectl apply -f k8s/

# Pod'ları kontrol et
kubectl get pods -n rag-chat-dashboard

# Logs
kubectl logs -f deployment/frontend -n rag-chat-dashboard
```

---

## 🔧 Production Optimizations

### 1. Database Optimizations

```sql
-- PostgreSQL optimizations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Vector index optimization
SET ivfflat.probes = 10;
```

### 2. Redis Configuration

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Nginx Optimizations

```nginx
# nginx.conf additions
worker_processes auto;
worker_connections 2048;

# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. Node.js Production Settings

```bash
# PM2 process manager
npm install -g pm2

# PM2 ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rag-backend',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📊 Monitoring Setup

### 1. Application Monitoring

```javascript
// backend/src/monitoring/health.ts
export const healthChecks = {
  database: async () => {
    // Supabase connection check
  },
  redis: async () => {
    // Redis connection check
  },
  openai: async () => {
    // OpenAI API check
  }
}
```

### 2. Prometheus Metrics

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'frontend'
    static_configs:
      - targets: ['frontend:3000']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
```

### 3. Grafana Dashboards

```json
// monitoring/grafana/dashboards/app-metrics.json
{
  "dashboard": {
    "title": "RAG Chat Dashboard Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## 🔐 Security Configuration

### 1. Firewall Rules

```bash
# UFW firewall setup
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # Block direct frontend access
sudo ufw deny 3001/tcp   # Block direct backend access
```

### 2. SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

### 3. Rate Limiting

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Apply limits
location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

---

## 🚨 Backup Strategy

### 1. Database Backup

```bash
# Daily Supabase backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-supabase-host -U postgres -d postgres > backup_$DATE.sql

# Upload to S3
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/database/
```

### 2. File Backup

```bash
# Backup uploaded files
rsync -av /app/uploads/ s3://your-backup-bucket/uploads/
```

### 3. Configuration Backup

```bash
# Backup environment and config
tar -czf config_backup_$DATE.tar.gz .env docker/ k8s/
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Database schema güncel
- [ ] Environment variables tanımlı
- [ ] SSL certificate hazır
- [ ] Domain DNS konfigürasyonu
- [ ] Backup strategy aktif

### Deployment
- [ ] Frontend build başarılı
- [ ] Backend build başarılı
- [ ] Database migrations çalıştırıldı
- [ ] N8N workflows import edildi
- [ ] Health checks geçiyor

### Post-Deployment
- [ ] Monitoring dashboard'lar aktif
- [ ] Log aggregation çalışıyor
- [ ] Error tracking aktif
- [ ] Performance metrics toplanıyor
- [ ] Backup jobs test edildi

---

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check Supabase connection
   psql -h your-supabase-host -U postgres -c "SELECT 1"
   ```

2. **N8N Webhook Not Working**
   ```bash
   # Check N8N workflow status
   curl -X POST https://n8n.your-domain.com/webhook/test
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in cert.pem -text -noout
   ```

4. **Memory Issues**
   ```bash
   # Monitor container memory
   docker stats
   ```

### Log Analysis

```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u docker -f
```

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2024-03-21
**Compatibility**: Docker 20.10+, Kubernetes 1.20+