import { kvSet } from "../kv";

if (Bun.argv[2] && Bun.argv[3]) {
  // @ts-expect-error
  console.log(await kvSet(Bun.argv[2], JSON.parse(Bun.argv[3])));
}
