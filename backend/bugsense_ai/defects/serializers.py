from rest_framework import serializers
from django.contrib.auth.models import User
from defects.models import UserProfile, Project, BugReport


# Add this to your serializers.py file
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'last_login', 'is_active']
        read_only_fields = fields  # Make all fields read-only for this serializer


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(write_only=True, required=False)
    organization = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'full_name', 'organization']
        extra_kwargs = {
            'email': {'required': True}
        }

    def validate(self, attrs):
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        organization = validated_data.pop('organization', '')        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Split full_name
        if full_name:
            name_parts = full_name.split(' ', 1)
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            user.save()
        
        # Create or update profile
        from defects.models import UserProfile  # Import here to avoid circular imports
        UserProfile.objects.create(
            user=user,
            full_name=full_name,
            organization=organization
        )
        
        return user


class ProjectSerializer(serializers.ModelSerializer):
    bugs = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    startDate = serializers.DateField(source="start_date")
    endDate = serializers.DateField(source="end_date", allow_null=True, required=False)
    progress = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "status",
            "priority",
            "startDate",
            "endDate",
            "bugs",
            "tags",
            "progress",
            "created_at",
        ]
        read_only_fields = ["progress"]

    def get_id(self, obj):
        return f"PROJ-{obj.id}"

    def get_bugs(self, obj):
        return obj.bug_stats


class BugReportSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    project = serializers.CharField(source="project.name", read_only=True)
    projectId = serializers.IntegerField(source="project.id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    stepsToReproduce = serializers.JSONField(source="steps_to_reproduce", default=list, required=False)
    
    category = serializers.CharField(source="predicted_category", read_only=True)
    category_display = serializers.SerializerMethodField()
    
    # Include AI analysis in response
    ai_analysis = serializers.JSONField(read_only=True)
    
    class Meta:
        model = BugReport
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "category_display",
            "predicted_severity",
            "confidence_score",
            "project",
            "projectId",
            "tags",
            "stepsToReproduce",
            "createdAt",
            "updatedAt",
            "ai_analysis",
        ]

    def get_id(self, obj):
        return f"BUG-{obj.id}"
    
    def get_category_display(self, obj):
        if obj.predicted_category:
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
            return category_display_map.get(
                obj.predicted_category.lower(), 
                obj.predicted_category.title()
            )
        return None