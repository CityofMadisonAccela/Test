/*------------------------------------------------------------------------------------------------------/
| Program: LicenseScriptV1.0.js  Trigger: Batch    
| Client: DCDOH     			 Request # SR
| 
| Version 1.0 - Base Version. Modified from BatchLicenseBeforeExpireV1.0.js.   10/25/07 Jschomp
|   Version 1.1 - Modified to add fee processing based upon configured renewal info 3/18/08 DQuatacker
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var showDebug = true;					// Set to true to see debug messages in email confirmation
var maxSeconds = 1 * 60;				// number of seconds allowed for batch processing
var autoInvoiceFees = "Y";

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("batchJobName");
var emailText = "";

batchJobID = 0;
if (batchJobResult.getSuccess())
  {
  batchJobID = batchJobResult.getOutput();
  logMessage("START","Batch Job " + batchJobName + " Job ID is " + batchJobID);
  }
else
  logMessage("WARNING","Batch job ID not found " + batchJobResult.getErrorMessage());


/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var appName = getParam("appName");          // Application name to search for Group/Type/SubType/Category wildcard is allowed.
var fromDate = getParam("fromDate");		// Should be used only for testing. not
var toDate = getParam("toDate");			//   scheduled batch jobs
var licenseStatus = getParam("licenseStatus");	// Statuses to process,comma separated {Renewed,Delinquent}
//var licenseCode = getParam("licenseCode");		// License code to process
var lookAheadDays = getParam("lookAheadDays");   		// Number of days from today {90}
var daySpan = getParam("daySpan");			// Days to search {7}
                                                          // days past current date
var newRenewalStatus = getParam("newRenewalStatus");// Change renewal status to this {Delinquent}
var editWorkflowTask = getParam("editWorkflowTask");// Open this task {License Status},        
var newWorkflowStatus = getParam("newWorkflowStatus"); // change to this status {Delinquent}
var workflowFlowCode = getParam("workflowFlowCode"); // Flow code for above status {U}
var feeType = getParam("feeType")               // Renewal or Penalty or Null
var emailAddress = getParam("emailAddress");	// email to send batch job log
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var timeExpired = false;
var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
// for invoicing
var feeSeqList;
var paymentPeriodList;

if (!fromDate.length) // no "from" date, assume today + number of days to look ahead
	fromDate = dateAdd(null,parseInt(lookAheadDays));

if (!toDate.length)  // no "to" date, assume today + number of look ahead days + span
	toDate = dateAdd(null,parseInt(lookAheadDays)+parseInt(daySpan));

logDebug("fromDate: " + fromDate + "  toDate: " + toDate);

//Validate workflow parameters
var paramsOK = true;
var taskArray = editWorkflowTask.split(",");
//var statusArray = editWorkflowStatus.split(",");
var newStatusArray = newWorkflowStatus.split(",");
var flowArray = workflowFlowCode.split(",");
if ( !(taskArray.length==newStatusArray.length && taskArray.length==flowArray.length) )
	{
	logMessage("ERROR","ERROR: Script cannot run. The number of values in editWorkflowTask, newWorkflowStatus, workflowFlowCode must match.");
	paramsOK = false;
	}
/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
| 
/-----------------------------------------------------------------------------------------------------*/

if (paramsOK)
	{
	logMessage("START","Start of Job");

	var licStat = licenseStatus.split(",");
	for (icount in licStat)
		if (!timeExpired) expireLicenses(licStat[icount]);

	logMessage("END","End of Job: Elapsed Time : " + elapsed() + " Seconds");
	}

if (emailAddress.length) 
	aa.sendMail("noreply@accela.com", emailAddress, "", batchJobName + " License Renewal Results", emailText);
		
/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

