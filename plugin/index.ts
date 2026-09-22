import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ImageBudget, ImageProtocol, TERMINAL } from "@oh-my-pi/pi-tui";
import { acquireSixelCachePatch, type PatchLease } from "./cache-patch";

export default function sixelCacheFix(pi: ExtensionAPI): void {
  let lease: PatchLease | undefined;
  let failure: string | undefined;

  const attach = (): void => {
    if (lease) return;
    try {
      lease = acquireSixelCachePatch(ImageBudget.prototype, () => TERMINAL.imageProtocol === ImageProtocol.Sixel);
      failure = undefined;
      pi.logger.info("sixel-cache-fix: attached", { extensionVersion: "1.1.0", ompVersion: pi.pi.VERSION });
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      pi.logger.warn("sixel-cache-fix: skipped", { error: failure });
    }
  };

  const describe = (): string => {
    if (!lease) return `SIXEL 图片缓存修复：未启用。${failure ?? "等待加载。"}`;
    const status = lease.status();
    const protocol = TERMINAL.imageProtocol === ImageProtocol.Sixel ? "SIXEL"
      : TERMINAL.imageProtocol === ImageProtocol.Kitty ? "Kitty"
      : TERMINAL.imageProtocol === ImageProtocol.Iterm2 ? "iTerm2" : "无";
    const mode = !status.attached ? "已脱离" : status.enabled ? "已启用，强制接管" : "已关闭，已恢复原方法";
    return `SIXEL 图片缓存修复 v1.1.0：${mode}；OMP ${pi.pi.VERSION}；当前协议 ${protocol}；已绕过 ${status.bypasses} 次不适用的传输检查。`;
  };

  pi.registerCommand("image-cache-fix", {
    description: "SIXEL 图片缓存修复：status | on | off（当前进程）",
    handler: async (args, ctx) => {
      const action = args.trim() || "status";
      if (action === "on" || action === "off") {
        if (action === "on") attach();
        try {
          lease?.setEnabled(action === "on");
        } catch (error) {
          ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
          return;
        }
      } else if (action !== "status") {
        ctx.ui.notify("用法：/image-cache-fix status | on | off", "info");
        return;
      }
      ctx.ui.notify(describe(), lease?.status().attached ? "info" : "warning");
    },
  });

  pi.on("session_start", (_event, ctx) => {
    attach();
    if (failure && ctx.hasUI) ctx.ui.notify(describe(), "warning");
  });
  pi.on("session_shutdown", () => {
    lease?.release();
    lease = undefined;
  });
  attach();
}
