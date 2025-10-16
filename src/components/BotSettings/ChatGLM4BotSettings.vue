<template>

  <div>
     <v-list-item
      > <v-list-item-title>{{ $t("chatGlm4.apiKey") }}</v-list-item-title
      > <v-text-field
        v-model="apiKey"
        :label="$t('chatGlm4.enterApiKey')"
        type="password"
        hide-details
        @update:model-value="saveApiKey"
      ></v-text-field
      > </v-list-item
    > <v-list-item
      > <v-list-item-title>{{ $t("chatGlm4.getApiKey") }}</v-list-item-title
      > <v-btn
        :href="'https://open.bigmodel.cn/'"
        target="_blank"
        color="primary"
        variant="outlined"
        > {{ $t("chatGlm4.goToBigModel") }} </v-btn
      > </v-list-item
    >
  </div>

</template>

<script>
import Bot from "@/bots/zhipu/ChatGLM4Bot_Fixed";
import { mapMutations } from "vuex";

export default {
  components: {},
  data() {
    return {
      bot: Bot.getInstance(),
      apiKey: "",
    };
  },
  mounted() {
    this.apiKey = this.$store.state.chatGlm4?.api_key || "";
  },
  methods: {
    ...mapMutations(["setChatGLM4"]),
    saveApiKey(apiKey) {
      this.setChatGLM4({ api_key: apiKey });
    },
  },
};
</script>

