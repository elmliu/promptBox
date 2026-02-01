let users = [];
let groups = [];
let projects = [];
let currentUserId = null;
let currentGroupId = null;
let currentProjectId = null;

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();
        if (result.success) {
            const userSpan = document.getElementById('currentUser');
            userSpan.innerHTML = `当前用户: <a href="/profile" style="color: #4CAF50; text-decoration: none; font-weight: 500;">${result.data.username}</a>`;
        }
    } catch (error) {
        console.error('获取当前用户失败:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        const result = await response.json();
        if (result.success) {
            users = result.data;
            renderUsers();
        }
    } catch (error) {
        console.error('加载用户失败:', error);
    }
}

function renderUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div class="user-info">
                <h3>${escapeHtml(user.username)}</h3>
                <p>${user.is_admin ? '管理员' : '普通用户'}</p>
                <p>创建时间: ${user.created_at}</p>
            </div>
            <div class="user-actions">
                <button class="btn btn-secondary btn-sm" onclick="showAssignGroupModal(${user.id})">分配用户组</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">删除</button>
            </div>
        `;
        usersList.appendChild(div);
    });
}

async function loadGroups() {
    try {
        const response = await fetch('/api/groups');
        const result = await response.json();
        if (result.success) {
            groups = result.data;
            renderGroups();
        }
    } catch (error) {
        console.error('加载用户组失败:', error);
    }
}

function renderGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';
    
    groups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'group-item';
        div.innerHTML = `
            <div class="group-info">
                <h3>${escapeHtml(group.name)}</h3>
                <p>${group.description ? escapeHtml(group.description) : '无描述'}</p>
                <p>创建时间: ${group.created_at}</p>
            </div>
            <div class="group-actions">
                <button class="btn btn-secondary btn-sm" onclick="loadGroupUsers(${group.id})">查看用户</button>
                ${group.name !== '管理员组' ? `<button class="btn btn-danger btn-sm" onclick="deleteGroup(${group.id})">删除</button>` : ''}
            </div>
        `;
        groupsList.appendChild(div);
    });
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const result = await response.json();
        if (result.success) {
            projects = result.data;
            renderProjects();
        }
    } catch (error) {
        console.error('加载项目失败:', error);
    }
}

async function renderProjects() {
    const permissionsList = document.getElementById('permissionsList');
    permissionsList.innerHTML = '';
    
    for (const project of projects) {
        const response = await fetch(`/api/projects/${project.id}/permissions`);
        const result = await response.json();
        const permissions = result.success ? result.data : [];
        
        const div = document.createElement('div');
        div.className = 'project-permission-item';
        div.innerHTML = `
            <div class="project-permission-header">
                <h3>${escapeHtml(project.name)}</h3>
                <button class="btn btn-primary btn-sm" onclick="showGrantPermissionModal(${project.id})">分配权限</button>
            </div>
            <div class="permissions-list">
                ${permissions.length === 0 ? '<p class="no-permissions">暂无权限分配</p>' : ''}
                ${permissions.map(perm => `
                    <div class="permission-item">
                        <span>${perm.group_name ? `用户组: ${escapeHtml(perm.group_name)}` : `用户: ${escapeHtml(perm.username)}`}</span>
                        <button class="btn btn-danger btn-sm" onclick="revokePermission(${perm.id})">撤销</button>
                    </div>
                `).join('')}
            </div>
        `;
        permissionsList.appendChild(div);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'groups') {
        loadGroups();
    } else if (tabName === 'permissions') {
        loadProjects();
    }
}

function showCreateUserModal() {
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newIsAdmin').checked = false;
    document.getElementById('createUserModal').classList.add('show');
}

async function createUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const isAdmin = document.getElementById('newIsAdmin').checked;
    
    if (!username || !password) {
        alert('用户名和密码不能为空');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, is_admin: isAdmin })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('createUserModal');
            loadUsers();
        } else {
            alert(result.error || '创建用户失败');
        }
    } catch (error) {
        console.error('创建用户失败:', error);
        alert('创建用户失败');
    }
}

async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            loadUsers();
        } else {
            alert(result.error || '删除用户失败');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除用户失败');
    }
}

function showCreateGroupModal() {
    document.getElementById('newGroupName').value = '';
    document.getElementById('newGroupDescription').value = '';
    document.getElementById('createGroupModal').classList.add('show');
}

async function createGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    const description = document.getElementById('newGroupDescription').value.trim();
    
    if (!name) {
        alert('组名不能为空');
        return;
    }
    
    try {
        const response = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('createGroupModal');
            loadGroups();
        } else {
            alert(result.error || '创建用户组失败');
        }
    } catch (error) {
        console.error('创建用户组失败:', error);
        alert('创建用户组失败');
    }
}

async function deleteGroup(groupId) {
    if (!confirm('确定要删除这个用户组吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            loadGroups();
        } else {
            alert(result.error || '删除用户组失败');
        }
    } catch (error) {
        console.error('删除用户组失败:', error);
        alert('删除用户组失败');
    }
}

async function showAssignGroupModal(userId) {
    currentUserId = userId;
    
    try {
        const response = await fetch('/api/groups');
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('groupSelect');
            select.innerHTML = '';
            result.data.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                select.appendChild(option);
            });
            document.getElementById('assignGroupModal').classList.add('show');
        }
    } catch (error) {
        console.error('加载用户组失败:', error);
        alert('加载用户组失败');
    }
}

async function assignGroup() {
    const groupId = parseInt(document.getElementById('groupSelect').value);
    
    try {
        const response = await fetch('/api/user-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, group_id: groupId })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('assignGroupModal');
            alert('分配成功');
        } else {
            alert(result.error || '分配失败');
        }
    } catch (error) {
        console.error('分配失败:', error);
        alert('分配失败');
    }
}

async function showGrantPermissionModal(projectId) {
    currentProjectId = projectId;
    
    try {
        const [groupsResponse, usersResponse] = await Promise.all([
            fetch('/api/groups'),
            fetch('/api/users')
        ]);
        
        const groupsResult = await groupsResponse.json();
        const usersResult = await usersResponse.json();
        
        if (groupsResult.success) {
            const groupSelect = document.getElementById('permissionGroupSelect');
            groupSelect.innerHTML = '';
            groupsResult.data.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        }
        
        if (usersResult.success) {
            const userSelect = document.getElementById('permissionUserSelect');
            userSelect.innerHTML = '';
            usersResult.data.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                userSelect.appendChild(option);
            });
        }
        
        document.getElementById('grantPermissionModal').classList.add('show');
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败');
    }
}

function togglePermissionOptions() {
    const type = document.getElementById('permissionType').value;
    document.getElementById('groupOption').style.display = type === 'group' ? 'block' : 'none';
    document.getElementById('userOption').style.display = type === 'user' ? 'block' : 'none';
}

async function grantPermission() {
    const type = document.getElementById('permissionType').value;
    const data = { project_id: currentProjectId };
    
    if (type === 'group') {
        data.group_id = parseInt(document.getElementById('permissionGroupSelect').value);
    } else {
        data.user_id = parseInt(document.getElementById('permissionUserSelect').value);
    }
    
    try {
        const response = await fetch('/api/project-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('grantPermissionModal');
            loadProjects();
        } else {
            alert(result.error || '分配权限失败');
        }
    } catch (error) {
        console.error('分配权限失败:', error);
        alert('分配权限失败');
    }
}

async function revokePermission(permissionId) {
    if (!confirm('确定要撤销这个权限吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/project-permissions/${permissionId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            loadProjects();
        } else {
            alert(result.error || '撤销权限失败');
        }
    } catch (error) {
        console.error('撤销权限失败:', error);
        alert('撤销权限失败');
    }
}

async function loadGroupUsers(groupId) {
    try {
        const response = await fetch(`/api/groups/${groupId}/users`);
        const result = await response.json();
        
        if (result.success) {
            const users = result.data;
            const usernames = users.map(u => u.username).join(', ');
            alert(`该组包含用户: ${usernames || '无'}`);
        }
    } catch (error) {
        console.error('加载用户失败:', error);
        alert('加载用户失败');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

function goHome() {
    window.location.href = '/';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadCurrentUser();
loadUsers();
