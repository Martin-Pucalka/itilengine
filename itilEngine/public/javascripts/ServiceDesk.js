var ServiceDesk = ServiceDesk || {};

ServiceDesk.init = function () {
    // init socket.io
    var socket = io();

    // emit user conneced event, with param of current user
    socket.emit("userConnected", user);

    // reaction when new ticket created
    socket.on('newTicket', function (newTicket) {
        ServiceDeskTable.addNewTicket(newTicket);
    });

    // reaction when ticket solved
    socket.on('solvedTticket', function (msg) {
        ServiceDeskTable.solvedTicket(msg.ticket);
    });

    // Query datatable init (service desk table)
    $('#ticketTable').DataTable(
        {
            "oLanguage": {
                "sEmptyTable": '',
                "sInfoEmpty": ''
            },
            "bInfo": false,
            "order": [[3, "desc"]]
        }
    );
}