# ChangelogAI — Setup & Commands

## Prerequisites

- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))
- **Git**

---

## 1. İlk Kurulum (Clone & Start)

```bash
git clone https://github.com/Sangaibisi/changeweave.git
cd changeweave
cp .env.example .env          # Gerekirse .env içindeki değerleri düzenle
docker compose up --build -d
```

Tüm servisler ayağa kalkar:

| Servis | URL | Port |
|--------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:8080/api | 8080 |
| MCP Server | http://localhost:3100/mcp | 3100 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |

---

## 2. Servislerin Durumunu Kontrol Et

```bash
docker compose ps
```

---

## 3. Logları İzle

```bash
# Tüm servisler
docker compose logs -f

# Sadece backend
docker compose logs -f backend

# Sadece frontend
docker compose logs -f frontend
```

---

## 4. Kod Değişikliği Sonrası Yeniden Deploy

### Frontend değişikliği:

```bash
docker compose up --build -d frontend
```

### Backend değişikliği:

```bash
docker compose up --build -d backend
```

### Her ikisi birden:

```bash
docker compose up --build -d
```

> `--build` flag'i image'ı yeniden oluşturur. `-d` detached modda çalıştırır.

---

## 5. Servisleri Durdur

```bash
# Durdur (verileri koru)
docker compose down

# Durdur + verileri sil (temiz başlangıç)
docker compose down -v
```

---

## 6. Veritabanına Bağlan

```bash
docker exec -it changelogai-postgres psql -U changelogai -d changelogai
```

---

## 7. Redis'e Bağlan

```bash
docker exec -it changelogai-redis redis-cli
```

---

## 8. Sadece Altyapıyı Başlat (Local Geliştirme)

PostgreSQL + Redis'i Docker'da, backend/frontend'i lokal çalıştırmak için:

```bash
# Sadece DB + Cache
docker compose up -d postgres redis

# Backend (ayrı terminal)
cd backend
mvn spring-boot:run

# Frontend (ayrı terminal)
cd frontend
npm install   # sadece ilk seferde
npm run dev
```

---

## 9. Temiz Rebuild (Cache Olmadan)

```bash
docker compose build --no-cache
docker compose up -d
```

---

## 10. Ortam Değişkenleri

`.env` dosyasında ayarlanabilir:

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `OPENAI_API_KEY` | OpenAI API anahtarı | (boş — fallback mod) |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | (boş) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | (boş) |
| `GITHUB_TOKEN` | GitHub PAT (MCP Server diff erişimi) | (boş) |
| `JWT_SECRET` | JWT imzalama anahtarı | dev default |
| `MCP_SERVER_URL` | MCP Server URL (backend için) | http://localhost:3100 |
| `MCP_ENABLED` | MCP LOC-level analiz aktif mi | true |

---

## Hızlı Referans

```bash
docker compose up --build -d     # Başlat / Güncelle
docker compose ps                # Durum
docker compose logs -f           # Loglar
docker compose down              # Durdur
docker compose down -v           # Durdur + Veri sil
docker compose restart backend   # Tek servis yeniden başlat
```
