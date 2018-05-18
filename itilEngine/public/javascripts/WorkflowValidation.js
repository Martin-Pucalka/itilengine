var WorkflowValidation = WorkflowValidation || {};

// returns true if serivce properties are valid, false otherwise
WorkflowValidation.serviceValid = function () {
    var isValid = true;
    var errMsg = "";
    var maxSpeedUp = document.getElementById("maxSpeedUp").value;
    if (Utils.validateNumber(maxSpeedUp, 1, 1000) == false) {
        isValid = false;
        errMsg = "Maximal speed up must be between 1 - 1000.";
    }
    if (isValid == false) {
        document.getElementById("errorHeader").innerHTML = "Invalid service";
        document.getElementById("errorMsg").innerHTML = errMsg;
    }
    return isValid;
}

// returns true if commands in "comms" are valid, false otherwise
WorkflowValidation.commandsValid = function (comms) {
    var isValid = true; // flag which sings, if all commands are valid
    var invalidCommands = []; // array of invalid commands, to show them in error message
    var validationComms = comms.slice(); // commands where IDs are replaced by number (1) for evaluation purpose
    var commsWithAttributeLables = comms.slice(); // commands where IDs are replaced by their labels for error message purpose

    for (var i = 0; i < validationComms.length; i++) {
        var isCommValid = true;
        Array.from(document.getElementById("availableAttributes").childNodes).forEach(att => {
            // replace attribute ids for "1", for evaulauating purpose
            validationComms[i] = Utils.replaceAll(validationComms[i], "\'" + att.id.replace(/['"]+/g, '') + "\'", 1);
            // replace attribute id for label
            commsWithAttributeLables[i] = Utils.replaceAll(commsWithAttributeLables[i], att.id.replace(/['"]+/g, ''), att.innerHTML);
        })
        var ls = validationComms[i].split("=")[0];
        var rs = validationComms[i].split("=")[1];

        // on left side must be just one attribute id. So when attribute id is replaced by "1", left side must be equal to 1
        if (ls == "" || ls != 1 || rs == "") {
            isCommValid = false;
        }

        // righ side must be evaluatable
        try {
            eval(rs);
        }
        catch (err) {
            isCommValid = false;
        }

        // if one command is inavlid, set flag to invalid and push it to invalid commands array to show them in error message
        if (isCommValid == false) {
            isValid = false;
            invalidCommands.push(commsWithAttributeLables[i]);
        }
    }

    // commands are invalid => show err message
    if (isValid == false) {
        document.getElementById("errorHeader").innerHTML = "Service behaviour is not valid";
        document.getElementById("errorMsg").innerHTML = "";
        document.getElementById("errorMsg").innerHTML += "Invalid commands: ";
        document.getElementById("errorMsg").innerHTML += invalidCommands;
    }
    return isValid;
}

// return true, if all attributes are valid, false otherwise
WorkflowValidation.attributesValid = function () {
    var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/; // allowed format of attribute name
    var isValid = true; // flag, if all attributes are ok
    var attributes = []; // attribite names
    var attributeValues = []; // attribte values

    // array of wrong attributes, to show them in error message
    var duplicitAttributes = [];
    var wrongLabelAttributes = [];
    var wrongValueAttributes = [];

    Array.from(document.getElementsByClassName("attributeContainer")).forEach(att => {
        // iterate properties of att and set their names
        Array.from(att.childNodes).forEach(tr => {
            var labelAtt;
            if (typeof att.parentNode.parentNode.parentNode.parentNode.getElementsByClassName("ciLabel")[0] !== "undefined") {
                labelAtt = att.parentNode.parentNode.parentNode.parentNode.getElementsByClassName("ciLabel")[0].value + "." + tr.getElementsByClassName("name")[0].value;
            } else {
                labelAtt = tr.getElementsByClassName("name")[0].value;
            }
            attributes.push(labelAtt);
            attributeValues.push(tr.getElementsByClassName("initValue")[0].value);
        })
    })
    var attributesSorted = attributes.slice().sort();

    // check attribute label duplicates
    for (var i = 0; i < attributesSorted.length - 1; i++) {
        if (attributesSorted[i + 1] == attributesSorted[i]) {
            duplicitAttributes.push(attributesSorted[i]);
        }
    }
    for (var i = 0; i < attributes.length; i++) {
        var attributeLabelWithoutDot = attributes[i].replace(".", "");
        // check attribute name
        if (format.test(attributeLabelWithoutDot) || attributes[i].startsWith(".") || attributes[i].endsWith(".") || attributes[i] == "") {
            wrongLabelAttributes.push(attributes[i]);
        }
        // check attribute value
        if (!(!isNaN(parseFloat(attributeValues[i])) && isFinite(attributeValues[i]))) {
            wrongValueAttributes.push(attributes[i]);
        }
    }

    // err message header
    document.getElementById("errorMsg").innerHTML = "";
    document.getElementById("errorHeader").innerHTML = "Service infrastructure is not valid";
    //duplicitAttributes to message
    if (duplicitAttributes.length > 0) {
        document.getElementById("errorMsg").innerHTML += "Attributes cannot have same name: ";
        document.getElementById("errorMsg").innerHTML += duplicitAttributes;
        document.getElementById("errorMsg").innerHTML += "<br><br>";
        isValid = false;
    }
    //wrongLabelAttributes to message
    if (wrongLabelAttributes.length > 0) {
        document.getElementById("errorMsg").innerHTML += "Name of configuration item and attribute cannot contain special characters or be null: ";
        document.getElementById("errorMsg").innerHTML += wrongLabelAttributes;
        document.getElementById("errorMsg").innerHTML += "<br><br>";
        isValid = false;
    }
    //wrongValueAttributes to message
    if (wrongValueAttributes.length > 0) {
        document.getElementById("errorMsg").innerHTML += "Attributes must have valid initial value: ";
        document.getElementById("errorMsg").innerHTML += wrongValueAttributes;
        isValid = false;
    }

    return isValid;
}

WorkflowValidation.groupBy = function (array, f) {
    var groups = {};
    array.forEach(function (o) {
        var group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
    });
    return Object.keys(groups).map(function (group) {
        return groups[group];
    })
}

WorkflowValidation.validateWorkflow = function () {
    var isWorkflowValid = true;
    var edges = ServiceWorkflow.graphWorkflow.model.root.children[0].children.filter(c => c.edge == 1)

    // group edges by source state
    var edgesGroupedBySource = WorkflowValidation.groupBy(edges, function (item) {
        if (item.source != null) {
            return [item.source.id];
        } else {
            return null;
        }
    });

    // iterate groups of edges
    edgesGroupedBySource.forEach(edgesWithSameSource => {
        var condition, time, random;
        condition = time = random = 0;
        var targetNull = 0;
        var sourceNull = 0;
        var err = false;
        var errMsg = "";

        // iterate edges with same source state
        edgesWithSameSource.forEach(e => {
            if (e.target == null) { // targe state musnt be null
                targetNull++;
            }
            if (e.source == null) { // source state musnt be null
                sourceNull++;
            }
            if (e.source != null) { // source state cannot be end
                if (document.getElementById(e.source.id).getElementsByClassName("type")[0].innerHTML == "End") {
                    errMsg = "End state cannot have output edges";
                    err = true;
                }
            }
            // count types of edges
            if (document.getElementById(e.id).getElementsByClassName("typeValue")[0].innerHTML == "Time") {
                time++;
            } else if (document.getElementById(e.id).getElementsByClassName("typeValue")[0].innerHTML == "Random") {
                random++;
            } else if (document.getElementById(e.id).getElementsByClassName("typeValue")[0].innerHTML == "Condition") {
                condition++;
            }
        });
        // CONDITIONAL EDGES validation
        if (condition > 0) { // check conditional edges
            if (time > 0 || random > 0 || condition != 2) {
                errMsg = "Only one type of edges is allowed";
                err = true;
            } else {
                var ifEdgeCount, elseEdgeCount;
                var conditionValue;
                ifEdgeCount = elseEdgeCount = 0;
                // check count of "if" and "else" edges
                if (document.getElementById(edgesWithSameSource[0].id).getElementsByClassName("btn-info")[0].innerHTML == "if") {
                    conditionValue = document.getElementById(edgesWithSameSource[0].id).getElementsByClassName("conditionValue")[0].value;
                    ifEdgeCount++;
                } else {
                    elseEdgeCount++;
                }
                if (document.getElementById(edgesWithSameSource[1].id).getElementsByClassName("btn-info")[0].innerHTML == "if") {
                    conditionValue = document.getElementById(edgesWithSameSource[1].id).getElementsByClassName("conditionValue")[0].value;
                    ifEdgeCount++;
                } else {
                    elseEdgeCount++;
                }
                // check if there are exaclty one "if" and "else" edges
                if (ifEdgeCount != 1 || elseEdgeCount != 1) {
                    errMsg = "Conditional edges must be two: if and else";
                    err = true;
                } else {
                    // if there are correct "if" and "else" edges, check condition at "if" edge
                    Array.from(document.getElementById("availableAttributes").childNodes).forEach(att => {
                        conditionValue = Utils.replaceAll(conditionValue, "\'" + att.id.replace(/['"]+/g, '') + "\'", 1);
                    });
                    try {
                        eval(conditionValue);
                    } catch (e) {
                        errMsg = "Invalid condition";
                        err = true;
                    }
                }
            }
        }
        // RANDOM EDGES validation
        if (random > 0) {
            if (condition > 0 || time > 0) { // check count of types of edges
                errMsg = "Only one type of edges is allowed";
                err = true;
            } else {
                edgesWithSameSource.forEach(e => { // check weight of edge
                    var probabilityValue = document.getElementById(e.id).getElementsByClassName("probabilityValue")[0].value;
                    if (!(!isNaN(parseFloat(probabilityValue)) && isFinite(probabilityValue)) || probabilityValue <= 0) {
                        errMsg = "Value of probability edge must be positive number";
                        err = true;
                    }
                });
            }
        }
        // TIME EDGES validation
        if (time > 0) { // check count of types of edges
            if (condition > 0 || random > 0 || time > 1) {
                errMsg = "Only one type of edges is allowed";
                err = true;
            } else { // check number of hours
                var numberOfHoursValue = document.getElementById(edgesWithSameSource[0].id).getElementsByClassName("numberOfHoursValue")[0].value;
                if (!(!isNaN(parseFloat(numberOfHoursValue)) && isFinite(numberOfHoursValue)) || numberOfHoursValue < 1) {
                    errMsg = "Number of hours must be number. (Min. 1 hour)";
                    err = true;
                }
            }
        }
        // set error msg for edges with null target or source state
        if (targetNull > 0) {
            errMsg = "Edge must have target";
            err = true;
        }
        if (sourceNull > 0) {
            errMsg = "Edge must have source";
            err = true;
        }
        if (err) { // fill invalid edges with red color and set error msg
            isWorkflowValid = false;
            ServiceWorkflow.graphWorkflow.setCellStyles(mxConstants.STYLE_STROKECOLOR, 'red', edgesWithSameSource);
            edgesWithSameSource.forEach(ee => {
                ServiceWorkflow.graphWorkflow.refresh(ee);
                document.getElementById(ee.id).getElementsByClassName("edgeError")[0].value = errMsg;
            });
        } else { // fill valid edges with default color and clear error msg
            errMsg = "";
            ServiceWorkflow.graphWorkflow.setCellStyles(mxConstants.STYLE_STROKECOLOR, 'black', edgesWithSameSource);
            edgesWithSameSource.forEach(ee => {
                ServiceWorkflow.graphWorkflow.refresh(ee);
                document.getElementById(ee.id).getElementsByClassName("edgeError")[0].value = "";
            });
        }
    });
    if (isWorkflowValid == false) { //set error dialog header
        document.getElementById("errorHeader").innerHTML = "";
        document.getElementById("errorMsg").innerHTML = "Errors in service behaviour.";
    } else { //empty error dialog header
        document.getElementById("errorHeader").innerHTML = "";
        document.getElementById("errorMsg").innerHTML = "";
    }
    return isWorkflowValid;
}
