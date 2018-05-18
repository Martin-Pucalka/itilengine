var GameDetail = GameDetail || {};

// game detail mxGraph
GameDetail.graph;
GameDetail.additionalInfoDialog;
// quill container for additional info
GameDetail.quill;
// service desk table
GameDetail.ticketTable
GameDetail.doc;

// game statistics
GameDetail.durationSeconds;
GameDetail.downtimeSeconds;
GameDetail.isDown;
GameDetail.numberOfServiceBreaks;
GameDetail.isFinished;
GameDetail.finished;
GameDetail.ticketReactionAvg;

GameDetail.main = function (container) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error('Browser is not supported!', 200, false);
    }
    else {
        // Disables the built-in context menu
        var keyHandler = new mxKeyHandler(this.graph);

        // Creates the graph inside the given container
        this.graph = new mxGraph(container);

        Utils.setGraphScrollable(container, this.graph);

        this.graph.setConnectable(false);
        this.graph.setCellsLocked(true);

        this.graph.isCellEditable = function (cell) {
            return false
        }

        this.doc = mxUtils.createXmlDocument();
        this.graph.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
            GameDetail.selectionChanged(this.graph);
        });

        this.graph.getSelectionModel().setSingleSelection(true);
        GameDetail.selectionChanged(this.graph);


        // set style of CIs
        var style = this.graph.getStylesheet().getDefaultVertexStyle();
        style[mxConstants.STYLE_STROKECOLOR] = 'gray';
        style[mxConstants.STYLE_ROUNDED] = true;
        style[mxConstants.STYLE_SHADOW] = true;
        style[mxConstants.STYLE_FILLCOLOR] = '#F9F9F9';
        style[mxConstants.STYLE_GRADIENTCOLOR] = 'white';
        style[mxConstants.STYLE_FONTCOLOR] = 'black';
        style[mxConstants.STYLE_FONTSIZE] = '12';
        style[mxConstants.STYLE_SPACING] = 4;

        // set style of edges between CIs
        style = this.graph.getStylesheet().getDefaultEdgeStyle();
        style[mxConstants.STYLE_STROKECOLOR] = '#8D8D8D';
        style[mxConstants.STYLE_FONTCOLOR] = 'black';
        style[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = '#eee';
        style[mxConstants.STYLE_FONTSIZE] = '10';

        //Overrides method to provide a cell label in the display
        GameDetail.graph.convertValueToString = GameDetail.showValueOfCi;
    }
}

GameDetail.init = function () {
    // init socket.io
    var socket = io();
    // emit user connected with parameter of current user
    socket.emit("userConnected", user);

    // update attributes values event
    socket.on('attributeValues', function (attributeValues) {
        attributeValues.forEach(av => {
            document.getElementById(av.attribute).getElementsByClassName("value")[0].innerHTML = av.value;
        })
    });

    // end of game event
    socket.on('end', function (gameId) {
        if (gameId != game._id) {
            return;
        }
        GameDetail.finished = new moment();
        GameDetail.isFinished = true;
        GameDetail.isRunningSwitch(false);
        GameDetail.serviceDownAlert();
    });

    // new ticket created event
    socket.on('newTicket', function (gameInfo) {
        // if new ticket belongs to current game
        if (gameInfo.gameId == game._id) {
            // put ticket to service desk
            ServiceDeskTable.addNewTicket(gameInfo);
            // and uprade game stats
            GameDetail.isDown = gameInfo.isDown;
            GameDetail.serviceDownAlert();
            GameDetail.numberOfServiceBreaks = gameInfo.numberOfServiceBreaks;
            if (game.isTimeBased == true) {
                GameDetail.updateStatsTime();
            } else {
                GameDetail.updateStatsTurn();
            }
        }
    });

    // ticket solved event
    socket.on('solvedTticket', function (gameInfo) {
        // update ticket info
        ServiceDeskTable.solvedTicket(gameInfo.ticket);
        // enable next turn, if solved ticket was blocking
        if (gameInfo.ticket.state.isBlocking == true) {
            document.getElementById("nextTurnBtn").disabled = false;
        }
        // and game stats
        GameDetail.isDown = gameInfo.isDown;
        GameDetail.serviceDownAlert();
        GameDetail.numberOfServiceBreaks = gameInfo.numberOfServiceBreaks;
        GameDetail.ticketReactionAvg = gameInfo.ticketReactionAvg;
        if (game.isTimeBased == true) {
            GameDetail.updateStatsTime();
        } else {
            GameDetail.updateStatsTurn();
        }
    });

    // init service desk table
    $('#ticketTable').DataTable({
        "bPaginate": false,
        "bFilter": false,
        "bInfo": false,
        "language": {
            "emptyTable": ' ',
            "zeroRecords": ' '
        },
        "order": [[3, "desc"]]
    });

    GameDetail.initAdditionalInfo();
    GameDetail.loadServiceInfrastructure();
    GameDetail.initAttributeValues();
    GameDetail.isRunningSwitch(!game.isFinished);
    GameDetail.initStats();
    GameDetail.enableNextStep();
    GameDetail.setIsDown();
}

