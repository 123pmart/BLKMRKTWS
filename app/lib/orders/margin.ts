import { formatOrderLineMargin as formatSharedMargin } from "../../../public/lib/margin-metrics.js";

import type { OrderLine } from "@/types";

export function formatOrderLineMargin(line: Pick<OrderLine, "qty" | "wholesale" | "map" | "lineWholesale" | "lineMap">): string {
  return formatSharedMargin(line);
}
