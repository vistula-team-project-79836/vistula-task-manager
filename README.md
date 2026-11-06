# Vistula Task Manager

A simple task manager built with plain HTML, CSS and JavaScript. Tasks are stored in a Supabase (PostgreSQL) database and accessed through the auto-generated Supabase REST API. It's hosted on GitHub Pages.

- **Student ID:** 79836
- **Live application:** https://vistula-team-project-79836.github.io/vistula-task-manager/
- **Repository:** https://github.com/vistula-team-project-79836/vistula-task-manager
- **Contributor page:** https://vistula-team-project-79836.github.io/vistula-task-manager/contribution.html
- **Contributor JSON:** https://vistula-team-project-79836.github.io/vistula-task-manager/contribution.json

## Team collaboration

| Pull request | Link |
|---|---|
| Incoming: partner's PR merged into this repository | PR_LINK_INCOMING |
| Outgoing: my PR merged into my partner's repository | PR_LINK_OUTGOING |

## Features

- Display all tasks from the database
- Add a new task (title required, description optional)
- Edit a task's title and description
- Mark a task as completed or incomplete
- Delete a task
- Show status and error messages for every operation

## Files

| File | Purpose |
|---|---|
| `index.html` | Main Task Manager page |
| `app.js` | Application logic and REST API calls (`fetch`) |
| `style.css` | Styling |
| `config.json` | Public Supabase configuration (URL, publishable key, table name) |
| `supabase-setup.sql` | SQL that creates the `tasks` table, RLS policies and test data |
| `contribution.html`, `contribution.json` | Added by my partner through a pull request |

## REST API usage

Base URL: `https://PROJECT_ID.supabase.co/rest/v1`

| Method | Endpoint | Used for |
|---|---|---|
| GET | `/tasks?select=*` | Loading the task list |
| GET | `/tasks?id=eq.{id}&select=*` | Loading a task before editing it |
| POST | `/tasks` | Adding a task |
| PUT | `/tasks?id=eq.{id}` | Saving an edited task (complete record) |
| PATCH | `/tasks?id=eq.{id}` | Toggling completed/incomplete |
| DELETE | `/tasks?id=eq.{id}` | Deleting a task |

## Database

Table `tasks`:

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT | Primary key, generated automatically |
| `title` | TEXT | Required |
| `description` | TEXT | Optional |
| `completed` | BOOLEAN | Default `false` |

Row Level Security is enabled, and the policies allow public select, insert, update and delete. This is a demonstration database that holds only test data. The repository contains only the public publishable key. No secret or service-role key is included.

## Running locally

`config.json` is loaded with `fetch`, so the page must be served over HTTP rather than opened as a file:

```
python -m http.server 8000
```

Then open http://localhost:8000/.
