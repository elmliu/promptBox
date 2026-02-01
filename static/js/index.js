let currentProjectId = null;
let projects = [];
let prompts = [];

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        const result = await response.json();
        if (result.success) {
            const userSpan = document.getElementById('currentUser');
            userSpan.innerHTML = `当前用户: <a href="/profile" style="color: #4CAF50; text-decoration: none; font-weight: 500;">${result.data.username}</a>`;
            
            const adminButton = document.querySelector('button[onclick*="/admin"]');
            if (adminButton) {
                if (result.data.is_admin) {
                    adminButton.style.display = 'inline-block';
                } else {
                    adminButton.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('获取当前用户失败:', error);
    }
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

function renderProjects() {
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = '';
    
    projects.forEach(project => {
        const div = document.createElement('div');
        div.className = `project-item ${currentProjectId === project.id ? 'active' : ''}`;
        div.onclick = () => selectProject(project.id);
        div.innerHTML = `
            <h3>${escapeHtml(project.name)}</h3>
            ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
        `;
        projectList.appendChild(div);
    });
}

function selectProject(projectId) {
    currentProjectId = projectId;
    const project = projects.find(p => p.id === projectId);
    document.getElementById('currentProjectTitle').textContent = project ? project.name : '所有提示词';
    document.getElementById('createPromptBtn').disabled = !projectId;
    renderProjects();
    loadPrompts();
    checkCanDeleteProject();
}

async function checkCanDeleteProject() {
    if (!currentProjectId) {
        document.getElementById('deleteProjectBtn').style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}/can-delete`);
        const result = await response.json();
        if (result.success && result.data.can_delete) {
            document.getElementById('deleteProjectBtn').style.display = 'inline-block';
        } else {
            document.getElementById('deleteProjectBtn').style.display = 'none';
        }
    } catch (error) {
        console.error('检查删除权限失败:', error);
        document.getElementById('deleteProjectBtn').style.display = 'none';
    }
}

async function loadPrompts() {
    try {
        const url = currentProjectId ? `/api/prompts?project_id=${currentProjectId}` : '/api/prompts';
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
            prompts = result.data;
            renderPrompts();
        }
    } catch (error) {
        console.error('加载提示词失败:', error);
    }
}

function renderPrompts() {
    const promptList = document.getElementById('promptList');
    promptList.innerHTML = '';
    
    if (prompts.length === 0) {
        promptList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 40px;">暂无提示词</p>';
        return;
    }
    
    prompts.forEach(prompt => {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        div.onclick = () => window.location.href = `/prompt/${prompt.id}`;
        div.innerHTML = `
            <h3>${escapeHtml(prompt.title)}</h3>
            <p>${escapeHtml(prompt.content)}</p>
        `;
        promptList.appendChild(div);
    });
}

function showCreateProjectModal() {
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('createProjectModal').classList.add('show');
}

function showCreatePromptModal() {
    document.getElementById('promptTitle').value = '';
    document.getElementById('createPromptModal').classList.add('show');
}

function showDeleteProjectModal() {
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
        document.getElementById('deleteProjectName').textContent = project.name;
        document.getElementById('deleteProjectModal').classList.add('show');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

async function createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    
    if (!name) {
        alert('请输入项目名称');
        return;
    }
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('createProjectModal');
            loadProjects();
        } else {
            alert(result.error || '创建项目失败');
        }
    } catch (error) {
        console.error('创建项目失败:', error);
        alert('创建项目失败');
    }
}

async function createPrompt() {
    const title = document.getElementById('promptTitle').value.trim();
    
    if (!title) {
        alert('请输入标题');
        return;
    }
    
    try {
        const response = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: currentProjectId, title, content: '' })
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('createPromptModal');
            loadPrompts();
        } else {
            alert(result.error || '创建提示词失败');
        }
    } catch (error) {
        console.error('创建提示词失败:', error);
        alert('创建提示词失败');
    }
}

async function deleteProject() {
    if (!currentProjectId) {
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/${currentProjectId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            closeModal('deleteProjectModal');
            currentProjectId = null;
            document.getElementById('currentProjectTitle').textContent = '所有提示词';
            document.getElementById('createPromptBtn').disabled = true;
            document.getElementById('deleteProjectBtn').style.display = 'none';
            loadProjects();
            loadPrompts();
        } else {
            alert(result.error || '删除项目失败');
        }
    } catch (error) {
        console.error('删除项目失败:', error);
        alert('删除项目失败');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadCurrentUser();
loadProjects();
