# PromptBox

一个轻量简洁、功能完备的提示词管理系统，基于Python Flask和SQLite构建，支持项目分类管理、提示词版本控制、完善的权限管理和REST API接口。适合中小型团队管理提示词。

## 项目亮点

### 1. 轻量简洁

- **零依赖部署**：仅需Flask和SQLite，无需额外数据库服务
- **快速启动**：一键运行，自动初始化数据库
- **简洁界面**：直观的Web界面，操作流畅
- **单文件数据库**：SQLite数据库，易于备份和迁移

### 2. 权限管理功能完备

- **用户管理**：创建、查看、删除用户，支持管理员标识
- **用户组管理**：灵活的用户组体系，支持批量权限分配
- **项目管理**：基于项目的权限隔离，确保数据安全
- **权限检查**：细粒度的项目访问控制，防止未授权访问
- **API Key认证**：支持API Key调用，便于外部系统集成
  - Header方式：`X-API-Key: your_api_key`
  - Query参数方式：`?api_key=your_api_key`
  - 安全存储：API Key哈希存储，不暴露明文
  - 使用追踪：记录最后使用时间

### 3. REST API接口支持完备

- **标准化接口**：遵循RESTful设计规范
- **双重认证**：同时支持Session和API Key认证
- **权限验证**：所有数据接口均进行权限检查
- **统一响应**：JSON格式响应，包含success和data/error字段
- **错误处理**：完善的错误提示和HTTP状态码

## 功能特性

### 核心功能

- **项目管理**：创建、查看、编辑、删除项目
- **提示词管理**：创建、查看、编辑、删除提示词
- **版本控制**：自动保存历史版本，支持版本恢复
- **版本命名**：为重要版本添加自定义名称
- **按项目分类**：清晰的层级结构，便于管理

### 权限管理

- **用户认证**：用户名密码登录，Session管理
- **管理员系统**：内置admin账户，支持管理员组
- **用户组管理**：创建、查看、删除用户组
- **用户组成员管理**：灵活的成员分配
- **项目权限分配**：支持用户和用户组两种授权方式
- **权限继承**：管理员组成员自动获得所有项目权限

### 个人中心

- **个人信息查看**：展示用户基本信息
- **密码修改**：安全的密码更新流程
- **API Key管理**：
  - 创建新的API Key
  - 查看已有API Key列表
  - 删除API Key
  - 复制API Key到剪贴板

### 后台管理

- **用户管理**：创建、删除用户
- **用户组管理**：创建、删除用户组
- **项目权限管理**：查看、授予、撤销项目权限

## 项目结构

```
prompt/
├── app.py                      # Flask应用主文件
├── models.py                   # 数据库模型和业务逻辑
├── requirements.txt            # Python依赖
├── prompts.db                  # SQLite数据库（自动生成）
├── static/
│   ├── css/
│   │   ├── style.css          # 全局样式文件
│   │   └── profile.css       # 个人页面样式
│   └── js/
│       ├── index.js           # 首页交互逻辑
│       ├── admin.js           # 管理页面交互逻辑
│       ├── prompt_detail.js   # 提示词详情页交互逻辑
│       └── profile.js        # 个人页面交互逻辑
└── templates/
    ├── index.html             # 首页
    ├── login.html            # 登录页
    ├── admin.html            # 后台管理页
    ├── profile.html          # 个人中心页
    └── prompt_detail.html     # 提示词详情页
```

## 快速开始

### 环境要求

- Python 3.7+
- pip包管理器

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行应用

```bash
python app.py
```

应用将在 http://localhost:5000 启动。

### 默认账号

系统首次运行时会自动创建默认管理员账号：

- 用户名：`admin`
- 密码：`admin123`

**安全建议**：首次登录后请立即修改默认密码！

## 使用说明

### Web界面使用

1. **登录系统**

   - 访问 http://localhost:5000
   - 使用默认账号登录
2. **创建项目**

   - 点击左侧"+ 新建项目"按钮
   - 输入项目名称和描述
   - 创建者和管理员组自动获得项目权限
