async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorElement = document.getElementById('error-message');
    
    if (!username || !password) {
        errorElement.textContent = '用户名和密码不能为空';
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/';
        } else {
            errorElement.textContent = result.error || '登录失败';
        }
    } catch (error) {
        console.error('登录失败:', error);
        errorElement.textContent = '登录失败，请稍后重试';
    }
}

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

document.getElementById('username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});
