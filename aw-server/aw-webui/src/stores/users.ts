import { defineStore } from 'pinia';
import moment, { Moment } from 'moment';
import { getClient } from '~/util/awclient';
import { Category, defaultCategories, cleanCategory } from '~/util/classes';
import { View, defaultViews } from '~/stores/views';
import { isEqual } from 'lodash';
import {useBucketsStore} from "@/stores/buckets.ts";

interface State {
  _loaded: boolean;
  currentUserID: number;
  users: any[];
}

export const useUsersStore = defineStore('users', {
  state: (): State => ({

    _loaded: false,

    currentUserID: -1,

    users: [],
  }),

  getters: {
    loaded(state: State) {
      return state._loaded;
    },
  },

  actions: {
    async ensureLoaded() {
      if (!this.loaded) {
        await this.load();
      }
    },
    async load() {
      const client = getClient();
      const response = await client.req.get('/0/gfps/users')

      this.users = response.data.error ? [] : response.data;
      if (this.users.length > 0) {
        this.currentUserID = this.users[0]?.id;
      }
      this._loaded = true;
    },
  },
});
