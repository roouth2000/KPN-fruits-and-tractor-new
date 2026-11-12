const fs = require('fs');
const path = require('path');

// ANSI Color Codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
};

/**
 * Extracts line number, column, function, and file from an Error stack trace
 */
function parseErrorLocation(error) {
  if (!error || !error.stack) {
    return {
      file: 'unknown',
      relFile: 'unknown',
      functionName: 'unknown',
      line: null,
      column: null,
      snippet: null,
      appStack: [],
    };
  }

  const stackLines = error.stack.split('\n');
  const appStack = [];
  let primaryFrame = null;

  // Regex patterns to capture stack line formats
  // e.g. "    at Object.createInvoice (/home/.../src/controllers/billingController.js:12:15)"
  // e.g. "    at /home/.../src/services/billingService.js:45:11"
  const stackRegex = /^\s*at\s+(?:async\s+)?(?:([^\s(]+)\s+\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))\s*$/;

  for (let i = 1; i < stackLines.length; i++) {
    const line = stackLines[i];
    const match = line.match(stackRegex);
    if (!match) continue;

    const functionName = match[1] || '<anonymous>';
    const filePath = match[2] || match[5];
    const lineNum = parseInt(match[3] || match[6], 10);
    const colNum = parseInt(match[4] || match[7], 10);

    const isNodeModule = filePath.includes('node_modules');
    const isInternal = !filePath.startsWith('/') && !filePath.startsWith('.') && !filePath.includes('\\');

    const frame = {
      functionName,
      filePath,
      line: lineNum,
      column: colNum,
      isAppCode: !isNodeModule && !isInternal,
    };

    if (frame.isAppCode) {
      appStack.push(frame);
      if (!primaryFrame) {
        primaryFrame = frame;
      }
    }
  }

  // Fallback if error occurred entirely in node core or external module
  if (!primaryFrame && stackLines[1]) {
    const match = stackLines[1].match(stackRegex);
    if (match) {
      primaryFrame = {
        functionName: match[1] || '<anonymous>',
        filePath: match[2] || match[5],
        line: parseInt(match[3] || match[6], 10),
        column: parseInt(match[4] || match[7], 10),
        isAppCode: false,
      };
    }
  }

  let relFile = 'unknown';
  let snippet = null;

  if (primaryFrame && primaryFrame.filePath) {
    try {
      relFile = path.relative(process.cwd(), primaryFrame.filePath);
      if (fs.existsSync(primaryFrame.filePath)) {
        const fileContent = fs.readFileSync(primaryFrame.filePath, 'utf8');
        const lines = fileContent.split('\n');
        const targetLine = primaryFrame.line;

        const startLine = Math.max(1, targetLine - 2);
        const endLine = Math.min(lines.length, targetLine + 2);
        const snippetLines = [];

        for (let l = startLine; l <= endLine; l++) {
          const isTarget = l === targetLine;
          const lineNumStr = String(l).padStart(4, ' ');
          const prefix = isTarget ? `> ${lineNumStr} | ` : `  ${lineNumStr} | `;
          snippetLines.push({
            lineNumber: l,
            isTarget,
            text: `${prefix}${lines[l - 1]}`,
          });
        }
        snippet = snippetLines;
      }
    } catch {
      // Ignore filesystem read errors
    }
  }

  return {
    file: primaryFrame ? primaryFrame.filePath : 'unknown',
    relFile,
    functionName: primaryFrame ? primaryFrame.functionName : 'unknown',
    line: primaryFrame ? primaryFrame.line : null,
    column: primaryFrame ? primaryFrame.column : null,
    snippet,
    appStack,
  };
}

/**
 * Structured Console Logger
 */
