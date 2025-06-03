# 贴纸制作机 - Netlify版本

这是一个基于AI的在线贴纸制作工具，部署在Netlify上。

## 功能特点

- 🎨 AI智能背景移除
- ✂️ 自动抠图功能
- 🖼️ 生成有描边和无描边两种版本
- 📱 响应式设计，支持手机和电脑
- ⬇️ 一键下载处理后的贴纸

## 技术架构

- **前端**: HTML + CSS + JavaScript
- **后端**: Netlify Functions (Python)
- **图像处理**: PIL (Python Imaging Library)
- **部署平台**: Netlify

## 本地开发

1. 安装依赖:
```bash
pip install -r requirements.txt
```

2. 启动本地服务器:
```bash
python -m http.server 8000
```

3. 打开浏览器访问 http://localhost:8000

## 部署到Netlify

1. 将代码推送到GitHub
2. 在Netlify中连接GitHub仓库
3. 自动部署完成

## 使用说明

1. 点击"开始制作贴纸"按钮
2. 上传或拖拽图片文件
3. 等待AI处理
4. 下载生成的贴纸

## 支持的格式

- 图片格式: JPG, PNG, GIF, BMP
- 文件大小: 最大10MB 