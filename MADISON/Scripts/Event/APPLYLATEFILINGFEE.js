/*------------------------------------------------------------------------------------------------------/
| Program: Batch Expiration.js  Trigger: Batch
| Client: 
|
| Version 1.0 - Base Version. 11/01/08 JHS
| Version 1.1 - Updates based on config 02/21/09
| Version 1.2 - Only create sets if CAPS qualify 02/26/09
| Version 1.3 - Added ability to lock parent license (for adv permits) 1/12/10
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true; 								// Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 60; 						// number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
wfObjArray = null;
var br = "<BR>";
var disableTokens = false; 		// turn off tokenizing of App Specific and Parcel Attributes
var feeSeqList = new Array();
var paymentPeriodList = new Array(); 				// invoicing pay periods

batchJobID = 0;
if (batchJobResult.getSuccess()) {
    batchJobID = batchJobResult.getOutput();
    logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
}
else
    logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());


/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var fromDate = "06/30/2013";
var toDate = "06/30/2013";
var dFromDate = aa.date.parseDate(fromDate); 		//
var dToDate = aa.date.parseDate(toDate); 			//
var lookAheadDays = aa.env.getValue("lookAheadDays");   // Number of days from today
var daySpan = aa.env.getValue("daySpan"); 			// Days to search (6 if run weekly, 0 if daily, etc.)

var appGroup = "Licenses"; 					//   app Group to process
var appTypeType = "Clerk"; 				//   app type to process 
var appSubtype = "ClassABeerLiquor,ClassBBeerLiquor";  //	"*"			//   app subtype to process {NA} or comma delimited for multiple
var appCategory = getParam("*"); //	"*"			//   app category to process {NA}

var expStatus = "Delinquent"; 			//   test for this expiration status
var skipAppStatus = "Renewal Paperwork Returned";
var skipAppStatusArray = skipAppStatus.split(",");

var emailAddress = "glabelle-brown@cityofmadison.com"; 		// email to send report
var sendEmailNotifications = "N"//getParam("sendEmailNotifications");	// send out emails?
var mSubjChoice = ""//getParam("emailSubjectStdChoice");			// Message subject resource from "Batch_Job_Messages" Std Choice
var mMesgChoice = ""//getParam("emailContentStdChoice");			// Message content resource from "Batch_Job_Messages" Std Choice

var invoiceFees = "Y";
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var timeExpired = false;

if (!fromDate.length) // no "from" date, assume today + number of days to look ahead
    fromDate = dateAdd(null, parseInt(lookAheadDays))

if (!toDate.length)  // no "to" date, assume today + number of look ahead days + span
    toDate = dateAdd(null, parseInt(lookAheadDays) + parseInt(daySpan))

logDebug("Date Range -- fromDate: " + fromDate + ", toDate: " + toDate)

var mSubjEnConstant = null;
var mMesgEnConstant = null;
var mSubjArConstant = null;
var mMesgArConstant = null;

if (mSubjChoice) mSubjEnConstant = lookup("Batch Job Messages", mSubjChoice);
if (mMesgChoice) mMesgEnConstant = lookup("Batch Job Messages", mMesgChoice);

var startTime = startDate.getTime(); 		// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

if (appGroup == "")
    appGroup = "*";
if (appTypeType == "")
    appTypeType = "*";
if (appSubtype == "")
    appSubtype = "*";
if (appCategory == "")
    appCategory = "*";

var appSubtypeArray = appSubtype.split(",");

//var appType = appGroup + "/" + appTypeType + "/" + appSubtype + "/" + appCategory;
var appType = "";
var appTypesArray = new Array();

for (appSubtype in appSubtypeArray) {
    appType = appGroup + "/" + appTypeType + "/" + appSubtypeArray[appSubtype] + "/" + appCategory;
    appTypesArray.push(appType);
}

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/


logDebug("Start of Job");
aa.sendMail("noreply@cityofmadison.com", emailAddress, "", batchJobName + " Results", emailText);

if (!timeExpired) mainProcess();
logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");

if (emailAddress.length)
    aa.sendMail("noreply@cityofmadison.com", emailAddress, emailAddress, "Results", emailText);

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

function mainProcess() {
    var capFilterType = 0
    var capFilterInactive = 0;
    var capFilterError = 0;
    var capFilterStatus = 0;
    var capFilterOther = 0;
    var capCount = 0;
    var inspDate;
    var setName;
    var setDescription;

    var expResult = aa.expiration.getLicensesByDate(expStatus, fromDate, toDate);

    if (expResult.getSuccess()) {
        myExp = expResult.getOutput();
        logDebug("Processing " + myExp.length + " expiration records");
    }
    else
    { logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); return false }

    for (thisExp in myExp)  // for each b1expiration (effectively, each license app)
    {
        if (elapsed() > maxSeconds) // only continue if time hasn't expired
        {
            logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.");
            timeExpired = true;
            break;
        }

        b1Exp = myExp[thisExp];
        var expDate = b1Exp.getExpDate();
        if (expDate) var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
        var b1Status = b1Exp.getExpStatus();

        capId = aa.cap.getCapID(b1Exp.getCapID().getID1(), b1Exp.getCapID().getID2(), b1Exp.getCapID().getID3()).getOutput();

        if (!capId) {
            logDebug("Could not get a Cap ID for " + b1Exp.getCapID().getID1() + "-" + b1Exp.getCapID().getID2() + "-" + b1Exp.getCapID().getID3());
            logDebug("This is likely being caused by 09ACC-03874.   Please disable outgoing emails until this is resolved")
            continue;
        }

        altId = capId.getCustomID();
        //logDebug(altId + ": Renewal Status : " + b1Status + ", Expires on " + b1ExpDate);

        cap = aa.cap.getCap(capId).getOutput();
        if (!cap) {
            logDebug(altId + " Failed because it did");
            continue;
        }

        var capStatus = cap.getCapStatus();
        appTypeResult = cap.getCapType(); 	//create CapTypeModel object
        appTypeString = appTypeResult.toString();
        appTypeArray = appTypeString.split("/");

        // Filter by CAP Type
        var match = false;
        for (appType in appTypesArray) {
            logDebug("APP TYPE IS:" + appTypesArray[appType]);
            if (appType.length && appMatch(appTypesArray[appType])) {
                match = true;
            }
        }
        if (match == false) {
            capFilterType++;
            continue;
        }

        //EXCLUDE BY CAP TYPE
        if (appMatch("Licenses/Building Inspection/Plumbing/Na") ||
   
			appMatch("Licenses/Clerk/Operator/NA") ||
			appMatch("Licenses/Clerk/AdultEntertainment/NA")) {
            capFilterType++;
            //logDebug(altId + ": Application Type does not match")
            continue;
        }

        // Filter by CAP Status
        if (exists(capStatus, skipAppStatusArray)) {
            capFilterStatus++;
            //logDebug(altId + ": skipping due to application status of " + capStatus)
            continue;
        }

        capCount++;

        var feObj = updateFee("LIQRNWLATE", "LICLIQA", b1Exp.getPayPeriodGroup(), 1, "Y");
     
        appFeeSched = null;

        logDebug("FeeSeqList length:"+feeSeqList.length);
        
        if (feeSeqList.length)  // invoice added fees
        {
            var invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
            if (!invoiceResult.getSuccess())
                logDebug("ERROR", "ERROR: Invoicing the fee items was not successful.  Reason: " + invoiceResult.getErrorMessage());
            //else
            //	logDebug("Invoicing assessed fee items is successful.");
        }

    }

    logDebug("Total CAPS qualified date range: " + myExp.length);
    logDebug("Ignored due to application type: " + capFilterType);
    logDebug("Ignored due to CAP Status: " + capFilterStatus);
    logDebug("Ignored due to Other: " + capFilterOther);
    logDebug("Total CAPS processed: " + capCount);
}


/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

/* The following scripts are used to run EMSE Scripts */
function token(tstr) {
    if (!disableTokens) {
        re = new RegExp("\\{", "g"); tstr = String(tstr).replace(re, "AInfo[\"");
        re = new RegExp("\\}", "g"); tstr = String(tstr).replace(re, "\"]");
        //tstr = String(tstr).replace("showDebug","showMessage");
    }
    return String(tstr);
}

