from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    organization = models.CharField(max_length=255, blank=True, null=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"


class Project(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("completed", "Completed"),
        ("on-hold", "On Hold"),
        ("archived", "Archived"),
    ]
    
    PRIORITY_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # CRITICAL: These fields MUST exist in the database
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium"
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    
    # Optional fields
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def bug_stats(self):
        bugs = self.bugs.all()
        total = bugs.count()
        open_bugs = bugs.filter(status="open").count()
        resolved = bugs.filter(status="resolved").count()
        critical = bugs.filter(priority="critical").count()
        high = bugs.filter(priority="high").count()
        medium = bugs.filter(priority="medium").count()
        low = bugs.filter(priority="low").count()
        
        # Add severity stats
        critical_severity = bugs.filter(predicted_severity="CRITICAL").count()
        high_severity = bugs.filter(predicted_severity="HIGH").count()
        medium_severity = bugs.filter(predicted_severity="MEDIUM").count()
        low_severity = bugs.filter(predicted_severity="LOW").count()
        
        return {
            "total": total,
            "open": open_bugs,
            "resolved": resolved,
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "severity": {
                "CRITICAL": critical_severity,
                "HIGH": high_severity,
                "MEDIUM": medium_severity,
                "LOW": low_severity,
            }
        }

    @property
    def progress(self):
        bugs = self.bugs.all()
        total = bugs.count()
        if total == 0:
            return 0
        resolved = bugs.filter(status="resolved").count()
        return int((resolved / total) * 100)


class BugReport(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in-progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]

    PRIORITY_CHOICES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    SEVERITY_CHOICES = [
        ("CRITICAL", "Critical"),
        ("HIGH", "High"),
        ("MEDIUM", "Medium"),
        ("LOW", "Low"),
    ]

    CATEGORY_CHOICES = [
        ("authentication", "Authentication"),
        ("performance", "Performance"),
        ("crash", "Crash"),
        ("security", "Security"),
        ("ui", "User Interface"),
        ("database", "Database"),
        ("api", "API"),
        ("memory", "Memory"),
        ("concurrency", "Concurrency"),
        ("other", "Other"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="bugs"
    )

    # CRITICAL: These fields MUST exist in the database
    title = models.CharField(max_length=200)
    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open"
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium"
    )

    # ML fields
    predicted_category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        null=True,
        blank=True,
        help_text="AI-predicted bug category"
    )

    predicted_severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        null=True,
        blank=True,
        help_text="AI-predicted severity level"
    )

    confidence_score = models.FloatField(
        null=True,
        blank=True,
        help_text="AI model confidence score (0-1)"
    )

    # Embedding for duplicate detection
    embedding = models.JSONField(
        null=True, 
        blank=True,
        help_text="Vector embedding for duplicate detection"
    )

    # AI Analysis results - store as JSON
    ai_analysis = models.JSONField(
        null=True,
        blank=True,
        help_text="Complete AI analysis results including root cause, suggestions, etc."
    )

    # Bug details
    tags = models.JSONField(default=list, blank=True)
    steps_to_reproduce = models.JSONField(default=list, blank=True)

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reported_bugs",
        null=True,
        blank=True,
    )


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['predicted_severity']),
            models.Index(fields=['predicted_category']),  # Add index for category
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        category_str = f" [{self.predicted_category}]" if self.predicted_category else ""
        return f"BUG-{self.id}{category_str} | {self.title}"

    def save(self, *args, **kwargs):
        # Auto-set resolved_at when status changes to resolved
        if self.status == "resolved" and not self.resolved_at:
            self.resolved_at = timezone.now()
        elif self.status != "resolved":
            self.resolved_at = None
        super().save(*args, **kwargs)

    @property
    def age_in_days(self):
        """Calculate how many days the bug has been open"""
        if self.resolved_at:
            delta = self.resolved_at - self.created_at
        else:
            delta = timezone.now() - self.created_at
        return delta.days

    @property
    def is_critical(self):
        """Check if bug is critical based on severity or priority"""
        return self.predicted_severity == "CRITICAL" or self.priority == "critical"

    @property
    def has_ai_analysis(self):
        """Check if AI analysis is available"""
        return self.ai_analysis is not None and bool(self.ai_analysis)
    
    @property
    def category_info(self):
        """Return category information"""
        if self.predicted_category:
            return {
                "value": self.predicted_category,
                "display": dict(self.CATEGORY_CHOICES).get(self.predicted_category, self.predicted_category.title())
            }
        return None