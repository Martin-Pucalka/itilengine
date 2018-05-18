var ServiceInfrastructure = ServiceInfrastructure || {};

// serviceInfrastructure mxGraph
ServiceInfrastructure.graph;
// position of last inserted vertex.
ServiceInfrastructure.lastCiPosX = -100;
ServiceInfrastructure.lastCiPosY = 0;
// dialog for service puhlish (creation of game available for another users)
ServiceInfrastructure.publishDialog;
// error dialog
ServiceInfrastructure.errorDialog;
// dialog for additional info about service, hosts quill element 
ServiceInfrastructure.additionalInfoDialog;
// True if service infrastructure desing is selected, false if service behaviour designer is selected
ServiceInfrastructure.isServiceInfrastructureSelected;
// quill HTML designer
ServiceInfrastructure.quill;
ServiceInfrastructure.doc;

ServiceInfrastructure.init = function () {
    this.loadServiceInfrastructure();

    this.graph.getModel().addListener(mxEvent.CHANGE, function (sender, evt) {
        ServiceInfrastructure.updateService();
    });

    // detect sevice label change to update it in header
    $("#label").on("change keyup paste click", (function () {
        document.getElementById('serviceLabelHeadline').innerHTML = document.getElementById('label').value;
    }));
    document.getElementById('infrastructureBehaviourSwitchWrapper').onclick = ServiceInfrastructure.infrastructureBehaviourSwitched;

    // config for publishDialogForm
    $("#publishDialogForm").dialog({
        autoOpen: false,
        height: 250,
        width: 350,
        modal: true,
        close: function () {
        },
    }).prev(".ui-dialog-titlebar").css("background", "#28a745").css("color", "white");
    ServiceInfrastructure.publishDialog = $("#publishDialogForm");

    $("#publishDialogForm").submit(function (e) {
        ServiceInfrastructure.publishDialog.dialog("close");
    });

    // config for errorDialogForm
    $("#errorDialogForm").dialog({
        autoOpen: false,
        height: 500,
        width: 700,
        modal: true,
        close: function () {
        },
    }).prev(".ui-dialog-titlebar").css("background", "red").css("color", "white");
    ServiceInfrastructure.errorDialog = $("#errorDialogForm");

    // config for additionalInfoForm
    ServiceInfrastructure.additionalInfoDialog = $("#additionalInfoForm").dialog({
        autoOpen: false,
        height: 500,
        width: 1200,
        modal: true,
        close: function () {
            ServiceInfrastructure.updateService();
        },
    });

    // config for quill toolbar
    var toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],

        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction

        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],

        ['clean'],                                         // remove formatting button
        ['omega']
    ];

    // create quill container
    ServiceInfrastructure.quill = new Quill('#quillContainer', {
        modules: {
            toolbar: toolbarOptions
        },
        placeholder: 'Add more description of service',
        theme: 'snow',
        bounds: document.body
    });

    // get additional info abuout service a fill with it quills container content
    var info;
    try {
        var info = JSON.parse(document.getElementById("additionalInfoContent").innerHTML);
        ServiceInfrastructure.quill.setContents(info.ops);
    } catch (e) {
        console.log("No additional info for service");
    }
}

// called when user switches between behavoir and infrastructure design
ServiceInfrastructure.infrastructureBehaviourSwitched = function (e) {
    e.stopPropagation(); // prevent switch from switching, to do validation of attributes before switching
    if (ServiceInfrastructure.isServiceInfrastructureSelected == true) { // if infrastructure is show
        // check if attributes are valid
        if (WorkflowValidation.attributesValid() == true) { // if yes, show behaviour and switch switch
            ServiceInfrastructure.ShowBehaviour();
            $("#infrastructureBehaviourSwitch").prop('checked', true).change();
        } else { // else show error dialog
            ServiceInfrastructure.errorDialog.dialog('open');
        }
    } else { //if behaviour is shown, dont check anything, just switch
        ServiceInfrastructure.showInfrastructure();
        $("#infrastructureBehaviourSwitch").prop('checked', false).change();
    }
}