function debugObject(object) {
    var output = '';
    for (property in object) {
        output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" + '; ' + "<BR>";
    }
    logDebug(output);
}

function isTaskActive(wfstr) // optional process name
{
    var useProcess = false;
    var processName = "";
    if (arguments.length == 2) {
        processName = arguments[1]; // subprocess
        useProcess = true;
    }

    var workflowResult = aa.workflow.getTasks(capId);
    if (workflowResult.getSuccess())
        wfObj = workflowResult.getOutput();
    else
    { logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }

    for (i in wfObj) {
        fTask = wfObj[i];
        if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && (!useProcess || fTask.getProcessCode().equals(processName)))
            if (fTask.getActiveFlag().equals("Y"))
                return true;
            else
                return false;
    }
}

function logGlobals(globArray) {

    for (loopGlob in globArray)
        logDebug("{" + loopGlob + "} = " + globArray[loopGlob])
}

function branch(stdChoice) {
    doStandardChoiceActions(stdChoice, true, 0);
}

function pairObj(actID) {
    this.ID = actID;
    this.cri = null;
    this.act = null;
    this.elseact = null;
    this.enabled = true;
    this.continuation = false;
    this.branch = new Array();

    this.load = function (loadStr) {
        //
        // load() : tokenizes and loades the criteria and action
        //
        loadArr = loadStr.split("\\^");
        if (loadArr.length < 2 || loadArr.length > 3) {
            logMessage("**ERROR: The following Criteria/Action pair is incorrectly formatted.  Two or three elements separated by a caret (\"^\") are required. " + br + br + loadStr)
        }
        else {
            this.cri = loadArr[0];
            this.act = loadArr[1];
            this.elseact = loadArr[2];

            if (this.cri.length() == 0) this.continuation = true; // if format is like ("^action...") then it's a continuation of previous line

            var a = loadArr[1];
            var bb = a.indexOf("branch");
            //while (!enableVariableBranching && bb >= 0)
            while (bb >= 0) {
                var cc = a.substring(bb);
                var dd = cc.indexOf("\")");
                this.branch.push(cc.substring(8, dd));
                a = cc.substring(dd);
                bb = a.indexOf("branch");
            }

        }
    }
}

