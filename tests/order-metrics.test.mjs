import assert from "node:assert/strict";
import test from "node:test";

import { formatOrderLineMargin, orderLineMarginPercent } from "../public/lib/margin-metrics.js";

test("order margin uses MAP as retail revenue and formats two decimals", () => {
  assert.equal(formatOrderLineMargin({ qty: 1, wholesale: "$30.00", map: "$60.00" }), "50.00%");
  assert.equal(formatOrderLineMargin({ qty: 2, lineWholesale: 60, lineMap: 120 }), "50.00%");
  assert.equal(formatOrderLineMargin({ qty: 1, wholesale: "$30.00", map: "$0.00" }), "—");
  assert.equal(orderLineMarginPercent({ qty: 1, wholesale: "$30.00", map: "$60.00" }), 50);
});