GameDetail.setIsDown = function(){
    if(game.isDown == true){
        document.getElementById("serviceDownAlert").style.visibility = "visible";
    }
}

GameDetail.enableNextStep = function(){
    if (game.isTimeBased == false) {
        [].forEach.call(document.getElementById("ticketTableBody").childNodes, function (el) {
            if(el.getElementsByClassName("isBlocking").length > 0 && el.getElementsByClassName("status")[0].innerHTML != "solved"){
                document.getElementById("nextTurnBtn").disabled = true;
            }
        });
    }
}

// show div of ci
GameDetail.showValueOfCi = function (cell) {
    if (cell.isEdge()) {
        return cell.value;
    } else {
        var celldiv = document.getElementById(cell.id);
        if (celldiv != null) {
            // create icon div
            var icon = celldiv.getElementsByClassName("icon")[0];
            var newIcon = icon.cloneNode(true);
            // create label div
            var newCiLabel = document.createElement("div");
            newCiLabel.innerHTML = celldiv.getElementsByClassName("ciLabel")[0].innerHTML;
            newCiLabel.setAttribute("style", "font-weight: bold;");

            // create table for label and icon
            var t = document.createElement("TABLE");
            var r = document.createElement("TR");
            var td1 = document.createElement("TD");
            td1.appendChild(newCiLabel);
            var td2 = document.createElement("TD");
            td2.appendChild(newIcon);

            // put spece between label and icon
            var space = document.createElement("div");
            space.innerHTML = "&nbsp;&nbsp;&nbsp;";
            var td3 = document.createElement("TD");

            // puts divs into table
            td3.appendChild(space);
            r.appendChild(td1);
            r.appendChild(td3);
            r.appendChild(td2);
            t.appendChild(r);
            // return created row
            return t;
        }
        return cell.value;
    }
}

GameDetail.selectionChanged = function (graph) {
    var x = document.getElementsByClassName("ci");
    var i;
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }

    // Forces focusout in IE
    graph.container.focus();

    // Gets the selection cell
    var cell = graph.getSelectionCell();

    if (cell == null || cell.isEdge() == true) {
        //properties.style.visibility = "hidden";
    }
    else {
        document.getElementById(cell.id).style.display = "block";
        var ciLabel = document.getElementById(cell.id).getElementsByClassName("ciLabel")[0].value;
        var ciDescription = document.getElementById(cell.id).getElementsByClassName("ciDescription")[0].value;
    }
}

// construct service infrastructure mxgraph
GameDetail.loadServiceInfrastructure = function () {
    var doc = mxUtils.parseXml(document.getElementById("serviceInfrastructure").value);
    var codec = new mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());
    this.graph.refresh();
}

