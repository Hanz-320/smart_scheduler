# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests, joblib, firebase_admin, json
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

# ----------------------------
# 🔧 Load Environment Variables
# ----------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

# ----------------------------
# 🔥 Flask Setup
# ----------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------
# ⏱️ Rate Limiting Setup
# ----------------------------
import time
from collections import deque

# Track API call timestamps (last 60 seconds)
api_call_timestamps = deque()
MAX_CALLS_PER_MINUTE = 10  # Gemini free tier limit

def check_rate_limit():
    """Check if we can make an API call without hitting rate limit."""
    current_time = time.time()
    
    # Remove timestamps older than 60 seconds
    while api_call_timestamps and current_time - api_call_timestamps[0] > 60:
        api_call_timestamps.popleft()
    
    # Check if we've hit the limit
    if len(api_call_timestamps) >= MAX_CALLS_PER_MINUTE:
        wait_time = 60 - (current_time - api_call_timestamps[0])
        return False, wait_time
    
    return True, 0

def record_api_call():
    """Record that an API call was made."""
    api_call_timestamps.append(time.time())

# ----------------------------
# 🔥 Firebase Initialization
# ----------------------------
db = None
try:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Firebase initialized successfully")
except Exception as firebase_error:
    print(f"⚠️  Firebase not initialized: {firebase_error}")
    print("   App will work without Firebase persistence")

