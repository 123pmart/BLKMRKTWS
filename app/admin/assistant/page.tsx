import { redirect } from "next/navigation";

import { AssistantKnowledgeEditor } from "@/components/assistant/assistant-knowledge-editor";
import { getAdminIdentity } from "@/lib/admin/auth";
import { loadAssistantProducts } from "@/lib/assistant/catalog";

export const dynamic = "force-dynamic";

export default async function AssistantKnowledgePage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  const products = await loadAssistantProducts();

  return (
    <AssistantKnowledgeEditor
      products={products}
      adminName={identity.displayName}
      canVerify={identity.scope === "all"}
    />
  );
}
