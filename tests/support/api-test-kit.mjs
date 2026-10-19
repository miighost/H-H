// Test-only repository; production uses a configured persistent store. No demo bypass in API.
export class DB {
  constructor() {
    this.records = new Map();
    this.serial = Promise.resolve();
  }
  collection(name) {
    const db = this;
    return {
      name,
      doc(id = crypto.randomUUID()) {
        return {
          collection: name,
          id,
          path: name + "/" + id,
          get: async () => db.snapshot(name + "/" + id),
          set: async (v, opt) => db.write(name + "/" + id, v, opt),
          update: async (v) => db.write(name + "/" + id, v, { merge: true }),
        };
      },
      where(field, op, value) {
        return db.query(name, field, value);
      },
      limit() {
        return db.query(name);
      },
      get() {
        return db.query(name).get();
      },
    };
  }
  query(name, field, value) {
    const db = this;
    return {
      get: async () => ({
        docs: [...db.records.keys()]
          .filter((k) => k.startsWith(name + "/"))
          .map((k) => db.snapshot(k))
          .filter((d) => !field || d.data()[field] === value),
      }),
      limit() {
        return this;
      },
    };
  }
  snapshot(path) {
    const v = this.records.get(path);
    return {
      id: path.split("/")[1],
      exists: v !== undefined,
      data: () => (v === undefined ? undefined : structuredClone(v)),
    };
  }
  write(path, v, opt) {
    this.records.set(
      path,
      opt?.merge
        ? { ...(this.records.get(path) || {}), ...structuredClone(v) }
        : structuredClone(v),
    );
  }
  async runTransaction(fn) {
    const run = this.serial.then(async () => {
      const original = new Map(
        [...this.records].map(([k, v]) => [k, structuredClone(v)]),
      );
      try {
        return await fn({
          get: (r) => r.get(),
          set: (r, v, opt) => this.write(r.path, v, opt),
          update: (r, v) => this.write(r.path, v, { merge: true }),
        });
      } catch (e) {
        this.records = original;
        throw e;
      }
    });
    this.serial = run.catch(() => {});
    return run;
  }
}
export const identities = {
  ceo:{uid:"ceo",email:"info@hornandharvest.com",email_verified:true,hhRole:"ceo"},
  buyer: { uid: "buyer", email: "buyer@example.com" },
  other: { uid: "other", email: "other@example.com" },
  warehouse: { uid: "warehouse", hhRole: "warehouse" },
  driver: { uid: "driver", hhRole: "driver" },
  admin: { uid: "admin", hhRole: "admin" },
};
export const db = new DB(),
  storageFiles = new Map();
export const storage = () => ({
  bucket: () => ({
    file: (path) => ({
      save: async (b) => storageFiles.set(path, b),
      download: async () => [storageFiles.get(path)],
    }),
  }),
});
export const auth = {
  verifyIdToken: async (t) => {
    if (!identities[t]) throw Error("bad");
    return identities[t];
  },
  listUsers:async()=>({users:[{uid:"driver",email:"driver@example.com",customClaims:{hhRole:"driver"}}]}),
  getUser: async (uid) => ({
    uid,
    email: uid + "@example.com",
    customClaims: { hhRole: uid === "driver" ? "driver" : "customer" },
  }),
};
