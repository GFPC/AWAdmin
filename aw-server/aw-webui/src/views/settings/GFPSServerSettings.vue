<template lang="pug">
  div
    h4.mb-3 GFPS Server Settings
    //b-alert(show) #[b Note:] These settings are meant for GFPS Server

    b-form-group(label="GFPS Server Address" label-cols-md=3 description="The address of the GFPS Server.")
      div
        div.d-inline-flex.mb-3
          span IP
        div.d-inline-flex
          b-input.float-right.ml-4(v-model="gfpsServerIP" type="text", placeholder="127.0.0.1")
      div.d-inline-flex.mb-1
        div.d-inline-flex
          span Port
        div.d-inline-flex
          b-input.float-right.ml-4(v-model="gfpsServerPort" type="number", placeholder="8080")
    b-alert(show) #[b Note:] Save your changes before testing.
    div.row

      div.col-sm-10
        b-btn(@click="this.testConnection", variant="success" :disabled="!this.settingsStore.gfpsServerIP || !this.settingsStore.gfpsServerPort")
          | Test Connection
        div.d-inline-flex.col-sm-10(v-if="this.connection == 'Not tested' || this.connection == 'Testing...'")
          span.ml-3.border-info {{this.connection}}
        div.d-inline-flex.col-sm-10.green.text-info(v-if="this.connection == 'Success'")
          span.ml-3.border-info.font-weight-bold {{this.connection}}
        div.d-inline-flex.col-sm-10.green.text-danger(v-if="this.connection == 'Failed'")
          span.ml-3.border-info.font-weight-bold {{this.connection}}
    div.row
      div.col-sm-12
        b-btn.float-right(@click="this.saveClasses", variant="success" :disabled="!this.unsavedChanges")
          | Save
</template>

<script lang="ts">
import { useSettingsStore } from '~/stores/settings';
import { getClient } from "@/util/awclient.ts";

export default {
  data() {
    return {
      gfpsEnabled: false,
      gfpsServerIP: '',
      gfpsServerPort: '',
      settingsStore: useSettingsStore(),
      unsavedChanges: false,
      connection: 'Not tested'
    };
  },
  computed: {
  },
  watch: {
    gfpsServerIP: function (value) {
      this.unsavedChangesListener()
    },
    gfpsServerPort: function (value) {
      this.unsavedChangesListener()
    },
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      const settingsStore = useSettingsStore();
      this.gfpsServerIP = settingsStore.gfpsServerIP;
      this.gfpsServerPort = settingsStore.gfpsServerPort;
    },
    async saveClasses() {
      await this.settingsStore.update({
        gfpsServerIP: this.gfpsServerIP,
        gfpsServerPort: this.gfpsServerPort,
      })
      this.unsavedChanges = false
    },
    unsavedChangesListener() {
      if (
          this.gfpsServerIP !== this.settingsStore.gfpsServerIP ||
          this.gfpsServerPort !== this.settingsStore.gfpsServerPort
      ) {
        this.unsavedChanges = true;
      } else {
        this.unsavedChanges = false;
      }
    },
    async testConnection() {
      const client = getClient();

      this.connection = 'Testing...';
      await client.req
          .get('/0/gfps/status' )
          .then(response => {
            if(response.data.status === 'ok') {
              this.connection = 'Success'
            } else {
              this.connection = 'Failed'
            }
      });
    },
  },
};
</script>
