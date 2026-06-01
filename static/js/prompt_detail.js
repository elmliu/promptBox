let isEditMode = false;
let promptData = null;
let versions = [];
let currentVersionId = null;
let selectedVersionId = null;
let promptTags = [];
let projectTags = [];

async function loadPrompt() {
    try {
        const response = await fetch(`/api/prompts/${promptId}`);
        const result = await response.json();
        
        if (result.success) {
            promptData = result.data;
            displayPrompt();
            loadVersions();
            loadPromptTags();
            loadProjectTags();
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

async function loadPromptTags() {
    try {
        const response = await fetch(`/api/prompts/${promptId}/tags`);
        const result = await response.json();
        if (result.success) {
            promptTags = result.data;
            renderPromptTags();
        }
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

async function loadProjectTags() {
    if (!promptData) return;
    try {
        const response = await fetch(`/api/projects/${promptData.project_id}/tags`);
        const result = await response.json();
        if (result.success) {
            projectTags = result.data;
            renderExistingTagsList();
        }
    } catch (error) {
        console.error('加载项目标签失败:', error);
    }
}

function renderPromptTags() {
    const tagList = document.getElementById('promptTagList');
    tagList.innerHTML = '';
    
    promptTags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-item';
        span.innerHTML = `${escapeHtml(tag.name)}<span class="tag-remove" onclick="removeTag(${tag.id})">&times;</span>`;
        tagList.appendChild(span);
    });
}

function renderExistingTagsList() {
    const datalist = document.getElementById('existingTagsList');
    datalist.innerHTML = '';
    
    const promptTagIds = promptTags.map(t => t.id);
    projectTags.filter(t => !promptTagIds.includes(t.id)).forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.name;
        datalist.appendChild(option);
    });
}

async function addTag(tagName) {
    tagName = tagName.trim();
    if (!tagName) return;
    
    // Check if this tag already exists in project
    const existingTag = projectTags.find(t => t.name === tagName);
    
    try {
        const body = existingTag ? { tag_id: existingTag.id } : { tag_name: tagName };
        const response = await fetch(`/api/prompts/${promptId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.success) {
            loadPromptTags();
            loadProjectTags();
        } else {
            alert(result.error || '添加标签失败');
        }
    } catch (error) {
        console.error('添加标签失败:', error);
    }
}

async function removeTag(tagId) {
    try {
        const response = await fetch(`/api/prompts/${promptId}/tags/${tagId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            loadPromptTags();
            loadProjectTags();
        }
    } catch (error) {
        console.error('移除标签失败:', error);
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
    document.title = promptData.title;
    document.getElementById('promptTitle').textContent = promptData.title;
    document.getElementById('promptTitleInput').value = promptData.title;
    document.getElementById('promptContentInput').value = promptData.content;
    document.getElementById('createdAt').textContent = promptData.created_at;
    document.getElementById('updatedAt').textContent = promptData.updated_at;
    
    const projectInfo = document.getElementById('promptProjectInfo');
    if (promptData.project_name) {
        projectInfo.innerHTML = `<span class="project-badge">📁 ${escapeHtml(promptData.project_name)}</span>`;
    }
    
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
            if (promptData && promptData.project_id) {
                window.location.href = '/?project_id=' + promptData.project_id;
            } else {
                window.location.href = '/';
            }
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
    if (promptData && promptData.project_id) {
        window.location.href = '/?project_id=' + promptData.project_id;
    } else {
        window.location.href = '/';
    }
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

// Tag input handler
document.getElementById('tagInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = this.value.trim();
        if (value) {
            addTag(value);
            this.value = '';
        }
    }
});
