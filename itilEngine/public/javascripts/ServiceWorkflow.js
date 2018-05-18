var ServiceWorkflow = ServiceWorkflow || {};

// mxGraph
ServiceWorkflow.graphWorkflow;
// position of last inserted vertex to graph
ServiceWorkflow.lastStatePosX = -500;
ServiceWorkflow.lastStatePosY = -500;
// form for commands
ServiceWorkflow.commandsForm;
ServiceWorkflow.selectedSolution;

ServiceWorkflow.init = function () {
    this.loadServiceWf();
    if (document.getElementById("serviceWf").value === "undefined") {
        // empty graph -> insert start and end states
        var lastStatePosXtmp = this.lastStatePosX;
        this.lastStatePosX = -900;
        var lastStatePosYtmp = this.lastStatePosY;
        this.lastStatePosY = -500;
        this.addState("Start");
        this.lastStatePosX = -200;
        this.lastStatePosY = -500;
        this.addState("End");
        this.lastStatePosX = lastStatePosXtmp;
        this.lastStatePosY = lastStatePosYtmp;
        ServiceInfrastructure.updateService();
    }

    this.graphWorkflow.getModel().addListener(mxEvent.CHANGE, function (sender, evt) {
        ServiceInfrastructure.updateService();
    });

    // popup dialog for creating commands
    ServiceWorkflow.commandsForm = $("#commandsOfState").dialog({
        autoOpen: false,
        height: 600,
        width: 1000,
        modal: true,
        buttons: {
            Save: function () {
                ServiceWorkflow.saveCommands();
            },
            Cancel: function () {
                ServiceWorkflow.commandsForm.dialog("close");
            }
        },
        close: function () {

        },
    });

    try {
        WorkflowValidation.validateWorkflow();
    } catch (e) {
        console.log(e);
    }
}

ServiceWorkflow.main = function (container) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error('Browser is not supported!', 200, false);
    }
    else {
        // Disables the built-in context menu

        // Creates the graph inside the given container
        this.graphWorkflow = new mxGraph(container);

        Utils.setGraphScrollable(container, this.graphWorkflow);

        this.graphWorkflow.setConnectable(true);

        this.graphWorkflow.isCellEditable = function (cell) {
            return false;
        }
        // delete key
        var keyHandler1 = new mxKeyHandler(this.graphWorkflow);
        keyHandler1.bindKey(46, function (evt) {
            if (ServiceInfrastructure.isServiceInfrastructureSelected == true) {
                ServiceInfrastructure.removeCi();
            } else {
                ServiceWorkflow.removeStatesEdges();
            }
        });
        // set error tooltip for edge
        this.graphWorkflow.getTooltipForCell = function (cell) {
            if (cell == null || document.getElementById(cell.id) == null || document.getElementById(cell.id).getElementsByClassName("edgeError")[0] == null) {
                return "";
            }
            return document.getElementById(cell.id).getElementsByClassName("edgeError")[0].value;
        }

        this.graphWorkflow.setTooltips(true);

        this.graphWorkflow.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
            ServiceWorkflow.serviceWorkflowSelectionChanged(this.graphWorkflow);
        });

        this.graphWorkflow.getSelectionModel().setSingleSelection(true);

        // listener for adding new edges
        this.graphWorkflow.addListener(mxEvent.ADD_CELLS, function (sender, evt) {
            if (evt.properties.cells[0].edge == true) {
                evt.properties.cells[0].id = Utils.uuidv4();  // add unique id to new edge
                ServiceWorkflow.addEdge(evt.properties.cells[0].id);
            }
        });

        // connection points for vertexes
        mxConstraintHandler.prototype.intersects = function (icon, point, source, existingEdge) {
            return (!source || existingEdge) || mxUtils.intersects(icon.bounds, point);
        };
        this.graphWorkflow.getAllConnectionConstraints = function (terminal) {
            if (terminal != null && this.model.isVertex(terminal.cell)) {
                return [new mxConnectionConstraint(new mxPoint(0, 0), true),
                new mxConnectionConstraint(new mxPoint(0.5, 0), true),
                new mxConnectionConstraint(new mxPoint(1, 0), true),
                new mxConnectionConstraint(new mxPoint(0, 0.5), true),
                new mxConnectionConstraint(new mxPoint(1, 0.5), true),
                new mxConnectionConstraint(new mxPoint(0, 1), true),
                new mxConnectionConstraint(new mxPoint(0.5, 1), true),
                new mxConnectionConstraint(new mxPoint(1, 1), true)];
            }

            return null;
        };

        // set style of states
        var style = this.graphWorkflow.getStylesheet().getDefaultVertexStyle();
        style[mxConstants.STYLE_STROKECOLOR] = 'gray';
        style[mxConstants.STYLE_ROUNDED] = true;
        style[mxConstants.STYLE_SHADOW] = true;
        style[mxConstants.STYLE_FILLCOLOR] = '#F9F9F9';
        style[mxConstants.STYLE_GRADIENTCOLOR] = 'white';
        style[mxConstants.STYLE_FONTCOLOR] = 'black';
        style[mxConstants.STYLE_FONTSIZE] = '12';
        style[mxConstants.STYLE_SPACING] = 4;

        // set style of edges
        style = this.graphWorkflow.getStylesheet().getDefaultEdgeStyle();
        style[mxConstants.STYLE_STROKECOLOR] = '#8D8D8D';
        style[mxConstants.STYLE_FONTCOLOR] = 'black';
        style[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = '#eee';
        style[mxConstants.STYLE_FONTSIZE] = '10';

        //Overrides method to provide a cell label in the display
        this.graphWorkflow.convertValueToString = this.showValueOfState;

        this.serviceWorkflowSelectionChanged();
    }
}