3. **管理提示词**

   - 选择项目后，点击"+ 新建提示词"
   - 输入提示词标题和内容
   - 点击提示词进入详情页进行编辑
4. **版本管理**

   - 编辑提示词时自动创建新版本
   - 点击历史版本可恢复到任意版本
   - 为重要版本添加自定义名称
5. **权限管理**（管理员）

   - 访问 http://localhost:5000/admin
   - 创建用户和用户组
   - 为用户或用户组分配项目权限
6. **个人中心**

   - 点击顶部用户名进入个人中心
   - 修改密码
   - 创建和管理API Key

### API接口使用

#### 认证方式

系统支持两种认证方式：

**方式一：Session认证（Web界面）**

```bash
# 先登录获取Session
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**方式二：API Key认证（外部系统集成）**

```bash
# Header方式（推荐）
curl -H "X-API-Key: pk_your_api_key_here" \
  http://localhost:5000/api/projects

# Query参数方式
curl "http://localhost:5000/api/projects?api_key=pk_your_api_key_here"
```

#### API接口列表

##### 项目相关

- `GET /api/projects` - 获取所有项目（需权限）
- `POST /api/projects` - 创建项目
- `GET /api/projects/<id>` - 获取项目详情
- `PUT /api/projects/<id>` - 更新项目
- `DELETE /api/projects/<id>` - 删除项目

##### 提示词相关

- `GET /api/prompts?project_id=<id>` - 获取提示词列表
- `POST /api/prompts` - 创建提示词
- `GET /api/prompts/<id>` - 获取提示词详情
- `PUT /api/prompts/<id>` - 更新提示词
- `DELETE /api/prompts/<id>` - 删除提示词

##### 版本相关

- `GET /api/prompts/<id>/versions` - 获取提示词的所有版本
- `GET /api/versions/<id>` - 获取版本详情
- `PUT /api/versions/<id>/rename` - 重命名版本

##### 用户相关

- `GET /api/current-user` - 获取当前用户信息
- `POST /api/change-password` - 修改密码
- `POST /api/logout` - 退出登录

##### API Key相关

- `GET /api/api-keys` - 获取当前用户的API Key列表
- `POST /api/api-keys` - 创建新的API Key
- `DELETE /api/api-keys/<id>` - 删除API Key

##### 管理接口（需管理员权限）

- `GET /api/users` - 获取所有用户
- `POST /api/users` - 创建用户
- `DELETE /api/users/<id>` - 删除用户
- `GET /api/groups` - 获取所有用户组
- `POST /api/groups` - 创建用户组
- `PUT /api/groups/<id>` - 更新用户组
- `DELETE /api/groups/<id>` - 删除用户组
- `GET /api/user-groups` - 获取用户组成员
- `POST /api/user-groups` - 添加用户到用户组
- `DELETE /api/user-groups` - 从用户组移除用户
- `GET /api/projects/<id>/permissions` - 获取项目权限列表
- `POST /api/project-permissions` - 授予项目权限
- `DELETE /api/project-permissions/<id>` - 撤销项目权限

#### API响应格式

**成功响应：**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "项目名称"
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "错误信息"
}
```

#### 权限说明

- 普通用户只能访问有权限的项目和提示词
- 管理员可以访问所有数据
- 管理员组成员自动获得所有项目权限
- 未授权访问返回403状态码

#### 删除权限规则

| 操作           | 权限要求        | 说明                                       |
| -------------- | --------------- | ------------------------------------------ |
| 删除项目       | 管理员/管理员组 | 只有管理员可以删除                         |
| 删除提示词     | 登录用户        | 管理员可删除任意；普通用户只能删除有权限的 |
| 删除用户       | 管理员          | 不能删除自己                               |
| 删除用户组     | 管理员          | 只有管理员可以删除                         |
| 删除用户组成员 | 管理员          | 只有管理员可以移除                         |
| 删除项目权限   | 管理员          | 只有管理员可以撤销                         |
| 删除API Key    | 登录用户        | 只能删除自己的                             |

## License

MIT License
