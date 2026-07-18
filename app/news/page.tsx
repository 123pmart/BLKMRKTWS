/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { PortalPage } from "@/components/portal/portal-page";
import { NotificationEnrollment } from "@/components/pwa/notification-enrollment";
import { getVerifiedStoreAccount } from "@/lib/account/auth";
import { loadPublicAnnouncements } from "@/lib/content/public-content";

export default async function NewsPage() {
  const [verified, announcements] = await Promise.all([getVerifiedStoreAccount(), loadPublicAnnouncements()]);
  return (
    <PortalPage authenticated={Boolean(verified)}>
      <header className="route-heading">
        <p className="portal-kicker">Announcements</p>
        <h1>News</h1>
        <p>Product launches, availability, and wholesale updates.</p>
        <NotificationEnrollment />
      </header>
      <section className="react-news-list">
        {announcements.map((item, index) => (
          <article key={item.id} className="react-news-card">
            {item.image ? <div><img src={item.image} alt="" width="960" height="540" loading={index === 0 ? "eager" : "lazy"} decoding="async" /></div> : null}
            <div><p><span>{item.label || "Update"}</span><time dateTime={item.date}>{item.date}</time></p><h2>{item.title}</h2><p>{item.body}</p>{item.ctaUrl && item.ctaLabel ? <Link href={item.ctaUrl}>{item.ctaLabel}</Link> : null}</div>
          </article>
        ))}
      </section>
    </PortalPage>
  );
}