//Returns value to display in vertex
ServiceWorkflow.showValueOfState = function (cell) {
    var celldiv = document.getElementById(cell.id);
    if (celldiv == null) {
        return "";
    }
    if (cell.isEdge()) { // shown div for edge
        if (celldiv.getElementsByClassName("typeValue")[0].innerHTML == "Time") {
            return celldiv.getElementsByClassName("numberOfHoursValue")[0].value + " hours";
        } else if (celldiv.getElementsByClassName("typeValue")[0].innerHTML == "Random") {
            return celldiv.getElementsByClassName("probabilityValue")[0].value + " *";
        } else if (celldiv.getElementsByClassName("typeValue")[0].innerHTML == "Condition") {
            if (celldiv.getElementsByClassName("btn-info")[0].innerHTML == "if") {
                return "if(" + celldiv.getElementsByClassName("conditionValue")[0].value + ")";
            } else {
                return "else";
            }
        }
        return "";
    } else { // shown div for state
        var d = document.createElement("DIV");
        var d1 = document.createElement("DIV");
        d1.innerHTML = celldiv.getElementsByClassName("type")[0].innerHTML;
        d1.setAttribute("style", "font-weight: bold;");
        d.appendChild(d1);
        if (celldiv.getElementsByClassName("type")[0].innerHTML != "Start" && celldiv.getElementsByClassName("type")[0].innerHTML != "End") {
            var d2 = document.createElement("DIV");
            d2.innerHTML = celldiv.getElementsByClassName("subject")[0].value;
            d.appendChild(d2);
        }
        return d;
    }
}

ServiceWorkflow.serviceWorkflowSelectionChanged = function () {
    // hide all vertexs
    [].forEach.call(document.getElementsByClassName("state"), function (el) {
        el.style.display = "none";
    });

    // Forces focusout in IE
    this.graphWorkflow.container.focus();

    // Gets the selection cell
    var cell = this.graphWorkflow.getSelectionCell();

    if (cell == null || document.getElementById(cell.id) == null) {

    }
    else if (cell.isEdge() == true) {
        // show edge elements
        document.getElementById(cell.id).style.display = "block";
        if (document.getElementById(cell.id).getElementsByClassName("typeValue")[0].innerHTML == "Condition") {
            if (document.getElementById(cell.id).getElementsByClassName("ifBtn")[0].classList.contains("btn-info")) {
                // if edge is conditional and is "if", then show attributes to create condition
                document.getElementById("availableAttributesForCondition").style.display = "block";
            } else {
                document.getElementById("availableAttributesForCondition").style.display = "none";
            }
        }
    }
    else {
        // show state elements
        var type = document.getElementById(cell.id).getElementsByClassName("type")[0].innerHTML;
        document.getElementById(cell.id).style.display = "block";
        if (type == "Start" || type == "End") {
            [].forEach.call(document.getElementById(cell.id).getElementsByClassName('stateProperty'), function (el) {
                el.style.display = "none";
            });
        } else if (type == "State") {
            [].forEach.call(document.getElementById(cell.id).getElementsByClassName('ticketProperty'), function (el) {
                el.style.display = "none";
            });
        } else if (type == "Event" || type == "Change request") {
            [].forEach.call(document.getElementById(cell.id).getElementsByClassName('incidentProperty'), function (el) {
                el.style.display = "none";
            });
        } else {
            document.getElementById(cell.id).style.display = "block";
        }
    }
}

