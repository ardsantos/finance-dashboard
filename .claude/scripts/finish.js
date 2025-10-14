#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_BRANCH = 'develop';
const TIMESTAMP = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

function executeCommand(command, description) {
  try {
    console.log(`🔄 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return result.trim();
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    return [];
  }
}

function getChangedFiles() {
  try {
    const diff = execSync('git diff --name-only', { encoding: 'utf8' });
    const cached = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' });

    return [
      ...diff.trim().split('\n').filter(f => f.length > 0),
      ...cached.trim().split('\n').filter(f => f.length > 0),
      ...untracked.trim().split('\n').filter(f => f.length > 0)
    ];
  } catch (error) {
    return [];
  }
}

function getCurrentBranch() {
  try {
    return executeCommand('git rev-parse --abbrev-ref HEAD', 'Getting current branch');
  } catch (error) {
    return 'main';
  }
}

function getRecentCommits() {
  try {
    const commits = executeCommand('git log --oneline -5', 'Getting recent commits');
    return commits.split('\n').map(line => line.trim());
  } catch (error) {
    return [];
  }
}

function generateBranchName(changedFiles) {
  const filePatterns = {
    'storage': ['storage', 'localstorage', 'data'],
    'dashboard': ['dashboard'],
    'transactions': ['transaction'],
    'budget': ['budget'],
    'import': ['import', 'csv'],
    'ui': ['component', 'ui', 'style', 'css'],
    'config': ['config', 'setup', 'eslint', 'vite'],
    'docs': ['md', 'readme', 'doc']
  };

  const features = [];

  changedFiles.forEach(file => {
    const lowerFile = file.toLowerCase();
    for (const [feature, patterns] of Object.entries(filePatterns)) {
      if (patterns.some(pattern => lowerFile.includes(pattern))) {
        if (!features.includes(feature)) {
          features.push(feature);
        }
      }
    }
  });

  if (features.length === 0) {
    features.push('update');
  }

  return `feature/${features.join('-')}-${TIMESTAMP}`;
}

function generateCommitMessage(changedFiles, recentCommits) {
  const fileCategories = {};

  changedFiles.forEach(file => {
    const parts = file.split('/');
    const category = parts[0] || 'root';
    if (!fileCategories[category]) {
      fileCategories[category] = [];
    }
    fileCategories[category].push(parts[parts.length - 1]);
  });

  let summary = '';
  const details = [];

  if (fileCategories.utils && fileCategories.utils.includes('storage.ts')) {
    summary = 'Add localStorage management system';
    details.push('- Implement transaction and category storage utilities');
    details.push('- Add data validation and error handling');
    details.push('- Include Brazilian sample data generation');
  } else if (fileCategories.commands) {
    summary = 'Add custom slash command for workflow automation';
    details.push('- Create /finish command for branch/commit/PR workflow');
  } else {
    // Generic summary based on changed categories
    const categories = Object.keys(fileCategories);
    if (categories.includes('src')) {
      summary = 'Update application functionality';
    } else if (categories.includes('docs')) {
      summary = 'Update documentation';
    } else {
      summary = `Update ${categories.join(', ')}`;
    }
  }

  const commitMessage = `${summary}

${details.join('\n')}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;

  return commitMessage;
}

function generatePRDescription(branchName, changedFiles, commitMessage) {
  const summary = commitMessage.split('\n')[0];
  const details = commitMessage.split('\n').slice(1, -3).join('\n');

  const testPlan = [
    '- Verify localStorage persistence across browser sessions',
    '- Test data validation with invalid inputs',
    '- Confirm Brazilian sample data generation works correctly',
    '- Validate export/import functionality'
  ];

  const prDescription = `## Summary
${summary}

## Implementation Details
${details}

## Files Changed
${changedFiles.map(file => `- \`${file}\``).join('\n')}

## Test Plan
${testPlan.map(item => item).join('\n')}

🤖 Generated with [Claude Code](https://claude.com/claude-code)`;

  return prDescription;
}

function main() {
  const args = process.argv.slice(2);
  const providedBranchName = args[0];

  try {
    console.log('🚀 Starting finish workflow...');

    // Check git status
    const status = getGitStatus();
    if (status.length === 0) {
      console.log('⚠️  No changes to commit. Exiting.');
      return;
    }

    const currentBranch = getCurrentBranch();
    const changedFiles = getChangedFiles();
    const recentCommits = getRecentCommits();

    console.log(`📊 Found ${changedFiles.length} changed files`);
    console.log(`📂 Current branch: ${currentBranch}`);

    // Generate or use provided branch name
    const branchName = providedBranchName || generateBranchName(changedFiles);
    console.log(`🌿 Creating branch: ${branchName}`);

    // Create and checkout new branch
    executeCommand(`git checkout -b ${branchName}`, `Creating branch ${branchName}`);

    // Stage all changes
    executeCommand('git add .', 'Staging all changes');

    // Generate commit message
    const commitMessage = generateCommitMessage(changedFiles, recentCommits);

    // Commit changes
    console.log('💾 Committing changes...');

    // Create temporary file for commit message
    const commitFile = path.join(__dirname, 'temp_commit_message.txt');
    fs.writeFileSync(commitFile, commitMessage);

    executeCommand(`git commit -F "${commitFile}"`, 'Committing changes');

    // Clean up temp file
    fs.unlinkSync(commitFile);

    // Push to remote
    executeCommand(`git push -u origin ${branchName}`, 'Pushing to remote');

    // Generate PR description
    const prDescription = generatePRDescription(branchName, changedFiles, commitMessage);

    // Check if GitHub CLI is available
    let ghAvailable = false;
    try {
      executeCommand('which gh', 'Checking GitHub CLI availability');
      ghAvailable = true;
    } catch (error) {
      console.log('⚠️  GitHub CLI (gh) not found. Please install it to create PRs automatically.');
    }

    // Create PR using gh CLI if available
    if (ghAvailable) {
      console.log('📋 Creating pull request...');
      try {
        executeCommand('gh auth status', 'Checking GitHub CLI authentication');

        // Create temporary file for PR description to avoid shell escaping issues
        const tempFile = path.join(__dirname, 'temp_pr_description.md');
        fs.writeFileSync(tempFile, prDescription);

        const prUrl = executeCommand(
          `gh pr create --title "${commitMessage.split('\n')[0]}" --body-file "${tempFile}"`,
          'Creating pull request'
        );

        // Clean up temp file
        fs.unlinkSync(tempFile);

        console.log(`✅ Pull request created: ${prUrl}`);
      } catch (error) {
        console.log('⚠️  Could not create PR automatically. Please create it manually.');
        console.log('PR Description:');
        console.log(prDescription);
      }
    } else {
      console.log('📋 Manual PR creation required');
      console.log('PR Description:');
      console.log(prDescription);
      console.log('\nTo install GitHub CLI: https://cli.github.com/manual/installation');
    }

    console.log('🎉 Finish workflow completed successfully!');

  } catch (error) {
    console.error('❌ Finish workflow failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}