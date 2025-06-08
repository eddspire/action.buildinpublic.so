import * as core from '@actions/core';
import * as github from '@actions/github';
import { createHmac } from 'crypto';

interface Commit {
  id: string;
  message: string;
  author: { name: string; email: string };
  timestamp: string;
  url: string;
  files: {
    added: string[];
    modified: string[];
    removed: string[];
    total_changes: number;
  };
}

/**
 * GitHub Action entry point for buildinpublic.so commit export
 */
export async function run(): Promise<void> {
  try {
    core.info('🚀 buildinpublic.so Action Export started');

    // Get action inputs
    const apiToken = core.getInput('api-token', { required: true }).trim();

    // Get GitHub context
    const context = github.context;
    const { payload } = context;
    
    core.info(`Repository: ${context.repo.owner}/${context.repo.repo}`);
    core.info(`Event: ${context.eventName}`);

    // Bail out early for events that do not contain commit lists
    if (context.eventName !== 'push') {
      core.warning(
        `Unsupported event "${context.eventName}". This action currently processes only push events.`
      );
      core.setOutput('commits', 0);
      return;
    }

    // Extract commits from the push payload
    const commits = payload.commits || [];
    
    if (commits.length === 0) {
      core.info('No commits found in push payload');
      core.setOutput('commits', 0);
      return;
    }

    core.info(`Found ${commits.length} commits to process`);

    // Start timing for accurate execution time measurement
    const startTime = Date.now();

    // Format commits for buildinpublic.so API with validation
    const formattedCommits = commits
      .map((commit: any): Commit | null => {
        if (!commit?.id || !commit?.message || !commit?.author) {
          core.warning(`Skipping malformed commit: ${JSON.stringify(commit)}`);
          return null;
        }
        const addedFiles = commit.added || [];
        const modifiedFiles = commit.modified || [];
        const removedFiles = commit.removed || [];
        
        return {
          id: commit.id,
          // Trim to server-side hard limit to prevent 413 / 422 responses
          message: commit.message.slice(0, 10_000),
          author: {
            name: commit.author?.name || 'Unknown',
            email: commit.author?.email || 'unknown@example.com',
          },
          timestamp: new Date(commit.timestamp || Date.now()).toISOString(),
          url: commit.url?.startsWith('https://') ? commit.url : `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${commit.id}`,
          files: {
            added: addedFiles,
            modified: modifiedFiles,
            removed: removedFiles,
            total_changes: addedFiles.length + modifiedFiles.length + removedFiles.length,
          },
        };
      })
      .filter((c: Commit | null): c is Commit => c !== null);

    // Check if we have any valid commits after filtering
    if (formattedCommits.length === 0) {
      core.warning('No valid commits found after validation');
      core.setOutput('commits', 0);
      return;
    }

    if (formattedCommits.length !== commits.length) {
      core.warning(`Filtered out ${commits.length - formattedCommits.length} malformed commits`);
    }

    // Prepare buildinpublic.so API payload (job_minutes calculated just before sending)
    const apiPayload = {
      repo: context.repo.repo,
      owner: context.repo.owner,
      commits: formattedCommits,
    };

    // Send to buildinpublic.so API with retry logic
    await sendToBuildinpublicSo(apiPayload, apiToken, startTime);

    // Calculate final execution time for logging
    const executionTime = Math.max(1, Math.ceil((Date.now() - startTime) / 1000 / 60));
    
    core.info(`✅ Successfully processed ${formattedCommits.length} commits`);
    core.info(`⏱️ Execution time: ${executionTime} minutes`);
    
    // Set outputs
    core.setOutput('commits', formattedCommits.length);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    core.error(`❌ Action failed: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

/**
 * Generate HMAC SHA-256 signature for the payload
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Send payload to buildinpublic.so API with exponential backoff retry logic
 */
export async function sendToBuildinpublicSo(payload: any, apiToken: string, startTime: number): Promise<void> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.info(`📡 Sending to buildinpublic.so API (attempt ${attempt}/${maxRetries})`);
      
      // Calculate execution time right before sending to include all retry delays
      const executionTime = Math.max(1, Math.ceil((Date.now() - startTime) / 1000 / 60));
      const payloadWithTiming = { ...payload, job_minutes: executionTime };
      
      const body = JSON.stringify(payloadWithTiming);
      const signature = generateSignature(body, apiToken);
      
      const response = await fetch('https://buildinpublic.so/api/github-actions/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature,
          'User-Agent': 'buildinpublic.so-Action/1.0.0',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const resultText = await response.text();
      try {
        const parsed = JSON.parse(resultText);
        core.info(`✅ API response: ${JSON.stringify(parsed)}`);
      } catch {
        throw new Error(
          `API responded with non-JSON payload: "${resultText.slice(0, 200)}…"`
        );
      }
      return; // Success - exit retry loop
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`⚠️ Attempt ${attempt} failed: ${errorMessage}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${errorMessage}`);
      }
      
      // Exponential backoff: wait 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      core.info(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Execute the action only if this module is run directly (not imported)
if (require.main === module) {
  run();
} 