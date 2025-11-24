from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import requests, json, time, re, os, joblib, random
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
import numpy as np
from itertools import cycle

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize Firebase
try:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully")
except Exception as e:
    print(f"⚠️ Firebase initialization failed: {e}")
    db = None

# Load ML models for task duration estimation
try:
    duration_artifacts = joblib.load('duration_artifacts.pkl')
    duration_model = duration_artifacts['model']
    le_task_type = duration_artifacts['le_task_type']
    le_assignee = duration_artifacts['le_assignee']
    print("✅ Duration ML model artifacts loaded successfully")
except Exception as e:
    print(f"⚠️ Duration ML model artifacts not loaded: {e}")
    duration_model = None
    le_task_type = None
    le_assignee = None


def call_gemini(prompt, max_retries=5):
    import time
    
    for attempt in range(max_retries):
        try:
            response = requests.post(GEMINI_URL, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.5, "maxOutputTokens": 65535}
            }, timeout=180)  # 3 minutes timeout
            
            print(f"📡 API Response Status: {response.status_code} (Attempt {attempt + 1}/{max_retries})")
            
            # Handle 503 Service Unavailable (overloaded)
            if response.status_code == 503:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 3  # Exponential backoff: 3s, 6s, 12s, 24s, 48s
                    print(f"⏳ Model overloaded. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ API Error Response: {response.text}")
                    return None, "Gemini API is overloaded. Please wait 30-60 seconds and try again."
            
            if response.status_code != 200:
                print(f"❌ API Error Response: {response.text}")
                return None, f"API error {response.status_code}: {response.text[:200]}"
            
            result = response.json()
            
            # Check for various finish reasons
            finish_reason = result.get("candidates", [{}])[0].get("finishReason", "")
            if finish_reason in ["MAX_TOKENS", "RECITATION", "SAFETY"]:
                print(f"⚠️ Response stopped: {finish_reason}")
                # Try to return partial content if available
                if result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text"):
                    return result["candidates"][0]["content"]["parts"][0]["text"], None
                return None, f"Response incomplete: {finish_reason}"
            
            return result["candidates"][0]["content"]["parts"][0]["text"], None
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                print(f"⏳ Request timed out. Retrying...")
                time.sleep(2)
                continue
            return None, "Request timed out - Gemini API is slow. Try again or reduce project scope."
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Error: {e}. Retrying...")
                time.sleep(2)
                continue
            return None, str(e)
    
    return None, "Failed after all retry attempts"

def estimate_task_duration(title, priority="medium", assignee="Unassigned"):
    """Use ML model to estimate task duration in hours"""
    if not duration_model:
        return 2.0  # Default 2 hours if model not loaded
    
    try:
        # Extract features (same as training)
        description_length = len(title)
        
        priority_map = {'low': 1, 'medium': 2, 'high': 3}
        priority_encoded = priority_map.get(priority.lower(), 2)
        
        # Categorize task type
        title_lower = title.lower()
        if any(word in title_lower for word in ['research', 'investigate', 'analyze']):
            task_type = 'research'
        elif any(word in title_lower for word in ['design', 'wireframe', 'mockup', 'ui', 'ux']):
            task_type = 'design'
        elif any(word in title_lower for word in ['develop', 'code', 'implement', 'build', 'prototype']):
            task_type = 'development'
        elif any(word in title_lower for word in ['test', 'qa', 'bug', 'fix']):
            task_type = 'testing'
        elif any(word in title_lower for word in ['meet', 'review', 'discuss']):
            task_type = 'meeting'
        else:
            task_type = 'other'
        
        # Encode task type
        try:
            task_type_encoded = le_task_type.transform([task_type])[0]
        except:
            task_type_encoded = 0
        
        # Encode assignee
        try:
            assignee_encoded = le_assignee.transform([assignee])[0]
        except:
            assignee_encoded = 0
        
        # Make prediction
        features = np.array([[description_length, priority_encoded, task_type_encoded, assignee_encoded]])
        estimated_hours = duration_model.predict(features)[0]
        
        # Round to 0.5 hours
        estimated_hours = round(estimated_hours * 2) / 2
        
        # Ensure reasonable bounds (0.5 to 40 hours)
        estimated_hours = max(0.5, min(40, estimated_hours))
        
        return float(estimated_hours)
    except Exception as e:
        print(f"⚠️ Duration estimation error: {e}")
        return 2.0

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Smart Scheduler API Running"}), 200

