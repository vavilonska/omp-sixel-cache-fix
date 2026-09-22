/** Only SIXEL skips Kitty's separate upload bookkeeping. */
export interface BudgetReceiver {
  shouldTransmit(imageId: number): boolean;
}

type TransmitMethod = (this: BudgetReceiver, imageId: number) => boolean;

interface PatchState {
  version: 2;
  owners: Set<symbol>;
  enabled: boolean;
  bypasses: number;
  originalDescriptor: PropertyDescriptor;
  original: TransmitMethod;
  wrapped: TransmitMethod;
}

export interface PatchStatus {
  attached: boolean;
  enabled: boolean;
  owners: number;
  bypasses: number;
}

export interface PatchLease {
  status(): PatchStatus;
  setEnabled(enabled: boolean): void;
  release(): void;
}

const PATCH_KEY = Symbol.for("omp.sixel-cache-fix.patch.v2");

function expectedMethod(state: PatchState): TransmitMethod {
  return state.enabled ? state.wrapped : state.original;
}

export function acquireSixelCachePatch(
  prototype: BudgetReceiver,
  isSixel: () => boolean,
): PatchLease {
  let state = Reflect.get(prototype, PATCH_KEY) as PatchState | undefined;
  if (state) {
    if (state.version !== 2 || prototype.shouldTransmit !== expectedMethod(state)) {
      throw new Error("ImageBudget.shouldTransmit was changed by another extension; refusing to overwrite it.");
    }
  } else {
    const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, "shouldTransmit");
    if (!originalDescriptor || typeof originalDescriptor.value !== "function" || !originalDescriptor.configurable) {
      throw new Error("This OMP ImageBudget does not expose the supported shouldTransmit method.");
    }
    const original: TransmitMethod = originalDescriptor.value;
    const created: PatchState = {
      version: 2,
      owners: new Set(),
      enabled: true,
      bypasses: 0,
      originalDescriptor,
      original,
      wrapped: function (imageId: number): boolean {
        if (created.enabled && isSixel()) {
          created.bypasses++;
          return false;
        }
        return original.call(this, imageId);
      },
    };
    Object.defineProperty(prototype, PATCH_KEY, { value: created, configurable: true });
    try {
      Object.defineProperty(prototype, "shouldTransmit", { ...originalDescriptor, value: created.wrapped });
    } catch (error) {
      Reflect.deleteProperty(prototype, PATCH_KEY);
      throw error;
    }
    state = created;
  }

  const shared = state;
  const owner = Symbol("sixel-cache-owner");
  shared.owners.add(owner);
  let released = false;
  return {
    status: () => ({
      attached: !released && prototype.shouldTransmit === expectedMethod(shared),
      enabled: !released && shared.enabled,
      owners: shared.owners.size,
      bypasses: shared.bypasses,
    }),
    setEnabled(enabled) {
      if (released || prototype.shouldTransmit !== expectedMethod(shared)) {
        throw new Error("The cache patch is detached; reload the extension before changing its state.");
      }
      if (enabled === shared.enabled) return;
      Object.defineProperty(prototype, "shouldTransmit", enabled
        ? { ...shared.originalDescriptor, value: shared.wrapped }
        : shared.originalDescriptor);
      shared.enabled = enabled;
    },
    release() {
      if (released) return;
      released = true;
      shared.owners.delete(owner);
      if (shared.owners.size !== 0) return;
      // A later extension may retain our wrapper: make it a pass-through too.
      shared.enabled = false;
      if (prototype.shouldTransmit === shared.wrapped) {
        Object.defineProperty(prototype, "shouldTransmit", shared.originalDescriptor);
      }
      if (Reflect.get(prototype, PATCH_KEY) === shared) Reflect.deleteProperty(prototype, PATCH_KEY);
    },
  };
}
