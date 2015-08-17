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
var showDebug = true;									// Set to true to see debug messages in email confirmation
var maxSeconds = 60 * 60;							// number of seconds allowed for batch processing, usually < 5*60
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
var disableTokens = false;			// turn off tokenizing of App Specific and Parcel Attributes
var feeSeqList = new Array();
var paymentPeriodList = new Array();					// invoicing pay periods

batchJobID = 0;
if (batchJobResult.getSuccess())
  {
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
var fromDate = "06/29/2011"; //getParam("fromDate"); 
var toDate = "07/01/2011"; //getParam("toDate");
var dFromDate = aa.date.parseDate(fromDate);			//
var dToDate = aa.date.parseDate(toDate);				//
var lookAheadDays = 1;   // Number of days from today
var daySpan = 1;				// Days to search (6 if run weekly, 0 if daily, etc.)

var appGroup = "Licenses"; //getParam("appGroup");					//   app Group to process {Licenses}
var appTypeType = "Clerk"; //getParam("appTypeType");				//   app type to process {Rental License}
var appSubtype =  "*"; //getParam("appSubtype");				//   app subtype to process {NA}
var appCategory = "*"; //getParam("appCategory");				//   app category to process {NA}

var expStatus = "Expired"; //getParam("expirationStatus")			//   test for this expiration status
var newExpStatus = "Inactive"; //getParam("newExpirationStatus")		//   update to this expiration status
var newAppStatus = "Inactive"; //getParam("newApplicationStatus")		//   update the CAP to this status
var editWorkflowTask = "License Status"; //getParam("editWorkflowTask");// Open this task {License Status},        
var newWorkflowStatus = "Inactive"; //"About to Expire"//getParam("newWorkflowStatus"); // change to this status {Delinquent}

var gracePeriodDays = 0;  // getParam("gracePeriodDays")		//	bump up expiration date by this many days
var setPrefix = "";  //getParam("setPrefix");					//   Prefix for set ID
var inspSched =  "";  //getParam("inspSched");					//   Schedule Inspection
var skipAppStatusArray = ""; //getParam("skipAppStatus").split(",")

var emailAddress = "elamsupport@cityofmadison.com"; //getParam("emailAddress");			// email to send report
var sendEmailNotifications = "N"; //getParam("sendEmailNotifications");	// send out emails?
var sendSMSNotifications = "N"; //getParam("sendSMSNotifications");	// send out SMS?
var removeSearchEntries = "N"; //getParam("removeSearchEntries"); // remove search entries from DB
var mSubjChoice = ""; //getParam("emailSubjectStdChoice");			// Message subject resource from "Batch_Job_Messages" Std Choice
var mMesgChoice = ""; //getParam("emailContentStdChoice");			// Message content resource from "Batch_Job_Messages" Std Choice
var deactivateLicense = "N"; //getParam("deactivateLicense");			// deactivate the LP
var lockParentLicense = "N"; //getParam("lockParentLicense");     // add this lock on the parent license

var workflowFlowCode = ""; //getParam("workflowFlowCode"); // Flow code for above status {U}
var assessRenewalFee= "N"; //getParam("assessRenewalFee")               // Y or N fee codes come from b1Exp
var assessPenaltyFee= "N"; //getParam("assessPenaltyFee")               // Y or N
var invoiceFees= "N"; //getParam("invoiceFees")
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var startDate = new Date();
var timeExpired = false;

if (!fromDate.length) // no "from" date, assume today + number of days to look ahead
	fromDate = dateAdd(null,parseInt(lookAheadDays))

if (!toDate.length)  // no "to" date, assume today + number of look ahead days + span
	toDate = dateAdd(null,parseInt(lookAheadDays)+parseInt(daySpan))

logDebug("Date Range -- fromDate: " + fromDate + ", toDate: " + toDate)

var mSubjEnConstant = null;
var mMesgEnConstant = null;
var mSubjArConstant = null;
var mMesgArConstant = null;

if (mSubjChoice) mSubjEnConstant = lookup("Batch Job Messages",mSubjChoice);
if (mMesgChoice) mMesgEnConstant = lookup("Batch Job Messages",mMesgChoice);

var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

if (appGroup=="")
	appGroup="*";
if (appTypeType=="")
	appTypeType="*";
if (appSubtype=="")
	appSubtype="*";
if (appCategory=="")
	appCategory="*";
var appType = appGroup+"/"+appTypeType+"/"+appSubtype+"/"+appCategory;

//Validate workflow parameters
var paramsOK = true;
var taskArray = editWorkflowTask.split(",");
//var statusArray = editWorkflowStatus.split(",");
var newStatusArray = newWorkflowStatus.split(",");
var flowArray = workflowFlowCode.split(",");
if ( !(taskArray.length==newStatusArray.length && taskArray.length==flowArray.length) )
	{
	logDebug("ERROR","ERROR: Script cannot run. The number of values in editWorkflowTask, newWorkflowStatus, workflowFlowCode must match.");
	paramsOK = false;
	}
	
var AInfo = new Array();						// Create array for tokenized variables

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

if (paramsOK)
	{
	logDebug("Start of Job");

	if (!timeExpired) mainProcess();

	logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");
	}

if (emailAddress.length)
	aa.sendMail("noreply@cityofmadison.com", emailAddress, "rsjachrani@cityofmadison.com", batchJobName + " Results", emailText);


/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

function mainProcess()
	{
	var capFilterType = 0
	var capFilterInactive = 0;
	var capFilterError = 0;
	var capFilterStatus = 0;
	var capFilterOther = 0;
	var capCount = 0;
	var inspDate;
	var setName;
	var setDescription;

	aa.sendMail("noreply@cityofmadison.com", emailAddress, "rsjachrani@cityofmadison.com", "Batch Job - expireFireLicenses", "At start of mainProcess function.");
	
	var expResult = aa.expiration.getLicensesByDate(expStatus,fromDate,toDate);

	if (expResult.getSuccess())
		{
		myExp = expResult.getOutput();
		logDebug("Processing " + myExp.length + " expiration records");
		}
	else
		{ logDebug("ERROR: Getting Expirations, reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()) ; return false }

	for (thisExp in myExp)  // for each b1expiration (effectively, each license app)
		{
		if (elapsed() > maxSeconds) // only continue if time hasn't expired
			{
			logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
			timeExpired = true ;
			break;
			}

		b1Exp = myExp[thisExp];
		var	expDate = b1Exp.getExpDate();
		if (expDate) var b1ExpDate = expDate.getMonth() + "/" + expDate.getDayOfMonth() + "/" + expDate.getYear();
		var b1Status = b1Exp.getExpStatus();

		capId = aa.cap.getCapID(b1Exp.getCapID().getID1(),b1Exp.getCapID().getID2(),b1Exp.getCapID().getID3()).getOutput();

		// for invoicing
		//var feeSeqList = new Array();
		//var paymentPeriodList = new Array();
		feeSeqList = new Array();
		paymentPeriodList = new Array();


		if (!capId)
			{
			logDebug("Could not get a Cap ID for " + b1Exp.getCapID().getID1() + "-" + b1Exp.getCapID().getID2() + "-" + b1Exp.getCapID().getID3());
			logDebug("This is likely being caused by 09ACC-03874.   Please disable outgoing emails until this is resolved")
			continue;
		}

		altId = capId.getCustomID();

		//logDebug(altId + ": Renewal Status : " + b1Status + ", Expires on " + b1ExpDate);

		cap = aa.cap.getCap(capId).getOutput();
		if (!cap)
			{
				logDebug(altId + " Failed because it did");
				continue;
			}
		
		var capStatus = cap.getCapStatus();

		appTypeResult = cap.getCapType();		//create CapTypeModel object
		appTypeString = appTypeResult.toString();
		appTypeArray = appTypeString.split("/");

		// Filter by CAP Type
		if (appType.length && !appMatch(appType))
			{
			capFilterType++;
			//logDebug(altId + ": Application Type does not match")
			continue;
			}
			
		//EXCLUDE BY CAP TYPE
		//if (appMatch("Licenses/Building Inspection/Plumbing/Na") ||
		//	appMatch("Licenses/Clerk/ClassBBeerLiquor/NA") ||
		//	appMatch("Licenses/Clerk/ClassABeerLiquor/NA") ||
		//	appMatch("Licenses/Clerk/Operator/NA") ||
		//	appMatch("Licenses/Clerk/AdultEntertainment/NA"))
		//	{
		//	capFilterType++;
		//	//logDebug(altId + ": Application Type does not match")
		//	continue;
		//	}

		// Filter by CAP Status
		if (exists(capStatus,skipAppStatusArray))
			{
			capFilterStatus++;
			//logDebug(altId + ": skipping due to application status of " + capStatus)
			continue;
			}

		capCount++;


	// Create Set RIKI EDIT
		if (setPrefix != "" && capCount == 1)
			{
			var yy = startDate.getFullYear().toString().substr(2,2);
			var mm = (startDate.getMonth()+1).toString();
			if (mm.length<2)
				mm = "0"+mm;
			var dd = startDate.getDate().toString();
			if (dd.length<2)
				dd = "0"+dd;
			var hh = startDate.getHours().toString();
			if (hh.length<2)
				hh = "0"+hh;
			var mi = startDate.getMinutes().toString();
			if (mi.length<2)
				mi = "0"+mi;

			var setName = setPrefix.substr(0,5) + yy + mm + dd + hh + mi;

			setDescription = setPrefix + " : " + startDate.toLocaleString()
			var setCreateResult= aa.set.createSet(setName,setDescription)

			if (setCreateResult.getSuccess())
				logDebug("Set ID "+setName+" created for CAPs processed by this batch job.");
			else
				logDebug("ERROR: Unable to create new Set ID "+setName+" created for CAPs processed by this batch job.");

			}
			//EDIT


		// Actions start here:

		var refLic = getRefLicenseProf(altId); // Load the reference License Professional
		var contactTypeArray = new Array();
		contactTypeArray[0] = "License Holder";
		//createRefContactsFromCapContactsAndLink(capId,contactTypeArray,null,null,"N",comparePeopleGeneric); //RIKI RESEARCH
		//logDebug(altId);
		//var userModel = createPublicUserFromContact(capId);
		/*if (userModel != false)
			{
				var attachResult = aa.cap.updateCreatedAccessBy4ACA(capId,"PUBLICUSER" + userModel.getUserSeqNum(),"Y","Y");
				if (attachResult.getSuccess())
					logDebug("Allowed Access to License Online");
				else
					logDebug("ERROR","ERROR: Failed: " + attachResult.getErrorMessage());
			}
		else
			logDebug("Couldn't create Public User");
		*/
		
		if (refLic && deactivateLicense.substring(0,1).toUpperCase().equals("Y"))
			{
			refLic.setAuditStatus("I");
			aa.licenseScript.editRefLicenseProf(refLic);
			logDebug(altId + ": deactivated linked License");
			}

		// update expiration status


		if (newExpStatus.length > 0)
			{
			b1Exp.setExpStatus(newExpStatus);
			aa.expiration.editB1Expiration(b1Exp.getB1Expiration());
			//logDebug(altId + ": Update expiration status: " + newExpStatus);
			}

		// update expiration date based on interval

		if (parseInt(gracePeriodDays) != 0)
			{
			newExpDate = dateAdd(b1ExpDate,parseInt(gracePeriodDays));
			b1Exp.setExpDate(aa.date.parseDate(newExpDate));
			aa.expiration.editB1Expiration(b1Exp.getB1Expiration());

			logDebug(altId + ": updated CAP expiration to " + newExpDate);
			if (refLic)
				{
				refLic.setLicenseExpirationDate(aa.date.parseDate(newExpDate));
				aa.licenseScript.editRefLicenseProf(refLic);
				logDebug(altId + ": updated License expiration to " + newExpDate);
				}
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
				logDebug("ERROR","ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage());
				}
			}
		
		//var capId = getCapId();	
		loadAppSpecific(AInfo,capId); 						// Add AppSpecific Info
		doStandardChoiceActions("PreExecuteForAfterEvents",true,0);
		//logGlobals(AInfo);


		if (assessPenaltyFee == "Y") // We're doing the penalty fee
			{
			
				// Filter by CAP Type
				if (feeBalance() == 0)
				{
					capFilterOther++;
					capCount--;
					logDebug(altId + ": Application has a zero balance")
					continue;
				}
				//debugObject(aa.finance.getFeeScheduleByCapID(capId));
				removeAssessedFees();
				var feObj = updateFee(b1Exp.getPenaltyCode(),aa.finance.getFeeScheduleByCapID(capId).getOutput(),b1Exp.getPayPeriodGroup(),1,"Y");
			    //appFeeSched = lookup("BATCH:FeeScheduleLookup",appTypeString)
			    //if (appFeeSched != null)
			    //{
			    //    if (b1Exp.getPenaltyCode() != null)
				//        var feObj = updateFee(b1Exp.getPenaltyCode(),appFeeSched,b1Exp.getPayPeriodGroup(),1,"Y");
				//}
				//else
				//{
				//	appFeeSched = lookup("BATCH:FeeScheduleLookupComplexPenality",appTypeString)
				//	if (b1Exp.getPenaltyCode() != null)
				//        var feObj = updateFee(b1Exp.getPenaltyCode(),appFeeSched,b1Exp.getPayPeriodGroup(),1,"Y");
				//}
				//if (appFeeSched = null)
				//	{
				//		logDebug("Trying to find StandardChoice " + appTypeString + " and Failed");
				//	}
			}
			appFeeSched = null;
	//logDebug("2:" + appTypeString);
		if (assessRenewalFee == "Y") // We're doing the renewalfee
			{
				// This is where the Complex and the Simple Fee Schedule fits in
			    appFeeSched = lookup("BATCH:FeeScheduleLookup",appTypeString)
			    if (appFeeSched != null)
			    {
					//logDebug("1");
			        if (b1Exp.getRenewalCode() != null)
				        var feObj = updateFee(b1Exp.getRenewalCode(),appFeeSched,b1Exp.getPayPeriodGroup(),1,"Y");
				    
				}
				else
				{
					//logDebug("Trying to find StandardChoice");
					appFeeSched = lookup("BATCH:FeeScheduleLookupComplex",appTypeString)
					doStandardChoiceActions(appFeeSched,true,0);
					//logDebug(appFeeSched);
				}
				if (appFeeSched = null)
					{
						logDebug("Trying to find StandardChoice " + appTypeString + " and Failed");
					}
			}
		//logDebug(feeSeqList.length);
		if (feeSeqList.length)  // invoice added fees
			{
			var invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
			if (!invoiceResult.getSuccess())
				logDebug("ERROR","ERROR: Invoicing the fee items was not successful.  Reason: " +  invoiceResult.getErrorMessage());
			//else
			//	logDebug("Invoicing assessed fee items is successful.");
			}



		//var mMesgEn = replaceMessageTokens(mMesgEnConstant);
		/*		
		conArray = getContactArray(capId)
		for (thisCon in conArray)
		{
			b3Contact = conArray[thisCon]
			if (b3Contact["contactType"] == "Contractor")
			{
				conPhone2 = b3Contact["phone2countrycode"] + b3Contact["phone2"];
				conEmail = b3Contact["email"];
				//
				// Eventually we need to get a language preference from the user profile
				//
				if (conPhone2 && sendSMSNotifications.substring(0,1).toUpperCase().equals("Y")) sendSMS(conPhone2, mMesgEn.substr(0,79));  // message length must be < 80
				if (conPhone2 && sendSMSNotifications.substring(0,1).toUpperCase().equals("Y")) sendSMS(conPhone2, mMesgAr.substr(0,79));
				if (conEmail && sendEmailNotifications.substring(0,1).toUpperCase().equals("Y")) aa.sendMail("noreply@accela.com", conEmail, "", mSubjEnConstant ,mMesgEn);
			}

		}
		*/
		// update CAP status
                   if (newAppStatus != "")
                      {
                       if (capStatus != 'Delinquent') updateAppStatus(newAppStatus,"");
                       //logDebug(altId + ": Updated Application Status to " + newAppStatus);
                      }
		

		// schedule Inspection
		/*
		if (inspSched.length > 0)
			{
			scheduleInspection(inspSched,"1");
			inspId = getScheduledInspId(inspSched);
			if (inspId) autoAssignInspection(inspId);
			logDebug(altId + ": Scheduled " + inspSched + ", Inspection ID: " + inspId);
			}

		// remove search entries
		if (removeSearchEntries.substring(0,1).toUpperCase().equals("Y"))
			{
			aa.specialSearch.removeSearchDataByCapID(capId);
			logDebug(altId + ": Removed search entries");
		}
		*/
		// Add to Set

		if (setPrefix != "") aa.set.add(setName,capId) //RIKI RESEARCH

		// lock Parent License
		
		if (lockParentLicense != "N") 
			{
			licCap = getLicenseCapId("*/*/*/*"); 

			if (licCap)
				{
				siblingArr = getChildren(appTypeString,licCap);
				activeSibling = false;
				for (thisSibling in siblingArr)
					{
					var siblingStatus = aa.cap.getCap(siblingArr[thisSibling]).getOutput().getCapStatus();
					if (!exists(siblingStatus,skipAppStatusArray))
						{
						activeSibling = true;
						logDebug("Found a valid permit " + siblingArr[thisSibling].getCustomID() + " so will not lock the parent license");
						}
					}
					
				if (!activeSibling)
					{
					logDebug(altId + ": adding Lock : " + lockParentLicense);
					addStdCondition("Lock",lockParentLicense,licCap);
					}
				}
			else
				logDebug(altId + ": Can't add Lock, no parent license found");
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
function token(tstr)
	{
	if (!disableTokens)
		{
		re = new RegExp("\\{","g") ; tstr = String(tstr).replace(re,"AInfo[\"");
		re = new RegExp("\\}","g") ; tstr = String(tstr).replace(re,"\"]");
		//tstr = String(tstr).replace("showDebug","showMessage");
		}
	return String(tstr);
  	}

function debugObject(object)
	{
	 var output = ''; 
	 for (property in object) { 
	   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
	 } 
	 logDebug(output);
	} 
	
function doStandardChoiceActions(stdChoiceEntry,doExecution,docIndent) 
	{
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	
	var pairObjArray = getScriptAction(stdChoiceEntry);
	if (!doExecution) docWrite(stdChoiceEntry,true,docIndent);
	//logDebug("Len:" + pairObjArray.length);
	for (xx in pairObjArray)
		{
		
		doObj = pairObjArray[xx];
		//logDebug("Array:" + xx);
		if (doExecution && doObj.enabled)
			{
			//logDebug(doObj.cri);
			if (eval(token(doObj.cri)))
				{
				//logDebug(doObj.act);
				eval(token(doObj.act));
				}
			}
		else // just document
			{
			docWrite("|  ",false,docIndent);
			if (!doObj.enabled) docWrite("|  " + doObj.ID + " DISABLED!",false,docIndent);
			docWrite("|  " + doObj.ID + " criteria: " + doObj.cri,false,docIndent);
			docWrite("|  " + doObj.ID + " action  : " + doObj.act,false,docIndent);
			
			for (yy in doObj.branch)
				{
				doStandardChoiceActions(doObj.branch[yy],false,docIndent+1);
				}
			}
		} // next sAction
	if (!doExecution) docWrite(null,true,docIndent);
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	showDebug = true;
	}	
	
function isTaskActive(wfstr) // optional process name
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length == 2) 
		{
		processName = arguments[1]; // subprocess
		useProcess = true;
		}

	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess())
  	 	wfObj = workflowResult.getOutput();
  	else
  	  	{ logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	for (i in wfObj)
		{
   		fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
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
	
function getScriptAction(strControl) 
	{
	var actArray = new Array();
		
	for (var count=1; count < 99; count++)  // Must be sequential from 01 up to 99
		{
		var countstr = count < 10 ? "0" + count : count;
		var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(strControl,countstr);
	   	if (bizDomScriptResult.getSuccess())
	   		{
			bizDomScriptObj = bizDomScriptResult.getOutput();
			var myObj= new pairObj(bizDomScriptObj.getBizdomainValue());
			myObj.load(bizDomScriptObj.getDescription());
			//logDebug(bizDomScriptObj.getDescription());
			if (bizDomScriptObj.getAuditStatus() == 'I') myObj.enabled = false;
			actArray.push(myObj);
			}
		else
			{
			break;
			}
		}
	return actArray;
	}

function removeAssessedFees() // Removes all fee items for a fee code and period
	{
	//fcode,fperiod
	getFeeResult = aa.finance.getFeeItemByCapID(capId);
	if (getFeeResult.getSuccess())
		{	
		var feeList = getFeeResult.getOutput();
		for (feeNum in feeList)
			{
			if (feeList[feeNum].getFeeitemStatus().equals("NEW")) 
				{
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				
				var editResult = aa.finance.removeFeeItem(capId, feeSeq);
				if (!editResult.getSuccess())
					{ logDebug( "**ERROR: removing fee item " + editResult.getErrorMessage()); break }
				}
			}
		}		
	else
		{ logDebug( "**ERROR: getting fee items " + getFeeResult.getErrorMessage())}
	}
	
function feeBalance(feestr)
	{
	// Searches payment fee items and returns the unpaid balance of a fee item
	// Sums fee items if more than one exists.  Optional second parameter fee schedule
	var amtFee = 0;
	var amtPaid = 0;
	var feeSch;
	
	if (arguments.length == 2) feeSch = arguments[1]; 

	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess())
		{ var feeObjArr = feeResult.getOutput(); }
	else
		{ logDebug( "**ERROR: getting fee items: " + capContResult.getErrorMessage()); return false }
	
	for (ff in feeObjArr)
		if ((!feestr || feestr.equals(feeObjArr[ff].getFeeCod())) && (!feeSch || feeSch.equals(feeObjArr[ff].getF4FeeItemModel().getFeeSchudle())))
			{
			amtFee+=feeObjArr[ff].getFee();
			var pfResult = aa.finance.getPaymentFeeItems(capId, null);
			if (pfResult.getSuccess())
				{
				var pfObj = pfResult.getOutput();
				for (ij in pfObj)
					if (feeObjArr[ff].getFeeSeqNbr() == pfObj[ij].getFeeSeqNbr())
						amtPaid+=pfObj[ij].getFeeAllocation()
				}
			}
	return amtFee - amtPaid;
	}
	
function feeExists(feestr) // optional statuses to check for
	{
	var checkStatus = false;
	var statusArray = new Array(); 

	//get optional arguments 
	if (arguments.length > 1)
		{
		checkStatus = true;
		for (var i=1; i<arguments.length; i++)
			statusArray.push(arguments[i]);
		}

	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess())
		{ var feeObjArr = feeResult.getOutput(); }
	else
		{ logDebug( "**ERROR: getting fee items: " + capContResult.getErrorMessage()); return false }
	
	for (ff in feeObjArr)
		if ( feestr.equals(feeObjArr[ff].getFeeCod()) && (!checkStatus || exists(feeObjArr[ff].getFeeitemStatus(),statusArray) ) )
			//return true;
			return false;
			
	return false;
	}

function branch(stdChoice)
	{
	doStandardChoiceActions(stdChoice,true,0);
	}
	
function pairObj(actID)
	{
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
		if (loadArr.length < 2 || loadArr.length > 3)
			{
			logMessage("**ERROR: The following Criteria/Action pair is incorrectly formatted.  Two or three elements separated by a caret (\"^\") are required. " + br + br + loadStr)
			}
		else
			{
			this.cri     = loadArr[0];
			this.act     = loadArr[1];
			this.elseact = loadArr[2];

			if (this.cri.length() == 0) this.continuation = true; // if format is like ("^action...") then it's a continuation of previous line

			var a = loadArr[1];
			var bb = a.indexOf("branch");
			//while (!enableVariableBranching && bb >= 0)
			while (bb >= 0)
			  {
			  var cc = a.substring(bb);
			  var dd = cc.indexOf("\")");
			  this.branch.push(cc.substring(8,dd));
			  a = cc.substring(dd);
			  bb = a.indexOf("branch");
			  }

			}
		}
	}
	
function docWrite(dstr,header,indent)
	{
	var istr = "";
	for (i = 0 ; i < indent ; i++)
		istr+="|  ";
	if (header && dstr)
		aa.print(istr + "------------------------------------------------");
	if (dstr) aa.print(istr + dstr);
	if (header)
		aa.print(istr + "------------------------------------------------");
	}

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

function updateAppStatus(stat,cmt)
	{
	updateStatusResult = aa.cap.updateAppStatus(capId,"APPLICATION",stat, sysDate, cmt ,systemUserObj);
	if (!updateStatusResult.getSuccess())
		//logDebug("Updated application status to " + stat + " successfully.");
//	else
		logDebug("ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}

function updateTask(wfstr,wfstat,wfcomment,wfnote)  // uses wfObjArray
	{
	if (!wfstat) wfstat = "NA";

	for (i in wfObjArray)
		{
   		fTask = wfObjArray[i];
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

function activateTask(wfstr) // uses wfObjArray
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

	for (i in wfObjArray)
		{
   		fTask = wfObjArray[i];
 		if ( !checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) ||
		     checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && wfstat.toUpperCase().equals(fTask.getDisposition().toUpperCase()) )
			{
			stepnumber = fTask.getStepNumber();
			aa.workflow.adjustTask(capId, stepnumber, "Y", "N", null, null)
			//logDebug("Activating Workflow Task: " + wfstr);
			}
		}
	}

function removeFee(fcode,fperiod) // Removes all fee items for a fee code and period
	{
	getFeeResult = aa.finance.getFeeItemByFeeCode(capId,fcode,fperiod);
	if (getFeeResult.getSuccess())
		{	
		var feeList = getFeeResult.getOutput();
		for (feeNum in feeList)
			{
			if (feeList[feeNum].getFeeitemStatus().equals("NEW")) 
				{
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				
				var editResult = aa.finance.removeFeeItem(capId, feeSeq);
				if (editResult.getSuccess())
					{
					logDebug("Removed existing Fee Item: " + fcode);
					}
				else
					{ logDebug( "**ERROR: removing fee item (" + fcode + "): " + editResult.getErrorMessage()); break }
				}
			//if (feeList[feeNum].getFeeitemStatus().equals("INVOICED"))
				//{
				//logDebug("Invoiced fee "+fcode+" found, not removed");
				//}
			}
		}		
	else
		{ logDebug( "**ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage())}
	
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

			//logDebug("Added Fee " + feeCod + ", Qty " + fqty);
			if (finvoice == "Y")
			{
				feeSeqList.push(feeSeq);
				paymentPeriodList.push(fperiod);
				}
			}
		else
			{
			logDebug("ERROR: assessing fee (" + feeCod + "): " + assessFeeResult.getErrorMessage());
			}
		} // for xx
	} // function

function addFee(fcode,fsched,fperiod,fqty,finvoice) // Adds a single fee, returns the fee descriptitem
	{
	//logDebug("Added Fee " + fcode + ", Qty " + fqty + ", feeSeq " + feeSeq + ",CAP ID:"+capId);

	assessFeeResult = aa.finance.createFeeItem(capId,fsched,fcode,fperiod,fqty);
	if (assessFeeResult.getSuccess())
		{
		feeSeq = assessFeeResult.getOutput();
		//logDebug("Added Fee " + fcode + ", Qty " + fqty + ", feeSeq " + feeSeq);
		if (invoiceFees == "Y")
			{
			feeSeqList.push(feeSeq);
			paymentPeriodList.push(fperiod);
			}
		return aa.finance.getFeeItemByPK(capId, feeSeq).getOutput()

		}
	else
		{
		logDebug("ERROR: assessing fee (" + fcode + "): " + assessFeeResult.getErrorMessage());
		return null
		}
	}

function updateFee(fcode,fsched,fperiod,fqty,finvoice) // Updates a fee with a new Qty.  If it doesn't exist, adds it
	{
	removeFee(fcode,fperiod); //due to the issue of new fee schedules we're going to remove and then add
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
					logDebug("Updated Qty on Existing Fee Item: " + fcode + " to Qty: " + fqty + ", feeSeq " + feeSeq);
					//aa.finance.calculateFees(capId);
					if (invoiceFees == "Y")
						{
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
		addFee(fcode,fsched,fperiod,fqty,finvoice);
	}


function elapsed() {
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000)
}

function logDebug(dstr)
	{
	if(showDebug)
		{
		aa.print(dstr)
		emailText+= dstr + "<br>";
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr)
		}
	}


function appSpecific() {
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
      logDebug("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());
      return null;
    }
  }

function loopTask(wfstr,wfstat,wfcomment,wfnote) // uses wfObjArray  -- optional process name
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length == 5)
		{
		processName = arguments[4]; // subprocess
		useProcess = true;
		}

	for (i in wfObjArray)
		{
   		fTask = wfObjArray[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
			dispositionDate = aa.date.getCurrentDate();
			stepnumber = fTask.getStepNumber();
			processID = fTask.getProcessID();

			if (useProcess)
				aa.workflow.handleDisposition(capId,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"L");
			else
				aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"L");

			logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat + ", Looping...");
			}
		}
	}

