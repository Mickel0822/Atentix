"""
Cliente de Supabase para la aplicación.
"""
from supabase import create_client, Client

from core.config import settings


def get_supabase_client() -> Client:
    """
    Crea y retorna una instancia del cliente de Supabase.
    
    Returns:
        Client: Cliente de Supabase configurado con las credenciales del entorno
    """
    # Asegurar que la URL de Supabase tenga trailing slash para evitar errores con storage endpoint
    supabase_url = settings.supabase_url.rstrip('/') + '/'
    return create_client(supabase_url, settings.supabase_key)

