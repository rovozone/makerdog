document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const uploadModal = document.getElementById('upload-modal');
    const previewModal = document.getElementById('preview-modal');
    const uploadInput = document.getElementById('image-upload');
    const uploadZone = document.getElementById('upload-zone');
    const uploadState = document.getElementById('upload-state'); // 上传状态容器
    const previewState = document.getElementById('preview-state'); // 预览状态容器
    const previewImage = document.getElementById('preview-image'); // 预览图片元素
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    const toggleOutlineBtn = document.getElementById('toggle-outline-btn');
    const stickerPreviewArea = document.getElementById('sticker-preview-area'); // 贴纸预览区域
    const processingState = document.getElementById('processing-state');
    const buttonLoader = document.getElementById('button-loader');
    const landingPage = document.getElementById('landing-page');
    const landingDogImg = document.querySelector('.landing-dog-img');
    const landingDogNormal = document.getElementById('landing-dog-normal'); // 普通状态人物图片
    const landingDogProcessing = document.getElementById('landing-dog-processing'); // 制作中状态人物图片
    const startBtn = document.querySelector('.start-btn');

    // API服务器地址 - 自动检测环境
    const API_BASE_URL = (() => {
        // 如果是本地开发环境
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return 'http://localhost:5001';
        }
        
        // 生产环境 - 使用当前域名（Netlify会自动路由到Functions）
        return location.origin;
    })();

    // 状态变量
    let originalImage = null;
    let stickerWithOutline = null;
    let stickerNoOutline = null;
    let currentDisplayMode = 'with-outline';
    let isProcessing = false;
    let processingInterval = null;

    // 3D交互相关变量
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotateX = 10;
    let rotateY = 0;

    // 礼花动画相关变量
    let confettiCanvas = null;
    let confettiCtx = null;
    let confettiParticles = [];
    let confettiAnimationId = null;

    // 初始化礼花系统
    function initConfetti() {
        confettiCanvas = document.getElementById('confetti-canvas');
        if (!confettiCanvas) return;
        
        confettiCtx = confettiCanvas.getContext('2d');
        resizeConfettiCanvas();
    }

    // 调整礼花画布大小
    function resizeConfettiCanvas() {
        if (!confettiCanvas) return;
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }

    // 创建礼花粒子
    function createConfettiParticle(x, y) {
        const colors = ['#f9ba2a', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        const shapes = ['square', 'circle'];
        
        return {
            x: x || Math.random() * confettiCanvas.width,
            y: y || -10,
            velX: (Math.random() - 0.5) * 8,
            velY: Math.random() * -8 - 5,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: 0.3,
            life: 1,
            decay: Math.random() * 0.02 + 0.01
        };
    }

    // 启动礼花动画
    function startConfetti() {
        if (!confettiCanvas || !confettiCtx) return;
        
        // 清除现有动画
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
        }
        
        // 创建初始礼花粒子 - 减少数量，更精致
        const burstPoints = [
            { x: confettiCanvas.width * 0.3, y: confettiCanvas.height * 0.2 },
            { x: confettiCanvas.width * 0.7, y: confettiCanvas.height * 0.2 },
            { x: confettiCanvas.width * 0.5, y: confettiCanvas.height * 0.25 }
        ];
        
        burstPoints.forEach(point => {
            for (let i = 0; i < 20; i++) { // 减少数量从30到20
                confettiParticles.push(createConfettiParticle(point.x, point.y));
            }
        });
        
        // 启动动画循环
        animateConfetti();
    }

    // 礼花动画循环
    function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        for (let i = confettiParticles.length - 1; i >= 0; i--) {
            const particle = confettiParticles[i];
            
            // 更新粒子位置
            particle.velY += particle.gravity;
            particle.x += particle.velX;
            particle.y += particle.velY;
            particle.rotation += particle.rotationSpeed;
            particle.life -= particle.decay;
            
            // 绘制粒子
            confettiCtx.save();
            confettiCtx.translate(particle.x, particle.y);
            confettiCtx.rotate((particle.rotation * Math.PI) / 180);
            confettiCtx.globalAlpha = particle.life;
            confettiCtx.fillStyle = particle.color;
            
            if (particle.shape === 'circle') {
                confettiCtx.beginPath();
                confettiCtx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                confettiCtx.fill();
            } else {
                confettiCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            }
            
            confettiCtx.restore();
            
            // 移除过期或超出边界的粒子
            if (particle.life <= 0 || particle.y > confettiCanvas.height + 100) {
                confettiParticles.splice(i, 1);
            }
        }
        
        // 继续动画或停止
        if (confettiParticles.length > 0) {
            confettiAnimationId = requestAnimationFrame(animateConfetti);
        }
    }

    // 停止礼花动画
    function stopConfetti() {
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
        }
        confettiParticles = [];
        if (confettiCtx) {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    // 监听窗口大小变化
    window.addEventListener('resize', resizeConfettiCanvas);

    // 初始化礼花系统
    document.addEventListener('DOMContentLoaded', initConfetti);

    // 显示上传弹窗
    window.showModal = () => {
        if (isProcessing) {
            // 如果正在处理中，则中断制作
            stopProcessing();
            return;
        }
        uploadModal.classList.add('active');
        resetState();
    };

    // 隐藏上传弹窗
    window.hideModal = () => {
        uploadModal.classList.remove('active');
        resetState();
    };

    // 重置状态
    function resetState() {
        uploadState.style.display = 'block';
        previewState.style.display = 'none';
        uploadZone.style.display = 'flex';
        previewImage.src = '';
        stickerPreviewArea.innerHTML = '';
        processBtn.disabled = true;
        originalImage = null;
        stickerWithOutline = null;
        stickerNoOutline = null;
        currentDisplayMode = 'with-outline';
        
        // 重置文件输入
        if (uploadInput) {
            uploadInput.value = '';
        }
        
        // 重置3D交互状态
        isDragging = false;
        rotateX = 10;
        rotateY = 0;
    }

    // 设置处理状态
    function setProcessingState(processing) {
        isProcessing = processing;
        
        if (processing) {
            // 开始处理状态
            startBtn.innerHTML = '<span class="material-icons">stop</span> 停止制作';
            startBtn.classList.add('processing');
            
            // 使用requestAnimationFrame确保动画同步
            requestAnimationFrame(() => {
                // 添加翻转动画，切换到制作中人物图片
                landingDogNormal.classList.add('flip-to-processing');
                
                // 在翻转到90度时（动画中点）切换图片
                setTimeout(() => {
                    landingDogNormal.style.display = 'none';
                    landingDogProcessing.style.display = 'block';
                }, 300); // 0.6s动画的一半时间
                
                // 动画完成后移除翻转类，添加浮动动画
                setTimeout(() => {
                    landingDogNormal.classList.remove('flip-to-processing');
                    landingDogProcessing.classList.add('processing-character');
                    // 清除will-change以节省性能
                    landingDogNormal.style.willChange = 'auto';
                }, 600);
            });
            
        } else {
            // 结束处理状态
            startBtn.innerHTML = '制作贴纸';
            startBtn.classList.remove('processing');
            
            // 使用requestAnimationFrame确保动画同步
            requestAnimationFrame(() => {
                // 移除制作中的浮动动画，添加翻转动画
                landingDogProcessing.classList.remove('processing-character');
                landingDogProcessing.classList.add('flip-to-normal');
                
                // 在翻转到90度时（动画中点）切换图片
                setTimeout(() => {
                    landingDogProcessing.style.display = 'none';
                    landingDogNormal.style.display = 'block';
                }, 300);
                
                // 动画完成后移除翻转类，恢复正常浮动
                setTimeout(() => {
                    landingDogProcessing.classList.remove('flip-to-normal');
                    // 清除will-change以节省性能
                    landingDogProcessing.style.willChange = 'auto';
                    // 普通状态的浮动动画由CSS自动处理
                }, 600);
            });
        }
    }

    // 开始处理图片
    window.startProcessing = async () => {
        if (!originalImage) return;

        // 保存文件引用，避免在隐藏弹窗时被清空
        const file = uploadInput.files[0];
        if (!file) {
            alert('没有选择文件');
            return;
        }

        // 隐藏上传弹窗，回到首页（不重置状态）
        uploadModal.classList.remove('active');
        
        // 设置处理状态
        setProcessingState(true);
        
        try {
            // 将文件转换为base64
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            const base64Data = await base64Promise;
            
            const response = await fetch(`${API_BASE_URL}/.netlify/functions/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Data
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '处理图片时出错');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '处理图片时出错');
            }
            
            // 处理API返回的数据格式
            // 如果返回的是字符串（base64），则转换为对象格式
            let withOutlineData, noOutlineData;
            
            if (typeof data.imageWithOutline === 'string') {
                // 当前API返回的是base64字符串格式
                withOutlineData = {
                    image: data.imageWithOutline,
                    effects: {
                        backgroundRemoval: true,
                        outline: true,
                        outlineColor: '#000000',
                        outlineWidth: 3
                    }
                };
                
                noOutlineData = {
                    image: data.imageNoOutline,
                    effects: {
                        backgroundRemoval: true,
                        outline: false
                    }
                };
            } else {
                // 新格式已经是对象
                withOutlineData = data.imageWithOutline;
                noOutlineData = data.imageNoOutline;
            }
            
            // 处理图片并应用效果
            const processedImages = await processImagesWithEffects(
                withOutlineData, 
                noOutlineData
            );
            
            // 创建两种图片对象
            const imgWithOutline = document.createElement('img');
            imgWithOutline.src = processedImages.withOutline;
            imgWithOutline.dataset.type = 'with-outline';
            
            const imgNoOutline = document.createElement('img');
            imgNoOutline.src = processedImages.noOutline;
            imgNoOutline.dataset.type = 'no-outline';
            
            // 保存图片引用
            stickerWithOutline = imgWithOutline;
            stickerNoOutline = imgNoOutline;
            
            // 预加载图片
            await preloadImages(processedImages.withOutline, processedImages.noOutline);
            
            // 同时触发人物翻转和成功页面显示，让过程更快更流畅
            // 结束处理状态（人物开始翻转）
            setProcessingState(false);
            
            // 立即显示成功页面，与人物翻转同时进行
            showPreview();
            
        } catch (error) {
            console.error('处理图片时出错:', error);
            alert('处理图片时出错: ' + error.message);
            stopProcessing();
        }
    };

    // 停止处理
    window.stopProcessing = () => {
        setProcessingState(false);
        resetState();
    };

    // 显示预览弹窗
    function showPreview() {
        // 隐藏处理中状态
        processingState.style.display = 'none';
        
        // 清空预览区域
        stickerPreviewArea.innerHTML = '';
        
        // 创建3D容器
        const threeDContainer = document.createElement('div');
        threeDContainer.className = 'three-d-container active';
        stickerPreviewArea.appendChild(threeDContainer);
        
        // 创建CSS 3D贴纸
        const css3dSticker = document.createElement('div');
        css3dSticker.className = 'css-3d-sticker';
        threeDContainer.appendChild(css3dSticker);
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = stickerWithOutline.src;
        css3dSticker.appendChild(img);
        
        // 设置开关初始状态
        const outlineToggle = document.getElementById('outline-toggle');
        if (outlineToggle) {
            outlineToggle.checked = true;
        }
        currentDisplayMode = 'with-outline';
        
        // 添加鼠标交互
        css3dSticker.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // 添加触摸支持
        css3dSticker.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchUp);
        
        // 显示预览弹窗
        previewModal.classList.add('active');
        
        // 在贴纸弹性动画达到最大时触发礼花
        setTimeout(() => {
            startConfetti();
        }, 600); // 配合贴纸动画在0.4s时达到最大
        
        // 2秒后停止礼花，更快结束
        setTimeout(() => {
            stopConfetti();
        }, 3000);
    }

    // 关闭预览弹窗
    window.closePreview = () => {
        previewModal.classList.remove('active');
        stopConfetti();
        
        // 重置3D旋转
        rotateX = 10;
        rotateY = 0;
        updateStickerRotation();
        
        // 清空预览区域
        stickerPreviewArea.innerHTML = '';
        
        // 重置状态
        currentDisplayMode = 'with-outline';
        const outlineToggle = document.getElementById('outline-toggle');
        if (outlineToggle) {
            outlineToggle.checked = true;
        }
    };

    // 切换描边显示
    window.toggleOutline = () => {
        const outlineToggle = document.getElementById('outline-toggle');
        const isChecked = outlineToggle.checked;
        
        currentDisplayMode = isChecked ? 'with-outline' : 'no-outline';
        
        // 更新显示的图片
        const css3dSticker = document.querySelector('.css-3d-sticker img');
        if (css3dSticker) {
            if (currentDisplayMode === 'with-outline' && stickerWithOutline) {
                css3dSticker.src = stickerWithOutline.src;
            } else if (currentDisplayMode === 'no-outline' && stickerNoOutline) {
                css3dSticker.src = stickerNoOutline.src;
            }
        }
    };

    // 重新开始制作
    window.resetAndRestart = () => {
        // 关闭预览弹窗
        closePreview();
        
        // 重置所有状态
        resetState();
        
        // 显示上传弹窗
        uploadModal.classList.add('active');
        
        // 清空文件输入
        uploadInput.value = '';
        
        // 重置变量
        originalImage = null;
        stickerWithOutline = null;
        stickerNoOutline = null;
        currentDisplayMode = 'with-outline';
        isProcessing = false;
    };

    // 复位贴纸角度
    window.resetSticker = () => {
        rotateX = 10;
        rotateY = 0;
        updateStickerRotation();
        
        const css3dSticker = document.querySelector('.css-3d-sticker');
        if (css3dSticker) {
            css3dSticker.style.animation = 'float 3s ease-in-out infinite';
        }
    };

    // 下载贴纸
    window.downloadSticker = async () => {
        let targetImage = currentDisplayMode === 'with-outline' ? stickerWithOutline : stickerNoOutline;
        let fileName = currentDisplayMode === 'with-outline' ? '带描边贴纸.png' : '无描边贴纸.png';
        
        if (!targetImage) return;
        
        try {
            // 处理base64图片
            const base64Data = targetImage.src;
            
            // 将base64转换为blob
            const response = await fetch(base64Data);
            const blob = await response.blob();
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            URL.revokeObjectURL(downloadLink.href);
        } catch (error) {
            console.error('下载图片时出错:', error);
            alert('下载图片时出错，请重试');
        }
    };

    // 监听图片上传
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // 切换到预览状态
            uploadState.style.display = 'none';
            previewState.style.display = 'flex';
            
            // 显示预览图片
            previewImage.src = event.target.result;
            originalImage = previewImage;

            // 启用处理按钮
            processBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    // 允许拖放图片上传
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('请上传图片文件');
                return;
            }
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            uploadInput.files = dataTransfer.files;
            
            const changeEvent = new Event('change');
            uploadInput.dispatchEvent(changeEvent);
        }
    });

    // 鼠标交互处理
    function handleMouseDown(e) {
        e.preventDefault();
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        
        const css3dSticker = document.querySelector('.css-3d-sticker');
        if (css3dSticker) {
            css3dSticker.style.animation = 'none';
        }
    }
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;
        
        // 限制X轴旋转角度（上下移动）
        rotateX = Math.max(-45, Math.min(45, rotateX));
        // 限制Y轴旋转角度（左右移动）
        rotateY = Math.max(-60, Math.min(60, rotateY));
        
        updateStickerRotation();
        
        lastX = e.clientX;
        lastY = e.clientY;
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            
            const css3dSticker = document.querySelector('.css-3d-sticker');
            if (css3dSticker) {
                css3dSticker.style.animation = 'none';
            }
        }
    }
    
    function handleTouchMove(e) {
        if (!isDragging || e.touches.length !== 1) return;
        
        const deltaX = e.touches[0].clientX - lastX;
        const deltaY = e.touches[0].clientY - lastY;
        
        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;
        
        // 限制X轴旋转角度（上下移动）
        rotateX = Math.max(-45, Math.min(45, rotateX));
        // 限制Y轴旋转角度（左右移动）
        rotateY = Math.max(-60, Math.min(60, rotateY));
        
        updateStickerRotation();
        
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
    }
    
    function handleTouchUp() {
        isDragging = false;
    }
    
    function updateStickerRotation() {
        const css3dSticker = document.querySelector('.css-3d-sticker');
        if (css3dSticker) {
            css3dSticker.style.transform = `translate(-50%, -50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
    }

    // 预加载图片
    function preloadImages(withOutlineUrl, noOutlineUrl) {
        return new Promise((resolve, reject) => {
            let loadedCount = 0;
            
            function checkAllLoaded() {
                loadedCount++;
                if (loadedCount === 2) {
                    resolve();
                }
            }
            
            const img1 = new Image();
            img1.onload = checkAllLoaded;
            img1.onerror = reject;
            img1.src = withOutlineUrl;
            
            const img2 = new Image();
            img2.onload = checkAllLoaded;
            img2.onerror = reject;
            img2.src = noOutlineUrl;
        });
    }

    // 客户端图像处理函数
    async function processImagesWithEffects(withOutlineData, noOutlineData) {
        return new Promise((resolve) => {
            // 创建canvas进行图像处理
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 创建临时图片元素
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                
                // 处理带描边版本
                const withOutlineCanvas = processImageWithEffects(img, withOutlineData.effects, canvas, ctx);
                
                // 处理无描边版本  
                const noOutlineCanvas = processImageWithEffects(img, noOutlineData.effects, canvas, ctx);
                
                resolve({
                    withOutline: withOutlineCanvas.toDataURL('image/png'),
                    noOutline: noOutlineCanvas.toDataURL('image/png')
                });
            };
            
            img.src = withOutlineData.image;
        });
    }

    // 应用图像效果
    function processImageWithEffects(img, effects, canvas, ctx) {
        const resultCanvas = document.createElement('canvas');
        const resultCtx = resultCanvas.getContext('2d');
        
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        
        // 绘制原图
        resultCtx.drawImage(img, 0, 0);
        
        if (effects.backgroundRemoval) {
            // 简单的背景去除效果
            applyBackgroundRemoval(resultCtx, resultCanvas);
        }
        
        if (effects.outline) {
            // 添加描边效果
            applyOutlineEffect(resultCtx, resultCanvas, effects.outlineColor, effects.outlineWidth);
        }
        
        return resultCanvas;
    }

    // 背景去除效果（简化版）
    function applyBackgroundRemoval(ctx, canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 获取四个角落的颜色作为背景色参考
        const corners = [
            getPixelColor(data, 0, 0, canvas.width),
            getPixelColor(data, canvas.width - 1, 0, canvas.width),
            getPixelColor(data, 0, canvas.height - 1, canvas.width),
            getPixelColor(data, canvas.width - 1, canvas.height - 1, canvas.width)
        ];
        
        // 计算平均背景色
        const avgBg = {
            r: Math.round(corners.reduce((sum, c) => sum + c.r, 0) / corners.length),
            g: Math.round(corners.reduce((sum, c) => sum + c.g, 0) / corners.length),
            b: Math.round(corners.reduce((sum, c) => sum + c.b, 0) / corners.length)
        };
        
        // 应用背景去除
        const threshold = 40; // 阈值
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 计算与背景色的距离
            const distance = Math.sqrt(
                Math.pow(r - avgBg.r, 2) + 
                Math.pow(g - avgBg.g, 2) + 
                Math.pow(b - avgBg.b, 2)
            );
            
            // 如果颜色接近背景色，设为透明
            if (distance < threshold) {
                data[i + 3] = 0; // alpha = 0 (透明)
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // 添加描边效果
    function applyOutlineEffect(ctx, canvas, outlineColor = '#000000', outlineWidth = 3) {
        // 获取当前图像数据
        const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 创建临时画布用于生成描边
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // 清空主画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制多个偏移的图像来创建描边效果
        ctx.fillStyle = outlineColor;
        for (let dx = -outlineWidth; dx <= outlineWidth; dx++) {
            for (let dy = -outlineWidth; dy <= outlineWidth; dy++) {
                if (dx !== 0 || dy !== 0) {
                    // 将原图像数据绘制到临时画布
                    tempCtx.clearRect(0, 0, canvas.width, canvas.height);
                    tempCtx.putImageData(originalImageData, 0, 0);
                    
                    // 将临时画布的内容绘制到主画布的偏移位置
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.drawImage(tempCanvas, dx, dy);
                }
            }
        }
        
        // 绘制原图像在最上层
        ctx.globalCompositeOperation = 'source-over';
        ctx.putImageData(originalImageData, 0, 0);
    }

    // 获取像素颜色
    function getPixelColor(data, x, y, width) {
        const index = (y * width + x) * 4;
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }

    // 添加页面可见性变化处理
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isProcessing) {
            // 页面隐藏时暂停处理指示
            console.log('页面隐藏，处理继续...');
        }
    });
});