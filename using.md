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
node /Volumes/lp/code/gemini-cli/bundle/qflow.js

# 或创建别名（临时生效）
alias qflow="node /Volumes/lp/code/gemini-cli/bundle/qflow.js"

# 永久别名（macOS/Linux）
echo 'alias qflow="node /Volumes/lp/code/gemini-cli/bundle/qflow.js"' >> ~/.zshrc
source ~/.zshrc
```

### 方法二：全局安装（生产模式）

```bash
# 从项目根目录全局安装
cd /Volumes/lp/code/gemini-cli
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
cd /Volumes/lp/code/gemini-cli
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
scp gemini-cli-0.21.1-nightly.20251213.977248e09.tgz user@remote-host:/path/to/destination

# 3. 在目标机器安装
npm install -g gemini-cli-0.21.1-nightly.20251213.977248e09.tgz
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

## 八、故障排除

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
