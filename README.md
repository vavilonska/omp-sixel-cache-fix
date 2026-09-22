# OMP SIXEL Cache Fix

修复 Oh My Pi 在 SIXEL 终端中重复刷新图片时的缓存判定。无需替换 OMP 程序，支持随时关闭并恢复宿主原方法。MIT 许可证。

## 安装

从 [Releases](https://github.com/vavilonska/omp-sixel-cache-fix/releases) 下载 ZIP 并解压，在目录中运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\Install.ps1
# 更新已有安装（保留备份）
.\Install.ps1 -Action Update
# 卸载
.\Install.ps1 -Action Uninstall
```

等当前 OMP 任务结束后重启 OMP，或执行 `/reload`。使用 `/image-cache-fix status` 检查状态，`/image-cache-fix off` 关闭，`/image-cache-fix on` 恢复。安装器面向 Windows；插件本身依赖 OMP 提供的共享模块，不需要另外 npm install。

## 兼容范围

历史集成验证覆盖 OMP 18.1.18、18.1.19。插件没有版本白名单，始终按接口接管；这不代表任何未来版本均兼容。其他图像协议继续使用宿主行为。详见 [插件说明](plugin/README.md)。

## 验证与开发

```powershell
bun test ./tests/cache-patch.test.ts
```

发布时重新运行了 8 项补丁生命周期测试，包括协议隔离、重复加载、开关与关闭还原。历史真实 OMP 集成结果不等于已重测当前全部 OMP 版本。个人进程转储、会话和诊断工作目录不随源码发布。

This is an independent community extension for Oh My Pi.
