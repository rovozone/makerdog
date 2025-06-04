    // API服务器地址 - 自动检测环境
    const API_BASE_URL = (() => {
        // 如果是本地开发环境
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        
        // 生产环境 - 使用Netlify Functions
        return location.origin;
    })();

    // 状态变量
    let isProcessing = false;
    let currentStage = 'upload'; // upload, processing, result

    // DOM元素
    const uploadModal = document.getElementById('uploadModal');
    const resultModal = document.getElementById('resultModal');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const processingModal = document.getElementById('processingModal');
    const processingStage = document.getElementById('processingStage');
    const processingImages = document.querySelectorAll('.processing-animation img');
    const resultContainer = document.getElementById('resultContainer');

    // 显示上传对话框
    function showModal() {
        uploadModal.style.display = 'block';
        setTimeout(() => {
            uploadModal.classList.add('show');
        }, 10);
    }

    // 隐藏上传对话框
    function hideModal() {
        uploadModal.classList.remove('show');
        setTimeout(() => {
            uploadModal.style.display = 'none';
            resetUpload();
        }, 300);
    }

    // 显示结果对话框
    function showResultModal() {
        resultModal.style.display = 'block';
        setTimeout(() => {
            resultModal.classList.add('show');
        }, 10);
    }

    // 隐藏结果对话框
    function hideResultModal() {
        resultModal.classList.remove('show');
        setTimeout(() => {
            resultModal.style.display = 'none';
        }, 300);
    }

    // 显示处理中对话框
    function showProcessingModal() {
        processingModal.style.display = 'block';
        setTimeout(() => {
            processingModal.classList.add('show');
            startProcessingAnimation();
        }, 10);
    }

    // 隐藏处理中对话框
    function hideProcessingModal() {
        processingModal.classList.remove('show');
        setTimeout(() => {
            processingModal.style.display = 'none';
        }, 300);
    }

    // 开始处理动画
    function startProcessingAnimation() {
        let currentImage = 0;
        const interval = setInterval(() => {
            processingImages.forEach((img, index) => {
                img.style.opacity = index === currentImage ? '1' : '0.3';
            });
            currentImage = (currentImage + 1) % processingImages.length;
        }, 1000);

        // 保存interval引用以便后续清除
        processingModal.dataset.interval = interval;
    }

    // 重置上传状态
    function resetUpload() {
        fileInput.value = '';
        dropZone.classList.remove('drag-over');
        currentStage = 'upload';
        isProcessing = false;
        
        // 清除处理动画
        const interval = processingModal.dataset.interval;
        if (interval) {
            clearInterval(interval);
        }
    }

    // 文件拖拽处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 点击上传
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 处理文件
    async function handleFile(file) {
        if (isProcessing) return;
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }
        
        // 检查文件大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
            alert('文件大小不能超过10MB！');
            return;
        }
        
        isProcessing = true;
        
        try {
            // 隐藏上传对话框，显示处理中对话框
            hideModal();
            setTimeout(() => {
                showProcessingModal();
            }, 300);
            
            // 处理图片
            await processImage(file);
            
        } catch (error) {
            console.error('处理图片时出错:', error);
            alert('处理图片时出错，请重试');
            isProcessing = false;
            hideProcessingModal();
        }
    }

    // 处理图片
    async function processImage(file) {
        try {
            // 将文件转换为base64
            const base64 = await fileToBase64(file);
            
            // 发送到API
            const response = await fetch(`${API_BASE_URL}/api/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || '处理图片时出错');
            }
            
            // 显示结果
            displayResults(data);
            
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // 显示处理结果
    function displayResults(data) {
        // 清空之前的结果
        resultContainer.innerHTML = '';
        
        // 创建结果元素
        const resultHTML = `
            <div class="result-images">
                <div class="result-item">
                    <h3>贴纸描边</h3>
                    <img src="${data.imageWithOutline}" alt="贴纸描边" data-type="with-outline">
                    <button class="download-btn" onclick="downloadImage('${data.imageWithOutline}', 'sticker-with-outline.png')">
                        <span class="material-icons">download</span>
                        下载贴纸
                    </button>
                </div>
                <div class="result-item">
                    <h3>无描边</h3>
                    <img src="${data.imageNoOutline}" alt="无描边" data-type="no-outline">
                    <button class="download-btn" onclick="downloadImage('${data.imageNoOutline}', 'sticker-no-outline.png')">
                        <span class="material-icons">download</span>
                        下载贴纸
                    </button>
                </div>
            </div>
        `;
        
        resultContainer.innerHTML = resultHTML;
        
        // 隐藏处理中对话框，显示结果对话框
        hideProcessingModal();
        setTimeout(() => {
            showResultModal();
            isProcessing = false;
        }, 300);
    }

    // 文件转base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 下载图片
    function downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 重新制作
    function remakeSticker() {
        hideResultModal();
        setTimeout(() => {
            showModal();
        }, 300);
    }

    // 停止制作
    function stopMaking() {
        hideProcessingModal();
        isProcessing = false;
    }

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            hideModal();
        }
        if (e.target === resultModal) {
            hideResultModal();
        }
        if (e.target === processingModal) {
            stopMaking();
        }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (uploadModal.classList.contains('show')) {
                hideModal();
            }
            if (resultModal.classList.contains('show')) {
                hideResultModal();
            }
            if (processingModal.classList.contains('show')) {
                stopMaking();
            }
        }
    });

    // 测试API连接
    async function testApiConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`);
            const data = await response.json();
            console.log('API连接正常:', data);
        } catch (error) {
            console.error('API连接失败:', error);
        }
    }

    // 页面加载完成后测试API
    document.addEventListener('DOMContentLoaded', () => {
        testApiConnection();
    }); 