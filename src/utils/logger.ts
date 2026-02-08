import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel = 'info';
  private jsonMode = false;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setJsonMode(enabled: boolean) {
    this.jsonMode = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown) {
    if (this.jsonMode) {
      return JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }

    const prefix = {
      debug: chalk.gray('[DEBUG]'),
      info: chalk.blue('[INFO]'),
      warn: chalk.yellow('[WARN]'),
      error: chalk.red('[ERROR]'),
    }[level];

    return `${prefix} ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  }

  debug(message: string, data?: unknown) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: unknown) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  success(message: string) {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`✓ ${message}`));
    }
  }

  spinner(message: string) {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan(`⚡ ${message}`));
    }
  }
}

export const logger = new Logger();
