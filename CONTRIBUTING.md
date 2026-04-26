# Contributing to Internship OS

First off, thanks for taking the time to look at this project! 🎉

While this is primarily a portfolio project, I'm open to feedback, bug reports, and thoughtful contributions.

## 🐛 Found a Bug?

If you find a bug in the code:

1. **Check existing issues** to see if it's already been reported
2. **Open a new issue** with:
   - Clear title describing the bug
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (OS, Node version, browser)
   - Screenshots if applicable

## 💡 Have a Feature Idea?

Feature requests are welcome! Before opening an issue:

1. Check the **Roadmap** section in README.md
2. Consider if it aligns with the "proof-first internship application" mission
3. Open an issue tagged `enhancement` with:
   - What problem it solves
   - How it fits the existing architecture
   - Why it's valuable for the target user (college students applying to internships)

## 🔧 Want to Contribute Code?

### Before You Start

1. **Open an issue first** to discuss your proposed changes
2. Wait for feedback to ensure your work aligns with the project vision
3. Fork the repository and create a feature branch

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Internship-OS.git
cd Internship-OS

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Add your API keys to .env.local

# Start PostgreSQL
npm run db:up

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

### Code Style

This project uses:

- **TypeScript** (strict mode)
- **ESLint** + **Prettier** (pre-commit hooks via Husky)
- **Conventional Commits** for commit messages

**Before committing:**

```bash
# Lint will run automatically on pre-commit
# But you can run manually:
npm run lint

# Format code:
npx prettier --write .
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add GitHub activity enrichment
fix: resolve queue filter edge case
docs: update README with new features
refactor: simplify matching pipeline
test: add unit tests for evidence mapper
```

### Pull Request Process

1. **Create a feature branch**: `git checkout -b feat/your-feature-name`
2. **Make your changes** following the code style
3. **Write/update tests** if applicable
4. **Update documentation** (README, comments, etc.)
5. **Commit with descriptive messages**
6. **Push to your fork**: `git push origin feat/your-feature-name`
7. **Open a Pull Request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to related issue (if any)
   - Screenshots/demos if UI changes

### What Makes a Good PR?

✅ **Good PR:**

- Solves a single, well-defined problem
- Includes tests (if adding new functionality)
- Updates relevant documentation
- Follows existing code patterns
- Has clear commit messages

❌ **Avoid:**

- Massive PRs touching many unrelated files
- Mixing refactoring with feature work
- Changing code style unrelated to your fix
- Breaking existing functionality

## 🧪 Testing

Currently, this project doesn't have a comprehensive test suite (it's a portfolio project built rapidly). However, if you're adding critical functionality:

- Add unit tests for new business logic
- Test edge cases manually
- Document test scenarios in your PR

Future: Planning to add Jest + React Testing Library.

## 🏗 Architecture Guidelines

When adding features, respect the existing architecture:

### Key Principles

1. **Trust over automation**: Always show provenance, allow manual overrides
2. **Conservative AI**: Use low temperature, explicit decision criteria
3. **Performance**: Consider circuit breakers, batch operations
4. **Privacy**: No user data leaves the database without explicit action

### Code Organization

```
src/
├── app/          → Next.js App Router (pages, layouts, API routes)
├── components/   → React components (presentational)
├── lib/          → Business logic
│   ├── db/       → Database layer (Drizzle queries)
│   ├── jobs/     → Job pipeline (sources, parsers, workers)
│   ├── matching/ → Matching engine (embedder, mapper, ranker)
│   └── schemas/  → Zod validation schemas
```

### Database Changes

If your change requires schema modifications:

1. Generate migration: `npm run db:generate`
2. Review the migration file in `migrations/`
3. Test migration: `npm run db:migrate`
4. Update TypeScript types (Drizzle auto-generates)
5. Update query functions in `src/lib/db/queries/`

### Adding New Job Sources

To add a new job board adapter:

1. Create `src/lib/jobs/sources/your-source.ts`
2. Implement the `JobSourceAdapter` interface
3. Export from `src/lib/jobs/sources/index.ts`
4. Update `job-poller.ts` worker to include new source
5. Add source-specific configuration to user criteria

## 📖 Documentation

- Update README.md if you change features, setup, or architecture
- Add inline comments for complex logic
- Update `.planning/` docs if you change the roadmap

## 🚫 Out of Scope

The following are **intentionally excluded** from V1:

- One-click mass apply (destroys product quality)
- Generic full-time job support (internship-only focus)
- Social graph scraping
- Live interview copilot
- Generic cover letter generator

See FINAL_PRD.md for the full rationale.

## ❓ Questions?

Open an issue with the `question` label or reach out via:

- GitHub Issues: https://github.com/mekyle-s/Internship-OS/issues
- Email: [your-email]

## 📜 Code of Conduct

Be respectful, constructive, and professional. This is a learning project—feedback should be kind and actionable.

---

**Thanks for contributing!** Every bug report, feature idea, and PR helps make this project better. 🙌
