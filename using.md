✦ 构建完成的 Gemini CLI 安装方法：

1. 本地安装（当前系统）

方法一：直接运行 1 # 直接运行构建好的文件 2 node
/Volumes/lp/code/gemini-cli/bundle/gemini.js 3 4 # 或创建别名 5 alias
gemini="node /Volumes/lp/code/gemini-cli/bundle/gemini.js"

方法二：全局安装 1 # 从项目根目录安装 2 cd /Volumes/lp/code/gemini-cli 3 npm
install -g . 4 5 # 安装后直接使用 6 gemini

2. 其他系统安装

方法一：复制 bundle 目录

1.  将整个 bundle/ 目录复制到目标系统
2.  确保目标系统有 Node.js ≥20.0.0
3.  运行：1 node /path/to/bundle/gemini.js

方法二：打包分发 1 # 1. 创建压缩包 2 cd /Volumes/lp/code/gemini-cli 3 tar -czf
gemini-cli-bundle.tar.gz bundle/ 4 5 # 2. 传输到目标系统 6 # 3. 解压并运行 7 tar
-xzf gemini-cli-bundle.tar.gz 8 node bundle/gemini.js

3. 环境配置

`.env` 文件配置：1 # 在项目根目录或用户主目录创建 .env 文件 2
GEMINI_API_KEY=your_api_key_here 3 GOOGLE_CLOUD_PROJECT=your_project_id

配置文件位置：

- 用户设置：~/.gemini/settings.json
- 项目设置：项目目录/.gemini/settings.json cp .env ~/.env

4. 系统要求

- Node.js ≥20.0.0
- 支持的操作系统：macOS、Linux、Windows
- 网络连接（访问 Gemini API）

5. 验证安装 1 # 检查版本 2 gemini --version 3 4 # 检查帮助 5 gemini --help

6. 注意事项

- 首次运行需要配置 API 密钥
- 确保有足够的磁盘空间（bundle 约 22MB）
- 在受信任的目录运行以启用完整功能
