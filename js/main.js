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

          moment.locale('pt');
          dataset.human_last_modified = moment(dataset.last_modified).fromNow();
          dataset.human_last_update = moment(dataset.last_update).fromNow();

          dataset.unavailable = !isDatasetAvailable(dataset);

          for (var ri in dataset.resources) {
            res = dataset.resources[ri];
            res.hasRelevantName = hasRelevantName(res, dataset);
            if (res.title == 'Json metainfo url') {
              res.format = 'metadata';
            }
          }

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
      })
      .catch(error => {
        console.log(error);
        vm.errored = true;
      });
  },
  methods: {
    sorted_datasets(org) {
      return org.datasets.sort((a, b) => (a.title < b.title) ? -1 : (a.title > b.title) ? 1 : 0);
    }
  }
})

function isDatasetAvailable(dataset) {
  for (var r in dataset.resources) {
    res = dataset.resources[r];
    if (res.extras && res.extras['check:available'] === false) {
      // one unavailable item, do nothing
    } else {
      // there is at least a single available item, so we should return true
      return true;
    }
  }
  return false;
  // if (dataset.resources.filter(res => res.extras['check:available'] == false).length) {
}

function hasRelevantName(res, dataset) {
  if (res.title.toLowerCase() == dataset.title.toLowerCase()) {
    return false;
  } else if (res.title.startsWith('Exportar para')) {
    return false;
  } else if (res.title.endsWith('.xml') || res.title.endsWith('.csv') || res.title.endsWith('.geojson') ||
             res.title.endsWith('.xls') || res.title.endsWith('.xlsx') || res.title.endsWith('.json')
  ) {
    return false;
  } else if (['Dataset json url', 'Json metainfo url', 'GeoJSON'].indexOf(res.title) > -1) {
    return false;
  }
  return true;
}