ServiceInfrastructure.main = function (container) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error('Browser is not supported!', 200, false);
    }
    else {
        // Disables the built-in context menu
        //  var keyHandler = new mxKeyHandler(this.graph);

        // Creates the graph inside the given container
        this.graph = new mxGraph(container);

        Utils.setGraphScrollable(container, this.graph);

        this.graph.setConnectable(true);

        this.graph.isCellEditable = function (cell) {
            if (cell.isEdge() == true) {
                return true;
            }
            return false;
        }
        this.doc = mxUtils.createXmlDocument();

        // handler for delete key
        var keyHandler = new mxKeyHandler(this.graph);
        keyHandler.bindKey(46, function (evt) {
            if (ServiceInfrastructure.isServiceInfrastructureSelected == true) { // context is in service nfrastructure => remove CIs
                ServiceInfrastructure.removeCi();
            } else { // context is in service behaviour => remove edges and states
                ServiceWorkflow.removeStatesEdges();
            }
        });

        this.graph.getSelectionModel().addListener(mxEvent.CHANGE, function (sender, evt) {
            ServiceInfrastructure.selectionChanged(this.graph);
        });

        this.graph.getSelectionModel().setSingleSelection(true);

        // connection points for vertexes
        mxConstraintHandler.prototype.intersects = function (icon, point, source, existingEdge) {
            return (!source || existingEdge) || mxUtils.intersects(icon.bounds, point);
        };

        this.graph.getAllConnectionConstraints = function (terminal) {
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

        // invoke initial selection changed
        ServiceInfrastructure.selectionChanged(this.graph);

        //Overrides method to provide a cell label in the display
        this.graph.convertValueToString = ServiceInfrastructure.showValueOfCi;
    }
}

// create div to show in mxGraph vertex (as configuration item)
ServiceInfrastructure.showValueOfCi = function (cell) {
    if (cell.isEdge()) { // edge => show value directly
        return cell.value;
    } else {
        var celldiv = document.getElementById(cell.id);
        if (celldiv != null) {
            // create icon div
            var icon = celldiv.getElementsByClassName("icon")[0];
            var newIcon = icon.cloneNode(true);
            // create label div
            var ciLabel = celldiv.getElementsByClassName("ciLabel")[0];
            var newCiLabel = document.createElement("div");
            newCiLabel.setAttribute("style", "font-weight: bold;");
            newCiLabel.innerHTML = ciLabel.value;

            // put divs together to the table
            var t = document.createElement("TABLE");
            var r = document.createElement("TR");
            var td1 = document.createElement("TD");
            td1.appendChild(newCiLabel);

            var td2 = document.createElement("TD");
            td2.appendChild(newIcon);

            // put space between icon and label
            var space = document.createElement("div");
            space.innerHTML = "&nbsp;&nbsp;&nbsp;";
            var td3 = document.createElement("TD");
            td3.appendChild(space);

            r.appendChild(td1);
            r.appendChild(td3);
            r.appendChild(td2);
            t.appendChild(r);

            return t;
        }
        return cell.value;
    }
}

ServiceInfrastructure.selectionChanged = function (graph) {
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
    else { // show ci table in html
        document.getElementById(cell.id).style.display = "block";
        var ciLabel = document.getElementById(cell.id).getElementsByClassName("ciLabel")[0].value;
        var ciDescription = document.getElementById(cell.id).getElementsByClassName("ciDescription")[0].value;
    }
}

// remove configuration item from html, graph and db
ServiceInfrastructure.removeCi = function () {
    if (this.graph.isEnabled()) {
        var cell = this.graph.getSelectionCells()[0];
        if (typeof cell === "undefined") {
            return;
        }
        if (cell.isEdge() == false) {
            // try remove CI from db
            xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", "/creator/configurationItems/delete/" +
                document.getElementById(cell.id).getElementsByClassName("ci_id")[0].value.replace(/['"]+/g, ''));
            xmlhttp.setRequestHeader("Content-Type", "application/json");
            console.log("deleting ci");
            xmlhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    if (this.responseText === "true") {
                        // CI was succesfully removed, remove it from html and graph
                        var element = document.getElementById(cell.id);
                        element.outerHTML = "";
                        delete element;
                        ServiceInfrastructure.graph.removeCells();
                        console.log("deleted ci");
                    } else {
                        // CI coulnd be removed, show err dialog
                        document.getElementById("errorHeader").innerHTML = "";
                        document.getElementById("errorMsg").innerHTML = "Cannot delete configuration item, because is used in service behaviour.";
                        ServiceInfrastructure.errorDialog.dialog('open');
                    }
                }
            }
            xmlhttp.send();
        } else {
            ServiceInfrastructure.graph.removeCells();
        }
    }
}

