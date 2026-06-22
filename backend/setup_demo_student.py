
import asyncio
from supabase import create_client, Client
from core.config import settings

async def create_demo_student():
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    
    demo_id = "00000000-0000-0000-0000-000000000000"
    
    print(f"Checking if demo student {demo_id} exists...")
    
    # Check if exists
    res = supabase.table("profiles").select("*").eq("user_id", demo_id).execute()
    
    if res.data:
        print("Demo student already exists.")
    else:
        print("Creating demo student...")
        try:
            # Note: We are inserting directly into profiles. 
            # In a real Auth flow, the user must exist in auth.users first.
            # However, since we might not have admin rights / triggers might be tricky,
            # we try to insert. If FK fails, we know we have a bigger issue.
            # But based on the provided SQL, profiles has a FK to auth.users (usually).
            # If this fails due to FK, we will have to mock it or use a real user ID found in the DB.
            
            # Let's try to find ANY user first to be safe, if we can't insert this one.
            pass 
            
            # ATTEMPT 1: Insert our specific UUID (might fail if auth.users FK is strict)
            data = {
                "user_id": demo_id,
                "email": "estudiante@demo.com",
                "full_name": "Estudiante Demo",
                "role": 3 # Estudiante
            }
            supabase.table("profiles").insert(data).execute()
            print("Demo student created successfully.")
            
        except Exception as e:
            print(f"Error creating specific demo student: {e}")
            print("Trying to find an existing student instead...")
            # Fallback: Find any student
            users = supabase.table("profiles").select("user_id").eq("role", 3).limit(1).execute()
            if users.data:
                print(f"Found existing student ID: {users.data[0]['user_id']}")
                print("PLEASE UPDATE THE FRONTEND WITH THIS ID IF THE DEMO ID FAILED.")
            else:
                print("No students found. Please create a user in Supabase Auth first.")

if __name__ == "__main__":
    asyncio.run(create_demo_student())
