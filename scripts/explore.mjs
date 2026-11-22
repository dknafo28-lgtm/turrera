import { run } from "../collectors/municibid.mjs";
await run();
for (const u of ["https://storagemunicibidpro.blob.core.windows.net/assets/media/b1621d1c-9338-521c-7b8a-bbc494e01d76.jpg", "https://storagemunicibidpro.blob.core.windows.net/assets/media/b1621d1c-9338-521c-7b8a-bbc494e01d76_thumbcrop.jpg"]) {
  const r = await fetch(u); const b = await r.arrayBuffer(); console.log("IMG", u.slice(-40), r.status, b.byteLength);
}
