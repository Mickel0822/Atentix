
from supabase import create_client, Client
from core.config import settings

def get_student_id():
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    res = supabase.table('profiles').select('user_id').eq('role', 3).limit(1).execute()
    if res.data:
        print(f"VALID_ID:{res.data[0]['user_id']}")
    else:
        print("NO_STUDENT")

if __name__ == "__main__":
    get_student_id()
