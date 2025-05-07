enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  LOG = 4,
  TRACE = 5,
  NONE = 6,
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;

  private prefix() {
    return "[HOLDSTATION-CORE]";
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  debug(...args: any[]) {
    if (this.logLevel > LogLevel.DEBUG) {
      return;
    }

    console.debug(this.prefix(), ...args);
  }

  info(...args: any[]) {
    if (this.logLevel > LogLevel.INFO) {
      return;
    }

    console.info(this.prefix(), ...args);
  }

  warn(...args: any[]) {
    if (this.logLevel > LogLevel.WARN) {
      return;
    }
    console.warn(this.prefix(), ...args);
  }

  error(...args: any[]) {
    if (this.logLevel > LogLevel.ERROR) {
      return;
    }

    console.error(this.prefix(), ...args);
  }

  log(...args: any[]) {
    if (this.logLevel > LogLevel.LOG) {
      return;
    }

    console.log(this.prefix(), ...args);
  }

  trace(...args: any[]) {
    if (this.logLevel > LogLevel.TRACE) {
      return;
    }

    console.trace(this.prefix(), ...args);
  }
}

export const logger = new Logger();
