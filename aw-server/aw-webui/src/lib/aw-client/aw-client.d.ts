/// <reference types="node" />
import { AxiosInstance } from "axios";
type EventData = {
  [k: string]: string | number;
};
type JSONable = object | string | number | boolean;
export interface IEvent {
  id?: number;
  timestamp: Date;
  duration?: number;
  data: EventData;
}
export interface IAppEditorEvent extends IEvent {
  data: EventData & {
    project: string;
    file: string;
    language: string;
  };
}
export interface AWReqOptions {
  controller?: AbortController;
  testing?: boolean;
  baseURL?: string;
  timeout?: number;
}
export interface IBucket {
  id: string;
  name: string;
  type: string;
  client: string;
  hostname: string;
  created: Date;
  last_update?: Date;
  data: Record<string, unknown>;
}
interface IInfo {
  hostname: string;
  version: string;
  testing: boolean;
}
interface GetEventsOptions {
  start?: Date;
  end?: Date;
  limit?: number;
}
export declare class AWClient {
  clientname: string;
  baseURL: string;
  testing: boolean;
  req: AxiosInstance;
  controller: AbortController;
  private queryCache;
  private heartbeatQueues;
  constructor(clientname: string, options?: AWReqOptions);
  private _get;
  private _post;
  private _delete;
  getInfo(): Promise<IInfo>;
  abort(msg?: string): Promise<void>;
  ensureBucket(bucketId: string, type: string, hostname: string): Promise<{
    alreadyExist: boolean;
  }>;
  createBucket(bucketId: string, type: string, hostname: string): Promise<undefined>;
  deleteBucket(bucketId: string): Promise<undefined>;
  getBuckets(user?: string): Promise<{
    [bucketId: string]: IBucket;
  }>;
  getBucketInfo(bucketId: string): Promise<IBucket>;
  getEvent(bucketId: string, eventId: number): Promise<IEvent>;
  getEvents(bucketId: string, params?: GetEventsOptions): Promise<IEvent[]>;
  countEvents(bucketId: string, startTime?: Date, endTime?: Date): Promise<any>;
  insertEvent(bucketId: string, event: IEvent): Promise<void>;
  insertEvents(bucketId: string, events: IEvent[]): Promise<void>;
  replaceEvent(bucketId: string, event: IEvent): Promise<void>;
  replaceEvents(bucketId: string, events: IEvent[]): Promise<void>;
  deleteEvent(bucketId: string, eventId: number): Promise<void>;
  /**
   *
   * @param bucketId The id of the bucket to send the heartbeat to
   * @param pulsetime The maximum amount of time in seconds since the last heartbeat to be merged
   *                  with the previous heartbeat in aw-server
   * @param heartbeat The actual heartbeat event
   */
  heartbeat(bucketId: string, pulsetime: number, heartbeat: IEvent): Promise<void>;
  /**
   * Queries the aw-server for data
   *
   * If cache is enabled, for each {query, timeperiod} it will return cached data if available,
   * if a timeperiod spans the future it will not cache it.
   */
  query(timeperiods: (string | {
    start: Date;
    end: Date;
  })[], query: string[], params?: {
    cache?: boolean;
    cacheEmpty?: boolean;
    verbose?: boolean;
    name?: string;
  }): Promise<any[]>;
  private send_heartbeat;
  private updateHeartbeatQueue;
  get_settings(): Promise<object>;
  get_setting(key: string): Promise<JSONable>;
  set_setting(key: string, value: JSONable): Promise<void>;
}
export {};
