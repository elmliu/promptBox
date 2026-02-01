let currentUser = null;
let apiKeys = [];

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            document.getElementById('currentUsername').textContent = currentUser.username;
            document.getElementById('username').textContent = currentUser.username;
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        window.location.href = '/login';
    }
}

async function loadApiKeys() {
    try {
        const response = await fetch('/api/api-keys');
        const result = await response.json();
        if (result.success) {
            apiKeys = result.data;
            renderApiKeys();
        }
    } catch (error) {
        console.error('加载API Key失败:', error);
    }
}

function renderApiKeys() {
    const container = document.getElementById('apiKeyList');
    
    if (apiKeys.length === 0) {
        container.innerHTML = '<div class="empty-text">暂无API Key</div>';
        return;
    }
    
    container.innerHTML = apiKeys.map(key => `
        <div class="api-key-item">
            <div class="api-key-info">
                <div class="api-key-name">${escapeHtml(key.name)}</div>
                <div class="api-key-meta">
                    <span>创建时间: ${formatDate(key.created_at)}</span>
                    ${key.last_used_at ? `<span>最后使用: ${formatDate(key.last_used_at)}</span>` : '<span>从未使用</span>'}
                </div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteApiKey(${key.id})">删除</button>
        </div>
    `).join('');
}

function showCreateApiKeyModal() {
    document.getElementById('apiKeyName').value = '';
    document.getElementById('createApiKeyModal').style.display = 'block';
}

async function createApiKey() {
    const name = document.getElementById('apiKeyName').value.trim();
    
    if (!name) {
        alert('请输入API Key名称');
        return;
    }
    
    try {
        const response = await fetch('/api/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('createApiKeyModal');
            document.getElementById('newApiKey').value = result.data.key;
            document.getElementById('showApiKeyModal').style.display = 'block';
            loadApiKeys();
        } else {
            alert(result.error || '创建API Key失败');
        }
    } catch (error) {
        console.error('创建API Key失败:', error);
        alert('创建API Key失败');
    }
}

async function deleteApiKey(keyId) {
    if (!confirm('确定要删除此API Key吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/api-keys/${keyId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadApiKeys();
        } else {
            alert(result.error || '删除API Key失败');
        }
    } catch (error) {
        console.error('删除API Key失败:', error);
        alert('删除API Key失败');
    }
}

function copyApiKey() {
    const apiKey = document.getElementById('newApiKey');
    apiKey.select();
    document.execCommand('copy');
    alert('API Key已复制到剪贴板');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
}

async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    if (!oldPassword || !newPassword || !confirmPassword) {
        alert('请填写所有密码字段');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('新密码长度至少为6位');
        return;
    }
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('密码修改成功，请重新登录');
            window.location.href = '/login';
        } else {
            alert(result.error || '密码修改失败');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        alert('修改密码失败');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    loadApiKeys();
});