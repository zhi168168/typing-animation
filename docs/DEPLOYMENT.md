# typing-animation.com：GitHub → Vercel，上线与登录配置

仓库：https://github.com/zhi168168/typing-animation

采用 Vercel 静态页面 + Node.js 24 账号函数 + Neon PostgreSQL。正式地址固定为 **https://typing-animation.com**。视频在 Vercel 版本中使用浏览器内的 FFmpeg WebAssembly 编码，不依赖 Windows 服务，也不把动画帧上传到账号数据库。首次视频导出需加载约 32 MB 编码器；长视频或高分辨率会占用较多浏览器内存。音效仅用于预览。

## 1. 先部署网页并绑定域名

1. 登录 https://vercel.com ，点击 **Add New → Project**。
2. 从 GitHub 导入 `zhi168168/typing-animation`；如果看不到仓库，调整 Vercel 的 GitHub 仓库访问范围。
3. Root Directory 保持项目根目录；Framework 选 **Vite**；Node.js 使用 **24.x**。
4. Install Command：`pnpm install --frozen-lockfile`；Build：`pnpm build`；Output：`dist`。仓库已提供配置，不要改成只部署 `src` 或 `accounts`。
5. 先添加 Production 环境变量 `SITE_URL=https://typing-animation.com`。其余账户变量可以稍后添加；未配置时网页、编辑和预览仍可用，但下载会被拦截，登录会提示暂不可用。
6. 点击 Deploy，完成后到 **Settings → Domains → Add Domain** 添加 `typing-animation.com`。
7. 打开域名注册商的 DNS 管理，按 Vercel 当时显示的记录类型、名称、值填写；不要照搬其他项目的 IP。保留邮件 TXT/MX 记录。等待 Vercel 显示 Valid Configuration、HTTPS 正常。
8. 如添加 `www.typing-animation.com`，设置它重定向到 `typing-animation.com`，以不带 www 的地址为准。

Preview 部署不要连接正式数据库。生产密钥只勾选 Production；若要测试预览登录，应使用独立数据库和独立回调配置。

## 2. 使用与 PDF 项目相同的 Neon PostgreSQL

1. 打开 https://console.neon.tech ，可使用原来的 Neon 账号。
2. 点击 **New project**，名称填 `typing-animation`。创建独立项目，不复用 PDF 的数据库或用户数据。
3. 选择与 Vercel 账号函数相近的区域；在 Vercel Functions 区域设置中相应调整。
4. 进入项目 Dashboard，点击 **Connect**。选择正式分支（通常为 production/main）、数据库（通常为 neondb）和数据库角色。
5. 开启 **Connection pooling**，复制 PostgreSQL 连接字符串；主机通常包含 `-pooler`。保留 `sslmode=require` 等参数。
6. 在 Vercel → 项目 → **Settings → Environment Variables** 添加 `DATABASE_URL`，值为完整连接字符串，只选择 Production。
7. 可另外关闭 pooling 复制直接连接，保存到本机迁移配置的 `DIRECT_DATABASE_URL`。Vercel 运行时仍使用 pooled `DATABASE_URL`。

数据库仅保存账户、会话、验证记录、OAuth 账户和限流记录。编辑中的动画仍保存在浏览器，登录不等于云同步。

## 3. 邮件服务：优先确认腾讯云产品

PDF 项目使用 Nodemailer + SMTP，本机未保存线上主机名。用户回忆原服务商可能是腾讯云，以下优先按腾讯云配置，但需先确认是邮件推送 SES 还是腾讯企业邮箱。

### 腾讯云邮件推送 SES

1. 登录 https://console.cloud.tencent.com ，在产品搜索中进入 **邮件推送 SES**，选择账户实际开通的地域。
2. 打开 **发信域名 / 发信配置**，添加 `typing-animation.com`。
3. 到域名 DNS 管理，逐条添加控制台要求的域名验证、SPF、DKIM 等记录，再回 SES 检查验证状态。已有邮箱的 MX 不要删除；不要给相同记录名称添加冲突的 SPF。
4. 域名通过验证后，进入 **发信地址**，新建 `noreply@typing-animation.com`，显示名称填 `Typing Animation`。
5. 找到该地址的 **SMTP 配置 / SMTP 密码**，创建或设置独立 SMTP 密码，记录 SMTP 用户名、密码和服务器地址。以控制台实际提供的地址为准；不要把腾讯云 SecretId/SecretKey 当成 SMTP 密码。
6. 通常使用 SSL 端口 465，将控制台的 SMTP 服务器地址填入 `SMTP_HOST`，用户名填入 `SMTP_USER`，SMTP 密码填入 `SMTP_PASS`，`SMTP_FROM=Typing Animation <noreply@typing-animation.com>`。
7. 使用腾讯云的发送测试功能先发给自己的邮箱，再到本网站测试注册验证邮件。若账户存在审核、沙箱、发信限制或欠费，先按腾讯云控制台提示处理。