// init additional info dialog
GameDetail.initAdditionalInfo = function () {
    GameDetail.additionalInfoDialog = $("#additionalInfoForm").dialog({
        autoOpen: false,
        height: 500,
        width: 700,
        modal: true,
        close: function () {
        },
    });

    // init quill container
    GameDetail.quill = new Quill('#quillContainer', {
        readOnly: true,
    });

    // add content to quill container and show it
    var info;
    try {
        var info = JSON.parse(document.getElementById("additionalInfoContent").innerHTML);
        GameDetail.quill.setContents(info.ops);
    } catch (e) {
        console.log("No additional info for service");
    }
}

// show alert when service is down
GameDetail.serviceDownAlert = function () {
    var visibility = "hidden";
    if (GameDetail.isDown == true && GameDetail.isFinished == false) {
        visibility = "visible";
    }
    document.getElementById("serviceDownAlert").style.visibility = visibility;
}

// show finished or end btn
GameDetail.isRunningSwitch = function (isRunning) {
    if (isRunning == true) { // show end game btn if service is running
        [].forEach.call(document.querySelectorAll('.statusBtn'), function (el) {
            el.style.display = 'block';
        });
        document.getElementById("endBtn").style.display = 'none';
    } else { // show finished btb when service is ended
        [].forEach.call(document.querySelectorAll('.statusBtn'), function (el) {
            el.style.display = 'none';
        });
        document.getElementById("endBtn").style.display = 'block';
    }
}

// do end of game
GameDetail.endGame = function () {
    console.log('end game');
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/player/games/endGame/" + game._id);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("finished");
        }
    }
    xmlhttp.send();
}

// do one turn in game
GameDetail.turn = function () {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/player/games/turn/" + game._id);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("next turn");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // update service stats from response
            try {
                var gameInfo = JSON.parse(xmlhttp.responseText);
                GameDetail.durationSeconds = gameInfo.duration;
                GameDetail.downtimeSeconds = gameInfo.downtime;
                GameDetail.numberOfServiceBreaks = gameInfo.numberOfServiceBreaks;
                GameDetail.updateStatsTurn();
                if (gameInfo.isBlocking === true) {
                    document.getElementById("nextTurnBtn").disabled = true;
                } else {
                    document.getElementById("nextTurnBtn").disabled = false;
                }
            } catch (e) {
                document.getElementById("nextTurnBtn").disabled = false;
                // console.log(e); stats were not send, do nothing
            }
        }
    }
    document.getElementById("nextTurnBtn").disabled = true;
    xmlhttp.send();
}

// start timer, which periodically uptate stats of game
GameDetail.startTimer = function () {
    if (GameDetail.isDown == true) {
        GameDetail.downtimeSeconds++;
    }
    GameDetail.updateStatsTime();
    if (GameDetail.isFinished == false) {
        t = setTimeout(function () {
            GameDetail.startTimer()
        }, 1000);
    }
}

// init attribute values with initial values from service design
GameDetail.initAttributeValues = function () {
    game.attributeValues.forEach(av => {
        var avDiv = document.getElementById("attsTableSchema").cloneNode(true);
        avDiv.id = av.attribute._id;
        avDiv.getElementsByClassName("name")[0].innerHTML = av.attribute.name;
        avDiv.getElementsByClassName("value")[0].innerHTML = av.value;
        avDiv.getElementsByClassName("unit")[0].innerHTML = av.attribute.unit;
        if (typeof av.attribute.configurationItem !== "undefined") {
            // if attribute belongs to CI and not to service, add him to table manually
            // attributes of service are insert using loop in jade
            document.getElementById(av.attribute.configurationItem).getElementsByClassName("attsTable")[0].appendChild(avDiv);
        }
    });
}