function expireLicenses(licStat)
	{
	var capCount = 0;
	var expResult = aa.expiration.getLicensesByDate(licStat,fromDate,toDate);
	
	if (expResult.getSuccess())
		myExp = expResult.getOutput();
	else
		{ logMessage("ERROR","ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()) ; return false }

	for (zzz in myExp)  // for each b1expiration (effectively, each license app)
		{
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
			{ 
			logMessage("WARNING","A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
			timeExpired = true ;
			break; 
			}
		
		feeSeqList = new Array();
		paymentPeriodList = new Array();
		// get license details
		capId = myExp[zzz].getCapID();	
		expCode = myExp[zzz].getExpCode();
		
		// This doesn't work: capIDshow = capId.getCustomID().  Must use workaround, START:
		var capId1 = capId.getID1();	
		var capId2 = capId.getID2();		
		var capId3 = capId.getID3();			
		var capIdObject = getCapId(capId1,capId2,capId3); // call internal function
		var capIDshow = capIdObject.getCustomID(); // this method works
		// workaround END
		cap = aa.cap.getCap(capId).getOutput();
		appTypeResult = cap.getCapType();
		appTypeString = appTypeResult.toString();
		appTypeArray = appTypeString.split("/");	
		
	
		//if (licenseCode != "" && !licenseCode.equals(expCode) && !appMatch(appName)) // not correct license code
		if(!appMatch(appName))
			continue;
			
	  	logDebug("Performing Expiration Actions for Cap " + capIDshow + " Expiration code: " + expCode);
		capCount++;

        lic = new licenseObject(null); //populate license Object
        
		//change Expiration Status to newRenewalStatus
		if (newRenewalStatus.length)
			{
			lic.setStatus(newRenewalStatus);
			}
		
		//Update workflow task(s)
		if (editWorkflowTask.length) //get cap's workflow tasks
			{
			var workflowResult = aa.workflow.getTasks(capId); 
			if ( workflowResult.getSuccess() )
				{
				wfObjArray = workflowResult.getOutput(); //array used in taskEditStatus function body
			
				for (ww in taskArray)
					activateTask(taskArray[ww]); //first activate tasks 
					
				if (editWorkflowTask.length && newWorkflowStatus.length && workflowFlowCode.length) //then update statuses
					{
					for (ss in newStatusArray)
						{
							taskEditStatus(taskArray[ss],newStatusArray[ss],"Updated by Batch Job: "+batchJobName,"Updated by Batch Job: "+batchJobName,flowArray[ss],null);
						}
					}
				}
			else
				{
				logMessage("ERROR","ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage());
				}
			}
			
			
		//
		//Add and invoice Fees
		//
		logDebug("FEECODE:" + lic.getRenewFeeCode() + " FEECODE:" + lic.getPenaltyFeeCode() + " FEEGROUP:" + lic.getPayPeriod())
		if (feeType.length) // We're doing some sort of fee
			{
			    appFeeSched = lookup("BATCH:FeeScheduleLookup",appTypeString)
			    if (appFeeSched != null)
			    {
			        if (feeType == "Renewal" && lic.getRenewFeeCode() != null)
				        var feObj = addFee(lic.getRenewFeeCode(),appFeeSched,lic.getPayPeriod,1,autoInvoiceFees);
				    else if (feeType == "Penalty" && lic.getPenaltyFeeCode() != null)
				        var feObj = addFee(lic.getPenaltyFeeCode(),appFeeSched,lic.getPayPeriod,1,autoInvoiceFees);
				}
			}
		
		if (feeSeqList.length)  // invoice added fees
			{
			var invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
			if (invoiceResult.getSuccess())
				logDebug("Invoicing assessed fee items is successful.");
			else
				logMessage("ERROR","ERROR: Invoicing the fee items was not successful.  Reason: " +  invoiceResult.getErrorMessage());
			}
		
 		}
		
 	logMessage("INFO","Processed " + capCount + " Licenses of Status " + licStat);
 	}
	

/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes (Used by this script)
/------------------------------------------------------------------------------------------------------*/

function appMatch(ats) 
	{
	var isMatch = true;
	var ata = ats.split("/");
	if (ata.length != 4)
		logDebug("ERROR in appMatch.  The following Application Type String is incorrectly formatted: " + ats);
	else
		for (xx in ata)
			if (!ata[xx].equals(appTypeArray[xx]) && !ata[xx].equals("*"))
				isMatch = false;
	return isMatch;
	}	

function licenseObject(licnumber)
	{
	// available statuses (from various R1_SERVER_CONSTANT values
	var licenseStatus = new Array("","Active","About To Expire","Delinquent","Expired","Invalid","Pending");
	
	this.refProf = null;		// licenseScriptModel (reference licensed professional)
	this.b1Exp = null;		// b1Expiration record (renewal status on application)
	this.licNum = licnumber;	// License Number

	// Load the reference License Professional if we're linking the two
	if (licnumber) // we're linking
		{
		refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(servProvCode,this.licNum)
		if (refLicenseResult.getSuccess())
			{
			refArray = refLicenseResult.getOutput()
			if (refArray)
				for (xxx in refArray)
					{
					this.refProf = refArray[xxx];
					logDebug("Loaded reference license professional");
					}
			}
		else
			{ logMessage("ERROR","ERROR: Getting Licensed Professional Record.  Reason is: " + refLicenseResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }
		}	
   		
   	// Load the renewal info (B1 Expiration)
   	// The only way to pull up a renewal is to supply a status.  I don't understand since it has a 1 to 1 relationship with b1permit, but oh well.
   	// the silly thing returns a blank record, so have to check the B1expirationModel to see if it's valid
   	
   	for (myStatus in licenseStatus)
   		{
   		b1ExpResult = aa.expiration.getLicensesByCapID(capId,licenseStatus[myStatus]);
   		if (b1ExpResult.getSuccess())
   			{
   			this.b1Exp = b1ExpResult.getOutput();
   			exptest = this.b1Exp.getB1Expiration();
   			if (exptest) {logDebug("Found renewal record of status : " + licenseStatus[myStatus]) ; break}
			}
		else
			{ logMessage("ERROR","ERROR: Getting B1Expiration Object for Cap.  Reason is: " + b1ExpResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }
		}

   	
   	this.setExpiration = function(expDate)
   		// Update expiration date
   		{
   		var expAADate = aa.date.parseDate(expDate);
  		
   		if (this.refProf) {
   			this.refProf.setLicenseExpirationDate(expAADate);
   			aa.licenseScript.editRefLicenseProf(this.refProf);
   			logDebug("Updated reference license expiration to " + expDate); }
   			
   		if (this.b1Exp)  {
 				this.b1Exp.setExpDate(expAADate);
				aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration());
				logDebug("Updated renewal to " + expDate); } 			
   		}
   	
	this.setIssued = function(expDate)
		// Update Issued date
		{
		var expAADate = aa.date.parseDate(expDate);
		
		if (this.refProf) {
			this.refProf.setLicenseIssueDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate);      }
			
		}	
	this.setLastRenewal = function(expDate)
		// Update expiration date
		{
		var expAADate = aa.date.parseDate(expDate)

		if (this.refProf) {
			this.refProf.setLicenseLastRenewalDate(expAADate);
			aa.licenseScript.editRefLicenseProf(this.refProf);
			logDebug("Updated reference license issued to " + expDate); }
		}
		
	this.setStatus = function(licStat)
		// Update expiration status
		{
		if (this.b1Exp)  {
			this.b1Exp.setExpStatus(licStat);
			aa.expiration.editB1Expiration(this.b1Exp.getB1Expiration()); 
			logDebug("Updated renewal to status " + licStat);}  			
		}
		
	this.getStatus = function()
		// Get Expiration Status
		{
		if (this.b1Exp) {
			return this.b1Exp.getExpStatus();
			}
		}
		
	this.getRenewFeeCode = function()
		// Get Renewal Fee Code (B1_EXPIRATION.RENEWAL_FEE_CODE)
		{
		if (this.b1Exp)
			{
			return this.b1Exp.getRenewalCode();
			}	
		}
				
	this.getRenewFeeFn = function()
		// Get Renewal Fee Function (B1_EXPIRATION.RENEWAL_FEE_FUNCTION)
		{
		if (this.b1Exp)
			{
			return this.b1Exp.getRenewalFunction();
			}	
		}
		
	this.getPenaltyFeeCode = function()
		// Get Penalty Fee Code (B1_EXPIRATION.PENALTY_FEE_CODE)
		{
		if (this.b1Exp)
			{
			return this.b1Exp.getPenaltyCode();
			}	
		}	
		
	this.getPenaltyFeeFn = function()
		// Get Penalty Fee Function (B1_EXPIRATION.PENALTY_FEE_FUNCTION)
		{
		if (this.b1Exp)
			{
			return this.b1Exp.getPenaltyFunction();
			}	
		}		
	this.getPayPeriod = function()
	    {
	    if (this.b1Exp)
	        {
	        return this.b1Exp.getPayPeriodGroup();
		    }
		}
	}

function updateAppStatus(stat,cmt)
	{
	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (updateStatusResult.getSuccess())
		logDebug("Updated application status to " + stat + " successfully.");
	else
		logMessage("ERROR","ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}
	
function updateTask(wfstr,wfstat,wfcomment,wfnote) 
	{

	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess())
  	 	wfObj = workflowResult.getOutput();
  	else
  	  	{ message+="ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage() + br; return false; }
	
	if (!wfstat) wfstat = "NA";
	
	for (i in wfObj)
		{
   		fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()))
			{
			dispositionDate = aa.date.getCurrentDate();
			stepnumber = fTask.getStepNumber();
			// try status U here for disp flag?
			aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"U");
			logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
			}			
		}
	}
	
function activateTask(wfstr) 
	{
	//optional 2nd param: wfstat.  Use if selecting by task and status.
	//SR5043
	var wfstat = "";
	var checkStatus = false;
	if (arguments.length==2)
		{
		wfstat = arguments[1];
		checkStatus = true;
		}
		
	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess())
  	 	wfObj = workflowResult.getOutput();
  	else
  	  	{ logMessage("ERROR","ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()) ; return false; }
	
	for (i in wfObj)
		{
   		fTask = wfObj[i];
 		if ( !checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) ||
		     checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && wfstat.toUpperCase().equals(fTask.getDisposition().toUpperCase()) )
			{
			stepnumber = fTask.getStepNumber();
			aa.workflow.adjustTask(capId, stepnumber, "Y", "N", null, null)
			logDebug("Activating Workflow Task: " + wfstr);
			}			
		}
	}
	
	
function addAllFees(fsched,fperiod,fqty,finvoice) // Adds all fees for a given fee schedule
	{
	var arrFees = aa.finance.getFeeItemList(null,fsched,null).getOutput();
	for (xx in arrFees)
		{
		var feeCod = arrFees[xx].getFeeCod();
		assessFeeResult = aa.finance.createFeeItem(capId,fsched,feeCod,fperiod,fqty);
		if (assessFeeResult.getSuccess())
			{
			feeSeq = assessFeeResult.getOutput();
			
			logDebug("Added Fee " + feeCod + ", Qty " + fqty);
			if (finvoice == "Y")
			{
				feeSeqList.push(feeSeq);
				paymentPeriodList.push(fperiod);
				}
			}
		else
			{
			logMessage("ERROR","ERROR: assessing fee (" + feeCod + "): " + assessFeeResult.getErrorMessage());
			}
		} // for xx
	} // function
	
function addFee(fcode,fsched,fperiod,fqty,finvoice) // Adds a single fee, optional argument: fCap
	{
	var feeCap = capId;
	var feeCapMessage = "";
	var feeSeq_L = new Array();				// invoicing fee for CAP in args
	var paymentPeriod_L = new Array();			// invoicing pay periods for CAP in args
	if (arguments.length > 5) 
		{
		feeCap = arguments[5]; // use cap ID specified in args
		feeCapMessage = " to specified CAP";
		}

	assessFeeResult = aa.finance.createFeeItem(feeCap,fsched,fcode,fperiod,fqty);
	if (assessFeeResult.getSuccess())
		{
		feeSeq = assessFeeResult.getOutput();
		logMessage("Successfully added Fee " + fcode + ", Qty " + fqty + feeCapMessage);
		logDebug("The assessed fee Sequence Number " + feeSeq + feeCapMessage);

		if (finvoice == "Y" && arguments.length == 5) // use current CAP
			{
			feeSeqList.push(feeSeq);
			paymentPeriodList.push(fperiod);
			}
		if (finvoice == "Y" && arguments.length > 5) // use CAP in args
			{
			feeSeq_L.push(feeSeq);
			paymentPeriod_L.push(fperiod);
			var invoiceResult_L = aa.finance.createInvoice(feeCap, feeSeq_L, paymentPeriod_L);
			if (invoiceResult_L.getSuccess())
				logMessage("Invoicing assessed fee items" + feeCapMessage + " is successful.");
			else
				logDebug("**ERROR: Invoicing the fee items assessed" + feeCapMessage + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
			}
		}
	else
		{
		logDebug( "**ERROR: assessing fee (" + fcode + "): " + assessFeeResult.getErrorMessage());
		}
	}
	
function updateFee(fcode,fsched,fperiod,fqty,finvoice) // Updates a fee with a new Qty.  If it doesn't exist, adds it
	{
	feeUpdated = false;
	getFeeResult = aa.finance.getFeeItemByFeeCode(capId,fcode,fperiod);
	if (getFeeResult.getSuccess())
		{	
		feeListA = getFeeResult.getOutput();
		for (feeNum in feeListA)
			if (feeListA[feeNum].getFeeitemStatus().equals("NEW") && !feeUpdated)  // update this fee item
				{
				feeSeq = feeListA[feeNum].getFeeSeqNbr();
				editResult = aa.finance.editFeeItemUnit(capId, fqty, feeSeq);
				feeUpdated = true;
				if (editResult.getSuccess())
					{
					debug+="Updated Qty on Existing Fee Item: " + fcode + " to Qty: " + fqty;
					//aa.finance.calculateFees(capId);
					if (finvoice == "Y")
						{
						feeSeqList.push(feeSeq);
						paymentPeriodList.push(fperiod);
						}
					}
				else
					{ debug+= "ERROR: updating qty on fee item (" + fcode + "): " + editResult.getErrorMessage() + br; break }
				}
		}		
	else
		{ debug+= "ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage() + br}
	
	if (!feeUpdated) // no existing fee, so update
		addFee(fcode,fsched,fperiod,fqty,finvoice);
	}
	

function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
}	

function logMessage(etype,edesc) {
	aa.eventLog.createEventLog(etype, "Batch Process", batchJobName, sysDate, sysDate,"", edesc,batchJobID);
	aa.print(etype + " : " + edesc);
	emailText+=etype + " : " + edesc + "\n";
	}

function logDebug(edesc) {
	if (showDebug) {
		aa.eventLog.createEventLog("DEBUG", "Batch Process", batchJobName, sysDate, sysDate,"", edesc,batchJobID);
		aa.print("DEBUG : " + edesc);
		emailText+="DEBUG : " + edesc + "\n"; }
	}
	
function AppSpecific() {
	// 
	// Returns an associative array of App Specific Info
	//
  	appArray = new Array();
    	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(capId);
	if (appSpecInfoResult.getSuccess())
	 	{
		var fAppSpecInfoObj = appSpecInfoResult.getOutput();

		for (loopk in fAppSpecInfoObj)
			appArray[fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
		}
	return appArray;
}

function dateAdd(td,amt)   
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
		while (i < Math.abs(amt)) 
			{
			dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
			if (dDate.getDay() > 0 && dDate.getDay() < 6)
				i++
			}
	else
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));

	return (dDate.getMonth()+1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();
	}
	
function getCapId(pid1,pid2,pid3)  {

    var s_capResult = aa.cap.getCapID(pid1, pid2, pid3);
    if(s_capResult.getSuccess())
      return s_capResult.getOutput();
    else
    {
      logMessage("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());
      return null;
    }
  }	

function loopTask(wfstr,wfstat,wfcomment,wfnote) // optional process name
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length == 5) 
		{
		processName = arguments[4]; // subprocess
		useProcess = true;
		}

	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess())
  	 	wfObj = workflowResult.getOutput();
  	else
  	  	{ logMessage("ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	if (!wfstat) wfstat = "NA";
	
	for (i in wfObj)
		{
   		fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
			dispositionDate = aa.date.getCurrentDate();
			stepnumber = fTask.getStepNumber();
			processID = fTask.getProcessID();

			if (useProcess)
				aa.workflow.handleDisposition(capId,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"L");
			else
				aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"L");
			
			logMessage("Closing Workflow Task: " + wfstr + " with status " + wfstat + ", Looping...");
			logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat + ", Looping...");
			}			
		}
	}

