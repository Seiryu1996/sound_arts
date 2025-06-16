// index.js

class MusicVisualizer {
    constructor() {
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.info = document.querySelector('.info p');
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.animationId = null;
        
        this.setupCanvas();
        this.bindEvents();
        
        // ビジュアル効果用の変数
        this.particles = [];
        this.time = 0;
        this.bassHistory = [];
        this.midHistory = [];
        this.trebleHistory = [];
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
    }
    
    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.source = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 512;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.source.connect(this.analyser);
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.info.textContent = '音楽を再生して音楽ビジュアライザーをお楽しみください！';
            
            this.animate();
        } catch (error) {
            console.error('マイクアクセスエラー:', error);
            this.info.textContent = 'マイクへのアクセスが拒否されました。';
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.info.textContent = 'マイクへのアクセスを許可してください';
        
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // 周波数帯域を分析
        const bass = this.getAverageVolume(0, 8);
        const mid = this.getAverageVolume(8, 64);
        const treble = this.getAverageVolume(64, 256);
        
        // 履歴を保存（平滑化用）
        this.bassHistory.push(bass);
        this.midHistory.push(mid);
        this.trebleHistory.push(treble);
        
        if (this.bassHistory.length > 10) {
            this.bassHistory.shift();
            this.midHistory.shift();
            this.trebleHistory.shift();
        }
        
        this.draw(bass, mid, treble);
        this.time += 0.05;
    }
    
    getAverageVolume(start, end) {
        let sum = 0;
        for (let i = start; i < end && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / (end - start);
    }
    
    draw(bass, mid, treble) {
        // 背景をクリア（フェード効果）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 中央の円形ビジュアライザー
        this.drawCircularVisualizer(centerX, centerY);
        
        // 幾何学模様
        this.drawGeometricPatterns(centerX, centerY, bass, mid, treble);
        
        // パーティクル効果
        this.updateParticles(bass);
        
        // 波形表示
        this.drawWaveform();
    }
    
    drawCircularVisualizer(centerX, centerY) {
        const radius = 150;
        const bars = 64;
        
        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const amplitude = this.dataArray[i] || 0;
            const barHeight = amplitude * 2;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            // カラフルなグラデーション
            const hue = (i / bars) * 360 + this.time * 50;
            this.ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawGeometricPatterns(centerX, centerY, bass, mid, treble) {
        // 回転する三角形
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.time + bass * 0.01);
        
        const triangleSize = 50 + bass * 0.5;
        this.ctx.strokeStyle = `hsl(${bass * 2}, 100%, 70%)`;
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 6; i++) {
            this.ctx.rotate(Math.PI / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -triangleSize);
            this.ctx.lineTo(-triangleSize * 0.866, triangleSize * 0.5);
            this.ctx.lineTo(triangleSize * 0.866, triangleSize * 0.5);
            this.ctx.closePath();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // 螺旋模様
        this.drawSpiral(centerX, centerY, mid, treble);
    }
    
    drawSpiral(centerX, centerY, mid, treble) {
        this.ctx.strokeStyle = `hsl(${treble * 3}, 80%, 60%)`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        for (let angle = 0; angle < Math.PI * 8; angle += 0.1) {
            const radius = angle * 3 + mid * 0.1;
            const x = centerX + Math.cos(angle + this.time) * radius;
            const y = centerY + Math.sin(angle + this.time) * radius;
            
            if (angle === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    updateParticles(bass) {
        // 新しいパーティクルを生成
        if (bass > 50 && Math.random() < 0.3) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1.0,
                    size: Math.random() * 5 + 2,
                    hue: Math.random() * 360
                });
            }
        }
        
        // パーティクルを更新・描画
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = `hsl(${particle.hue}, 100%, 60%)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    drawWaveform() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.canvas.height / 4 + 50;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }
}

// 初期化
const visualizer = new MusicVisualizer();