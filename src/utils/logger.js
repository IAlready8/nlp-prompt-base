const fs = require('fs');
const path = require('path');
const config = require('../config');

class Logger {
    constructor() {
        this.logLevel = config.logging.level;
        this.logFile = config.logging.file;
        this.maxSize = config.logging.maxSize;
        this.maxFiles = config.logging.maxFiles;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    async writeToFile(message) {
        try {
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                if (stats.size > this.maxSize) {
                    await this.rotateLog();
                }
            }
            
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async rotateLog() {
        try {
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = this.logFile + '.' + i;
                const newFile = this.logFile + '.' + (i + 1);
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        fs.unlinkSync(oldFile);
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            
            if (fs.existsSync(this.logFile)) {
                fs.renameSync(this.logFile, this.logFile + '.1');
            }
        } catch (error) {
            console.error('Failed to rotate log:', error);
        }
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, meta);
        
        if (config.development.debugMode || level === 'error') {
            console.log(formattedMessage);
        }
        
        this.writeToFile(formattedMessage);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    trace(message, meta = {}) {
        this.log('trace', message, meta);
    }

    async getLogs(lines = 100) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }
            
            const content = fs.readFileSync(this.logFile, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            
            return logLines.slice(-lines);
        } catch (error) {
            this.error('Failed to read logs', { error: error.message });
            return [];
        }
    }

    clearLogs() {
        try {
            if (fs.existsSync(this.logFile)) {
                fs.unlinkSync(this.logFile);
            }
            
            for (let i = 1; i <= this.maxFiles; i++) {
                const rotatedFile = this.logFile + '.' + i;
                if (fs.existsSync(rotatedFile)) {
                    fs.unlinkSync(rotatedFile);
                }
            }
            
            this.info('Logs cleared');
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }
}

const logger = new Logger();

module.exports = logger;