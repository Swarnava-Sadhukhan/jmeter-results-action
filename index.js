const { execSync } = require('child_process');
const fs = require('fs');

function installDependencies() {
    const actionDir = __dirname; 
    console.log('Installing dependencies...');
    try {
        process.chdir(actionDir);  // Change to the directory of the action script
        console.log(`Current directory: ${process.cwd()}`);
        execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
        core.setFailed(`Dependency installation failed: ${error}`);
    }
}

function main() {
    try {
        installDependencies();
        console.log('Running action...');
    } catch (error) {
        console.error(`Error executing action: ${error.message}`);
        process.exit(1);
    }
}

function analyzeResults(filePath, maxAverageResponseTime, maxErrorRate) {
    const parse = require('csv-parse');
    const parser = fs.createReadStream(filePath)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true
        }));

    let totalSamples = 0;
    let totalResponseTime = 0;
    let failedSamples = 0;

    parser.on('data', (row) => {
        if (!row.responseMessage.includes("Number of samples in transaction") && !row.label.includes("Debug Sampler")) {
            console.log(`${row.label} -> ${row.elapsed}ms`);
            totalSamples++;
            totalResponseTime += parseInt(row.elapsed, 10);
            if (row.success.trim().toLowerCase() === 'false') {
                failedSamples++;
            }
        }
    });

    parser.on('end', () => {
        if (totalSamples === 0) {
            core.setFailed("No samples found.");
            return;
        }

        const averageResponseTime = totalResponseTime / totalSamples;
        const errorRate = failedSamples / totalSamples;
        const core = require('@actions/core');

        core.setOutput("Average Response Time", `${averageResponseTime} ms`);
        core.setOutput("Error Rate", `${errorRate * 100}%`);

        if (averageResponseTime > maxAverageResponseTime || errorRate > maxErrorRate) {
            core.setFailed("Performance benchmarks not met.");
        } else {
            console.log(`Average Response Time is ${averageResponseTime} ms`);
            console.log(`Error Rate is ${errorRate * 100}%`);
            console.log(averageResponseTime);
            console.log(errorRate);
            core.info("Performance benchmarks met.");
        }
    });
}

try {
    main();
    const core = require('@actions/core');
    const filePath = core.getInput('file_path');
    const maxAverageResponseTime = parseFloat(core.getInput('max_average_response_time'));
    const maxErrorRate = parseFloat(core.getInput('max_error_rate'));
    
    analyzeResults(filePath, maxAverageResponseTime, maxErrorRate);
} catch (error) {
    core.setFailed(error.message);
}
