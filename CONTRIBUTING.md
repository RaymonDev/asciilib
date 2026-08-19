# Contributing to asciilib

Thank you for your interest in contributing to **asciilib**! We welcome contributions, feature requests, bug fixes, and performance improvements from the open-source community.

---

## Code of Conduct

All contributors and participants agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect and empathy.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the [GitHub Issues](https://github.com/RaymonDev/asciilib/issues) tab first to see if the issue has already been reported.
- If not, create a new issue including:
  - A clear, descriptive title.
  - Steps to reproduce the bug.
  - Expected vs. actual behavior.
  - Browser and platform details.

### 2. Suggesting Enhancements
- Open an issue tagged with `enhancement`.
- Describe the feature in detail, why it is useful, and how it aligns with `asciilib`'s zero-dependency philosophy.

### 3. Submitting Pull Requests
1. **Fork the Repository**:
   ```bash
   git clone https://github.com/<your-username>/asciilib.git
   cd asciilib
   ```
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Make Your Changes**
   - Add unit/integration tests in `test/` for new functionality.
4. **Run the Test Suite**:
   ```bash
   npm test
   ```
5. **Verify Documentation** (if modifying `docs/`):
   ```bash
   npm run docs:build
   ```
6. **Submit PR**:
   - Push your branch to GitHub and open a Pull Request against the `main` branch.

---

## Architectural Principles

- **Zero Runtime Dependencies**
- **High Performance**
- **Clean Type Definitions**

---

## License

By contributing to `asciilib`, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
