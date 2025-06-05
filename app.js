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

    // API服务器地址 - 支持开发和生产环境
    const API_BASE_URL = location.hostname === 'localhost' 
        ? 'http://localhost:5001' 
        : 'https://your-backend-domain.vercel.app'; // 替换为你的后端域名

    // 全局变量
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
        if (!uploadModal) {
            uploadModal = document.getElementById('upload-modal');
        }
        
        if (isProcessing) {
            // 如果正在处理中，则中断制作
            window.stopProcessing();
            return;
        }
        uploadModal.classList.add('active');
        window.resetState();
    };

    // 隐藏上传弹窗
    window.hideModal = () => {
        if (!uploadModal) {
            uploadModal = document.getElementById('upload-modal');
        }
        uploadModal.classList.remove('active');
    };

    // 重置状态
    window.resetState = () => {
        if (!uploadState) {
            uploadState = document.getElementById('upload-state');
            previewState = document.getElementById('preview-state');
            uploadZone = document.getElementById('upload-zone');
            previewImage = document.getElementById('preview-image');
            processBtn = document.getElementById('process-btn');
            stickerPreviewArea = document.getElementById('sticker-preview-area');
        }
        
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
        const uploadInput = document.getElementById('image-upload');
        if (uploadInput) {
            uploadInput.value = '';
        }
        
        // 重置3D交互状态
        isDragging = false;
        rotateX = 10;
        rotateY = 0;
    };

    // 设置处理状态
    function setProcessingState(processing) {
        isProcessing = processing;
        if (processing) {
            // 开始处理状态
            startBtn.innerHTML = '中断制作';
            startBtn.classList.add('processing');
            
            // 添加翻转动画，切换到制作中人物图片
            landingDogNormal.classList.add('flip-to-processing');
            
            // 在翻转到90度时（动画中点）切换图片
            setTimeout(() => {
                landingDogNormal.style.display = 'none';
                landingDogProcessing.style.display = 'block';
            }, 400); // 0.8s动画的一半时间
            
            // 动画完成后移除翻转类，添加浮动动画
            setTimeout(() => {
                landingDogNormal.classList.remove('flip-to-processing');
                landingDogProcessing.classList.add('processing-character');
            }, 800);
            
        } else {
            // 结束处理状态
            startBtn.innerHTML = '制作贴纸';
            startBtn.classList.remove('processing');
            
            // 移除制作中的浮动动画，添加翻转动画
            landingDogProcessing.classList.remove('processing-character');
            landingDogProcessing.classList.add('flip-to-normal');
            
            // 在翻转到90度时（动画中点）切换图片
            setTimeout(() => {
                landingDogProcessing.style.display = 'none';
                landingDogNormal.style.display = 'block';
            }, 400);
            
            // 动画完成后移除翻转类，恢复正常浮动
            setTimeout(() => {
                landingDogProcessing.classList.remove('flip-to-normal');
                // 普通状态的浮动动画由CSS自动处理
            }, 800);
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
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(`${API_BASE_URL}/api/process-image`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '处理图片时出错');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '处理图片时出错');
            }
            
            // 保存两种图片的URL
            const withOutlineUrl = `${API_BASE_URL}${data.imageWithOutline}`;
            const noOutlineUrl = `${API_BASE_URL}${data.imageNoOutline}`;
            
            // 创建两种图片对象
            const imgWithOutline = document.createElement('img');
            imgWithOutline.src = withOutlineUrl;
            imgWithOutline.dataset.type = 'with-outline';
            
            const imgNoOutline = document.createElement('img');
            imgNoOutline.src = noOutlineUrl;
            imgNoOutline.dataset.type = 'no-outline';
            
            // 保存图片引用
            stickerWithOutline = imgWithOutline;
            stickerNoOutline = imgNoOutline;
            
            // 预加载图片
            await preloadImages(withOutlineUrl, noOutlineUrl);
            
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
        // 停止礼花动画
        stopConfetti();
        
        previewModal.classList.remove('active');
        resetState();
    };

    // 切换描边样式
    window.toggleOutline = () => {
        if (!stickerWithOutline || !stickerNoOutline) return;
        
        const css3dSticker = document.querySelector('.css-3d-sticker img');
        const outlineToggle = document.getElementById('outline-toggle');
        if (!css3dSticker || !outlineToggle) return;
        
        if (outlineToggle.checked) {
            css3dSticker.src = stickerWithOutline.src;
            currentDisplayMode = 'with-outline';
        } else {
            css3dSticker.src = stickerNoOutline.src;
            currentDisplayMode = 'no-outline';
        }
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
            const response = await fetch(targetImage.src);
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
});