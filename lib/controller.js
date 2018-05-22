// Code pulled from https://raw.githubusercontent.com/Microsoft/TypeScript/master/lib/tsc.js
// due to: https://github.com/Microsoft/TypeScript/issues/5858#issuecomment-255185701
//
// The TypeScript compiler will not accept a tsconfig.json and an entry file, so
// is the next best thing.
const { join } = require('path');
const { COMPILER } = process.env;
const moduleName = COMPILER || 'typescript';
let TS = null;

try {
  // Try local project first.
  TS = require(join(process.cwd(), 'typescript'));
}
catch (ex) {
  try {
    // Try loading the one bundled with this lib.
    TS = require(join(__dirname, '..', 'node_modules', 'typescript'));
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

  enableStatistics(opts);

  const report = TS.createDiagnosticReporter(sys);
  const program = TS.createProgram(
    fileNames,
    opts,
    compilerHost,
    undefined,
    diagnostics
  );

  TS.emitFilesAndReportErrors(program, report, s => {
    return sys.write(`${s}${sys.newLine}`);
  });
}

function executeCommandLine(args) {
  let configFileName;

  const commandLine = TS.parseCommandLine(args);
  const commandLineOptions = commandLine.options;
  const searchPath = TS.normalizePath(TS.sys.getCurrentDirectory());

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
