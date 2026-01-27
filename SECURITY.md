# Security Policy

---

## 🛡️ Security Overview

SynapseStrike is an AI-powered trading system that handles real funds and API credentials. We take security seriously and appreciate the security community's efforts to responsibly disclose vulnerabilities.

**Critical Areas:**
- 🔑 API key storage and handling
- 💰 Trading execution and fund management
- 🔐 Authentication and authorization
- 🗄️ Database security (SQLite)
- 🌐 Web interface and API endpoints

---

## 📋 Supported Versions

We provide security updates for the following versions:

| Version | Supported          | Notes                |
| ------- | ------------------ | -------------------- |
| 3.x     | ✅ Fully supported | Current stable release |
| 2.x     | ⚠️ Limited support | Security fixes only |
| < 2.0   | ❌ Not supported   | Please upgrade       |

**Recommendation:** Always use the latest stable release (v3.x) for best security.

---

## 🔒 Reporting a Vulnerability

### ⚠️ Please DO NOT Publicly Disclose

If you discover a security vulnerability in SynapseStrike, please **DO NOT**:
- ❌ Open a public GitHub Issue
- ❌ Discuss it on social media (Twitter, Reddit, etc.)
- ❌ Share it in Telegram/Discord groups
- ❌ Post it on security forums before we've had time to fix it

Public disclosure before a fix is available puts all users at risk.

### ✅ Responsible Disclosure Process

**Step 1: Report Privately**

Contact the maintainer directly:
- **Email**: pete.bieda@gmail.com
- **GitHub**: [Create a private security advisory](https://github.com/poorman/SynapseStrike/security/advisories/new)

**Step 2: Include These Details**

```markdown
Subject: [SECURITY] Brief description of vulnerability

## Vulnerability Description
Clear explanation of the security issue

## Affected Components
- Which parts of the system are affected?
- Which versions are vulnerable?

## Reproduction Steps
1. Step-by-step instructions
2. Sample code or commands (if applicable)
3. Expected vs actual behavior

## Potential Impact
- Can funds be stolen?
- Can API keys be leaked?
- Can accounts be compromised?
- Rate the severity: Critical / High / Medium / Low

## Suggested Fix (Optional)
If you have ideas for fixing it, please share!

## Your Information
- Name (or pseudonym)
- Contact info for follow-up
- If you want public credit (yes/no)
```

**Step 3: Wait for Our Response**

We will:
- ✅ Acknowledge receipt within **24 hours**
- ✅ Provide initial assessment within **72 hours**
- ✅ Keep you updated on fix progress
- ✅ Notify you before public disclosure

---

## ⏱️ Response Timeline

| Stage | Timeline | Action |
|-------|----------|--------|
| **Acknowledgment** | 24 hours | Confirm we received your report |
| **Initial Assessment** | 72 hours | Verify vulnerability, rate severity |
| **Fix Development** | 7-30 days | Depends on complexity and severity |
| **Testing** | 3-7 days | Verify fix doesn't break functionality |
| **Public Disclosure** | After fix deployed | Publish security advisory |

**Critical vulnerabilities** (fund theft, credential leaks) are prioritized and may be fixed within 48 hours.

---

## 💰 Security Bounty Program (Optional)

We offer recognition for valid security vulnerabilities:

| Severity | Criteria | Recognition |
|----------|----------|-------------|
| **🔴 Critical** | Fund theft, API key extraction, RCE | Public credit + Hall of Fame |
| **🟠 High** | Authentication bypass, unauthorized trading | Public credit |
| **🟡 Medium** | Information disclosure, XSS, CSRF | Acknowledgment |
| **🟢 Low** | Security improvements, minor issues | Thank you note |

**Note:** Recognition is at maintainers' discretion based on:
- Severity and impact
- Quality of report
- Ease of exploitation
- Number of affected users

**Out of Scope:**
- Issues in third-party libraries (report to them directly)
- Social engineering attacks
- DoS/DDoS attacks
- Issues requiring physical access
- Previously known/reported vulnerabilities

---

## 🔐 Security Best Practices (For Users)

To keep your SynapseStrike deployment secure:

### 1. API Key Management
```bash
# ✅ DO: Use environment variables
export ALPACA_API_KEY="your_key"
export ALPACA_API_SECRET="your_secret"

# ❌ DON'T: Hardcode in source files
api_key = "abc123..."  # NEVER DO THIS
```

### 2. Database Security
```bash
# ✅ Set proper permissions
chmod 600 data.db
chmod 600 .env

# ❌ DON'T: Leave files world-readable
chmod 777 data.db  # NEVER DO THIS
```

### 3. Network Security
```bash
# ✅ Use firewall to restrict API access
# Only allow localhost to access API server
iptables -A INPUT -p tcp --dport 8080 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j DROP

# ❌ DON'T: Expose API to public internet without authentication
```

### 4. Use Paper Trading First
- Alpaca: Use paper trading API (paper-api.alpaca.markets)
- Test thoroughly before using real funds
- Start with small amounts

### 5. Use Subaccounts When Possible
- Create dedicated trading subaccounts
- Limit maximum balance
- Restrict withdrawal permissions
- Use IP whitelist

### 6. Regular Updates
```bash
# Check for updates regularly
git pull origin main

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Subscribe to security advisories
# Watch GitHub releases: https://github.com/poorman/SynapseStrike/releases
```

---

## 🚨 Security Advisories

Past security advisories will be published here:

### 2026-XX-XX: [Title]
- **Severity:** [Critical/High/Medium/Low]
- **Affected Versions:** [x.x.x - x.x.x]
- **Fixed in:** [x.x.x]
- **Description:** [Brief description]
- **Mitigation:** [How to protect yourself]

*No security advisories have been published yet.*

---

## 🙏 Security Researchers Hall of Fame

We thank the following security researchers for responsibly disclosing vulnerabilities:

*No reports have been submitted yet. Be the first!*

---

## 📚 Additional Resources

**Security Documentation:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Alpaca API Security Best Practices](https://alpaca.markets/docs/api-documentation/)

**Audit Reports:**
- No third-party audits completed yet

---

## 📞 Contact

**For security issues ONLY:**
- 📧 **Email:** pete.bieda@gmail.com
- 🔒 **GitHub Security Advisory:** [Create Advisory](https://github.com/poorman/SynapseStrike/security/advisories/new)

**For general questions:**
- See [CONTRIBUTING.md](CONTRIBUTING.md)
- Open an issue on [GitHub](https://github.com/poorman/SynapseStrike/issues)

---

**Thank you for helping keep SynapseStrike secure!** 🔒
