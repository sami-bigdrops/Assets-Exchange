import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

type Context = {
    requestId: string;
};

const storage = new AsyncLocalStorage<Context>();

export function withRequestContext<T>(fn: () => Promise<T>) {
    return storage.run({ requestId: randomUUID() }, fn);
}

export function getRequestId() {
    return storage.getStore()?.requestId;
}
