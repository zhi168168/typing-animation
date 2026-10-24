# Typing Animation Generator

面向英语用户的打字动画工具，提供英文界面、模板、预览与导出。

首页 SEO 围绕 `typing animation generator`，包含可直接抓取的英文正文、操作说明、格式比较和 FAQ。正式域名、canonical、robots 与 sitemap 配置见 [docs/SEO.md](docs/SEO.md)。

## Vercel 部署与正式登录

正式域名为 `https://typing-animation.com`。完整教程见 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**：GitHub 导入 Vercel、Neon PostgreSQL、腾讯云 SMTP/备用 Resend、Google OAuth、环境变量和数据库初始化。

Vercel 使用 Node.js 24、`pnpm install --frozen-lockfile`、`pnpm build`、输出 `dist`。账户 API 使用独立 Serverless Function；未配置时网页和动画仍可用。Vercel 视频导出使用自托管单线程 FFmpeg WebAssembly，在浏览器内编码。Windows 本地服务继续使用原生 FFmpeg。账号、密钥和本地项目不随仓库上传。`public/ffmpeg-notices.txt` 记录浏览器编码器依赖与许可证。

## 启动

当前环境已安装依赖，双击 `启动 Typing Animation.cmd`，或在本目录运行：

```powershell
node server.mjs
```

打开 http://localhost:3000 。服务仅监听本机 `127.0.0.1`，关闭启动窗口即可停止。已启动时无需重复运行。

首次安装：Node.js 24、pnpm 11.19.0，执行 `pnpm install`。本地原生视频服务面向 Windows x64；Vercel 使用浏览器编码器，不加载该 Windows 可选依赖。

```powershell
pnpm dev       # 开发服务
pnpm build     # 构建前端
pnpm start     # 使用 dist 的正式模式
pnpm test      # 文字与时间轴引擎测试
```

## 已实现

- 中文、英文、多行、组合 Emoji，最多 1000 个字符。
- 32 款自托管开源 Web 字体，按 Sans serif、Serif、Monospace、Display & handwriting、中文分组；支持字号、字重、斜体、行距、文字颜色与对齐。不依赖用户电脑安装字体。
- 画布水平/垂直位置、X/Y 偏移。
- 打字速度、可重复的节奏变化、标点停顿、开始延迟、结束停留。
- 真实输入节奏录制；预览提供 6 种 Mechvibes 实录音效：茶轴 PBT、青轴 PBT、红轴 PBT、黑轴 PBT、青轴 ABS、Topre 静电容 PBT。每种包含 8 个字母键及独立空格、回车录音。播放区可选择和试听，记住音效类型及静音选择（仅预览，不混入视频）。录音来源及 MIT 授权见 `public/sounds/keyboard/`。
- 竖线/方块/下划线光标、颜色、闪烁速度。
- 16:9、9:16、1:1、4:3；720p/1080p；24/30/60 FPS。
- 纯色、渐变、透明背景；24 个可编辑模板（极简/科技/文艺/渐变/醒目/社交各 4 个，支持分类筛选）；深浅主题。
- 播放/暂停、时间轴拖动、前后跳转、循环、空格快捷键。
- HTML 独立动画、PNG 当前帧、透明/普通 WebM、MP4。
- 导出进度与取消；浏览器自动保存；JSON 项目保存和导入。
- 桌面双栏、手机上下分区布局。

## 导出说明

预览与导出共用 `src/engine.js` 的 Canvas 渲染、换行与时间轴逻辑。HTML 和 PNG 直接在浏览器生成；Windows 本地模式将视频帧提交到本机 Node 服务，Vercel 模式在浏览器中编码。账号使用 Better Auth；动画编辑和导出不要求登录。

透明视频在本地服务使用 VP9，在 Vercel 浏览器编码器使用 VP8，均支持 WebM alpha。MP4 不支持透明背景，界面会禁用这一组合。不同剪辑软件对 WebM alpha 的支持不同，必要时使用透明 PNG 或 HTML。字体以 WOFF2 格式随网站提供，不依赖运行时第三方字体 CDN。PNG/视频在字体加载成功后生成；HTML 内嵌所用字体及文本涉及的 Unicode 子集，可离线播放。未覆盖的文字与 Emoji 仍由设备后备字体提供。

视频导出最多 18000 帧。长文本、高分辨率和高帧率需要更多时间、磁盘空间；导出期间请保留页面。导出中间文件保存在 `work/exports/`，下载或取消后清理，异常遗留任务一小时后清理。

## 源码

- `src/main.jsx`：应用状态、播放、项目和弹窗。
- `src/SettingsPanel.jsx`：文字、样式、动画、画布设置。
- `src/controls.jsx`：通用设置控件。
- `src/engine.js`：字符切分、确定性时间轴、排版、Canvas 渲染与导入校验。
- `src/export.js`：HTML/PNG/视频导出与取消。
- `src/presets.js`：24 个模板。
- `server.mjs`：本地视频编码 API 和前端服务。

## 当前边界

本版聚焦打字动画，已提供邮箱验证注册、登录、重置密码和配置后启用的 Google 登录。未实现订阅、云分享、手写笔画动画与大型模板商城。楷体是字体选项，不代表按笔画书写。循环设置用于预览和 HTML，视频输出单轮动画。自动保存属于当前浏览器，清除站点数据会丢失，重要项目请下载 JSON。

## 服务器字体资源

部署时须包含构建生成的整个 dist/（包含 fonts/），不能只复制 JS 和 CSS。字体总资源约 24 MB，浏览器按所选字体、字形和字符子集加载，不会一次下载全部。public/fonts/ 保存 32 个字体家族及各自 LICENSE.txt，允许随网站分发的开源字体替代了上一版的设备字体；旧项目会迁移到相近的开源字体，外观可能变化。

字体来源为 Fontsource npm 包。运行 node scripts/vendor-fonts.mjs 可重新下载字体并生成字体目录、CSS 和资源清单（需要网络）。每个家族的授权文件随 dist/fonts 一并部署。HTML 仅嵌入当前使用的字体子集；部分手写字体只有常规字形，加粗和斜体由浏览器合成。

Vercel 部署无需 Linux 原生 FFmpeg；如果另行部署持久化 Linux 视频后端，则需独立适配其编码器和监听配置。
