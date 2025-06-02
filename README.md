# Turn Every Commit Into Your Success Story

[![GitHub marketplace](https://img.shields.io/badge/marketplace-buildinpublic.so--action--export-blue?logo=github)](https://github.com/marketplace/actions/buildinpublic.so-action-export)
[![CI](https://github.com/eddspire/action.buildinpublic.so/actions/workflows/ci.yml/badge.svg)](https://github.com/eddspire/action.buildinpublic.so/actions/workflows/ci.yml)

**Stop hiding your best stories in git logs.** Every commit is a chapter in your entrepreneurial journey—BuildInPublic.so helps the world read it.

---

## 🎯 **Your Git History Is Your Success Story**

You're already documenting your wins, struggles, and breakthroughs in every commit message. **But that story is trapped in your repository.** 

This GitHub Action automatically transforms your commits into beautiful, shareable developer cards that build your audience while you build your product.

### ✨ **What You Get**

🏗️ **Build Your Audience While You Build**  
Every push becomes content. Every feature becomes a story. Every bug fix becomes a teaching moment.

🔒 **Zero Code Access, Maximum Trust**  
We read your commit messages, not your code. Your intellectual property stays yours—always.

⚡ **Effortless Build-in-Public**  
No more "what should I tweet about today?" Your work creates your content automatically.

📈 **Developer Portfolio That Grows Itself**  
Beautiful cards showcasing your real work, real progress, and real expertise.

---

## 🚀 **From Setup to Success in 60 Seconds**

### 1. **Add the Magic** ✨

Create `.github/workflows/buildinpublic.yml` in your repo:

```yaml
name: "Build in Public - Automatic Story Creation"
on:
  push:
    branches: [ main, master ]

jobs:
  build-in-public:
    runs-on: ubuntu-latest
    steps:
             - name: Transform commits into stories
         uses: eddspire/action.buildinpublic.so@v1
        with:
          api-token: ${{ secrets.BUILDINPUBLIC_API_TOKEN }}
```

### 2. **Connect Your Story** 🔗

1. Visit [buildinpublic.so/dashboard](https://buildinpublic.so/dashboard)
2. Connect your repository (we only need commit metadata)
3. Copy your unique API token
4. Add it as `BUILDINPUBLIC_API_TOKEN` in your repository secrets

### 3. **Watch Your Audience Grow** 📈

Push your next commit and watch it transform into a beautiful, shareable story card automatically!

---

## 💡 **Before vs After**

### Your Current Reality:
❌ Great work happening in private  
❌ Struggling to create consistent content  
❌ Amazing commits buried in git logs  
❌ Building in isolation  

### With BuildInPublic.so:
✅ Every commit becomes content  
✅ Automatic, authentic storytelling  
✅ Growing audience sees your real journey  
✅ Community building happens naturally  

---

## 🛡️ **Your Code, Your Castle—We Just Read the Diary**

**What We Access:**
- ✅ Commit messages (your stories)
- ✅ Author information (your credit)
- ✅ Timestamps (your journey timeline)

**What We NEVER Access:**
- ❌ Your source code
- ❌ File contents
- ❌ Repository files
- ❌ Sensitive data

**Security Promise:** Even if someone hacked our entire system, they still couldn't see your code. We literally don't have access to it.

---

## ⚙️ **Advanced Storytelling**

### Tell Stories from Multiple Branches
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
```

### Conditional Story Creation
```yaml
- uses: eddspire/action.buildinpublic.so@v1
  if: github.event_name == 'push' && !contains(github.event.head_commit.message, '[skip-story]')
  with:
    api-token: ${{ secrets.BUILDINPUBLIC_API_TOKEN }}
```

---

## 🔧 **When Things Don't Work (They Always Do, But Just In Case)**

### **Action Not Running?**
- Double-check `.github/workflows/` path
- Verify `BUILDINPUBLIC_API_TOKEN` in repository secrets
- Ensure repository is connected in your dashboard

### **Stories Not Appearing?**
- Check action logs in your repository's Actions tab
- Confirm your buildinpublic.so account setup
- Verify API token is still valid

### **Need Help Building Your Story?**
We're here for you:
- 📚 [Complete Documentation](https://buildinpublic.so/docs)
- 🐛 [Report Issues](https://github.com/eddspire/action.buildinpublic.so/issues)
- 💬 [Join Our Community](https://discord.gg/buildinpublic)

---

## 🎊 **Ready to Start Building Your Story?**

**Your next commit could be your breakthrough moment.**

[**Start Building in Public →**](https://buildinpublic.so)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [@eddspire](https://x.com/@eddspire)

</div>