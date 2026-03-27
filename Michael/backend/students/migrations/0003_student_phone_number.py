from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("students", "0002_student_schema_updates"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="phone_number",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
    ]
