import { DatabaseSync } from "node:sqlite";
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// Single managed Node process. Business transactions persist atomically on YOUR server.
export class LocalStore {
  constructor(filename) {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    this.sql = new DatabaseSync(filename);
    this.sql.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(collection,id));",
    );
    this.context = new AsyncLocalStorage();
    this.serial = Promise.resolve();
  }
  async locked(fn) {
    if (this.context.getStore() === this) return fn();
    const task = this.serial.then(() => this.context.run(this, fn));
    this.serial = task.catch(() => {});
    return task;
  }
  collection(name) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) throw Error("Invalid collection.");
    const db = this;
    return {
      doc(id = crypto.randomUUID()) {
        if (!/^[A-Za-z0-9_.-]+$/.test(id)) throw Error("Invalid record ID.");
        const ref = {
          id,
          path: name + "/" + id,
          collection: name,
          get: () => db.locked(() => db.snapshot(name, id)),
          set: (v, options) => db.locked(() => db.write(name, id, v, options)),
          update: (v) =>
            db.locked(() => {
              if (!db.snapshot(name, id).exists)
                throw Error("Record does not exist.");
              db.write(name, id, v, { merge: true });
            }),
        };
        return ref;
      },
      where(field, operator, value) {
        if (operator !== "==") throw Error("Only equality queries supported.");
        return db.query(name, [[field, value]]);
      },
      get: () => db.query(name).get(),
      limit: (n) => db.query(name, [], n),
    };
  }
  snapshot(name, id) {
    const row = this.sql
      .prepare("SELECT data FROM records WHERE collection=? AND id=?")
      .get(name, id);
    return {
      id,
      exists: Boolean(row),
      data: () => (row ? JSON.parse(row.data) : undefined),
    };
  }
  write(name, id, value, options) {
    const v = options?.merge
      ? { ...this.snapshot(name, id).data(), ...value }
      : value;
    this.sql
      .prepare(
        "INSERT INTO records(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data",
      )
      .run(name, id, JSON.stringify(v));
  }
  query(name, filters = [], limit = Infinity) {
    const db = this;
    return {
      get: () =>
        db.locked(() => ({
          docs: db.sql
            .prepare(
              "SELECT id,data FROM records WHERE collection=? ORDER BY rowid",
            )
            .all(name)
            .map((row) => ({
              id: row.id,
              exists: true,
              data: () => JSON.parse(row.data),
            }))
            .filter((d) =>
              filters.every(([field, value]) => d.data()[field] === value),
            )
            .slice(0, limit),
        })),
      where: (f, op, v) => {
        if (op !== "==") throw Error("Only equality supported.");
        return db.query(name, [...filters, [f, v]], limit);
      },
      limit: (n) => db.query(name, filters, n),
    };
  }
  runTransaction(fn) {
    return this.locked(async () => {
      this.sql.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn({
          get: (r) => r.get(),
          set: (r, v, o) => this.write(r.collection, r.id, v, o),
          update: (r, v) => {
            if (!this.snapshot(r.collection, r.id).exists)
              throw Error("Record does not exist.");
            this.write(r.collection, r.id, v, { merge: true });
          },
        });
        this.sql.exec("COMMIT");
        return result;
      } catch (e) {
        this.sql.exec("ROLLBACK");
        throw e;
      }
    });
  }
  close() {
    this.sql.close();
  }
}
export function localFileStorage(directory) {
  const root = path.resolve(directory);
  mkdirSync(root, { recursive: true });
  return () => ({
    bucket: () => ({
      file: (name) => {
        const p = path.resolve(root, name);
        if (!p.startsWith(root + path.sep))
          throw Error("Invalid storage path.");
        return {
          save: async (bytes) => {
            await fs.mkdir(path.dirname(p), { recursive: true });
            const temp = p + "." + crypto.randomUUID() + ".tmp";
            await fs.writeFile(temp, bytes, { mode: 0o600 });
            await fs.rename(temp, p);
          },
          download: async () => [await fs.readFile(p)],
        };
      },
    }),
  });
}
