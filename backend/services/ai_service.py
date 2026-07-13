from google import genai
from google.genai import types
from core.config import settings
import json
import asyncio
import re
import os

class AIService:
    def __init__(self):
        print(f"[AIService] Inicializando servicio de IA con SDK Async...")
        self.client = None
        if settings.gemini_api_key:
            # Inicializamos el cliente. 
            # NOTA: En el nuevo SDK, no necesitamos configuración extra para async,
            # se usa accediendo a .aio después.
            self.client = genai.Client(api_key=settings.gemini_api_key)
            print(f"[AIService] ✅ Cliente Google GenAI configurado")
        else:
            print("[AIService] ⚠️ WARNING: GEMINI_API_KEY not set. AI features will not work.")

    async def _generate_with_retry(self, prompt: str, schema_config=None) -> str:
        """
        Función interna que maneja los reintentos y el cambio de modelo.
        """
        if not self.client:
            raise Exception("Cliente IA no configurado")

        # Lista de modelos por prioridad. 
        # Usamos SOLO gemini-2.5-flash como solicitó el usuario
        models_to_try = ["gemini-2.5-flash"]
        
        last_error = None

        for model_name in models_to_try:
            # AUMENTO DE INTENTOS: De 3 a 5 para mayor persistencia ante errores 503/429
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    print(f"[AIService] 🔄 Intentando con {model_name} (Intento {attempt+1}/{max_retries})...")
                    
                    # Configuración para respuesta JSON si se requiere
                    config = {}
                    if schema_config:
                        config['response_mime_type'] = 'application/json'
                        config['response_schema'] = schema_config

                    # LLAMADA ASÍNCRONA REAL (.aio)
                    response = await self.client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config
                    )
                    
                    if not response.text:
                        raise Exception("Respuesta vacía de Gemini")

                    return response.text

                except Exception as e:
                    error_str = str(e)
                    last_error = e
                    print(f"[AIService] ⚠️ Error en {model_name} intento {attempt+1}: {e}")

                    # Si es error de cuota (429) o servidor sobrecargado (503)
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str:
                        # Backoff exponencial limitado: 5s, 10s, 20s, 30s, 30s...
                        wait_time = min(30, 5 * (2 ** attempt)) 
                        print(f"[AIService] ⏳ IA ocupada/cuota. Esperando {wait_time} segundos para reintentar...")
                        await asyncio.sleep(wait_time)
                    else:
                        # Si es otro tipo de error (ej. prompt invalido), no reintentamos este modelo
                        break 
            
            # Si llegamos aquí, el modelo falló 3 veces, pasamos al siguiente modelo (1.5-flash)
            print(f"[AIService] ⏭️ Cambiando de modelo por fallos en {model_name}...")

        raise Exception(f"Fallaron todos los intentos y modelos. Último error: {last_error}")

    async def summarize_text(self, text: str) -> str:
        """
        Generates a summary of the provided text.
        """
        if not self.client: return "Error: AI not configured."
        
        # Recortar texto para evitar errores de tokens masivos si el video es muy largo
        safe_text = text[:15000] 
        prompt = f"Por favor, proporciona un resumen conciso en español del siguiente contenido de video:\n\n{safe_text}"
        
        try:
            result_text = await self._generate_with_retry(prompt)
            print(f"[AIService] ✅ Resumen generado.")
            return result_text
        except Exception as e:
            print(f"[AIService] ❌ Error final generando resumen: {e}")
            return "No se pudo generar el resumen automáticamente."

    async def generate_summary(self, text: str) -> str:
        """Alias para mantener compatibilidad con endpoint"""
        return await self.summarize_text(text)

    async def generate_quiz(self, text: str, attention_score: float, num_questions: int = 5) -> list:
        # AT-20: la IA también debe generar preguntas sobre causas de distracción según la atención.
        """
        Generates a quiz based on the text.
        """
        print(f"[AIService] 🧠 Iniciando generación de quiz...")
        
        if not self.client:
            return [{"question": "Error IA", "options": ["Error"], "correct_answer": "Error"}]

        # Ajuste de dificultad
        if attention_score > 0.8:
            difficulty = "desafiante (análisis)"
        elif attention_score > 0.5:
            difficulty = "moderada (comprensión)"
        else:
            difficulty = "simple (memoria)"

        prompt = f"""
        Actúa como un profesor experto y crea un examen profesional de {num_questions} preguntas de selección múltiple en ESPAÑOL.
        
        INSTRUCCIONES:
        1. Las preguntas deben basarse EXCLUSIVAMENTE en el contenido del siguiente texto (que es la transcripción de un video educativo).
        2. NO uses frases como "según el texto", "en el fragmento", "el orador dice". En su lugar, usa frases naturales como "según lo visto en el video", "en la clase", o simplemente formula la pregunta directamente.
        3. El tono debe ser formal, académico y desafiante, adecuado para un entorno universitario.
        4. Opciones de respuesta plausibles, evitando obviedades.
        
        Contexto del Estudiante:
        - Nivel de Atención Detectado: {difficulty}
        - Transcripción del Video: 
        "{text[:25000]}" 

        FORMATO RESPUESTA (JSON RAW ARRAY):
        [
          {{
            "question": "¿Enunciado de la pregunta?",
            "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
            "correct_answer": "Opción Correcta"
          }}
        ]
        """

        try:
            # Usamos _generate_with_retry que maneja los 429 errors
            response_text = await self._generate_with_retry(prompt)
            
            # Limpieza agresiva del JSON por si el modelo incluye markdown
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            
            # A veces el modelo añade texto antes o después, buscamos el array [...]
            match = re.search(r'\[.*\]', cleaned_text, re.DOTALL)
            if match:
                cleaned_text = match.group(0)

            quiz_data = json.loads(cleaned_text)
            print(f"[AIService] ✅ Quiz generado correctamente con {len(quiz_data)} preguntas")
            return quiz_data

        except json.JSONDecodeError:
            print(f"[AIService] ❌ Error: La IA no devolvió un JSON válido: {response_text[:100]}...")
            return [{"question": "Error de formato IA", "options": ["Reintentar"], "correct_answer": "Reintentar"}]
        except Exception as e:
            print(f"[AIService] ❌ Error fatal generando quiz: {e}")
            return [{"question": "Error de conexión con IA", "options": ["Reintentar"], "correct_answer": "Reintentar"}]

    async def generate_summary_from_video(self, video_path: str) -> str:
        """
        Sube un video a Gemini y genera un resumen usando el modelo multimodal.
        """
        print(f"[AIService] 🎥 Procesando video: {video_path}")
        if not self.client: return "Error: IA no configurada."

        try:
            # 1. Subir el archivo a Gemini
            print(f"[AIService] ⬆️ Subiendo video a Google AI ({os.path.getsize(video_path)} bytes)...")
            
            # CORRECCIÓN: El argumento para archivos locales es 'path', no 'file'
            video_file = self.client.files.upload(
                path=video_path,
                config={'display_name': 'Video de Clase'}
            )
            
            print(f"[AIService] ✅ Video subido: {video_file.name} (Estado: {video_file.state})")
            
            # 2. Esperar a que el video esté procesado (ACTIVE)
            # Esperamos un máximo de 60 segundos
            max_wait = 60
            waited = 0
            while video_file.state == "PROCESSING":
                print(f"[AIService] ⏳ Esperando procesamiento del video ({waited}s)...")
                await asyncio.sleep(2)
                waited += 2
                if waited > max_wait:
                    raise Exception("Tiempo de espera de procesamiento agotado")
                video_file = self.client.files.get(name=video_file.name)
            
            if video_file.state != "ACTIVE":
                raise Exception(f"Video no se procesó correctamente. Estado: {video_file.state}")

            print(f"[AIService] ✅ Video procesado y listo.")

            # 3. Generar contenido multimodal
            prompt = "Actúa como un profesor experto. Transcribe mentalmente el contenido de audio y visual de este video. Luego, genera un resumen educativo detallado en español basado ÚNICAMENTE en esa transcripción interna. Ignora cualquier intro o outro irrelevante. Estructura el resumen por puntos clave."
            
            # Usamos SOLO gemini-2.5-flash
            models = ["gemini-2.5-flash"]
            last_error = None
            
            for model in models:
                try:
                    print(f"[AIService] 🔄 Generando resumen con {model}...")
                    response = await self.client.aio.models.generate_content(
                        model=model, 
                        contents=[video_file, prompt]
                    )
                    if response.text:
                        print(f"[AIService] ✅ Resumen de video generado.")
                        return response.text
                except Exception as e:
                    print(f"[AIService] ⚠️ Error con {model}: {e}")
                    last_error = e
                    if "429" in str(e):
                         await asyncio.sleep(10) # Wait a bit before next model
            
            raise last_error

        except Exception as e:
            print(f"[AIService] ❌ Error procesando video: {e}")
            return f"Error generando resumen del video: {e}"

ai_service = AIService()
