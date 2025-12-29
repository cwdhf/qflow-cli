# Qflow CLI 安装和使用指南

## 一、构建项目

### 1. 完整构建流程

```bash
# 1. 清理旧构建文件
npm run clean

# 2. 生成必要的元数据文件
npm run generate

# 3. 构建所有工作区
npm run build

# 4. 创建可执行 bundle（推荐）
npm run bundle
```

### 2. 快速构建

```bash
# 直接执行完整构建流程
npm run build-and-start
```

### 3. 检查构建结果

```bash
# 验证 bundle 是否生成
ls -la bundle/
```

## 二、本地安装（当前系统）

### 方法一：直接运行（开发模式）

```bash
# 直接运行构建好的文件
node /Volumes/lp/code/qflow-cli/bundle/qflow.js

# 或创建别名（临时生效）
alias qflow="node /Volumes/lp/code/qflow-cli/bundle/qflow.js"

# 永久别名（macOS/Linux）
echo 'alias qflow="node /Volumes/lp/code/qflow-cli/bundle/qflow.js"' >> ~/.zshrc
source ~/.zshrc
```

### 方法二：全局安装（生产模式）

```bash
# 从项目根目录全局安装
cd /Volumes/lp/code/qflow-cli
npm install -g .

# 安装后直接使用
qflow --version
```

## 三、跨系统安装

### 方法一：复制 bundle 目录

1. 将整个 `bundle/` 目录复制到目标系统
2. 确保目标系统有 Node.js ≥20.0.0
3. 运行：

```bash
node /path/to/bundle/qflow.js
```

### 方法二：打包分发

```bash
# 1. 创建压缩包
cd /Volumes/lp/code/qflow-cli
tar -czf qflow-cli-bundle.tar.gz bundle/

# 2. 传输到目标系统（示例使用 scp）
scp qflow-cli-bundle.tar.gz user@remote-host:/path/to/destination

# 3. 在目标系统解压并运行
tar -xzf qflow-cli-bundle.tar.gz
node bundle/qflow.js
```

### 方法三：发布到 npm

```bash
# 1. 更新版本号
npm version patch  # 或 minor/major

# 2. 发布到 npm
npm publish

# 3. 在其他系统安装
npm install -g @cwdhf/qflow-cli
```

### 方法四：本地打包分发

```bash
# 1. 打包成 tarball
npm pack

# 2. 复制到目标机器（示例使用 scp）
scp qflow-cli-0.21.1-nightly.20251213.977248e09.tgz user@remote-host:/path/to/destination

# 3. 在目标机器安装
npm install -g qflow-cli-0.21.1-nightly.20251213.977248e09.tgz
```

## 四、环境配置

### 1. API 密钥配置

创建 `.env` 文件：

```env
# 方法一：使用 Gemini API
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_PROJECT=your_project_id

# 方法二：使用 OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=doubao-seed-1-8-251215
```

### 2. 配置文件位置

- **用户全局设置**：`~/.qflow/settings.json`
- **项目本地设置**：`./.qflow/settings.json`

### 3. 复制配置文件

```bash
# 将当前配置复制到用户目录
cp .env ~/.env
```

## 五、系统要求

- **Node.js**：≥20.0.0
- **操作系统**：macOS 13+, Linux (Ubuntu 22.04+), Windows 10+
- **网络**：需要访问 Google Gemini API 或 OpenAI API
- **磁盘空间**：≥50MB（包含 bundle 和依赖）

## 六、验证安装

```bash
# 检查 CLI 版本
qflow --version

# 查看帮助文档
qflow --help

# 验证 API 连接
qflow test-connection
```

## 七、注意事项

1. **首次运行**：首次启动会引导你配置 API 密钥
2. **受信任目录**：在受信任的目录运行以启用完整功能（如文件修改）
3. **可选依赖**：`node-pty` 是可选依赖，用于终端功能，安装失败不影响核心功能
4. **更新**：使用 `qflow update` 检查并更新到最新版本
5. **日志**：日志文件位于 `~/.qflow/logs/`

## 八、A2A 服务器安装和使用

### 1. A2A 服务器简介

A2A
(Agent-to-Agent) 服务器是一个独立的 HTTP 服务，提供基于 A2A 协议的代理通信能力。它与 qflow
CLI 是两个独立的程序，可以同时运行或分别运行。

### 2. 构建 A2A 服务器

#### 完整构建流程

```bash
# 1. 清理旧构建文件
npm run clean

# 2. 生成必要的元数据文件
npm run generate

# 3. 构建 A2A 服务器
cd packages/a2a-server
npm run build

# 4. 返回项目根目录
cd ../..
```

#### 快速构建（包含 A2A 服务器）

```bash
# 构建整个项目（包括 A2A 服务器）
npm run build

# 或使用 bundle 命令（会同时构建 CLI 和 A2A 服务器）
npm run bundle
```

