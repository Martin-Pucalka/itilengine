var ListCreatedServices = ListCreatedServices || {};

// create new service dialog
ListCreatedServices.newServiceDialog;

ListCreatedServices.init = function () {
    // init new service dialog
    $("#newServiceDialogForm").dialog({
        autoOpen: false,
        height: 180,
        width: 400,
        modal: true,
        close: function () {
        },
    }).prev(".ui-dialog-titlebar").css("background", "#28a745").css("color", "white");

    ListCreatedServices.newServiceDialog = $("#newServiceDialogForm");

    $("#newServiceDialogForm").submit(function (e) {
        ListCreatedServices.newServiceDialog.dialog("close");
    });
}
