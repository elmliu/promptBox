import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
import hashlib


class Database:
    def __init__(self, db_path: str = 'prompts.db'):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompt_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_id INTEGER NOT NULL,
                version_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                version_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                group_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
                UNIQUE(user_id, group_id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS project_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                user_id INTEGER,
                group_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
                CHECK (user_id IS NOT NULL OR group_id IS NOT NULL)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key_hash TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.init_default_data()
        self.migrate_db()

    def execute_query(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def init_default_data(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE username = ?', ('admin',))
        result = cursor.fetchone()
        
        if result['count'] == 0:
            password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
            
            cursor.execute('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)', 
                         ('admin', password_hash))
            
            cursor.execute('INSERT INTO groups (name, description) VALUES (?, ?)', 
                         ('管理员组', '拥有所有权限的管理员组'))
            
            cursor.execute('SELECT id FROM users WHERE username = ?', ('admin',))
            admin_user = cursor.fetchone()
            
            cursor.execute('SELECT id FROM groups WHERE name = ?', ('管理员组',))
            admin_group = cursor.fetchone()
            
            cursor.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', 
                         (admin_user['id'], admin_group['id']))
            
            conn.commit()
        
        conn.close()

    def migrate_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(prompt_versions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'project_id' not in columns:
            cursor.execute('ALTER TABLE prompt_versions ADD COLUMN project_id INTEGER')
            cursor.execute('UPDATE prompt_versions SET project_id = (SELECT project_id FROM prompts WHERE id = prompt_versions.prompt_id)')
            conn.commit()
        
        conn.close()


class ProjectModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, name: str, description: str = '') -> int:
        cursor = self.db.execute_query(
            'INSERT INTO projects (name, description) VALUES (?, ?)',
            (name, description)
        )
        return cursor.lastrowid

    def get_all(self) -> List[Dict[str, Any]]:
        return self.db.fetch_all('SELECT * FROM projects ORDER BY created_at DESC')

    def get_by_id(self, project_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM projects WHERE id = ?', (project_id,))

    def update(self, project_id: int, name: str = None, description: str = None) -> bool:
        updates = []
        params = []
        
        if name is not None:
            updates.append('name = ?')
            params.append(name)
        if description is not None:
            updates.append('description = ?')
            params.append(description)
        
        if not updates:
            return False
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(project_id)
        
        query = f'UPDATE projects SET {", ".join(updates)} WHERE id = ?'
        self.db.execute_query(query, tuple(params))
        return True

    def delete(self, project_id: int) -> bool:
        self.db.execute_query('DELETE FROM projects WHERE id = ?', (project_id,))
        return True


class PromptModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, project_id: int, title: str, content: str) -> int:
        cursor = self.db.execute_query(
            'INSERT INTO prompts (project_id, title, content) VALUES (?, ?, ?)',
            (project_id, title, content)
        )
        return cursor.lastrowid

    def get_all(self, project_id: int = None) -> List[Dict[str, Any]]:
        if project_id:
            return self.db.fetch_all(
                'SELECT * FROM prompts WHERE project_id = ? ORDER BY created_at DESC',
                (project_id,)
            )
        return self.db.fetch_all('SELECT * FROM prompts ORDER BY created_at DESC')

    def get_by_id(self, prompt_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM prompts WHERE id = ?', (prompt_id,))

    def update(self, prompt_id: int, title: str = None, content: str = None) -> bool:
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = ?')
            params.append(title)
        if content is not None:
            updates.append('content = ?')
            params.append(content)
        
        if not updates:
            return False
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(prompt_id)
        
        query = f'UPDATE prompts SET {", ".join(updates)} WHERE id = ?'
        self.db.execute_query(query, tuple(params))
        return True

    def delete(self, prompt_id: int) -> bool:
        self.db.execute_query('DELETE FROM prompts WHERE id = ?', (prompt_id,))
        return True


class PromptVersionModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, prompt_id: int, version_number: int, title: str, content: str, version_name: str = None) -> int:
        cursor = self.db.execute_query(
            'INSERT INTO prompt_versions (prompt_id, version_number, title, content, version_name) VALUES (?, ?, ?, ?, ?)',
            (prompt_id, version_number, title, content, version_name)
        )
        return cursor.lastrowid

    def get_all(self, prompt_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC',
            (prompt_id,)
        )

    def get_by_id(self, version_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM prompt_versions WHERE id = ?', (version_id,))

    def get_latest_version(self, prompt_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one(
            'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
            (prompt_id,)
        )

    def get_current_version_number(self, prompt_id: int) -> int:
        result = self.db.fetch_one(
            'SELECT MAX(version_number) as max_version FROM prompt_versions WHERE prompt_id = ?',
            (prompt_id,)
        )
        return result['max_version'] if result and result['max_version'] else 0

    def update_version_name(self, version_id: int, version_name: str) -> bool:
        self.db.execute_query(
            'UPDATE prompt_versions SET version_name = ? WHERE id = ?',
            (version_name, version_id)
        )
        return True

    def delete(self, version_id: int) -> bool:
        self.db.execute_query('DELETE FROM prompt_versions WHERE id = ?', (version_id,))
        return True


class UserModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, username: str, password: str, is_admin: bool = False) -> int:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor = self.db.execute_query(
            'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
            (username, password_hash, 1 if is_admin else 0)
        )
        return cursor.lastrowid

    def get_all(self) -> List[Dict[str, Any]]:
        return self.db.fetch_all('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC')

    def get_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT id, username, is_admin, created_at FROM users WHERE id = ?', (user_id,))

    def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM users WHERE username = ?', (username,))

    def verify_password(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return self.db.fetch_one(
            'SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?',
            (username, password_hash)
        )

    def delete(self, user_id: int) -> bool:
        self.db.execute_query('DELETE FROM users WHERE id = ?', (user_id,))
        return True

    def update_password(self, user_id: int, new_password: str) -> bool:
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        self.db.execute_query('UPDATE users SET password = ? WHERE id = ?', (password_hash, user_id))
        return True


class GroupModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, name: str, description: str = '') -> int:
        cursor = self.db.execute_query(
            'INSERT INTO groups (name, description) VALUES (?, ?)',
            (name, description)
        )
        return cursor.lastrowid

    def get_all(self) -> List[Dict[str, Any]]:
        return self.db.fetch_all('SELECT * FROM groups ORDER BY created_at DESC')

    def get_by_id(self, group_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM groups WHERE id = ?', (group_id,))

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM groups WHERE name = ?', (name,))

    def update(self, group_id: int, name: str = None, description: str = None) -> bool:
        updates = []
        params = []
        
        if name is not None:
            updates.append('name = ?')
            params.append(name)
        if description is not None:
            updates.append('description = ?')
            params.append(description)
        
        if not updates:
            return False
        
        query = f'UPDATE groups SET {", ".join(updates)} WHERE id = ?'
        self.db.execute_query(query, tuple(params) + (group_id,))
        return True

    def delete(self, group_id: int) -> bool:
        self.db.execute_query('DELETE FROM groups WHERE id = ?', (group_id,))
        return True


class UserGroupModel:
    def __init__(self, db: Database):
        self.db = db

    def add_user_to_group(self, user_id: int, group_id: int) -> int:
        cursor = self.db.execute_query(
            'INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
            (user_id, group_id)
        )
        return cursor.lastrowid

    def remove_user_from_group(self, user_id: int, group_id: int) -> bool:
        self.db.execute_query(
            'DELETE FROM user_groups WHERE user_id = ? AND group_id = ?',
            (user_id, group_id)
        )
        return True

    def get_user_groups(self, user_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            'SELECT g.* FROM groups g JOIN user_groups ug ON g.id = ug.group_id WHERE ug.user_id = ?',
            (user_id,)
        )

    def get_group_users(self, group_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            'SELECT u.id, u.username, u.is_admin FROM users u JOIN user_groups ug ON u.id = ug.user_id WHERE ug.group_id = ?',
            (group_id,)
        )

    def check_user_in_group(self, user_id: int, group_id: int) -> bool:
        result = self.db.fetch_one(
            'SELECT COUNT(*) as count FROM user_groups WHERE user_id = ? AND group_id = ?',
            (user_id, group_id)
        )
        return result['count'] > 0 if result else False


class ProjectPermissionModel:
    def __init__(self, db: Database):
        self.db = db

    def grant_permission(self, project_id: int, user_id: int = None, group_id: int = None) -> int:
        cursor = self.db.execute_query(
            'INSERT INTO project_permissions (project_id, user_id, group_id) VALUES (?, ?, ?)',
            (project_id, user_id, group_id)
        )
        return cursor.lastrowid

    def revoke_permission(self, permission_id: int) -> bool:
        self.db.execute_query('DELETE FROM project_permissions WHERE id = ?', (permission_id,))
        return True

    def get_project_permissions(self, project_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            '''SELECT pp.*, u.username, g.name as group_name 
               FROM project_permissions pp 
               LEFT JOIN users u ON pp.user_id = u.id 
               LEFT JOIN groups g ON pp.group_id = g.id 
               WHERE pp.project_id = ? 
               ORDER BY pp.created_at DESC''',
            (project_id,)
        )

    def get_user_projects(self, user_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            '''SELECT DISTINCT p.* FROM projects p 
               LEFT JOIN project_permissions pp ON p.id = pp.project_id 
               LEFT JOIN user_groups ug ON pp.group_id = ug.group_id 
               WHERE pp.user_id = ? OR ug.user_id = ? 
               ORDER BY p.created_at DESC''',
            (user_id, user_id)
        )

    def check_user_project_permission(self, user_id: int, project_id: int) -> bool:
        result = self.db.fetch_one(
            '''SELECT COUNT(*) as count FROM project_permissions pp 
               LEFT JOIN user_groups ug ON pp.group_id = ug.group_id 
               WHERE pp.project_id = ? AND (pp.user_id = ? OR ug.user_id = ?)''',
            (project_id, user_id, user_id)
        )
        return result['count'] > 0 if result else False


class ApiKeyModel:
    def __init__(self, db: Database):
        self.db = db

    def create(self, user_id: int, name: str) -> tuple:
        import secrets
        api_key = 'pk_' + secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        cursor = self.db.execute_query(
            'INSERT INTO api_keys (user_id, key_hash, name) VALUES (?, ?, ?)',
            (user_id, key_hash, name)
        )
        return cursor.lastrowid, api_key

    def get_user_keys(self, user_id: int) -> List[Dict[str, Any]]:
        return self.db.fetch_all(
            'SELECT id, name, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
            (user_id,)
        )

    def get_by_id(self, key_id: int) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM api_keys WHERE id = ?', (key_id,))

    def get_user_by_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = self.db.fetch_one(
            '''SELECT ak.*, u.id as user_id, u.username, u.is_admin 
               FROM api_keys ak 
               JOIN users u ON ak.user_id = u.id 
               WHERE ak.key_hash = ?''',
            (key_hash,)
        )
        
        if result:
            self.db.execute_query(
                'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
                (result['id'],)
            )
        
        return result

    def delete(self, key_id: int) -> bool:
        self.db.execute_query('DELETE FROM api_keys WHERE id = ?', (key_id,))
        return True
