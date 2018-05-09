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
    const configParseResult = TS.parseConfigFileWithSystem(configFileName, commandLineOptions, TS.sys, reportDiagnostic);

    configParseResult.fileNames = [args[args.length - 1]];

    if (TS.isWatchSet(configParseResult.options)) {
      reportWatchModeWithoutSysSupport();
      createWatchOfConfigFile(configParseResult, commandLineOptions);
    }
    else {
      performCompilation(configParseResult.fileNames, configParseResult.options, getConfigFileParsingDiagnostics(configParseResult));
    }
  }
  else {
    performCompilation(commandLine.fileNames, commandLineOptions);
  }
}

function getConfigFileParsingDiagnostics(configFileParseResult) {
  return configFileParseResult.options.configFile ?
      configFileParseResult.options.configFile.parseDiagnostics.concat(configFileParseResult.errors) :
      configFileParseResult.errors;
}

executeCommandLine(TS.sys.args);
