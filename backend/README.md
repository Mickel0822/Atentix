# Backend - API FastAPI

## Instalación

1. Instalar las dependencias:
```bash
pip install -r requirements.txt
```

## Ejecución

Para ejecutar el servidor en modo desarrollo:
```bash
uvicorn main:app --reload
```

El servidor estará disponible en: `http://localhost:8000`

## Endpoints

### GET /api/saludo
Devuelve un saludo "Hello World"

**Respuesta:**
```json
{
  "mensaje": "Hello World"
}
```

## Documentación

Una vez que el servidor esté corriendo, puedes acceder a:
- Documentación interactiva (Swagger): `http://localhost:8000/docs`
- Documentación alternativa (ReDoc): `http://localhost:8000/redoc`

