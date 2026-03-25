from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("students", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name="student",
            old_name="course",
            new_name="subject",
        ),
        migrations.AddField(
            model_name="student",
            name="class_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="student",
            name="comment",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="student",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="students",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
