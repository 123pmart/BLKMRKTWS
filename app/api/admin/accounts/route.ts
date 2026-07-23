import { createAccount, deleteAccount, getAccountById, listAccounts, newAccountId, newStoreId, renameAccountUsername, updateAccount, UsernameConflictError } from "@/lib/account/account-store";
import { hashPassword } from "@/lib/account/password";
import { normalizeUsername, validateRegistration } from "@/lib/account/validation";
import { getAdminIdentity } from "@/lib/admin/auth";
import { accountSalesperson, adminCanAccessSalesperson, isSalespersonId, normalizeSalesperson, orderSalesperson } from "@/lib/salespeople";
import { loadServerCatalog, type ServerCatalogItem } from "@/lib/catalog/server-catalog";
import { normalizePriceOverride } from "@/lib/catalog/pricing";
import { linkOrderToStore, readOrders } from "@/api/orders/store.js";
import type { StoreAccount, StoreAccountStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return unauthorized();
  const accounts = await listAccounts();
  const [orders, catalog] = await Promise.all([readOrders(), loadServerCatalog()]);
  const visibleAccounts = accounts.filter((account) => adminCanAccessSalesperson(identity, accountSalesperson(account)));
  const visibleOrders = (orders as Array<{ id: string; storeId?: string; salesperson?: "parker" | "matt" | "beau"; store: { storeName?: string; salesperson?: "parker" | "matt" | "beau" }; date?: string }>).filter((order) => adminCanAccessSalesperson(identity, orderSalesperson(order)));
  return Response.json({
    ok: true,
    accounts: visibleAccounts.map(publicAdminAccount),
    orders: visibleOrders.map((order) => ({
      id: order.id, storeId: order.storeId || "", storeName: order.store?.storeName || "", date: order.date || "",
    })),
    catalog: catalog.map((item: ServerCatalogItem) => ({
      productId: item.productId, variantId: item.variantId, product: item.product, flavor: item.flavor,
      item: item.item, wholesalePrice: item.wholesalePrice, mapPrice: item.mapPrice,
      image: item.image, status: item.status, hidden: item.hidden,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return unauthorized();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const password = String(body.password || "");
  const validation = validateRegistration({
    storeName: String(body.storeName || ""), contactName: String(body.contactName || ""),
    email: String(body.email || ""), username: String(body.username || ""), password, confirmPassword: password,
    salesperson: identity.scope === "own" ? identity.salesperson : normalizeSalesperson(body.salesperson),
  });
  if (!validation.ok || !validation.value) {
    return Response.json({ ok: false, message: "Review the account fields.", errors: validation.errors }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const now = new Date().toISOString();
  const storeId = newStoreId();
  const account: StoreAccount = {
    id: newAccountId(), storeId, username: validation.value.username, email: validation.value.email,
    passwordHash: await hashPassword(password), status: "active",
    store: {
      id: storeId, storeName: validation.value.storeName, contactName: validation.value.contactName,
      email: validation.value.email, phone: "", street: "", city: "", state: "", zip: "",
      salesperson: validation.value.salesperson,
      status: "active", createdAt: now, updatedAt: now,
    },
    priceOverrides: [], createdAt: now, updatedAt: now,
  };
  try {
    await createAccount(account);
    return Response.json({ ok: true, account: publicAdminAccount(account) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UsernameConflictError) return Response.json({ ok: false, message: error.message }, { status: 409, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return unauthorized();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const accountId = String(body.accountId || "");
  const action = String(body.action || "");
  const account = await getAccountById(accountId);
  if (!account) return Response.json({ ok: false, message: "Store account not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!adminCanAccessSalesperson(identity, accountSalesperson(account))) return Response.json({ ok: false, message: "Store account not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  let updated = account;
  if (action === "status") {
    const status = String(body.status) as StoreAccountStatus;
    if (!["active", "disabled"].includes(status)) return badRequest("Invalid account status.");
    updated = await updateAccount(account.username, (record) => ({ ...record, status }));
  } else if (action === "reset-password") {
    const password = String(body.password || "");
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return badRequest("Use at least 10 characters with a letter and number.");
    const passwordHash = await hashPassword(password);
    updated = await updateAccount(account.username, (record) => ({ ...record, passwordHash }));
  } else if (action === "username") {
    const username = normalizeUsername(body.username);
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) return badRequest("Enter a valid username.");
    updated = await renameAccountUsername(account.username, username);
  } else if (action === "store") {
    updated = await updateAccount(account.username, (record) => ({
      ...record,
      email: clean(body.email, 180).toLowerCase() || record.email,
      store: {
        ...record.store,
        storeName: clean(body.storeName, 120) || record.store.storeName,
        contactName: clean(body.contactName, 120) || record.store.contactName,
        email: clean(body.email, 180).toLowerCase() || record.store.email,
        phone: clean(body.phone, 40), street: clean(body.street, 180), city: clean(body.city, 90),
        state: clean(body.state, 30).toUpperCase(), zip: clean(body.zip, 20), updatedAt: new Date().toISOString(),
        salesperson: identity.scope === "own" ? identity.salesperson : (isSalespersonId(body.salesperson) ? body.salesperson : normalizeSalesperson(record.store.salesperson)),
      },
    }));
  } else if (action === "add-price") {
    const override = normalizePriceOverride({
      productId: String(body.productId || ""), variantId: String(body.variantId || ""), wholesalePrice: Number(body.wholesalePrice),
    }, account.storeId);
    const catalog = await loadServerCatalog();
    const target = catalog.find((item) => override.variantId ? item.variantId === override.variantId : item.productId === override.productId);
    if (!target) return badRequest("The selected catalog item no longer exists.");
    updated = await updateAccount(account.username, (record) => ({
      ...record,
      priceOverrides: [...record.priceOverrides.filter((entry) => override.variantId ? entry.variantId !== override.variantId : entry.variantId || entry.productId !== override.productId), override],
    }));
  } else if (action === "set-prices") {
    const submitted = Array.isArray(body.prices) ? body.prices : [];
    if (!submitted.length || submitted.length > 1000) return badRequest("Submit between 1 and 1,000 price changes.");
    const catalog = await loadServerCatalog();
    const changes: Array<{ productId: string; variantId: string; remove: boolean; wholesalePrice?: number }> = [];
    const seen = new Set<string>();
    for (const raw of submitted) {
      if (!raw || typeof raw !== "object") return badRequest("Invalid product price.");
      const entry = raw as Record<string, unknown>;
      const variantId = String(entry.variantId || "").trim();
      const target = catalog.find((item) => item.variantId === variantId);
      if (!target || seen.has(variantId)) return badRequest("A selected catalog item no longer exists.");
      seen.add(variantId);
      if (entry.remove === true) {
        changes.push({ productId: target.productId, variantId, remove: true });
        continue;
      }
      const wholesalePrice = Number(entry.wholesalePrice);
      if (!Number.isFinite(wholesalePrice) || wholesalePrice < 0 || wholesalePrice > 100_000) {
        return badRequest(`Enter a valid wholesale price for ${target.product} / ${target.flavor}.`);
      }
      changes.push({ productId: target.productId, variantId, remove: false, wholesalePrice });
    }
    updated = await updateAccount(account.username, (record) => {
      const touched = new Set(changes.map((entry) => entry.variantId));
      const retained = record.priceOverrides.filter((entry) => !entry.variantId || !touched.has(entry.variantId));
      const next = changes.filter((entry) => !entry.remove).map((entry) => {
        const existing = record.priceOverrides.find((override) => override.variantId === entry.variantId);
        return normalizePriceOverride({
          ...existing,
          productId: entry.productId,
          variantId: entry.variantId,
          wholesalePrice: entry.wholesalePrice,
        }, record.storeId);
      });
      return { ...record, priceOverrides: [...retained, ...next] };
    });
  } else if (action === "remove-price") {
    const overrideId = String(body.overrideId || "");
    updated = await updateAccount(account.username, (record) => ({ ...record, priceOverrides: record.priceOverrides.filter((entry) => entry.id !== overrideId) }));
  } else if (action === "link-order") {
    const orders = await readOrders();
    const targetOrder = (orders as Array<{ id: string; salesperson?: "parker" | "matt" | "beau"; store: { salesperson?: "parker" | "matt" | "beau" } }>).find((order) => order.id === String(body.orderId || ""));
    if (!targetOrder || !adminCanAccessSalesperson(identity, orderSalesperson(targetOrder)) || orderSalesperson(targetOrder) !== accountSalesperson(account)) return badRequest("Order not found for this salesperson.");
    const linked = await linkOrderToStore(targetOrder.id, account.storeId);
    if (!linked) return badRequest("Order not found.");
  } else {
    return badRequest("Unknown account action.");
  }

  return Response.json({ ok: true, account: publicAdminAccount(updated) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return unauthorized();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const account = await getAccountById(String(body.accountId || ""));
  if (!account || !adminCanAccessSalesperson(identity, accountSalesperson(account))) {
    return Response.json({ ok: false, message: "Store account not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  await deleteAccount(account.username, account.id);
  return Response.json({
    ok: true,
    deletedAccountId: account.id,
    message: "Store account deleted. Historical orders were preserved.",
  }, { headers: { "Cache-Control": "no-store" } });
}

function publicAdminAccount(account: StoreAccount) {
  const { passwordHash: _passwordHash, ...safe } = account;
  void _passwordHash;
  return safe;
}
function unauthorized() { return Response.json({ ok: false, message: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } }); }
function badRequest(message: string) { return Response.json({ ok: false, message }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
function clean(value: unknown, max: number) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max); }
