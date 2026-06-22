# 📦 Deployment Quick Start

## Archivos de Configuración Creados

✅ `backend/render.yaml` - Configuración para Render
✅ `frontend/vercel.json` - Configuración para Vercel  
✅ `backend/.env.production.example` - Variables de entorno (backend)
✅ `frontend/.env.production.example` - Variables de entorno (frontend)
✅ `backend/main.py` - CORS actualizado para producción

## 🚀 Deployment Rápido

### 1️⃣ Backend en Render

```bash
1. Ir a render.com → New Web Service
2. Conectar GitHub repo
3. Root Directory: backend
4. Build: pip install -r requirements.txt
5. Start: uvicorn main:app --host 0.0.0.0 --port $PORT
6. Copiar variables de .env.production.example
7. Deploy!
```

### 2️⃣ Frontend en Vercel

```bash
1. Ir a vercel.com → New Project
2. Conectar GitHub repo
3. Root Directory: frontend
4. Framework: Next.js (auto)
5. Copiar variables de .env.production.example
   - IMPORTANTE: Usar la URL de Render en NEXT_PUBLIC_API_BASE_URL
6. Deploy!
```

### 3️⃣ Conectar ambos

```bash
1. Copiar URL de Vercel (ej: https://tu-app.vercel.app)
2. En Render, agregar variable FRONTEND_URL con esa URL
3. Render re-desplegará automáticamente
4. ¡Listo!
```

## 📖 Documentación Completa

Ver [DEPLOYMENT_GUIDE.md](file:///C:/Users/micke/.gemini/antigravity/brain/b753f068-5e47-4155-8ee0-e707a7d8e704/DEPLOYMENT_GUIDE.md) para instrucciones paso a paso con troubleshooting.

## ⚡ Variables de Entorno Requeridas

### Backend (Render)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
- `FRONTEND_URL` (agregar después del deploy de Vercel)

### Frontend (Vercel)
- `NEXT_PUBLIC_API_BASE_URL` (URL de Render)
- `NEXT_PUBLIC_WS_BASE_URL` (URL de Render con wss://)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ✅ Checklist Post-Deploy

- [ ] Backend responde en `/docs`
- [ ] Frontend carga
- [ ] Login funciona
- [ ] Cámara detecta rostro
- [ ] Video se reproduce
- [ ] Quiz se genera al terminar video

---

**Nota**: El plan gratuito de Render duerme después de 15min sin uso. El primer request toma ~30s en despertar.
