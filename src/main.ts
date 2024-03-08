/**
 * Copyright (c) 2021, Oracle and/or its affiliates.
 * Licensed under the Universal Permissive License v1.0 as shown at https://oss.oracle.com/licenses/upl.
 */

 import * as core from '@actions/core';
 import * as io from '@actions/io';
 import * as exec from '@actions/exec';
 
 import * as fs from 'fs';
 import * as os from 'os';
 import * as path from 'path';
 
 /**
  * Install the OCI CLI (if ncessary) and then run the command specified by
  * the user workflow. By default, the action suppresses/masks the command
  * and output from the GitHub console and logs to avoid leaking confidential
  * data.
  *
  */
 async function runOciCliCommand(): Promise<void> {
   if (!fs.existsSync(path.join(os.homedir(), '.oci-cli-installed'))) {
     core.startGroup('Installing Oracle Cloud Infrastructure CLI');
     const cli = await exec.getExecOutput('python -m pip install oci-cli');
 
     if (cli && cli.exitCode == 0) {
       fs.writeFileSync(
         path.join(os.homedir(), '.oci-cli-installed'),
         'success'
       );
     }
     core.endGroup();
   }
 
   const cliBin = await io.which('oci', true);
   const cliArgs = core
     .getInput('command', {required: true})
     .replace(/^(oci\s)/, '')
     .replace('--raw-output', '')
     .trim();
   const jmesPath = core.getInput('query')
     ? `--query "${core.getInput('query').trim()}"`
     : '';
   core.info('Executing Oracle Cloud Infrastructure CLI command');
   const silent = core.getBooleanInput('silent', {required: false});
 
   const cliCommand = `${cliBin} ${jmesPath} ${cliArgs}`;
   if (silent) core.setSecret(cliCommand);
   core.info('Flag 0');
   core.warning('Flag 0');
   const cliResult = await exec.getExecOutput(cliCommand, [], {silent: silent});
   core.info('Flag 1');
   core.debug('Flag 1');
   if (cliResult) {
     const stdout = cliResult.stdout ? JSON.parse(cliResult.stdout) : {};
     const stderr = cliResult.stderr ? JSON.stringify(cliResult.stderr) : '';
     core.info('Flag 2');
     core.debug('Flag 2');
     if (cliResult.exitCode == 0) {
       
       const output = JSON.stringify(JSON.stringify(stdout));
       core.info(output);
       core.info('Flag 3');
       if (silent && output) core.setSecret(output);
       core.setOutput('output', output);
       
       let raw_output = null;
       if (typeof stdout == 'string') {
         core.debug("cli output is a raw string");
         raw_output = stdout;
       } else if (Object.keys(stdout).length == 1) {
         core.debug("cli output is an array of string with single Element")
         const raw_output = stdout[0];
       }
 
       if(raw_output){
         if (silent) core.setSecret(raw_output);
          core.setOutput('raw_output', raw_output);
       }
 
 
     } else {
       core.setFailed(`Failed: ${JSON.stringify(stderr)}`);
     }
   } else {
     core.setFailed('Failed to execute OCI CLI command.');
   }
 }
 
 /**
  * Requires OCI CLI environment variables to be set
  */
 runOciCliCommand().catch(e => {
   if (e instanceof Error) core.setFailed(e.message);
 });
 
