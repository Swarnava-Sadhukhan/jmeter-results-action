const { execSync } = require('child_process');
const fs = require('fs');

function installDependencies() {
    console.log('Installing dependencies...');
    execSync(`cd ${__dirname}`, { stdio: 'inherit' });
    console.log(__dirname + "is the current directory");
    execSync('npm i', { stdio: 'inherit' });
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

        core.setOutput("Average Response Time", `${averageResponseTime} ms`);
        core.setOutput("Error Rate", `${errorRate * 100}%`);

        if (averageResponseTime > maxAverageResponseTime || errorRate > maxErrorRate) {
            core.setFailed("Performance benchmarks not met.");
        } else {
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
