<template lang="pug">
div
  h2 Timeline

  input-timeinterval(v-model="daterange", :defaultDuration="timeintervalDefaultDuration", :maxDuration="maxDuration").mb-3
  div
    label User:
    select(v-model="user").ml-2
      option(v-for="user in usersStore.users", :value="user", :label="user.username") {{ user.username }}
    template(v-if="user?.id==-1")
      div.mb-2
        span.text-danger
          | No user selected

  // blocks
  details.d-inline-block.bg-light.small.border.rounded.mr-2.px-2
    summary.p-2
      b Filters
    div.p-2.bg-light
      table
        tr
          th.pt-2.pr-3
            label Bucket:
          td
            select(v-model="filter_bucketname")
              option(:value='null') All
              option(v-for="bucket in all_buckets", :value="bucket.type") {{ bucket.type }}
  div.d-inline-block.border.rounded.p-2.mr-2(v-if="num_events !== 0")
    | Events shown: {{ num_events }}
  div.d-inline-block.border.rounded.p-2.mr-2(v-if="all_events_count - num_events !== 0")
    | Not shown events: {{ all_events_count - num_events }} {{typeof all_events_count === "number" && typeof num_events === "number" && all_events_count > 0 ? `(${((all_events_count - num_events) / all_events_count * 100).toFixed(2)}%)` : '' }}
  b-alert.d-inline-block.p-2.mb-0.mt-2(v-if="num_events === 0", variant="warning", show)
    | No events match selected criteria. Timeline is not updated.
  div.float-right.small.text-muted.pt-3
    | Drag to pan and scroll to zoom

  div(v-if="buckets !== null")
    div(style="clear: both")
    vis-timeline(:buckets="buckets", :showRowLabels='true', :queriedInterval="daterange")
  div(v-else)
    h1.aw-loading Loading...
</template>

<script lang="ts">
import _ from 'lodash';
import { useSettingsStore } from '~/stores/settings';
import { useBucketsStore } from '~/stores/buckets';
import { useUsersStore } from '~/stores/users.ts';
import { getClient } from '@/util/awclient.ts';

export default {
  name: 'Timeline',
  data() {
    return {
      all_buckets: null,
      buckets: null,
      daterange: null,
      maxDuration: 31 * 24 * 60 * 60,
      filter_username: useUsersStore().users[0]?.username || null,
      filter_bucketname: null,
      settingsStore: useSettingsStore(),
      usersStore: useUsersStore(),
      bucketsStore: useBucketsStore(),
      all_events_count: 0,
      user: useUsersStore().users[0] || {
        username: 'No user selected',
        id: -1,
        variant: 'danger',
      },
    };
  },
  computed: {
    timeintervalDefaultDuration() {
      const settingsStore = useSettingsStore();
      return Number(settingsStore.durationDefault);
    },
    // This does not match the chartData which is rendered in the timeline, as chartData excludes short events.
    num_events() {
      return _.sumBy(this.buckets, 'events.length');
    },
  },
  watch: {
    daterange() {
      this.getBuckets();
    },
    filter_bucketname() {
      this.getBuckets();
    },
    filter_username() {
      this.reloadBucketStore()
    },
    user: async function (_new_value, _old_value) {
      console.log('User changed', _new_value, _old_value);
      this.usersStore.currentUserID = this.user.id;
      this.bucketsStore.loaded = false;
      await this.bucketsStore.ensureLoaded();
      this.filter_username = this.user.username;
    },
  },
  methods: {
    reloadBucketStore: async function () {
      this.buckets = null;
      this.all_buckets = null;
      this.usersStore.currentUserID = this.usersStore.users.find(u => u.username == this.filter_username).id;
      useBucketsStore().loaded = false;
      useBucketsStore().loadBuckets(this.usersStore.currentUserID);
      this.getBuckets();
    },
    getBuckets: async function () {
      if (this.daterange == null) return;
      this.all_events_count = 0;
      this.all_buckets = Object.freeze(
        await useBucketsStore().getBucketsWithEvents({
          start: this.daterange[0].format(),
          end: this.daterange[1].format(),
        })
      );
      let buckets = this.all_buckets;
      if (this.filter_bucketname) {
        buckets = _.filter(buckets, b => b.type == this.filter_bucketname);
      }
      if (this.filter_username) {
        buckets = _.filter(
          buckets,
          b => b.user == this.usersStore.users.find((u: any) => u.username == this.filter_username).id
        );
      }
      for (const bucket of buckets) {
        this.all_events_count += bucket.events_count;
      }
      this.buckets = buckets;
    },
  },
};
</script>

<style scoped>
details {
  position: relative;
}

details[open] summary ~ * {
  visibility: visible;
  position: absolute;
  border: 1px solid #ddd;
  border-radius: 5px;
  left: 0;
  top: 2.7em;
  background: white;
  z-index: 100;
}
</style>
