# OMP SIXEL Cache Fix / 图片缓存修复

**A reversible extension that corrects repeated-image cache decisions in Oh My Pi SIXEL terminals without replacing omp.exe.**

修正 OMP 的 SIXEL 图片缓存判定，支持关闭恢复，无需替换 omp.exe。

[快速安装](#中文) · [English setup](#english) · [Download / 下载](https://github.com/vavilonska/omp-sixel-cache-fix/releases/latest) · [MIT](LICENSE)

![OMP SIXEL Cache Fix — conceptual workflow / 功能流程示意](docs/assets/overview.svg)

> Host-version compatibility matters; see documented validation. / 依赖宿主接口，请先核对已验证版本。

## 中文

修正 Oh My Pi 在 SIXEL 终端中重复刷新图片的缓存判定，无需替换 `omp.exe`。扩展直接接管 `ImageBudget.shouldTransmit()`；关闭时恢复宿主原方法，其他图像协议保留原行为。

从 [Releases](https://github.com/vavilonska/omp-sixel-cache-fix/releases) 下载 ZIP，完整解压后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\Install.ps1
# 更新 / Update
.\Install.ps1 -Action Update
# 卸载 / Uninstall
.\Install.ps1 -Action Uninstall
```

Windows 安装器将插件放入当前用户 `.omp\agent\extensions\omp-sixel-cache-fix`。更新先备份旧文件；遇到意外文件或改动时停止。无需额外 npm 依赖。

等当前任务结束后重启 OMP 或执行 `/reload`，然后 `/image-cache-fix status`。使用 `/image-cache-fix off` 关闭、`/image-cache-fix on` 恢复；下次加载默认启用。计数代表绕过检查次数，不等于节省编码次数。插件不修改图片显示设置。

没有版本白名单，也不会因上游已修复而自动关闭。历史真实进程验证覆盖 OMP 18.1.18 / 18.1.19；未来接口变化仍可能导致不兼容。本次重新通过 8 项生命周期测试（42 项断言），未重测所有当前 OMP 版本。

开发验证：`bun test ./tests/cache-patch.test.ts`。详见 [插件说明](plugin/README.md)。代码 [MIT](LICENSE)，不包含个人会话、进程转储或诊断工作区。

## English

Corrects repeated-image cache decisions in Oh My Pi's SIXEL renderer without replacing `omp.exe`. The extension directly hooks `ImageBudget.shouldTransmit()`; disabling restores the host method, while other image protocols retain their original behavior.

Download and fully extract the ZIP from [Releases](https://github.com/vavilonska/omp-sixel-cache-fix/releases), then run the install/update/uninstall commands above.

The Windows installer uses the current user's `.omp\agent\extensions\omp-sixel-cache-fix`. Updates back up existing files; unexpected files or modifications stop the operation. No additional npm installation is required.

After the current task finishes, restart OMP or run `/reload`, then `/image-cache-fix status`. Toggle with `/image-cache-fix off` and `/image-cache-fix on`; each fresh load starts enabled. The counter measures bypassed checks, not avoided encodings. The plugin does not change image-display settings.

There is no version allowlist or automatic disabling when upstream is fixed. Historical real-process integration covered OMP 18.1.18 / 18.1.19; future interface changes can still break compatibility. This release reran 8 lifecycle tests with 42 assertions, not integration tests for every current OMP version.

Development check: `bun test ./tests/cache-patch.test.ts`. See [plugin details](plugin/README.md). Code is [MIT](LICENSE). Personal sessions, process dumps and diagnostic workspaces are excluded.

## Related projects / 相关项目

[OMPmail](https://github.com/vavilonska/OMPmail) · [OMP Pet](https://github.com/vavilonska/omp-pet) · [All projects / 全部项目](https://github.com/vavilonska#projects--项目)
