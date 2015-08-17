/*------------------------------------------------------------------------------------------------------/
| Program:  AAPlanDataUpdate
| Client: 
| Version 1.0 - AAPlanDataUpdate 2/17/14 JBS
|
|
| Description: To be run once a year, probably in February, to set AA Plan records with Approved AA Plan
|	       that are one year into two year cycle to Data Update status. It also sets the parent 
|	       Prequal record to "Update to AA Plan Required" status (workflow, ASI field, Rec Status).
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
	batchJobName = "AAPlanDataUpdate";
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
	var appGroup = "Licenses";  					//getParam("appGroup");				//  app Group to process {Licenses}
	var appTypeType = "DCR";  						//getParam("appTypeType");			//  app type to process {Rental License}
	var appSubtype =  "AA Plan";  					//getParam("appSubtype");			//  app subtype to process {NA}
	var appCategory = "NA";  						//getParam("appCategory");			//	app category to process {NA}	
	var ExpireStatus = "Active";                    //getParam("expirationStatus")	// Expiration status
	var capId;										//capId object that is passed to functions.
	var holdId;
	var prequalCapId;
	var AltID;
	var cap;
	var appStatus;
	var PrequalAAPlanStatusLbl = "LICENSE INFORMATION.Affirmative Action Plan - Madison General Ordinance 32.02 (9)";	
	var PrequalAAPlanStatusValue = "";
	var updateAAPlanReq = "Update to AA Plan Required"
	var wfProcAAPlan = "AA PLAN";														//	Workflow process to which making changes
	var wfProcPrequal = "LIC_PREQUAL";													//	Workflow process to which making changes
	var emailAddressTo = "jschneider@cityofmadison.com"; //getParam("emailAddress");		// email to send report	
        var emailAddressCc = "elamsupport@cityofmadison.com";
	var capCountAAPlan = 0;
	var capCountPrequal = 0;
	
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

	if (emailAddressTo.length)
		aa.sendMail("noreply@cityofmadison.com", emailAddressTo, emailAddressCc, batchJobName + " - " + myEnvironment + " Results", emailText);

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
		var expResult = aa.expiration.getLicensesByDate(ExpireStatus, fromDate, toDate);
		
		if (expResult.getSuccess()){
			myExp = expResult.getOutput();
			logDebug("Processing " + myExp.length + " expiration records.<br><br>");
		} else {
			logDebug("ERROR: Error getting AA Plan records. REASON: " + expResult.getErrorType() + ":" + expResult.getErrorMessage()); 
			return false;
		}

		// for each B1Expiration record:
		for (rec in myExp) {
			if (elapsed() > maxSeconds){// only continue if time hasn't expired			
				logDebug("A script time-out has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
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
				
				appStatus = cap.getCapStatus();				

				//if (appType.length && appMatch(appType) && AltID == "AAPLAN-2014-00431") {   //For testing a single record.
				if (appType.length && appMatch(appType)) {					
					logDebug("On AA Plan record " + AltID); 
					
					if (appStatus != "Active"){
						logDebug(AltID + ": " + "AA Plan record status is NOT Active; it is " + appStatus + ".");						
					} else {
						//Record Status is Active. Now, verify workflow task = AA Plan Status and status = Active.
						logDebug("AA Plan record has Active record status.");						
	
						//Per Ginger: do not need to double-check the workflow task & status once we know the record status in Approved.

						logDebug("Updating AA Plan record.");
						setTask("AA Plan Status", "N", "N", wfProcAAPlan);
						setTask("Data Update Review", "Y", "N", wfProcAAPlan);
						updateAppStatus("Data Update Required", updateComment);
						capCountAAPlan ++;
						
						//Get Prequal parent record of the current AA Plan record.
						prequalCapId = getParent();  //getParent() returns false if no parent record found.						
												
						if (prequalCapId != null && prequalCapId != false){
						//Save the AA Plan capId in holder var and make the capId for the parent prequal record the default capId in case used in places not anticipated.
							holdId = capId; 
							capId = prequalCapId;
							
							logDebug("Prequal record is " + capId.getCustomID());
							if (getAppSpecific(PrequalAAPlanStatusLbl, capId) != null){
								PrequalAAPlanStatusValue = getAppSpecific(PrequalAAPlanStatusLbl, capId).toUpperCase();
							}
																		
							if (PrequalAAPlanStatusValue == "APPROVED") {							
								//Update wf task "License Status" to status "Update to AA Plan Required"; task should remain active. 
								updateTask("License Status", updateAAPlanReq, updateComment, "", wfProcPrequal, prequalCapId);
						
								//set the ASI AA Plan - MGO 32.02(9) status = "Update to AA Plan Required"
								editAppSpecific(PrequalAAPlanStatusLbl, updateAAPlanReq, prequalCapId);
							
								//set Prequal Record Status to "Update to AA Plan Required"
								updateAppStatus(updateAAPlanReq, updateComment, prequalCapId);	

								capCountPrequal++;
							} else {
								logDebug("Prequal parent record does not have AA Plan set to Approved on ASI; it is set to " + PrequalAAPlanStatusValue + ", so did not update workflow, ASI AA Plan status field, nor the record status.");
							}//End updating Prequal Approved plan workflow, ASI AA Plan status field, and record status.
																				
							//Swap back the AA Plan capId back as the default one.
							capId = holdId;
							
						}//End if Prequal cap not null.									
					}//End if..else on AA Plan record status.
					
					logDebug(br);	
					
				}//End if appMatch or single record processing. 
			}//End capId
		} //End For...loop
		
		logDebug("Total AA Plan records updated: " + capCountAAPlan);
		logDebug("Total Prequal records updated: " + capCountPrequal);
	} //End mainProcess()


/*------------------------------------------------------------------------------------------------------/
| <===========Internal Functions and Classes
/------------------------------------------------------------------------------------------------------*/

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
			// load() : tokenizes and loads the criteria and action
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

	function getParent() {
	// returns the capId object of the parent.  Assumes only one parent!
	//
	getCapResult = aa.cap.getProjectParents(capId,1);
	if (getCapResult.getSuccess())
		{
		parentArray = getCapResult.getOutput();
		if (parentArray.length)
			return parentArray[0].getCapID();
		else
			{
			logDebug( "**WARNING: GetParent found no project parent for this application");
			return false;
			}
		}
	else
		{ 
		logDebug( "**WARNING: getting project parents:  " + getCapResult.getErrorMessage());
		return false;
		}
	}