function getParam(pParamName) //gets parameter value and logs message showing param value
	{
	var ret = "" + aa.env.getValue(pParamName);	
	logMessage("PARAMETER", pParamName+" = "+ret);
	return ret;
	}
	
function isNull(pTestValue,pNewValue)
	{
	if (pTestValue==null || pTestValue=="")
		return pNewValue;
	else
		return pTestValue;
	}
	
function taskEditStatus(wfstr,wfstat,wfcomment,wfnote,pFlow,pProcess) //Batch version of function
	{
	//Needs isNull function
	//pProcess not coded yet
	//
	pFlow = isNull(pFlow,"U"); //If no flow control specified, flow is "U" (Unchanged)
	var dispositionDate = aa.date.getCurrentDate();
	
	for (i in wfObjArray)
		{
 		if ( wfstr.equals(wfObjArray[i].getTaskDescription()) )
			{
			var stepnumber = wfObjArray[i].getStepNumber();
			aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,pFlow);
			logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
			}			
		}
	}
	
function jsDateToMMDDYYYY(pJavaScriptDate)
	{
	//converts javascript date to string in MM/DD/YYYY format
	//
	if (pJavaScriptDate != null)
		{
		if (Date.prototype.isPrototypeOf(pJavaScriptDate))
	return (pJavaScriptDate.getMonth()+1).toString()+"/"+pJavaScriptDate.getDate()+"/"+pJavaScriptDate.getFullYear();
		else
			{
			logDebug("Parameter is not a javascript date");
			return ("INVALID JAVASCRIPT DATE");
			}
		}
	else
		{
		logDebug("Parameter is null");
		return ("NULL PARAMETER VALUE");
		}
	}	
	
