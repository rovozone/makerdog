import json
import base64
import io
from PIL import Image, ImageFilter, ImageDraw
import uuid

def handler(event, context):
    try:
        # 处理CORS预检请求
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': ''
            }
        
        # 解析请求体
        body = json.loads(event['body'])
        image_data = body['image']
        
        # 解码base64图片
        image_data = image_data.split(',')[1]  # 移除data:image/...;base64,前缀
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # 转换为RGBA模式
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # 简单的背景移除算法
        # 这里实现一个基础版本，实际项目中可以集成更高级的算法
        processed_image = simple_background_removal(image)
        
        # 生成两个版本：有描边和无描边
        image_with_outline = add_outline(processed_image.copy())
        image_no_outline = processed_image
        
        # 转换为base64
        def image_to_base64(img):
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_str}"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'imageWithOutline': image_to_base64(image_with_outline),
                'imageNoOutline': image_to_base64(image_no_outline)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }

def simple_background_removal(image):
    """简单的背景移除算法"""
    # 这是一个基础实现，主要处理单色背景
    data = image.getdata()
    new_data = []
    
    # 假设背景是图片四角的主要颜色
    corner_colors = [
        image.getpixel((0, 0)),
        image.getpixel((image.width-1, 0)),
        image.getpixel((0, image.height-1)),
        image.getpixel((image.width-1, image.height-1))
    ]
    
    # 选择最常见的颜色作为背景色
    from collections import Counter
    bg_color = Counter(corner_colors).most_common(1)[0][0]
    
    # 移除背景
    tolerance = 50
    for item in data:
        # 计算颜色差异
        diff = sum(abs(a - b) for a, b in zip(item[:3], bg_color[:3]))
        if diff < tolerance:
            new_data.append((item[0], item[1], item[2], 0))  # 透明
        else:
            new_data.append(item)
    
    result = Image.new('RGBA', image.size)
    result.putdata(new_data)
    return result

def add_outline(image):
    """为图片添加描边"""
    # 创建描边
    outline_width = 3
    outline_color = (255, 255, 255, 255)  # 白色描边
    
    # 创建一个稍大的画布
    new_size = (image.width + outline_width * 2, image.height + outline_width * 2)
    outlined = Image.new('RGBA', new_size, (0, 0, 0, 0))
    
    # 在多个位置绘制原图像以创建描边效果
    for x in range(-outline_width, outline_width + 1):
        for y in range(-outline_width, outline_width + 1):
            if x*x + y*y <= outline_width*outline_width:
                # 创建描边层
                outline_layer = Image.new('RGBA', image.size, (0, 0, 0, 0))
                for i in range(image.width):
                    for j in range(image.height):
                        pixel = image.getpixel((i, j))
                        if pixel[3] > 0:  # 如果不是透明像素
                            outline_layer.putpixel((i, j), outline_color)
                
                outlined.paste(outline_layer, (outline_width + x, outline_width + y), outline_layer)
    
    # 在最上层绘制原图
    outlined.paste(image, (outline_width, outline_width), image)
    
    return outlined 