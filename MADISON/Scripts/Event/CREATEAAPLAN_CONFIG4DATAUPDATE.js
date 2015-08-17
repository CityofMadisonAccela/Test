/*------------------------------------------------------------------------------------------------------/
| Program:  CreateAAPlan_Config4DataUpdate
| Client: 
| Version 1.0 - CreateAAPlan_Config4DataUpdate 2/11/14 JBS
|		This batch script was written with the intention of being run only one time,
|		in February, 2014.
|
|				
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	var useAppSpecificGroupName = true;
	var showDebug = true;									// Set to true to see debug messages in email confirmation
	var showMessage = false;
	var emailText = "";
	var maxSeconds = 60 * 5;								// number of seconds allowed for batch processing, usually < 5*60
	var showMessage = false;

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	sysDate = aa.date.getCurrentDate();
	batchJobResult = aa.batchJob.getJobID();
	batchJobName = "CreateAAPlanAndStartDataUpdate";
	wfObjArray = null;										//Workflow tasks array passed from main to helper functions.
	var br = "<BR>";	
	var tab = "    ";
	var myEnvironment = "Dev";
	batchJobID = 0;
	
	if (batchJobResult.getSuccess())
	  {
	  batchJobID = batchJobResult.getOutput();
	  logDebug(myEnvironment + " Batch Job " + batchJobName + " Job ID is " + batchJobID);
	  }
	else
	  logDebug(myEnvironment + " Batch job ID not found " + batchJobResult.getErrorMessage());


/*----------------------------------------------------------------------------------------------------/
|
| Start: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	//Use "*" for an App Type part that you do not want to specify.
	var appGroup = "Licenses";  					//getParam("appGroup");				// app Group to process {Licenses}
	var appTypeType = "Engineering";  				//getParam("appTypeType");			// app type to process {Rental License}
	var appSubtype =  "Prequalified Contractor";  	//getParam("appSubtype");			// app subtype to process {NA}
	var appCategory = "Na";  					    //getParam("appCategory");			// app category to process {NA}
	var PrequalExpStatus = "Active";                //getParam("expirationStatus")	                // Expiration status
	var capId;										// capId object that is passed to functions.
	var AltID;
	var cap;
	var catB = "";
	var catB1 = "";
	var catB2 = "";
	var AAPlanStatusLabel = "LICENSE INFORMATION.Affirmative Action Plan - Madison General Ordinance 32.02 (9)";	
	var updateAAPlanReq = "Update to AA Plan Required"
	var AAPlanStatusValue = "";
	var wfProcAAPlan = "AA PLAN";														//	Workflow process to which making changes
	var bIsCatB = false;
	var emailAddress = "jschneider@cityofmadison.com"; //getParam("emailAddress");	// email to send report
	var capCount = 0;
	
/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	var startDate = new Date();
	var timeExpired = false;
	
	//Expiration date is March 1 of next year.
	var fromDate = "3/1/" + (sysDate.getYear() + 1);
	var toDate = fromDate; 
	
	logDebug("fromDate = " + fromDate);	
	
	var startTime = startDate.getTime();			// Start timer
	var systemUserObj = aa.person.getUser("ADMIN").getOutput();
	var appType = appGroup + "/" + appTypeType + "/" + appSubtype + "/" + appCategory;	

/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/
		
	logDebug("Start of Job");
	
	if (!timeExpired) 
		mainProcess();
	logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");

	if (emailAddress.length)
		aa.sendMail("noreply@cityofmadison.com", emailAddress, "", batchJobName + " - " + myEnvironment + " Results", emailText);

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

	function mainProcess()	
	{		
		var capCount = 0;		
		var updateComment = "Updated by batch process";							
		
		logDebug("Start Date : " + startDate);						
		
		//Get records with given expiration status & date.
		var expResult = aa.expiration.getLicensesByDate(PrequalExpStatus, fromDate, toDate);
		
		if (expResult.getSuccess()){
			myExp = expResult.getOutput();
			logDebug("Processing " + myExp.length + " expiration records" + br);
		} else {
			logDebug("ERROR: Error Getting Expirations records. Reason is: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
			return false;
		}

		// for each B1Expiration rec
		for (rec in myExp) {
			if (elapsed() > maxSeconds){// only continue if time hasn't expired			
				logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
				timeExpired = true ;
				break;
			}
				
			expireRec = myExp[rec];						

			capId = aa.cap.getCapID(expireRec.getCapID().getID1(), expireRec.getCapID().getID2(), expireRec.getCapID().getID3()).getOutput();
				
			if (!capId) {			
				logDebug("Could not get a Cap ID for " + expireRec.getCapID().getID1() + "-" + expireRec.getCapID().getID2() + "-" + expireRec.getCapID().getID3());
			} else {
				//We have a capId.
				cap = aa.cap.getCap(capId).getOutput();
				appTypeResult = cap.getCapType();			//create CapTypeModel object
				appTypeString = appTypeResult.toString();
				appTypeArray = appTypeString.split("/");
				AltID = capId.getCustomID();
				
				//if (appType.length && appMatch(appType) && AltID == "LPC2012160-01465") {   //For testing a single record.
				if (appType.length && appMatch(appType)){
					//logDebug("We have a record type match!");
					
					//Get the values of the three ASI Category B checkboxes.
					if (getAppSpecific("CATEGORIES.B", capId) != null)					
						catB = getAppSpecific("CATEGORIES.B", capId).toUpperCase();
						
					if (getAppSpecific("CATEGORIES.B1", capId) != null)					
						catB1 = getAppSpecific("CATEGORIES.B1", capId).toUpperCase();
					
					if (getAppSpecific("CATEGORIES.B2", capId) != null)					
						catB2 = getAppSpecific("CATEGORIES.B2", capId).toUpperCase();
										
					
					if (catB == "CHECKED" || catB1 == "CHECKED" || catB2 == "CHECKED"){
						bIsCatB = true;
						capCount++;
					} else {
						logDebug(AltID + " does NOT meet the criteria for processing.");
						//logDebug("category B = " + catB);
						//logDebug("category B1 = " + catB1);
						//logDebug("category B2 = " + catB2);							
					}
					
					if (bIsCatB == true){												
						if (getAppSpecific(AAPlanStatusLabel, capId) != null){
							AAPlanStatusValue = getAppSpecific(AAPlanStatusLabel, capId).toUpperCase();
						}
						
						logDebug(AltID + " meets the criteria for processing; AA Plan Status = " + getAppSpecific(AAPlanStatusLabel, capId));
						
						if (AAPlanStatusValue == "APPROVED") {
						//First, update Prequal record.
							logDebug("AA Plan is Approved");													
							
							//Update wf task "License Status" to status "Update to AA Plan Required"; task should remain active. 
							updateTask("License Status", updateAAPlanReq, updateComment, "");
						
							//set the ASI AA Plan - MGO 32.02(9) status = "Update to AA Plan Required"
							editAppSpecific(AAPlanStatusLabel, updateAAPlanReq, capId);
						
							//set Prequal Record Status to "Update to AA Plan Required"
							updateAppStatus(updateAAPlanReq, updateComment, capId);																		
							
						}//End Prequal Approved plan						

					//Second, create and update AA Plan child record.
						var holdId;						
						var AAPlanCapId =  createChild("Licenses","DCR","AA Plan","NA", "Child of " + AltID, capId);
						
						logDebug("Variable type for AAPlanCapId = " + typeof(AAPlanCapId));
						logDebug("AA Plan CAP ID = " + AAPlanCapId);
						
						if (typeof(AAPlanCapId) == "object" && AAPlanCapId != null){
							//Save the Prequal capId in holder var and make the capId for the new AA Plan record the default capId in case used in places not anticipated.
							holdId = capId; 
							capId = AAPlanCapId;
							
							var contactArray = null; 
							var newCon = null;
							
							var oContacts = aa.people.getCapContactByCapID(AAPlanCapId);
							
							if(oContacts.getSuccess())
								var conAry = oContacts.getOutput();
							
							if(conAry != null){
							
								//Remove the Business Contact copied over from the Prequal cap.
								for(con in conAry){								
									if (conAry[con].getPeople().contactType == "Business Contact") 
										aa.people.removeCapContact(AAPlanCapId, conAry[con].getPeople().contactSeqNumber);
								}
								
								//User the Contractor contact to help set up the new EEO/AA Officer.
								for(con in conAry){								
									if (conAry[con].getCapContactModel().getContactType() == "Contractor") 
										newCon = conAry[con].getCapContactModel();
								}							
							}
							
							if (newCon != null) {
								newCon.setContactType("EEO/AA Officer"); 
								newCon.setPrimaryFlag("Y"); 
								newCon.setBusinessName(null); 
								newCon.setTradeName(null); 
								newCon.setEmail(null); 
								newCon.setFullName(null); 
								newCon.setFirstName(null); 
								newCon.setMiddleName(null); 
								newCon.setLastName(null); 
								newCon.setPhone1(null); 
								newCon.setPhone2(null);
								newCon.setPhone3(null); 
								newCon.setFax(null); 
								newCon.setAddressLine1(null); 
								newCon.setAddressLine2(null); 
								newCon.setCity(null); 
								newCon.setState(null); 
								newCon.setZip(null); 
								newCon.setComment(null); 
								newCon.sePreferredChannele(null);
							
								aa.people.createCapContact(newCon); 
								//debugObject(newCon);																
							}
							
							//Set Expiration status and date (i.e., Renewal Info tab); date is March 1 of next year.
							sExpireDate = "3/1/" + (sysDate.getYear() + 1);
							logDebug("the AA Plan will expire on " + sExpireDate);														
							licEditExpInfo("Active", sExpireDate);
							
							//Set Expiration  Date on ASI, too.
							editAppSpecific("GENERAL INFO.Expiration Date", sExpireDate, AAPlanCapId);
							
							//Close Intake and AA Plan Review wf tasks w/o a status.
							setTask("Intake", "N", "Y", wfProcAAPlan);
							setTask("AA Plan Review", "N", "Y", wfProcAAPlan);

							//Covert var from object to string.
							var planStatus = String(AAPlanStatusValue);
							
							switch(planStatus){
								case "APPROVED":
									logDebug("In Switch at APPROVED.");
									setTask("Data Update Review", "Y", "N", wfProcAAPlan);
									updateAppStatus("Data Update Required", updateComment);
									break;
								case "EXEMPT":
									logDebug("In Switch at EXEMPT.");
									editAppSpecific("GENERAL INFO.Exempt", "CHECKED", AAPlanCapId);
									updateTask("AA Plan Status", "Exempt", updateComment, "");		    //Set task status.
									setTask("AA Plan Status", "Y", "N", wfProcAAPlan);					//Make task active.
									updateAppStatus("Exempt", updateComment);
									break;
								default :
									logDebug("In Switch at the default case.")
									break;
							}							
														
							//Swap back the Prequal capId back as the default one.
							capId = holdId;
						}//End AA Plan child record processing.							
					}//End CatB = true
					
					logDebug(br);
				}//End if appMatch or single record processing. 					
			}//End capId
									
			//Reset values to default.			
			bIsCatB = false;
			catB = "";
			catB1 = "";
			catB2 = "";
											
		} //End For...loop
		
		logDebug("Total Prequal records with target expiration status and date and have category B = " + capCount);
	} //End mainProcess()


/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes
/------------------------------------------------------------------------------------------------------*/

	function GetRecordsByRecType(sAppGroup, sAppType, sAppSubtype, sAppCategory){
	
		var capArray;
		var capResult = aa.cap.getByAppType(sAppGroup, sAppType, sAppSubtype, sAppCategory);
		
		if (capResult.getSuccess())	{
			capArray = capResult.getOutput();			
			logDebug("Processing " + capArray.length + " records of type " + sAppGroup + "/" + sAppType + "/" + sAppSubtype + "/" + sAppCategory);
			return capArray
		}else{
			logDebug("ERROR: Getting " + sAppGroup + "/" + sAppType + "/" + sAppSubtype + "/" + sAppCategory + " records; reason is: " + 	capResult.getErrorType() + ":" + capResult.getErrorMessage()); 
			return false 
		}
	}
	
	/* The following scripts are used to run EMSE Scripts */	

	function logDebug(dstr)
		{
		if(showDebug)
			{
			aa.print(dstr)
			emailText+= dstr + "<br>";
			aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr)
			}
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

	function updateAppStatus(stat,cmt) // optional cap id
	/***** Parameters: **********************************
	*	stat = CAP or record status
	*	cmt = A comment to go with the status
	*   [capId] = optional CAP ID
	****************************************************/	
	{
		var itemCap = capId;
		if (arguments.length == 3) 
			itemCap = arguments[2]; // use cap ID specified in args

		var updateStatusResult = aa.cap.updateAppStatus(itemCap, "APPLICATION", stat, sysDate, cmt, systemUserObj);
		if (updateStatusResult.getSuccess())		
			logDebug("Updated application status to " + stat + " successfully.");
		else
			logDebug("**ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
	}


	function loadTasksCustom() {  //uses global var capId.
		
		var taskArr = new Array();

		var workflowResult = aa.workflow.getTasks(capId);
		if (workflowResult.getSuccess()){
			wfObj = workflowResult.getOutput();
			//debugObject(wfObj);				
		}else{ 
			logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
			return false; 
		}
		
		return wfObj
	}

	
	function closeTask(wfstr,wfstat,wfcomment,wfnote) // uses global array wfObjArray
	{
		if (!wfstat) wfstat = "NA";

		for (i in wfObjArray) {
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
		
	function loopTask(wfstr,wfstat,wfcomment,wfnote) // uses wfObjArray  -- optional process name
	{
		var useProcess = false;
		var processName = "";
		if (arguments.length == 5) {
			processName = arguments[4]; // subprocess
			useProcess = true;
		}

		for (i in wfObjArray){
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
	
	function updateTask(wfstr,wfstat,wfcomment,wfnote) {	// optional process name, cap id
	
		var useProcess = false;
		var processName = "";
	
		if (arguments.length > 4) 
			{
			if (arguments[4] != "")
				{
				processName = arguments[4]; // subprocess
				useProcess = true;
				}
			}
		var itemCap = capId;
		if (arguments.length == 6) itemCap = arguments[5]; // use cap ID specified in args
	 
		var workflowResult = aa.workflow.getTasks(itemCap);
		if (workflowResult.getSuccess())
			var wfObj = workflowResult.getOutput();
		else
		{ logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
				
		if (!wfstat) wfstat = "NA";
				
		for (i in wfObj)
		{
			var fTask = wfObj[i];
			if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
				var dispositionDate = aa.date.getCurrentDate();
				var stepnumber = fTask.getStepNumber();
				var processID = fTask.getProcessID();
				if (useProcess)
					aa.workflow.handleDisposition(itemCap,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,"U");
				else
					aa.workflow.handleDisposition(itemCap,stepnumber,wfstat,dispositionDate,wfnote,wfcomment,systemUserObj,"U");
				//logMessage("Updating Workflow Task " + wfstr + " with status " + wfstat);
				logDebug("Updating Workflow Task " + wfstr + " with status " + wfstat);
			}                                   
		}
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
		
		for (i in wfObj){
			fTask = wfObj[i];
			if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
				if (fTask.getActiveFlag().equals("Y"))
					return true;
				else
					return false;
		}
	}
		
	function activateTask(wfstr) // uses wfObjArray
	{
		//optional 2nd param: wfstat.  Use if selecting by task and status.
		//SR5043
		var wfstat = "";
		var checkStatus = false;
		if (arguments.length==2){
			wfstat = arguments[1];
			checkStatus = true;
		}

		for (i in wfObjArray){
			fTask = wfObjArray[i];
			if ( !checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) ||
				 checkStatus && fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase()) && wfstat.toUpperCase().equals(fTask.getDisposition().toUpperCase()) )
			{
				stepnumber = fTask.getStepNumber();
				aa.workflow.adjustTask(capId, stepnumber, "Y", "N", null, null);
				logDebug("Activating Workflow Task: " + wfstr);
			}
		}
	}

	function deactivateTask(wfstr) // uses global array wfObjArray
	{
		for (i in wfObjArray) {
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
		
	function taskEditStatus(wfstr,wfstat,wfcomment,wfnote,pFlow,pProcess) { //Batch version of function		
		//Needs isNull function
		//pProcess not coded yet
		//
		pFlow = isNull(pFlow,"U"); //If no flow control specified, flow is "U" (Unchanged)
		var dispositionDate = aa.date.getCurrentDate();

		for (i in wfObjArray){
			if ( wfstr.equals(wfObjArray[i].getTaskDescription()) )
			{
				var stepnumber = wfObjArray[i].getStepNumber();
				aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj,pFlow);
				logDebug("Updating Workflow Task: " + wfstr + " with status " + wfstat);
			}
		}
	}

	function elapsed() {
		var thisDate = new Date();
		var thisTime = thisDate.getTime();
		return ((thisTime - startTime) / 1000)
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

	function convertDate(thisDate) {
	//converts date to javascript date
		if (typeof(thisDate) == "string") {
			var retVal = new Date(String(thisDate));
			if (!retVal.toString().equals("Invalid Date"))
			return retVal;
		}
		if (typeof(thisDate)== "object") {
			if (!thisDate.getClass) {// object without getClass, assume that this is a javascript date already 
				return thisDate;
			}
			if (thisDate.getClass().toString().equals("class com.accela.aa.emse.util.ScriptDateTime")) {
				return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getFullYear());
			}
			if (thisDate.getClass().toString().equals("class java.util.Date")) {
				return new Date(thisDate.getTime());
			}
			if (thisDate.getClass().toString().equals("class java.lang.String")) {
				return new Date(String(thisDate));
			}
		}
		if (typeof(thisDate) == "number") {
			return new Date(thisDate);  // assume milliseconds
		}
		logDebug("**WARNING** convertDate cannot parse date : " + thisDate);
		return null;
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
		
	function getCapId(pid1,pid2,pid3) { 

		var s_capResult = aa.cap.getCapID(pid1, pid2, pid3);
		if(s_capResult.getSuccess())
		  return s_capResult.getOutput();
		else
		{
		  logDebug("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());
		  return null;
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

	function getAppSpecific(itemName) { // optional: itemCap
		var updated = false;
		var i=0;
		var itemCap = capId;
		if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
		
		if (useAppSpecificGroupName) {
			if (itemName.indexOf(".") < 0) {
				logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true"); 
				return false 
			}
			var itemGroup = itemName.substr(0,itemName.indexOf("."));
			var itemName = itemName.substr(itemName.indexOf(".")+1);
		}
		
		var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
		if (appSpecInfoResult.getSuccess()) {
			var appspecObj = appSpecInfoResult.getOutput();
			if (itemName != "") {
				for (i in appspecObj) {
					if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup) )
					{
						return appspecObj[i].getChecklistComment();
						break;
					}
				}
			}
		} else { 
			logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage())
		}
}

	function editAppSpecific(itemName,itemValue){  // optional: itemCap

		var itemCap = capId;
		var itemGroup = null;
		if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args
		
		if (useAppSpecificGroupName)
		{
			if (itemName.indexOf(".") < 0)
				{ logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
			
			
			itemGroup = itemName.substr(0,itemName.indexOf("."));
			itemName = itemName.substr(itemName.indexOf(".")+1);
		}
		
		var appSpecInfoResult = aa.appSpecificInfo.editSingleAppSpecific(itemCap,itemName,itemValue,itemGroup);

		if (appSpecInfoResult.getSuccess())
		 {
			if(arguments.length < 3) //If no capId passed update the ASI Array
				AInfo[itemName] = itemValue; 
		} 	
		else
			{ logDebug( "WARNING: " + itemName + " was not updated."); }
	}

	// exists:  return true if Value is in Array
	//
	function exists(eVal, eArray) {
		  for (ii in eArray)
			if (eArray[ii] == eVal) return true;
		  return false;
	}

	function getLicenseCapId(licenseCapType){
		
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

	function createChild(grp,typ,stype,cat,desc){ // optional parent capId

	// creates the new application and returns the capID object

		var itemCap = capId
		if (arguments.length > 5) itemCap = arguments[5]; // use cap ID specified in args
		
		var appCreateResult = aa.cap.createApp(grp,typ,stype,cat,desc);
		logDebug("creating cap " + grp + "/" + typ + "/" + stype + "/" + cat);
		if (appCreateResult.getSuccess())
			{
			var newId = appCreateResult.getOutput();
			logDebug("cap " + grp + "/" + typ + "/" + stype + "/" + cat + " created successfully ");
			
			// create Detail Record
			capModel = aa.cap.newCapScriptModel().getOutput();
			capDetailModel = capModel.getCapModel().getCapDetailModel();
			capDetailModel.setCapID(newId);
			aa.cap.createCapDetail(capDetailModel);

			var newObj = aa.cap.getCap(newId).getOutput();	//Cap object
			var result = aa.cap.createAppHierarchy(itemCap, newId); 
			if (result.getSuccess())
				logDebug("Child application successfully linked");
			else
				logDebug("Could not link applications");

			// Copy Parcels

			var capParcelResult = aa.parcel.getParcelandAttribute(itemCap,null);
			if (capParcelResult.getSuccess())
				{
				var Parcels = capParcelResult.getOutput().toArray();
				for (zz in Parcels)
					{
					logDebug("adding parcel #" + zz + " = " + Parcels[zz].getParcelNumber());
					var newCapParcel = aa.parcel.getCapParcelModel().getOutput();
					newCapParcel.setParcelModel(Parcels[zz]);
					newCapParcel.setCapIDModel(newId);
					newCapParcel.setL1ParcelNo(Parcels[zz].getParcelNumber());
					newCapParcel.setParcelNo(Parcels[zz].getParcelNumber());
					aa.parcel.createCapParcel(newCapParcel);
					}
				}

			// Copy Contacts
			capContactResult = aa.people.getCapContactByCapID(itemCap);
			if (capContactResult.getSuccess())
				{
				Contacts = capContactResult.getOutput();
				for (yy in Contacts)
					{
					var newContact = Contacts[yy].getCapContactModel();
					newContact.setCapID(newId);
					aa.people.createCapContact(newContact);
					logDebug("added contact");
					}
				}	

			// Copy Addresses
			capAddressResult = aa.address.getAddressByCapId(itemCap);
			if (capAddressResult.getSuccess())
				{
				Address = capAddressResult.getOutput();
				for (yy in Address)
					{
					newAddress = Address[yy];
					newAddress.setCapID(newId);
					aa.address.createAddress(newAddress);
					logDebug("added address");
					}
				}
			
			return newId;
			}
		else
			{
			logDebug( "**ERROR: adding child App: " + appCreateResult.getErrorMessage());
			}
	}
		
	function setTask(wfstr,isOpen,isComplete) {  // optional process name isOpen, isComplete take 'Y' or 'N'		
		
		var useProcess = false;
		var processName = "";
		
		if (arguments.length == 4) {		
			processName = arguments[3]; // subprocess
			useProcess = true;
		}

		var workflowResult = aa.workflow.getTasks(capId);
		
		if (workflowResult.getSuccess())
			var wfObj = workflowResult.getOutput();
		else {
			logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); 
			return false;
		}
		
		for (i in wfObj){
			var fTask = wfObj[i];
			if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
				var stepnumber = fTask.getStepNumber();
				var processID = fTask.getProcessID();
				var completeFlag = fTask.getCompleteFlag();

				if (useProcess)
					aa.workflow.adjustTask(capId, stepnumber, processID, isOpen, isComplete, null, null);
				else
					aa.workflow.adjustTask(capId, stepnumber, isOpen, isComplete, null, null);

				logDebug("set Workflow Task: " + wfstr);
			}                                              
		}
	}
	
	function licEditExpInfo (pExpStatus, pExpDate)
	{
	//Edits expiration status and/or date
	//Needs licenseObject function
	//06SSP-00238
	//
	var lic = new licenseObject(null);
	if (pExpStatus!=null)
		{
		lic.setStatus(pExpStatus);
		}
		
	if (pExpDate!=null)
		{
		lic.setExpiration(pExpDate);
		}
	}

	function licenseObject(licnumber){  // optional renewal Cap ID -- uses the expiration on the renewal CAP.

		itemCap = capId;
		if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args

		this.refProf = null;		// licenseScriptModel (reference licensed professional)
		this.b1Exp = null;		// b1Expiration record (renewal status on application)
		this.b1ExpDate = null;
		this.b1ExpCode = null;
		this.b1Status = null;
		this.refExpDate = null;
		this.licNum = licnumber;	// License Number


		// Load the reference License Professional if we're linking the two
		if (licnumber) // we're linking
			{
			var newLic = getRefLicenseProf(licnumber)
			if (newLic)
					{
					this.refProf = newLic;
					tmpDate = newLic.getLicenseExpirationDate();
					if (tmpDate)
							this.refExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
					logDebug("Loaded reference license professional with Expiration of " + this.refExpDate);
					}
			}

		// Load the renewal info (B1 Expiration)

		b1ExpResult = aa.expiration.getLicensesByCapID(itemCap)
			if (b1ExpResult.getSuccess())
				{
				this.b1Exp = b1ExpResult.getOutput();
				tmpDate = this.b1Exp.getExpDate();
				if (tmpDate)
					this.b1ExpDate = tmpDate.getMonth() + "/" + tmpDate.getDayOfMonth() + "/" + tmpDate.getYear();
				this.b1Status = this.b1Exp.getExpStatus();
				logDebug("Found renewal record of status : " + this.b1Status + ", Expires on " + this.b1ExpDate);
				}
			else
				{ logDebug("**ERROR: Getting B1Expiration Object for Cap.  Reason is: " + b1ExpResult.getErrorType() + ":" + b1ExpResult.getErrorMessage()) ; return false }


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
				logDebug("Updated reference license issued to " + expDate); }

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
				logDebug("Updated renewal to status " + licStat); }
			}

		this.getStatus = function()
			// Get Expiration Status
			{
			if (this.b1Exp) {
				return this.b1Exp.getExpStatus();
				}
			}

		this.getCode = function()
			// Get Expiration Status
			{
			if (this.b1Exp) {
				return this.b1Exp.getExpCode();
				}
			}
	}

	function getRefLicenseProf(refstlic){
		var refLicObj = null;
		var refLicenseResult = aa.licenseScript.getRefLicensesProfByLicNbr(aa.getServiceProviderCode(),refstlic);
		if (!refLicenseResult.getSuccess())
			{ logDebug("**ERROR retrieving Ref Lic Profs : " + refLicenseResult.getErrorMessage()); return false; }
		else
			{
			var newLicArray = refLicenseResult.getOutput();
			if (!newLicArray) return null;
			for (var thisLic in newLicArray)
				if (refstlic && newLicArray[thisLic] && refstlic.toUpperCase().equals(newLicArray[thisLic].getStateLicense().toUpperCase()))
					refLicObj = newLicArray[thisLic];
			}

		return refLicObj;
	}