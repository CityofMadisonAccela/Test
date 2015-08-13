/*------------------------------------------------------------------------------------------------------/
| SVN $Id: ACABefore.js 6515 2013-03-22 18:15:38Z jeff.moyer $
| Program : ACABeforeV2.0.js
| Event   : ACABefore
|
| Usage   : Master Script by Accela.  See accompanying documentation and release notes.
|
| Client  : Madison, Wisconsin
| Action# : N/A
|
| Notes   : None
|
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
| START User Configurable Parameters
|
|     Only variables in the following section may be changed.  If any other section is modified, this
|     will no longer be considered a "Master" script and will not be supported in future releases.  If
|     changes are made, please add notes above.
/------------------------------------------------------------------------------------------------------*/
var showMessage = true;						// Set to true to see results in popup window
var showDebug = true;							// Set to true to see debug messages in popup window
var preExecute = "PreExecuteForBeforeEvents"
var controlString = "ACABEFORE";		// Standard choice for control
var documentOnly = false;						// Document Only -- displays hierarchy of std choice steps
var disableTokens = false;						// turn off tokenizing of std choices (enables use of "{} and []")
var useAppSpecificGroupName = true;			// Use Group name when populating App Specific Info Values
var useTaskSpecificGroupName = false;			// Use Group name when populating Task Specific Info Values
var enableVariableBranching = true;			// Allows use of variable names in branching.  Branches are not followed in Doc Only
var maxEntries = 99;							// Maximum number of std choice entries.  Entries must be Left Zero Padded
/*------------------------------------------------------------------------------------------------------/
| END User Configurable Parameters
/------------------------------------------------------------------------------------------------------*/
var SCRIPT_VERSION = 2.0

if (documentOnly) {
	doStandardChoiceActions(controlString,false,0);
	aa.env.setValue("ScriptReturnCode", "0");
	aa.env.setValue("ScriptReturnMessage", "Documentation Successful.  No actions executed.");
	aa.abortScript();
	}
	
function getScriptText(vScriptName){
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(),vScriptName,"ADMIN");
	return emseScript.getScriptText() + "";
}

/*------------------------------------------------------------------------------------------------------/
| BEGIN Event Specific Variables
/------------------------------------------------------------------------------------------------------*/
var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"");
var cancel = false;
var startDate = new Date();
var startTime = startDate.getTime();
var message = "";
var debug = "";
var br = "<BR>";
var feeSeqList = new Array();
var paymentPeriodList = new Array();

var cap = aa.env.getValue("CapModel");
var capId = cap.getCapID();
var servProvCode = capId.getServiceProviderCode();
var publicUser = false ;
var currentUserID = aa.env.getValue("CurrentUserID");
if (currentUserID.indexOf("PUBLICUSER") == 0) {
	currentUserID = "ADMIN"; 
	publicUser = true
}
var capIDString = capId.getCustomID();
var systemUserObj = aa.person.getUser(currentUserID).getOutput();
var appTypeResult = cap.getCapType();
var appTypeString = appTypeResult.toString();
var appTypeArray = appTypeString.split("/");
var currentUserGroup;
var currentUserGroupObj = aa.userright.getUserRight(appTypeArray[0],currentUserID).getOutput()
if (currentUserGroupObj) currentUserGroup = currentUserGroupObj.getGroupName();
var capName = cap.getSpecialText();
var capStatus = cap.getCapStatus();
var parcelArea = 0;
var estValue = 0; 
var calcValue = 0; 
var feeFactor;
var valobj = aa.finance.getContractorSuppliedValuation(capId,null).getOutput();

if (valobj.length) {
	estValue = valobj[0].getEstimatedValue();
	calcValue = valobj[0].getCalculatedValue();
	feeFactor = valobj[0].getbValuatn().getFeeFactorFlag();
	}

var balanceDue = 0 ; 
var houseCount = 0; 
var feesInvoicedTotal = 0;
var capDetail = "";
var capDetailObjResult = aa.cap.getCapDetail(capId);
if (capDetailObjResult.getSuccess()) {
	capDetail = capDetailObjResult.getOutput();
	var houseCount = capDetail.getHouseCount();
	var feesInvoicedTotal = capDetail.getTotalFee();
	var balanceDue = capDetail.getBalance();
}

var AInfo = new Array();
loadAppSpecific4ACA(AInfo);
//loadASITables();
loadASITables4ACA();

/* Need to add get parent Id whether it is an amendment or a renewal or an EST
var projResult = aa.cap.getProjectByChildCapID(capId,"Renewal","Incomplete");
if (projResult.getSuccess()) {
	cancel = true;
	debugObject(project);
}
*/

