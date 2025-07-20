// Chart.js minimal implementation for offline use
// This is a placeholder to ensure the app works without external dependencies

class Chart {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.data = config.data || { datasets: [] };
        this.options = config.options || {};
        this.type = config.type || 'bar';
        
        // Store reference for cleanup
        this.canvas = ctx.canvas || ctx;
        this.canvas._chart = this;
        
        this.render();
    }
    
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.type === 'doughnut' || this.type === 'pie') {
            this.renderPieChart(ctx);
        } else if (this.type === 'line') {
            this.renderLineChart(ctx);
        } else {
            this.renderBarChart(ctx);
        }
    }
    
    renderPieChart(ctx) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        const data = this.data.datasets[0]?.data || [];
        const labels = this.data.labels || [];
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
        
        const total = data.reduce((sum, val) => sum + val, 0);
        
        if (total > 0) {
            let currentAngle = -Math.PI / 2;
            
            data.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI;
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.lineTo(centerX, centerY);
                ctx.fillStyle = colors[index % colors.length];
                ctx.fill();
                
                currentAngle += sliceAngle;
            });
        }
    }
    
    renderLineChart(ctx) {
        const padding = 40;
        const chartWidth = this.canvas.width - 2 * padding;
        const chartHeight = this.canvas.height - 2 * padding;
        
        const data = this.data.datasets[0]?.data || [];
        const labels = this.data.labels || [];
        
        if (data.length > 1) {
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const maxVal = Math.max(...data);
            const stepX = chartWidth / (data.length - 1);
            
            data.forEach((value, index) => {
                const x = padding + index * stepX;
                const y = padding + chartHeight - (value / maxVal) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }
    
    renderBarChart(ctx) {
        const padding = 40;
        const chartWidth = this.canvas.width - 2 * padding;
        const chartHeight = this.canvas.height - 2 * padding;
        
        const data = this.data.datasets[0]?.data || [];
        const labels = this.data.labels || [];
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        
        if (data.length > 0) {
            const maxVal = Math.max(...data);
            const barWidth = chartWidth / data.length * 0.8;
            const barSpacing = chartWidth / data.length * 0.2;
            
            data.forEach((value, index) => {
                const x = padding + index * (barWidth + barSpacing);
                const barHeight = (value / maxVal) * chartHeight;
                const y = padding + chartHeight - barHeight;
                
                ctx.fillStyle = colors[index % colors.length];
                ctx.fillRect(x, y, barWidth, barHeight);
            });
        }
    }
    
    update() {
        this.render();
    }
    
    destroy() {
        if (this.canvas._chart === this) {
            delete this.canvas._chart;
        }
    }
}

// Export for global use
window.Chart = Chart;

// Register chart types
Chart.register = function() {};
Chart.defaults = { responsive: true };

console.log('📊 Chart.js offline implementation loaded');