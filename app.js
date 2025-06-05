// 纯前端AI贴纸制作器 - 使用MediaPipe和Canvas
// 全局变量
let selfieSegmentation;
let currentImage = null;
let processedImageData = null;
let isModelLoaded = false;

// 初始化MediaPipe
async function initializeMediaPipe() {
    try {
        console.log('正在初始化MediaPipe...');
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });
        
        selfieSegmentation.setOptions({
            modelSelection: 1, // 0 for general, 1 for landscape
            selfieMode: false,
        });
        
        selfieSegmentation.onResults(onSegmentationResults);
        isModelLoaded = true;
        console.log('MediaPipe初始化成功');
        
        // 更新UI状态
        updateProcessButtonState();
    } catch (error) {
        console.error('MediaPipe初始化失败:', error);
        // 如果MediaPipe失败，使用备用的简单背景移除算法
        isModelLoaded = true;
        console.log('使用备用抠图算法');
    }
}

// MediaPipe分割结果处理
function onSegmentationResults(results) {
    if (!results.segmentationMask) return;
    
    const canvas = document.getElementById('processing-canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸
    canvas.width = results.image.width;
    canvas.height = results.image.width;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制原图
    ctx.drawImage(results.image, 0, 0);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 应用分割蒙版
    const mask = results.segmentationMask;
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    maskCtx.drawImage(mask, 0, 0);
    
    const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
    
    // 应用蒙版到原图
    for (let i = 0; i < data.length; i += 4) {
        const maskIndex = Math.floor(i / 4);
        const maskValue = maskData[maskIndex * 4]; // R通道
        
        if (maskValue < 128) { // 背景像素
            data[i + 3] = 0; // 设置为透明
        }
    }
    
    // 保存处理结果
    ctx.putImageData(imageData, 0, 0);
    processedImageData = canvas.toDataURL('image/png');
    
    // 显示结果
    showProcessedResult();
}

// 简单的颜色阈值背景移除（备用算法）
function simpleBackgroundRemoval(imageData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            
            // 分析四个角落的颜色作为背景色
            const corners = [
                [0, 0], [canvas.width-1, 0], 
                [0, canvas.height-1], [canvas.width-1, canvas.height-1]
            ];
            
            let bgR = 0, bgG = 0, bgB = 0;
            for (let corner of corners) {
                const x = corner[0];
                const y = corner[1];
                const index = (y * canvas.width + x) * 4;
                bgR += data[index];
                bgG += data[index + 1];
                bgB += data[index + 2];
            }
            bgR /= 4; bgG /= 4; bgB /= 4;
            
            // 移除相似颜色的背景
            const threshold = 50;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const distance = Math.sqrt(
                    Math.pow(r - bgR, 2) + 
                    Math.pow(g - bgG, 2) + 
                    Math.pow(b - bgB, 2)
                );
                
                if (distance < threshold) {
                    data[i + 3] = 0; // 设置为透明
                }
            }
            
            ctx.putImageData(imgData, 0, 0);
            processedImageData = canvas.toDataURL('image/png');
            resolve();
        };
        img.src = imageData;
    });
}

// 添加描边效果
function addOutlineEffect(imageData, outlineWidth = 3, outlineColor = '#000000') {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width + outlineWidth * 2;
            canvas.height = img.height + outlineWidth * 2;
            
            // 设置描边
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = outlineWidth;
            
            // 绘制多个偏移的图像创建描边效果
            for (let x = -outlineWidth; x <= outlineWidth; x++) {
                for (let y = -outlineWidth; y <= outlineWidth; y++) {
                    if (x !== 0 || y !== 0) {
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.drawImage(img, outlineWidth + x, outlineWidth + y);
                    }
                }
            }
            
            // 最后绘制原图
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, outlineWidth, outlineWidth);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageData;
    });
}

// 礼花动画
function createConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiPieces = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    
    // 创建礼花片
    for (let i = 0; i < 100; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: Math.random() * 4 - 2,
            vy: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = confettiPieces.length - 1; i >= 0; i--) {
            const piece = confettiPieces[i];
            
            // 更新位置
            piece.x += piece.vx;
            piece.y += piece.vy;
            piece.rotation += piece.rotationSpeed;
            piece.vy += 0.1; // 重力
            
            // 绘制礼花片
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation * Math.PI / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size/2, -piece.size/2, piece.size, piece.size);
            ctx.restore();
            
            // 移除超出边界的礼花片
            if (piece.y > canvas.height + 10) {
                confettiPieces.splice(i, 1);
            }
        }
        
        if (confettiPieces.length > 0) {
            requestAnimationFrame(animate);
        } else {
            // 3秒后隐藏canvas
            setTimeout(() => {
                canvas.style.display = 'none';
            }, 3000);
        }
    }
    
    canvas.style.display = 'block';
    animate();
}

// UI交互函数
function showModal() {
    document.getElementById('upload-modal').style.display = 'flex';
    
    // 如果还没初始化MediaPipe，现在初始化
    if (!isModelLoaded) {
        initializeMediaPipe();
    }
}

function hideModal() {
    document.getElementById('upload-modal').style.display = 'none';
    resetUploadState();
}

function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
    resetUploadState();
}

function resetUploadState() {
    document.getElementById('upload-state').style.display = 'block';
    document.getElementById('preview-state').style.display = 'none';
    document.getElementById('preview-image').src = '';
    document.getElementById('process-btn').disabled = true;
    currentImage = null;
    processedImageData = null;
}