// add configuration item to html, graph and db
ServiceInfrastructure.addCi = function (type) {
    // add ci to html clonning of existing element
    var div = document.getElementById('citable'),
        clone = div.cloneNode(true);
    document.getElementById('cicontainer').appendChild(clone);

    //insert vertex to graph
    this.graph.getModel().beginUpdate();
    try {
        var id = Utils.uuidv4(); // add unique id to new configuration item
        var v = this.graph.insertVertex(this.graph.getDefaultParent(), id, null, this.lastCiPosX, this.lastCiPosY, 140, 50);
        clone.id = v.id;
        clone.getElementsByClassName("ciid")[0].value = clone.id;

        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "/creator/configurationItems/save");
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        console.log("saving ci");
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                console.log("saved ci");
                clone.getElementsByClassName("ci_id")[0].value = this.responseText; // save mongodb id returned from server
            }
        }
        xmlhttp.send(JSON.stringify({ ciid: id, serviceId: document.getElementById("id").value.replace(/['"]+/g, '') }));

        // move position of last inserted vertex
        if (this.lastCiPosX > 200) {
            this.lastCiPosX = 0;
            this.lastCiPosY += 20;
        } else {
            this.lastCiPosX += 80;
        }
    }
    finally {
        // Updates the display
        this.graph.getModel().endUpdate();
    }
}

ServiceInfrastructure.updateCi = function (citable) {
    xmlhttp = new XMLHttpRequest();
    console.log("updating ci");
    xmlhttp.open("POST", "/creator/configurationItems/update/" +
        citable.getElementsByClassName("ci_id")[0].value.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            ServiceInfrastructure.graph.refresh(ServiceInfrastructure.graph.getModel().getCell(citable.id));
            console.log("updated ci");
        }
    }
    xmlhttp.send(JSON.stringify({
        label: citable.getElementsByClassName("ciLabel")[0].value,
        description: citable.getElementsByClassName("ciDescription")[0].value,
        image: citable.getElementsByClassName("icon")[0].src
    }));
}

// show preview of icon
ServiceInfrastructure.previewFile = function (el) {
    var preview = document.getElementById(this.graph.getSelectionCell().id).getElementsByClassName("icon")[0];
    var file = document.getElementById(this.graph.getSelectionCell().id).getElementsByClassName("fileinput")[0].files[0];
    // check size of icon
    var FileSize = file.size / 1024 / 1024; // in MB
    if (FileSize > 0.5) {
        document.getElementById("errorHeader").innerHTML = "";
        document.getElementById("errorMsg").innerHTML = "File size exceeds 0.5 MB.";
        ServiceInfrastructure.errorDialog.dialog('open');
    } else {
        var reader = new FileReader();
        reader.onloadend = function (e) {
            preview.src = reader.result; // set preview src
            ServiceInfrastructure.updateCi(document.getElementById(ServiceInfrastructure.graph.getSelectionCell().id)); // update ci with new icon
            ServiceInfrastructure.graph.refresh(ServiceInfrastructure.graph.getSelectionCell()); // refresh graph, to show new image
        }
        if (file) {
            reader.readAsDataURL(file); //reads the data as a URL
        }
    }
}

// construct mxGraph for service infrastructure
ServiceInfrastructure.loadServiceInfrastructure = function () {
    var doc = mxUtils.parseXml(document.getElementById("serviceInfrastructure").value);
    var codec = new mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());
    ServiceInfrastructure.graph.refresh();
}

ServiceInfrastructure.updateService = function () {
    console.log("updating service");
    var encoder = new mxCodec();
    // update service infrastructure graph
    var node = encoder.encode(this.graph.getModel());
    document.getElementById('serviceInfrastructure').value = mxUtils.getXml(node);
    // update service workflow graph
    var node1 = encoder.encode(ServiceWorkflow.graphWorkflow.getModel());
    document.getElementById('serviceWf').value = mxUtils.getXml(node1);

    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/services/update/" + document.getElementById("id").value);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("updated service");
        }
    }
    // update all service properties
    xmlhttp.send(JSON.stringify({
        label: document.getElementById("label").value,
        description: document.getElementById("description").value,
        serviceInfrastructure: document.getElementById("serviceInfrastructure").value,
        serviceWf: document.getElementById("serviceWf").value,
        maxSpeedUp: document.getElementById("maxSpeedUp").value,
        estimatedDuration: document.getElementById("estimatedDuration").value,
        additionalInfo: JSON.stringify(ServiceInfrastructure.quill.getContents()),
    }));

    try {
        WorkflowValidation.validateWorkflow();
    } catch (e) {
        console.log(e);
    }
}

