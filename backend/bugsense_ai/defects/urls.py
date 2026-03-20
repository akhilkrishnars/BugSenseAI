# defects/urls.py
from django.urls import path
from defects import views

urlpatterns = [
    # Auth
    path("register/", views.register_user, name="register"),

    # Users
    path("users/me/", views.user_detail, name="user_detail"),
    
    # Projects
    path("projects/", views.project_list, name="project_list"),
    path("projects/<str:pk>/", views.project_detail, name="project_detail"),
    path("projects/<str:pk>/export/", views.export_project, name="export_project"),    
    
    # Bugs
    path("bugs/", views.bug_list, name="bug_list"),
    path("bugs/add/", views.add_bug, name="add_bug"),
    path("bugs/<str:pk>/", views.bug_detail, name="bug_detail"),
    path("bugs/<str:pk>/update/", views.update_bug, name="update_bug"),
    path("bugs/<str:pk>/delete/", views.delete_bug, name="delete_bug"),
    
    # AI Analysis
    path("bugs/analyze/", views.analyze_bug_description, name="analyze_bug"),
    path("bugs/check-duplicate/", views.check_duplicate, name="check_duplicate"),
    path("bugs/<str:pk>/reanalyze/", views.reanalyze_bug, name="reanalyze_bug"),
    
    # Analytics
    path("analytics/", views.analytics_dashboard, name="analytics"),

    
    # Dashboard
    path("dashboard/", views.dashboard, name="dashboard"),
    path("debug-user/", views.debug_user, name="debug_user"),
]   