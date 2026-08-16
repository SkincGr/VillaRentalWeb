# Agent Configuration & Rules for VillaRentalWeb

## Execution Guidelines
- **Autonomous Execution**: Always execute code edits, file creations, refactoring, bug fixes, data logic changes, and development commands directly and immediately without asking for user permission or confirmation.
- **No Confirmation Prompts for Standard Actions**: Never ask "Should I proceed?", "Would you like me to make these changes?", or wait for approval for routine code, bug fixes, or functionality requests.
- **Design Approval Only**: The ONLY time to request user confirmation/feedback is when presenting a completely new UI/UX design, new visual concept, or major page layout redesign before finalizing it.
- **No Auto Vercel / GitHub Deployments**: Do NOT push to GitHub or trigger Vercel deployments after every single task. Only build and test locally (`npm run build`). Deployments to GitHub / Vercel will be performed only at the end when explicitly requested by the user.
- **Direct Reporting**: Implement requested changes immediately, verify correctness with tests/builds, and present the concise final results.
