# defects/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField, Q
from django.db.models.functions import TruncDay, TruncMonth
from django.utils.timezone import now
from datetime import timedelta, datetime
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from defects.models import BugReport, Project
from defects.serializers import UserSerializer, RegisterSerializer, ProjectSerializer, BugReportSerializer

import os
import csv
import io
import uuid
import json
import numpy as np
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# ML Imports
from defects.ml.distilbert_predict import predict_bug
from defects.ml.severity import predict_severity
from defects.ml.embedding_utils import get_embedding
from defects.ml.explainability import explain_confidence
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize


# ==================================================
# PRIORITY DETERMINATION BASED ON SEVERITY AND CATEGORY
# ==================================================

def determine_priority(severity, category):
    severity = severity.upper() if severity else "MEDIUM"
    category = category.lower() if category else "general"
    
    priority_matrix = {
        ('CRITICAL', 'security'): 'critical',
        ('CRITICAL', 'crash'): 'critical',
        ('CRITICAL', 'data_loss'): 'critical',
        ('CRITICAL', 'authentication'): 'critical',
        ('CRITICAL', 'payment'): 'critical',
        ('CRITICAL', '*'): 'critical',
        
        ('HIGH', 'security'): 'critical',
        ('HIGH', 'authentication'): 'critical',
        ('HIGH', 'crash'): 'critical',
        ('HIGH', 'data_loss'): 'critical',
        ('HIGH', 'payment'): 'critical',
        ('HIGH', 'database'): 'high',
        ('HIGH', 'api'): 'high',
        ('HIGH', 'performance'): 'high',
        ('HIGH', 'memory'): 'high',
        ('HIGH', 'concurrency'): 'high',
        ('HIGH', '*'): 'high',
        
        ('MEDIUM', 'security'): 'high',
        ('MEDIUM', 'authentication'): 'high',
        ('MEDIUM', 'database'): 'medium',
        ('MEDIUM', 'api'): 'medium',
        ('MEDIUM', 'performance'): 'medium',
        ('MEDIUM', 'ui'): 'medium',
        ('MEDIUM', '*'): 'medium',
        
        ('LOW', 'security'): 'medium',
        ('LOW', 'authentication'): 'medium',
        ('LOW', 'ui'): 'low',
        ('LOW', 'cosmetic'): 'low',
        ('LOW', 'typo'): 'low',
        ('LOW', '*'): 'low',
    }
    
    key = (severity, category)
    if key in priority_matrix:
        return priority_matrix[key]
    
    wildcard_key = (severity, '*')
    if wildcard_key in priority_matrix:
        return priority_matrix[wildcard_key]
    
    severity_priority = {
        'CRITICAL': 'critical',
        'HIGH': 'high',
        'MEDIUM': 'medium',
        'LOW': 'low'
    }
    
    return severity_priority.get(severity, 'medium')


def get_priority_reason(priority, severity, category):
    reasons = {
        'critical': f"Critical priority due to {severity.lower()} severity and {category} category - requires immediate attention",
        'high': f"High priority based on {severity.lower()} severity in {category} area - address soon",
        'medium': f"Medium priority - standard {severity.lower()} severity issue in {category}",
        'low': f"Low priority - {severity.lower()} impact {category} issue, can be addressed in regular cycle"
    }
    
    return reasons.get(priority, f"Priority set to {priority} based on severity and category")


# ==================================================
# IMPROVED DUPLICATE DETECTION ENGINE (USING OLD LOGIC)
# ==================================================

