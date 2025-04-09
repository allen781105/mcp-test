require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

// 创建MySQL连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 创建Express应用
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 添加工具路由
// 1. 执行数据库查询
app.post('/tools/query_database', async (req, res) => {
  try {
    // 执行SQL查询
    const [rows] = await pool.query(req.body.sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message, 
      sqlState: error.sqlState, 
      code: error.code 
    });
  }
});

// 2. 获取所有表
app.post('/tools/get_tables', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    res.json({ 
      success: true, 
      tables: rows.map(row => Object.values(row)[0]) 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 3. 获取表结构
app.post('/tools/describe_table', async (req, res) => {
  try {
    const [rows] = await pool.query(`DESCRIBE ${req.body.table_name}`);
    res.json({ success: true, structure: rows });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 启动HTTP服务器
const PORT = process.env.MCP_SERVER_PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`MCP服务器已启动，等待连接，监听端口: ${PORT}`);
});

// 优雅退出处理
process.on('SIGINT', async () => {
  console.log('正在关闭MCP服务器...');
  await pool.end();
  server.close(() => {
    console.log('HTTP服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('正在关闭MCP服务器...');
  await pool.end();
  server.close(() => {
    console.log('HTTP服务器已关闭');
    process.exit(0);
  });
}); 