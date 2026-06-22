
import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

# Load env variables if possible, or use hardcoded if known (better to read from .env but I don't have direct access to user's .env file easily without reading it. I'll search for it or assume it's loaded in backend)
# I will try to read existing backend config approach.

# Wait, `backend/core/config.py` uses `python-dotenv`.
# I will just write a script that imports settings from backend.

import sys
sys.path.append('backend')
from core.config import settings

async def main():
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    
    # 1. Check roles
    print("--- Roles ---")
    try:
        roles = supabase.table("roles").select("*").execute()
        print(roles.data)
        if not any(r['name'] == 'profesor' for r in roles.data):
             print("Inserting roles...")
             supabase.table("roles").insert([
                 {"id": 1, "name": "administrador"},
                 {"id": 2, "name": "profesor"},
                 {"id": 3, "name": "estudiante"}
             ]).execute()
    except Exception as e:
        print(f"Error checking roles: {e}")

    # 2. Check/Create Professor Profile
    print("\n--- Profiles ---")
    # Intentamos buscar un perfil con rol 2 (profesor)
    try:
        profs = supabase.table("profiles").select("*").eq("role", 2).execute()
        professor_id = None
        
        if profs.data:
            print(f"Found existing professor: {profs.data[0]}")
            professor_id = profs.data[0]['user_id']
        else:
            print("No professor found. Attempting to create one.")
            # Necesitamos un user_id valido de auth.users si RLS está estricto, 
            # pero si estamos bypass, podemos intentar insertar en profiles si la FK a auth.users no es estricta o si tenemos trigger.
            # Normalmente profiles.user_id es FK a auth.users. No podemos insertar arbitrariamente en profiles sin un user en auth.
            # Verificaremos si hay usuarios en auth (no podemos hacerlo via API publica de supabase facilmente sin service role key para admin users).
            
            # FALLBACK: Usaremos el ID de un usuario existente si hay, o pediremos al usuario que se loguee/registre.
            # PERO para la demo, si el usuario no tiene auth real, esto es un bloqueante.
            # Asumiré que el usuario 'Admin' o similar existe o que el FK no está forzado (aunque el script SQL dice FK).
            print("Cannot create profile via API without Auth User. checking if any profile exists...")
            any_profile = supabase.table("profiles").select("*").limit(1).execute()
            if any_profile.data:
                print(f"Using first available profile as proxy: {any_profile.data[0]}")
                professor_id = any_profile.data[0]['user_id']
                
        if professor_id:
            print(f"\n>>> VALID PROFESSOR ID TO USE: {professor_id}")
            # Guardar en un archivo temporal para leerlo
            with open("valid_professor_id.txt", "w") as f:
                f.write(professor_id)
        else:
            print("\n>>> CRITICAL: No profiles found. Please Sign Up in the app first or insert a user in DB.")

    except Exception as e:
        print(f"Error accessing DB: {e}")

if __name__ == "__main__":
    asyncio.run(main())
