# StudentManager

StudentManager is a simple full-stack student management project with:

- A Django + Django REST Framework backend
- JWT authentication with `simplejwt`
- A Next.js frontend with protected student pages
- SQLite stored at the project root in `db.sqlite3`
- Student records scoped to the creator on the main dashboard
- A separate page for browsing all registered student entries

## Structure

```text
StudentManager/
├── backend/
├── frontend/
├── db.sqlite3
├── requirements.txt
└── README.md
```

## Backend setup

```bash
cd /home/michael/Michael
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver
```

Backend URLs:

- Admin: `http://127.0.0.1:8000/admin/`
- JWT login: `http://127.0.0.1:8000/api/auth/login/`
- JWT refresh: `http://127.0.0.1:8000/api/auth/refresh/`
- Current user: `http://127.0.0.1:8000/api/auth/me/`
- My students CRUD: `http://127.0.0.1:8000/api/students/`
- All students list: `http://127.0.0.1:8000/api/students/all/`

## Frontend setup

```bash
cd /home/michael/Michael/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend URL:

- App: `http://127.0.0.1:3000`
- My students dashboard: `http://127.0.0.1:3000/students`
- All students page: `http://127.0.0.1:3000/students/all`

## Usage

1. Create a Django superuser or regular user.
2. Log in through the Next.js login page.
3. Use the protected dashboard to add, edit, list, and delete only your own students.
4. Open the all-students page to browse every registered student entry.
5. Use Django Admin for administrative access.
