# Deepseek + MCP MySQL 查询助手

这是一个使用 Deepseek 大模型和 MCP (Model Context Protocol) 进行 MySQL 数据库查询的 Next.js 应用。

## 功能特点

- 使用 Deepseek 进行智能对话
- 通过 MCP 方式进行 MySQL 数据库查询
- 简洁直观的聊天界面
- 自动检测是否需要数据库查询
- 支持查询数据库表结构和执行 SQL 查询

## 技术栈

- Next.js 14
- React
- TypeScript
- MCP (Model Context Protocol)
- MySQL

## 项目结构

```
├── app/                   # Next.js 应用目录
│   ├── api/               # API 路由
│   │   └── chat/          # 聊天 API
│   │       └── route.js   # 聊天路由处理
│   └── page.tsx           # 首页（聊天界面）
├── mcp-server.js          # MCP 服务器（MySQL 查询）
├── .env                   # 环境变量配置
└── package.json           # 项目依赖
```

## 环境变量配置

在根目录创建 `.env` 文件，添加以下配置：

```
# Deepseek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_BASE_URL=https://api.deepseek.com

# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=your_database_name

# MCP配置
MCP_PORT=3001
```

## 安装和使用

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量（修改 `.env` 文件）

3. 启动开发服务器：

```bash
npm run dev
```

4. 访问 http://localhost:3000 开始使用

## 使用方法

- 正常对话：直接输入消息与 Deepseek 大模型对话
- 数据库查询：输入包含 SQL、数据库、查询等关键词的消息，系统会自动调用 MCP 服务进行 MySQL 查询

示例查询：
- "查询数据库中的所有表"
- "显示用户表的结构"
- "查询用户表中的前10条记录"

## MCP 工具说明

本应用提供以下 MCP 工具：

1. `query_database` - 执行 SQL 查询
2. `get_tables` - 获取数据库中所有表的列表
3. `describe_table` - 获取指定表的结构信息