# ----------------------------
# � Gemini-based Task Assignment
# ----------------------------
def assign_task_with_gemini(task_title, task_type, estimated_hours, priority):
    """Use Gemini to intelligently assign tasks to team members."""
    prompt = f"""You are a project manager assigning tasks to team members.

Team Members:
- Alice: Frontend specialist, good with UI/UX, React, Vue
- Bob: Backend specialist, APIs, databases, server infrastructure  
- Carol: Full-stack developer, testing, DevOps, documentation

Task Details:
- Title: {task_title}
- Type: {task_type}
- Estimated Hours: {estimated_hours}
- Priority: {priority}

Based on the task details and team member skills, assign this task to the most suitable person.

Respond with ONLY the team member's name (Alice, Bob, or Carol). No explanation."""

    try:
        # Check rate limit before assignment call
        can_call, wait_time = check_rate_limit()
        if not can_call:
            print(f"⚠️  Rate limit reached during assignment. Returning Unassigned.")
            return "Unassigned"
        
        response = requests.post(GEMINI_URL, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            # Record successful API call
            record_api_call()
            
            assigned_user = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Validate the response
            if assigned_user in ["Alice", "Bob", "Carol"]:
                return assigned_user
        return "Unassigned"
    except Exception as e:
        print(f"⚠️  Gemini assignment failed: {e}")
        return "Unassigned"

# ----------------------------
# 🕐 Convert Duration String to Hours
# ----------------------------
def _convert_duration_to_hours(duration_str):
    """Convert duration strings like '3 hours', '2 days', '1 week' to hours."""
    if isinstance(duration_str, (int, float)):
        return int(duration_str)
    
    duration_str = str(duration_str).lower().strip()
    
    # Parse number and unit
    import re
    match = re.match(r'(\d+(?:\.\d+)?)\s*(hour|day|week|month|hrs?|hr|d|w|wk|m)?', duration_str)
    
    if not match:
        return 3  # Default to 3 hours
    
    value = float(match.group(1))
    unit = match.group(2) or 'hour'
    
    # Convert to hours
    conversions = {
        'hour': 1, 'hours': 1, 'hr': 1, 'hrs': 1, 'h': 1,
        'day': 8, 'days': 8, 'd': 8,
        'week': 40, 'weeks': 40, 'w': 40, 'wk': 40,
        'month': 160, 'months': 160, 'm': 160
    }
    
    multiplier = conversions.get(unit, 1)
    return int(value * multiplier)

# ----------------------------
# �🚀 Routes
# ----------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Smart Scheduler Flask API is running 🚀"}), 200

@app.route("/generate", methods=["POST"])
def generate_tasks():
    try:
        data = request.get_json()
        description = data.get("description", "")

        if not description:
            return jsonify({"error": "No project description provided"}), 400

        # ----------------------------
        # ✅ Validate Input
        # ----------------------------
        # Remove extra whitespace
        description = description.strip()
        
        # Check minimum length
        if len(description) < 10:
            return jsonify({"error": "Project description is too short. Please provide at least 10 characters."}), 400
        
        # Check if it's just random characters or gibberish
        words = description.split()
        if len(words) < 3:
            return jsonify({"error": "Project description is too vague. Please provide at least 3 words describing your project."}), 400
        
        # Check for valid characters (letters, numbers, spaces, common punctuation)
        import re
        if not re.search(r'[a-zA-Z]', description):
            return jsonify({"error": "Project description must contain at least some letters."}), 400
        
        # Check for excessive special characters (likely gibberish)
        special_char_ratio = len(re.findall(r'[^a-zA-Z0-9\s.,!?-]', description)) / len(description)
        if special_char_ratio > 0.3:
            return jsonify({"error": "Project description contains too many special characters. Please use normal text."}), 400

        print(f"✅ Input validated: '{description[:50]}...'")

        # ----------------------------
        # ⏱️ Check Rate Limit
        # ----------------------------
        can_call, wait_time = check_rate_limit()
        if not can_call:
            return jsonify({
                "error": f"Rate limit reached. Please wait {int(wait_time)} seconds before generating more tasks."
            }), 429

        # ----------------------------
        # 🤖 Gemini API Request
        # ----------------------------
        prompt = f"""Break this project into 4-5 subtasks. Return ONLY valid JSON array.

Format:
[{{"title":"Task name","priority":"high|medium|low","estimatedDuration":"2 days"}}]

Project: {description}

JSON:"""

        try:
            print(f"📡 DEBUG - Calling Gemini API...")
            print(f"📡 DEBUG - API Key present: {bool(GEMINI_API_KEY)}")
            print(f"📡 DEBUG - Full URL: {GEMINI_URL}")
            
            # Prepare request with safety settings
            request_payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.5,
                    "topK": 20,
                    "topP": 0.8,
                    "maxOutputTokens": 2048,
                    "candidateCount": 1
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_NONE"
                    }
                ]
            }
            
            # Retry logic with exponential backoff
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.post(GEMINI_URL, json=request_payload, timeout=30)
                    
                    if response.status_code == 429:
                        if attempt < max_retries - 1:
                            wait_time = (2 ** attempt) * 2  # 2, 4, 8 seconds
                            print(f"⚠️  Rate limit hit. Retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                            import time
                            time.sleep(wait_time)
                            continue
                        else:
                            print(f"❌ Rate limit exceeded. Please wait a few minutes and try again.")
                            return jsonify({"error": "Gemini API rate limit exceeded. Please wait a few minutes and try again."}), 429
                    
                    response.raise_for_status()
                    result = response.json()
                    print(f"✅ DEBUG - Gemini API call successful")
                    
                    # Record successful API call for rate limiting
                    record_api_call()
                    
                    break
                except requests.exceptions.HTTPError as http_err:
                    if attempt == max_retries - 1:
                        raise http_err
            
            print(f"📡 DEBUG - Response status code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ DEBUG - Error response: {response.text}")
            
        except requests.exceptions.RequestException as api_error:
            print(f"❌ CRITICAL - Gemini API Error: {api_error}")
            print(f"❌ Response text: {response.text if 'response' in locals() else 'No response'}")
            return jsonify({"error": f"Gemini API failed: {str(api_error)}"}), 500

        # ----------------------------
        # 📝 Parse Gemini Output
        # ----------------------------
        try:
            # Check if response was cut off due to token limit
            finish_reason = result.get("candidates", [{}])[0].get("finishReason", "")
            if finish_reason == "MAX_TOKENS":
                print(f"⚠️  WARNING - Response was truncated due to MAX_TOKENS limit")
                return jsonify({"error": "Response too long. Please provide a shorter project description or try again."}), 500
            
            tasks_text = result["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as e:
            print(f"❌ ERROR - Failed to parse Gemini response structure: {e}")
            print(f"Response content: {result}")
            return jsonify({"error": f"Failed to parse Gemini response: {str(e)}"}), 500
            
        print(f"🔍 DEBUG - Raw Gemini Response:\n{tasks_text}\n")

        try:
            # Try to extract JSON from response (in case there's extra text)
            import re
            json_match = re.search(r'\[.*\]', tasks_text, re.DOTALL)
            if json_match:
                tasks_text = json_match.group(0)
            
            tasks_data = json.loads(tasks_text)  # expect Gemini to return JSON
            print(f"✅ DEBUG - Successfully parsed {len(tasks_data)} tasks from Gemini")
        except (json.JSONDecodeError, AttributeError) as parse_error:
            print(f"❌ ERROR - JSON parse error: {parse_error}")
            print(f"❌ Could not parse Gemini response. Raw text:\n{tasks_text[:500]}")
            return jsonify({"error": "Failed to parse Gemini response. The AI did not return valid JSON."}), 500

        tasks = []

        for t in tasks_data:
            title = t.get("title", "Unknown task")
            priority = t.get("priority", "medium").lower()
            estimated_duration = t.get("estimatedDuration", "3 hours")
            estimated_hours = _convert_duration_to_hours(estimated_duration)
            estimated_hours = min(max(estimated_hours, 1), 40)  # Cap between 1-40 hours
            
            # Infer task_type from title keywords
            title_lower = title.lower()
            if any(word in title_lower for word in ["frontend", "ui", "design", "mockup", "wireframe"]):
                task_type = "Frontend"
            elif any(word in title_lower for word in ["backend", "api", "database", "server"]):
                task_type = "Backend"
            elif any(word in title_lower for word in ["test", "testing", "qa"]):
                task_type = "Testing"
            elif any(word in title_lower for word in ["deploy", "devops", "infrastructure", "setup"]):
                task_type = "DevOps"
            elif any(word in title_lower for word in ["design", "ui", "ux"]):
                task_type = "Design"
            elif any(word in title_lower for word in ["doc", "document", "guide", "write"]):
                task_type = "Documentation"
            else:
                task_type = "Backend"  # Default
            
            # Generate auto-description based on title
            description = f"Execute the following task: {title}"
            
            # Generate auto acceptance criteria
            acceptance_criteria = [
                f"{title} completed successfully",
                "Code reviewed and approved",
                "Documentation updated"
            ]
            
            # Use Gemini to assign task to team member
            assigned_user = assign_task_with_gemini(title, task_type, estimated_hours, priority)

            task = {
                "title": title,
                "description": description,
                "priority": priority,
                "estimated_hours": estimated_hours,
                "estimatedDuration": estimated_duration,
                "task_type": task_type,
                "acceptance_criteria": acceptance_criteria,
                "dependencies": t.get("dependencies", []),
                "assigned_user": assigned_user,
                "status": "To Do"
            }

            # Save to Firebase (optional, only if Firebase is initialized)
            if db:
                try:
                    db.collection("tasks").add(task)
                except Exception as fb_error:
                    print(f"⚠️  Firebase save failed: {fb_error}")
            
            tasks.append(task)

        print(f"📋 DEBUG - Returning {len(tasks)} tasks to frontend")
        print(f"📋 DEBUG - First task sample: {tasks[0] if tasks else 'No tasks'}")
        return jsonify({"tasks": tasks}), 200

    except Exception as e:
        print("❌ Error generating tasks:", e)
        return jsonify({"error": str(e)}), 500

# ----------------------------
# ▶️ Run Server
# ----------------------------
if __name__ == "__main__":
    app.run(debug=False, port=5000, host="0.0.0.0")