ServiceWorkflow.addEdge = function (id) {
    // add edge to html by clonnig element
    var div = document.getElementById('edgeTable'),
        clone = div.cloneNode(true);
    clone.id = id;
    clone.getElementsByClassName("edgeid")[0].value = clone.id;
    document.getElementById('stateContainer').insertBefore(clone, document.getElementById('stateContainer').children[0]);

    // add edge to db
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/edges/save");
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("saving edge");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("saved edge");
            clone.getElementsByClassName("edge_id")[0].value = this.responseText;
            ServiceWorkflow.edgeTypeChanged(clone, clone.getElementsByClassName("timeBtn")[0]);
        }
    }
    xmlhttp.send(JSON.stringify({ edgeid: id, serviceId: document.getElementById("id").value.replace(/['"]+/g, '') }));
}

ServiceWorkflow.updateEdge = function (stateTable) {
    console.log("updating edge");
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/edges/update/" +
        stateTable.getElementsByClassName("edge_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            ServiceWorkflow.graphWorkflow.refresh(ServiceWorkflow.graphWorkflow.getModel().getCell(stateTable.id));
            console.log("updated edge");
        }
    }
    // replace attribute names for their IDs
    var condition = stateTable.getElementsByClassName("conditionValue")[0].value;
    Array.from(document.getElementById("availableAttributesForCondition").childNodes).forEach(att => {
        condition = Utils.replaceAll(condition, "\'" + att.innerHTML + "\'", "\'" + att.id.replace(/['"]+/g, '') + "\'");
    })
    // update type of edge (if or else)
    var isIfEdge;
    if (stateTable.getElementsByClassName("btn-info")[0].innerHTML == "if") {
        isIfEdge = true;
    } else {
        isIfEdge = false;
    }
    xmlhttp.send(JSON.stringify({
        type: stateTable.getElementsByClassName("typeValue")[0].innerHTML,
        numberOfHours: stateTable.getElementsByClassName("numberOfHoursValue")[0].value,
        probability: stateTable.getElementsByClassName("probabilityValue")[0].value,
        condition: condition,
        isIfEdge: isIfEdge,
    }));
    try {
        WorkflowValidation.validateWorkflow();
    } catch (e) {
        console.log(e);
    }
}

// remove state, edge or nothing based on what is selected a if editing of graph is enabled
ServiceWorkflow.removeStatesEdges = function () {
    if (this.graphWorkflow.isEnabled()) {
        var cell = this.graphWorkflow.getSelectionCell();
        if (typeof cell === "undefined") {
            return;
        }
        if (cell.isEdge() == true) {
            ServiceWorkflow.removeEdge(cell);
        } else {
            var typeOfState; // get type of state to determine, if it is Start or End. Theese two cannot be removed
            try {
                typeOfState = document.getElementById(cell.id).getElementsByClassName("type")[0].innerHTML;
            } catch (e) {
                typeOfState = "";
            }
            if (typeOfState == "Start") {
                alert("Cannot remove Start");
            } else if (typeOfState == "End") {
                alert("Cannot remove End");
            } else {
                ServiceWorkflow.removeState(cell);
            }
        }
    }
}

// Remove state from html, graph and db
ServiceWorkflow.removeState = function (cell) {
    ServiceWorkflow.graphWorkflow.removeCells(null, false);
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/states/delete/" +
        document.getElementById(cell.id).getElementsByClassName("state_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("deleting state");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var element = document.getElementById(cell.id);
            element.outerHTML = "";
            delete element;
            ServiceWorkflow.graphWorkflow.removeCells(null, false);
            console.log("deleted state");
        }
    }
    xmlhttp.send();
}

// Remove edge from html, graph and db
ServiceWorkflow.removeEdge = function (cell) {
    ServiceWorkflow.graphWorkflow.removeCells(null, false);
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/edges/delete/" +
        document.getElementById(cell.id).getElementsByClassName("edge_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("deleting edge");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var element = document.getElementById(cell.id);
            element.outerHTML = "";
            delete element;
            console.log("deleted edge");
        }
    }
    xmlhttp.send();
}

// add state to html graph and db
ServiceWorkflow.addState = function (type) {
    // add to html by clonning of existing one
    var div = document.getElementById('stateTable'),
        clone = div.cloneNode(true); // true means clone all childNodes and all event handlers
    document.getElementById('stateContainer').appendChild(clone);

    //insert state to graph
    this.graphWorkflow.getModel().beginUpdate();
    try {
        var id = Utils.uuidv4(); // add unique id to new state
        var v = this.graphWorkflow.insertVertex(this.graphWorkflow.getDefaultParent(), id, null, this.lastStatePosX, this.lastStatePosY, 120, 50);
        clone.id = v.id;
        clone.getElementsByClassName("stateid")[0].value = clone.id;
        clone.getElementsByClassName("type")[0].innerHTML = type;
        // add state to db
        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/creator/states/save");
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        console.log("saving state");
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                console.log("saved state");
                clone.getElementsByClassName("state_id")[0].value = this.responseText; // save mongodb id to new state
            }
        }
        xmlhttp.send(JSON.stringify({ stateid: id, serviceId: document.getElementById("id").value.replace(/['"]+/g, ''), type: type }));
        // move position in mxGraph to insert new vertex next to old one
        if (this.lastStatePosX > -200) {
            this.lastStatePosX = -500;
            this.lastStatePosY += 20;
        } else {
            this.lastStatePosX += 80;
        }
    }
    finally {
        // Updates the display
        this.graphWorkflow.getModel().endUpdate();
    }
}

// construct mxGraph
ServiceWorkflow.loadServiceWf = function () {
    var doc = mxUtils.parseXml(document.getElementById("serviceWf").value);
    var codec = new mxCodec(doc);
    codec.decode(doc.documentElement, this.graphWorkflow.getModel());
    ServiceWorkflow.graphWorkflow.refresh();
}

ServiceWorkflow.updateState = function (stateTable, comms, updateCommands) {
    console.log("updating state");
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/states/update/" +
        stateTable.getElementsByClassName("state_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            ServiceWorkflow.graphWorkflow.refresh(ServiceWorkflow.graphWorkflow.getModel().getCell(stateTable.id));
            console.log("updated state");
        }
    }
    xmlhttp.send(JSON.stringify({
        subject: stateTable.getElementsByClassName("subject")[0].value,
        description: stateTable.getElementsByClassName("description")[0].value,
        priority: stateTable.getElementsByClassName("priority")[0].value,
        bringDown: stateTable.getElementsByClassName("bringDown")[0].checked,
        isBlocking: stateTable.getElementsByClassName("isBlocking")[0].checked,
        updateCommands: updateCommands,
        commands: comms
    }));
}

ServiceWorkflow.edgeTypeChanged = function (edge, btn) {
    //Hide all properties in table
    [].forEach.call(document.getElementById(edge.id).getElementsByClassName('edgeProperty'), function (el) {
        el.style.display = "none";
    });

    //Hide table with attributes
    document.getElementById("availableAttributesForCondition").style.display = "none";

    //Select clicked btn and deselect others
    [].forEach.call(document.getElementById(edge.id).getElementsByClassName('edgeTypeBtn'), function (el) {
        el.classList.remove("btn-primary");
    });

    btn.className += btn.className ? ' btn-primary' : 'btn-primary';

    //Store type of edge acording to clicled btn
    edge.getElementsByClassName("typeValue")[0].innerHTML = btn.innerHTML;

    //Show apropriate properties
    if (btn.innerHTML === "Time") {
        edge.getElementsByClassName("numberOfHours")[0].style.display = "block";
    } else if (btn.innerHTML === "Condition") {
        edge.getElementsByClassName("condition")[0].style.display = "block";
        if (edge.getElementsByClassName("btn-info")[0].innerHTML == "if") {
            document.getElementById("availableAttributesForCondition").style.display = "block";
        }
    } else if (btn.innerHTML === "Random") {
        edge.getElementsByClassName("probability")[0].style.display = "block";
    }

    ServiceWorkflow.updateEdge(edge);
}

ServiceWorkflow.ifElseChanged = function (edge, ifElseBtn) {
    //Select clicked btn and deselect others
    [].forEach.call(document.getElementById(edge.id).getElementsByClassName('ifElseBtn'), function (el) {
        el.classList.remove("btn-info");
    });

    ifElseBtn.className += ifElseBtn.className ? ' btn-info' : 'btn-info';

    var display = 'none';
    if (ifElseBtn.innerHTML == "if") {
        display = 'block';
    }
    [].forEach.call(document.getElementById(edge.id).getElementsByClassName('conditionStatement'), function (el) {
        el.style.display = display;
    });
    document.getElementById("availableAttributesForCondition").style.display = display;

    ServiceWorkflow.updateEdge(edge);
}

ServiceWorkflow.addSolution = function (el) {
    // add to html clonning existing one
    var clone = document.getElementById("solutionTable").cloneNode(true);
    clone.style = "";
    // add soluton to db
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/solutions/save");
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("saving solution");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("saved solution");
            el.getElementsByClassName("solutionContainer")[0].appendChild(clone);
            clone.id = this.responseText;
        }
    }
    xmlhttp.send(JSON.stringify({ stateId: el.getElementsByClassName("state_id")[0].value.replace(/['"]+/g, ''), description: "" }));
}

// Get commands from commandsContainer in popup window. Replace attribute labels for IDs.
ServiceWorkflow.getCommands = function () {
    var comms = [];
    Array.from(document.getElementById("commandsContainer").childNodes).forEach(element => {
        var comm = element.getElementsByClassName("commandLeftSide")[0].value + "=" + element.getElementsByClassName("commandRightSide")[0].value;
        Array.from(document.getElementById("availableAttributes").childNodes).forEach(att => {
            comm = Utils.replaceAll(comm, "\'" + att.innerHTML + "\'", "\'" + att.id.replace(/['"]+/g, '') + "\'")
        })
        comms.push(comm)
    });
    return comms;
}

ServiceWorkflow.updateSolution = function (el, updateCommands, comms) {
    console.log("updating solution");
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/solutions/update/" + el.id.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("updated solution");
        }
    }
    xmlhttp.send(JSON.stringify({
        description: el.getElementsByClassName("description")[0].value,
        commands: comms,
        updateCommands: updateCommands,
    }));
}

ServiceWorkflow.removeSolution = function (el) {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/solutions/delete/" + el.id.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("deleting solution");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            el.outerHTML = "";
            delete el;
            console.log("deleted solution");
        }
    }
    xmlhttp.send();
}

ServiceWorkflow.addCommand = function (ls, rs) {
    // add command to html by clonning node
    var div = document.getElementById('commandTable'),
        clone = div.cloneNode(true); // true means clone all childNodes and all event handlers
    clone.getElementsByClassName("commandLeftSide")[0].value = ls;
    clone.getElementsByClassName("commandRightSide")[0].value = rs;

    clone.style.display = "block";
    clone.id = "";
    document.getElementById("commandsContainer").appendChild(clone);
}

// Load attributes to table for creation of commands
ServiceWorkflow.loadAttributes = function () {
    document.getElementById("commandTableLeftSides").innerHTML = "";
    document.getElementById("availableAttributes").innerHTML = "";
    document.getElementById("availableAttributesForCondition").innerHTML = "";
    // iterate through all attributes
    Array.from(document.getElementsByClassName("attributeContainer")).forEach(att => {
        Array.from(att.childNodes).forEach(tr => {
            var labelAtt;
            var idAtt;
            if (typeof att.parentNode.parentNode.parentNode.parentNode.getElementsByClassName("ciLabel")[0] !== "undefined") {
                // if attribute belongs to CI, then set name to: ConfigurationItemName.AttributeName
                labelAtt = att.parentNode.parentNode.parentNode.parentNode.getElementsByClassName("ciLabel")[0].value + "." + tr.getElementsByClassName("name")[0].value;
                idAtt = tr.id;
            } else {
                // if attribute belongs to service, dont concat with anything and name will be just AttributeName
                labelAtt = tr.getElementsByClassName("name")[0].value;
                idAtt = tr.id;
            }
            var divForCommand = document.createElement("DIV");

            // create div with attribute IDs and fill them with attribute names for commands
            var labelDiv = document.createElement("DIV");
            labelDiv.innerHTML = labelAtt;
            divForCommand.innerHTML = labelAtt;
            divForCommand.id = idAtt;
            //set div draggable
            divForCommand.setAttribute("draggable", "true");
            divForCommand.setAttribute("ondragstart", "drag(event)");
            document.getElementById("availableAttributes").appendChild(divForCommand);

            // create div with attribute IDs and fill them with attribute names for conditions
            var divForCondition = document.createElement("DIV");
            divForCondition.innerHTML = labelAtt;
            divForCondition.id = idAtt;
            //set div draggable
            divForCondition.setAttribute("draggable", "true");
            divForCondition.setAttribute("ondragstart", "drag(event)");
            document.getElementById("availableAttributesForCondition").appendChild(divForCondition);

            // create div with attribute name and ID for left side of command (option combobox)
            var divForOption = document.createElement("OPTION");
            divForOption.innerHTML = "'" + labelAtt + "'";
            divForOption.id = idAtt;
            document.getElementById("commandTableLeftSides").appendChild(divForOption);
        })
    })
}

// Load attributes to if conditions
ServiceWorkflow.loadConditions = function () {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/services/edgesOfService/" + document.getElementById("id").value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var edgesOfservice = JSON.parse(xmlhttp.responseText);
            edgesOfservice.forEach(e => {
                var condition = e.condition;
                Array.from(document.getElementById("availableAttributesForCondition").childNodes).forEach(att => {
                    condition = Utils.replaceAll(condition, "\'" + att.id.replace(/['"]+/g, '') + "\'", "\'" + att.innerHTML + "\'");
                })
                document.getElementById(e.edgeid).getElementsByClassName("conditionValue")[0].value = condition;
            });
            ServiceWorkflow.graphWorkflow.refresh();
        }
    }
    ServiceWorkflow.graphWorkflow.refresh();
    xmlhttp.send();
}

// Load commands of state
ServiceWorkflow.commandsOfState = function (el) {
    document.getElementById("commandFor").innerHTML = "state"; // set, that commands in dialog are dedicated for state
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/states/getCommands/" +
        el.getElementsByClassName("state_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("commandsContainer").innerHTML = "";
            var commands = JSON.parse(xmlhttp.responseText);
            commands.forEach(comm => {
                // replace attribute IDs for attribute names
                Array.from(document.getElementById("availableAttributes").childNodes).forEach(att => {
                    comm = Utils.replaceAll(comm, "\'" + att.id.replace(/['"]+/g, '') + "\'", "\'" + att.innerHTML + "\'");
                })
                // parse command and split to left and right side of command
                ServiceWorkflow.addCommand(comm.split('=')[0], comm.split('=')[1]);
            });
            // show dialog for commands crud
            ServiceWorkflow.commandsForm.dialog('open');
        }
    }
    xmlhttp.send();
}

ServiceWorkflow.saveCommands = function () {
    var comms = ServiceWorkflow.getCommands(); // get commands from popup window
    if (WorkflowValidation.commandsValid(comms) == true) {
        if (document.getElementById("commandFor").innerHTML == "state") { // save commands to state
            ServiceWorkflow.updateState(document.getElementById(this.graphWorkflow.getSelectionCell().id), comms, true);
        } else {  // save commands to solution
            ServiceWorkflow.updateSolution(ServiceWorkflow.selectedSolution, true, comms);
        } // close popup window
        ServiceWorkflow.commandsForm.dialog("close");
    } else { // eror during command validation, show error popup
        ServiceInfrastructure.errorDialog.dialog('open');
    }
}

// show popup dialog with solution commands
ServiceWorkflow.commandsOfSolution = function (el) {
    ServiceWorkflow.selectedSolution = el;
    document.getElementById("commandFor").innerHTML = "solution";
    // get commands of solution
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/solutions/getCommands/" +
        el.id.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("commandsContainer").innerHTML = "";
            var commands = JSON.parse(xmlhttp.responseText);
            // add each command
            commands.forEach(comm => {
                // replace IDs for attribute names
                Array.from(document.getElementById("availableAttributesForCondition").childNodes).forEach(att => {
                    comm = Utils.replaceAll(comm, "\'" + att.id.replace(/['"]+/g, '') + "\'", "\'" + att.innerHTML + "\'");
                })
                // split command to left and right side and add it to table
                ServiceWorkflow.addCommand(comm.split('=')[0], comm.split('=')[1]);
            });
            ServiceWorkflow.commandsForm.dialog('open');
        }
    }
    xmlhttp.send();
}

ServiceWorkflow.removeCommandOfState = function (el) {
    el.parentNode.removeChild(el);
}
