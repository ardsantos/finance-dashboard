Create a new branch, commit all changes, and generate a pull request.

This command will:
1. Create a new feature branch with a descriptive name based on current changes
2. Stage and commit all changes with an auto-generated commit message
3. Push the branch to the remote repository
4. Create a pull request with a detailed description
5. Return to branch 'develop'

Usage:
/finish [branch-name]

If no branch name is provided, it will generate one based on the current changes.

The command analyzes the current git status, recent commits, and file changes to create:
- A descriptive branch name (e.g., feature/localstorage-management-2025-01-14)
- A comprehensive commit message summarizing the changes
- A detailed PR description with implementation summary and test plan

Requirements:
- GitHub CLI (gh) must be installed and authenticated
- Working directory must be a git repository with remote origin configured