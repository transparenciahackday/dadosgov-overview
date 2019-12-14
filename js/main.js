var vm = new Vue({
  el: "#app",
  data: {
    datasets: [],
    orgs: [],
    orphans: [],
    orgList: [],
  },
  computed: {
    sorted_orgs() {
      return this.orgs.sort((a, b) => { return b.datasets.length - a.datasets.length;});
    },
  },
  mounted: function() {
    var vm = this;
    // var datasetsURL = 'https://github.com/centraldedados/dadosgov-datasets/raw/master/data/datasets.json';
    var datasetsURL = '/datasets.json';

    
    axios
      .get(datasetsURL)
      .then(function(response) {
        vm.datasets = response.data;
        for (var idx in vm.datasets) {
          var dataset = vm.datasets[idx];
          var org = dataset.organization;
          dataset.unavailable = !isDatasetAvailable(dataset);

          moment.locale('pt');
          dataset.human_last_modified = moment(dataset.last_modified).fromNow();
          dataset.human_last_update = moment(dataset.last_update).fromNow();

          if (!org) {
            vm.orphans.push(dataset);
          } else {
            if (vm.orgList.indexOf(org.acronym) == -1) {
              org.datasets = [];
              org.datasets.push(dataset);
              vm.orgs.push(org);
              vm.orgList.push(org.acronym);
            } else {
              var o = vm.orgs.filter(function(v){ return v.acronym === org.acronym})[0];
              o.datasets.push(dataset);
            }
          }
        }
        // console.log(vm.orgs);
      })
      .catch(error => {
        console.log(error);
        vm.errored = true;
      });
  },

})

function isDatasetAvailable(dataset) {
  for (var r in dataset.resources) {
    res = dataset.resources[r];
    if (res.extras && res.extras['check:available'] === true) {
      return true;
    }
  }
  return false;
  // if (dataset.resources.filter(res => res.extras['check:available'] == false).length) {
}