logDebug("<B>EMSE Script Results for " + capIDString + "</B>");
logDebug("capId = " + capId.getClass());
logDebug("cap = " + cap.getClass());
logDebug("currentUserID = " + currentUserID);
logDebug("currentUserGroup = " + currentUserGroup);
logDebug("systemUserObj = " + systemUserObj.getClass());
logDebug("appTypeString = " + appTypeString);
logDebug("capName = " + capName);
logDebug("capStatus = " + capStatus);
logDebug("sysDate = " + sysDate.getClass());
logDebug("sysDateMMDDYYYY = " + sysDateMMDDYYYY);
logDebug("parcelArea = " + parcelArea);
logDebug("estValue = " + estValue);
logDebug("calcValue = " + calcValue);
logDebug("feeFactor = " + feeFactor);
logDebug("houseCount = " + houseCount);
logDebug("feesInvoicedTotal = " + feesInvoicedTotal);
logDebug("balanceDue = " + balanceDue);

var documentModelArray = aa.env.getValue("DocumentModelList");
	logDebug("documentModelArray = " + documentModelArray);
var documentUploadedFrom = aa.env.getValue("From");
	logDebug("documentUploadedFrom = " + documentUploadedFrom);
var documentUploadStatus =  aa.env.getValue("UploadStatus");
	logDebug("documentUploadStatus : " + documentUploadStatus);

/*------------------------------------------------------------------------------------------------------/
| END Event Specific Variables
/------------------------------------------------------------------------------------------------------*/

if (preExecute.length) doStandardChoiceActions(preExecute,true,0);

logGlobals(AInfo);

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
//
//  Get the Standard choices entry we'll use for this App type
//  Then, get the action/criteria pairs for this app
//
doStandardChoiceActions(controlString,true,0);
//
// Check for invoicing of fees
//
if (feeSeqList.length)
	{
	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
	if (invoiceResult.getSuccess())
		logMessage("Invoicing assessed fee items is successful.");
	else
		logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
	}
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/
if (debug.indexOf("**ERROR") > 0) {
	aa.env.setValue("ErrorCode", "1");
	aa.env.setValue("ErrorMessage", debug);
} else {
	if (cancel) {
		aa.env.setValue("ErrorCode", "-2");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	} else {
		aa.env.setValue("ErrorCode", "0");
		if (showMessage) aa.env.setValue("ErrorMessage", message);
		if (showDebug) 	aa.env.setValue("ErrorMessage", debug);
	}
}
/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