function updateProcessButtonState() {
    const processBtn = document.getElementById('process-btn');
    if (currentImage && isModelLoaded) {
        processBtn.disabled = false;
        processBtn.innerHTML = '<span class="material-icons">auto_fix_high</span>开始制作';
    } else if (currentImage) {
        processBtn.innerHTML = '<span class="material-icons">hourglass_empty</span>AI模型加载中...';
    }
}

// 图片上传处理
function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('请选择有效的图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result;
        
        // 显示预览
        const previewImg = document.getElementById('preview-image');
        previewImg.src = currentImage;
        
        // 切换状态
        document.getElementById('upload-state').style.display = 'none';
        document.getElementById('preview-state').style.display = 'block';
        
        // 更新按钮状态
        updateProcessButtonState();
    };
    reader.readAsDataURL(file);
}

// 开始处理图片
async function startProcessing() {
    if (!currentImage) return;
    
    const processBtn = document.getElementById('process-btn');
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="material-icons">autorenew</span>处理中...';
    
    try {
        // 如果MediaPipe可用，使用AI分割
        if (window.SelfieSegmentation && selfieSegmentation) {
            const img = new Image();
            img.onload = function() {
                selfieSegmentation.send({image: img});
            };
            img.src = currentImage;
        } else {
            // 使用简单背景移除
            await simpleBackgroundRemoval(currentImage);
            showProcessedResult();
        }
    } catch (error) {
        console.error('处理失败:', error);
        // 降级到简单算法
        await simpleBackgroundRemoval(currentImage);
        showProcessedResult();
    }
}

// 显示处理结果
async function showProcessedResult() {
    if (!processedImageData) return;
    
    // 创建带描边和不带描边的版本
    const withOutline = await addOutlineEffect(processedImageData, 3, '#000000');
    const withoutOutline = processedImageData;
    
    // 创建预览区域
    const previewArea = document.getElementById('sticker-preview-area');
    previewArea.innerHTML = `
        <div class="sticker-container" style="perspective: 1000px;">
            <div class="sticker-display" style="transform-style: preserve-3d; transition: transform 0.3s;">
                <img id="current-sticker" src="${withOutline}" alt="处理后的贴纸" 
                     style="max-width: 300px; max-height: 300px; object-fit: contain; 
                            filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));">
            </div>
        </div>
        <div class="result-info">
            <p>✨ 抠图完成！可以下载使用了</p>
        </div>
    `;
    
    // 保存两个版本到全局变量
    window.stickerWithOutline = withOutline;
    window.stickerWithoutOutline = withoutOutline;
    
    // 隐藏上传弹窗，显示预览弹窗
    document.getElementById('upload-modal').style.display = 'none';
    document.getElementById('preview-modal').style.display = 'flex';
    
    // 播放礼花动画
    createConfetti();
    
    // 添加3D交互效果
    addStickerInteraction();
}

// 添加贴纸3D交互效果
function addStickerInteraction() {
    const stickerDisplay = document.querySelector('.sticker-display');
    const container = document.querySelector('.sticker-container');
    
    if (!container || !stickerDisplay) return;
    
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / centerY * 10;
        const rotateY = (centerX - x) / centerX * 10;
        
        stickerDisplay.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    container.addEventListener('mouseleave', () => {
        stickerDisplay.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
}

// 切换描边效果
function toggleOutline() {
    const checkbox = document.getElementById('outline-toggle');
    const stickerImg = document.getElementById('current-sticker');
    
    if (checkbox.checked) {
        stickerImg.src = window.stickerWithOutline;
    } else {
        stickerImg.src = window.stickerWithoutOutline;
    }
}

// 复位贴纸角度
function resetSticker() {
    const stickerDisplay = document.querySelector('.sticker-display');
    if (stickerDisplay) {
        stickerDisplay.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
}

// 下载贴纸
function downloadSticker() {
    const checkbox = document.getElementById('outline-toggle');
    const imageData = checkbox.checked ? window.stickerWithOutline : window.stickerWithoutOutline;
    
    const link = document.createElement('a');
    link.download = `sticker_${Date.now()}.png`;
    link.href = imageData;
    link.click();
}

// 重新制作
function resetAndRestart() {
    closePreview();
    showModal();
}

// 事件监听器设置
document.addEventListener('DOMContentLoaded', function() {
    // 文件选择
    const fileInput = document.getElementById('image-upload');
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });
    
    // 拖拽上传
    const uploadZone = document.getElementById('upload-zone');
    
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageUpload(files[0]);
        }
    });
    
    // 点击上传区域
    uploadZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 窗口大小变化时调整canvas
    window.addEventListener('resize', function() {
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
    
    // 初始化MediaPipe（延迟加载）
    setTimeout(initializeMediaPipe, 1000);
});

// 页面加载完成后的初始化
window.addEventListener('load', function() {
    // 预加载一些资源
    console.log('贴纸制作器已就绪');
});

// 导出函数供HTML调用
window.showModal = showModal;
window.hideModal = hideModal;
window.closePreview = closePreview;
window.startProcessing = startProcessing;
window.toggleOutline = toggleOutline;
window.resetSticker = resetSticker;
window.downloadSticker = downloadSticker;
window.resetAndRestart = resetAndRestart;