
import asyncio
from supabase import create_client
import sys
import os

# Mock logic to import settings
sys.path.append('backend')
from core.config import settings

async def main():
    print("--- Debugging DB Schema ---")
    supabase = create_client(settings.supabase_url, settings.supabase_key)
    
    # 1. Check Tasks Table Columns
    print("Checking 'tasks' table columns...")
    try:
        # Insert a dummy task to see if it accepts questions_count or fails
        # Actually better to just select and see keys if there is data
        # If table is empty, we can't see keys easily with just select.
        # We will try to insert a fake task and delete it.
        
        # First check if any tasks exist
        res = supabase.table("tasks").select("*").limit(1).execute()
        if res.data:
            print(f"Existing task keys: {res.data[0].keys()}")
            if "questions_count" in res.data[0]:
                print("SUCCESS: 'questions_count' column EXISTS.")
            else:
                print("FAILURE: 'questions_count' column MISSING in select result.")
        else:
            print("No tasks found. Trying to insert a test task to check schema...")
            # We need a valid class_id.
            classes = supabase.table("classes").select("id").limit(1).execute()
            if classes.data:
                class_id = classes.data[0]['id']
                try:
                    test_task = {
                        "class_id": class_id,
                        "title": "Debug Task",
                        "video_url": "http://example.com/video.mp4",
                        "questions_count": 5
                    }
                    print(f"Attempting to insert: {test_task}")
                    # This will raise error if column missing
                    ins = supabase.table("tasks").insert(test_task).execute()
                    print("SUCCESS: Inserted task with questions_count. Schema is CORRECT.")
                    # Clean up
                    supabase.table("tasks").delete().eq("id", ins.data[0]['id']).execute()
                except Exception as e:
                    print(f"FAILURE: Could not insert task with questions_count. Error: {e}")
            else:
                print("Cannot test insert: No classes found.")

    except Exception as e:
        print(f"Error checking tasks: {e}")

if __name__ == "__main__":
    asyncio.run(main())