### 3. 本地安装（当前系统）

#### 方法一：直接运行（开发模式）

```bash
# 直接运行构建好的 A2A 服务器
node /Volumes/lp/code/qflow-cli/packages/a2a-server/dist/a2a-server.mjs

# 或设置环境变量后运行
CODER_AGENT_PORT=41242 node /Volumes/lp/code/qflow-cli/packages/a2a-server/dist/a2a-server.mjs

# 或创建别名（临时生效）
alias a2a-server="node /Volumes/lp/code/qflow-cli/packages/a2a-server/dist/a2a-server.mjs"

# 永久别名（macOS/Linux）
echo 'alias a2a-server="node /Volumes/lp/code/qflow-cli/packages/a2a-server/dist/a2a-server.mjs"' >> ~/.zshrc
source ~/.zshrc
```

#### 方法二：通过 npm link（开发模式）

```bash
# 在 A2A 服务器目录创建链接
cd /Volumes/lp/code/qflow-cli/packages/a2a-server
npm link

# 使用链接运行
qflow-cli-a2a-server

# 或设置环境变量后运行
CODER_AGENT_PORT=41242 qflow-cli-a2a-server
```

#### 方法三：全局安装（生产模式）

```bash
# 从 A2A 服务器目录全局安装
cd /Volumes/lp/code/qflow-cli/packages/a2a-server
npm install -g .

# 安装后直接使用
qflow-cli-a2a-server

# 或设置环境变量后运行
CODER_AGENT_PORT=41242 qflow-cli-a2a-server
```

### 4. 跨系统安装

#### 方法一：复制 A2A 服务器文件

1. 将 `packages/a2a-server/dist/a2a-server.mjs` 文件复制到目标系统
2. 确保目标系统有 Node.js ≥20.0.0
3. 运行：

```bash
node /path/to/a2a-server.mjs

# 或设置环境变量后运行
CODER_AGENT_PORT=41242 node /path/to/a2a-server.mjs
```

#### 方法二：打包分发

```bash
# 1. 创建压缩包（只包含 A2A 服务器）
cd /Volumes/lp/code/qflow-cli
tar -czf a2a-server-bundle.tar.gz packages/a2a-server/dist/a2a-server.mjs

# 2. 传输到目标系统（示例使用 scp）
scp a2a-server-bundle.tar.gz user@remote-host:/path/to/destination

# 3. 在目标系统解压并运行
tar -xzf a2a-server-bundle.tar.gz
node packages/a2a-server/dist/a2a-server.mjs
```

#### 方法三：发布到 npm（独立包）

```bash
# 1. 进入 A2A 服务器目录
cd /Volumes/lp/code/qflow-cli/packages/a2a-server

# 2. 更新版本号
npm version patch  # 或 minor/major

# 3. 发布到 npm（需要先在 package.json 中配置正确的包名）
npm publish

# 4. 在其他系统安装
npm install -g @google/qflow-cli-a2a-server

# 5. 运行
qflow-cli-a2a-server
```

#### 方法四：本地打包分发

```bash
# 1. 打包成 tarball
cd /Volumes/lp/code/qflow-cli/packages/a2a-server
npm pack

# 2. 复制到目标机器（示例使用 scp）
scp qflow-cli-a2a-server-0.21.0-nightly.20251218.739c02bd6.tgz user@remote-host:/path/to/destination

# 3. 在目标机器安装
npm install -g qflow-cli-a2a-server-0.21.0-nightly.20251218.739c02bd6.tgz

# 4. 运行
qflow-cli-a2a-server
```

### 5. 环境配置

#### API 密钥配置

A2A 服务器支持多种认证方式，通过环境变量配置：

```env
# 方法一：使用 OpenAI API（推荐）
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# 方法二：使用 Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# 方法三：使用 Google Cloud Platform（CCPA）
USE_CCPA=true
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your_project_id
```

#### 服务器配置

```env
# 服务器端口（默认 41242）
CODER_AGENT_PORT=41242

# 日志级别（可选）
LOG_LEVEL=info
```

#### 配置文件位置

- **环境变量**：通过 `.env` 文件或系统环境变量设置
- **用户全局设置**：`~/.qflow/settings.json`（与 qflow CLI 共享）

### 6. 启动和验证

#### 启动 A2A 服务器

```bash
# 使用默认配置启动
qflow-cli-a2a-server

# 或指定端口启动
CODER_AGENT_PORT=41242 qflow-cli-a2a-server

# 或直接运行打包文件
CODER_AGENT_PORT=41242 node /path/to/a2a-server.mjs
```

#### 验证 A2A 服务器

