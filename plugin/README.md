# OMP SIXEL Cache Fix 1.1.0

## 中文

此扩展通过 OMP 共享的 `@oh-my-pi/pi-tui` 接口，在 SIXEL 协议下使 `ImageBudget.shouldTransmit()` 返回 `false`，让原有 `Image` 缓存生效。尺寸、协议、预算变化和显式失效仍由宿主图片组件处理。Kitty、iTerm2 和纯文本行为保持不变。

安装见 [项目说明](../README.md)。任务结束后重启 OMP 或 `/reload`，用 `/image-cache-fix status` 查看状态。`off` 恢复加载时的原方法；`on` 重新接管。会话关闭释放补丁，重复加载共享同一层补丁。绕过计数不等于编码节省数量，也不代表交互卡顿已人工验收。

插件保留接口存在性和可替换性检查，但没有版本门禁；上游即使修复也不会自动关闭。历史集成验证覆盖 18.1.18 / 18.1.19，未来若接口移除或改名仍需适配。`/reload` 可能中断工作，务必等任务结束。插件不主动修改 OMP 图片显示设置。

本次 8 项生命周期测试／42 项断言通过。原始诊断工作区不随公开源码发布。MIT 许可证见 [LICENSE](LICENSE)。

## English

Using OMP's shared `@oh-my-pi/pi-tui` module, this extension makes `ImageBudget.shouldTransmit()` return `false` for SIXEL so the existing `Image` cache can be reused. Size, protocol, budget changes and explicit invalidation remain the host image component's responsibility. Kitty, iTerm2 and plain-text behavior is unchanged.

See the [project guide](../README.md) for installation. After the current task finishes, restart OMP or run `/reload`, then inspect `/image-cache-fix status`. `off` restores the original method; `on` reinstalls the hook. Session shutdown releases it and repeated loads share one patch. Bypass counts are not encoding savings and do not prove manually verified interaction latency.

The hook checks that the interface exists and is replaceable, but has no version gate and does not automatically turn off after an upstream fix. Historical integration covered 18.1.18 / 18.1.19; removed or renamed interfaces will require adaptation. `/reload` can interrupt work: wait for the task to finish. The extension never changes OMP's image-display preference itself.

This release passed 8 lifecycle tests / 42 assertions. The original diagnostic workspace is not distributed. See [LICENSE](LICENSE) for MIT terms.
