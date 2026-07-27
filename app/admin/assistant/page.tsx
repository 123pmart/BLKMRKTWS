import { redirect } from "next/navigation";

import { readContent } from "@/api/content/store.js";
import { AssistantKnowledgeEditor } from "@/components/assistant/assistant-knowledge-editor";
import { getAdminIdentity } from "@/lib/admin/auth";
import { loadAssistantProducts } from "@/lib/assistant/catalog";

export const dynamic = "force-dynamic";

export default async function AssistantKnowledgePage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  const [products, content] = await Promise.all([
    loadAssistantProducts(),
    readContent(),
  ]);

  return (
    <AssistantKnowledgeEditor
      products={products}
      adminName={identity.displayName}
      canVerify={identity.scope === "all"}
      canRelease={identity.scope === "all"}
      assistantEnabled={content?.assistantEnabled === true}
    />
  );
}
