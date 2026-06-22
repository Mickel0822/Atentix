#!/usr/bin/env python3
"""
Script de verificación pre-deployment para el backend.
Verifica que todas las dependencias y configuraciones estén correctas.
"""
import sys
import os

def check_env_vars():
    """Verifica que las variables de entorno necesarias estén configuradas."""
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_KEY',
        'GEMINI_API_KEY',
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"❌ Variables de entorno faltantes: {', '.join(missing)}")
        return False
    
    print("✅ Todas las variables de entorno están configuradas")
    return True

def check_python_version():
    """Verifica la versión de Python."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"❌ Python {version.major}.{version.minor} detectado. Se requiere Python 3.10+")
        return False
    
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} OK")
    return True

def check_requirements():
    """Verifica que requirements.txt exista."""
    if not os.path.exists('requirements.txt'):
        print("❌ requirements.txt no encontrado")
        return False
    
    print("✅ requirements.txt encontrado")
    return True

def check_imports():
    """Verifica que los módulos principales se puedan importar."""
    try:
        import fastapi
        import uvicorn
        import mediapipe
        import cv2
        import supabase
        print("✅ Módulos principales importados correctamente")
        return True
    except ImportError as e:
        print(f"❌ Error al importar módulos: {e}")
        print("   Ejecuta: pip install -r requirements.txt")
        return False

def main():
    print("🔍 Verificando configuración para deployment...\n")
    
    checks = [
        ("Versión de Python", check_python_version),
        ("Requirements.txt", check_requirements),
        ("Variables de entorno", check_env_vars),
        ("Importación de módulos", check_imports),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n📋 Verificando: {name}")
        results.append(check_func())
    
    print("\n" + "="*50)
    if all(results):
        print("✅ ¡Todo listo para deployment!")
        sys.exit(0)
    else:
        print("❌ Hay problemas que deben resolverse antes del deployment")
        sys.exit(1)

if __name__ == "__main__":
    main()
