# NPM Publishing Instructions

This guide will help you publish the `@deadmanswitch.app/crypto` package to npm.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **Two-Factor Authentication**: Enable 2FA for security
3. **Node.js**: Ensure you have Node.js 16+ installed

## Step-by-Step Publishing Process

### 1. Login to NPM

```bash
npm login
```

Enter your npm username, password, and 2FA code when prompted.

### 2. Verify Your Login

```bash
npm whoami
```

This should return your npm username.

### 3. Check Package Name Availability

```bash
npm view @deadmanswitch.app/crypto
```

If you get a "404 Not Found" error, the name is available. Since this is a scoped package, you'll need to ensure you have access to the `@deadmanswitch` organization on npm.

### 4. Update Package Information

Before publishing, update these fields in `package.json`:

```json
{
  "name": "@deadmanswitch.app/crypto",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Deadmanswitch/cryptography.git"
  },
  "homepage": "https://github.com/Deadmanswitch/cryptography#readme",
  "bugs": {
    "url": "https://github.com/Deadmanswitch/cryptography/issues"
  }
}
```

### 5. Final Build and Test

```bash
# Clean build
rm -rf dist/
npm run build

# Run tests
npm test

# Test package locally
npm pack
```

### 6. Publish to NPM

Since this is a scoped package, you need to specify public access:

```bash
npm publish --access public
```

**Note**: For scoped packages under an organization, you must use `--access public` unless you have a paid npm account for private packages.

### 7. Verify Publication

```bash
npm view @deadmanswitch.app/crypto
```

Visit your package page: `https://www.npmjs.com/package/@deadmanswitch.app/crypto`

## Future Updates

### Version Bumping

For updates, increment the version number:

```bash
# Patch version (bug fixes): 1.0.0 -> 1.0.1
npm version patch

# Minor version (new features): 1.0.0 -> 1.1.0
npm version minor

# Major version (breaking changes): 1.0.0 -> 2.0.0
npm version major
```

Then publish:

```bash
npm publish
```

## Package Management

### Adding Contributors

```bash
npm owner add <username> @deadmanswitch.app/crypto
```

### Package Statistics

Check download stats:
```bash
npm view @deadmanswitch.app/crypto
```

### Deprecating Versions

```bash
npm deprecate @deadmanswitch.app/crypto@1.0.0 "Please upgrade to 1.1.0"
```

## Troubleshooting

### Common Issues

1. **Name already taken**: Choose a different name or use scoped package
2. **Permission denied**: Ensure you're logged in and have publishing rights
3. **2FA required**: Make sure you have 2FA enabled and enter the correct code
4. **Package too large**: Check .npmignore file to exclude unnecessary files

### Package Size Optimization

Current package size: ~4.2 kB (excellent!)

The package includes only essential files:
- `dist/` - Compiled JavaScript and TypeScript definitions
- `README.md` - Documentation
- `package.json` - Package metadata

### Security

- Never publish `.env` files or secrets
- Review the package contents with `npm pack` before publishing
- Use npm audit to check for vulnerabilities: `npm audit`

## Success! 🎉

Once published, users can install your package:

```bash
npm install @deadmanswitch.app/crypto
```

And use it in their projects:

```typescript
import { encrypt, decrypt } from '@deadmanswitch.app/crypto';
```

## Next Steps

1. **Create a GitHub repository** for the source code
2. **Set up CI/CD** for automated testing and publishing
3. **Create GitHub releases** that match npm versions
4. **Add badges** to README (npm version, downloads, etc.)
5. **Consider publishing to other registries** (GitHub Packages, etc.)

Happy publishing! 🚀