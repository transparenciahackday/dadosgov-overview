// Vue.http.options.emulateJSON = true;

var vm = new Vue({
  el: "#chat",
  name: "chat",
  delimiters: ["${", "}"],
  data: {
    messages: [],
    investigationLogo: "",
    investigationTitle: "",
    formschema: "",
    uischema: "",
    instanceId: null,
    fields: [],
    fieldIndex: -1,
    formData: new FormData(),
    loading: true,
    errored: false,
    errorMessage: "Sample error message",
    submitURL: ""
  },
  mounted: function() {
    console.log("mounted");

    var uri = window.location.search.substring(1);
    var params = new URLSearchParams(uri);
    var investigation = params.get("investigation");
    var interviewer = params.get("interviewer");

    var useStaging = false;
    var backendURL;
    if (window.location.href.indexOf("localhost") > -1 && !useStaging) {
      console.log("Running on localhost");
      backendURL = "http://localhost:8000";
      if (!investigation) {
        investigation = "food-investigation";
      }
      if (!interviewer) {
        interviewer = "banana-consumption";
      }
    } else if (
      window.location.href.indexOf("crowdnewsroom.org") > -1 ||
      useStaging
    ) {
      console.log("Running on staging");
      backendURL = "https://crowdnewsroom-staging.correctiv.org";
      if (!investigation) {
        investigation = "where-do-you-live-again";
      }
      if (!interviewer) {
        interviewer = "wo-stehst-du-bahn";
      }
    } else if (window.location.href.indexOf("crowdnewsroom.org") > -1) {
      console.log("Running on production");
      backendURL = "https://forms.crowdnewsroom.org";
    } else {
      console.log("Could not determine the backend URL!! Using staging.");
      backendURL = "https://crowdnewsroom-staging.correctiv.org";
      if (!investigation) {
        investigation = "where-do-you-live-again";
      }
      if (!interviewer) {
        interviewer = "wo-stehst-du-bahn";
      }
    }

    var investigationURL = 
      backendURL +
      "/forms/investigations/" +
      investigation;
    var formURL =
      investigationURL +
      "/forms/" +
      interviewer;
    this.submitURL = formURL + "/responses";

    var vm = this;

    axios
      .get(investigationURL)
      .then(function(response) {
        vm.investigationLogo = response.data.logo;
        vm.investigationTitle = response.data.name;
      })
      .catch(error => {
        console.log(error);
        vm.errored = true;
      });

    axios
      .get(formURL)
      .then(function(response) {
        vm.formschema = response.data.form_json;
        vm.uischema = response.data.ui_schema_json;
        vm.instanceId = response.data.id;
      })
      .catch(error => {
        console.log(error);
        vm.errored = true;
      })
      .finally(() => {
        vm.initChat();
      });


  },
  computed: {
    currentField: function() {
      if (!this.fields[this.fieldIndex]) {
        return null;
      }
      return this.fields[this.fieldIndex];
    },
    currentFieldWantsText: function() {
      if (this.currentField) {
        // returns true if the current field requires text input by user
        if (
          ["", "email", "number", "longtext"].includes(this.currentField.widget)
        ) {
          return true;
        }
        return false;
      }
    }
  },
  methods: {
    initChat: function() {
      // called when all form data (form + ui) has been loaded

      for (var idx in this.formschema) {
        var slide = this.formschema[idx];
        // to get the proper field ordering, we have to get it from
        // the UIschema
        var fieldOrdering = this.uischema[slide.schema.slug]["ui:order"];
        for (var i in fieldOrdering) {
          var field = slide.schema.properties[fieldOrdering[i]];
          field.slideSlug = slide.schema.slug;
          if (this.uischema[field.slideSlug][field.slug]) {
            field.ui = this.uischema[field.slideSlug][field.slug];
          }
          var widgetType = this.getFieldType(field);
          if (widgetType == "text") {
            widgetType = "";
          }
          field.widget = widgetType;
          if (widgetType == "location") {
            if ("ui:location_button" in field.ui) {
              field.location_label = field.ui["ui:location_button"];
            } else {
              field.location_label = "Click here to send your location";
            }
            console.log();
            //console.log(this.uischema[slide.schema.slug][field.slug]['ui:location_button']);
          } else if (
            ["dropdown", "radio", "boolean", "checkboxes"].includes(widgetType)
          ) {
            field.answered = false;
          }
          if (
            "required" in slide.schema &&
            slide.schema.required.includes(field.slug)
          ) {
            field.required = true;
          }
          this.fields.push(field);
        }
      }
      this.loading = false;
      this.$refs.inputBox.focus();
      this.showNextField();
    },

    scrollChatArea: function() {
      // ensures chat area is always scrolled to bottom
      var options = {
        container: "#chat-content",
        duration: 500,
        easing: "ease",
        offset: 0,
        force: true,
        cancelable: true,
        onStart: false,
        onDone: false,
        onCancel: false,
        x: false,
        y: true
      };
      this.$scrollTo(this.$refs.skipButton, 100, options);
    },

    showNextField: function() {
      this.fieldIndex += 1;
      if (this.fields && this.fieldIndex > this.fields.length - 1) {
        // no more fields
        this.messages.push({
          from: "bot",
          content: "All done! Submit?",
          final: true
        });
      } else {
        // show next field
        var field = this.fields[this.fieldIndex];
        var question =
          "ui" in field && "ui:question" in field.ui
            ? field.ui["ui:question"]
            : field.title;
        this.messages.push({
          from: "bot",
          content: question ? question : field.title,
          field: field
        });

        if (["", "email", "number", "longtext"].includes(field.widget)) {
          var el = document.getElementById("input-box");
          this.$refs.inputBox.focus();
        }
        if (field.widget == "oneline") {
          this.showNextField();
        }
        this.scrollChatArea();
      }
    },
    skipQuestion: function() {
      this.showNextField();
    },

    submitForm: function(ev) {
      var button = ev.target;
      button.textContent = "Sending...";
      button.disabled = true;

      // first convert formData to JSON
      var data = {};
      data.form_instance = this.instanceId;
      data.json = {};

      this.formData.forEach((value, key) => {
        data.json[key] = value;
      });
      axios
        .post(this.submitURL, data)
        .then(function(response) {
          button.textContent = "Sent!";
          vm.messages.push({
            from: "bot",
            content: "Your responses were submitted. Thank you!"
          });
          vm.scrollChatArea();
        })
        .catch(error => {
          console.log(error);
          vm.errored = true;
        });
    },

    sendMessage: function(content, isImage) {
      var el = document.getElementById("input-box");
      var msg = el.value;
      if (content) {
        msg = content;
      } else {
        msg = el.value;
      }
      if (msg) {
        var msgobj = { from: "user", content: msg };
        if (isImage) {
          msgobj.type = 'image';
        }
        this.messages.push(msgobj);
        this.formData.set(this.currentField.slug, msg);
        // clear message box and return focus to it
        this.$refs.inputBox.value = "";
        this.$refs.inputBox.focus();
        this.scrollChatArea();

        for (var pair of this.formData.entries()) {
          console.log(pair[0] + ", " + pair[1]);
        }

        this.showNextField();
      }
    },
    sendOption: function(ev, field, value) {
      // for multiple-choice fields
      this.formData.set(field.slug, value);
      this.messages.push({
        from: "user",
        content: value
      });
      // mark selected option
      ev.target.className += " selected";
      // ensure we disable the buttons
      field.answered = true;
      this.showNextField();
    },
    setFile: function(ev, field) {
      // for file upload fields
      var file = ev.target.files[0];
      var fileData;
      var vm = this;
      // FileReader will convert the file to a base64 representation, as is
      // required by the CNR backend
      var reader = new FileReader();
      reader.addEventListener(
        "load",
        function() {
          fileData = reader.result;
          fileData = fileData.replace(
            ";base64",
            ";name=" + file.name + ";base64"
          );
          vm.formData.append(field.slug, fileData);
          // show user message with thumbnail
          vm.sendMessage(reader.result, isImage = true);
          // vm.showNextField();
        },
        false
      );
      // now read and save the uploaded file
      fileData = reader.readAsDataURL(file);
    },
    setLocation: function(ev, field) {
      var vm = this;
      var button = ev.target;
      button.className = "button loading";
      button.childNodes[2].textContent = field.ui["ui:location_load"];
      navigator.geolocation.getCurrentPosition(
        function(position) {
          var value =
            position.coords.latitude + "," + position.coords.longitude;
          vm.formData.append(field.slug, value);
          button.className = "button success";
          button.childNodes[2].textContent = field.ui["ui:location_success"];
          button.disabled = true;
          vm.showNextField();
        },
        function(error) {
          console.log(error);
          console.log(field);
          console.log(field.ui);

          button.className = "button alert";
          button.childNodes[2].textContent = field.ui["ui:location_error"];
          /*
          var errorMessage = error.message;
          if (error.message) {
            if (widget.props.options.location_help_url) {
              errorMessage +=
                '. <a href="' +
                widget.props.options.location_help_url +
                '" target="_blank">Click here to learn more.</a>';
            }
          }
          if (error.code === 1) {
            reason = "permission denied";
          } else if (error.code === 2) {
            reason = "position unavailable";
          } else if (error.code === 3) {
            reason = "timed out";
          } else {
            reason = "unknown reason";
          }
          reason = reason.charAt(0).toUpperCase() + reason.slice(1);
          console.log(error);
          widget.setState({
            errorMessage: "<strong>" + reason + "</strong>: " + errorMessage,
            label: widget.props.options.location_error,
            stateclass: "button alert"
          });
          */
        }
      );
    },

    getFieldType: function(field) {
      if (this.getFieldWidget(field) == "oneLineWidget") {
        return "oneline";
      }
      if (field.type == "boolean") {
        return "boolean";
      }
      if (field.type == "integer" || field.type == "number") {
        return "number";
      }
      if (field.type == "array") {
        return "checkboxes";
      }

      if (field.type == "string") {
        if (field.format == "email") {
          return "email";
        }
        if (field.format == "date") {
          return "date";
        }
        if (this.getFieldWidget(field) == "textarea") {
          return "longtext";
        }
        if (this.getFieldWidget(field) == "signatureWidget") {
          return "signature";
        }
        if (this.getFieldWidget(field) == "locationWidget") {
          return "location";
        }
        if (this.getFieldWidget(field) == "radio") {
          return "radio";
        }
        if (field.format == "data-url") {
          if (this.getFieldWidget(field) == "imageUpload") {
            return "imageupload";
          }
          return "fileupload";
        }
        if (field.enum && !this.getFieldWidget(field)) {
          return "dropdown";
        }
        return "text";
      }
      console.log("Unrecognized field");
      console.log(field);
      return "";
    },
    getFieldWidget: function(field) {
      // if a specific widget is specified in the UI Schema, return its name
      if (!(field.slideSlug in this.uischema)) {
        return null;
      }
      if (!(field.slug in this.uischema[field.slideSlug])) {
        return null;
      }
      if (!("ui:widget" in this.uischema[field.slideSlug][field.slug])) {
        return null;
      }
      return this.uischema[field.slideSlug][field.slug]["ui:widget"];
    }
  }
});
