exports.handler = async (event, context) => {
  console.log('开始处理图片请求');
  
  try {
    // 验证请求方法
    if (event.httpMethod !== 'POST') {
      throw new Error(`不支持的HTTP方法: ${event.httpMethod}`);
    }

    // 验证请求体
    if (!event.body) {
      throw new Error('请求体为空');
    }

    // 解析请求体
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('成功解析请求体');
    } catch (e) {
      throw new Error(`解析请求体失败: ${e.message}`);
    }

    // 验证图片数据
    if (!body.image) {
      throw new Error('请求中没有找到图片数据');
    }

    // 记录图片信息
    console.log('图片数据类型:', typeof body.image);
    console.log('图片数据长度:', body.image.length);

    // 返回处理结果
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        imageWithOutline: body.image,
        imageNoOutline: body.image,
        processingDetails: {
          imageType: typeof body.image,
          dataLength: body.image.length,
          serverTime: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    // 记录错误
    console.error('处理失败:', error);
    console.error('错误堆栈:', error.stack);

    // 返回错误信息
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorDetails: {
          stack: error.stack,
          time: new Date().toISOString(),
          requestBody: event.body ? JSON.stringify(event.body).substring(0, 100) + '...' : 'empty'
        }
      })
    };
  }
};