// init statistics for time based game
GameDetail.initTimeBased = function () {
    var downtimeFromLastBreakDown = 0;
    if (game.isDown == true && game.isFinished == false) {
        // compute additional downtime
        var now = new moment();
        var serviceBroke = new moment(game.serviceBroke);
        downtimeFromLastBreakDown = now.diff(serviceBroke, 'seconds');
    }
    // compute downtime; overal downtime = downtime saved id db + downtime from last service broke
    GameDetail.downtimeSeconds = game.downtime + downtimeFromLastBreakDown;
    if (game.isFinished == false) {
        GameDetail.startTimer();
    } else {
        GameDetail.finished = game.finished;
        GameDetail.updateStatsTime();
    }
}

// init game statistics
GameDetail.initStats = function () {
    var estimatedDurationSec = game.service.estimatedDuration / game.speed * 3600;
    document.getElementById("estimatedDuration").innerHTML = Utils.getFormatedTime(estimatedDurationSec);

    GameDetail.isDown = game.isDown;
    GameDetail.serviceDownAlert();
    GameDetail.numberOfServiceBreaks = game.numberOfServiceBreaks;
    GameDetail.isFinished = game.isFinished;
    GameDetail.ticketReactionAvg = game.ticketReactionAvg;
    if (game.isTimeBased == true) {
        GameDetail.initTimeBased();
    } else {
        GameDetail.durationSeconds = game.duration;
        GameDetail.downtimeSeconds = game.downtime;
        GameDetail.updateStatsTurn();
    }
}

// compute and update game statistics
GameDetail.updateStats = function () {
    var maxSeconds = 31536000; // seconds in year; 

    //DURATION
    document.getElementById("gameDuration").innerHTML = Utils.getFormatedTime(GameDetail.durationSeconds);

    //AVERAGE TICKET RESPONSE TIME
    if (Utils.validateNumber(GameDetail.ticketReactionAvg, 0, maxSeconds) == true) {
        document.getElementById("ticketReactionAvg").innerHTML = Utils.getFormatedTime(GameDetail.ticketReactionAvg);
    } else {
        document.getElementById("ticketReactionAvg").innerHTML = "-";
    }

    //AVAILABILITY
    var availability = Math.round((((GameDetail.durationSeconds - GameDetail.downtimeSeconds) / GameDetail.durationSeconds) * 100) * 100) / 100;
    if (Utils.validateNumber(availability, 0, 100) == true) {
        document.getElementById("availability").innerHTML = availability + " %";
    } else {
        document.getElementById("availability").innerHTML = "-";
    }

    //MTRS
    var MTRSAllSec = (GameDetail.downtimeSeconds / GameDetail.numberOfServiceBreaks);
    if (Utils.validateNumber(MTRSAllSec, 0, maxSeconds) == true) {
        document.getElementById("maintainability").innerHTML = Utils.getFormatedTime(MTRSAllSec);
    } else {
        document.getElementById("maintainability").innerHTML = "-";
    }

    //MTBF
    var MTBFAllSec = (GameDetail.durationSeconds - GameDetail.downtimeSeconds) / GameDetail.numberOfServiceBreaks;
    if (Utils.validateNumber(MTBFAllSec, 0, maxSeconds) == true) {
        document.getElementById("meanTimeBetweenFailures").innerHTML = Utils.getFormatedTime(MTBFAllSec);
    } else {
        document.getElementById("meanTimeBetweenFailures").innerHTML = "-";
    }
}

// udpate stats for turn based game
GameDetail.updateStatsTurn = function () {
    GameDetail.updateStats();
}

// udpate stats for time based game
GameDetail.updateStatsTime = function () {
    // compute game duration
    var from = new moment(moment(game.started).format("YYYY-MM-DD HH:mm:ss"));
    var to;
    if (GameDetail.isFinished == true) {
        to = new moment(moment(GameDetail.finished).format("YYYY-MM-DD HH:mm:ss"));
    } else {
        to = new moment();
    }
    GameDetail.durationSeconds = to.diff(from, 'seconds');
    // update stats
    GameDetail.updateStats();
}