function loadAppSpecific4ACA(thisArr) {
	//
	// Returns an associative array of App Specific Info
	// Optional second parameter, cap ID to load from
	//
	// uses capModel in this event
	var itemCap = capId;
	if (arguments.length >= 2) {
		itemCap = arguments[1]; // use cap ID specified in args
		var fAppSpecInfoObj = aa.appSpecificInfo.getByCapID(itemCap).getOutput();
		for (loopk in fAppSpecInfoObj) {
			if (useAppSpecificGroupName)
				thisArr[fAppSpecInfoObj[loopk].getCheckboxType() + "." + fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
			else
				thisArr[fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
		}
	} else {
		var i= cap.getAppSpecificInfoGroups().iterator();
		while (i.hasNext()) {
			var group = i.next();
			var fields = group.getFields();
			if (fields != null) {
				var iteFields = fields.iterator();
				while (iteFields.hasNext()) {
					var field = iteFields.next();
					if (useAppSpecificGroupName)
						thisArr[field.getCheckboxType() + "." + field.getCheckboxDesc()] = field.getChecklistComment();
					else
						thisArr[field.getCheckboxDesc()] = field.getChecklistComment();
				}
			}
		}
	}
}

function loadASITables4ACA() {
 	// Loads App Specific tables into their own array of arrays.  Creates global array objects
	// Optional parameter, cap ID to load from.  If no CAP Id specified, use the capModel
	var itemCap = capId;
	if (arguments.length == 1) {
		itemCap = arguments[0]; // use cap ID specified in args
		var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
		var ta = gm.getTablesArray();
		var tai = ta.iterator();
	} else {
		var gm = cap.getAppSpecificTableGroupModel();
		if (gm == null) {
			gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
			var ta = gm.getTablesArray();
			var tai = ta.iterator();
		} else {
			var ta = gm.getTablesMap();
			var tai = ta.values().iterator();
		}
	}
	while (tai.hasNext()) {
	  var tsm = tai.next();
	  if (tsm.rowIndex.isEmpty()) continue;  // empty table
	  var tempObject = new Array();
	  var tempArray = new Array();
	  var tn = tsm.getTableName();
	  tn = String(tn).replace(/[^a-zA-Z0-9]+/g,'');
	  if (!isNaN(tn.substring(0,1))) tn = "TBL" + tn  // prepend with TBL if it starts with a number
	var tsmfldi = tsm.getTableField().iterator();
	var tsmcoli = tsm.getColumns().iterator();
	var numrows = 1;
	while (tsmfldi.hasNext()) {// cycle through fields
		if (!tsmcoli.hasNext()) {// cycle through columns
			var tsmcoli = tsm.getColumns().iterator();
			tempArray.push(tempObject);  // end of record
			var tempObject = new Array();  // clear the temp obj
			numrows++;
		}
		var tcol = tsmcoli.next();
		var tval = tsmfldi.next().getInputValue();
		tempObject[tcol.getColumnName()] = tval;
	}
	tempArray.push(tempObject);  // end of record
	var copyStr = "" + tn + " = tempArray";
	logDebug("ASI Table Array : " + tn + " (" + numrows + " Rows)");
	eval(copyStr);  // move to table name
	}
}

function loadASITables() {
	// Loads App Specific tables into their own array of arrays.  Creates global array objects
	// Optional parameter, cap ID to load from
	var itemCap = capId;
	if (arguments.length == 1) itemCap = arguments[0]; // use cap ID specified in args
	var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
	var ta = gm.getTablesArray()
	var tai = ta.iterator();
	while (tai.hasNext()) {
	  var tsm = tai.next();
	  var tempObject = new Array();
	  var tempArray = new Array();
	  var tn = tsm.getTableName();
 	  var numrows = 0;
	  tn = String(tn).replace(/[^a-zA-Z0-9]+/g,'');
	  if (!isNaN(tn.substring(0,1))) tn = "TBL" + tn  // prepend with TBL if it starts with a number
	  if (!tsm.rowIndex.isEmpty()) {
	  	  var tsmfldi = tsm.getTableField().iterator();
		  var tsmcoli = tsm.getColumns().iterator();
		  var readOnlyi = tsm.getAppSpecificTableModel().getReadonlyField().iterator(); // get Readonly filed
		  var numrows = 1;
		  while (tsmfldi.hasNext()) {//cycle through fields
			if (!tsmcoli.hasNext()) { //cycle through columns
				var tsmcoli = tsm.getColumns().iterator();
				tempArray.push(tempObject);  // end of record
				var tempObject = new Array();  // clear the temp obj
				numrows++;
			}
			var tcol = tsmcoli.next();
			var tval = tsmfldi.next();
			var readOnly = 'N';
			if (readOnlyi.hasNext()) {
				readOnly = readOnlyi.next();
			}
			var fieldInfo = new asiTableValObj(tcol.getColumnName(), tval, readOnly);
			tempObject[tcol.getColumnName()] = fieldInfo;
			//tempObject[tcol.getColumnName()] = tval;
			}
			tempArray.push(tempObject);  // end of record
		}
		var copyStr = "" + tn + " = tempArray";
		logDebug("ASI Table Array : " + tn + " (" + numrows + " Rows)");
		eval(copyStr);  // move to table name
	}
}

function branch(stdChoice) {
	doStandardChoiceActions(stdChoice,true,0);
}

function doStandardChoiceActions(stdChoiceEntry, doExecution, docIndent) {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	var lastEvalTrue = false;
	stopBranch = false;
	logDebug("Executing: " + stdChoiceEntry + ", Elapsed Time: " + ((thisTime - startTime) / 1000) + " Seconds")
	var pairObjArray = getScriptAction(stdChoiceEntry);
	if (!doExecution) docWrite(stdChoiceEntry, true, docIndent);
	for (xx in pairObjArray) {
		doObj = pairObjArray[xx];
		if (doExecution) {
			if (doObj.enabled) {
				if (stopBranch) {
					stopBranch = false;
					break;
				}
				logDebug(aa.env.getValue("CurrentUserID") + " : " + stdChoiceEntry + " : #" + doObj.ID + " : Criteria : " + doObj.cri, 2)
				if (eval(token(doObj.cri)) || (lastEvalTrue && doObj.continuation)) {
					logDebug(aa.env.getValue("CurrentUserID") + " : " + stdChoiceEntry + " : #" + doObj.ID + " : Action : " + doObj.act, 2)
					eval(token(doObj.act));
					lastEvalTrue = true;
				} else {
					if (doObj.elseact) {
						logDebug(aa.env.getValue("CurrentUserID") + " : " + stdChoiceEntry + " : #" + doObj.ID + " : Else : " + doObj.elseact, 2)
						eval(token(doObj.elseact));
					}
					lastEvalTrue = false;
				}
			}
		} else {
			docWrite("|  ", false, docIndent);
			var disableString = "";
			if (!doObj.enabled) disableString = "<DISABLED>";
			if (doObj.elseact)
				docWrite("|  " + doObj.ID + " " + disableString + " " + doObj.cri + " ^ " + doObj.act + " ^ " + doObj.elseact, false, docIndent);
			else
				docWrite("|  " + doObj.ID + " " + disableString + " " + doObj.cri + " ^ " + doObj.act, false, docIndent);

			for (yy in doObj.branch) {
				doStandardChoiceActions(doObj.branch[yy], false, docIndent + 1);
			}
		}
	}
	if (!doExecution) docWrite(null, true, docIndent);
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	logDebug("Finished: " + stdChoiceEntry + ", Elapsed Time: " + ((thisTime - startTime) / 1000) + " Seconds")
}

function getScriptAction(strControl) {
	var actArray = new Array();
	var maxLength = String("" + maxEntries).length;
	
	var bizDomScriptResult = aa.bizDomain.getBizDomain(strControl);
	
	if (bizDomScriptResult.getSuccess())
		{
		bizDomScriptArray = bizDomScriptResult.getOutput().toArray()
		
		for (var i in bizDomScriptArray)
			{
			// this list is sorted the same as the UI, no reason to re-sort
			
			var myObj= new pairObj(bizDomScriptArray[i].getBizdomainValue());
			myObj.load(bizDomScriptArray[i].getDescription());
			if (bizDomScriptArray[i].getAuditStatus() == 'I') myObj.enabled = false;
			actArray.push(myObj);
			}
		}
	return actArray;
}

function token(tstr) {
	if (!disableTokens) {
		re = new RegExp("\\{","g") ; tstr = String(tstr).replace(re,"AInfo[\"");
		re = new RegExp("\\}","g") ; tstr = String(tstr).replace(re,"\"]");
	}
	return String(tstr);
}

function docWrite(dstr,header,indent) {
	var istr = "";
	for (i = 0 ; i < indent ; i++)
		istr+="|  ";
	if (header && dstr)
		aa.print(istr + "------------------------------------------------");
	if (dstr) aa.print(istr + dstr);
	if (header)
		aa.print(istr + "------------------------------------------------");
}

function logDebug(dstr) {
	vLevel = 1
	if (arguments.length > 1)
		vLevel = arguments[1];
	if ((showDebug & vLevel) == vLevel || vLevel == 1)
		debug += dstr + br;
	if ((showDebug & vLevel) == vLevel)
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"), dstr);
}

function logGlobals(globArray) {
	for (loopGlob in globArray)
		logDebug("{" + loopGlob + "} = " + globArray[loopGlob])
}

function logMessage(dstr) {
	message+=dstr + br;
}

function comment(cstr) {
	if (showDebug) logDebug(cstr);
	if (showMessage) logMessage(cstr);
}

function lookup(stdChoice,stdValue) {
	var strControl;
	var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice,stdValue);
	
   	if (bizDomScriptResult.getSuccess())
   		{
		var bizDomScriptObj = bizDomScriptResult.getOutput();
		strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
		logDebug("lookup(" + stdChoice + "," + stdValue + ") = " + strControl);
		}
	else
		{
		logDebug("lookup(" + stdChoice + "," + stdValue + ") does not exist");
		}
	return strControl;
}

function pairObj(actID) {
	this.ID = actID;
	this.cri = null;
	this.act = null;
	this.elseact = null;
	this.enabled = true;
	this.continuation = false;
	this.branch = new Array();
	this.load = function(loadStr) {
		//
		// load() : tokenizes and loades the criteria and action
		//
		loadArr = loadStr.split("\\^");
		if (loadArr.length < 2 || loadArr.length > 3) {
			logMessage("**ERROR: The following Criteria/Action pair is incorrectly formatted.  Two or three elements separated by a caret (\"^\") are required. " + br + br + loadStr)
		} else {
			this.cri     = loadArr[0];
			this.act     = loadArr[1];
			this.elseact = loadArr[2];
			if (this.cri.length() == 0) this.continuation = true; // if format is like ("^action...") then it's a continuation of previous line
			var a = loadArr[1];
			var bb = a.indexOf("branch");
			while (!enableVariableBranching && bb >= 0) {
			  var cc = a.substring(bb);
			  var dd = cc.indexOf("\")");
			  this.branch.push(cc.substring(8,dd));
			  a = cc.substring(dd);
			  bb = a.indexOf("branch");
			}
		}
	}
}

function debugObject(object) {
	var output = ''; 
	for (property in object) {
		output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	}
	logDebug(output);
}

function dateFormatted(pMonth,pDay,pYear,pFormat) {
//returns date string formatted as YYYY-MM-DD or MM/DD/YYYY (default)
	var mth = "";
	var day = "";
	var ret = "";
	if (pMonth > 9)
		mth = pMonth.toString();
	else
		mth = "0"+pMonth.toString();
	
	if (pDay > 9)
		day = pDay.toString();
	else
		day = "0"+pDay.toString();

	if (pFormat=="YYYY-MM-DD")
		ret = pYear.toString()+"-"+mth+"-"+day;
	else
		ret = ""+mth+"/"+day+"/"+pYear.toString();

	return ret;
	}