function docWrite(dstr, header, indent) {
    var istr = "";
    for (i = 0; i < indent; i++)
        istr += "|  ";
    if (header && dstr)
        aa.print(istr + "------------------------------------------------");
    if (dstr) aa.print(istr + dstr);
    if (header)
        aa.print(istr + "------------------------------------------------");
}

function appMatch(ats) {
    var isMatch = true;
    var ata = ats.split("/");
    if (ata.length != 4)
        logDebug("ERROR in appMatch.  The following Application Type String is incorrectly formatted: " + ats);
    else
        for (xx in ata) {
            if (!ata[xx].equals(appTypeArray[xx]) && !ata[xx].equals("*")) {
                isMatch = false;
            }
        }
    return isMatch;
}

function updateAppStatus(stat, cmt) {
    updateStatusResult = aa.cap.updateAppStatus(capId, "APPLICATION", stat, sysDate, cmt, systemUserObj);
    if (!updateStatusResult.getSuccess())
    //logDebug("Updated application status to " + stat + " successfully.");
    //	else
        logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is " + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
}

function updateTask(wfstr, wfstat, wfcomment, wfnote)  // uses wfObjArray
{
    if (!wfstat) wfstat = "NA";

    for (i in wfObjArray) {
        fTask = wfObjArray[i];
        if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())) {
            dispositionDate = aa.date.getCurrentDate();
            stepnumber = fTask.getStepNumber();
            // try status U here for disp flag?
            aa.workflow.handleDisposition(capId, stepnumber, wfstat, dispositionDate, wfnote, wfcomment, systemUserObj, "U");
            logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
        }
    }
}

function addAllFees(fsched, fperiod, fqty, finvoice) // Adds all fees for a given fee schedule
{
    var arrFees = aa.finance.getFeeItemList(null, fsched, null).getOutput();
    for (xx in arrFees) {
        var feeCod = arrFees[xx].getFeeCod();
        assessFeeResult = aa.finance.createFeeItem(capId, fsched, feeCod, fperiod, fqty);
        if (assessFeeResult.getSuccess()) {
            feeSeq = assessFeeResult.getOutput();

            //logDebug("Added Fee " + feeCod + ", Qty " + fqty);
            if (finvoice == "Y") {
                feeSeqList.push(feeSeq);
                paymentPeriodList.push(fperiod);
            }
        }
        else {
            logDebug("ERROR: assessing fee (" + feeCod + "): " + assessFeeResult.getErrorMessage());
        }
    } // for xx
} // function

function addFee(fcode, fsched, fperiod, fqty, finvoice) // Adds a single fee, returns the fee descriptitem
{
    assessFeeResult = aa.finance.createFeeItem(capId, fsched, fcode, fperiod, fqty);
    if (assessFeeResult.getSuccess()) {
        feeSeq = assessFeeResult.getOutput();
        //logDebug("Added Fee " + fcode + ", Qty " + fqty + ", feeSeq " + feeSeq);
        if (invoiceFees == "Y") {
            feeSeqList.push(feeSeq);
            paymentPeriodList.push(fperiod);
        }
        return aa.finance.getFeeItemByPK(capId, feeSeq).getOutput()

    }
    else {
        logDebug("ERROR: assessing fee (" + fcode + "): " + assessFeeResult.getErrorMessage());
        return null
    }
}

