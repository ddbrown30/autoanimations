import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
  Hooks.on("createChatMessage", async (msg) => {
    if (msg.author?.id !== game.user.id) { return };

    const item = await fromUuid(msg.system?.itemId);
    if (!item) { return };

    const compiledData = await getRequiredData({
      item: item,  
      itemUuid: msg.flags?.a5e?.itemId,
      actorId: msg.speaker?.actorId,
      tokenId: msg.speaker?.token,
      workflow: msg,
    });

    runA5e(compiledData);
  });
  
  Hooks.on('createRegion', async (template, data, userId) => {
    if (userId !== game.user.id) { return };
    const item = await fromUuid(
      foundry.utils.getProperty(template, 'flags.a5e.originItem')
    );

    if (!item) { return };
    
    const compiledData = await getRequiredData({
      item,
      templateData: template,
      roll: template,
      isTemplate: true
    })
    
    runA5e(compiledData);
  }); 
}

async function runA5e(input) {
  const handler = await AAHandler.make(input);
  if (!handler?.item || !handler?.sourceToken) return;
  trafficCop(handler);
}