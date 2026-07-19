import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("OSE spell messages resolve the item ID from Foundry roll options", async () => {
    let chatMessageHook;
    let requiredData;

    const context = vm.createContext({
        game: { user: { id: "current-user" } },
        Hooks: {
            on(hook, callback) {
                if (hook === "createChatMessage") chatMessageHook = callback;
            },
        },
    });

    const source = await readFile(new URL("../../src/system-support/aa-ose.js", import.meta.url), "utf8");
    const oseModule = new vm.SourceTextModule(source, { context });
    const dependencies = {
        "../router/traffic-cop.js": { trafficCop() {} },
        "../system-handlers/workflow-data.js": {
            default: { async make() { return { item: { id: "spell-id" } }; } },
        },
        "./getRequiredData.js": {
            async getRequiredData(data) {
                requiredData = data;
                return data;
            },
        },
    };

    await oseModule.link((specifier) => {
        const exports = dependencies[specifier];
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await oseModule.evaluate();
    oseModule.namespace.systemHooks();

    const message = {
        author: { id: "current-user" },
        flags: { ose: {} },
        rolls: [{ options: { itemId: "spell-id" } }],
        speaker: { actor: "actor-id", token: "token-id" },
    };
    Object.defineProperty(message, "user", {
        get() { throw new Error("The migrated ChatMessage#user property was accessed"); },
    });

    await chatMessageHook(message);

    assert.equal(
        requiredData.itemId,
        "spell-id",
        "OSE spell item ID was not read from roll options",
    );
});
