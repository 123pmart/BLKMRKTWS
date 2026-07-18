"use client";

import { useEffect, useState } from "react";

export function NotificationEnrollment() {
  const [eligible, setEligible] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const supported = installed && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    queueMicrotask(() => setEligible(supported));
    if (supported && Notification.permission === "granted") void subscribe(false);
  }, []);
  if (!eligible || Notification.permission === "denied") return null;

  async function subscribe(showStatus = true) {
    try {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") return showStatus && setMessage("News alerts were not enabled.");
      const registration = await navigator.serviceWorker.ready;
      const config = await fetch("/api/push/config", { cache: "no-store" }).then((response) => response.json());
      if (!config.configured || !config.publicKey) throw new Error("News alerts are not configured yet.");
      const current = await registration.pushManager.getSubscription();
      const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
      const response = await fetch("/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience: "customer", subscription: subscription.toJSON() }) });
      if (!response.ok) throw new Error("News alerts could not be saved.");
      if (showStatus) setMessage("News alerts are enabled on this device.");
    } catch (error) { if (showStatus) setMessage(error instanceof Error ? error.message : "News alerts could not be enabled."); }
  }

  return <div className="notification-enrollment"><button type="button" onClick={() => void subscribe(true)}>{Notification.permission === "granted" ? "Reconnect news alerts" : "Enable news alerts"}</button>{message ? <p role="status">{message}</p> : null}</div>;
}

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