function updateFee(fcode, fsched, fperiod, fqty, finvoice) // Updates a fee with a new Qty.  If it doesn't exist, adds it
{
    //removeFee(fcode, fperiod); //due to the issue of new fee schedules we're going to remove and then add
    logDebug("In updateFee");
    feeUpdated = false;
    getFeeResult = aa.finance.getFeeItemByFeeCode(capId, fcode, fperiod);
    if (getFeeResult.getSuccess()) {
        feeListA = getFeeResult.getOutput();
        for (feeNum in feeListA)
            if (feeListA[feeNum].getFeeitemStatus().equals("NEW") && !feeUpdated)  // update this fee item
            {
                feeSeq = feeListA[feeNum].getFeeSeqNbr();
                editResult = aa.finance.editFeeItemUnit(capId, fqty, feeSeq);
                feeUpdated = true;
                if (editResult.getSuccess()) {
                    logDebug("Updated Qty on Existing Fee Item: " + fcode + " to Qty: " + fqty + ", feeSeq " + feeSeq);
                    //aa.finance.calculateFees(capId);
                    if (invoiceFees == "Y") {
                        feeSeqList.push(feeSeq);
                        paymentPeriodList.push(fperiod);
                    }
                }
                else
                { logDebug("ERROR: updating qty on fee item (" + fcode + "): " + editResult.getErrorMessage()); break }
            }
    }
    else
    { logDebug("ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage()) }

    if (!feeUpdated) // no existing fee, so update
        addFee(fcode, fsched, fperiod, fqty, finvoice);
}

function elapsed() {
    var thisDate = new Date();
    var thisTime = thisDate.getTime();
    return ((thisTime - startTime) / 1000)
}

function logDebug(dstr) {
    if (showDebug) {
        aa.print(dstr)
        emailText += dstr + "<br>";
        aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr)
    }
}

function appSpecific() {
    //
    // Returns an associative array of App Specific Info
    //
    appArray = new Array();
    var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
    if (appSpecInfoResult.getSuccess()) {
        var fAppSpecInfoObj = appSpecInfoResult.getOutput();

        for (loopk in fAppSpecInfoObj)
            appArray[fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
    }
    return appArray;
}

function dateAdd(td, amt)
// perform date arithmetic on a string
// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
// amt can be positive or negative (5, -3) days
// if optional parameter #3 is present, use working days only
{

    useWorking = false;
    if (arguments.length == 3)
        useWorking = true;

    if (!td)
        dDate = new Date();
    else
        dDate = new Date(td);
    i = 0;
    if (useWorking)
        while (i < Math.abs(amt)) {
            dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
            if (dDate.getDay() > 0 && dDate.getDay() < 6)
                i++
        }
    else
        dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));

    return (dDate.getMonth() + 1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
}

function getCapId(pid1, pid2, pid3) {

    var s_capResult = aa.cap.getCapID(pid1, pid2, pid3);
    if (s_capResult.getSuccess())
        return s_capResult.getOutput();
    else {
        logDebug("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());
        return null;
    }
}

function loopTask(wfstr, wfstat, wfcomment, wfnote) // uses wfObjArray  -- optional process name
{
    var useProcess = false;
    var processName = "";
    if (arguments.length == 5) {
        processName = arguments[4]; // subprocess
        useProcess = true;
    }

    for (i in wfObjArray) {
        fTask = wfObjArray[i];
        if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && (!useProcess || fTask.getProcessCode().equals(processName))) {
            dispositionDate = aa.date.getCurrentDate();
            stepnumber = fTask.getStepNumber();
            processID = fTask.getProcessID();

            if (useProcess)
                aa.workflow.handleDisposition(capId, stepnumber, processID, wfstat, dispositionDate, wfnote, wfcomment, systemUserObj, "L");
            else
                aa.workflow.handleDisposition(capId, stepnumber, wfstat, dispositionDate, wfnote, wfcomment, systemUserObj, "L");

            logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat + ", Looping...");
        }
    }
}

function getParam(pParamName) //gets parameter value and logs message showing param value
{
    var ret = "" + aa.env.getValue(pParamName);
    logDebug("Parameter : " + pParamName + " = " + ret);
    return ret;
}

function isNull(pTestValue, pNewValue) {
    if (pTestValue == null || pTestValue == "")
        return pNewValue;
    else
        return pTestValue;
}

