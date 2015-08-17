/*------------------------------------------------------------------------------------------------------/
| Program:  UpdateLicFireWorkflow
| Client: 
| Version 1.0 - UpdateLicFireWorkflow 3/27/13 JBS
|
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	var emailText = "";
	var showDebug = true;									// Set to true to see debug messages in email confirmation
	var maxSeconds = 60 * 5;								// number of seconds allowed for batch processing, usually < 5*60
	var showMessage = false;

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	sysDate = aa.date.getCurrentDate();
	batchJobResult = aa.batchJob.getJobID()	
	batchJobName = "UpdateLicFireWorkflow";
	wfObjArray = null;										//Workflow tasks array passed from main to helper functions.
	var br = "<BR>";	

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
	var appGroup = "Licenses";  //getParam("appGroup");						//  app Group to process {Licenses}
	var appTypeType = "Fire";  //getParam("appTypeType");					//  app type to process {Rental License}
	var appSubtype =  "FireExtinguisherMaint";  //getParam("appSubtype");	//  app subtype to process {NA}
	var appCategory = "NA";  //getParam("appCategory");						//	app category to process {NA}
	var workflowProcess = "FIREXTING"										//	Workflow process to which making changes 
	var capId;																//	capId object that is passed to functions.
	var AltID;
	var emailAddress = "jschneider@cityofmadison.com"; //getParam("emailAddress");			// email to send report
		
	var mSubjChoice = ""; //getParam("emailSubjectStdChoice");			// Message subject resource from "Batch_Job_Messages" Std Choice
	var mMesgChoice = ""; //getParam("emailContentStdChoice");			// Message content resource from "Batch_Job_Messages" Std Choice

/*----------------------------------------------------------------------------------------------------/
|
| End: BATCH PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
	var startDate = new Date();
	var timeExpired = false;

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
		aa.sendMail("noreply@cityofmadison.com", emailAddress, "", batchJobName + " Results", emailText);

/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/


/*------------------------------------------------------------------------------------------------------/
| <===========External Functions (used by Action entries)
/------------------------------------------------------------------------------------------------------*/

	function mainProcess()	
	{	
		
		var activeRecCnt = 0;
		
		logDebug("Start Date : " + startDate);						
		
		//Get all records for specified record type.
		myCapArray = GetRecordsByRecType(appGroup,appTypeType,appSubtype,appCategory)
		
		//Loop through the records in this record type.
		for (thisCap in myCapArray)  	
		{
			if (elapsed() > maxSeconds) // only continue if time hasn't expired
			{			
				logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
				timeExpired = true ;
				break;
			}
							
			var oCap = myCapArray[thisCap];
			capId = oCap.getCapID();
			AltID = capId.customID;
			
			//logDebug("CAP ID parts are: ID1 = " + oCapID.ID1 + "; ID2 = " + oCapID.ID2 + "; ID3 = " + oCapID.ID3);
			//logDebug("CAP Status: " + oCap.getCapStatus());
			
			//Get the Expiration Date and Expiration Status (Renewal Info tab of rec).			
			
			var dtExpDate = null;
			var expResult = aa.expiration.getLicensesByCapID(capId);			
			
			if (expResult.getSuccess())	{	
				myExpResult = expResult.getOutput();				
				dtExpDate = convertDate(myExpResult.getExpDate());
				if (dtExpDate == null)
					logDebug("Expiration Date is NULL for record " + AltID);
			}else{
				logDebug("Could not retrieve expiration info for record " + AltID);
			}
			
			//Process records only if the Expiration Date is greater than or equal to today's date.
			if (dtExpDate >= startDate) {				
				activeRecCnt++;
				logDebug(br);
				logDebug("<strong>" + AltID + "</strong>");
				logDebug("Record expiration date is NOT expired, so processing record.");
				logDebug("Expiration Status: " + myExpResult.expStatus);
				logDebug("Expiration Date as date: " + dtExpDate);				
				
				//process workflow: 					
				//if (capId.customID == "FIREML-2011-00036"){					
									
				var intakeCompleteFlag;
				var examAdminCompleteFlag;
				var licIssuanceCompleteFlag;						
		
				//Get record's current workflow process.				
				wfTasks = loadTasksCustom();
				wfObjArray = wfTasks;
				
				logDebug("Original wf tasks: ")
				for (var i=0; i < wfTasks.length; i++){
					logDebug(wfTasks[i].getTaskDescription());
					
					if (wfTasks[i].getTaskDescription() == "Intake")
						intakeCompleteFlag = wfTasks[i].getCompleteFlag();

					if (wfTasks[i].getTaskDescription() == "Exam Administered")
						examAdminCompleteFlag = wfTasks[i].getCompleteFlag();
					
					if (wfTasks[i].getTaskDescription() == "License Issuance" || wfTasks[i].getTaskDescription() == "Issuance")
						licIssuanceCompleteFlag = wfTasks[i].getCompleteFlag();											
				}
					
				logDebug("Intake Complete Flag = " + intakeCompleteFlag);
				logDebug("Exam Admin Complete Flag = " + examAdminCompleteFlag);
				logDebug("Lic Issuance Complete Flag = " + licIssuanceCompleteFlag);
				
				//Last parm is false if you want to keep the existing workflow history.
					var wfNewProc = aa.workflow.deleteAndAssignWorkflow(capId, workflowProcess, false);					
					if (wfNewProc.success == true){
						logDebug("Workflow was successfully deleted and assigned.");
						
						wfNewTasks = loadTasksCustom();
						wfObjArray = wfNewTasks;
						logDebug("New wf tasks: ")
						
						var wfComment = "Updated by batch process";
												
						for (var i=0; i < wfObjArray.length; i++){
							var wfStatus = null;
							fTask = wfObjArray[i];							
							logDebug(fTask.getTaskDescription());
							
							//logDebug(fTask.getActiveFlag());
							
							if (fTask.getTaskDescription() == "Intake"){
								//First task is automatically active after calling deleteAndAssignWorkflow function, so need to deactivate.
								if (intakeCompleteFlag == "Y")
									fTask.setCompleteFlag("Y");
								//Deactivate the task.
								fTask.setActiveFlag("N");
							}
							
							if (fTask.getTaskDescription() == "Exam Administered" && examAdminCompleteFlag == "Y")
									fTask.setCompleteFlag("Y");																		
								
							if (fTask.getTaskDescription() == "License Issuance" && licIssuanceCompleteFlag == "Y")								
									fTask.setCompleteFlag("Y");							

							if (fTask.getTaskDescription() == "License Status"){
								if(myExpResult.expStatus == "About to Expire")
									wfStatus = "About to Expire";
								
								if(myExpResult.expStatus == "Active")
									wfStatus = "Active";
									
								if (wfStatus != null){
									fTask.setDisposition(wfStatus);									
									fTask.setDispositionComment(wfComment);
								}
								
								fTask.setActiveFlag("Y");
							}
							
							//editTask actually updates the task.
							if (fTask.getTaskDescription() != "Closed"){								
								aa.workflow.editTask(fTask);
								logDebug(fTask.getTaskDescription() + " has been updated.")
							}
						}						
							
						logDebug(br + "Final workflow state");
						var wfFinalResult = aa.workflow.getTasks(capId);						
						if (wfFinalResult.getSuccess()){
							wfFinalTasks = wfFinalResult.getOutput();
							for (var i=0; i < wfFinalTasks.length; i++){
								logDebug("Task: " + wfFinalTasks[i].getTaskDescription());
								logDebug("Status: " + wfFinalTasks[i].getDisposition());
								logDebug("Complete Flag: " + wfFinalTasks[i].getCompleteFlag());								
								logDebug("Task Active: " + wfFinalTasks[i].getActiveFlag());
							}
						}
						//this was closing spot for getting wfNewTasks workflow.
					}else logDebug("deleteAndAssignWorkflow failed!");
				//} //end one cap testing.
			}//End processing records where the Expiration Date is greater than or equal to today's date.			
		} //end all records of specified record type for...loop.
		logDebug(br + "Total Active records processes: " + activeRecCnt);
	} //end mainProcess()

/* //workflow info:
taskName = getTaskDescription() or taskDescription
status = fTask.getDisposition();
comment = fTask.getDispositionComment();
process = fTask.getProcessCode();
if (fTask.getStatusDate()) myTask.statusdate = "" + (fTask.getStatusDate().getMonth() + 1) + "/" + fTask.getStatusDate().getDate() + "/" + (fTask.getStatusDate().getYear() + 1900);
processID = fTask.getProcessID();
note = fTask.getDispositionNote();
step = fTask.getStepNumber();
active = fTask.getActiveFlag(); 
*/

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
	*	Status = CAP or record status
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
	
	function updateTask(wfstr,wfstat,wfcomment,wfnote)  // uses wfObjArray
	{
		if (!wfstat) wfstat = "NA";

		for (i in wfObjArray){
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
				return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear());
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

	// exists:  return true if Value is in Array
	//
	function exists(eVal, eArray) {
		  for (ii in eArray)
			if (eArray[ii] == eVal) return true;
		  return false;
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