// create attribute of service
ServiceInfrastructure.addAttributeToService = function (el) {
    var div = $("#attributeTableOfService > tbody > tr")[0],
        clone = div.cloneNode(true);

    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/attributes/save");
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("saving attribute to service");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("saved attribute to service");
            el.getElementsByClassName("attributeContainer")[0].appendChild(clone);
            clone.id = this.responseText;
        }
    }
    xmlhttp.send(JSON.stringify({ serviceId: document.getElementById("id").value.replace(/['"]+/g, '') }));
}

ServiceInfrastructure.updateAttribute = function (el) {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/attributes/update/" + el.id.replace(/['"]+/g, ''));
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("updating attribute of service");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("updated attribute of service");
        }
    }
    xmlhttp.send(JSON.stringify({
        name: el.getElementsByClassName("name")[0].value,
        initValue: el.getElementsByClassName("initValue")[0].value,
        unit: el.getElementsByClassName("unit")[0].value,
    }));
}

ServiceInfrastructure.removeAttribute = function (el) {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "/creator/attributes/delete/" + el.id.replace(/['"]+/g, '') + "?serviceId=" + document.getElementById("id").value);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("deleting attribute of service");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
            if (this.responseText === "true") {
                document.getElementById(el.id).remove();
            } else {
                document.getElementById("errorHeader").innerHTML = "";
                document.getElementById("errorMsg").innerHTML = "Cannot delete attribute, because is used in service behaviour.";
                ServiceInfrastructure.errorDialog.dialog('open');
            }
        }
    }
    xmlhttp.send();
}

// create attribute of CI
ServiceInfrastructure.addAttributeToCi = function (el) {
    var div = $("#attributeTableOfCi > tbody > tr")[0],
        clone = div.cloneNode(true);
    el.getElementsByClassName("attributeContainer")[0].appendChild(clone);

    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/creator/attributes/save");
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    console.log("saving attribute to ci");
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            console.log("saved attribute to ci");
            clone.id = this.responseText;
        }
    }
    xmlhttp.send(JSON.stringify({ ci_id: el.getElementsByClassName("ci_id")[0].value.replace(/['"]+/g, '') }));
}

// show infrastructure design 
ServiceInfrastructure.showInfrastructure = function () {
    ServiceWorkflow.graphWorkflow.getSelectionModel().clear();
    ServiceInfrastructure.isServiceInfrastructureSelected = true;
    document.getElementById("serviceInfrastructureDiv").style.display = "block";
    document.getElementById("serviceWorkflowDiv").style.display = "none";
}

// show behaviour design 
ServiceInfrastructure.ShowBehaviour = function () {
    ServiceInfrastructure.graph.getSelectionModel().clear();
    ServiceInfrastructure.isServiceInfrastructureSelected = false;
    document.getElementById("serviceInfrastructureDiv").style.display = "none";
    document.getElementById("serviceWorkflowDiv").style.display = "block";
    // reload attributes and conditions, because names of attributes could changed
    ServiceWorkflow.loadAttributes();
    ServiceWorkflow.loadConditions();
    ServiceWorkflow.graphWorkflow.center();
}

// validate sevice and show err message or publish form
ServiceInfrastructure.publish = function () {
    var isWorkflowValid = false;
    try {
        isWorkflowValid = WorkflowValidation.validateWorkflow()
    } catch (e) {
        console.log(e);
        isWorkflowValid = false;
    }
    if (WorkflowValidation.attributesValid() == true && isWorkflowValid == true && WorkflowValidation.serviceValid() == true) {
        ServiceInfrastructure.publishDialog.dialog('open');
    } else {
        ServiceInfrastructure.errorDialog.dialog('open');
    }
}
