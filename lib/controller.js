// Code pulled from https://raw.githubusercontent.com/Microsoft/TypeScript/master/lib/tsc.js
// due to: https://github.com/Microsoft/TypeScript/issues/5858#issuecomment-255185701
//
// The TypeScript compiler will not accept a tsconfig.json and an entry file, so
// is the next best thing.
const { join } = require('path');
const { execSync } = require('child_process');
const { COMPILER } = process.env;
const moduleName = COMPILER || 'typescript';
let TS = null;

let start = new Date();

try {
  const req = global.require;
  // Try local project first.
  TS = req(join(process.cwd(), moduleName));
}
catch (ex) {
  try {
    // Try loading the one bundled with this lib.
    TS = require(moduleName);
  }
  catch(ex) {
    throw ex;
  }
}

function enableStatistics(compilerOptions) {
  if (compilerOptions.diagnostics || compilerOptions.extendedDiagnostics) {
    TS.performance.enable();
  }
}

function performCompilation(fileNames, opts, diagnostics) {
  const { sys } = TS;
  const compilerHost = TS.createCompilerHost(opts);
  const regex = /(.*)\((.*)\): (.*): (.*)/g;

  enableStatistics(opts);

  const system = {
    ...sys,

    write(str) {
      const errorStrings = str.split('\n');

      errorStrings.forEach(errorString => {
        const parts = regex.exec(errorString);

        if (parts) {
          const [line, col] = parts[2].split(',');

          // Filter out files that weren't passed in.
          if (sys.args.slice(-1)[0] === parts[1]) {
            console.log(`${parts[1]}:${line}:${col}: ${parts[3]}: ${parts[4]}`);
          }
        }
      });
    }
  };

  const report = TS.createDiagnosticReporter(system, false);
  const program = TS.createProgram(
    fileNames,
    opts,
    compilerHost,
    undefined,
    diagnostics
  );

  TS.emitFilesAndReportErrors(program, report);
}

function executeCommandLine(args) {
  let configFileName;

  const commandLine = TS.parseCommandLine(args);
  const commandLineOptions = commandLine.options;

  // Last entry in the CLI args is the file running, use this as the search
  // path for a config.
  const searchPath = TS.normalizePath(join(TS.sys.getCurrentDirectory(), args[args.length - 1]));

  configFileName = TS.findConfigFile(searchPath, TS.sys.fileExists);

  const reportDiagnostic = TS.createDiagnosticReporter(TS.sys, false);

  if (configFileName) {
    const result = TS.parseConfigFileWithSystem(
      configFileName,
      commandLineOptions,
      TS.sys,
      reportDiagnostic
    );

    // Argument passed to vim-typescript controller.
    const entryFile = join(process.cwd(), args[args.length - 1])

    // Filter out all filenames that aren't the entry or a typings file.
    result.fileNames = result.fileNames.filter(fileName => {
      return fileName === entryFile || fileName.endsWith('d.ts');
    });

    if (TS.isWatchSet(result.options)) {
      reportWatchModeWithoutSysSupport();
      createWatchOfConfigFile(result, commandLineOptions);
    }
    else {
      performCompilation(
        result.fileNames,
        result.options,
        getConfigFileParsingDiagnostics(result)
      );
    }
  }
  else {
    performCompilation(commandLine.fileNames, commandLineOptions);
  }
}

function getConfigFileParsingDiagnostics(result) {
  return result.options.configFile ?
      result.options.configFile.parseDiagnostics.concat(result.errors) :
      result.errors;
}

executeCommandLine(TS.sys.args);