def find_duplicate_bug(description, project, threshold=0.7):
    """Find duplicate bugs using cosine similarity on embeddings - Enhanced version"""
    try:
        # Get embedding for new description
        new_embedding = get_embedding(description)
        if new_embedding is None:
            print("Failed to generate embedding for new description")
            return False, None, 0.0
        
        # Convert list to numpy array and normalize
        new_vec = normalize(np.array(new_embedding).reshape(1, -1))
        best_score = 0.0
        best_bug = None

        # Get all bugs for this project (excluding resolved/closed if needed)
        bugs = BugReport.objects.filter(project=project).exclude(
            status__in=['resolved', 'closed']
        )
        print(f"Total active bugs in project: {bugs.count()}")
        
        for bug in bugs:
            if not bug.embedding:
                print(f"BUG-{bug.id} has no embedding, skipping...")
                continue

            try:
                # Convert stored list back to numpy array
                stored_vec = normalize(np.array(bug.embedding).reshape(1, -1))
                score = float(cosine_similarity(new_vec, stored_vec)[0][0])
                
                print(f"Similarity with BUG-{bug.id}: {score}")

                if score > best_score:
                    best_score = score
                    best_bug = bug
            except Exception as e:
                print(f"Error comparing with BUG-{bug.id}: {str(e)}")
                continue

        print(f"Best similarity score: {best_score}, Threshold: {threshold}")
        
        if best_score >= threshold and best_bug:
            return True, best_bug.id, round(best_score, 3)

        return False, None, round(best_score, 3)
        
    except Exception as e:
        print(f"Error in duplicate detection: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None, 0.0


# ==================================================
# HELPER FUNCTIONS FOR AI ANALYSIS
# ==================================================

def get_confidence_level(confidence):
    if confidence >= 0.8:
        return "High"
    elif confidence >= 0.6:
        return "Medium"
    else:
        return "Low"


def extract_keywords(description, max_keywords=5):
    common_keywords = [
        'crash', 'error', 'exception', 'null', 'timeout', 'freeze',
        'authentication', 'login', 'database', 'api', 'performance',
        'slow', 'security', 'breach', 'data', 'loss', 'corruption',
        'memory', 'leak', 'overflow', 'infinite', 'loop', 'deadlock',
        'race', 'condition', 'concurrency', 'thread', 'sync',
        'validation', 'input', 'output', 'format', 'parsing',
        'connection', 'hang', 'unresponsive', 'broken', 'missing',
        'incorrect', 'wrong', 'failed', 'failure', 'permission',
        'payment', 'checkout', 'order', 'transaction', 'billing'
    ]
    
    description_lower = description.lower()
    found_keywords = []
    
    for keyword in common_keywords:
        if keyword in description_lower:
            found_keywords.append(keyword)
            if len(found_keywords) >= max_keywords:
                break
    
    return found_keywords


def extract_root_cause(description, category):
    root_cause_templates = {
        'authentication': (
            "Potential issue with authentication flow or session management. "
            "Check for missing token validation, expired sessions, or incorrect "
            "credential handling."
        ),
        'performance': (
            "Possible performance bottleneck or resource exhaustion. "
            "Review database queries, API calls, memory usage, and CPU utilization. "
            "Look for N+1 queries or inefficient algorithms."
        ),
        'crash': (
            "Likely null pointer exception, unhandled edge case, or memory issue. "
            "Add defensive programming, null checks, and proper error handling. "
            "Review stack traces for the exact failure point."
        ),
        'security': (
            "Potential security vulnerability in input validation, access control, "
            "or data encryption. Review authentication logic, authorization checks, "
            "and sanitization of user inputs."
        ),
        'ui': (
            "UI rendering issue or incorrect state management. "
            "Check component lifecycle, state updates, and event handlers. "
            "Verify responsive design and cross-browser compatibility."
        ),
        'database': (
            "Database query optimization or connection pool issue. "
            "Review indexes, query execution plans, and connection management. "
            "Check for long-running transactions or deadlocks."
        ),
        'api': (
            "API endpoint misconfiguration or data format issue. "
            "Validate request/response schemas, check status codes, and "
            "verify error handling. Review API versioning and backward compatibility."
        ),
        'memory': (
            "Memory leak or inefficient resource management. "
            "Check object disposal, garbage collection, and caching strategies. "
            "Monitor memory usage over time for patterns."
        ),
        'concurrency': (
            "Race condition or thread synchronization issue. "
            "Review locking mechanisms, thread safety, and shared resource access. "
            "Look for deadlocks or inconsistent state in concurrent operations."
        )
    }
    
    category_lower = category.lower()
    for key, template in root_cause_templates.items():
        if key in category_lower:
            return template
    
    return (
        "Root cause analysis requires further investigation. "
        "Check logs, stack traces, and reproduction steps for more details."
    )


def suggest_fix(category, severity):
    suggestions = {
        'authentication': """1. Review authentication middleware configuration
2. Check session timeout and renewal settings
3. Validate token generation and refresh mechanisms
4. Add comprehensive error handling for auth failures
5. Implement proper logout and session cleanup
6. Test with multiple concurrent users and sessions""",
        
        'performance': """1. Profile code to identify bottlenecks
2. Implement caching for frequently accessed data
3. Optimize database queries (add indexes, reduce N+1)
4. Consider async operations for non-critical tasks
5. Review algorithm complexity and data structures
6. Add performance monitoring and alerting""",
        
        'crash': """1. Add null checks before object access
2. Implement try-catch blocks around risky operations
3. Review error handling logic and fallbacks
4. Add comprehensive logging for debugging
5. Test edge cases and boundary conditions
6. Implement graceful degradation""",
        
        'security': """1. Validate and sanitize all user inputs
2. Implement proper access controls and permissions
3. Review encryption standards for data at rest/transit
4. Conduct security audit and penetration testing
5. Add rate limiting for API endpoints
6. Implement security headers (CORS, CSP, etc.)""",
        
        'ui': """1. Check component state management
2. Verify event handlers and callbacks
3. Test across different browsers and devices
4. Review responsive design breakpoints
5. Check for memory leaks in event listeners
6. Optimize re-renders and virtual DOM usage""",
        
        'database': """1. Optimize slow queries with EXPLAIN analysis
2. Check connection pool size and timeout settings
3. Implement proper indexing strategy
4. Review transaction isolation levels
5. Add query monitoring and slow query logs
6. Consider read replicas for scaling""",
        
        'api': """1. Validate API request/response formats
2. Check endpoint configurations and routing
3. Implement rate limiting per user/IP
4. Add comprehensive error responses
5. Version your APIs for backward compatibility
6. Add request/response logging"""
    }
    
    category_lower = category.lower()
    for key, suggestion in suggestions.items():
        if key in category_lower:
            return suggestion
    
    return """1. Review code and identify the root cause
2. Add comprehensive logging for debugging
3. Write unit tests to cover the scenario
4. Test in staging environment first
5. Get code review from peers
6. Monitor after deployment"""


def assess_risk(severity, description):
    risk_keywords = {
        'high': [
            'crash', 'data loss', 'security', 'breach', 'all users', 
            'production', 'down', 'outage', 'corruption', 'financial',
            'payment', 'personal data', 'credentials', 'privilege escalation'
        ],
        'medium': [
            'performance', 'slow', 'error', 'some users', 'intermittent',
            'occasional', 'specific', 'limited', 'partial', 'degraded'
        ],
        'low': [
            'cosmetic', 'typo', 'minor', 'rare', 'edge case', 'visual',
            'styling', 'formatting', 'spacing', 'alignment', 'rarely'
        ]
    }
    
    severity_upper = severity.upper()
    if severity_upper in ['CRITICAL', 'HIGH']:
        base_risk = "High"
        base_score = 3
    elif severity_upper == 'MEDIUM':
        base_risk = "Medium"
        base_score = 2
    else:
        base_risk = "Low"
        base_score = 1
    
    description_lower = description.lower()
    risk_factors = []
    risk_score = base_score
    
    for risk_level, keywords in risk_keywords.items():
        for keyword in keywords:
            if keyword in description_lower:
                risk_factors.append(keyword)
                if risk_level == 'high':
                    risk_score += 1
                elif risk_level == 'medium':
                    risk_score += 0.5
                if len(risk_factors) >= 3:
                    break
        if len(risk_factors) >= 3:
            break
    
    if risk_score >= 4:
        final_risk = "Critical"
    elif risk_score >= 3:
        final_risk = "High"
    elif risk_score >= 2:
        final_risk = "Medium"
    else:
        final_risk = "Low"
    
    if risk_factors:
        return (
            f"{final_risk} Risk - Based on {base_risk.lower()} severity "
            f"and risk indicators: {', '.join(risk_factors)}. "
            f"Priority attention recommended."
        )
    else:
        return (
            f"{final_risk} Risk - Based on {base_risk.lower()} severity level. "
            f"Standard resolution process applies."
        )


# ==================================================
# ML ACCURACY IMPROVEMENT FUNCTIONS
# ==================================================

def ensemble_prediction(description):
    """
    Use ensemble method to improve prediction accuracy
    Combines multiple models or techniques for better confidence
    """
    try:
        # Get primary prediction
        category, confidence = predict_bug(description)
        
        # Keyword-based reinforcement
        keywords = extract_keywords(description)
        keyword_boost = 0.0
        
        # Category-specific keyword boosting
        category_keywords = {
            'authentication': ['login', 'auth', 'password', 'session', 'token', 'credential'],
            'performance': ['slow', 'performance', 'lag', 'response time', 'throughput'],
            'crash': ['crash', 'freeze', 'hang', 'unresponsive', 'deadlock'],
            'security': ['security', 'vulnerability', 'exploit', 'breach', 'permission'],
            'ui': ['ui', 'ux', 'interface', 'display', 'render', 'visual'],
            'database': ['database', 'db', 'query', 'sql', 'connection', 'pool'],
            'api': ['api', 'endpoint', 'rest', 'graphql', 'request', 'response'],
            'memory': ['memory', 'leak', 'overflow', 'allocation', 'heap'],
            'concurrency': ['concurrent', 'parallel', 'thread', 'race', 'deadlock']
        }
        
        # Check if keywords match predicted category
        if category in category_keywords:
            matching_keywords = [k for k in keywords if k in category_keywords[category]]
            if matching_keywords:
                keyword_boost = min(0.15, len(matching_keywords) * 0.05)  # Max 15% boost
        
        # Length-based confidence adjustment
        length = len(description.split())
        length_boost = 0.0
        if length >= 20:
            length_boost = 0.1  # Longer descriptions get 10% boost
        elif length >= 10:
            length_boost = 0.05  # Medium descriptions get 5% boost
        
        # Calculate final confidence with boost but cap at 0.95
        final_confidence = min(confidence + keyword_boost + length_boost, 0.95)
        
        return category, final_confidence
        
    except Exception as e:
        print(f"Error in ensemble prediction: {e}")
        return predict_bug(description)  # Fallback to original


# ---------------- AUTH ----------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_detail(request):
    """
    Get details of the currently authenticated user
    """
    try:
        user = request.user
        
        # Try to get profile if it exists
        profile_data = {}
        try:
            if hasattr(user, 'profile'):
                profile_data = {
                    "full_name": user.profile.full_name,
                    "organization": user.profile.organization,
                }
        except:
            pass  # Profile doesn't exist
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_active": user.is_active,
            **profile_data  # Add profile data if available
        }
        
        return Response(user_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(["POST"])
def register_user(request):
    try:
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- PROJECTS ----------------
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def project_list(request):
    try:
        if request.method == "GET":
            projects = Project.objects.filter(owner=request.user)
            serializer = ProjectSerializer(projects, many=True)
            return Response(serializer.data)

        data = request.data.copy()
        
        serializer = ProjectSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    try:
        if isinstance(pk, str) and pk.startswith("PROJ-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response({"error": "Invalid project ID format"}, status=status.HTTP_400_BAD_REQUEST)
        
        project = get_object_or_404(Project, id=pk, owner=request.user)

        if request.method == "GET":
            serializer = ProjectSerializer(project)
            return Response(serializer.data)

        if request.method == "PUT":
            data = request.data.copy()
            
            serializer = ProjectSerializer(project, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if request.method == "DELETE":
            project.delete()
            return Response({"message": "Project deleted"}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- EXPORT PROJECT CSV ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_project(request, pk):
    try:
        if isinstance(pk, str) and pk.startswith("PROJ-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response(
                    {"error": "Invalid project ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        project = get_object_or_404(Project, id=pk, owner=request.user)
        bugs = BugReport.objects.filter(project=project).order_by('-created_at')
        
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        
        writer.writerow([
            'Bug ID',
            'Title',
            'Description',
            'Category',
            'Status',
            'Priority',
            'Predicted Severity',
            'Confidence Score',
            'Tags',
            'Steps to Reproduce',
            'Created At',
            'Updated At',
            'Resolved At',
            'Project ID',
            'Project Name'
        ])
        
        for bug in bugs:
            if bug.steps_to_reproduce and isinstance(bug.steps_to_reproduce, list):
                steps = '; '.join([str(step) for step in bug.steps_to_reproduce])
            else:
                steps = ''
            
            if bug.tags and isinstance(bug.tags, list):
                tags = ', '.join([str(tag) for tag in bug.tags])
            else:
                tags = ''
            
            description = ' '.join(bug.description.split()) if bug.description else ''
            
            writer.writerow([
                f'BUG-{bug.id}',
                bug.title,
                description,
                bug.predicted_category or 'N/A',
                bug.status,
                bug.priority,
                bug.predicted_severity or 'N/A',
                bug.confidence_score or 'N/A',
                tags,
                steps,
                bug.created_at.strftime('%Y-%m-%d %H:%M:%S') if bug.created_at else '',
                bug.updated_at.strftime('%Y-%m-%d %H:%M:%S') if bug.updated_at else '',
                bug.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if bug.resolved_at else '',
                f'PROJ-{project.id}',
                project.name
            ])
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        safe_project_name = "".join(c for c in project.name if c.isalnum() or c in ' _-').strip()
        filename = f"project_{project.id}_{safe_project_name}_{timestamp}_{unique_id}.csv"
        
        exports_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
        os.makedirs(exports_dir, exist_ok=True)
        
        file_path = f'exports/{filename}'
        saved_path = default_storage.save(file_path, ContentFile(csv_buffer.getvalue().encode('utf-8')))
        
        file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)
        
        return Response({
            'message': 'Export generated successfully',
            'file_url': file_url,
            'filename': filename,
            'project_id': f'PROJ-{project.id}',
            'project_name': project.name,
            'total_bugs': bugs.count(),
            'generated_at': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- ADD BUG WITH ML INTEGRATION ----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_bug(request):
    try:
        title = request.data.get("title")
        description = request.data.get("description")
        project_id = request.data.get("project")
        status_val = request.data.get("status", "open")
        tags = request.data.get("tags", [])
        steps_to_reproduce = request.data.get("stepsToReproduce", [])

        if not title or not description:
            return Response(
                {"error": "Title and description are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if project_id:
            if isinstance(project_id, str) and project_id.startswith("PROJ-"):
                try:
                    project_id = int(project_id.split("-")[1])
                except (IndexError, ValueError):
                    return Response(
                        {"error": "Invalid project ID format"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        else:
            return Response(
                {"error": "Project is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        project = get_object_or_404(Project, id=project_id, owner=request.user)

        # Generate embedding for duplicate detection
        embedding = get_embedding(description)

        # Check for duplicates using improved OLD logic
        is_duplicate = False
        duplicate_info = None
        similar_bugs = []
        similarity_score = 0.0
        best_bug = None
        
        if embedding is not None:
            # Use the improved duplicate detection from OLD logic
            is_duplicate, bug_id, similarity_score = find_duplicate_bug(description, project)
            
            if is_duplicate and bug_id:
                best_bug = BugReport.objects.get(id=bug_id)
                similar_bugs = [f"BUG-{best_bug.id}"]
                
                duplicate_info = {
                    "is_duplicate": True,
                    "similar_bug_id": f"BUG-{best_bug.id}",
                    "similar_bug_title": best_bug.title,
                    "similar_bug_description": best_bug.description[:200] + "..." if len(best_bug.description) > 200 else best_bug.description,
                    "similar_bug_status": best_bug.status,
                    "similar_bug_priority": best_bug.priority,
                    "similar_bug_severity": best_bug.predicted_severity,
                    "similarity_score": round(similarity_score, 3),
                    "similarity_percentage": round(similarity_score * 100, 1),
                    "message": f"Cannot create bug. It is {round(similarity_score*100, 1)}% similar to existing bug BUG-{best_bug.id}"
                }
                
                return Response({
                    "error": "Duplicate bug detected",
                    "duplicate": duplicate_info,
                    "message": f"Cannot create bug. It is {round(similarity_score*100, 1)}% similar to existing bug {duplicate_info['similar_bug_id']}: '{best_bug.title}'"
                }, status=status.HTTP_409_CONFLICT)

        # Use ensemble prediction for better accuracy
        category, confidence = ensemble_prediction(description)
        
        # Predict severity
        severity = predict_severity(description, category)
        
        # Map severity
        severity_mapping = {
            'critical': 'CRITICAL',
            'high': 'HIGH', 
            'medium': 'MEDIUM',
            'low': 'LOW'
        }
        mapped_severity = severity_mapping.get(severity.lower(), severity.upper())
        
        # Determine priority
        priority = determine_priority(mapped_severity, category)

        # Generate explainable AI insights
        ai_explanation = explain_confidence(
            description=description,
            confidence=confidence,
            similar_bug_score=similarity_score
        )

        # Generate keywords and analysis
        keywords = extract_keywords(description)
        root_cause = extract_root_cause(description, category)
        suggested_fix = suggest_fix(category, severity)
        risk_assessment = assess_risk(mapped_severity, description)

        # Prepare explanation points
        explanation_points = [
            f"The description contains relevant keywords for {category} category",
            f"Pattern matches learned features with {round(confidence*100, 1)}% confidence",
        ]
        
        if similarity_score > 0.1:
            explanation_points.append(f"Similarity with historical bugs: {round(similarity_score*100, 1)}%")
        else:
            explanation_points.append("No highly similar bugs found")
            
        if keywords:
            explanation_points.append(f"Key terms detected: {', '.join(keywords[:3])}")
        else:
            explanation_points.append("No specific keywords detected")

        # Create bug report
        bug_data = {
            "project": project,
            "title": title,
            "description": description,
            "status": status_val.lower() if status_val else "open",
            "priority": priority,
            "predicted_category": category,
            "predicted_severity": mapped_severity,
            "confidence_score": float(confidence),
            "tags": tags if isinstance(tags, list) else [],
            "steps_to_reproduce": steps_to_reproduce if isinstance(steps_to_reproduce, list) else [],
            "reporter": request.user,
            "embedding": embedding,
            "ai_analysis": {
                "root_cause": root_cause,
                "suggested_fix": suggested_fix,
                "risk_assessment": risk_assessment,
                "similar_bugs": similar_bugs,
                "keywords": keywords,
                "priority_reason": get_priority_reason(priority, mapped_severity, category),
                "confidence_explanation": {
                    "level": get_confidence_level(confidence),
                    "points": ai_explanation.get("explanation_points", explanation_points),
                    "keywords": keywords,
                    "similar_bug_score": round(similarity_score, 3) if similarity_score > 0.1 else None,
                    "model_confidence": float(confidence),
                    "explainability_score": ai_explanation.get("explainability_score", 85)
                }
            }
        }

        bug = BugReport.objects.create(**bug_data)
        serializer = BugReportSerializer(bug)
        
        response_data = serializer.data
        response_data.update({
            "ai_analysis": bug_data["ai_analysis"],
            "predicted_category": category,
            "predicted_severity": mapped_severity,
            "priority": priority,
            "confidence_score": float(confidence),
            "duplicate_check": {"is_duplicate": False, "similarity_score": round(similarity_score, 3)}
        })
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- ANALYZE BUG DESCRIPTION (PREVIEW) ----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_bug_description(request):
    """
    Analyze a bug description without creating the bug
    Returns predicted category, severity, and duplicate info
    """
    try:
        description = request.data.get("description")
        project_id = request.data.get("project")
        
        if not description:
            return Response(
                {"error": "Description is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use ensemble prediction for better accuracy
        category, confidence = ensemble_prediction(description)
        severity = predict_severity(description, category)
        
        # Map severity
        severity_mapping = {
            'critical': 'CRITICAL',
            'high': 'HIGH', 
            'medium': 'MEDIUM',
            'low': 'LOW'
        }
        mapped_severity = severity_mapping.get(severity.lower(), severity.upper())
        
        # Determine priority
        priority = determine_priority(mapped_severity, category)
        
        # Check duplicates if project provided
        duplicate_info = None
        similarity_score = 0.0
        
        if project_id:
            if isinstance(project_id, str) and project_id.startswith("PROJ-"):
                try:
                    project_id = int(project_id.split("-")[1])
                except (IndexError, ValueError):
                    pass
            
            try:
                project = Project.objects.get(id=project_id, owner=request.user)
                is_dup, bug_id, sim = find_duplicate_bug(description, project)
                similarity_score = sim
                
                if is_dup and bug_id:
                    duplicate_bug = BugReport.objects.get(id=bug_id)
                    duplicate_info = {
                        "is_duplicate": True,
                        "similarity_score": sim,
                        "existing_bug": {
                            "id": f"BUG-{bug_id}",
                            "title": duplicate_bug.title
                        }
                    }
                else:
                    duplicate_info = {
                        "is_duplicate": False,
                        "similarity_score": sim
                    }
            except:
                pass
        
        # Generate keywords
        keywords = extract_keywords(description)
        
        # Generate explanation
        ai_explanation = explain_confidence(
            description=description,
            confidence=confidence,
            similar_bug_score=similarity_score
        )
        
        response = {
            "predicted_category": category,
            "predicted_severity": mapped_severity,
            "priority": priority,
            "priority_reason": get_priority_reason(priority, mapped_severity, category),
            "confidence_score": float(confidence),
            "confidence_level": get_confidence_level(confidence),
            "keywords": keywords,
            "explanation": {
                "points": ai_explanation.get("explanation_points", [
                    f"Description matches {category} pattern with {round(confidence*100, 1)}% confidence",
                    f"Key terms detected: {', '.join(keywords[:3])}" if keywords else "No specific keywords detected"
                ]),
                "keywords": keywords,
                "model_confidence": float(confidence),
                "explainability_score": ai_explanation.get("explainability_score", 85)
            }
        }
        
        if duplicate_info:
            response["duplicate_check"] = duplicate_info
        
        return Response(response)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- CHECK DUPLICATE ----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_duplicate(request):
    """
    Check if a bug description is duplicate without creating the bug
    """
    try:
        description = request.data.get("description")
        project_id = request.data.get("project")
        
        if not description or not project_id:
            return Response(
                {"error": "Description and project are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if isinstance(project_id, str) and project_id.startswith("PROJ-"):
            try:
                project_id = int(project_id.split("-")[1])
            except (IndexError, ValueError):
                return Response(
                    {"error": "Invalid project ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        project = get_object_or_404(Project, id=project_id, owner=request.user)
        
        is_duplicate, bug_id, similarity = find_duplicate_bug(description, project)
        
        if is_duplicate and bug_id:
            duplicate_bug = BugReport.objects.get(id=bug_id)
            return Response({
                "is_duplicate": True,
                "similarity_score": similarity,
                "existing_bug": {
                    "id": f"BUG-{bug_id}",
                    "title": duplicate_bug.title,
                    "description": duplicate_bug.description[:200] + "..." if len(duplicate_bug.description) > 200 else duplicate_bug.description,
                    "status": duplicate_bug.status,
                    "created_at": duplicate_bug.created_at
                }
            })
        
        return Response({
            "is_duplicate": False,
            "similarity_score": similarity,
            "message": "No duplicates found"
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- REANALYZE BUG ----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reanalyze_bug(request, pk):
    """
    Re-run AI analysis on an existing bug including priority recalculation
    """
    try:
        if isinstance(pk, str) and pk.startswith("BUG-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response(
                    {"error": "Invalid bug ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        bug = get_object_or_404(BugReport, id=pk, project__owner=request.user)
        
        # Use ensemble prediction for better accuracy
        category, confidence = ensemble_prediction(bug.description)
        severity = predict_severity(bug.description, category)
        
        severity_mapping = {
            'critical': 'CRITICAL',
            'high': 'HIGH', 
            'medium': 'MEDIUM',
            'low': 'LOW'
        }
        mapped_severity = severity_mapping.get(severity.lower(), severity.upper())
        
        priority = determine_priority(mapped_severity, category)
        
        if not bug.embedding:
            bug.embedding = get_embedding(bug.description)
        
        bug.predicted_category = category
        bug.predicted_severity = mapped_severity
        bug.priority = priority
        bug.confidence_score = float(confidence)
        
        keywords = extract_keywords(bug.description)
        root_cause = extract_root_cause(bug.description, category)
        suggested_fix = suggest_fix(category, severity)
        risk_assessment = assess_risk(mapped_severity, bug.description)
        
        bug.ai_analysis = {
            "root_cause": root_cause,
            "suggested_fix": suggested_fix,
            "risk_assessment": risk_assessment,
            "keywords": keywords,
            "priority_reason": get_priority_reason(priority, mapped_severity, category),
            "confidence_explanation": {
                "level": get_confidence_level(confidence),
                "keywords": keywords,
                "model_confidence": float(confidence),
                "explainability_score": 85
            }
        }
        
        bug.save()
        
        serializer = BugReportSerializer(bug)
        return Response({
            "message": "Bug reanalyzed successfully",
            "bug": serializer.data,
            "analysis": {
                "predicted_category": category,
                "predicted_severity": mapped_severity,
                "priority": priority,
                "confidence_score": float(confidence),
                "confidence_level": get_confidence_level(confidence)
            }
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- BUG LIST ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bug_list(request):
    try:
        user = request.user
        
        project_id = request.GET.get("project")
        status_val = request.GET.get("status")
        
        bugs = BugReport.objects.filter(project__owner=user)
        
        if project_id:
            if project_id.startswith("PROJ-"):
                try:
                    project_id = int(project_id.split("-")[1])
                except (IndexError, ValueError):
                    pass
            
            try:
                project_id = int(project_id)
                bugs = bugs.filter(project_id=project_id)
            except (ValueError, TypeError):
                pass
        
        if status_val:
            bugs = bugs.filter(status=status_val.lower())
        
        bugs = bugs.order_by("-created_at")
        
        serializer = BugReportSerializer(bugs, many=True)
        return Response(serializer.data)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- BUG DETAIL ----------------
@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def bug_detail(request, pk):
    try:
        if isinstance(pk, str) and pk.startswith("BUG-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response({"error": "Invalid bug ID format"}, status=status.HTTP_400_BAD_REQUEST)
        
        bug = get_object_or_404(BugReport, id=pk, project__owner=request.user)

        if request.method == "GET":
            serializer = BugReportSerializer(bug)
            return Response(serializer.data)

        elif request.method == "PUT":
            data = request.data.copy()
            
            if "stepsToReproduce" in data:
                data["steps_to_reproduce"] = data.pop("stepsToReproduce")
            
            if "status" in data:
                new_status = data["status"].lower()
                bug.status = new_status
                
                if new_status == "resolved" and not bug.resolved_at:
                    bug.resolved_at = now()
                elif new_status != "resolved":
                    bug.resolved_at = None
            
            for field in ["title", "description", "priority", "tags", "steps_to_reproduce"]:
                if field in data:
                    setattr(bug, field, data[field])
            
            bug.save()
            serializer = BugReportSerializer(bug)
            return Response(serializer.data)

        elif request.method == "DELETE":
            bug.delete()
            return Response({"message": "Bug deleted"}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- UPDATE BUG ----------------
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_bug(request, pk):
    """
    Update a bug's details.
    Supports both PUT (full update) and PATCH (partial update).
    """
    try:
        if isinstance(pk, str) and pk.startswith("BUG-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response(
                    {"error": "Invalid bug ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        bug = get_object_or_404(BugReport, id=pk, project__owner=request.user)
        
        data = request.data
        
        updated_fields = []
        
        if "title" in data:
            new_title = data.get("title")
            if not new_title or len(new_title.strip()) < 5:
                return Response(
                    {"error": "Title must be at least 5 characters"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            bug.title = new_title.strip()
            updated_fields.append("title")
        
        if "description" in data:
            bug.description = data.get("description")
            updated_fields.append("description")
        
        if "status" in data:
            new_status = data.get("status", "").lower()
            
            valid_statuses = ["open", "in-progress", "resolved", "closed"]
            if new_status not in valid_statuses:
                return Response(
                    {"error": f"Status must be one of: {', '.join(valid_statuses)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            bug.status = new_status
            updated_fields.append("status")
            
            if new_status == "resolved" and not bug.resolved_at:
                bug.resolved_at = now()
            elif new_status != "resolved":
                bug.resolved_at = None
        
        if not updated_fields:
            return Response(
                {"error": "No valid fields to update. Provide 'title', 'description', or 'status'."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bug.save()
        
        serializer = BugReportSerializer(bug)
        
        return Response({
            "message": f"Bug updated successfully. Updated fields: {', '.join(updated_fields)}",
            "bug": serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- DELETE BUG ----------------
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_bug(request, pk):
    """
    Delete a bug permanently.
    """
    try:
        if isinstance(pk, str) and pk.startswith("BUG-"):
            try:
                pk = int(pk.split("-")[1])
            except (IndexError, ValueError):
                return Response(
                    {"error": "Invalid bug ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        bug = get_object_or_404(BugReport, id=pk, project__owner=request.user)
        
        bug_info = {
            "id": f"BUG-{bug.id}",
            "title": bug.title,
            "project": bug.project.name
        }
        
        bug.delete()
        
        return Response({
            "message": f"Bug '{bug_info['title']}' (ID: {bug_info['id']}) deleted successfully",
            "deleted_bug": bug_info
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ---------------- DASHBOARD ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    try:
        user = request.user

        projects = Project.objects.filter(owner=user)
        bugs = BugReport.objects.filter(project__owner=user)

        today = now().date()

        # ---------- BASIC STATS ----------
        resolved_bugs = bugs.filter(status="resolved", resolved_at__isnull=False)

        avg_resolution = None
        avg_days = 0
        if resolved_bugs.exists():
            avg_resolution = resolved_bugs.annotate(
                duration=ExpressionWrapper(
                    F("resolved_at") - F("created_at"),
                    output_field=DurationField()
                )
            ).aggregate(avg=Avg("duration"))["avg"]
            
            if avg_resolution:
                avg_days = round(avg_resolution.total_seconds() / 86400, 1)

        stats = {
            "total_bugs": bugs.count(),
            "active_projects": projects.count(),
            "resolved_today": bugs.filter(
                status="resolved",
                resolved_at__date=today
            ).count(),
            "critical_bugs": bugs.filter(priority="critical").count(),
            "avg_resolution_days": avg_days,
        }

        # ---------- BUG STATUS DISTRIBUTION ----------
        bug_status = bugs.values("status").annotate(value=Count("id"))

        bug_status_data = []
        for s in bug_status:
            status_name = s["status"]
            if status_name:
                bug_status_data.append({
                    "name": status_name.replace("-", " ").title(),
                    "value": s["value"]
                })

        # ---------- PRIORITY DISTRIBUTION ----------
        priority_data = bugs.values("priority").annotate(count=Count("id"))

        priority_distribution = []
        for p in priority_data:
            if p["priority"]:
                priority_distribution.append({
                    "priority": p["priority"].title(),
                    "count": p["count"]
                })

        # ---------- SEVERITY DISTRIBUTION ----------
        severity_data = bugs.values("predicted_severity").annotate(count=Count("id"))

        severity_distribution = []
        for s in severity_data:
            if s["predicted_severity"]:
                severity_distribution.append({
                    "severity": s["predicted_severity"],
                    "count": s["count"]
                })

        # ---------- CATEGORY DISTRIBUTION ----------
        category_data = bugs.values("predicted_category").annotate(count=Count("id"))

        category_distribution = []
        category_display_map = {
            "authentication": "Authentication",
            "performance": "Performance",
            "crash": "Crash",
            "security": "Security",
            "ui": "User Interface",
            "database": "Database",
            "api": "API",
            "memory": "Memory",
            "concurrency": "Concurrency",
            "other": "Other",
        }
        
        for c in category_data:
            if c["predicted_category"]:
                category_value = c["predicted_category"]
                category_distribution.append({
                    "category": category_value,
                    "display_name": category_display_map.get(category_value, category_value.title()),
                    "count": c["count"]
                })

        # ---------- WEEKLY TRENDS ----------
        last_7_days = now() - timedelta(days=7)

        trends = (
            bugs.filter(created_at__gte=last_7_days)
            .annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(bugs=Count("id"))
            .order_by("day")
        )

        resolved_trends = (
            bugs.filter(resolved_at__gte=last_7_days, resolved_at__isnull=False)
            .annotate(day=TruncDay("resolved_at"))
            .values("day")
            .annotate(resolved=Count("id"))
            .order_by("day")
        )

        trend_map = {}

        for t in trends:
            if t["day"]:
                trend_map[t["day"].date()] = {"bugs": t["bugs"], "resolved": 0}

        for r in resolved_trends:
            if r["day"]:
                d = r["day"].date()
                if d not in trend_map:
                    trend_map[d] = {"bugs": 0, "resolved": 0}
                trend_map[d]["resolved"] = r["resolved"]

        weekly_trends = []
        for d, v in sorted(trend_map.items()):
            weekly_trends.append({
                "day": d.strftime("%a"),
                "bugs": v["bugs"],
                "resolved": v["resolved"],
            })

        # ---------- RECENT BUGS ----------
        recent = bugs.order_by("-created_at")[:5]

        recent_bugs = []
        for b in recent:
            category_display = None
            if b.predicted_category:
                category_display = category_display_map.get(b.predicted_category, b.predicted_category.title())
            
            recent_bugs.append({
                "id": f"BUG-{b.id}",
                "title": b.title,
                "status": b.status.replace("-", " ").title() if b.status else "Open",
                "priority": b.priority.title() if b.priority else "Medium",
                "severity": b.predicted_severity or "Unknown",
                "category": b.predicted_category,
                "category_display": category_display,
                "confidence": b.confidence_score,
                "project": b.project.name,
                "time": b.created_at.strftime("%d %b"),
            })

        # ---------- PROJECT STATS ----------
        project_stats = []
        for project in projects[:5]:
            project_stats.append({
                "id": f"PROJ-{project.id}",
                "name": project.name,
                "status": project.status,
                "priority": project.priority,
                "progress": project.progress,
                "bugs": project.bug_stats,
            })

        return Response({
            "stats": stats,
            "bugStatus": bug_status_data,
            "weeklyTrends": weekly_trends,
            "priorityDistribution": priority_distribution,
            "severityDistribution": severity_distribution,
            "categoryDistribution": category_distribution,
            "recentBugs": recent_bugs,
            "projectStats": project_stats,
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------- ANALYTICS ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    """
    Comprehensive analytics endpoint for the Analytics Dashboard
    Provides all necessary data for charts, stats, and insights
    """
    try:
        user = request.user
        time_range = request.GET.get('range', '30d')
        
        # Calculate date range based on filter
        end_date = now()
        if time_range == '7d':
            start_date = end_date - timedelta(days=7)
            group_by = 'day'
            date_format = '%a'  # Mon, Tue, etc.
            period_count = 7
        elif time_range == '30d':
            start_date = end_date - timedelta(days=30)
            group_by = 'week'
            date_format = 'Week %W'  # Week 1, Week 2, etc.
            period_count = 4
        elif time_range == '90d':
            start_date = end_date - timedelta(days=90)
            group_by = 'week'
            date_format = '%b %d'  # Jan 01
            period_count = 12
        elif time_range == '1y':
            start_date = end_date - timedelta(days=365)
            group_by = 'month'
            date_format = '%b'  # Jan, Feb, etc.
            period_count = 12
        else:
            start_date = end_date - timedelta(days=30)
            group_by = 'week'
            date_format = 'Week %W'
            period_count = 4
        
        # Get all projects and bugs for the user
        projects = Project.objects.filter(owner=user)
        bugs = BugReport.objects.filter(project__owner=user)
        bugs_in_range = bugs.filter(created_at__gte=start_date)
        
        # ==================================================
        # 1. STATS CARDS DATA
        # ==================================================
        total_bugs = bugs.count()
        critical_issues = bugs.filter(
            Q(priority='critical') | Q(predicted_severity='CRITICAL')
        ).count()
        active_bugs = bugs.filter(status__in=['open', 'in-progress']).count()
        
        # Bug density (average bugs per project)
        project_count = projects.count()
        bug_density = round(total_bugs / project_count, 1) if project_count > 0 else 0
        
        # Calculate trends (compare with previous period)
        previous_start = start_date - (end_date - start_date)
        previous_bugs = bugs.filter(
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).count()
        
        previous_critical = bugs.filter(
            Q(priority='critical') | Q(predicted_severity='CRITICAL'),
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).count()
        
        previous_active = bugs.filter(
            status__in=['open', 'in-progress'],
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).count()
        
        def calc_trend(current, previous):
            if previous == 0:
                return "+100%" if current > 0 else "0%"
            change = ((current - previous) / previous) * 100
            return f"{'+' if change > 0 else ''}{change:.1f}%"
        
        stats = [
            {
                "title": "Total Bugs",
                "value": str(total_bugs),
                "change": calc_trend(total_bugs, previous_bugs),
                "trend": "up" if total_bugs > previous_bugs else "down",
                "icon": "Bug",
                "color": "from-red-500 to-red-600",
                "description": "Across all projects",
            },
            {
                "title": "Critical Issues",
                "value": str(critical_issues),
                "change": calc_trend(critical_issues, previous_critical),
                "trend": "up" if critical_issues > previous_critical else "down",
                "icon": "AlertTriangle",
                "color": "from-orange-500 to-orange-600",
                "description": "Require immediate attention",
            },
            {
                "title": "Active Bugs",
                "value": str(active_bugs),
                "change": calc_trend(active_bugs, previous_active),
                "trend": "down" if active_bugs < previous_active else "up",
                "icon": "Activity",
                "color": "from-blue-500 to-blue-600",
                "description": "Currently being worked on",
            },
            {
                "title": "Bug Density",
                "value": f"{bug_density}/proj",
                "change": f"+{bug_density}" if bug_density > 0 else "0",
                "trend": "up" if bug_density > 2 else "down",
                "icon": "Gauge",
                "color": "from-purple-500 to-purple-600",
                "description": "Average per project",
            },
        ]
        
        # ==================================================
        # 2. BUG TREND DATA (Dynamic based on time range)
        # ==================================================
        bug_trend_data = []
        
        if group_by == 'day':
            # Group by day for last 7 days
            from django.db.models.functions import TruncDay
            trends = (
                bugs_in_range
                .annotate(period=TruncDay("created_at"))
                .values("period")
                .annotate(
                    reported=Count("id"),
                    resolved=Count("id", filter=Q(status="resolved")),
                    critical=Count("id", filter=Q(priority="critical") | Q(predicted_severity="CRITICAL"))
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in trends:
                if item["period"]:
                    date_key = item["period"].date()
                    trend_map[date_key] = {
                        "reported": item["reported"],
                        "resolved": item["resolved"],
                        "critical": item["critical"],
                    }
            
            # Fill in missing days with zero values
            current_date = start_date.date()
            for i in range(period_count):
                date_key = current_date + timedelta(days=i)
                if date_key <= end_date.date():
                    data = trend_map.get(date_key, {"reported": 0, "resolved": 0, "critical": 0})
                    bug_trend_data.append({
                        "period": date_key.strftime(date_format),
                        "reported": data["reported"],
                        "resolved": data["resolved"],
                        "critical": data["critical"],
                    })
        
        elif group_by == 'week':
            # Group by week
            from django.db.models.functions import TruncWeek
            trends = (
                bugs_in_range
                .annotate(period=TruncWeek("created_at"))
                .values("period")
                .annotate(
                    reported=Count("id"),
                    resolved=Count("id", filter=Q(status="resolved")),
                    critical=Count("id", filter=Q(priority="critical") | Q(predicted_severity="CRITICAL"))
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in trends:
                if item["period"]:
                    week_key = item["period"].date()
                    trend_map[week_key] = {
                        "reported": item["reported"],
                        "resolved": item["resolved"],
                        "critical": item["critical"],
                    }
            
            # Generate weeks
            current_date = start_date.date()
            week_count = 0
            while current_date <= end_date.date() and week_count < period_count:
                # Find the start of the week (Monday)
                week_start = current_date - timedelta(days=current_date.weekday())
                week_end = week_start + timedelta(days=6)
                
                data = trend_map.get(week_start, {"reported": 0, "resolved": 0, "critical": 0})
                
                if time_range == '30d':
                    week_num = week_start.strftime("%W")
                    bug_trend_data.append({
                        "period": f"Week {week_num}",
                        "reported": data["reported"],
                        "resolved": data["resolved"],
                        "critical": data["critical"],
                    })
                else:  # 90d
                    bug_trend_data.append({
                        "period": week_start.strftime(date_format),
                        "reported": data["reported"],
                        "resolved": data["resolved"],
                        "critical": data["critical"],
                    })
                
                current_date = week_end + timedelta(days=1)
                week_count += 1
        
        elif group_by == 'month':
            # Group by month
            from django.db.models.functions import TruncMonth
            trends = (
                bugs_in_range
                .annotate(period=TruncMonth("created_at"))
                .values("period")
                .annotate(
                    reported=Count("id"),
                    resolved=Count("id", filter=Q(status="resolved")),
                    critical=Count("id", filter=Q(priority="critical") | Q(predicted_severity="CRITICAL"))
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in trends:
                if item["period"]:
                    month_key = item["period"].date().replace(day=1)
                    trend_map[month_key] = {
                        "reported": item["reported"],
                        "resolved": item["resolved"],
                        "critical": item["critical"],
                    }
            
            # Generate months
            current_date = start_date.date().replace(day=1)
            month_count = 0
            while current_date <= end_date.date() and month_count < period_count:
                data = trend_map.get(current_date, {"reported": 0, "resolved": 0, "critical": 0})
                bug_trend_data.append({
                    "period": current_date.strftime(date_format),
                    "reported": data["reported"],
                    "resolved": data["resolved"],
                    "critical": data["critical"],
                })
                
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
                month_count += 1
        
        # ==================================================
        # 3. PROJECT PERFORMANCE DATA
        # ==================================================
        project_performance_data = []
        for project in projects[:5]:  # Top 5 projects
            project_bugs = bugs_in_range.filter(project=project)
            project_performance_data.append({
                "name": project.name,
                "bugs": project_bugs.count(),
                "resolved": project_bugs.filter(status="resolved").count(),
                "active": project_bugs.filter(status__in=['open', 'in-progress']).count(),
            })
        
        # ==================================================
        # 4. BUG CATEGORY DATA
        # ==================================================
        category_data = bugs_in_range.values('predicted_category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        total_with_category = sum(item['count'] for item in category_data if item['predicted_category'])
        
        category_display_map = {
            "authentication": "Authentication",
            "performance": "Performance",
            "crash": "Crash",
            "security": "Security",
            "ui": "User Interface",
            "database": "Database",
            "api": "API",
            "memory": "Memory",
            "concurrency": "Concurrency",
            "other": "Other",
        }
        
        category_colors = {
            "Authentication": "#3b82f6",
            "Performance": "#10b981",
            "Crash": "#ef4444",
            "Security": "#f59e0b",
            "User Interface": "#8b5cf6",
            "Database": "#ec4899",
            "API": "#14b8a6",
            "Memory": "#f97316",
            "Concurrency": "#6366f1",
            "Other": "#6b7280",
        }
        
        bug_category_data = []
        for item in category_data:
            if item['predicted_category']:
                display_name = category_display_map.get(
                    item['predicted_category'].lower(), 
                    item['predicted_category'].title()
                )
                percentage = round((item['count'] / total_with_category) * 100) if total_with_category > 0 else 0
                bug_category_data.append({
                    "name": display_name,
                    "value": percentage,
                    "color": category_colors.get(display_name, "#6b7280"),
                })
        
        # ==================================================
        # 5. SEVERITY TREND DATA (Dynamic based on time range)
        # ==================================================
        severity_trend_data = []
        
        if group_by == 'day':
            severity_trends = (
                bugs_in_range
                .annotate(period=TruncDay("created_at"))
                .values("period")
                .annotate(
                    critical=Count("id", filter=Q(predicted_severity="CRITICAL")),
                    high=Count("id", filter=Q(predicted_severity="HIGH")),
                    medium=Count("id", filter=Q(predicted_severity="MEDIUM")),
                    low=Count("id", filter=Q(predicted_severity="LOW")),
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in severity_trends:
                if item["period"]:
                    date_key = item["period"].date()
                    trend_map[date_key] = {
                        "critical": item["critical"],
                        "high": item["high"],
                        "medium": item["medium"],
                        "low": item["low"],
                    }
            
            # Fill in missing days with zero values
            current_date = start_date.date()
            for i in range(period_count):
                date_key = current_date + timedelta(days=i)
                if date_key <= end_date.date():
                    data = trend_map.get(date_key, {"critical": 0, "high": 0, "medium": 0, "low": 0})
                    severity_trend_data.append({
                        "period": date_key.strftime(date_format),
                        "critical": data["critical"],
                        "high": data["high"],
                        "medium": data["medium"],
                        "low": data["low"],
                    })
        
        elif group_by == 'week':
            severity_trends = (
                bugs_in_range
                .annotate(period=TruncWeek("created_at"))
                .values("period")
                .annotate(
                    critical=Count("id", filter=Q(predicted_severity="CRITICAL")),
                    high=Count("id", filter=Q(predicted_severity="HIGH")),
                    medium=Count("id", filter=Q(predicted_severity="MEDIUM")),
                    low=Count("id", filter=Q(predicted_severity="LOW")),
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in severity_trends:
                if item["period"]:
                    week_key = item["period"].date()
                    trend_map[week_key] = {
                        "critical": item["critical"],
                        "high": item["high"],
                        "medium": item["medium"],
                        "low": item["low"],
                    }
            
            # Generate weeks
            current_date = start_date.date()
            week_count = 0
            while current_date <= end_date.date() and week_count < period_count:
                # Find the start of the week (Monday)
                week_start = current_date - timedelta(days=current_date.weekday())
                week_end = week_start + timedelta(days=6)
                
                data = trend_map.get(week_start, {"critical": 0, "high": 0, "medium": 0, "low": 0})
                
                if time_range == '30d':
                    week_num = week_start.strftime("%W")
                    severity_trend_data.append({
                        "period": f"Week {week_num}",
                        "critical": data["critical"],
                        "high": data["high"],
                        "medium": data["medium"],
                        "low": data["low"],
                    })
                else:  # 90d
                    severity_trend_data.append({
                        "period": week_start.strftime(date_format),
                        "critical": data["critical"],
                        "high": data["high"],
                        "medium": data["medium"],
                        "low": data["low"],
                    })
                
                current_date = week_end + timedelta(days=1)
                week_count += 1
        
        elif group_by == 'month':
            severity_trends = (
                bugs_in_range
                .annotate(period=TruncMonth("created_at"))
                .values("period")
                .annotate(
                    critical=Count("id", filter=Q(predicted_severity="CRITICAL")),
                    high=Count("id", filter=Q(predicted_severity="HIGH")),
                    medium=Count("id", filter=Q(predicted_severity="MEDIUM")),
                    low=Count("id", filter=Q(predicted_severity="LOW")),
                )
                .order_by("period")
            )
            
            # Create a map of existing data
            trend_map = {}
            for item in severity_trends:
                if item["period"]:
                    month_key = item["period"].date().replace(day=1)
                    trend_map[month_key] = {
                        "critical": item["critical"],
                        "high": item["high"],
                        "medium": item["medium"],
                        "low": item["low"],
                    }
            
            # Generate months
            current_date = start_date.date().replace(day=1)
            month_count = 0
            while current_date <= end_date.date() and month_count < period_count:
                data = trend_map.get(current_date, {"critical": 0, "high": 0, "medium": 0, "low": 0})
                severity_trend_data.append({
                    "period": current_date.strftime(date_format),
                    "critical": data["critical"],
                    "high": data["high"],
                    "medium": data["medium"],
                    "low": data["low"],
                })
                
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
                month_count += 1
        
        # ==================================================
        # 6. SEVERITY DISTRIBUTION DATA
        # ==================================================
        severity_distribution = []
        
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            count = bugs_in_range.filter(predicted_severity=severity).count()
            if count > 0:
                severity_distribution.append({
                    "severity": severity.title(),
                    "count": count,
                    "color": severityChartColors.get(severity.lower(), "#6b7280"),
                })
        
        # ==================================================
        # 7. TOP ISSUES
        # ==================================================
        top_issues_data = []
        recent_bugs = bugs_in_range.order_by('-created_at', '-priority')[:10]
        
        for bug in recent_bugs:
            # Determine trend based on creation date and updates
            if bug.resolved_at:
                trend = 'declining'
            elif bug.updated_at and (now() - bug.updated_at).days < 1:
                trend = 'rising'
            else:
                trend = 'stable'
            
            # Format reported time
            days_ago = (now() - bug.created_at).days
            if days_ago == 0:
                reported = "Today"
            elif days_ago == 1:
                reported = "Yesterday"
            else:
                reported = f"{days_ago} days ago"
            
            top_issues_data.append({
                "id": f"BUG-{bug.id}",
                "title": bug.title,
                "severity": bug.predicted_severity.lower() if bug.predicted_severity else 'medium',
                "project": bug.project.name,
                "reported": reported,
                "trend": trend,
            })
        
        # ==================================================
        # 8. AI INSIGHTS & RECOMMENDATIONS
        # ==================================================
        insights = []
        
        # Critical bugs insight
        critical_count = sum(1 for s in severity_distribution if s['severity'] == 'Critical')
        if critical_count > 0:
            project_with_most_critical = bugs_in_range.filter(
                predicted_severity='CRITICAL'
            ).values('project__name').annotate(
                count=Count('id')
            ).order_by('-count').first()
            
            insights.append({
                "title": "🚀 Critical Bug Alert",
                "description": f"{critical_count} critical bugs need immediate attention. {project_with_most_critical['project__name'] if project_with_most_critical else 'E-commerce'} project has the highest concentration."
            })
        
        # Security insight
        security_bugs = bugs_in_range.filter(predicted_category='security').count()
        total_in_range = bugs_in_range.count()
        security_percentage = round((security_bugs / total_in_range) * 100) if total_in_range > 0 else 0
        insights.append({
            "title": "🛡️ Security Focus",
            "description": f"{security_percentage}% of bugs are security-related. Prioritize security audits this quarter."
        })
        
        # Severity trend insight
        if severity_trend_data and len(severity_trend_data) >= 2:
            current_critical = severity_trend_data[-1]['critical']
            previous_critical = severity_trend_data[-2]['critical']
            if previous_critical > 0:
                critical_change = ((current_critical - previous_critical) / previous_critical) * 100
                insights.append({
                    "title": "📊 Severity Trend",
                    "description": f"Critical bugs {'increased' if critical_change > 0 else 'decreased'} by {abs(critical_change):.1f}% this period. {'Review your QA process.' if critical_change > 0 else 'Good progress!'}"
                })
        
        # Bug density insight
        project_densities = []
        for project in projects:
            project_bugs = bugs_in_range.filter(project=project).count()
            if project_bugs > 0:
                project_densities.append((project.name, project_bugs))
        
        if project_densities:
            max_density_project = max(project_densities, key=lambda x: x[1])
            insights.append({
                "title": "📈 Bug Density",
                "description": f"Average of {bug_density} bugs per project. {max_density_project[0]} shows highest density with {max_density_project[1]} bugs."
            })
        
        # ==================================================
        # 9. ADDITIONAL METRICS FOR BOTTOM CARDS
        # ==================================================
        bottom_metrics = {
            "totalProjects": project_count,
            "totalBugs": bugs_in_range.count(),
            "totalResolved": bugs_in_range.filter(status="resolved").count(),
        }
        
        # ==================================================
        # CONSTRUCT FINAL RESPONSE
        # ==================================================
        response_data = {
            "stats": stats,
            "bugTrendData": bug_trend_data,
            "projectPerformanceData": project_performance_data,
            "bugCategoryData": bug_category_data,
            "severityTrendData": severity_trend_data,
            "severityDistributionData": severity_distribution,
            "topIssues": top_issues_data[:5],
            "insights": insights[:4],
            "bottomMetrics": bottom_metrics,
            "timeRange": time_range,
            "groupBy": group_by,
            "generatedAt": now().isoformat(),
        }
        
        return Response(response_data)
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Add severity chart colors at the top of the file
severityChartColors = {
    "critical": "#ef4444",
    "high": "#f59e0b",
    "medium": "#3b82f6",
    "low": "#10b981",
}
# ---------------- DEBUG ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def debug_user(request):
    try:
        return Response({"user": request.user.username})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)