### 如果原来用的是腾讯企业邮箱

进入企业邮箱管理后台，将 `typing-animation.com` 配成邮件域名并创建真实邮箱；设置页面或官方客户端说明通常会给出 `smtp.exmail.qq.com`、SSL 465。`SMTP_USER` 是完整邮箱地址，`SMTP_PASS` 是该邮箱配置所需的客户端专用密码/授权凭据，以当前账户要求为准。不要将企业邮箱 SMTP 和邮件推送 SES 的密码混用。

两种方案都可以被本站现有 SMTP 代码使用。你不必找回 Vercel 中旧密码，可以为新网站创建独立发信凭据；如果调整的是 PDF 原凭据，需同时更新 PDF，否则会影响原站。

若要完全沿用原服务商：到 PDF 项目的 Vercel → Settings → Environment Variables 查看 **SMTP_HOST**。只需要核实主机名，无需分享密码。可在同一邮件平台添加新域名，建议为新站创建独立凭据。`SMTP_FROM` 必须属于已验证的 typing-animation.com 发信域名，不能继续使用 PDF 的发信地址。

### Resend 备选方案

如果不继续使用腾讯云，也可以选择 Resend；以下不是对 PDF 服务商的确认：

1. 登录 https://resend.com ，进入 **Domains → Add domain**，添加 `typing-animation.com`。若已有对应域名，检查其验证状态。
2. 在域名 DNS 管理中，逐条添加 Resend 页面当前给出的 SPF/DKIM 等记录，名称和值均按页面复制。不要删除已有邮件服务的 MX，也不要给同一名称添加两条冲突的 SPF；已有配置时按服务商说明合并。
3. 回到 Resend 点击 Verify，等待发信域名 Verified。只做发信通常不需要打开收信功能。
4. 进入 **API Keys → Create API Key**，创建独立的 typing-animation 发信密钥；如果支持域名范围，限制到这个域名。
5. 在 Vercel Production 填写：

| 变量 | Resend 示例值 |
| --- | --- |
| SMTP_HOST | `smtp.resend.com` |
| SMTP_PORT | `465` |
| SMTP_USER | `resend` |
| SMTP_PASS | Resend 新生成的 API Key |
| SMTP_FROM | `Typing Animation <noreply@typing-animation.com>` |

这里的 noreply 是已验证域名下的发信地址，不表示已创建可收件的邮箱。若要接收用户回复，需要另设实际收件邮箱。不要使用尚未配置真实收信能力的地址充当客服。

## 4. Google 注册 / 登录

1. 打开 https://console.cloud.google.com ，新建独立项目 `typing-animation`，或在已有项目中创建这个网站独立的 OAuth Client。
2. 进入 **Google Auth Platform**（旧界面为 APIs & Services → OAuth consent screen），依次完成 Branding、Audience、Data Access、Clients 等设置。
3. App name 填 `Typing Animation`；User support email 和 Developer contact 填你实际能收信的邮箱。
4. 用户类型选 **External**。开发测试时将你自己的 Google 邮箱加入 Test users；公开使用前将应用发布为 Production，按控制台要求完成域名验证等审核。
5. 网站首页填写 `https://typing-animation.com`。公开前准备真实的隐私政策和使用条款；仓库提供 `/privacy.html`、`/terms.html` 初稿，发布前核对实际运营情况。
6. Authorized domains 填 `typing-animation.com`（不带 https、不带路径）。如控制台要求，使用同一 Google 账号在 Search Console 中完成域名所有权验证。
7. Data Access 仅添加基础身份权限：`openid`、`email`、`profile`，不要添加 Gmail/Drive 等无关权限。
8. 进入 Clients → **Create client → Web application**，名称可填 `Typing Animation Web`。
9. Authorized JavaScript origins 填 **`https://typing-animation.com`**。
10. Authorized redirect URIs 填 **`https://typing-animation.com/api/auth/callback/google`**，不要加末尾斜杠，不要填 Vercel 的随机预览域名。
11. 创建后将 Client ID 保存为 Vercel Production 的 `GOOGLE_CLIENT_ID`，Client Secret 保存为 `GOOGLE_CLIENT_SECRET`。