function taskEditStatus(wfstr, wfstat, wfcomment, wfnote, pFlow, pProcess) //Batch version of function
{
    //Needs isNull function
    //pProcess not coded yet
    //
    pFlow = isNull(pFlow, "U"); //If no flow control specified, flow is "U" (Unchanged)
    var dispositionDate = aa.date.getCurrentDate();

    for (i in wfObjArray) {
        if (wfstr.equals(wfObjArray[i].getTaskDescription())) {
            var stepnumber = wfObjArray[i].getStepNumber();
            aa.workflow.handleDisposition(capId, stepnumber, wfstat, dispositionDate, wfnote, wfcomment, systemUserObj, pFlow);
            logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
        }
    }
}

function jsDateToMMDDYYYY(pJavaScriptDate) {
    //converts javascript date to string in MM/DD/YYYY format
    //
    if (pJavaScriptDate != null) {
        if (Date.prototype.isPrototypeOf(pJavaScriptDate))
            return (pJavaScriptDate.getMonth() + 1).toString() + "/" + pJavaScriptDate.getDate() + "/" + pJavaScriptDate.getFullYear();
        else {
            logDebug("Parameter is not a javascript date");
            return ("INVALID JAVASCRIPT DATE");
        }
    }
    else {
        logDebug("Parameter is null");
        return ("NULL PARAMETER VALUE");
    }
}

function jsDateToYYYYMMDD(pJavaScriptDate) {
    //converts javascript date to string in YYYY-MM-DD format
    //
    if (pJavaScriptDate != null) {
        if (Date.prototype.isPrototypeOf(pJavaScriptDate))
            return pJavaScriptDate.getFullYear() + "-" + (pJavaScriptDate.getMonth() + 1).toString() + "-" + pJavaScriptDate.getDate();
        else {
            logDebug("Parameter is not a javascript date");
            return ("INVALID JAVASCRIPT DATE");
        }
    }
    else {
        logDebug("Parameter is null");
        return ("NULL PARAMETER VALUE");
    }
}

function taskStatus(wfstr) {
    //Batch version of taskStatus -- uses global var wfObjArray
    // optional process name
    // returns false if task not found
    var useProcess = false;
    var processName = "";
    if (arguments.length == 2) {
        processName = arguments[1]; // subprocess
        useProcess = true;
    }

    for (i in wfObjArray) {
        var fTask = wfObjArray[i];
        if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && (!useProcess || fTask.getProcessCode().equals(processName)))
            return fTask.getDisposition()
    }
    return false;
}


function isTaskStatus(wfstr, wfstat) // optional process name...BATCH Version uses wfObjArray
{
    var useProcess = false;
    var processName = "";
    if (arguments.length > 2) {
        processName = arguments[2]; // subprocess
        useProcess = true;
    }

    for (i in wfObjArray) {
        fTask = wfObjArray[i];
        if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && (!useProcess || fTask.getProcessCode().equals(processName)))
            if (fTask.getDisposition() != null) {
                if (fTask.getDisposition().toUpperCase().equals(wfstat.toUpperCase()))
                    return true;
                else
                    return false;
            }
    }
    return false;
}


function nextWorkDay(td)
// uses app server to return the next work day.
// Only available in 6.3.2
// td can be "mm/dd/yyyy" (or anything that will convert to JS date)
{

    if (!td)
        var dDate = new Date();
    else
        var dDate = new Date(td);

    if (!aa.calendar.getNextWorkDay) {
        aa.print("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
    }
    else {
        var dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth() + 1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
    }

    return (dDate.getMonth() + 1) + "/" + dDate.getDate() + "/" + dDate.getFullYear(); ;
}

// exists:  return true if Value is in Array
//
function exists(eVal, eArray) {
    for (ii in eArray)
        if (eArray[ii] == eVal) return true;
    return false;
}


function getLicenseCapId(licenseCapType) {
    var itemCap = capId
    if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

    var capLicenses = getLicenseProfessional(itemCap);
    if (capLicenses == null || capLicenses.length == 0) {
        return;
    }

    for (var capLic in capLicenses) {
        var LPNumber = capLicenses[capLic].getLicenseNbr()
        var lpCapResult = aa.cap.getCapID(LPNumber);
        if (!lpCapResult.getSuccess())
        { logDebug("**ERROR: No cap ID associated with License Number : " + LPNumber); continue; }
        licCapId = lpCapResult.getOutput();
        if (appMatch(licenseCapType, licCapId))
            return licCapId;
    }
}