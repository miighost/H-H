import { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";
type Event = {
  eventId: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  accuracyMetres: number;
  uid: string;
  orderId: string;
};
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("hh-driver-locations-v1", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("events", { keyPath: "eventId" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function write(event: Event) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("events", "readwrite");
    t.objectStore("events").put(event);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
}
async function pending(uid: string, orderId: string) {
  const db = await open();
  const all = await new Promise<Event[]>((resolve, reject) => {
    const r = db.transaction("events").objectStore("events").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return all
    .filter((e) => e.uid === uid && e.orderId === orderId)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .slice(0, 100);
}
async function remove(events: Event[]) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("events", "readwrite");
    events.forEach((e) => t.objectStore("events").delete(e.eventId));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
}
export function useDeliveryTracker(
  orderId: string | undefined,
  status: string | undefined,
  api: (p: string, b?: unknown) => Promise<any>,
) {
  const [active, setActive] = useState(false),
    [message, setMessage] = useState("");
  const uploading = useRef(false);
  const flush = async () => {
    if (uploading.current || !auth.currentUser || !orderId || !navigator.onLine)
      return;
    uploading.current = true;
    try {
      const events = await pending(auth.currentUser.uid, orderId);
      if (events.length) {
        await api(`/orders/${orderId}/locations`, { events });
        await remove(events);
        setMessage("Location records synced.");
      }
    } catch (e) {
      setMessage(
        "Locations remain saved on this device. " + (e as Error).message,
      );
    } finally {
      uploading.current = false;
    }
  };
  useEffect(() => {
    void flush();
    const timer = setInterval(() => void flush(), 15000);
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [orderId]);
  useEffect(() => {
    if (!active) return;
    if (!orderId || !["Left warehouse", "Arrived"].includes(status || "")) {
      setActive(false);
      return;
    }
    if (!navigator.geolocation) {
      setMessage("GPS is not available on this device.");
      setActive(false);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setActive(false);
      return;
    }
    let last = 0,
      lastLat = 0,
      lastLon = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now(),
          m = Math.hypot(
            (p.coords.latitude - lastLat) * 111000,
            (p.coords.longitude - lastLon) *
              111000 *
              Math.cos((p.coords.latitude * Math.PI) / 180),
          );
        if (now - last < 15000 && m < 100) return;
        last = now;
        lastLat = p.coords.latitude;
        lastLon = p.coords.longitude;
        void write({
          eventId: crypto.randomUUID(),
          uid,
          orderId,
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracyMetres: p.coords.accuracy,
          capturedAt: new Date(p.timestamp).toISOString(),
        })
          .then(flush)
          .catch((e) => {
            setMessage("Local storage failed; tracking stopped. " + e.message);
            setActive(false);
          });
      },
      (e) => setMessage(e.message),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [active, orderId, status]);
  return {
    active,
    message,
    start: () => {
      setMessage(
        "Tracking active while this browser is running. Native app required for screen-locked tracking.",
      );
      setActive(true);
    },
    stop: () => {
      setActive(false);
      void flush();
      setMessage("Tracking stopped. Saved locations will sync when connected.");
    },
  };
}
