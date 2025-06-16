// index.js

class MusicVisualizer {
    constructor() {
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.patternSelect = document.getElementById('patternSelect');
        this.info = document.querySelector('.info p');
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.animationId = null;
        
        this.setupCanvas();
        this.bindEvents();
        
        this.particles = [];
        this.time = 0;
        this.bassHistory = [];
        this.currentPattern = 'minimal';
        
        // パターン別設定
        this.patterns = {
            minimal: { primaryColor: '#f5f5f5', accentColor: '#666', bgAlpha: 0.15 },
            organic: { primaryColor: '#e8d5b7', accentColor: '#8b7355', bgAlpha: 0.12 },
            geometric: { primaryColor: '#d4af37', accentColor: '#b8860b', bgAlpha: 0.1 },
            waves: { primaryColor: '#4a90e2', accentColor: '#357abd', bgAlpha: 0.08 }
        };
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
        this.patternSelect.addEventListener('change', (e) => {
            this.currentPattern = e.target.value;
        });
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
            this.info.textContent = 'Listening to audio...';
            
            this.animate();
        } catch (error) {
            console.error('Microphone access error:', error);
            this.info.textContent = 'Microphone access denied.';
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
        this.info.textContent = 'Grant microphone access to begin';
        
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const bass = this.getAverageVolume(0, 8);
        const mid = this.getAverageVolume(8, 64);
        const treble = this.getAverageVolume(64, 128);
        
        this.bassHistory.push(bass);
        if (this.bassHistory.length > 20) {
            this.bassHistory.shift();
        }
        
        this.draw(bass, mid, treble);
        this.time += 0.01;
    }
    
    getAverageVolume(start, end) {
        let sum = 0;
        for (let i = start; i < end && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / (end - start);
    }
    
    draw(bass, mid, treble) {
        const config = this.patterns[this.currentPattern];
        
        this.ctx.fillStyle = `rgba(10, 10, 10, ${config.bgAlpha})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        switch(this.currentPattern) {
            case 'minimal':
                this.drawMinimal(centerX, centerY, bass, mid, treble, config);
                break;
            case 'organic':
                this.drawOrganic(centerX, centerY, bass, mid, treble, config);
                break;
            case 'geometric':
                this.drawGeometric(centerX, centerY, bass, mid, treble, config);
                break;
            case 'waves':
                this.drawWaves(centerX, centerY, bass, mid, treble, config);
                break;
        }
    }
    
    drawMinimal(centerX, centerY, bass, mid, treble, config) {
        // シンプルな同心円
        for (let i = 0; i < 8; i++) {
            const radius = 40 + i * 30 + bass * 0.3;
            const alpha = (8 - i) / 8 * 0.6;
            
            this.ctx.strokeStyle = config.primaryColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // 中央の点
        this.ctx.fillStyle = config.accentColor;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 2 + bass * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawOrganic(centerX, centerY, bass, mid, treble, config) {
        // 有機的な曲線
        this.ctx.strokeStyle = config.primaryColor + '80';
        this.ctx.lineWidth = 2;
        
        for (let layer = 0; layer < 3; layer++) {
            this.ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                const noise = Math.sin(angle * 3 + this.time * 2) * 20;
                const audioInfluence = bass * 0.2 + mid * 0.1;
                const radius = 80 + layer * 40 + noise + audioInfluence;
                
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (angle === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    drawGeometric(centerX, centerY, bass, mid, treble, config) {
        // 多角形パターン
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.time * 0.5);
        
        for (let sides = 3; sides <= 8; sides++) {
            const radius = 40 + sides * 15 + bass * 0.2;
            const alpha = Math.floor((8 - sides) / 5 * 128).toString(16).padStart(2, '0');
            
            this.ctx.strokeStyle = config.primaryColor + alpha;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            
            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawWaves(centerX, centerY, bass, mid, treble, config) {
        // 波形パターン
        this.ctx.strokeStyle = config.primaryColor + '60';
        this.ctx.lineWidth = 1;
        
        for (let y = 0; y < this.canvas.height; y += 60) {
            this.ctx.beginPath();
            for (let x = 0; x < this.canvas.width; x += 5) {
                const waveY = y + Math.sin(x * 0.01 + this.time * 3) * (bass * 0.3 + 20);
                
                if (x === 0) {
                    this.ctx.moveTo(x, waveY);
                } else {
                    this.ctx.lineTo(x, waveY);
                }
            }
            this.ctx.stroke();
        }
    }
}

// 初期化
const visualizer = new MusicVisualizer();