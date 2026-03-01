# VanaAushadhi Backend — Production Deployment Guide

## Prerequisites

| Software | Min Version | Purpose |
|----------|------------|---------|
| Node.js | 20 LTS | Runtime |
| PostgreSQL | 16+ | Primary database |
| Redis | 7+ | Cache, queues, sessions |
| PM2 | 5+ | Process manager |
| Nginx | 1.24+ | Reverse proxy |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in ALL values.

### App Config
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Environment | `production` |
| `PORT` | ✅ | Server port | `3000` |
| `FRONTEND_URL` | ✅ | CORS origin | `https://vanaaushadhi.com` |
| `ADMIN_URL` | ✅ | Admin CORS origin | `https://admin.vanaaushadhi.com` |
| `API_PREFIX` | | API prefix | `api/v1` |

### Database
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_HOST` | ✅ | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | ✅ | PostgreSQL port | `5432` |
| `DATABASE_NAME` | ✅ | Database name | `vanaaushadhi_db` |
| `DATABASE_USER` | ✅ | Database user | `vanaaushadhi` |
| `DATABASE_PASSWORD` | ✅ | Database password | `strong_password_here` |
| `DATABASE_SSL` | | Enable SSL | `true` |

### Redis
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REDIS_HOST` | ✅ | Redis host | `localhost` |
| `REDIS_PORT` | ✅ | Redis port | `6379` |
| `REDIS_PASSWORD` | | Redis password | `redis_password` |

### JWT & Auth
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_ACCESS_SECRET` | ✅ | Access token secret (min 32 chars) | `your-very-long-random-secret-here-1234` |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret (min 32 chars) | `another-very-long-random-secret-5678` |
| `JWT_ACCESS_EXPIRY` | | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | | Refresh token TTL | `30d` |

### OTP
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OTP_EXPIRY_MINUTES` | | OTP validity | `5` |
| `OTP_MAX_ATTEMPTS` | | Max verify attempts | `5` |

### Razorpay
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RAZORPAY_KEY_ID` | ✅ | Razorpay key | `rzp_live_xxxx` |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret | `xxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Webhook secret | `whsec_xxxx` |

### SMS (MSG91)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MSG91_AUTH_KEY` | ✅ | MSG91 API key | `xxxx` |
| `MSG91_SENDER_ID` | | Sender ID | `VANAUS` |

### Email (SMTP/SES)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SMTP_HOST` | ✅ | SMTP server | `email-smtp.ap-south-1.amazonaws.com` |
| `SMTP_PORT` | | Port | `587` |
| `SMTP_USER` | ✅ | Username | `AKIA...` |
| `SMTP_PASS` | ✅ | Password | `xxxx` |
| `EMAIL_FROM` | | From address | `noreply@vanaaushadhi.com` |

### File Storage
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_S3_BUCKET` | | S3 bucket | `vanaaushadhi-uploads` |
| `AWS_S3_REGION` | | S3 region | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | | AWS key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | | AWS secret | `xxxx` |

---

## Database Setup

```bash
# 1. Create database
createdb -U postgres vanaaushadhi_db

# 2. Enable UUID extension
psql -U postgres -d vanaaushadhi_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 3. Run migrations
npm run migration:run

# 4. Verify migrations
npm run migration:show
```

---

## Production Start Sequence

```bash
# 1. Build
npm run build

# 2. Set environment
$env:NODE_ENV = "production"

# 3. Run migrations
npm run migration:run

# 4. Start with PM2
pm2 start dist/main.js --name vanaaushadhi-api -i 2 --max-memory-restart 512M

# 5. Save PM2 config
pm2 save
pm2 startup
```

---

## Nginx Configuration

```nginx
upstream vanaaushadhi_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.vanaaushadhi.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.vanaaushadhi.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.vanaaushadhi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vanaaushadhi.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Gzip
    gzip on;
    gzip_types application/json text/plain application/javascript;
    gzip_min_length 1000;

    # Timeouts
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;

    # Webhook endpoint (raw body, no buffering)
    location /api/v1/payments/webhook/razorpay {
        client_max_body_size 1m;
        proxy_buffering off;
        proxy_pass http://vanaaushadhi_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }

    # All other API routes
    location /api/ {
        client_max_body_size 10m;
        proxy_pass http://vanaaushadhi_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }

    # Block all non-API routes
    location / {
        return 404;
    }
}
```

---

## Razorpay Webhook Setup

1. Go to **Razorpay Dashboard → Settings → Webhooks**
2. Click **Add New Webhook**
3. URL: `https://api.vanaaushadhi.com/api/v1/payments/webhook/razorpay`
4. Secret: same as `RAZORPAY_WEBHOOK_SECRET` env var
5. Events to enable:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
   - `refund.failed`
6. Click **Create Webhook**

---

## Redis Production Config

```conf
# /etc/redis/redis.conf
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
save 3600 1 300 100
```

---

## Health Check

```
GET https://api.vanaaushadhi.com/api/v1/health
```

Expected: `{ "status": "ok" }`

---

## PM2 Monitoring

```bash
pm2 monit                      # Live dashboard
pm2 logs vanaaushadhi-api      # Stream logs
pm2 restart vanaaushadhi-api   # Zero-downtime restart
pm2 info vanaaushadhi-api      # Process info
```

---

## Backup Strategy

### PostgreSQL (daily at midnight)
```bash
# Crontab entry
0 0 * * * pg_dump -U vanaaushadhi vanaaushadhi_db | gzip > /backups/db/vanaaushadhi_$(date +\%Y\%m\%d).sql.gz
# Keep 7 days
0 1 * * * find /backups/db -name "*.sql.gz" -mtime +7 -delete
```

### Redis
RDB snapshots enabled (hourly). AOF for durability.

### S3
Enable versioning on the upload bucket for file recovery.
