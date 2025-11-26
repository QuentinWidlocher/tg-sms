import { kvGet } from "../kv";

if (Bun.argv[2]) {
  // @ts-expect-error
  console.log(await kvGet(Bun.argv[2]));
}
