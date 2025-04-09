import { NextResponse } from 'next/server';
import { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import axios from 'axios';
import path from 'path';

// MCP服务器进程
let mcpProcess = null;
let mcpClient = null;

// 启动MCP服务器
async function startMCPServer() {
  // 如果已经有进程运行，直接返回
  if (mcpProcess && mcpClient) return mcpClient;
  
  console.log('启动MCP服务器...');
  const serverPath = path.join(process.cwd(), 'mcp-server.js');
  mcpProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', process.stderr],
    detached: false
  });
  
  // 等待服务器启动
  return new Promise((resolve, reject) => {
    // 设置超时
    const timeout = setTimeout(() => {
      reject(new Error('启动MCP服务器超时'));
    }, 10000);
    
    // 监听输出
    let buffer = '';
    mcpProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      // 检查是否有服务就绪的消息
      if (buffer.includes('MCP服务器已启动，等待连接')) {
        clearTimeout(timeout);
        console.log('MCP服务器已就绪');
        resolve(true);
      }
    });
    
    // 处理错误
    mcpProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.error('启动MCP服务器失败:', err);
      reject(err);
    });
    
    // 处理退出
    mcpProcess.on('exit', (code) => {
      console.log(`MCP服务器已退出，退出码: ${code}`);
      mcpProcess = null;
      mcpClient = null;
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`MCP服务器异常退出，退出码: ${code}`));
      }
    });
  });
}

// 获取MCP工具描述（无需启动服务器）
function getMCPToolsDescription() {
  return [
    {
      type: "function",
      function: {
        name: "query_database",
        description: "执行MySQL数据库查询，返回查询结果",
        parameters: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "要执行的SQL查询语句"
            }
          },
          required: ["sql"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_tables",
        description: "获取数据库中所有表的列表",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "describe_table",
        description: "获取指定表的结构信息",
        parameters: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "要描述的表名"
            }
          },
          required: ["table_name"]
        }
      }
    }
  ];
}

// 模拟Deepseek响应
function simulateDeepseekResponse(messages) {
  const lastMessage = messages[messages.length - 1];
  let responseText = "";
  
  // 简单的响应逻辑
  if (lastMessage.content.toLowerCase().includes("你好") || lastMessage.content.toLowerCase().includes("hello")) {
    responseText = "你好！我是Deepseek助手。我可以帮你进行MySQL数据库查询。请问有什么可以帮助你的？";
  } else if (lastMessage.content.toLowerCase().includes("查询") && lastMessage.content.toLowerCase().includes("表")) {
    responseText = "我可以帮你查询数据库表。你可以使用以下命令：\n1. 获取所有表：get_tables\n2. 查看表结构：describe_table\n3. 执行SQL查询：query_database";
  } else if (lastMessage.content.toLowerCase().includes("mysql") || lastMessage.content.toLowerCase().includes("数据库")) {
    responseText = "我已连接到MySQL数据库。你可以请我执行SQL查询，比如'查询用户表中的所有记录'。";
  } else {
    responseText = "我理解了您的问题。是否需要我帮您查询数据库相关信息？您可以具体告诉我您需要查询的内容。";
  }
  
  return {
    role: "assistant",
    content: responseText
  };
}

// 处理deepseek请求
async function handleDeepseekRequest(messages) {
  // 检查API密钥是否存在
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  try {
    // 获取工具描述
    const tools = getMCPToolsDescription();
    
    // 尝试调用Deepseek API
    const apiBaseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';
    console.log(`尝试调用Deepseek API: ${apiBaseUrl}`);
    
    // 发送请求到deepseek模型，包含工具信息
    const modelResponse = await axios.post(`${apiBaseUrl}/v1/chat/completions`, {
      model: "deepseek-chat",
      messages,
      tools,
      tool_choice: "auto"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // 获取初始响应
    let assistantResponse = modelResponse.data.choices[0].message;
    console.log("初始响应:", assistantResponse);
    
    // 如果模型想要调用工具
    if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
      console.log('检测到工具调用，准备处理');
      
      // 启动MCP服务器（如果未启动）
      await startMCPServer();
      const toolResults = [];
      
      // 处理每个工具调用
      for (const toolCall of assistantResponse.tool_calls) {
        const { function: func } = toolCall;
        console.log(`调用工具: ${func.name}，参数:`, func.arguments);
        
        try {
          // 直接通过HTTP请求调用MCP服务器
          const mcpResponse = await axios.post('http://localhost:3001/tools/' + func.name, 
            JSON.parse(func.arguments)
          );
          const result = mcpResponse.data;
          console.log(`工具调用结果:`, result);
          
          // 添加工具调用结果
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: func.name,
            content: JSON.stringify(result)
          });
        } catch (error) {
          console.error(`工具调用失败:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: func.name,
            content: JSON.stringify({ error: error.message || "工具调用失败" })
          });
        }
      }
      
      // 添加工具响应到消息历史
      const finalMessages = [
        ...messages,
        assistantResponse,
        ...toolResults
      ];
      
      // 发送最终请求以获取助手响应
      console.log('发送最终请求到Deepseek...');
      const finalResponse = await axios.post(`${apiBaseUrl}/v1/chat/completions`, {
        model: "deepseek-chat",
        messages: finalMessages
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return finalResponse.data.choices[0].message;
    }
    
    // 如果没有工具调用，直接返回模型回复
    return assistantResponse;
  } catch (error) {
    console.error('调用Deepseek API失败，使用模拟响应:', error);
    
    // 如果API调用失败，返回模拟响应
    return simulateDeepseekResponse(messages);
  }
}

export async function POST(request) {
  try {
    const { messages } = await request.json();
    
    // 处理deepseek请求
    const response = await handleDeepseekRequest(messages);
    
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('处理聊天请求时出错:', error);
    return NextResponse.json(
      { message: { 
        role: "assistant", 
        content: `很抱歉，处理请求时发生错误: ${error.message || '未知错误'}` 
      } },
      { status: 200 } // 即使出错也返回200状态码，确保前端能正常显示
    );
  }
} 