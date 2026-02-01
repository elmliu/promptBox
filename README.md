# PromptBox

A lightweight, comprehensive prompt management system built with Python Flask and SQLite. It supports project-based categorization, prompt version control, complete permission management, and REST API interfaces. Suitable for small to medium teams managing prompts.

## Project Highlights

### 1. Lightweight and Simple

- **Zero-dependency deployment**: Only requires Flask and SQLite, no additional database services needed
- **Quick start**: One-click launch with automatic database initialization
- **Clean interface**: Intuitive web interface with smooth operations
- **Single-file database**: SQLite database for easy backup and migration

### 2. Comprehensive Permission Management

- **User management**: Create, view, and delete users with admin flag support
- **User group management**: Flexible user group system for batch permission assignment
- **Project management**: Project-based permission isolation to ensure data security
- **Permission checking**: Fine-grained project access control to prevent unauthorized access
- **API Key authentication**: Support for API Key calls for external system integration
  - Header method: `X-API-Key: your_api_key`
  - Query parameter method: `?api_key=your_api_key`
  - Secure storage: API Key hash storage without exposing plaintext
  - Usage tracking: Records last usage time

### 3. Complete REST API Support

- **Standardized interfaces**: Follows RESTful design specifications
- **Dual authentication**: Supports both Session and API Key authentication
- **Permission verification**: All data interfaces include permission checks
- **Unified response**: JSON format responses with success and data/error fields
- **Error handling**: Comprehensive error messages and HTTP status codes

## Features

### Core Features

- **Project management**: Create, view, edit, and delete projects
- **Prompt management**: Create, view, edit, and delete prompts
- **Version control**: Automatically saves history versions with version recovery support
- **Version naming**: Add custom names to important versions
- **Project-based categorization**: Clear hierarchical structure for easy management

### Permission Management

- **User authentication**: Username/password login with Session management
- **Admin system**: Built-in admin account with admin group support
- **User group management**: Create, view, and delete user groups
- **User group member management**: Flexible member assignment
- **Project permission assignment**: Supports both user and user group authorization methods
- **Permission inheritance**: Admin group members automatically get all project permissions

### Personal Center

- **Personal information view**: Display user basic information
- **Password change**: Secure password update process
- **API Key management**:
  - Create new API Keys
  - View existing API Key list
  - Delete API Keys
  - Copy API Key to clipboard

### Admin Panel

- **User management**: Create and delete users
- **User group management**: Create and delete user groups
- **Project permission management**: View, grant, and revoke project permissions

## Project Structure

```
prompt/
├── app.py                      # Flask application main file
├── models.py                   # Database models and business logic
├── requirements.txt            # Python dependencies
├── prompts.db                  # SQLite database (auto-generated)
├── static/
│   ├── css/
│   │   ├── style.css          # Global styles
│   │   └── profile.css       # Profile page styles
│   └── js/
│       ├── index.js           # Home page interaction logic
│       ├── admin.js           # Admin page interaction logic
│       ├── prompt_detail.js   # Prompt detail page interaction logic
│       └── profile.js        # Profile page interaction logic
└── templates/
    ├── index.html             # Home page
    ├── login.html            # Login page
    ├── admin.html            # Admin panel page
    ├── profile.html          # Profile center page
    └── prompt_detail.html    # Prompt detail page
```

## Quick Start

### Requirements

- Python 3.7+
- pip package manager

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Application

```bash
python app.py
```

The application will start at http://localhost:5000.

### Default Account

The system automatically creates a default admin account on first run:

- Username: `admin`
- Password: `admin123`

**Security Note**: Please change the default password immediately after first login!

## Usage Guide

### Web Interface Usage

1. **Login to System**

   - Visit http://localhost:5000
   - Login with default account
2. **Create Project**

   - Click the "+ New Project" button on the left
   - Enter project name and description
   - Creator and admin group automatically get project permissions
3. **Manage Prompts**

   - Select a project, then click "+ New Prompt"
   - Enter prompt title and content
   - Click on prompt to enter detail page for editing
4. **Version Management**

   - Editing a prompt automatically creates a new version
   - Click on history versions to restore to any version
   - Add custom names to important versions
5. **Permission Management** (Admin)

   - Visit http://localhost:5000/admin
   - Create users and user groups
   - Assign project permissions to users or user groups
6. **Personal Center**

   - Click on username at top to enter personal center
   - Change password
   - Create and manage API Keys

### API Interface Usage

#### Authentication Methods

The system supports two authentication methods:

**Method 1: Session Authentication (Web Interface)**

```bash
# Login first to get Session
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Method 2: API Key Authentication (External System Integration)**

```bash
# Header method (recommended)
curl -H "X-API-Key: pk_your_api_key_here" \
  http://localhost:5000/api/projects

# Query parameter method
curl "http://localhost:5000/api/projects?api_key=pk_your_api_key_here"
```

#### API Interface List

##### Project Related

- `GET /api/projects` - Get all projects (requires permission)
- `POST /api/projects` - Create project
- `GET /api/projects/<id>` - Get project details
- `PUT /api/projects/<id>` - Update project
- `DELETE /api/projects/<id>` - Delete project

##### Prompt Related

- `GET /api/prompts?project_id=<id>` - Get prompt list
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/<id>` - Get prompt details
- `PUT /api/prompts/<id>` - Update prompt
- `DELETE /api/prompts/<id>` - Delete prompt

##### Version Related

- `GET /api/prompts/<id>/versions` - Get all versions of a prompt
- `GET /api/versions/<id>` - Get version details
- `PUT /api/versions/<id>/rename` - Rename version

##### User Related

- `GET /api/current-user` - Get current user information
- `POST /api/change-password` - Change password
- `POST /api/logout` - Logout

##### API Key Related

- `GET /api/api-keys` - Get current user's API Key list
- `POST /api/api-keys` - Create new API Key
- `DELETE /api/api-keys/<id>` - Delete API Key

##### Admin Interfaces (Requires Admin Permission)

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `DELETE /api/users/<id>` - Delete user
- `GET /api/groups` - Get all user groups
- `POST /api/groups` - Create user group
- `PUT /api/groups/<id>` - Update user group
- `DELETE /api/groups/<id>` - Delete user group
- `GET /api/user-groups` - Get user group members
- `POST /api/user-groups` - Add user to user group
- `DELETE /api/user-groups` - Remove user from user group
- `GET /api/projects/<id>/permissions` - Get project permission list
- `POST /api/project-permissions` - Grant project permission
- `DELETE /api/project-permissions/<id>` - Revoke project permission

#### API Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Project Name"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message"
}
```

#### Permission Notes

- Regular users can only access projects and prompts they have permission for
- Admins can access all data
- Admin group members automatically get all project permissions
- Unauthorized access returns 403 status code

#### Deletion Permission Rules

| Operation           | Permission Required | Description                                         |
| ------------------- | ------------------- | --------------------------------------------------- |
| Delete project      | Admin/Admin Group   | Only admins can delete                              |
| Delete prompt       | Logged-in user      | Admins can delete any; regular users only their own |
| Delete user         | Admin               | Cannot delete yourself                              |
| Delete user group   | Admin               | Only admins can delete                              |
| Delete user group   | Admin               | Only admins can remove                              |
| Delete project perm | Admin               | Only admins can revoke                              |
| Delete API Key      | Logged-in user      | Can only delete your own                            |

## License

MIT License
