# API keys and secrets

.env .env~ env

# Gemini CLI 上的 Gemini 3 Pro

我们很高兴地将 Gemini 3 Pro 带到 Gemini CLI。Gemini 3 Pro 目前在 Gemini
CLI 上对以下订阅用户可用：

- Google AI Ultra（Google AI Ultra for Business 除外）。
- Google AI Pro。
- Gemini Code Assist Standard（需要[管理员启用](#管理员说明)）。
- Gemini Code Assist Enterprise（需要[管理员启用](#管理员说明)）。
- 付费 Gemini API 密钥持有者。
- 付费 Vertex API 密钥持有者。

对于**其他所有用户**，我们正在通过[等候名单](https://goo.gle/geminicli-waitlist-signup)逐步扩大访问范围。如果您没有上述订阅之一，请注册等候名单以在获得批准后访问 Gemini
3 Pro。

**注意：**无论您是自动获得访问权限还是从等候名单接受，您仍需要[使用 `/settings` 命令](../cli/settings.md)启用 Gemini
3 Pro。

## 如何加入等候名单

未自动获得访问权限的用户需要加入等候名单。按照以下说明注册：

- 安装 Gemini CLI。
- 使用**使用 Google 登录**选项进行身份验证。您将看到一个横幅，显示"Gemini
  3 现已可用"。如果您没有看到此横幅，请将您的 Gemini CLI 安装更新到最新版本。
- 填写此 Google 表单：[在 Gemini CLI 中访问 Gemini 3](https://goo.gle/geminicli-waitlist-signup)。提供您用于与 Gemini
  CLI 进行身份验证的账户的电子邮件地址。

用户将分批加入，具体取决于可用性。当您被授予访问 Gemini 3
Pro 的权限时，您将收到一封发送到您提交的电子邮件地址的接受邮件。

**注意：**请等到您被批准使用 Gemini 3
Pro 后再启用**预览功能**。如果过早启用，CLI 将回退到 Gemini 2.5 Pro。

## 如何在 Gemini CLI 中使用 Gemini 3 Pro

一旦您收到接受邮件——或者如果您是自动获得访问权限——您仍需要在 Gemini
CLI 中启用 Gemini 3 Pro。

要启用 Gemini 3 Pro，请在 Gemini CLI 中使用 `/settings`
命令，并将**预览功能**设置为 `true`。

更多信息，请参阅 [Gemini CLI 设置](../cli/settings.md)。

### 使用限制和回退

当您达到 Gemini 3 Pro 每日使用限制时，Gemini
CLI 会通知您。当遇到该限制时，您将获得切换到 Gemini 2.5
Pro、升级以获得更高限制或停止的选项。您还会被告知您的使用限制何时重置以及可以再次使用 Gemini
3 Pro。

同样，当您达到 Gemini 2.5 Pro 的每日使用限制时，您将看到提示回退到 Gemini 2.5
Flash 的消息。

### 容量错误

有时 Gemini 3 Pro 模型可能会过载。当这种情况发生时，Gemini
CLI 会询问您是要继续尝试 Gemini 3 Pro 还是回退到 Gemini 2.5 Pro。

**注意：\*\***继续尝试\*\*选项使用指数退避，当系统繁忙时，Gemini
CLI 在每次重试之间等待更长的时间。如果重试没有立即发生，请等待几分钟让请求处理。

### 模型选择和路由类型

使用 Gemini CLI 时，您可能想要控制您的请求如何在模型之间路由。默认情况下，Gemini
CLI 使用**自动**路由。

使用 Gemini 3 Pro 时，您可能想要使用自动路由或专业路由来管理您的使用限制：

- **自动路由：**自动路由首先确定提示是涉及复杂操作还是简单操作。对于简单提示，它将自动使用 Gemini
  2.5 Flash。对于复杂提示，如果启用了 Gemini 3 Pro，它将使用 Gemini 3
  Pro；否则，它将使用 Gemini 2.5 Pro。
- **专业路由：**如果您想确保您的任务由最强大的模型处理，请使用 `/model`
  并选择**专业版**。Gemini
  CLI 将优先使用最强大的可用模型，包括如果已启用的 Gemini 3 Pro。

要了解更多关于选择模型和路由的信息，请参阅
[Gemini CLI 模型选择](../cli/model.md)。

## 如何在 Gemini Code Assist 上使用 Gemini CLI 启用 Gemini 3 Pro

如果您使用的是 Gemini Code Assist Standard 或 Gemini Code Assist
Enterprise，在 Gemini CLI 上启用 Gemini 3 Pro 需要配置您的发布渠道。使用 Gemini
3 Pro 需要两个步骤：管理员启用和用户启用。

要了解更多关于这些设置的信息，请参阅
[配置 Gemini Code Assist 发布渠道](https://developers.google.com/gemini-code-assist/docs/configure-release-channels)。

### 管理员说明

具有 **Google Cloud Settings Admin** 权限的管理员必须遵循以下说明：

- 导航到您与 Gemini CLI for Code Assist 一起使用的 Google Cloud 项目。
- 转到 **Admin for Gemini** > **Settings**。
- 在 **Release channels for Gemini Code Assist in local IDEs** 下选择
  **Preview**。
- 单击 **Save changes**。

### 用户说明

在管理员启用**预览**后等待两到三分钟，然后：

- 打开 Gemini CLI。
- 使用 `/settings` 命令。
- 将**预览功能**设置为 `true`。

重新启动 Gemini CLI，您应该能够访问 Gemini 3 Pro。

## 需要帮助？

如果您需要帮助，我们建议搜索现有的
[GitHub 问题](https://github.com/google-gemini/gemini-cli/issues)。如果您找不到与您的问题匹配的 GitHub 问题，您可以[创建新问题](https://github.com/google-gemini/gemini-cli/issues/new/choose)。对于评论和反馈，请考虑打开
[GitHub 讨论](https://github.com/google-gemini/gemini-cli/discussions)。