function getParam(pParamName) //gets parameter value and logs message showing param value
	{
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("Parameter : " + pParamName+" = "+ret);
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

function jsDateToYYYYMMDD(pJavaScriptDate)
	{
	//converts javascript date to string in YYYY-MM-DD format
	//
	if (pJavaScriptDate != null)
		{
		if (Date.prototype.isPrototypeOf(pJavaScriptDate))
	return pJavaScriptDate.getFullYear() + "-" + (pJavaScriptDate.getMonth()+1).toString()+"-"+pJavaScriptDate.getDate();
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
		//logDebug("getStandardChoice(" + stdChoice + "," + stdValue + ") = " + strControl);
		}
	else
		{
		//logDebug("getStandardChoice(" + stdChoice + "," + stdValue + ") does not exist");
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


function isTaskStatus(wfstr,wfstat) // optional process name...BATCH Version uses wfObjArray
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length > 2)
		{
		processName = arguments[2]; // subprocess
		useProcess = true;
		}

	for (i in wfObjArray)
		{
   		fTask = wfObjArray[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			if (fTask.getDisposition()!=null)
				{
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

	if (!aa.calendar.getNextWorkDay)
		{
		aa.print("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
		}
	else
		{
		var dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
		}

	return (dDate.getMonth()+1) + "/" + dDate.getDate() + "/" + dDate.getFullYear();;
	}


function scheduleInspectDate(iType,DateToSched) // optional inspector ID.  This function requires dateAdd function
	{
	var inspectorObj = null;
	if (arguments.length == 3)
		{
		var inspRes = aa.person.getUser(arguments[2])
		if (inspRes.getSuccess())
			inspectorObj = inspRes.getOutput();
		}

	var schedRes = aa.inspection.scheduleInspection(capId, inspectorObj, aa.date.parseDate(DateToSched), null, iType, "Scheduled via Script")

	if (schedRes.getSuccess())
		logDebug("Successfully scheduled inspection : " + iType + " for " + DateToSched);
	else
		logDebug("**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}

function scheduleInspection(iType,DaysAhead) // optional inspector ID.  This function requires dateAdd function
	{
	var inspectorObj = null;
	if (arguments.length == 3)
		{
		var inspRes = aa.person.getUser(arguments[2])
		if (inspRes.getSuccess())
			var inspectorObj = inspRes.getOutput();
		}

	var schedRes = aa.inspection.scheduleInspection(capId, inspectorObj, aa.date.parseDate(dateAdd(null,DaysAhead)), null, iType, "Scheduled via Script")

	if (schedRes.getSuccess())
		logDebug("Successfully scheduled inspection : " + iType + " for " + dateAdd(null,DaysAhead));
	else
		logDebug( "**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}

function addMonthsToDate(startDate, numMonths) {
    var addYears = Math.floor(numMonths/12);
    var addMonths = numMonths - (addYears * 12);
    var newMonth = startDate.getMonth() + addMonths;
    if (startDate.getMonth() + addMonths > 11) {
      ++addYears;
      newMonth = startDate.getMonth() + addMonths - 12;
    }
    var newDate = new Date(startDate.getFullYear()+addYears,newMonth,startDate.getDate(),startDate.getHours(),startDate.getMinutes(),startDate.getSeconds());

    // adjust to correct month
    while (newDate.getMonth() != newMonth) {
      newDate = addMonthsToDate(newDate, -1);
    }

    return newDate;
}

function editAppSpecific(itemName,itemValue)  // optional: itemCap
	{
	var updated = false;
	var i=0;
	itemCap = capId;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args

    	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
	 	{
		var appspecObj = appSpecInfoResult.getOutput();

		if (itemName != "")
			{
				while (i < appspecObj.length && !updated)
				{
					if (appspecObj[i].getCheckboxDesc() == itemName)
					{
						appspecObj[i].setChecklistComment(itemValue);
						var actionResult = aa.appSpecificInfo.editAppSpecInfos(appspecObj);
						if (actionResult.getSuccess()) {
							logDebug("app spec info item " + itemName + " has been given a value of " + itemValue);
						} else {
							logDebug("**ERROR: Setting the app spec info item " + itemName + " to " + itemValue + " .\nReason is: " +   actionResult.getErrorType() + ":" + actionResult.getErrorMessage());
						}
						updated = true;
					}
					i++;
				} // while loop
			} // item name blank
		} // got app specific object
	}

function autoAssignInspection(iNumber)
	{
	// updates the inspection and assigns to a new user
	// requires the inspection id
	//

	iObjResult = aa.inspection.getInspection(capId,iNumber);
	if (!iObjResult.getSuccess())
		{ logDebug("**ERROR retrieving inspection " + iNumber + " : " + iObjResult.getErrorMessage()) ; return false ; }

	iObj = iObjResult.getOutput();


	inspTypeResult = aa.inspection.getInspectionType(iObj.getInspection().getInspectionGroup(), iObj.getInspectionType())

	if (!inspTypeResult.getSuccess())
		{ logDebug("**ERROR retrieving inspection Type " + inspTypeResult.getErrorMessage()) ; return false ; }

	inspTypeArr = inspTypeResult.getOutput();

        if (inspTypeArr == null || inspTypeArr.length == 0)
		{ logDebug("**ERROR no inspection type found") ; return false ; }

	inspType = inspTypeArr[0]; // assume first

	inspSeq = inspType.getSequenceNumber();

	inspSchedDate = iObj.getScheduledDate().getYear() + "-" + iObj.getScheduledDate().getMonth() + "-" + iObj.getScheduledDate().getDayOfMonth()

 	logDebug(inspSchedDate)

	iout =  aa.inspection.autoAssignInspector(capId.getID1(),capId.getID2(),capId.getID3(), inspSeq, inspSchedDate)

	if (!iout.getSuccess())
		{ logDebug("**ERROR retrieving auto assign inspector " + iout.getErrorMessage()) ; return false ; }

	inspectorArr = iout.getOutput();

	if (inspectorArr == null || inspectorArr.length == 0)
		{ logDebug("**WARNING no auto-assign inspector found") ; return false ; }

	inspectorObj = inspectorArr[0];  // assume first

	iObj.setInspector(inspectorObj);

	assignResult = aa.inspection.editInspection(iObj)

	if (!assignResult.getSuccess())
		{ logDebug("**ERROR re-assigning inspection " + assignResult.getErrorMessage()) ; return false ; }
	else
		logDebug("Successfully reassigned inspection " + iObj.getInspectionType() + " to user " + inspectorObj.getUserID());

	}

function getScheduledInspId(insp2Check)
	{
	// warning, returns only the first scheduled occurrence
	var inspResultObj = aa.inspection.getInspections(capId);
	if (inspResultObj.getSuccess())
		{
		var inspList = inspResultObj.getOutput();
		for (xx in inspList)
			if (String(insp2Check).equals(inspList[xx].getInspectionType()) && inspList[xx].getInspectionStatus().toUpperCase().equals("SCHEDULED"))
				return inspList[xx].getIdNumber();
		}
	return false;
	}

function deactivateTask(wfstr) // uses global array wfObjArray
	{

	for (i in wfObjArray)
		{
   		var fTask = wfObjArray[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()))
			{
			var stepnumber = fTask.getStepNumber();
			var processID = fTask.getProcessID();
			var completeFlag = fTask.getCompleteFlag();

			aa.workflow.adjustTask(capId, stepnumber, "N", completeFlag, null, null)

			logDebug("deactivating Workflow Task: " + wfstr);
			}
		}
	}

function closeTask(wfstr,wfstat,wfcomment,wfnote) // uses global array wfObjArray
	{


	if (!wfstat) wfstat = "NA";

	for (i in wfObjArray)
		{
   		var fTask = wfObjArray[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()))
			{
			var dispositionDate = aa.date.getCurrentDate();
			var stepnumber = fTask.getStepNumber();
			var processID = fTask.getProcessID();

			aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");

			logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat);
			}
		}
	}

// exists:  return true if Value is in Array
//
function exists(eVal, eArray) {
	  for (ii in eArray)
	  	if (eArray[ii] == eVal) return true;
	  return false;
}

function getContactArray()
	{
	// Returns an array of associative arrays with contact attributes.  Attributes are UPPER CASE
	// optional capid
	var thisCap = capId;
	if (arguments.length == 1) thisCap = arguments[0];

	var cArray = new Array();

	var capContactResult = aa.people.getCapContactByCapID(thisCap);
	if (capContactResult.getSuccess())
		{
		var capContactArray = capContactResult.getOutput();
		for (yy in capContactArray)
			{
			var aArray = new Array();
			aArray["lastName"] = capContactArray[yy].getPeople().lastName;
			aArray["firstName"] = capContactArray[yy].getPeople().firstName;
			aArray["businessName"] = capContactArray[yy].getPeople().businessName;
			aArray["contactSeqNumber"] =capContactArray[yy].getPeople().contactSeqNumber;
			aArray["contactType"] =capContactArray[yy].getPeople().contactType;
			aArray["relation"] = capContactArray[yy].getPeople().relation;
			aArray["phone1"] = capContactArray[yy].getPeople().phone1;
			aArray["phone2"] = capContactArray[yy].getPeople().phone2;
			aArray["phone2countrycode"] = capContactArray[yy].getCapContactModel().getPeople().getPhone2CountryCode();
			aArray["email"] = capContactArray[yy].getCapContactModel().getPeople().getEmail();


			var pa = capContactArray[yy].getCapContactModel().getPeople().getAttributes().toArray();
	                for (xx1 in pa)
                   		aArray[pa[xx1].attributeName] = pa[xx1].attributeValue;
			cArray.push(aArray);
			}
		}
	return cArray;
	}

function sendSMS(messageReceiver,messageBody)
	{
	/*------------------------------------------------------------------------------------------------------/
	| START Location Configurable Parameters
	|
	/------------------------------------------------------------------------------------------------------*/
	var wsURL = "http://192.168.1.110:3005/SMSService.asmx?op=SendSMS";
	var wsUser = ""
	var wsPassword = "";
	var wsSOAPAction = "http://dpe.ae/ShortMessageService/2009/5/SMSServiceContract/SendSMS";

	var credAgentID = ""
	var credUserName = "system"
	var credPassword = "accela"
	var messageFrom = "DPE"
	var messageUnicode = "true"
	/*------------------------------------------------------------------------------------------------------/
	| END Location Configurable Parameters
	/------------------------------------------------------------------------------------------------------*/

	soapOut = "<?xml version=\"1.0\" encoding=\"utf-8\"?><soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:ns=\"http://dpe.ae/ShortMessageService/2009/5\" xmlns:ns1=\"http://dpe.ae/ShortMessageService/DataContract/CommonTypes/2009/5\"><soapenv:Header/><soapenv:Body><ns:SendSMS><ns:SendSMSRequest><ns:MessageDataContractMessagePart><ns1:From></ns1:From><ns1:Receiver></ns1:Receiver><ns1:Body></ns1:Body><ns1:IsUniCode></ns1:IsUniCode></ns:MessageDataContractMessagePart><ns:CredentialsPart><ns1:AgentId></ns1:AgentId><ns1:UserName></ns1:UserName><ns1:Password></ns1:Password></ns:CredentialsPart></ns:SendSMSRequest></ns:SendSMS></soapenv:Body></soapenv:Envelope>"

	soapOut = replaceNode(soapOut,"ns1:AgentId",credAgentID)
	soapOut = replaceNode(soapOut,"ns1:UserName",credUserName)
	soapOut = replaceNode(soapOut,"ns1:Password",credPassword)
	soapOut = replaceNode(soapOut,"ns1:From",messageFrom)
	soapOut = replaceNode(soapOut,"ns1:Receiver",messageReceiver)
	soapOut = replaceNode(soapOut,"ns1:Body",messageBody)
	soapOut = replaceNode(soapOut,"ns1:IsUniCode",messageUnicode)

	logDebug("Outbound SOAP: " + soapOut);

	returnObj = aa.util.httpPostToSoapWebService(wsURL, soapOut, wsUser, wsPassword, wsSOAPAction);

	if (!returnObj.getSuccess())
		{
		logDebug("*SOAP ERROR Type******\n" + returnObj.getErrorType() + "\n");
		logDebug("*SOAP ERROR Message******\n" + returnObj.getErrorMessage() + "\n");
		}
	else
		{
		logDebug("****** SOAP Response ******\n" + returnObj.getOutput() + "\n");
		}
	}

function replaceNode(fString,fName,fContents)
	{
	 var fValue = "";
	var startTag = "<"+fName+">";
	 var endTag = "</"+fName+">";

		 startPos = fString.indexOf(startTag) + startTag.length;
		 endPos = fString.indexOf(endTag);
		 // make sure startPos and endPos are valid before using them
		 if (startPos > 0 && startPos <= endPos)
		 		{
				  fValue = fString.substring(0,startPos) + fContents + fString.substring(endPos);
 					return unescape(fValue);
			}

	}

function replaceMessageTokens(m)
	{
	//  tokens in pipes will attempt to interpret as script variables
	//  tokens in curly braces will attempt to replace from AInfo (ASI, etc)
	//
	//  e.g.   |capId|  or |wfTask|  or |wfStatus|
	//
	//  e.g.   {Expiration Date}  or  {Number of Electrical Outlets}
	//
	//  e.g.   m = "Your recent license application (|capIdString|) has successfully passed |wfTask| with a status of |wfStatus|"

	while (m.indexOf("|"))
	  {
	  var s = m.indexOf("|")
	  var e = m.indexOf("|",s+1)
	  if (e <= 0) break; // unmatched
	  var r = m.substring(s+1,e)

	  var evalstring = "typeof(" + r + ") != \"undefined\" ? " + r + " : \"undefined\""
	  var v = eval(evalstring)
	  var pattern = new RegExp("\\|" + r + "\\|","g")
	  m = String(m).replace(pattern,v)
	  }

	while (m.indexOf("{"))
	  {
	  var s = m.indexOf("{")
	  var e = m.indexOf("}",s+1)
	  if (e <= 0) break; // unmatched
	  var r = m.substring(s+1,e)

	  var evalstring = "AInfo[\"" + r + "\"]"
	  var v = eval(evalstring)
	  var pattern = new RegExp("\\{" + r + "\\}","g")
	  m = String(m).replace(pattern,v)

	  }

	 return m
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

function getLicenseCapId(licenseCapType)
	{
	var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	var capLicenses = getLicenseProfessional(itemCap);
	if (capLicenses == null || capLicenses.length == 0)
		{
		return;
		}

	for (var capLic in capLicenses)
		{
		var LPNumber = capLicenses[capLic].getLicenseNbr()
		var lpCapResult = aa.cap.getCapID(LPNumber);
		if (!lpCapResult.getSuccess())
			{ logDebug("**ERROR: No cap ID associated with License Number : " + LPNumber) ; continue; }
		licCapId = lpCapResult.getOutput();
		if (appMatch(licenseCapType,licCapId))
			return licCapId;
		}
	}

function addStdCondition(cType,cDesc)
	{
	var itemCap = capId;
	if (arguments.length > 2) itemCap = arguments[2]; // use cap ID specified in args

	if (!aa.capCondition.getStandardConditions)
		{
		aa.print("addStdCondition function is not available in this version of Accela Automation.");
		}
        else
		{
		standardConditions = aa.capCondition.getStandardConditions(cType,cDesc).getOutput();
		for(i = 0; i<standardConditions.length;i++)
			{
			standardCondition = standardConditions[i]
			aa.capCondition.createCapConditionFromStdCondition(itemCap, standardCondition.getConditionNbr())
			}
		}
	}
	
function getLicenseProfessional(itemcapId)
{
	capLicenseArr = null;
	var s_result = aa.licenseProfessional.getLicenseProf(itemcapId);
	if(s_result.getSuccess())
	{
		capLicenseArr = s_result.getOutput();
		if (capLicenseArr == null || capLicenseArr.length == 0)
		{
			aa.print("WARNING: no licensed professionals on this CAP:" + itemcapId);
			capLicenseArr = null;
		}
	}
	else
	{
		aa.print("ERROR: Failed to license professional: " + s_result.getErrorMessage());
		capLicenseArr = null;
	}
	return capLicenseArr;
}

function getChildren(pCapType, pParentCapId)
	{
	// Returns an array of children capId objects whose cap type matches pCapType parameter
	// Wildcard * may be used in pCapType, e.g. "Building/Commercial/*/*"
	// Optional 3rd parameter pChildCapIdSkip: capId of child to skip

	var retArray = new Array();
	if (pParentCapId!=null) //use cap in parameter
		var vCapId = pParentCapId;
	else // use current cap
		var vCapId = capId;

	if (arguments.length>2)
		var childCapIdSkip = arguments[2];
	else
		var childCapIdSkip = null;

	var typeArray = pCapType.split("/");
	if (typeArray.length != 4)
		logDebug("**ERROR in childGetByCapType function parameter.  The following cap type parameter is incorrectly formatted: " + pCapType);

	var getCapResult = aa.cap.getChildByMasterID(vCapId);
	if (!getCapResult.getSuccess())
		{ logDebug("**WARNING: getChildren returned an error: " + getCapResult.getErrorMessage()); return null }

	var childArray = getCapResult.getOutput();
	if (!childArray.length)
		{ logDebug( "**WARNING: getChildren function found no children"); return null ; }

	var childCapId;
	var capTypeStr = "";
	var childTypeArray;
	var isMatch;
	for (xx in childArray)
		{
		childCapId = childArray[xx].getCapID();
		if (childCapIdSkip!=null && childCapIdSkip.getCustomID().equals(childCapId.getCustomID())) //skip over this child
			continue;

		capTypeStr = aa.cap.getCap(childCapId).getOutput().getCapType().toString();	// Convert cap type to string ("Building/A/B/C")
		childTypeArray = capTypeStr.split("/");
		isMatch = true;
		for (yy in childTypeArray) //looking for matching cap type
			{
			if (!typeArray[yy].equals(childTypeArray[yy]) && !typeArray[yy].equals("*"))
				{
				isMatch = false;
				continue;
				}
			}
		if (isMatch)
			retArray.push(childCapId);
		}

	logDebug("getChildren returned " + retArray.length + " capIds");
	return retArray;

	}
	
function loadAppSpecific(thisArr,capId) {
	// 
	// Returns an associative array of App Specific Info
	// Optional second parameter, cap ID to load from
	//
	
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args

    	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
	 	{
		var fAppSpecInfoObj = appSpecInfoResult.getOutput();

		for (loopk in fAppSpecInfoObj)
			{
			if (1 == 1) //(useAppSpecificGroupName)
				thisArr[fAppSpecInfoObj[loopk].getCheckboxType() + "." + fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
			else
				thisArr[fAppSpecInfoObj[loopk].checkboxDesc] = fAppSpecInfoObj[loopk].checklistComment;
			}
		}
	}

function createRefContactsFromCapContactsAndLink(pCapId, contactTypeArray, ignoreAttributeArray, replaceCapContact, overwriteRefContact, refContactExists)
	{

	// contactTypeArray is either null (all), or an array or contact types to process
	//
	// ignoreAttributeArray is either null (none), or an array of attributes to ignore when creating a REF contact
	//
	// replaceCapContact not implemented yet
	//
	// overwriteRefContact -- if true, will refresh linked ref contact with CAP contact data
	//
	// refContactExists is a function for REF contact comparisons.
	//
	var ingoreArray = new Array();
	if (arguments.length > 1) ignoreArray = arguments[1];

	var c = aa.people.getCapContactByCapID(pCapId).getOutput()
	var cCopy = aa.people.getCapContactByCapID(pCapId).getOutput()  // must have two working datasets

	for (var i in c)
	   {
	   var con = c[i];

	   var p = con.getPeople();
	   
	   if (contactTypeArray && !exists(p.getContactType(),contactTypeArray))
		continue;  // not in the contact type list.  Move along.

	   
	   var refContactNum = con.getCapContactModel().getRefContactNumber();
	   if (refContactNum)  // This is a reference contact.   Let's refresh or overwrite as requested in parms.
	   	{
		//NOT USED
	   	if (overwriteRefContact)
	   		{
	   		p.setContactSeqNumber(refContactNum);  // set the ref seq# to refresh
	   		
	   		
	   						var a = p.getAttributes();
			
							if (a)
								{
								var ai = a.iterator();
								while (ai.hasNext())
									{
									var xx = ai.next();
									xx.setContactNo(refContactNum);
									}
					}
					
					
					
	   		var r = aa.people.editPeopleWithAttribute(p,p.getAttributes());
	   		
			if (!r.getSuccess()) 
				logDebug("WARNING: couldn't refresh reference people : " + r.getErrorMessage()); 
			else
				logDebug("Successfully refreshed ref contact #" + refContactNum + " with CAP contact data"); 
			}
		//NOT USED	
	   	if (replaceCapContact)
	   		{
				// To Be Implemented later.   Is there a use case?
			}
			
	   	}
	   	else  // user entered the contact freehand.   Let's create or link to ref contact.
	   	{
			var ccmSeq = p.getContactSeqNumber();

			var existingContact = refContactExists(p);  // Call the custom function to see if the REF contact exists // comparePeopleGeneric
			//existingContact = false;
			
			var p = cCopy[i].getPeople();  // get a fresh version, had to mangle the first for the search

			if (existingContact)  // we found a match with our custom function.  Use this one.
				{
					refPeopleId = existingContact;
				}
			else  // did not find a match, let's create one
				{

				var a = p.getAttributes();

				if (a)
					{
					//
					// Clear unwanted attributes
					var ai = a.iterator();
					while (ai.hasNext())
						{
						var xx = ai.next();
						if (ignoreAttributeArray && exists(xx.getAttributeName().toUpperCase(),ignoreAttributeArray))
							ai.remove();
						}
					}

				var r = aa.people.createPeopleWithAttribute(p,a);

				if (!r.getSuccess())
					{logDebug("WARNING: couldn't create reference people : " + r.getErrorMessage()); continue; }

				//
				// createPeople is nice and updates the sequence number to the ref seq
				//

				var p = cCopy[i].getPeople();
				var refPeopleId = p.getContactSeqNumber();

				logDebug("Successfully created reference contact #" + refPeopleId);
				}

			//
			// now that we have the reference Id, we can link back to reference
			//

		    var ccm = aa.people.getCapContactByPK(pCapId,ccmSeq).getOutput().getCapContactModel();

		    ccm.setRefContactNumber(refPeopleId);
		    r = aa.people.editCapContact(ccm);

		    if (!r.getSuccess())
				{ logDebug("WARNING: error updating cap contact model : " + r.getErrorMessage()); }
			else
				{ logDebug("Successfully linked ref contact " + refPeopleId + " to cap contact " + ccmSeq);}


	    }  // end if user hand entered contact 
	}  // end for each CAP contact
} // end function

function createPublicUserFromContact(capId)   // optional: Contact Type, default Applicant
{
    var contactType = "Applicant";
    var contact;
    if (arguments.length > 1) contactType = arguments[1]; // use contact type specified

    var capContactResult = aa.people.getCapContactByCapID(capId);
    if (capContactResult.getSuccess()) {
        var Contacts = capContactResult.getOutput();
        for (yy in Contacts) {
            aa.print(Contacts[yy].getCapContactModel().getPeople().getContactType())
            if (contactType.equals(Contacts[yy].getCapContactModel().getPeople().getContactType()))
                contact = Contacts[yy];
        }
    }
    aa.print(contact.getEmail());
    if (!contact)
    { logDebug("Couldn't create public user for " + contactType + ", no such contact"); return false; }
    if (!contact.getEmail())
    { logDebug("Couldn't create public user for " + contactType + ", no email address"); return false; }
    // check if exists already

    var getUserResult = aa.publicUser.getPublicUserByEmail(contact.getEmail())
    if (getUserResult.getSuccess()) {
        var userModel = getUserResult.getOutput()
        aa.print("found the user already");
        if (userModel) return userModel;  // send back the existing user
    }
    // create a new one

    var publicUser = aa.publicUser.getPublicUserModel();
    publicUser.setFirstName(contact.getFirstName());
    publicUser.setLastName(contact.getLastName());
    publicUser.setEmail(contact.getEmail());
    publicUser.setUserID(contact.getEmail());
    publicUser.setPassword("7d3fe8b8d7ba80addfc296b07de60cc101e4af60"); //password : Gary0813
    publicUser.setAuditID("PublicUser");
    publicUser.setAuditStatus("A");
    publicUser.setCellPhone(contact.getCapContactModel().getPeople().getPhone2());

    var result = aa.publicUser.createPublicUser(publicUser);

    if (result.getSuccess()) {
        logDebug("Created public user " + contact.getEmail() + "  sucessfully.");
        var userSeqNum = result.getOutput();
        var userModel = aa.publicUser.getPublicUser(userSeqNum).getOutput()

        // Activate for agency
        aa.publicUser.createPublicUserForAgency(userModel);

        // send Activate email
        aa.publicUser.sendActivateEmail(userModel, true, true);

        // send another email
        aa.publicUser.sendPasswordEmail(userModel);
        return userModel;
    }
    else {
        logDebug("**Warning creating public user " + contact.getEmail() + "  failure: " + result.getErrorMessage()); return false;
    }
	
}


function comparePeopleGeneric(peop)
	{

	// this function will be passed as a parameter to the createRefContactsFromCapContactsAndLink function.
	//
	// takes a single peopleModel as a parameter, and will return the sequence number of the first G6Contact result
	//
	// returns null if there are no matches
	//
	// current search method is by email only.  In order to use attributes enhancement 09ACC-05048 must be implemented
	//

	// peop.setAuditDate(null)
	// peop.setAuditID(null)
	// peop.setAuditStatus(null)
	// peop.setBirthDate(null)
	// peop.setBusName2(null)
	// peop.setBusinessName(null)
	// peop.setComment(null)
	 peop.setCompactAddress(null)
	// peop.setContactSeqNumber(null)
	// peop.setContactType(null)
	// peop.setContactTypeFlag(null)
	// peop.setCountry(null)
	// peop.setCountryCode(null)
	// peop.setEmail(null)       //just as a test we are using email
	// peop.setEndBirthDate(null)
	// peop.setFax(null)
	// peop.setFaxCountryCode(null)
	// peop.setFein(null)
	// peop.setFirstName(null)
	// peop.setFlag(null)
	// peop.setFullName(null)
	// peop.setGender(null)
	// peop.setHoldCode(null)
	// peop.setHoldDescription(null)
	// peop.setId(null)
	// peop.setIvrPinNumber(null)
	// peop.setIvrUserNumber(null)
	// peop.setLastName(null)
	// peop.setMaskedSsn(null)
	// peop.setMiddleName(null)
	// peop.setNamesuffix(null)
	// peop.setPhone1(null)
	// peop.setPhone1CountryCode(null)
	// peop.setPhone2(null)
	// peop.setPhone2CountryCode(null)
	// peop.setPhone3(null)
	// peop.setPhone3CountryCode(null)
	// peop.setPostOfficeBox(null)
	// peop.setPreferredChannel(null)
	// peop.setPreferredChannelString(null)
	// peop.setRate1(null)
	// peop.setRelation(null)
	// peop.setSalutation(null)
	// peop.setServiceProviderCode(null)
	// peop.setSocialSecurityNumber(null)
	// peop.setTitle(null)
	// peop.setTradeName(null)

	 var r = aa.people.getPeopleByPeopleModel(peop);
	//var r = aa.people.getPeopleByOthersForDaily(peop.getContactType(),peop.getBusinessName(),peop.getFirstName(),peop.getMiddleName(),peop.getLastName(),peop.getCity(),peop.getState(),peop.getZip(),null,null);

    if (!r.getSuccess())
			{ logDebug("WARNING:comparePeopleGeneric error searching for people : " + r.getErrorMessage()); return false; }

	var peopResult = r.getOutput();

	if (peopResult.length == 0)
		{
		logDebug("Searched for REF contact, no matches found, returing null");
		return null;
		}

	if (peopResult.length > 0)
		{
		logDebug("Searched for a REF Contact, " + peopResult.length + " matches found! returning the first match : " + peopResult[0].getContactSeqNumber() );
		return peopResult[0].getContactSeqNumber()
		}

}