const logger = {
  info(message, meta = '') {
    const metaStr = meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : '';
    console.log(
      `${COLORS.cyan}[INFO]${COLORS.reset} ${COLORS.gray}${new Date().toISOString()}${COLORS.reset}: ${message}`,
      metaStr
    );
  },

  success(message, meta = '') {
    const metaStr = meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : '';
    console.log(
      `${COLORS.green}[SUCCESS]${COLORS.reset} ${COLORS.gray}${new Date().toISOString()}${COLORS.reset}: ${message}`,
      metaStr
    );
  },

  warn(message, meta = '') {
    const metaStr = meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : '';
    console.warn(
      `${COLORS.yellow}[WARN]${COLORS.reset} ${COLORS.gray}${new Date().toISOString()}${COLORS.reset}: ${message}`,
      metaStr
    );
  },

  error(message, error = null, context = null) {
    const timestamp = new Date().toISOString();
    console.error(
      `${COLORS.red}[ERROR]${COLORS.reset} ${COLORS.gray}${timestamp}${COLORS.reset}: ${message}`
    );

    if (error) {
      this.logError(error, null, { message, context });
    }
  },

  /**
   * Detailed Project Error Diagnostics Logger
   * Shows error type, exact file, line number, column, code snippet, request data, and reference stack
   */
  logError(error, req = null, extraContext = null) {
    const timestamp = new Date().toISOString();
    const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));
    const parsed = parseErrorLocation(errObj);

    const errorName = errObj.name || 'Error';
    const errorMessage = errObj.message || String(error);
    const errorCode = errObj.code || (errObj.original && errObj.original.code) || '';

    // Header Border
    console.error(`\n${COLORS.red}╔════════════════════════════════════════════════════════════════════════════════`);
    console.error(`║ ${COLORS.bright}${COLORS.bgRed} ERROR DIAGNOSTIC LOG ${COLORS.reset} ${COLORS.gray}${timestamp}${COLORS.reset}`);
    console.error(`${COLORS.red}╠════════════════════════════════════════════════════════════════════════════════${COLORS.reset}`);

    // Core Error Details
    console.error(`║ ${COLORS.bright}Error Type  :${COLORS.reset} ${COLORS.magenta}${errorName}${COLORS.reset}${errorCode ? ` (Code: ${errorCode})` : ''}`);
    console.error(`║ ${COLORS.bright}Message     :${COLORS.reset} ${COLORS.red}${errorMessage}${COLORS.reset}`);
    console.error(
      `║ ${COLORS.bright}Location    :${COLORS.reset} ${COLORS.cyan}${parsed.relFile}${COLORS.reset}:${COLORS.yellow}${parsed.line || '?'}${COLORS.reset}:${COLORS.yellow}${parsed.column || '?'}${COLORS.reset}`
    );
    if (parsed.functionName && parsed.functionName !== '<anonymous>') {
      console.error(`║ ${COLORS.bright}Function    :${COLORS.reset} ${COLORS.white}${parsed.functionName}()${COLORS.reset}`);
    }

    // Code Snippet around error line
    if (parsed.snippet && parsed.snippet.length > 0) {
      console.error(`${COLORS.red}╟────────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.error(`║ ${COLORS.dim}Code Snippet around Line ${parsed.line}:${COLORS.reset}`);
      parsed.snippet.forEach((line) => {
        if (line.isTarget) {
          console.error(`║ ${COLORS.red}${COLORS.bright}${line.text}${COLORS.reset}`);
        } else {
          console.error(`║ ${COLORS.gray}${line.text}${COLORS.reset}`);
        }
      });
    }

    // HTTP Request Details if available
    if (req) {
      console.error(`${COLORS.red}╟────────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.error(`║ ${COLORS.bright}Request Context:${COLORS.reset}`);
      console.error(`║   ${COLORS.dim}Method & URL:${COLORS.reset} ${req.method} ${req.originalUrl || req.url}`);
      console.error(`║   ${COLORS.dim}Client IP   :${COLORS.reset} ${req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'}`);

      if (req.user) {
        console.error(
          `║   ${COLORS.dim}Auth User   :${COLORS.reset} ${req.user.name || req.user.email || req.user.username} [Role: ${req.user.role}, ID: ${req.user.id}]`
        );
      }

      if (req.params && Object.keys(req.params).length > 0) {
        console.error(`║   ${COLORS.dim}Params      :${COLORS.reset} ${JSON.stringify(req.params)}`);
      }
      if (req.query && Object.keys(req.query).length > 0) {
        console.error(`║   ${COLORS.dim}Query       :${COLORS.reset} ${JSON.stringify(req.query)}`);
      }
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '******';
        console.error(`║   ${COLORS.dim}Body        :${COLORS.reset} ${JSON.stringify(sanitizedBody)}`);
      }
    }

    // Additional Reference Context
    if (extraContext && Object.keys(extraContext).length > 0) {
      console.error(`${COLORS.red}╟────────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.error(`║ ${COLORS.bright}Reference Data / Metadata:${COLORS.reset}`);
      try {
        console.error(`║   ${JSON.stringify(extraContext, null, 2).replace(/\n/g, '\n║   ')}`);
      } catch {
        console.error(`║   ${String(extraContext)}`);
      }
    }

    // Stack Trace
    if (errObj.stack) {
      console.error(`${COLORS.red}╟────────────────────────────────────────────────────────────────────────────────${COLORS.reset}`);
      console.error(`║ ${COLORS.bright}Stack Trace:${COLORS.reset}`);
      const stackLines = errObj.stack.split('\n');
      stackLines.slice(0, 10).forEach((stLine) => {
        console.error(`║   ${COLORS.gray}${stLine.trim()}${COLORS.reset}`);
      });
      if (stackLines.length > 10) {
        console.error(`║   ${COLORS.dim}... ${stackLines.length - 10} more stack frames${COLORS.reset}`);
      }
    }

    console.error(`${COLORS.red}╚════════════════════════════════════════════════════════════════════════════════${COLORS.reset}\n`);
  },

  parseError: parseErrorLocation,
};

module.exports = {
  logger,
  parseErrorLocation,
};