```bash
# 1. 检查服务器是否启动成功
# 服务器启动后会显示：
# [INFO] [CoreAgent] Agent Server started on http://localhost:41242
# [INFO] [CoreAgent] Agent Card: http://localhost:41242/.well-known/agent-card.json

# 2. 访问 Agent Card（使用 curl）
curl http://localhost:41242/.well-known/agent-card.json

# 3. 测试服务器健康状态
curl http://localhost:41242/health
```

#### Agent Card 示例

```json
{
  "name": "Qflow CLI Agent",
  "version": "0.21.0",
  "description": "AI agent for development tasks",
  "capabilities": [
    "code_generation",
    "file_operations",
    "shell_commands",
    "web_fetch"
  ],
  "endpoints": {
    "tasks": "/tasks",
    "commands": "/commands"
  }
}
```

### 7. A2A 协议使用

#### 创建任务

```bash
# 使用 curl 创建新任务
curl -X POST http://localhost:41242/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a new React component",
    "context": {
      "project_path": "/path/to/project"
    }
  }'
```

#### 执行命令

```bash
# 使用 curl 执行命令
curl -X POST http://localhost:41242/commands/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "npm test",
    "working_directory": "/path/to/project"
  }'
```

#### 使用 development-tool 扩展

A2A 服务器支持 `development-tool` 扩展，提供开发特定的功能：

- 代码生成
- 工具调用
- 实时状态更新
- 文件操作

详见：`packages/a2a-server/development-extension-rfc.md`

### 8. 与 qflow CLI 的关系

- **独立性**：A2A 服务器是完全独立的程序，不依赖 qflow CLI
- **同时运行**：可以同时运行 qflow CLI 和 A2A 服务器
- **不同用途**：
  - qflow CLI：交互式命令行工具
  - A2A 服务器：提供 HTTP API 服务

### 9. 注意事项

1. **端口占用**：确保指定的端口（默认 41242）未被其他程序占用
2. **API 密钥**：必须配置至少一种认证方式（OpenAI、Gemini 或 CCPA）
3. **网络访问**：A2A 服务器需要访问配置的 API 服务
4. **日志文件**：日志输出到控制台，可以重定向到文件
5. **生产环境**：建议使用进程管理工具（如 PM2）来管理 A2A 服务器

### 10. 进程管理（生产环境）

#### 使用 PM2 管理

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 创建 PM2 配置文件（ecosystem.config.js）
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'a2a-server',
    script: '/path/to/a2a-server.mjs',
    env: {
      NODE_ENV: 'production',
      CODER_AGENT_PORT: 41242,
      OPENAI_API_KEY: 'your_api_key_here'
    },
    error_file: '/var/log/a2a-server/error.log',
    out_file: '/var/log/a2a-server/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# 3. 启动 A2A 服务器
pm2 start ecosystem.config.js

# 4. 查看状态
pm2 status

# 5. 查看日志
pm2 logs a2a-server

# 6. 重启服务
pm2 restart a2a-server

# 7. 停止服务
pm2 stop a2a-server
```

#### 使用 systemd 管理（Linux）

```bash
# 1. 创建 systemd 服务文件
sudo nano /etc/systemd/system/a2a-server.service

# 2. 添加以下内容
[Unit]
Description=A2A Server
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/a2a-server
Environment="CODER_AGENT_PORT=41242"
Environment="OPENAI_API_KEY=your_api_key_here"
ExecStart=/usr/bin/node /path/to/a2a-server.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# 3. 重载 systemd 配置
sudo systemctl daemon-reload

# 4. 启动服务
sudo systemctl start a2a-server

# 5. 设置开机自启
sudo systemctl enable a2a-server

# 6. 查看状态
sudo systemctl status a2a-server

# 7. 查看日志
sudo journalctl -u a2a-server -f
```

## 九、故障排除

### 常见问题

1. **权限问题**：

```bash
# 解决全局安装权限问题
sudo chown -R $USER /usr/local/lib/node_modules
```

2. **Node 版本不兼容**：

```bash
# 使用 nvm 管理 Node 版本
nvm install 20
nvm use 20
```

3. **API 连接失败**：

- 检查网络连接
- 验证 API 密钥是否正确
- 确保防火墙允许出站连接

4. **Bundle 运行错误**：

```bash
# 重新构建 bundle
npm run clean && npm run bundle
```

5. **A2A 服务器启动失败**：

```bash
# 检查端口是否被占用
lsof -i :41242

# 检查环境变量配置
echo $OPENAI_API_KEY
echo $GEMINI_API_KEY

# 查看详细日志
CODER_AGENT_PORT=41242 node /path/to/a2a-server.mjs --debug
```

6. **A2A 服务器无法访问**：

```bash
# 检查防火墙设置
# macOS
sudo pfctl -s rules | grep 41242

# Linux
sudo iptables -L -n | grep 41242

# 检查服务器是否正在运行
curl http://localhost:41242/.well-known/agent-card.json
```
