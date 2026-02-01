from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from functools import wraps
from models import Database, ProjectModel, PromptModel, PromptVersionModel, UserModel, GroupModel, UserGroupModel, ProjectPermissionModel, ApiKeyModel

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

db = Database()
project_model = ProjectModel(db)
prompt_model = PromptModel(db)
prompt_version_model = PromptVersionModel(db)
user_model = UserModel(db)
group_model = GroupModel(db)
user_group_model = UserGroupModel(db)
project_permission_model = ProjectPermissionModel(db)
api_key_model = ApiKeyModel(db)


def get_current_user_id():
    if 'user_id' in session:
        return session['user_id']
    
    api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
    if api_key:
        user = api_key_model.get_user_by_key(api_key)
        if user:
            return user['user_id']
    
    return None


def get_current_user():
    if 'user_id' in session:
        return user_model.get_by_id(session['user_id'])
    
    api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
    if api_key:
        user = api_key_model.get_user_by_key(api_key)
        if user:
            return {
                'id': user['user_id'],
                'username': user['username'],
                'is_admin': user['is_admin']
            }
    
    return None


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            if request.is_json:
                return jsonify({'success': False, 'error': '未登录或API Key无效'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or not user['is_admin']:
            if request.is_json:
                return jsonify({'success': False, 'error': '没有权限'}), 403
            return render_template('no_permission.html')
        return f(*args, **kwargs)
    return decorated_function


def is_admin():
    user = get_current_user()
    return user and user['is_admin']


def is_admin_or_in_admin_group():
    if is_admin():
        return True
    user_id = get_current_user_id()
    if not user_id:
        return False
    user_groups = user_group_model.get_user_groups(user_id)
    return any(g['name'] == '管理员组' for g in user_groups)


@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/admin')
@login_required
@admin_required
def admin():
    return render_template('admin.html')


@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400
    
    user = user_model.verify_password(username, password)
    if user:
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_admin'] = user['is_admin']
        return jsonify({'success': True, 'data': user})
    else:
        return jsonify({'success': False, 'error': '用户名或密码错误'}), 401


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'success': False, 'error': '旧密码和新密码不能为空'}), 400
    
    if len(new_password) < 6:
        return jsonify({'success': False, 'error': '新密码长度至少为6位'}), 400
    
    user_id = get_current_user_id()
    user = user_model.get_by_id(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    if not user_model.verify_password(user['username'], old_password):
        return jsonify({'success': False, 'error': '旧密码不正确'}), 400
    
    try:
        user_model.update_password(user_id, new_password)
        session.clear()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/api-keys', methods=['GET'])
@login_required
def get_api_keys():
    user_id = get_current_user_id()
    keys = api_key_model.get_user_keys(user_id)
    return jsonify({'success': True, 'data': keys})


@app.route('/api/api-keys', methods=['POST'])
@login_required
def create_api_key():
    data = request.get_json()
    name = data.get('name', '未命名API Key')
    
    if not name:
        return jsonify({'success': False, 'error': 'API Key名称不能为空'}), 400
    
    try:
        user_id = get_current_user_id()
        key_id, api_key = api_key_model.create(user_id, name)
        return jsonify({'success': True, 'data': {'id': key_id, 'key': api_key}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/api-keys/<int:key_id>', methods=['DELETE'])
@login_required
def delete_api_key(key_id):
    try:
        api_key = api_key_model.get_by_id(key_id)
        if not api_key:
            return jsonify({'success': False, 'error': 'API Key不存在'}), 404
        
        user_id = get_current_user_id()
        if api_key['user_id'] != user_id:
            return jsonify({'success': False, 'error': '没有权限删除此API Key'}), 403
        
        api_key_model.delete(key_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/current-user', methods=['GET'])
def get_current_user_info():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': '未登录'}), 401
    return jsonify({
        'success': True,
        'data': {
            'id': session['user_id'],
            'username': session['username'],
            'is_admin': session['is_admin']
        }
    })


@app.route('/prompt/<int:prompt_id>')
@login_required
def prompt_detail(prompt_id):
    return render_template('prompt_detail.html', prompt_id=prompt_id)


@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    if is_admin():
        projects = project_model.get_all()
    else:
        projects = project_permission_model.get_user_projects(session['user_id'])
    return jsonify({'success': True, 'data': projects})


@app.route('/api/projects', methods=['POST'])
@login_required
def create_project():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({'success': False, 'error': '项目名称不能为空'}), 400
    
    try:
        project_id = project_model.create(name, description)
        
        user_id = get_current_user_id()
        
        project_permission_model.grant_permission(project_id, user_id=user_id)
        
        admin_group = group_model.get_by_name('管理员组')
        if admin_group:
            project_permission_model.grant_permission(project_id, group_id=admin_group['id'])
        
        return jsonify({'success': True, 'data': {'id': project_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/projects/<int:project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, project_id):
            return jsonify({'success': False, 'error': '没有权限访问此项目'}), 403
    
    project = project_model.get_by_id(project_id)
    if not project:
        return jsonify({'success': False, 'error': '项目不存在'}), 404
    return jsonify({'success': True, 'data': project})


@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, project_id):
            return jsonify({'success': False, 'error': '没有权限修改此项目'}), 403
    
    try:
        project_model.update(project_id, name, description)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    if not is_admin_or_in_admin_group():
        return jsonify({'success': False, 'error': '没有权限'}), 403
    project_model.delete(project_id)
    return jsonify({'success': True})


@app.route('/api/prompts', methods=['GET'])
@login_required
def get_prompts():
    project_id = request.args.get('project_id', type=int)
    
    if project_id:
        if not is_admin():
            user_id = get_current_user_id()
            if not project_permission_model.check_user_project_permission(user_id, project_id):
                return jsonify({'success': False, 'error': '没有权限访问此项目的提示词'}), 403
    
    prompts = prompt_model.get_all(project_id)
    return jsonify({'success': True, 'data': prompts})


@app.route('/api/prompts', methods=['POST'])
@login_required
def create_prompt():
    data = request.get_json()
    project_id = data.get('project_id')
    title = data.get('title')
    content = data.get('content', '')
    
    if not project_id or not title:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, project_id):
            return jsonify({'success': False, 'error': '没有权限在此项目中创建提示词'}), 403
    
    try:
        prompt_id = prompt_model.create(project_id, title, content)
        return jsonify({'success': True, 'data': {'id': prompt_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/prompts/<int:prompt_id>', methods=['GET'])
@login_required
def get_prompt(prompt_id):
    prompt = prompt_model.get_by_id(prompt_id)
    if not prompt:
        return jsonify({'success': False, 'error': '提示词不存在'}), 404
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, prompt['project_id']):
            return jsonify({'success': False, 'error': '没有权限访问此提示词'}), 403
    
    return jsonify({'success': True, 'data': prompt})


@app.route('/api/prompts/<int:prompt_id>', methods=['PUT'])
@login_required
def update_prompt(prompt_id):
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    
    try:
        prompt = prompt_model.get_by_id(prompt_id)
        if not prompt:
            return jsonify({'success': False, 'error': '提示词不存在'}), 404
        
        if not is_admin():
            user_id = get_current_user_id()
            if not project_permission_model.check_user_project_permission(user_id, prompt['project_id']):
                return jsonify({'success': False, 'error': '没有权限修改此提示词'}), 403
        
        current_version_number = prompt_version_model.get_current_version_number(prompt_id)
        new_version_number = current_version_number + 1
        
        prompt_version_model.create(
            prompt_id, 
            new_version_number, 
            prompt['title'], 
            prompt['content']
        )
        
        prompt_model.update(prompt_id, title, content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/prompts/<int:prompt_id>', methods=['DELETE'])
@login_required
def delete_prompt(prompt_id):
    prompt = prompt_model.get_by_id(prompt_id)
    if not prompt:
        return jsonify({'success': False, 'error': '提示词不存在'}), 404
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, prompt['project_id']):
            return jsonify({'success': False, 'error': '没有权限删除此提示词'}), 403
    
    prompt_model.delete(prompt_id)
    return jsonify({'success': True})


@app.route('/api/prompts/<int:prompt_id>/versions', methods=['GET'])
@login_required
def get_prompt_versions(prompt_id):
    prompt = prompt_model.get_by_id(prompt_id)
    if not prompt:
        return jsonify({'success': False, 'error': '提示词不存在'}), 404
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, prompt['project_id']):
            return jsonify({'success': False, 'error': '没有权限访问此提示词的版本'}), 403
    
    versions = prompt_version_model.get_all(prompt_id)
    return jsonify({'success': True, 'data': versions})


@app.route('/api/versions/<int:version_id>', methods=['GET'])
@login_required
def get_version(version_id):
    version = prompt_version_model.get_by_id(version_id)
    if not version:
        return jsonify({'success': False, 'error': '版本不存在'}), 404
    
    if not is_admin():
        user_id = get_current_user_id()
        if not project_permission_model.check_user_project_permission(user_id, version['project_id']):
            return jsonify({'success': False, 'error': '没有权限访问此版本'}), 403
    
    return jsonify({'success': True, 'data': version})


@app.route('/api/versions/<int:version_id>/rename', methods=['PUT'])
@login_required
def rename_version(version_id):
    data = request.get_json()
    version_name = data.get('version_name')
    
    if not version_name:
        return jsonify({'success': False, 'error': '版本名称不能为空'}), 400
    
    try:
        version = prompt_version_model.get_by_id(version_id)
        if not version:
            return jsonify({'success': False, 'error': '版本不存在'}), 404
        
        if not is_admin():
            user_id = get_current_user_id()
            if not project_permission_model.check_user_project_permission(user_id, version['project_id']):
                return jsonify({'success': False, 'error': '没有权限修改此版本'}), 403
        
        prompt_version_model.update_version_name(version_id, version_name)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/users', methods=['GET'])
@login_required
@admin_required
def get_users():
    users = user_model.get_all()
    return jsonify({'success': True, 'data': users})


@app.route('/api/users', methods=['POST'])
@login_required
@admin_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    is_admin = data.get('is_admin', False)
    
    if not username or not password:
        return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400
    
    try:
        user_id = user_model.create(username, password, is_admin)
        return jsonify({'success': True, 'data': {'id': user_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    if user_id == session['user_id']:
        return jsonify({'success': False, 'error': '不能删除自己'}), 400
    user_model.delete(user_id)
    return jsonify({'success': True})


@app.route('/api/groups', methods=['GET'])
@login_required
@admin_required
def get_groups():
    groups = group_model.get_all()
    return jsonify({'success': True, 'data': groups})


@app.route('/api/groups', methods=['POST'])
@login_required
@admin_required
def create_group():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({'success': False, 'error': '组名不能为空'}), 400
    
    try:
        group_id = group_model.create(name, description)
        return jsonify({'success': True, 'data': {'id': group_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/groups/<int:group_id>', methods=['PUT'])
@login_required
@admin_required
def update_group(group_id):
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    try:
        group_model.update(group_id, name, description)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/groups/<int:group_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_group(group_id):
    group = group_model.get_by_id(group_id)
    if group and group['name'] == '管理员组':
        return jsonify({'success': False, 'error': '不能删除管理员组'}), 400
    group_model.delete(group_id)
    return jsonify({'success': True})


@app.route('/api/user-groups', methods=['POST'])
@login_required
@admin_required
def add_user_to_group():
    data = request.get_json()
    user_id = data.get('user_id')
    group_id = data.get('group_id')
    
    if not user_id or not group_id:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        user_group_model.add_user_to_group(user_id, group_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/user-groups', methods=['DELETE'])
@login_required
@admin_required
def remove_user_from_group():
    data = request.get_json()
    user_id = data.get('user_id')
    group_id = data.get('group_id')
    
    if not user_id or not group_id:
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        user_group_model.remove_user_from_group(user_id, group_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/groups/<int:group_id>/users', methods=['GET'])
@login_required
@admin_required
def get_group_users(group_id):
    users = user_group_model.get_group_users(group_id)
    return jsonify({'success': True, 'data': users})


@app.route('/api/users/<int:user_id>/groups', methods=['GET'])
@login_required
@admin_required
def get_user_groups(user_id):
    groups = user_group_model.get_user_groups(user_id)
    return jsonify({'success': True, 'data': groups})


@app.route('/api/projects/<int:project_id>/permissions', methods=['GET'])
@login_required
def get_project_permissions(project_id):
    if not is_admin_or_in_admin_group():
        return jsonify({'success': False, 'error': '没有权限'}), 403
    permissions = project_permission_model.get_project_permissions(project_id)
    return jsonify({'success': True, 'data': permissions})


@app.route('/api/project-permissions', methods=['POST'])
@login_required
def grant_project_permission():
    if not is_admin_or_in_admin_group():
        return jsonify({'success': False, 'error': '没有权限'}), 403
    
    data = request.get_json()
    project_id = data.get('project_id')
    user_id = data.get('user_id')
    group_id = data.get('group_id')
    
    if not project_id or (not user_id and not group_id):
        return jsonify({'success': False, 'error': '缺少必要参数'}), 400
    
    try:
        permission_id = project_permission_model.grant_permission(project_id, user_id, group_id)
        return jsonify({'success': True, 'data': {'id': permission_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/project-permissions/<int:permission_id>', methods=['DELETE'])
@login_required
def revoke_project_permission(permission_id):
    if not is_admin_or_in_admin_group():
        return jsonify({'success': False, 'error': '没有权限'}), 403
    project_permission_model.revoke_permission(permission_id)
    return jsonify({'success': True})


@app.route('/api/projects/<int:project_id>/can-delete', methods=['GET'])
@login_required
def can_delete_project(project_id):
    can_delete = is_admin_or_in_admin_group()
    return jsonify({'success': True, 'data': {'can_delete': can_delete}})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
