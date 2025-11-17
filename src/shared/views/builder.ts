import { initViewsBuilder } from "@gramio/views";
import type { TFunction } from "../locales/index.ts";

interface Data {
	t: TFunction;
}

export const defineView = initViewsBuilder<Data>();
