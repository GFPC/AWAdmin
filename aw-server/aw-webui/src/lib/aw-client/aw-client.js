"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var exports = {};
//Object.defineProperty(exports, "__esModule", { value: true });
//exports.AWClient = void 0;
import axios from "axios";
const axios_1 = axios
class AWClient {
  constructor(clientname, options = {}) {
    this.heartbeatQueues = {};
    this.clientname = clientname;
    this.testing = options.testing || false;
    if (typeof options.baseURL === "undefined") {
      const port = !options.testing ? 5800 : 5666;
      // Note: had to switch to 127.0.0.1 over localhost as otherwise there's
      // a possibility it tries to connect to IPv6's `::1`, which will be refused.
      this.baseURL = `http://127.0.0.1:${port}`;
    }
    else {
      this.baseURL = options.baseURL;
    }
    this.controller = options.controller || new AbortController();
    this.req = axios_1.default.create({
      baseURL: this.baseURL + "/api",
      timeout: options.timeout || 30000,
    });
    // Cache for queries, by timeperiod
    // TODO: persist cache and add cache expiry/invalidation
    this.queryCache = {};
  }
  _get(endpoint, params = {}) {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      return this.req
        .get(endpoint, Object.assign(Object.assign({}, params), { signal: this.controller.signal }))
        .then((res) => (res && res.data) || res);
    });
  }
  _post(endpoint, data = {}) {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      return this.req
        .post(endpoint, data, { signal: this.controller.signal })
        .then((res) => (res && res.data) || res);
    });
  }
  _delete(endpoint) {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      return this.req.delete(endpoint, { signal: this.controller.signal });
    });
  }
  getInfo() {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      return this._get("/0/info");
    });
  }
  abort(msg) {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      console.info(msg || "Requests cancelled");
      this.controller.abort();
      this.controller = new AbortController();
    });
  }
  ensureBucket(bucketId, type, hostname) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this._post(`/0/buckets/${bucketId}`, {
          client: this.clientname,
          type,
          hostname,
        });
      }
      catch (err) {
        // Will return 304 if bucket already exists
        if (axios_1.default.isAxiosError(err) &&
          err.response &&
          err.response.status === 304) {
          return { alreadyExist: true };
        }
        throw err;
      }
      return { alreadyExist: false };
    });
  }
  createBucket(bucketId, type, hostname) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._post(`/0/buckets/${bucketId}`, {
        client: this.clientname,
        type,
        hostname,
      });
      return undefined;
    });
  }
  deleteBucket(bucketId) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._delete(`/0/buckets/${bucketId}?force=1`);
      return undefined;
    });
  }
  getBuckets(user) {
    return __awaiter(this, void 0, void 0, function* () {
      const buckets = yield this._post("/0/buckets/", user ? { user: user } : {});
      Object.keys(buckets).forEach((bucket) => {
        buckets[bucket].created = new Date(buckets[bucket].created);
        if (buckets[bucket].last_updated) {
          buckets[bucket].last_updated = new Date(buckets[bucket].last_updated);
        }
      });
      return buckets;
    });
  }
  getBucketInfo(bucketId) {
    return __awaiter(this, void 0, void 0, function* () {
      const bucket = yield this._get(`/0/buckets/${bucketId}`);
      if (bucket.data === undefined) {
        console.warn("Received bucket had undefined data, likely due to data field unsupported by server. Try updating your ActivityWatch server to get rid of this message.");
        bucket.data = {};
      }
      bucket.created = new Date(bucket.created);
      return bucket;
    });
  }
  getEvent(bucketId, eventId) {
    return __awaiter(this, void 0, void 0, function* () {
      // Get a single event by ID
      const event = yield this._get("/0/buckets/" + bucketId + "/events/" + eventId);
      event.timestamp = new Date(event.timestamp);
      return event;
    });
  }
  getEvents(bucketId, params = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      const events = yield this._get("/0/buckets/" + bucketId + "/events", {
        params,
      });
      events.forEach((event) => {
        event.timestamp = new Date(event.timestamp);
      });
      return events;
    });
  }
  countEvents(bucketId, startTime, endTime) {
    // eslint-disable-next-line require-yield
    return __awaiter(this, void 0, void 0, function* () {
      const params = {
        starttime: startTime ? startTime.toISOString() : null,
        endtime: endTime ? endTime.toISOString() : null,
      };
      return this._get("/0/buckets/" + bucketId + "/events/count", {
        params,
      });
    });
  }
  // Insert a single event, requires the event to not have an ID assigned
  insertEvent(bucketId, event) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.insertEvents(bucketId, [event]);
    });
  }
  // Insert multiple events, requires the events to not have IDs assigned
  insertEvents(bucketId, events) {
    return __awaiter(this, void 0, void 0, function* () {
      // Check that events don't have IDs
      // To replace an event, use `replaceEvent`, which does the opposite check (requires ID)
      for (const event of events) {
        if (event.id !== undefined) {
          throw Error(`Can't insert event with ID assigned: ${event}`);
        }
      }
      yield this._post("/0/buckets/" + bucketId + "/events", events);
    });
  }
  // Replace an event, requires the event to have an ID assigned
  replaceEvent(bucketId, event) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.replaceEvents(bucketId, [event]);
    });
  }
  // Replace multiple events, requires the events to have IDs assigned
  replaceEvents(bucketId, events) {
    return __awaiter(this, void 0, void 0, function* () {
      for (const event of events) {
        if (event.id === undefined) {
          throw Error("Can't replace event without ID assigned");
        }
      }
      yield this._post("/0/buckets/" + bucketId + "/events", events);
    });
  }
  deleteEvent(bucketId, eventId) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._delete("/0/buckets/" + bucketId + "/events/" + eventId);
    });
  }
  /**
   *
   * @param bucketId The id of the bucket to send the heartbeat to
   * @param pulsetime The maximum amount of time in seconds since the last heartbeat to be merged
   *                  with the previous heartbeat in aw-server
   * @param heartbeat The actual heartbeat event
   */
  heartbeat(bucketId, pulsetime, heartbeat) {
    // Create heartbeat queue for bucket if not already existing
    if (!Object.prototype.hasOwnProperty.call(this.heartbeatQueues, bucketId)) {
      this.heartbeatQueues[bucketId] = {
        isProcessing: false,
        data: [],
      };
    }
    return new Promise((resolve, reject) => {
      // Add heartbeat request to queue
      this.heartbeatQueues[bucketId].data.push({
        onSuccess: resolve,
        onError: reject,
        pulsetime,
        heartbeat,
      });
      this.updateHeartbeatQueue(bucketId);
    });
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Queries the aw-server for data
   *
   * If cache is enabled, for each {query, timeperiod} it will return cached data if available,
   * if a timeperiod spans the future it will not cache it.
   */
  query(timeperiods, query, params = {}) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
      params.cache = (_a = params.cache) !== null && _a !== void 0 ? _a : true;
      params.cacheEmpty = (_b = params.cacheEmpty) !== null && _b !== void 0 ? _b : false;
      params.verbose = (_c = params.verbose) !== null && _c !== void 0 ? _c : false;
      params.name = (_d = params.name) !== null && _d !== void 0 ? _d : "query";
      function isEmpty(obj) {
        // obj can be an array or an object, this works for both
        return Object.keys(obj).length === 0;
      }
      const data = {
        query,
        timeperiods: timeperiods.map((tp) => {
          return typeof tp !== "string"
            ? `${tp.start.toISOString()}/${tp.end.toISOString()}`
            : tp;
        }),
      };
      const cacheResults = [];
      if (params.cache) {
        // Check cache for each {timeperiod, query} pair
        for (const timeperiod of data.timeperiods) {
          // check if timeperiod spans the future
          const stop = new Date(timeperiod.split("/")[1]);
          const now = new Date();
          if (now < stop) {
            cacheResults.push(null);
            continue;
          }
          // check cache
          const cacheKey = JSON.stringify({ timeperiod, query });
          if (this.queryCache[cacheKey] &&
            (params.cacheEmpty || !isEmpty(this.queryCache[cacheKey]))) {
            cacheResults.push(this.queryCache[cacheKey]);
          }
          else {
            cacheResults.push(null);
          }
        }
        // If all results were cached, return them
        if (cacheResults.every((r) => r !== null)) {
          if (params.verbose)
            console.debug(`Returning fully cached query results for ${params.name}`);
          return cacheResults;
        }
      }
      const timeperiodsNotCached = data.timeperiods.filter((_, i) => cacheResults[i] === null);
      // Otherwise, query with remaining timeperiods
      const queryResults = timeperiodsNotCached.length > 0
        ? yield this._post("/0/query/", Object.assign(Object.assign({}, data), { timeperiods: timeperiodsNotCached }))
        : [];
      if (params.cache) {
        if (params.verbose) {
          if (cacheResults.every((r) => r === null)) {
            console.debug(`Returning uncached query results for ${params.name}`);
          }
          else if (cacheResults.some((r) => r === null) &&
            cacheResults.some((r) => r !== null)) {
            console.debug(`Returning partially cached query results for ${params.name}`);
          }
        }
        // Cache results
        // NOTE: this also caches timeperiods that span the future,
        //       but this is ok since we check that when first checking the cache,
        //       and makes it easier to return all results from cache.
        for (const [i, result] of queryResults.entries()) {
          const cacheKey = JSON.stringify({
            timeperiod: timeperiodsNotCached[i],
            query,
          });
          this.queryCache[cacheKey] = result;
        }
        // Return all results from cache
        return data.timeperiods.map((tp) => {
          const cacheKey = JSON.stringify({
            timeperiod: tp,
            query,
          });
          return this.queryCache[cacheKey];
        });
      }
      else {
        return queryResults;
      }
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  send_heartbeat(bucketId, pulsetime, data) {
    return __awaiter(this, void 0, void 0, function* () {
      const url = "/0/buckets/" + bucketId + "/heartbeat?pulsetime=" + pulsetime;
      const heartbeat = yield this._post(url, data);
      heartbeat.timestamp = new Date(heartbeat.timestamp);
      return heartbeat;
    });
  }
  // Start heartbeat queue processing if not currently processing
  updateHeartbeatQueue(bucketId) {
    const queue = this.heartbeatQueues[bucketId];
    if (!queue.isProcessing && queue.data.length) {
      const { pulsetime, heartbeat, onSuccess, onError } = queue.data.shift();
      queue.isProcessing = true;
      this.send_heartbeat(bucketId, pulsetime, heartbeat)
        .then(() => {
          onSuccess();
          queue.isProcessing = false;
          this.updateHeartbeatQueue(bucketId);
        })
        .catch((err) => {
          onError(err);
          queue.isProcessing = false;
          this.updateHeartbeatQueue(bucketId);
        });
    }
  }
  // Get all settings
  get_settings() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this._get("/0/settings");
    });
  }
  // Get a setting
  get_setting(key) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this._get("/0/settings/" + key);
    });
  }
  // Set a setting
  set_setting(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._post("/0/settings/" + key, value);
    });
  }
}
export { AWClient };
//# sourceMappingURL=aw-client.js.map
