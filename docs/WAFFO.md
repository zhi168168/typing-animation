# Waffo Pancake 收款接入

本项目使用 `@waffo/pancake-ts`，不是 `@waffo/waffo-node` 的 Acquiring API。

收费：单次下载 $1.90 USD；每月 $9.90 USD，已成功付款的当期内不限次数。MP4、WebM、HTML、PNG 每下载一个文件扣一次单次额度。预览、编辑免费；JSON 作品备份免费但仍需登录。

## 配置

在 Pancake「API 与开发」复制 `.env` 配置。只需要两项凭据：`WAFFO_MERCHANT_ID`（MER_ 开头）和 `WAFFO_PRIVATE_KEY`（商户 RSA 私钥）。不需要额外 API Key 字符串或 Waffo 平台公钥；SDK 自带回调验签公钥。店铺 ID 为 STO_ 开头，不可替代商户 ID。

本机 `.env.local`（已被 Git 忽略）使用：

```
WAFFO_ENVIRONMENT=test
WAFFO_MERCHANT_ID=MER_...
WAFFO_PRIVATE_KEY=...单行 Base64 或带换行转义的 PEM...
WAFFO_STORE_ID=STO_...
WAFFO_SINGLE_PRODUCT_ID=PROD_...
WAFFO_MONTHLY_PRODUCT_ID=PROD_...
```

运行 `pnpm billing:setup` 可在指定测试店铺读取/复用商品，缺少时创建 $1.90 单次商品及 $9.90 月订阅商品，并保存非秘密商品 ID 到本机配置。不发布正式环境，不覆盖已有商品。运行 `pnpm billing:migrate` 创建或增量补齐账单、下载、回调收件箱表。SQLite 本地模式由服务启动时自动迁移；正式 PostgreSQL 显式运行迁移。

当前店铺为 typing-animation。单次商品 ID 为 `PROD_033xWaTJyyefzSTSHFeqrJ`，月订阅复用既有 `PROD_1kPrylh47TRnfZ4WYR7POG`。这些是测试凭据下查询/创建的商品配置。

## 支付和验签

- 账号登录后，服务端用用户内部 ID 作为 buyerIdentity 调用 `checkout.authenticated.create`，将本地账单号写入 `orderMerchantExternalId`。邮箱只用于填充收银台，不用于权益归属。
- 商品价格固定在 Pancake 商品中，不接受客户端传价格。禁用试用，不提供默认优惠。
- 相同未过期支付会话复用；会话创建使用持久化的幂等请求号，Pancake 的缓存窗口为 24 小时。
- `/api/billing/webhook` 使用原始 JSON 正文和 `X-Waffo-Signature` 调用 SDK 验签，检查店铺与 test/prod 环境，保留默认重放时效校验。
- 验签后先持久化回调到收件箱，再回复 200。Vercel 用 waitUntil 保持后台处理；如果失败，下一次账单状态/下载请求会重试收件箱。业务处理通过服务端 GraphQL 再查单，不依赖回跳地址证明付款。
- 查单核对店铺、环境、用户 ID、商品 ID、业务账单号及 USD 成功付款金额。单次按订单幂等发放；月付核对当前账期号与成功付款的 periodNumber、月周期、非试用、开始/结束时间。past_due/canceled 不授予无限下载，canceling 保留已经成功付款的当前账期。
- 测试和正式权益在数据库内按 mode 隔离，不能把测试额度带入正式环境。
- 当前期成功付款被退款后，查单撤销对应剩余权益。退款本身从 Pancake 后台处理；不在网站自动发起退款。
- Manage subscription 通过服务器当前登录身份生成新的 Customer Portal 链接，供用户取消续费、查看订单。不会用客户端提供的用户 ID 访问门户。

## 回调和测试

在 Pancake 店铺设置 → Webhooks 中配置测试回调，或用 `client.webhooks.add` 添加：

```
https://typing-animation.com/api/billing/webhook
```

该地址只有在新代码及正确环境配置已经部署后才可用。不要把测试配置当成正式收款上线。订阅事件应包含 `order.completed`、`subscription.activated`、`subscription.payment_succeeded`、`subscription.canceling`、`subscription.uncanceled`、`subscription.canceled`、`subscription.past_due`、`refund.succeeded`。

本地联调只把回调入口通过代理隧道公开，不能暴露开发账号邮箱、账户调试接口或整个开发服务。测试成功卡 `4576750000000110`，失败卡 `4576750000000220`，任意未来到期日和 3 位 CVC。测试模式不产生真实扣款。

运行 `pnpm test` 验证并发扣次、账号/环境隔离、支付归属、退款撤销、月账期、回调验签与重放窗口；运行 `pnpm build` 验证生产构建。

## 本次验证记录（2026-10-26）

已使用本机测试凭据成功读取店铺、创建两档认证收银台会话、验证查单接口及生成客户门户链接。重复请求复用同一待支付会话；未付款下载返回 402。31 项自动化测试和生产构建通过。

收银台域名 `pancake.waffo.ai` 在内置浏览器中出现 `ERR_CONNECTION_CLOSED`，因此尚未完成测试卡付款，也未收到真实 Waffo 回调。当前没有公开本地回调隧道，没有部署这些改动到正式站点；店铺查询显示生产环境尚未启用。以上接口验证不能替代付款及真实回调端到端验收。

## 正式上线前

店铺需要完成生产环境开通/审核；正式密钥与测试密钥分开保管。审核通过后发布商品到正式环境，获取并核对正式商品配置，迁移正式 PostgreSQL，将密钥与商品 ID 填入 Vercel Production，并设 `WAFFO_ENVIRONMENT=prod`；配置正式回调，部署后验证真实域名。不要使用测试付款记录作为正式支付成功的证据。

当前 Vercel 动画文件在浏览器生成，普通下载路径会经过服务端扣次，但公开的客户端代码不构成 DRM，技术用户可能改动代码自行生成文件。若要求防止改客户端绕过，需把最终生成/交付移到受保护的服务端。本地服务端视频任务已在文件交付时按任务 ID 幂等扣次。浏览器端在文件准备好后扣次，无法保证用户最终保存成功，极端保存/网络失败需核对并补偿。

官方指南：https://docs.waffo.ai/zh/integrate/skill
SDK：https://docs.waffo.ai/integrate/sdks
订单查询：https://docs.waffo.ai/api-reference/endpoints/graphql/orders-and-payments
回调：https://docs.waffo.ai/api-reference/webhooks

## 正式环境准备（2026-10-26）

已用正式凭据核对 `prodEnabled=true`，将两档既有商品发布到正式环境并再次查询价格及月周期。正式数据库已创建 billing_orders、billing_downloads、billing_events；六项 WAFFO 配置已保存到 Vercel Production。前端购买入口包含条款及月度续费授权确认、退款摘要和完整政策链接。

实际付款、收到真实回调以及付款后的下载交付，必须在部署后通过真实交易另行验收，不以创建收银台会话或通过单元测试替代。不要在日志、截图或聊天中包含私钥、会话 Cookie 或完整收银台 token。
