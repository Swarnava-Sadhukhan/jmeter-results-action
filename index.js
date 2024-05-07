const fs = require('fs');
const parse = require('csv-parse');
const core = require('@actions/core');

function analyzeResults(filePath, maxAverageResponseTime, maxErrorRate) {
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
    const filePath = core.getInput('file_path');
    const maxAverageResponseTime = parseFloat(core.getInput('max_average_response_time'));
    const maxErrorRate = parseFloat(core.getInput('max_error_rate'));

    analyzeResults(filePath, maxAverageResponseTime, maxErrorRate);
} catch (error) {
    core.setFailed(error.message);
}
