var vm = new Vue({
  el: "#app",
  data: {
    datasets: [],
    orgs: [],
    orgList: [],
  },
  computed: {
    sorted_orgs() {
      return this.orgs.sort((a, b) => { return b.datasets.length - a.datasets.length;});
    }
  },
  mounted: function() {
    var vm = this;
    // var datasetsURL = 'https://github.com/centraldedados/dadosgov-datasets/raw/master/data/datasets.json';
    var datasetsURL = '/datasets.json';

    axios
      .get(datasetsURL)
      .then(function(response) {
        console.log(response.data[0]);
        vm.datasets = response.data;
        for (var idx in vm.datasets) {
          var dataset = vm.datasets[idx];
          var org = dataset.organization;

          if (!org) {
            console.log('Orphan dataset');
            console.log(dataset.title);
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
        console.log(vm.orgs);
      })
      .catch(error => {
        console.log(error);
        vm.errored = true;
      });
  },

})