Google 同一个入口会处理新用户注册和已有用户登录。当前不自动合并同邮箱的不同登录方式；遇到已有账户提示时先使用原来的登录方式。

## 5. Vercel 环境变量完整清单

| 变量 | 值 |
| --- | --- |
| SITE_URL | `https://typing-animation.com` |
| ACCOUNT_ORIGIN | `https://typing-animation.com` |
| AUTH_DEV_MODE | `false` |
| DATABASE_URL | 新 Neon 项目的 pooled TLS 连接 |
| BETTER_AUTH_SECRET | 独立随机密钥，至少 32 字符，后续部署保留 |
| SMTP_HOST / SMTP_PORT | 对应邮件服务商配置 |
| SMTP_USER / SMTP_PASS | 对应服务商凭据，成对配置 |
| SMTP_FROM | 已验证域名下的发信地址 |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google Web OAuth 客户端信息 |

在本机 PowerShell 生成独立 auth secret，输出后安全保存：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

密钥不要放进 GitHub、前端代码或 `VITE_*` 变量。此项目需要 **ACCOUNT_ORIGIN**，不是 PDF 项目的 PUBLIC_SITE_URL。

## 6. 初始化数据库表（本机执行一次）

Vercel build 不会自动修改数据库，迁移也不会在每次请求中运行。

1. 在本项目 `work` 文件夹新建 `production.env`，复制 `docs/production.env.example` 的内容。
2. 填写新站的数据库连接和 auth secret。`AUTH_DEV_MODE=false`，两个 origin 均保持正式域名。尚未设置的 SMTP/Google 值要保持成对为空，或填写完整。
3. 本机使用 Node.js 24，在项目目录执行：

```powershell
Set-Location D:\tools\typeflow
node --env-file=work/production.env accounts/migrate.mjs
```

看到 `Typing Animation account schema is up to date.` 即成功。此配置由进程环境变量优先加载，不会误用本地开发 SQLite。`work/` 已被 Git 忽略。升级已有数据库前先备份、查看变更；不要拿 PDF 的生产数据库做试验。

## 7. 重新部署和验收

1. 所有 Production 变量保存后，在 Vercel → Deployments → 最新 Production 部署 → Redeploy。
2. 打开 `https://typing-animation.com/api/auth/config`，应显示 configured、google、emailRegistration、passwordReset、accountDeletion 为 true。
3. 用真实邮箱测试：注册 → 收到验证邮件 → 点验证链接 → 登录 → 退出 → 找回密码 → 使用新密码登录；同时检查垃圾箱。
4. 使用 Google 登录，确认回到 typing-animation.com 而非 localhost；用公开用户测试前检查 OAuth 发布状态。
5. 测试姓名修改、退出和邮件确认删除。删除只影响本站账户，不影响 Google 账户。
6. 测试编辑器的 HTML、PNG、MP4、WebM 导出；手机端或长动画内存不足时降低分辨率、帧率或缩短文本。
7. 确认首页 canonical、sitemap 均使用 https://typing-animation.com，保留邮箱平台的 DNS 记录。

## 常见故障

- `Accounts are not configured yet`：检查 Production 变量完整性、ACCOUNT_ORIGIN、TLS 和密钥长度，然后重新部署。
- 邮箱功能不可用：检查 SMTP_HOST 和 SMTP_FROM 是否同时设置，SMTP_USER/PASS 是否成对。
- `relation ... does not exist`：尚未对这个数据库运行迁移，或连接到了错误分支。
- Google `redirect_uri_mismatch`：回调 URI 需要与本文地址逐字符一致。
- Google 按钮提示地址不匹配或接口返回 `403 Origin is not allowed`：检查浏览器地址是否变成 `www.typing-animation.com`。Vercel → Settings → Domains 中，`typing-animation.com` 应连接 Production，`www.typing-animation.com` 应重定向至 `typing-animation.com`，不要反过来。ACCOUNT_ORIGIN 和 Google 回调继续保持本文的不带 www 地址。
- Google 只允许少量用户：检查 Audience 的 Testing 状态和 Test users，按要求发布应用。
- 验证邮件没到：查看 Vercel 函数日志和邮件平台发送记录、DNS 验证状态及垃圾箱；不要公开带 token 的邮件链接或日志。
- 首次视频导出慢：浏览器首次加载约 32 MB 编码器，并逐帧编码；保持页面打开，必要时使用桌面浏览器。

以上是操作路径。外部账号、DNS、真实邮件、生产数据库和 Google 授权仍需在实际服务中配置后才能验收。
