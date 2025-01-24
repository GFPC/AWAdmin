<template lang="pug">
  div
    h4.mb-3 Users
    div.alert.alert-danger(v-if="!settingsStore.gfpsServerIP || !settingsStore.gfpsServerPort")
      | GFPS Server IP or Port is not configured.
    div(v-if="settingsStore && settingsStore.gfpsServerIP && settingsStore.gfpsServerPort")
      template(v-if="!users || users.length === 0")
        div No users found.
      template(v-else)
        b-table(striped hover,
          :items="users"
          :fields="[{key: 'id', label: 'ID'}, {key: 'username', label: 'Name'}, {key: 'created', label: 'Created'}]"
          responsive="md"
          :clickable-rows="true"
          @row-clicked="handleRowClick($event)"
        )

    b-modal(id="manage-modal" ref="manage-modal")
      template(#modal-title)
        | Manage User
      div(v-if="modalData")
        b-input-group.align-items-center.mb-2
          span.mr-2.col-sm-3
            | Username
          b-form-input(v-model="modalData.username" readonly )
          b-button(style="cursor: pointer; padding: 8px; margin-left: 8px; border-radius: 5px",  @click="copyToClipboard(modalData.username); $bvToast.show('copy-toast-username')")
            icon(name="copy")
          b-toast(
            id="copy-toast-username"
            :visible="false"
            auto-hide-delay="2000"
            :variant="'success'"
            )
            | Username copied to clipboard

        b-input-group.align-items-center.mb-2
          span.mr-2.col-sm-3
            | Created
          b-form-input(v-model="modalData.created" readonly )
          b-button(style="cursor: pointer; padding: 8px; margin-left: 8px; border-radius: 5px", @click="copyToClipboard(modalData.created); $bvToast.show('copy-toast-created')")
            icon(name="copy")
          b-toast(
            id="copy-toast-created"
            :visible="false"
            auto-hide-delay="2000"
            :variant="'success'"
          )
            | Create date copied to clipboard

        b-card-group.mb-2(header="Buckets")
          b-card(header="Buckets")
            template(v-if="usersBuckets.filter(b => b.user == modalData.id).length === 0")
              div No buckets
            template(v-else)
              b-table(:items="usersBuckets.filter(b => b.user == modalData.id)", :fields="[{key: 'type', label: 'Type'}, {key: 'created', label: 'Created'}, {key: 'estimated_size', label: 'Estimated Size'}]")
                template(#bottom-row v-if="usersBuckets.filter(b => b.user == modalData.id).length > 0")
                  b-tr
                    b-th
                      | Total buckets: {{usersBuckets.filter(b => b.user == modalData.id).length}}
                  b-tr
                    b-th
                      | Total size: {{ (usersBuckets.filter(b => b.user == modalData.id).map(b => { if(b.estimated_size.split(' ')[1] == 'KB') {return b.estimated_size.split(' ')[0]*1} else if(b.estimated_size.split(' ')[1] == 'MB') {return b.estimated_size.split(' ')[0] * 1024} } ).reduce((a, b) => a + b, 0) / 1024).toFixed(2) }}
                      | MB
              div(v-if=" usersBuckets.filter(b => b.user == modalData.id).length > 0")
                b-btn(variant="danger", @click="$bvModal.show('delete-buckets-modal')") Delete Buckets
                b-modal(id="delete-buckets-modal", title="Danger!", centered, hide-footer v-if="modalData",ref="delete-buckets-modal")
                  | Are you sure you want to delete all buckets for user "{{modalData.username}}"?
                  br
                  br
                  b-btn(variant="danger", @click="deleteBuckets(); $bvToast.show('delete-buckets-toast')") Delete
        b-toast(
          id="delete-buckets-toast",
          :visible="false",
          auto-hide-delay="2000",
          :variant="'success'")
          | Buckets for user "{{modalData.username}}" deleted
      div
      template(#modal-footer)
        b-btn(variant="primary", @click="$bvModal.hide('manage-modal')") Close

</template>

<script lang="ts">
import _ from 'lodash';
import 'vue-awesome/icons/search';
import 'vue-awesome/icons/spinner';
import 'vue-awesome/icons/angle-double-down';
import 'vue-awesome/icons/angle-double-up';
import 'vue-awesome/icons/copy';
import { useSettingsStore } from '~/stores/settings';
import { getClient } from '~/util/awclient';
import moment from 'moment';
import objectContaining = jasmine.objectContaining;
export default {
  name: 'Users',
  computed: {},
  data() {
    return {
      settingsStore: useSettingsStore(),
      users: [],
      modalData: null,
      usersBuckets: null,
    };
  },
  methods: {
    async init() {
      const client = getClient();
      await client.req.get('/0/gfps/users').then( response => {
        var newUsers = []
        if(!response.data.error) {
          for(const user of response.data) {
            newUsers.push({
              id: user.id,
              username: user.username,
              created: moment(user.created).format('YYYY-MM-DD HH:mm:ssZ')
            })
          }
        }
        this.users = newUsers
      })
      await client.req.post('/0/buckets/',{user: 'all'}).then( response => {
        const buckets = Object.values(response.data) as {type: string, created: string, estimated_size: number, user: string, hash_key: string}[]
        var newBuckets = []
        for(const bucket of buckets) {
          newBuckets.push({
            type: bucket.type,
            created: moment(bucket.created).format('YYYY-MM-DD HH:mm:ssZ'),
            estimated_size: (bucket.estimated_size / 1024) > 1000 ? `${(bucket.estimated_size / 1024 / 1024).toFixed(2)} MB` : `${(bucket.estimated_size / 1024).toFixed(2)} KB`,
            user: bucket.user,
            hash_key: bucket.hash_key
          })
        }
        this.usersBuckets = newBuckets
      })
    },
    async handleRowClick(user) {
      this.$refs['manage-modal'].show();
      this.modalData = user;
    },
    async copyToClipboard(text) {
      await navigator.clipboard.writeText(text);
    },
    async deleteBuckets() {
      var buckets_hash_keys = this.usersBuckets.filter(b => b.user == this.modalData.id).map(b => b.hash_key)
      for (const hash_key of buckets_hash_keys) {
        await getClient().req.delete(`/0/buckets/${hash_key}?force=1`)
      }
      this.$refs['delete-buckets-modal'].hide();
    }
  },
  mounted: async function () {
    await this.init();
  },
};
</script>