function lookup(stdChoice,stdValue) 
	{
	var strControl;
	var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice,stdValue);
	
   	if (bizDomScriptResult.getSuccess())
   		{
		bizDomScriptObj = bizDomScriptResult.getOutput();
		var strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
		logDebug("getStandardChoice(" + stdChoice + "," + stdValue + ") = " + strControl);
		}
	else
		{
		logDebug("getStandardChoice(" + stdChoice + "," + stdValue + ") does not exist");
		}
	return strControl;
	}
	
function taskStatus(wfstr) 
	{
	//Batch version of taskStatus -- uses global var wfObjArray
	// optional process name
	// returns false if task not found
	var useProcess = false;
	var processName = "";
	if (arguments.length == 2) 
		{
		processName = arguments[1]; // subprocess
		useProcess = true;
		}
	
	for (i in wfObjArray)
		{
   		var fTask = wfObjArray[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			return fTask.getDisposition()
		}
	return false;
	}
function createReferenceLP(rlpId,rlpType,pContactType)
	{
	//Creates/updates a reference licensed prof from a Contact and then adds as an LP on the cap.
	var updating = false;
	var capContResult = aa.people.getCapContactByCapID(capId);
	if (capContResult.getSuccess())
		{ conArr = capContResult.getOutput();  }
	else
		{
		logDebug ("**ERROR: getting cap contact: " + capAddResult.getErrorMessage());
		return false;
		}

	if (!conArr.length)
		{
		logDebug ("**WARNING: No contact available");
		return false;
		}


	var newLic = getRefLicenseProf(rlpId)

	if (newLic)
		{
		updating = true;
		logDebug("Updating existing Ref Lic Prof : " + rlpId);
		}
	else
		var newLic = aa.licenseScript.createLicenseScriptModel();

	//get contact record
	if (pContactType==null)
		var cont = conArr[0]; //if no contact type specified, use first contact
	else
		{
		var contFound = false;
		for (yy in conArr)
			{
			if (pContactType.equals(conArr[yy].getCapContactModel().getPeople().getContactType()))
				{
				cont = conArr[yy];
				contFound = true;
				break;
				}
			}
		if (!contFound)
			{
			logDebug ("**WARNING: No Contact found of type: "+pContactType);
			return false;
			}
		}

	peop = cont.getPeople();
	addr = peop.getCompactAddress();

	newLic.setContactFirstName(cont.getFirstName());
	//newLic.setContactMiddleName(cont.getMiddleName());  //method not available
	newLic.setContactLastName(cont.getLastName());
	newLic.setBusinessName(peop.getBusinessName());
	newLic.setAddress1(addr.getAddressLine1());
	newLic.setAddress2(addr.getAddressLine2());
	newLic.setAddress3(addr.getAddressLine3());
	newLic.setCity(addr.getCity());
	newLic.setState(addr.getState());
	newLic.setZip(addr.getZip());
	newLic.setPhone1(peop.getPhone1());
	newLic.setPhone2(peop.getPhone2());
	newLic.setEMailAddress(peop.getEmail());
	newLic.setFax(peop.getFax());

	newLic.setAgencyCode(aa.getServiceProviderCode());
	newLic.setAuditDate(sysDate);
	newLic.setAuditID(currentUserID);
	newLic.setAuditStatus("A");

	if (AInfo["Insurance Co"]) 		newLic.setInsuranceCo(AInfo["Insurance Co"]);
	if (AInfo["Insurance Amount"]) 		newLic.setInsuranceAmount(parseFloat(AInfo["Insurance Amount"]));
	if (AInfo["Insurance Exp Date"]) 	newLic.setInsuranceExpDate(aa.date.parseDate(AInfo["Insurance Exp Date"]));
	if (AInfo["Policy #"]) 			newLic.setPolicy(AInfo["Policy #"]);

	if (AInfo["Business License #"]) 	newLic.setBusinessLicense(AInfo["Business License #"]);
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License Exp Date"]));

	newLic.setLicenseType(rlpType);
	newLic.setLicState(addr.getState());
	newLic.setStateLicense(rlpId);

	if (updating)
		myResult = aa.licenseScript.editRefLicenseProf(newLic);
	else
		myResult = aa.licenseScript.createRefLicenseProf(newLic);

	if (!myResult.getSuccess())
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return null;
		}

	logDebug("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType + " Sequence Number " + myResult.getOutput());

	lpsmResult = aa.licenseScript.getRefLicenseProfBySeqNbr(servProvCode,myResult.getOutput())
	if (!lpsmResult.getSuccess())
		{ logDebug("**WARNING error retrieving the LP just created " + lpsmResult.getErrorMessage()) ; return null}

	lpsm = lpsmResult.getOutput();

	// Now add the LP to the CAP
	asCapResult= aa.licenseScript.associateLpWithCap(capId,lpsm)
	if (!asCapResult.getSuccess())
		{ logDebug("**WARNING error associating CAP to LP: " + asCapResult.getErrorMessage()) }
	else
		{ logDebug("Associated the CAP to the new LP") }

	/* WILL NOT NEED UNTIL ACA IMPLEMENTED
	// Find the public user by contact email address and attach
	puResult = aa.publicUser.getPublicUserByEmail(peop.getEmail())
	if (!puResult.getSuccess())
		{ logDebug("**WARNING finding public user via email address " + peop.getEmail() + " error: " + puResult.getErrorMessage()) }
	else
		{
		pu = puResult.getOutput();
		asResult = aa.licenseScript.associateLpWithPublicUser(pu,lpsm)
		if (!asResult.getSuccess())
			{logDebug("**WARNING error associating LP with Public User : " + asResult.getErrorMessage());}
		else
			{logDebug("Associated LP with public user " + peop.getEmail()) }
		}
	*/
	return lpsm;
	}

function getRefLicenseProf(refstlic)
	{
	var refLicObj = null;
	var refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(),refstlic);
	if (!refLicenseResult.getSuccess())
		{ logDebug("**ERROR retrieving Ref Lic Profs : " + refLicenseResult.getErrorMessage()); return false; }
	else
		{
		var newLicArray = refLicenseResult.getOutput();
		if (!newLicArray) return null;
		for (var thisLic in newLicArray)
			if (refstlic && refstlic.toUpperCase().equals(newLicArray[thisLic].getStateLicense().toUpperCase()))
				refLicObj = newLicArray[thisLic];
		}

	return refLicObj;
	}