var router = new VueRouter({
    mode: 'history',
    routes: []
});
var app = new Vue({
  router,
  el: '#app',
  mounted: function() {
    q = this.$route.query.thing //TODO assign to state.thing, probably this.data.thing?
    console.log(q)
  },
  data: {
    thing: "ESP-9286500",
    senses: {},
    desired: {},
    displayablesConfig: {
      'A0': {
        graph: true,
        type: 'percent',
      },
      'time': {}
    }
  }
})

