var ListAvailableServices = ListAvailableServices || {};

// new game (run service) fialog
ListAvailableServices.runServiceDialog;
// additional info about service dialog
ListAvailableServices.additionalInfoDialog;
// quill html editor container
ListAvailableServices.quill;

ListAvailableServices.init = function () {
    // init run service dialog
    $("#runServiceDialogForm").dialog({
        autoOpen: false,
        height: 280,
        width: 350,
        modal: true,
        close: function () {

        },
    }).prev(".ui-dialog-titlebar").css("background", "#28a745").css("color", "white");
    ListAvailableServices.runServiceDialog = $("#runServiceDialogForm");

    $("#runServiceDialogForm").submit(function (e) {
        ListAvailableServices.runServiceDialog.dialog("close");
    });

    // detect speed up change, to recompute estimated duration
    $("#speedUpDialog").on('change keydown paste input', function () {
        ListAvailableServices.evalDuration();
    });

    // init additional info dialog
    ListAvailableServices.additionalInfoDialog = $("#additionalInfoForm").dialog({
        autoOpen: false,
        height: 500,
        width: 700,
        modal: true,
        close: function () {
        },
    });

    // set turn based as a default
    ListAvailableServices.setTurnBased(true);

    // compute estimated duration
    ListAvailableServices.evalDuration();

    // init quill container
    ListAvailableServices.quill = new Quill('#quillContainer', {
        readOnly: true,
    });
}

// if "value" == true, show turn based, else show time based
ListAvailableServices.setTurnBased = function (value) {
    var visibilityOfSpeedFields = 'visible';
    if (value == true) {
        visibilityOfSpeedFields = 'hidden';
        document.getElementById("speedUpDialog").value = 1;
    }
    [].forEach.call(document.getElementsByClassName("speed"), function (el) {
        el.style.visibility = visibilityOfSpeedFields;
    });
}

// switch between time or turn based service clicked
ListAvailableServices.timeToTurnBasedSwitched = function (el) {
    if (el.classList.contains("off") == true) {
        // turn based
        ListAvailableServices.setTurnBased(true);
    } else {
        // time based
        ListAvailableServices.setTurnBased(false);
    }
    ListAvailableServices.evalDuration();
}

// if there are some additional info show quil container in dialog
ListAvailableServices.openAdditionalInfoDialog = function (el) {
    var info;
    try {
        var info = JSON.parse(el.getElementsByClassName("additionalInfo")[0].innerHTML);
        ListAvailableServices.quill.setContents(info.ops);
        document.getElementById("quillContainer").style = "display: block;"
    } catch (e) {
        document.getElementById("quillContainer").style = "display: none;"
    }
    ListAvailableServices.additionalInfoDialog.dialog("open");
}

// opens dialog for selecting turn or time based service run
ListAvailableServices.openRunServiceDialog = function (el) {
    document.getElementById("estimatedDurationDialog").innerHTML = "Estimated duration about&nbsp;"
        + el.getElementsByClassName("estimatedDuration")[0].innerHTML + "&nbsp;hours";

    document.getElementById("speedUpDialog").value = 1;
    document.getElementById("speedUpDialog").setAttribute("max", el.getElementsByClassName("maxSpeedUp")[0].innerHTML);
    document.getElementById("estimatedDurationNumber").innerHTML = el.getElementsByClassName("estimatedDuration")[0].innerHTML;
    document.getElementById("service_id").value = el.getElementsByClassName("serviceId")[0].innerHTML;
    ListAvailableServices.runServiceDialog.dialog("open");
}

// evaluate estimated time to service run duration 
ListAvailableServices.evalDuration = function () {
    var estimatedDurationInSeconds = parseInt(document.getElementById("estimatedDurationNumber").innerHTML) / parseInt(document.getElementById("speedUpDialog").value) * 3600;
    document.getElementById("estimatedDurationDialog").innerHTML = "Estimated duration: " + Utils.getFormatedTime(estimatedDurationInSeconds);
}