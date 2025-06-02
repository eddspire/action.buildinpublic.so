# buildinpublic.so Action Export

[![GitHub marketplace](https://img.shields.io/badge/marketplace-buildinpublic--action--export-blue?logo=github)](https://github.com/marketplace/actions/buildinpublic-action-export)
[![CI](https://github.com/buildinpublic/action.buildinpublic.so/actions/workflows/ci.yml/badge.svg)](https://github.com/buildinpublic/action.buildinpublic.so/actions/workflows/ci.yml)

Automatically export your commit history to buildinpublic.so for instant, beautiful developer cards. Zero configuration required.

## ✨ Value Proposition

- **Instant Updates**: Get real-time commit cards as soon as you push
- **Zero Code Access**: Only metadata is shared—never your actual code
- **Seamless Integration**: Works with any repository structure
- **Beautiful Cards**: Automatically formatted developer portfolio cards

## 🚀 Quick Start

### 1. Add to Your Workflow

Create `.github/workflows/buildinpublic.yml`:

```yaml
name: buildinpublic.so Export
on:
  push:
    branches: [ main, master ]

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: buildinpublic/action.buildinpublic.so@v1
        with:
          api-token: ${{ secrets.BUILDINPUBLIC_API_TOKEN }}
```

### 2. Get Your API Token

1. Visit [buildinpublic.so Dashboard](https://buildinpublic.so/dashboard)
2. Connect your repository
3. Copy the generated API token
4. Add it as `BUILDINPUBLIC_API_TOKEN` in your repository secrets

### 3. Push and See Magic ✨

Your commits will automatically appear as beautiful cards on buildinpublic.so!

## 📝 Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `api-token` | buildinpublic.so API token from your dashboard | ✅ | |

## 📊 Outputs

| Output | Description |
|--------|-------------|
| `commits` | Number of commits processed |

## 🔒 Security & Privacy

- **Metadata Only**: We only access commit messages, author info, and timestamps
- **No Code Access**: Your source code never leaves GitHub
- **Secure Transmission**: All data encrypted in transit
- **Revocable**: Disconnect anytime from your dashboard

## 🛠️ Advanced Usage

### Custom Branch Triggers

```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
```

### Conditional Execution

```yaml
- uses: buildinpublic/action.buildinpublic.so@v1
  if: github.event_name == 'push'
  with:
    api-token: ${{ secrets.BUILDINPUBLIC_API_TOKEN }}
```

## 🔧 Troubleshooting

### Action not triggering?
- Ensure the workflow file is in `.github/workflows/`
- Check that `BUILDINPUBLIC_API_TOKEN` is set in repository secrets
- Verify your repository is connected in buildinpublic.so dashboard

### No cards appearing?
- Check the action logs in the Actions tab
- Ensure your buildinpublic.so account is properly configured
- Verify the API token hasn't expired

## 📞 Support

- [Documentation](https://buildinpublic.so/docs)
- [GitHub Issues](https://github.com/buildinpublic/action.buildinpublic.so/issues)
- [Discord Community](https://discord.gg/buildinpublic)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [buildinpublic.so](https://buildinpublic.so) - Build in public, ship with confidence. 