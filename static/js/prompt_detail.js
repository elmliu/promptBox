let isEditMode = false;
let promptData = null;
let versions = [];
let currentVersionId = null;
let selectedVersionId = null;

async function loadPrompt() {
    try {
        const response = await fetch(`/api/prompts/${promptId}`);
        const result = await response.json();
        
        if (result.success) {
            promptData = result.data;
            displayPrompt();
            loadVersions();
        } else {
            alert('加载提示词失败');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('加载提示词失败:', error);
        alert('加载提示词失败');
        window.location.href = '/';
    }
}

async function loadVersions() {
    try {
        const response = await fetch(`/api/prompts/${promptId}/versions`);
        const result = await response.json();
        
        if (result.success) {
            versions = result.data;
            selectedVersionId = null;
            displayVersions();
        }
    } catch (error) {
        console.error('加载版本失败:', error);
    }
}

function displayVersions() {
    const versionList = document.getElementById('versionList');
    versionList.innerHTML = '';
    
    if (versions.length === 0) {
        versionList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 20px;">暂无历史版本</p>';
        return;
    }
    
    const latestDiv = document.createElement('div');
    latestDiv.className = `version-item ${selectedVersionId === 'latest' ? 'active' : ''} current`;
    latestDiv.onclick = () => selectLatestVersion();
    
    const latestCreatedAt = new Date(promptData.updated_at).toLocaleString('zh-CN');
    
    latestDiv.innerHTML = `
        <h3>最新版本</h3>
        <p>${latestCreatedAt}</p>
    `;
    
    versionList.appendChild(latestDiv);
    
    versions.forEach(version => {
        const div = document.createElement('div');
        div.className = `version-item ${selectedVersionId === version.id ? 'active' : ''}`;
        div.onclick = (e) => {
            if (!e.target.closest('.version-actions')) {
                selectVersion(version.id);
            }
        };
        
        const versionName = version.version_name || `版本 ${version.version_number}`;
        const createdAt = new Date(version.created_at).toLocaleString('zh-CN');
        
        div.innerHTML = `
            <h3>${escapeHtml(versionName)}</h3>
            <p>${createdAt}</p>
            <div class="version-actions">
                <button class="btn-icon" onclick="showRenameVersionModal(${version.id})">重命名</button>
                <button class="btn-icon" onclick="restoreVersion(${version.id})">恢复</button>
            </div>
        `;
        
        versionList.appendChild(div);
    });
}

function selectLatestVersion() {
    selectedVersionId = 'latest';
    displayVersions();
    displayPrompt();
}

function selectVersion(versionId) {
    selectedVersionId = versionId;
    displayVersions();
    
    const version = versions.find(v => v.id === versionId);
    if (version) {
        displayVersion(version);
    }
}

function displayVersion(version) {
    document.getElementById('promptTitle').textContent = version.title;
    document.getElementById('promptTitleInput').value = version.title;
    document.getElementById('promptContentInput').value = version.content;
    document.getElementById('createdAt').textContent = version.created_at;
    document.getElementById('updatedAt').textContent = version.created_at;
    
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.querySelector('.btn-danger');
    
    editBtn.disabled = true;
    editBtn.textContent = '历史版本不可编辑';
    saveBtn.style.display = 'none';
    deleteBtn.disabled = true;
}

function displayPrompt() {
    document.getElementById('promptTitle').textContent = promptData.title;
    document.getElementById('promptTitleInput').value = promptData.title;
    document.getElementById('promptContentInput').value = promptData.content;
    document.getElementById('createdAt').textContent = promptData.created_at;
    document.getElementById('updatedAt').textContent = promptData.updated_at;
    
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.querySelector('.btn-danger');
    
    editBtn.disabled = false;
    editBtn.textContent = '编辑';
    deleteBtn.disabled = false;
}

function toggleEditMode() {
    const isCurrentVersion = selectedVersionId === 'latest' || selectedVersionId === null;
    
    if (!isCurrentVersion) {
        alert('历史版本不可编辑');
        return;
    }
    
    isEditMode = !isEditMode;
    const titleInput = document.getElementById('promptTitleInput');
    const contentInput = document.getElementById('promptContentInput');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (isEditMode) {
        titleInput.removeAttribute('readonly');
        contentInput.removeAttribute('readonly');
        editBtn.textContent = '取消';
        saveBtn.style.display = 'inline-block';
    } else {
        titleInput.setAttribute('readonly', true);
        contentInput.setAttribute('readonly', true);
        editBtn.textContent = '编辑';
        saveBtn.style.display = 'none';
        
        titleInput.value = promptData.title;
        contentInput.value = promptData.content;
    }
}

async function savePrompt() {
    const title = document.getElementById('promptTitleInput').value.trim();
    const content = document.getElementById('promptContentInput').value.trim();
    
    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }
    
    try {
        const response = await fetch(`/api/prompts/${promptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        const result = await response.json();
        
        if (result.success) {
            promptData.title = title;
            promptData.content = content;
            toggleEditMode();
            displayPrompt();
            loadVersions();
        } else {
            alert(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败');
    }
}

async function restoreVersion(versionId) {
    if (!confirm('确定要将此版本恢复为最新版本吗？当前最新版本将被覆盖。')) {
        return;
    }
    
    const version = versions.find(v => v.id === versionId);
    if (version) {
        try {
            const response = await fetch(`/api/prompts/${promptId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: version.title, 
                    content: version.content 
                })
            });
            const result = await response.json();
            
            if (result.success) {
                alert('恢复成功');
                loadPrompt();
            } else {
                alert(result.error || '恢复失败');
            }
        } catch (error) {
            console.error('恢复失败:', error);
            alert('恢复失败');
        }
    }
}

async function deletePrompt() {
    if (!confirm('确定要删除这个提示词吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/prompts/${promptId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/';
        } else {
            alert(result.error || '删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败');
    }
}

function showRenameVersionModal(versionId) {
    currentVersionId = versionId;
    const version = versions.find(v => v.id === versionId);
    document.getElementById('versionNameInput').value = version.version_name || '';
    document.getElementById('renameVersionModal').classList.add('show');
}

async function renameVersion() {
    const versionName = document.getElementById('versionNameInput').value.trim();
    
    if (!versionName) {
        alert('版本名称不能为空');
        return;
    }
    
    try {
        const response = await fetch(`/api/versions/${currentVersionId}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version_name: versionName })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('renameVersionModal');
            loadVersions();
        } else {
            alert(result.error || '重命名失败');
        }
    } catch (error) {
        console.error('重命名失败:', error);
        alert('重命名失败');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function goBack() {
    window.location.href = '/';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();
        if (result.success) {
            const userSpan = document.getElementById('currentUser');
            userSpan.innerHTML = `<a href="/profile" style="color: #4CAF50; text-decoration: none; font-weight: 500;">${result.data.username}</a>`;
        }
    } catch (error) {
        console.error('获取当前用户失败:', error);
    }
}

loadCurrentUser();
loadPrompt();
