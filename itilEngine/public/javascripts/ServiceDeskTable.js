var ServiceDeskTable = ServiceDeskTable || {};

// dialog for ticket
ServiceDeskTable.ticketDialog;

ServiceDeskTable.init = function () {
    ServiceDeskTable.ticketDialog = $("#ticketDialogForm").dialog({
        autoOpen: false,
        height: 500,
        width: 700,
        modal: true,
        close: function () {
        },
    });
}

// change status of ticket to solved
ServiceDeskTable.solvedTicket = function (solvedTicket) {
    // set status
    document.getElementById(solvedTicket._id).getElementsByClassName("status")[0].innerHTML = "solved";
    // change btn type
    document.getElementById(solvedTicket._id).getElementsByClassName("status")[0].classList.remove("btn-warning");
    document.getElementById(solvedTicket._id).getElementsByClassName("status")[0].classList.add("btn-primary");
    // mark selected solion
    document.getElementById(solvedTicket._id).getElementsByClassName("selectedSolution")[0].innerHTML = solvedTicket.selectedSolution;
    // set solution datetime
    document.getElementById(solvedTicket._id).getElementsByClassName("solved")[0].innerHTML = moment(solvedTicket.solved, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ss');
}

// add new ticket to service desk
ServiceDeskTable.addNewTicket = function (newTicket) {
    // create new ticket row to table clonning of existing one
    var newTicketRow = document.getElementById("ticketRow").cloneNode(true);

    // fill the row with actual data
    newTicketRow.id = newTicket.ticketId;
    newTicketRow.getElementsByClassName("created")[0].innerHTML = newTicket.created;
    newTicketRow.getElementsByClassName("type")[0].innerHTML = newTicket.ticket.type;
    newTicketRow.getElementsByClassName("subject")[0].innerHTML = newTicket.ticket.subject;
    newTicketRow.getElementsByClassName("priority")[0].innerHTML = newTicket.ticket.priority;
    newTicketRow.getElementsByClassName("status")[0].innerHTML = newTicket.status;
    newTicketRow.getElementsByClassName("description")[0].innerHTML = newTicket.ticket.description;
    newTicketRow.getElementsByClassName("game_id")[0].innerHTML = newTicket.gameId;
    newTicketRow.getElementsByClassName("serviceLabel")[0].innerHTML = newTicket.serviceLabel;
    newTicketRow.getElementsByClassName("gameVersion")[0].innerHTML = newTicket.gameVersion;
    if(newTicket.ticket.isBlocking){
        newTicketRow.getElementsByClassName("isBlocking")[0].innerHTML = "!";
        newTicketRow.getElementsByClassName("isBlocking")[0].setAttribute("title", "Solve this ticket to continue in game.");
    }

    // add data for each solution of ticket
    newTicket.solutions.forEach(sol => {
        var div = document.createElement("DIV");
        var btn = document.createElement("BUTTON");
        btn.className += " btn btn-default";
        btn.type = "button";
        btn.id = sol._id;
        var t = document.createTextNode(sol.description);
        btn.appendChild(t);
        div.appendChild(btn);
        newTicketRow.getElementsByClassName("solutions")[0].appendChild(div);
    });

    // newTicketRow.getElementsByClassName("status")[0].style.width = "60%";
    newTicketRow.getElementsByClassName("status")[0].classList.add("btn");
    newTicketRow.getElementsByClassName("status")[0].classList.add("btn-xs");
    newTicketRow.getElementsByClassName("status")[0].classList.add("btn-warning");

    // insert row to table of tickets
    document.getElementById("ticketTableBody").prepend(newTicketRow);

    newTicketRow.style = "";
}

// fill ticket dialog with actual data and show dialog
ServiceDeskTable.showTicketDialog = function (ticketRow) {
    // fill with data from selected row in table
    document.getElementById("type").innerHTML = ticketRow.getElementsByClassName("type")[0].innerHTML;
    document.getElementById("serviceLabel").innerHTML = ticketRow.getElementsByClassName("serviceLabel")[0].innerHTML;
    document.getElementById("gameVersion").innerHTML = ticketRow.getElementsByClassName("gameVersion")[0].innerHTML;
    document.getElementById("subject").innerHTML = "<b>" + ticketRow.getElementsByClassName("subject")[0].innerHTML + "</b>";
    document.getElementById("ticketDescription").innerHTML = "<b>Description:</b><br>" + ticketRow.getElementsByClassName("description")[0].innerHTML;
    document.getElementById("priority").innerHTML = "<b>Priority:</b> " + ticketRow.getElementsByClassName("priority")[0].innerHTML;
    document.getElementById("solutions").innerHTML = ticketRow.getElementsByClassName("solutions")[0].innerHTML;
    document.getElementById("created").innerHTML = "<b>Opened:</b> " + ticketRow.getElementsByClassName("created")[0].innerHTML;
    // add solutions
    if (ticketRow.getElementsByClassName("status")[0].innerHTML == "solved") { // ticket is solved
        // get solution
        var selectedSolution = ticketRow.getElementsByClassName("selectedSolution")[0].innerHTML;
        // set solution date
        document.getElementById("solved").innerHTML = "<b>Solved:</b> " + ticketRow.getElementsByClassName("solved")[0].innerHTML;
        // and disable further selection disabling buttons
        Array.from(document.getElementById("solutions").childNodes).forEach(btn => {
            var btnEl = btn.childNodes[0];
            btnEl.disabled = true;
            btnEl.style.width = "100%";
            btnEl.style.textAlign = "left";
            if (btnEl.id == selectedSolution) { // mark seleceted solution
                btnEl.className += " btn-primary ";
            }
        })
    } else { // ticket is open
        document.getElementById("solved").innerHTML = "";
        Array.from(document.getElementById("solutions").childNodes).forEach(btn => {
            var btnEl = Array.from(btn.childNodes)[0];
            btnEl.style.width = "100%";
            btnEl.style.textAlign = "left";
            btnEl.addEventListener('click', function () { // add event listener, to react on user's solution selection
                ServiceDeskTable.solveTicket(btn.childNodes[0].id);
            });
        })
    }
    // set ticket and game id
    document.getElementById("ticket_id").innerHTML = ticketRow.id;
    document.getElementById("game_id").innerHTML = ticketRow.getElementsByClassName("game_id")[0].innerHTML;

    ServiceDeskTable.ticketDialog.dialog("open"); // show ticket dialog
}

// solve ticket and close ticket dialog
ServiceDeskTable.solveTicket = function (solutionId) {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("PUT", "/player/games/tickets/" + document.getElementById("ticket_id").innerHTML);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // do nothig. Ticket dialog is closed without wainting for response and result
            // of solving ticket is handled by sicket io event solvedTticket
        }
    }
    xmlhttp.send(JSON.stringify({
        gameId: document.getElementById("game_id").innerHTML,
        solutionId: solutionId,
    }));
    ServiceDeskTable.ticketDialog.dialog("close");
}