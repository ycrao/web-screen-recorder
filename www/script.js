class WebRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.stream = null;
        this.previewVideo = document.getElementById('previewVideo');
        this.recordingsList = document.getElementById('recordingsList');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.switchSourceBtn = document.getElementById('switchSourceBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.noPreview = document.getElementById('noPreview');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.timer = document.getElementById('timer');
        
        this.isRecording = false;
        this.isPaused = false;
        this.recordedChunks = [];
        this.startTime = 0;
        this.timerInterval = null;
        
        this.initEventListeners();
        this.loadRecordings();
    }
    
    initEventListeners() {
        // 主要控制按钮
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.pauseBtn.addEventListener('click', () => this.pauseRecording());
        
        // 源切换按钮
        this.switchSourceBtn.addEventListener('click', () => this.switchSource());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // 设置控件
        document.getElementById('frameRate').addEventListener('input', (e) => {
            document.getElementById('frameRateValue').textContent = `${e.target.value} fps`;
        });
        
        document.getElementById('bitrate').addEventListener('input', (e) => {
            document.getElementById('bitrateValue').textContent = `${e.target.value} Mbps`;
        });
        
        // 页面卸载时清理
        window.addEventListener('beforeunload', () => {
            this.stopRecording();
        });
    }
    
    async startRecording() {
        try {
            this.showLoading();
            
            // 获取录制源
            const sourceType = document.getElementById('recordSource').value;
            const audioSource = document.getElementById('audioSource').value;
            
            // 创建媒体流
            this.stream = await this.createMediaStream(sourceType, audioSource);
            
            // 检查流是否有效
            if (!this.stream || this.stream.getTracks().length === 0) {
                throw new Error('无法创建有效的媒体流');
            }
            
            // 创建MediaRecorder
            const options = this.getRecordingOptions();
            
            // 尝试创建MediaRecorder，如果失败则使用默认格式
            try {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            } catch (mediaError) {
                console.warn('使用指定格式创建MediaRecorder失败，尝试默认格式:', mediaError);
                this.mediaRecorder = new MediaRecorder(this.stream);
            }
            
            this.setupMediaRecorder();
            
            // 开始录制
            this.mediaRecorder.start();
            this.startTimer();
            
            // 更新UI状态
            this.updateUIState('recording');
            this.hidePreviewMessage();
            
            console.log('录制开始');
            
        } catch (error) {
            console.error('录制启动失败:', error);
            
            // 根据错误类型提供更具体的错误信息
            let errorMessage = '录制启动失败';
            
            if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                errorMessage = '权限被拒绝，请允许浏览器访问麦克风和摄像头';
            } else if (error.name === 'NotSupportedError' || error.message.includes('not supported')) {
                errorMessage = '当前浏览器不支持所选的录制格式，请尝试其他设置';
            } else if (error.name === 'NotFoundError' || error.message.includes('No device')) {
                errorMessage = '未找到可用的摄像头或麦克风设备';
            } else if (error.name === 'OverconstrainedError' || error.message.includes('constraint')) {
                errorMessage = '设备不支持所选的录制参数，请调整设置';
            }
            
            this.showError(errorMessage + ': ' + error.message);
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.stopTimer();
            this.updateUIState('stopped');
            console.log('录制停止');
        }
    }
    
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording) {
            if (this.isPaused) {
                this.mediaRecorder.resume();
                this.pauseBtn.textContent = '暂停录制';
                this.isPaused = false;
            } else {
                this.mediaRecorder.pause();
                this.pauseBtn.textContent = '继续录制';
                this.isPaused = true;
            }
        }
    }
    
    async createMediaStream(sourceType, audioSource) {
        let videoStream;
        let audioStream;
        
        // 根据音频源类型决定是否在视频流中包含音频
        const shouldIncludeAudioInVideo = audioSource === 'system' || audioSource === 'both';
        
        // 获取视频流
        switch (sourceType) {
            case 'screen':
                try {
                    videoStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { 
                            mediaSource: 'screen',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 60 }
                        },
                        audio: shouldIncludeAudioInVideo
                    });
                } catch (error) {
                    console.warn('屏幕录制失败，尝试不包含音频:', error);
                    // 如果包含音频失败，尝试不包含音频
                    videoStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { 
                            mediaSource: 'screen',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 60 }
                        }
                    });
                }
                break;
                
            case 'camera':
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                });
                break;
                
            case 'tab':
                try {
                    videoStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { 
                            mediaSource: 'tab',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 30 }
                        },
                        audio: shouldIncludeAudioInVideo
                    });
                } catch (error) {
                    console.warn('标签页录制失败，尝试不包含音频:', error);
                    // 如果包含音频失败，尝试不包含音频
                    videoStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { 
                            mediaSource: 'tab',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 30 }
                        }
                    });
                }
                break;
        }
        
        // 获取独立的麦克风音频流
        if (audioSource === 'mic' || audioSource === 'both') {
            try {
                const micConstraints = { 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                };
                
                audioStream = await navigator.mediaDevices.getUserMedia(micConstraints);
            } catch (error) {
                console.warn('无法获取麦克风音频:', error);
                // 如果明确要求麦克风但失败，给用户提示
                if (audioSource === 'mic') {
                    this.showError('无法访问麦克风，请检查权限设置');
                }
            }
        }
        
        // 合并音视频流
        const combinedStream = new MediaStream();
        
        // 添加视频轨道
        videoStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
        });
        
        // 添加音频轨道（优先使用系统音频，然后是麦克风音频）
        const videoAudioTracks = videoStream.getAudioTracks();
        const micAudioTracks = audioStream ? audioStream.getAudioTracks() : [];
        
        // 先添加系统音频轨道
        videoAudioTracks.forEach(track => {
            combinedStream.addTrack(track);
        });
        
        // 然后添加麦克风音频轨道
        micAudioTracks.forEach(track => {
            combinedStream.addTrack(track);
        });
        
        // 设置预览
        this.previewVideo.srcObject = combinedStream;
        
        return combinedStream;
    }
    
    getRecordingOptions() {
        const frameRate = parseInt(document.getElementById('frameRate').value);
        const bitrate = parseInt(document.getElementById('bitrate').value) * 1000000; // 转换为bps
        
        // 检测支持的媒体格式
        const supportedOptions = this.getSupportedRecordingOptions();
        
        return {
            mimeType: supportedOptions.mimeType,
            videoBitsPerSecond: bitrate,
            audioBitsPerSecond: bitrate * 0.1,
            frameRate: frameRate
        };
    }
    
    getSupportedRecordingOptions() {
        // 按优先级列出支持的格式
        const preferredFormats = [
            'video/webm;codecs=vp8,vorbis',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4;codecs=h264',
            'video/mp4',
            'video/mpeg'
        ];
        
        for (const format of preferredFormats) {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)) {
                console.log(`使用支持的格式: ${format}`);
                return {
                    mimeType: format,
                    isSupported: true
                };
            }
        }
        
        // 如果都不支持，使用最基本的格式
        console.warn('没有找到完全支持的格式，尝试使用默认格式');
        return {
            mimeType: 'video/webm',
            isSupported: false
        };
    }
    
    setupMediaRecorder() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.processRecording();
        };
        
        this.mediaRecorder.onstart = () => {
            this.isRecording = true;
        };
        
        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder错误:', event.error);
            this.showError('录制过程中发生错误');
        };
    }
    
    processRecording() {
        if (this.recordedChunks.length === 0) return;
        
        // 使用与MediaRecorder相同的格式创建blob
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { 
            type: mimeType 
        });
        
        // 根据实际的mimeType确定文件扩展名
        let fileExtension = '.webm';
        if (mimeType.includes('mp4')) {
            fileExtension = '.mp4';
        } else if (mimeType.includes('mpeg')) {
            fileExtension = '.mpeg';
        }
        
        const filename = `recording_${new Date().getTime()}${fileExtension}`;
        const url = URL.createObjectURL(blob);
        
        // 保存录制文件
        this.saveRecording({
            id: Date.now(),
            filename: filename,
            url: url,
            blob: blob,
            mimeType: mimeType,
            size: blob.size,
            duration: Date.now() - this.startTime,
            date: new Date()
        });
        
        // 清理数据
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.isPaused = false;
        
        // 显示录制文件
        this.displayRecordings();
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.timer.textContent = '00:00:00';
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateUIState(state) {
        switch (state) {
            case 'recording':
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.pauseBtn.disabled = false;
                this.switchSourceBtn.disabled = false;
                this.fullscreenBtn.disabled = false;
                this.recordingIndicator.style.display = 'flex';
                break;
                
            case 'stopped':
                this.startBtn.disabled = false;
                this.stopBtn.disabled = true;
                this.pauseBtn.disabled = true;
                this.pauseBtn.textContent = '暂停录制';
                this.switchSourceBtn.disabled = true;
                this.fullscreenBtn.disabled = true;
                this.recordingIndicator.style.display = 'none';
                break;
        }
    }
    
    hidePreviewMessage() {
        this.noPreview.style.display = 'none';
    }
    
    showLoading() {
        this.noPreview.innerHTML = '<div class="loading"><div class="spinner"></div><p>正在准备录制...</p></div>';
        this.noPreview.style.display = 'flex';
    }
    
    showError(message) {
        this.noPreview.innerHTML = `<p style="color: #ff6b6b;">${message}</p>`;
        this.noPreview.style.display = 'flex';
        
        // 3秒后隐藏错误信息
        setTimeout(() => {
            this.noPreview.innerHTML = '<p>点击"开始录制"开始预览</p>';
            this.noPreview.style.display = 'flex';
        }, 3000);
    }
    
    async switchSource() {
        if (this.isRecording) {
            await this.stopRecording();
            setTimeout(() => {
                this.startRecording();
            }, 1000);
        }
    }
    
    toggleFullscreen() {
        const previewBox = this.previewVideo.parentElement;
        
        if (!document.fullscreenElement) {
            previewBox.requestFullscreen().catch(err => {
                console.error('全屏模式失败:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    saveRecording(recording) {
        let recordings = this.getStoredRecordings();
        recordings.push(recording);
        
        // 限制存储数量（最多保存20个录制文件）
        if (recordings.length > 20) {
            recordings = recordings.slice(-20);
        }
        
        localStorage.setItem('webRecorderRecordings', JSON.stringify(recordings));
    }
    
    loadRecordings() {
        const recordings = this.getStoredRecordings();
        this.displayRecordings(recordings);
    }
    
    getStoredRecordings() {
        const stored = localStorage.getItem('webRecorderRecordings');
        return stored ? JSON.parse(stored) : [];
    }
    
    displayRecordings(recordings = null) {
        if (!recordings) {
            recordings = this.getStoredRecordings();
        }
        
        this.recordingsList.innerHTML = '';
        
        if (recordings.length === 0) {
            this.recordingsList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">暂无录制文件</p>';
            return;
        }
        
        recordings.reverse().forEach(recording => {
            const recordingDiv = document.createElement('div');
            recordingDiv.className = 'recording-item';
            
            const duration = Math.round(recording.duration / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            
            recordingDiv.innerHTML = `
                <h4>${recording.filename}</h4>
                <div class="recording-info">
                    <span>${minutes}:${seconds.toString().padStart(2, '0')}</span>
                    <span>${this.formatFileSize(recording.size)}</span>
                </div>
                <div class="recording-actions">
                    <button class="btn btn-secondary" onclick="webRecorder.playRecording('${recording.id}')">播放</button>
                    <button class="btn btn-primary" onclick="webRecorder.downloadRecording('${recording.id}')">下载</button>
                    <button class="btn btn-danger" onclick="webRecorder.deleteRecording('${recording.id}')">删除</button>
                </div>
            `;
            
            this.recordingsList.appendChild(recordingDiv);
        });
    }
    
    playRecording(id) {
        const recordings = this.getStoredRecordings();
        const recording = recordings.find(r => r.id === parseInt(id));
        
        if (recording) {
            // 创建模态框播放器
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 10px; max-width: 80%; max-height: 80%;">
                    <h3>${recording.filename}</h3>
                    <video controls autoplay style="max-width: 100%; max-height: 70vh;">
                        <source src="${recording.url}" type="video/webm">
                        您的浏览器不支持视频播放。
                    </video>
                    <br>
                    <button class="btn btn-danger" style="margin-top: 10px;" onclick="this.closest('div').closest('div').remove()">关闭</button>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
    }
    
    downloadRecording(id) {
        const recordings = this.getStoredRecordings();
        const recording = recordings.find(r => r.id === parseInt(id));
        
        if (recording) {
            const link = document.createElement('a');
            link.href = recording.url;
            link.download = recording.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    deleteRecording(id) {
        if (confirm('确定要删除这个录制文件吗？')) {
            let recordings = this.getStoredRecordings();
            recordings = recordings.filter(r => r.id !== parseInt(id));
            
            localStorage.setItem('webRecorderRecordings', JSON.stringify(recordings));
            this.displayRecordings(recordings);
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化应用
let webRecorder;

document.addEventListener('DOMContentLoaded', () => {
    webRecorder = new WebRecorder();
    
    // 详细的浏览器兼容性检查
    checkBrowserCompatibility();
});

function checkBrowserCompatibility() {
    const startBtn = document.getElementById('startBtn');
    let compatibilityIssues = [];
    
    // 检查基本API支持
    if (!navigator.mediaDevices) {
        compatibilityIssues.push('缺少 MediaDevices API');
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
        compatibilityIssues.push('不支持 getUserMedia');
    }
    
    if (!MediaRecorder) {
        compatibilityIssues.push('不支持 MediaRecorder API');
    }
    
    if (!navigator.mediaDevices.getDisplayMedia) {
        compatibilityIssues.push('不支持屏幕录制 (getDisplayMedia)');
    }
    
    // 检查HTTPS环境（某些API需要安全上下文）
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        compatibilityIssues.push('需要在HTTPS环境下使用');
    }
    
    // 检查支持的媒体格式
    const supportedFormats = [];
    const testFormats = [
        'video/webm;codecs=vp8,vorbis',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=h264'
    ];
    
    testFormats.forEach(format => {
        if (MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)) {
            supportedFormats.push(format);
        }
    });
    
    // 记录调试信息
    console.log('浏览器兼容性检查:');
    console.log('- 支持的格式:', supportedFormats);
    console.log('- User Agent:', navigator.userAgent);
    console.log('- HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
    
    if (compatibilityIssues.length > 0) {
        const errorMessage = `浏览器兼容性问题：${compatibilityIssues.join(', ')}。建议使用最新版本的 Chrome、Firefox 或 Edge 浏览器。`;
        webRecorder.showError(errorMessage);
        startBtn.disabled = true;
        
        // 记录详细错误
        console.error('兼容性问题:', compatibilityIssues);
    } else {
        console.log('浏览器兼容性检查通过');
    }
}

// 全屏事件处理
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (document.fullscreenElement) {
        fullscreenBtn.textContent = '退出全屏';
    } else {
        fullscreenBtn.textContent = '全屏预览';
    }
});
