// 从 URL 参数获取搜索关键词
const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q') || '';

if (initialQuery) {
    document.getElementById('searchInput').value = initialQuery;
    performSearch(initialQuery);
}

function handleSearch(event) {
    if (event.key === 'Enter') {
        doSearch();
    }
}

function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        performSearch(query);
    }
}

async function performSearch(query) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<p style="color: #999; text-align: center; margin-top: 40px;">搜索中...</p>';
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.success) {
            renderResults(result.data, query);
            document.title = `搜索: ${query}`;
        } else {
            resultsDiv.innerHTML = `<p style="color: #d32f2f; text-align: center; margin-top: 40px;">${result.error || '搜索失败'}</p>`;
        }
    } catch (error) {
        console.error('搜索失败:', error);
        resultsDiv.innerHTML = '<p style="color: #d32f2f; text-align: center; margin-top: 40px;">搜索失败</p>';
    }
}

function renderResults(data, query) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (data.length === 0) {
        resultsDiv.innerHTML = '<p style="color: #999; text-align: center; margin-top: 40px;">未找到匹配的提示词</p>';
        return;
    }
    
    resultsDiv.innerHTML = `<p class="search-count">共找到 ${data.length} 条结果</p>`;
    
    const keywords = query.split(/\s+/);
    
    data.forEach(prompt => {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        div.onclick = () => window.location.href = `/prompt/${prompt.id}`;
        
        const highlightedTitle = highlightText(prompt.title, keywords);
        const highlightedContent = highlightText(truncateText(prompt.content, 200), keywords);
        
        div.innerHTML = `
            <h3>${highlightedTitle}</h3>
            <p>${highlightedContent}</p>
            <div class="search-meta">
                <span>更新时间: ${prompt.updated_at}</span>
            </div>
        `;
        resultsDiv.appendChild(div);
    });
}

function highlightText(text, keywords) {
    if (!text) return '';
    let result = escapeHtml(text);
    keywords.forEach(kw => {
        if (!kw) return;
        const regex = new RegExp(escapeRegex(kw), 'gi');
        result = result.replace(regex, '<mark>$&</mark>');
    });
    return result;
}

function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