# Estimate task duration endpoint
@app.route("/api/estimate-duration", methods=["POST"])
def api_estimate_duration():
    try:
        data = request.json
        title = data.get("title", "")
        priority = data.get("priority", "medium")
        assignee = data.get("assignee", "Unassigned")
        
        if not title:
            return jsonify({"error": "Title required"}), 400
        
        estimated_hours = estimate_task_duration(title, priority, assignee)
        
        return jsonify({
            "estimatedHours": estimated_hours,
            "estimatedTime": f"{estimated_hours}h"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Authentication Routes
@app.route("/api/auth/check-username", methods=["POST"])
def check_username():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        username = data.get("username", "").strip()
        
        if not username:
            return jsonify({"error": "Username required"}), 400
        
        # Check if username exists in Firestore
        users_ref = db.collection("users")
        query = users_ref.where(filter=firestore.FieldFilter("username", "==", username)).limit(1)
        results = list(query.stream())
        
        return jsonify({"exists": len(results) > 0}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/register", methods=["POST"])
def register_user():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        uid = data.get("uid")
        username = data.get("username")
        email = data.get("email")
        
        if not all([uid, username, email]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Save user to Firestore
        user_ref = db.collection("users").document(uid)
        user_ref.set({
            "uid": uid,
            "username": username,
            "email": email,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "projects": []
        })
        
        return jsonify({"success": True, "message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get user info by userId
@app.route("/api/users/<user_id>", methods=["GET"])
def get_user_info(user_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        
        user_data = user_doc.to_dict()
        return jsonify({
            "uid": user_data.get("uid"),
            "username": user_data.get("username"),
            "email": user_data.get("email")
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update user profile
@app.route("/api/users/<user_id>", methods=["PATCH"])
def update_user_profile(user_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        updates = {}

        # Update username if provided
        if "username" in data:
            new_username = data["username"]
            if not new_username.strip():
                return jsonify({"error": "Username cannot be empty"}), 400
            
            # Update Firebase Auth display name
            auth.update_user(user_id, display_name=new_username)
            
            # Update Firestore document
            user_ref = db.collection("users").document(user_id)
            user_ref.update({"username": new_username})
            updates["username"] = new_username

        # Update password if provided
        if "newPassword" in data:
            new_password = data["newPassword"]
            if len(new_password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400
            
            # Update Firebase Auth password
            auth.update_user(user_id, password=new_password)
            updates["password"] = "updated"

        if not updates:
            return jsonify({"error": "No updates provided"}), 400

        return jsonify({"success": True, "updates": updates}), 200
    except Exception as e:
        print(f"❌ Profile update error: {e}")
        return jsonify({"error": str(e)}), 500



def assign_user(task, team_members, member_roles, assignments):
    """Assign a user to a task based on role and workload."""
    task_type = task.get("type", "other").lower()
    
    # Define role keywords for each task type
    role_map = {
        "frontend": ["frontend developer", "software engineer", "developer"],
        "backend": ["backend developer", "software engineer", "developer"],
        "development": ["backend developer", "software engineer", "developer", "frontend developer"],
        "design": ["designer", "ui/ux designer"],
        "testing": ["qa engineer", "tester", "software engineer"],
        "devops": ["devops engineer", "systems administrator"],
        "documentation": ["technical writer", "developer", "business analyst"],
        "research": ["researcher", "analyst", "business analyst"],
        "analysis": ["researcher", "analyst", "business analyst"],
        "planning": ["project manager", "business analyst"],
        "data_preparation": ["business analyst", "data analyst", "software engineer"],
        "review": ["project manager", "qa engineer", "software engineer"],
        "deployment": ["devops engineer", "software engineer"],
        "monitoring": ["devops engineer", "software engineer"],
        "feedback": ["project manager", "business analyst"],
        "meeting": [],  # Can be assigned to anyone
        "other": [],    # Can be assigned to anyone
    }
    
    possible_roles = role_map.get(task_type, [])
    
    # Find all users with the possible roles
    eligible_users = []
    if possible_roles:
        for user, role in member_roles.items():
            if any(keyword in role.lower() for keyword in possible_roles):
                eligible_users.append(user)
            
    # If no one has a specific role, any developer can take it
    if not eligible_users:
        for user, role in member_roles.items():
            if "developer" in role.lower() or "engineer" in role.lower():
                eligible_users.append(user)

    # If still no one, make it open for anyone in the team
    if not eligible_users:
        eligible_users = list(team_members)

    # If team is empty, return "Unassigned"
    if not eligible_users:
        return "Unassigned"
        
    # Find the user with the minimum number of assigned tasks
    eligible_assignments = {u: assignments.get(u, 0) for u in eligible_users}
    
    # Return user with the least tasks
    return min(eligible_assignments, key=eligible_assignments.get)

@app.route("/generate", methods=["POST"])
@cross_origin()
def generate():
    data = request.get_json()
    description = data.get("description", "").strip()
    team_members = data.get("teamMembers", [])  # Get team members from frontend
    current_user = data.get("currentUser", {})  # Get current logged-in user info
    
    print(f"📥 Received team members: {team_members}")
    print(f"👤 Current user: {current_user}")
    
    if len(description) < 10:
        return jsonify({"error": "Description too short (min 10 chars)"}), 400
    
    words = description.split()
    if len(words) < 5:
        return jsonify({"error": "Description too vague (min 5 words)"}), 400

    unique_words = set(words)
    if len(unique_words) < 3:
        return jsonify({"error": "Description seems repetitive or is too simple. Please be more descriptive."}), 400
    
    # Build team context for AI - extract just the project description without team info
    base_description = description.split('\n\nTeam Members')[0] if '\n\nTeam Members' in description else description
    base_description = base_description.split('\n\nCRITICAL RULES')[0] if '\n\nCRITICAL RULES' in base_description else base_description
    
    team_context = ""
    member_names = []
    member_roles = {}  # Track member roles for intelligent assignment
    
    if team_members and len(team_members) > 0:
        # Group project - use team members (admin already included by frontend)
        team_context = "\n\n=== TEAM ROSTER (USE ONLY THESE NAMES) ===\n"
        
        # Process all team members (frontend already includes admin)
        for member in team_members:
            member_name = member.get('name', '')
            member_role = member.get('role', 'Developer')
            if member_name and member_name != 'Unassigned' and member_name not in member_names:
                member_names.append(member_name)
                member_roles[member_name] = member_role
                team_context += f"- {member_name} (Role: {member_role})\n"
        
        team_context += f"\n=== MANDATORY ASSIGNMENT RULES ===\n"
        team_context += f"1. ONLY use these names: {', '.join(member_names)}\n"
        team_context += f"2. DO NOT use: Alice, Bob, Carol, User, Admin, or any generic names\n"
        team_context += f"3. EVERY task MUST have assigned_user from the list above\n"
        team_context += f"4. Match task types to member roles\n"
        team_context += f"5. Distribute evenly across: {', '.join(member_names)}\n"
        print(f"✅ Valid team members: {member_names}")
        print(f"📋 Member roles: {member_roles}")
    elif current_user and current_user.get('username'):
        # Individual project - assign all to current user
        current_username = current_user.get('username')
        member_names = [current_username]
        team_context = f"\n\nAssign ALL tasks to: {current_username} (individual project)"
        print(f"👤 Individual project - assigning to: {current_username}")
    
    # Generate tasks with STRICT naming requirements and sequential workflow
    prompt = f"""Generate a detailed project plan with tasks as a JSON array of objects. The project is about: {base_description}.
The project plan must contain between 25 and 35 tasks.
Each task object should have the following fields: "title", "priority", "estimatedDuration", "type", and "assigned_user".
Assign tasks to the following team members: {', '.join(member_names) if member_names else 'Unassigned'}.
Ensure the tasks are in a logical sequence.
This is an AI-generated draft; review and refine task details and assignments for accuracy.
Return ONLY the JSON array with no markdown formatting."""
    
    print(f"🤖 Calling Gemini API to generate tasks...\n")
    
    result, error = call_gemini(prompt)
    if error:
        return jsonify({"error": error}), 500
    
    try:
        # Clean the result to get a valid JSON
        json_str = re.search(r'\[.*\]', result, re.DOTALL).group(0)
        tasks_data = json.loads(json_str)
        tasks_data = tasks_data[:35]  # Hard limit to 35 tasks
    except (json.JSONDecodeError, AttributeError):
        return jsonify({"error": "Failed to parse AI response. Please try again."}), 500

    print(f"✅ Received {len(tasks_data)} tasks from AI")
    print(f"👥 Team roster for assignment: {member_names} (total: {len(member_names)} members)")
    
    # Process tasks with enhanced details
    tasks = []
    assignments = {member_name: 0 for member_name in member_names}
    for idx, t in enumerate(tasks_data):
        # Parse duration
        duration = t.get("estimatedDuration", "3 hours")
        hours = 3
        if isinstance(duration, str):
            if "hour" in duration:
                hours = int(re.search(r'\d+', duration).group()) if re.search(r'\d+', duration) else 3
            elif "day" in duration:
                hours = int(re.search(r'\d+', duration).group()) * 8 if re.search(r'\d+', duration) else 24
            elif "week" in duration:
                hours = int(re.search(r'\d+', duration).group()) * 40 if re.search(r'\d+', duration) else 40
        elif isinstance(duration, (int, float)):
            hours = duration
        
        # Get task type from AI (now using "type" field)
        task_type = t.get("type", t.get("task_type", "backend"))
        # Capitalize first letter for consistency
        task_type = task_type.capitalize() if task_type else "Backend"
        
        # Assign user using the new role-based logic
        assigned_user = assign_user(t, member_names, member_roles, assignments)
        if assigned_user in assignments:
            assignments[assigned_user] += 1
        
        tasks.append({
            "sequence": idx + 1,  # Add sequence number for ordering
            "title": t.get("title", "Untitled Task"),
            "description": "",
            "status": "to-do",
            "priority": t.get("priority", "medium").lower(),
            "assignedTo": assigned_user,
            "assigned_user": assigned_user,
            "task_type": task_type,
            "acceptance_criteria": [],
            "dependencies": [],
            "estimatedDuration": hours,
            "actualDuration": 0,
            "comments": []
        })
        print(f"  ✅ Task #{idx+1} (seq={idx+1}): {t.get('title', '')[:40]}... → {assigned_user}")
    
    # Debug: Print final task order before returning
    print("\n📤 FINAL TASK ORDER BEING RETURNED:")
    for i, task in enumerate(tasks, 1):
        print(f"  #{i}: {task['title'][:50]} | {task['task_type']} | → {task['assignedTo']}")
    print()
    
    return jsonify({"tasks": tasks}), 200

@app.route("/api/projects", methods=["GET", "POST"])
def projects():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    # GET - Get all projects for a specific user
    if request.method == "GET":
        try:
            user_id = request.args.get("userId")
            if not user_id:
                return jsonify({"error": "userId parameter is required"}), 400
            
            # Check if we only need metadata (no tasks)
            include_tasks = request.args.get("includeTasks", "false").lower() == "true"
            limit = int(request.args.get("limit", 20))
            
            projects = []
            project_ids_seen = set()
            
            # Step 1: Get projects created by this user (with limit)
            try:
                projects_ref = db.collection("projects").where(filter=firestore.FieldFilter("userId", "==", user_id)).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
                
                for doc in projects_ref.stream():
                    project = doc.to_dict()
                    project["id"] = doc.id
                    project_ids_seen.add(doc.id)
                    
                    # Only load tasks if explicitly requested
                    if include_tasks:
                        tasks = []
                        tasks_ref = doc.reference.collection("tasks").limit(100)
                        for task_doc in tasks_ref.stream():
                            task = task_doc.to_dict()
                            task["id"] = task_doc.id
                            tasks.append(task)
                        tasks.sort(key=lambda t: t.get("sequence", 999))
                        project["tasks"] = tasks
                    else:
                        # Just include task count for metadata view
                        task_count = len(list(doc.reference.collection("tasks").limit(1).stream()))
                        project["taskCount"] = task_count if task_count > 0 else 0
                        project["tasks"] = []  # Empty array for consistency
                    
                    projects.append(project)
            except Exception as index_error:
                # Fallback if composite index doesn't exist
                print(f"⚠️ Composite index error, using simple filter: {index_error}")
                projects_ref = db.collection("projects").where(filter=firestore.FieldFilter("userId", "==", user_id)).limit(limit)
                
                for doc in projects_ref.stream():
                    project = doc.to_dict()
                    project["id"] = doc.id
                    project_ids_seen.add(doc.id)
                    
                    if include_tasks:
                        tasks = []
                        tasks_ref = doc.reference.collection("tasks").limit(100)
                        for task_doc in tasks_ref.stream():
                            task = task_doc.to_dict()
                            task["id"] = task_doc.id
                            tasks.append(task)
                        tasks.sort(key=lambda t: t.get("sequence", 999))
                        project["tasks"] = tasks
                    else:
                        project["taskCount"] = 0
                        project["tasks"] = []
                    
                    projects.append(project)
            
            # Step 2: Get group projects only if requested
            if request.args.get("includeGroupProjects", "true").lower() == "true":
                # Get groups where user is a member (optimized)
                user_group_ids = []
                
                # Query groups where user is admin
                admin_groups = db.collection("groups").where(filter=firestore.FieldFilter("adminId", "==", user_id)).limit(10).stream()
                for group_doc in admin_groups:
                    user_group_ids.append(group_doc.id)
                
                # Get projects for those groups (limited)
                if user_group_ids:
                    for group_id in user_group_ids[:5]:  # Limit to 5 groups max
                        group_projects_ref = db.collection("projects").where(filter=firestore.FieldFilter("groupId", "==", group_id)).limit(10)
                        for doc in group_projects_ref.stream():
                            if doc.id in project_ids_seen:
                                continue
                            
                            project = doc.to_dict()
                            project["id"] = doc.id
                            project_ids_seen.add(doc.id)
                            
                            if include_tasks:
                                tasks = []
                                tasks_ref = doc.reference.collection("tasks").limit(100)
                                for task_doc in tasks_ref.stream():
                                    task = task_doc.to_dict()
                                    task["id"] = task_doc.id
                                    tasks.append(task)
                                tasks.sort(key=lambda t: t.get("sequence", 999))
                                project["tasks"] = tasks
                            else:
                                project["taskCount"] = 0
                                project["tasks"] = []
                            
                            projects.append(project)
            
            # Sort by createdAt
            projects.sort(key=lambda p: p.get("createdAt", 0), reverse=True)
            
            return jsonify({"projects": projects}), 200
        except Exception as e:
            print(f"❌ Error loading projects: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    # POST - Save new project
    if request.method == "POST":
        try:
            data = request.json
            user_id = data.get("userId")
            if not user_id:
                return jsonify({"error": "userId is required"}), 400
            
            project_ref = db.collection("projects").document()
            project_data = {
                "id": project_ref.id,
                "userId": user_id,
                "groupId": data.get("groupId"),  # Store groupId if project is for a group
                "title": data.get("title"),
                "description": data.get("description"),
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            project_ref.set(project_data)
            
            # Save tasks as subcollection
            tasks = data.get("tasks", [])
            for task in tasks:
                task_ref = project_ref.collection("tasks").document()
                task["id"] = task_ref.id
                task_ref.set(task)
            
            return jsonify({"success": True, "projectId": project_ref.id}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# Get single project
@app.route("/api/projects/<project_id>", methods=["GET"])
def get_project(project_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        project_ref = db.collection("projects").document(project_id)
        project_doc = project_ref.get()
        
        if not project_doc.exists:
            return jsonify({"error": "Project not found"}), 404
        
        project = project_doc.to_dict()
        project["id"] = project_doc.id
        
        # Get tasks with limit and sort
        tasks = []
        tasks_ref = project_ref.collection("tasks").limit(100)
        for task_doc in tasks_ref.stream():
            task = task_doc.to_dict()
            task["id"] = task_doc.id
            tasks.append(task)
        
        # Sort by sequence number
        tasks.sort(key=lambda t: t.get("sequence", 999))
        project["tasks"] = tasks
        return jsonify(project), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete project
@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        project_ref = db.collection("projects").document(project_id)
        tasks_ref = project_ref.collection("tasks")

        # Delete subcollection in batches.
        # This is more efficient than one-by-one deletion.
        while True:
            docs = tasks_ref.limit(100).stream() # 100 is a reasonable batch size
            
            # Break if no documents found
            doc_list = list(docs)
            if not doc_list:
                break

            batch = db.batch()
            for doc in doc_list:
                batch.delete(doc.reference)
            
            batch.commit()
            print(f"Deleted a batch of {len(doc_list)} tasks.")

        # Delete the project document itself
        project_ref.delete()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get or add tasks for a project
@app.route("/api/projects/<project_id>/tasks", methods=["GET", "POST"])
def project_tasks(project_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500

    if request.method == "GET":
        try:
            project_ref = db.collection("projects").document(project_id)
            
            tasks = []
            tasks_ref = project_ref.collection("tasks")
            for task_doc in tasks_ref.stream():
                task = task_doc.to_dict()
                task["id"] = task_doc.id
                tasks.append(task)
            
            tasks.sort(key=lambda t: t.get("sequence", 999))
            
            return jsonify({"tasks": tasks}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    if request.method == "POST":
        try:
            data = request.json
            
            project_ref = db.collection("projects").document(project_id)
            project_doc = project_ref.get()
            
            if not project_doc.exists:
                return jsonify({"error": "Project not found"}), 404
            
            task_ref = project_ref.collection("tasks").document()
            task_data = {
                "id": task_ref.id,
                "title": data.get("title"),
                "description": data.get("description", ""),
                "priority": data.get("priority", "Medium"),
                "status": data.get("status", "todo"),
                "assignedTo": data.get("assignedTo", "Unassigned"),
                "due": data.get("due", ""),
                "task_type": data.get("task_type", "Feature"),
                "acceptance_criteria": data.get("acceptance_criteria", []),
                "dependencies": data.get("dependencies", [])
            }
            task_ref.set(task_data)
            
            return jsonify({"success": True, "taskId": task_ref.id}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ============================================ 
# GROUP MANAGEMENT ENDPOINTS
# ============================================ 

# Create a new group
@app.route("/api/groups", methods=["POST"])
def create_group():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        group_data = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "adminId": data.get("adminId"),
            "adminEmail": data.get("adminEmail"),
            "adminName": data.get("adminName", ""),
            "adminRole": data.get("adminRole", "Software Engineer"),  # Default role for admin
            "createdAt": firestore.SERVER_TIMESTAMP,
            "members": []
        }
        
        group_ref = db.collection("groups").document()
        group_ref.set(group_data)
        
        group_data["id"] = group_ref.id
        group_data["createdAt"] = time.time()
        
        return jsonify({"group": group_data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all groups for a user
@app.route("/api/groups/user/<user_id>", methods=["GET"])
def get_user_groups(user_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        limit = int(request.args.get("limit", 20))  # Limit groups returned
        
        # Get groups where user is admin
        groups_ref = db.collection("groups")
        admin_groups = groups_ref.where(filter=firestore.FieldFilter("adminId", "==", user_id)).limit(limit).stream()
        
        groups = []
        group_ids_seen = set()
        
        for doc in admin_groups:
            group = doc.to_dict()
            group["id"] = doc.id
            group_ids_seen.add(doc.id)
            groups.append(group)
        
        # Get groups where user is a member (limit to avoid scanning all groups)
        # This is less efficient, but we limit the scan
        all_groups = db.collection("groups").limit(100).stream()
        for doc in all_groups:
            if doc.id in group_ids_seen:
                continue
            
            group = doc.to_dict()
            members = group.get("members", [])
            for member in members:
                if member.get("userId") == user_id:
                    group["id"] = doc.id
                    group["isMember"] = True
                    groups.append(group)
                    group_ids_seen.add(doc.id)
                    break
            
            if len(groups) >= limit:
                break
        
        # Batch fetch user names for all members across all groups
        user_ids_to_fetch = set()
        for group in groups:
            members = group.get("members", [])
            for member in members:
                if member.get("userId") and (not member.get("name") or member.get("name") == "Unassigned"):
                    user_ids_to_fetch.add(member.get("userId"))
        
        # Fetch all user names in batch
        user_names = {}
        if user_ids_to_fetch:
            users_ref = db.collection("users")
            for uid in user_ids_to_fetch:
                try:
                    user_doc = users_ref.document(uid).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        user_names[uid] = user_data.get("username") or user_data.get("email") or uid
                except Exception as e:
                    print(f"Error fetching user {uid}: {e}")
                    user_names[uid] = uid
        
        # Update member names in groups
        for group in groups:
            members = group.get("members", [])
            for member in members:
                uid = member.get("userId")
                if uid in user_names:
                    member["name"] = user_names[uid]
        
        return jsonify({"groups": groups}), 200
    except Exception as e:
        print(f"Error loading groups: {e}")
        return jsonify({"error": str(e)}), 500

# Add member to group
@app.route("/api/groups/<group_id>/members", methods=["POST"])
def add_member(group_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        group_ref = db.collection("groups").document(group_id)
        group_doc = group_ref.get()
        
        if not group_doc.exists:
            return jsonify({"error": "Group not found"}), 404
        
        # Check if user is already a member
        group_data = group_doc.to_dict()
        members = group_data.get("members", [])
        
        if any(m.get("userId") == data.get("userId") for m in members):
            return jsonify({"error": "User is already a member"}), 400
        
        # Add new member
        new_member = {
            "id": str(int(time.time() * 1000)),
            "userId": data.get("userId"),
            "name": data.get("name", ""),
            "role": data.get("role"),
            "addedAt": time.time(),
            "addedBy": data.get("addedBy")
        }
        
        members.append(new_member)
        group_ref.update({"members": members})
        
        group_data["members"] = members
        group_data["id"] = group_id
        
        return jsonify({"group": group_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Remove member from group
@app.route("/api/groups/<group_id>/members/<member_id>", methods=["DELETE"])
def remove_member(group_id, member_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        group_ref = db.collection("groups").document(group_id)
        group_doc = group_ref.get()
        
        if not group_doc.exists:
            return jsonify({"error": "Group not found"}), 404
        
        group_data = group_doc.to_dict()
        members = group_data.get("members", [])
        
        # Remove member
        members = [m for m in members if m.get("id") != member_id]
        
        group_ref.update({"members": members})
        
        group_data["members"] = members
        group_data["id"] = group_id
        
        return jsonify({"group": group_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete group
@app.route("/api/groups/<group_id>", methods=["DELETE"])
def delete_group(group_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        group_ref = db.collection("groups").document(group_id)
        group_doc = group_ref.get()
        
        if not group_doc.exists:
            return jsonify({"error": "Group not found"}), 404
        
        group_ref.delete()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update member role in a group
@app.route("/api/groups/<group_id>/members/<member_id>", methods=["PATCH"])
def update_member_role(group_id, member_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    try:
        data = request.json
        new_role = data.get("role")
        if not new_role:
            return jsonify({"error": "New role is required"}), 400

        group_ref = db.collection("groups").document(group_id)
        group_doc = group_ref.get()

        if not group_doc.exists:
            return jsonify({"error": "Group not found"}), 404

        group_data = group_doc.to_dict()
        members = group_data.get("members", [])
        
        member_found = False
        for member in members:
            if member.get("id") == member_id:
                member["role"] = new_role
                member_found = True
                break
        
        if not member_found:
            return jsonify({"error": "Member not found"}), 404
            
        group_ref.update({"members": members})
        
        # Return the updated group data
        updated_group_doc = group_ref.get()
        updated_group_data = updated_group_doc.to_dict()
        updated_group_data["id"] = updated_group_doc.id

        return jsonify({"group": updated_group_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update admin role in a group
@app.route("/api/groups/<group_id>/admin-role", methods=["PUT"])
def update_admin_role(group_id):
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    try:
        data = request.json
        new_role = data.get("adminRole")
        if not new_role:
            return jsonify({"error": "New adminRole is required"}), 400

        group_ref = db.collection("groups").document(group_id)
        group_doc = group_ref.get()

        if not group_doc.exists:
            return jsonify({"error": "Group not found"}), 404

        group_ref.update({"adminRole": new_role})
        
        # Return the updated group data
        updated_group_doc = group_ref.get()
        updated_group_data = updated_group_doc.to_dict()
        updated_group_data["id"] = updated_group_doc.id

        return jsonify({"group": updated_group_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# ============================================ 
# CONTACT FORM ENDPOINT
# ============================================ 
@app.route("/api/contact", methods=["POST", "OPTIONS"])
@cross_origin()
def contact_form():
    if not db:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        data = request.json
        name = data.get("name")
        email = data.get("email")
        message = data.get("message")

        if not all([name, email, message]):
            return jsonify({"error": "Name, email, and message are required."}), 400

        contact_ref = db.collection("contacts").document()
        contact_ref.set({
            "name": name,
            "email": email,
            "message": message,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "read": False # To track if the message has been read
        })
        
        return jsonify({"success": True, "message": "Message received!"}), 201
    except Exception as e:
        print(f"❌ Contact form error: {e}")
        return jsonify({"error": "An internal error occurred."}), 500


if __name__ == "__main__":
    print("✓ Starting Smart Scheduler API")
    app.run(debug=False, port=5000, host="0.0.0.0")