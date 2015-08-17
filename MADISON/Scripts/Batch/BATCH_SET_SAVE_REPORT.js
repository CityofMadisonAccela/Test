/* 
	Script Name: BATCH_SET_SAVE_REPORT

	This is a batch script to run through a set and print a report and email the set version of the report.
	
	There are 6 parameters to use:
	
	"SetName"
	"CrystalReport"
	"CrystalReportSet"
	"GroupEmail"
         "DeleteCAPsFromSet" - This is a Y/N parameter
	"ReportModule"
	
	For both Crystal & SSRS Reports, use "AltID" or "SetID" as the report parameter name in order to match the hard-coded parameter names used here (see functions storeSetReportToDiskAndEmail and saveReport).
	
*/

var maxSeconds = 60 * 600;							// number of seconds allowed for batch processing, usually < 5*60
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
wfObjArray = null;

batchJobID = 0;
if (batchJobResult.getSuccess())
  {
  batchJobID = batchJobResult.getOutput();
  logDebug("Batch Job " + batchJobName + " Job ID is " + batchJobID);
  }
else
  logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());

  
//Variables
var sysDate1 = aa.date.getCurrentDate();
var sysDate = dateAdd(null, 0);
var countAll = 0;
var countProcessed = 0;
var startTime = sysDate.getTime();
var timeExpired = false;
var strReportName = "";
var debug = "";								// Debug String
var br = "<BR>";							// Break Tag
var capId;
var altId;
var emailText = "";
var useAppSpecificGroupName = false;
var cap;
var capStatus;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var AInfo = new Array();
var sEnvironment = "DEV"; //DEV, Test, Production.
var backupSetName = "";			//Used for sets TAM1STNOTICE , TAM2NDNOTICE, and TAMORDERSNOTICE for Health - Hausbeck. - Jane S., 5/14/2015

//Get parameters from Batch Job:
var setName = getParam("SetName");
var crystalReportName = getParam("CrystalReport");
var crystalReportNameSet = getParam("CrystalReportSet");
var groupEmail = getParam("GroupEmail");
//var groupEmail = "jschneider@cityofmadison.com"
var deleteCapsFromSet = getParam("DeleteCAPsFromSet");
var reportModule = getParam("ReportModule");

if (!timeExpired) mainProcess();

function mainProcess()
	{
		// This section is to make so daily batch script doesn't run on the weekends
		/*var dayAdjust = 0 ;             // Dates need adjustment depending on when the batch job that runs this
										// script is kicked off (between close of business and midnight, or
										// midnight and open of business).
		var vToday = new Date();

		if ( vToday.getHours() < 18 )   // If this is being run before the close of business (allowing for one
										// hour of after-hours work)
		{
			logDebug( "Running between midnight and 6:00 PM -- dayAdjust activated getHour: " + vToday.getHours() + " vToday: " + vToday.getDay()) ;
			dayAdjust = 1 ;                // Then we are really working on yesterday's situation
		}
		else
		{
			logDebug( "Running between 6:00 PM and midnight -- dayAdjust not activated" ) ;
		}

		switch ( vToday.getDay() - dayAdjust ) 
		{
			case 0:
			case 6:
				logMessage( "INFO" + nbsp, "The script will not run on weekends." ) ;
				return;
				break;
			default:
				break;
		}	We are still working this out */ 
		
/**********************************************************************************************************
		Start code added by Jane Schneider 5/13/2015
		Currently applies only to Health - Hausbeck sets TAM1STNOTICE, TAM2NDNOTICE, and TAMORDERSNOTICE.
**********************************************************************************************************/
		//Clear out back-up set
			if (setName == "TAM1STNOTICE" || setName == "TAM2NDNOTICE" || setName == "TAMORDERSNOTICE"){
				var oTAMSet = null;
				var oSetOutput = null;
				var oMember = null;
						
				backupSetName = setName + "_BAK";
				//logDebug("Removing old members from back-up set " + backupSetName + ".");				

				oTAMSet = aa.set.getCAPSetMembersByPK(backupSetName);		
				if(oTAMSet.getSuccess()){
					oSetOutput = oTAMSet.getOutput();											
					oSetIterator = oSetOutput.iterator();
					
					while(oSetIterator.hasNext()){
						oMember = oSetIterator.next();
						capId = aa.cap.getCapID(oMember.ID1,oMember.ID2,oMember.ID3).getOutput();
						
						if(capId != null) {
							//logDebug("Removing " + capId.getCustomID() + " from the back-up set.");
							aa.set.removeSetHeadersListByCap(backupSetName,capId);
						}
					} //End While loop.
				}
			}
			
			capId = null;
			//logDebug("Now processing these set members:");
/******************************************************************************
		End code added by Jane Schneider 5/13/2015
******************************************************************************/

		//Create & Email report set version.
		storeSetReportToDiskAndEmail(crystalReportNameSet,groupEmail);

		//Get the CAPS
		BICAP = aa.set.getCAPSetMembersByPK(setName); //Here we are going to attempt to get the caps from the set
		
		if (BICAP.getSuccess())
		{
			BICAPs = BICAP.getOutput().toArray();
			countAll = BICAPs.length;
			for(var iRecords=0; iRecords < BICAPs.length; iRecords++) 
			{
				sca = String(BICAPs[iRecords]).split("-");
				capId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
				cap = aa.cap.getCap(capId).getOutput();				// Cap object
				capStatus = cap.getCapStatus();	
				altId = capId.getCustomID();

				//Don't think these next three lines are needed in this script, but not hurting anything, so leaving. - Jane S. 5/14/2015
				cd = aa.cap.getCapDetail(capId).getOutput().getCapDetailModel(); 
				capAsgnStaff = cd.getAsgnStaff(); 
				capAsgnDept = cd.getAsgnDept();
				
				saveReport(crystalReportName);

				//Inner if statement added by Jane S. for Health - Hausbeck TAM sets. - Jane S., 5/13/2015
                if (deleteCapsFromSet == "Y")
				{
					if(backupSetName != ""){
						aa.set.add(backupSetName,capId);
					}
				   aa.set.removeSetHeadersListByCap(setName,capId);
                }
				                
                countProcessed++;
				
				//We'll comment this out for production
				//logDebug(altId);
				if (elapsed() > maxSeconds) // only continue if time hasn't expired
				{
					logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
					timeExpired = true;
					break;
				}
			}
		}
	}

/*	
aa.sendMail("noreply@cityofmadison.com", groupEmail, "rsjachrani@cityofmadison.com", "Audit Report for " + setName + " - " + sEnvironment, emailText + br + elapsed() + "seconds " + br + "Processed " + countProcessed + "/" + countAll);
aa.env.setValue("ScriptReturnMessage", debug);
*/

function storeSetReportToDiskAndEmail(reportName,emailAddresses)
{
	var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);
	
	if (reportInfoModel.getSuccess())
	{
		report = reportInfoModel.getOutput();
		report.setModule(reportModule);  // Setting the module (e.g., Licenses, WeightsMeasures)		
		parameters = aa.util.newHashMap();
		//parameters.put("val1",setName);			//No longer being used due to Crystal Reports upgrade. - Jane S. 8/5/2015
		parameters.put("SetID",setName);			//Updated parameter name due to Crystal Reports upgrade. - Jane S 8/5/2015
		report.setReportParameters(parameters);
		report2 = report.getReportInfoModel(); 
		report2.setNotSaveToEDMS(true);
		//debugObject(report);
	}

	var reportResult = aa.reportManager.getReportResult(report);

	if(reportResult.getSuccess())
	{
		reportResult = reportResult.getOutput();
		var reportFile = aa.reportManager.storeReportToDisk(reportResult);
		if (reportFile.getSuccess())
		{
			reportFile = reportFile.getOutput();
			aa.sendEmail("noreply@cityofmadison.com", emailAddresses, "elamsupport@cityofmadison.com",  "Set Report for " + setName + " - " + sEnvironment, "See Attached " + br + emailText + br + elapsed() + "seconds ", reportFile);
		}
	}
	else
	{
		emailText += "Could not run report " + reportName + " for SET Name " + setName + br;
	}
}

function saveReport(reportName)
{
	var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);
	
	if (reportInfoModel.getSuccess())
	{
		report = reportInfoModel.getOutput();		
		report.setModule(reportModule);			// Setting the module (e.g., Licenses, WeightsMeasures)
		report.setCapId(capId);

		parameters = aa.util.newHashMap();
		//parameters.put("val1",altId);			//No longer being used due to Crystal Reports upgrade. - Jane S. 8/5/2015
		parameters.put("AltID",altId);			//Updated parameter name due to Crystal Reports upgrade. - Jane S 8/5/2015
		report.setReportParameters(parameters);
		report2 = report.getReportInfoModel(); 
		report2.setNotSaveToEDMS(false);
	}

	var reportResult = aa.reportManager.getReportResult(report);

	if(reportResult.getSuccess())
	{
		reportResult = reportResult.getOutput();
		var reportFile = aa.reportManager.storeReportToDisk(reportResult);
		if (reportFile.getSuccess())
		{
			reportFile = reportFile.getOutput();
		}
	}
	else
	{
		emailText+="Could not run report for #" + altId + br;
	}
}

function getParam(pParamName) //gets parameter value and logs message showing param value
	{
	var ret = "" + aa.env.getValue(pParamName);
	logDebug("" + pParamName+": "+ret);
	return ret;
	}

function editTaskSpecific(wfName,itemName,itemValue)  // optional: itemCap
	{
	var updated = false;
	var i=0;
	itemCap = capId;
	if (arguments.length == 4) itemCap = arguments[3]; // use cap ID specified in args
	//
 	// Get the workflows
 	//
 	var workflowResult = aa.workflow.getTasks(itemCap);
 	if (workflowResult.getSuccess())
 		wfObj = workflowResult.getOutput();
 	else
 		{ logDebug("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }

 	//
 	// Loop through workflow tasks
 	//
 	for (i in wfObj)
 		{
 		fTask = wfObj[i];
 		stepnumber = fTask.getStepNumber();
 		processID = fTask.getProcessID();
 		if (wfName.equals(fTask.getTaskDescription())) // Found the right Workflow Task
 			{
  		TSIResult = aa.taskSpecificInfo.getTaskSpecifiInfoByDesc(itemCap,processID,stepnumber,itemName);
 			if (TSIResult.getSuccess())
 				{
	 			var TSI = TSIResult.getOutput();
				if (TSI != null)
					{
					var TSIArray = new Array();
					TSInfoModel = TSI.getTaskSpecificInfoModel();
					TSInfoModel.setChecklistComment(itemValue);
					TSIArray.push(TSInfoModel);
					TSIUResult = aa.taskSpecificInfo.editTaskSpecInfos(TSIArray);
					if (TSIUResult.getSuccess())
						{
						//logDebug("Successfully updated TSI Task=" + wfName + " Item=" + itemName + " Value=" + itemValue);
						AInfo[itemName] = itemValue;  // Update array used by this script
						}
					else
						{ logDebug("**ERROR: Failed to Update Task Specific Info : " + TSIUResult.getErrorMessage()); return false; }
					}
				else
					logDebug("No task specific info field called "+itemName+" found for task "+wfName);
	 			}
	 		else
	 			{
	 			logDebug("**ERROR: Failed to get Task Specific Info objects: " + TSIResult.getErrorMessage());
	 			return false;
	 			}
	 		}  // found workflow task
		} // each task
	}

function addFee(fcode,fsched,fperiod,fqty,finvoice) // Adds a single fee, returns the fee descriptitem
	{
	assessFeeResult = aa.finance.createFeeItem(capId,fsched,fcode,fperiod,fqty);
	if (assessFeeResult.getSuccess())
		{
		feeSeq = assessFeeResult.getOutput();
		//logDebug("Added Fee " + fcode + ", Qty " + fqty + ", feeSeq " + feeSeq);
		//if (invoiceFees == "Y")
		//	{
		//	feeSeqList.push(feeSeq);
		//	paymentPeriodList.push(fperiod);
		//	}
		return aa.finance.getFeeItemByPK(capId, feeSeq).getOutput()

		}
	else
		{
		logDebug("ERROR: assessing fee (" + fcode + "): " + assessFeeResult.getErrorMessage() + " " + altId);
		return null
		}
	}

function updateWorkDesc(newWorkDes)  // optional CapId
	{
	 var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args


	var workDescResult = aa.cap.getCapWorkDesByPK(itemCap);
	var workDesObj;

	if (!workDescResult.getSuccess())
		{
		logDebug("**ERROR: Failed to get work description: " + workDescResult.getErrorMessage());
		return false;
		}

	var workDesScriptObj = workDescResult.getOutput();
	if (workDesScriptObj)
		workDesObj = workDesScriptObj.getCapWorkDesModel()
	else
		{
		logDebug("**ERROR: Failed to get workdes Obj: " + workDescResult.getErrorMessage());
		return false;
		}


	workDesObj.setDescription(newWorkDes);
	aa.cap.editCapWorkDes(workDesObj);

	//aa.print("Updated Work Description to : " + newWorkDes);

	}

function editAppSpecific(itemName,itemValue)  // optional: itemCap
{
	var updated = false;
	var i=0;
	
	itemCap = capId;
	
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args
   	
  	if (useAppSpecificGroupName)
	{
		if (itemName.indexOf(".") < 0)
			{ logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
		
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
	}
   	
   	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
 	{
		var appspecObj = appSpecInfoResult.getOutput();
		if (itemName != "")
		{
			while (i < appspecObj.length && !updated)
			{
				if (appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup))
				{
					appspecObj[i].setChecklistComment(itemValue);
						
					var actionResult = aa.appSpecificInfo.editAppSpecInfos(appspecObj);
					if (!actionResult.getSuccess()) 
					{
						logDebug("**ERROR: Setting the app spec info item " + itemName + " to " + itemValue + " .\nReason is: " +   actionResult.getErrorType() + ":" + actionResult.getErrorMessage());
					}
						
					updated = true;
					AInfo[itemName] = itemValue;  // Update array used by this script
				}
				
				i++;
				
			} // while loop
		} // item name blank
	} // got app specific object	
	else
	{ 
		logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage());
	}
}//End Function

function closeTask(wfstr,wfstat,wfcomment,wfnote) // optional process name
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
  	 	var wfObj = workflowResult.getOutput();
  	//else
  	//  	{ logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	if (!wfstat) wfstat = "NA";
	
	for (i in wfObj)
		{
   		var fTask = wfObj[i];
 		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
//			var dispositionDate = aa.date.getCurrentDate(); //RIKI!!!
			var dispositionDate = aa.date.parseISODate(strIssuedDate);
			var stepnumber = fTask.getStepNumber();
			var processID = fTask.getProcessID();

			if (useProcess)
				aa.workflow.handleDisposition(capId,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
			else
				aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
			
	//		logMessage("Closing Workflow Task: " + wfstr + " with status " + wfstat);
	//		logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat);
			}			
		}
	}

function elapsed() 
	{
	var thisDate = new Date();
	var thisTime = thisDate.getTime();
	return ((thisTime - startTime) / 1000) 
	}
	
function debugObject(object)
{
 var output = ''; 
 for (property in object) { 
   output += "<font color=red>" + property + "</font>" + ': ' + "<bold>" + object[property] + "</bold>" +'; ' + "<BR>"; 
 } 
 logDebug(output);
} 

function logDebug(dstr)
	{
	emailText+=dstr + br;
	}
	
function dateAdd(td,amt)
	// perform date arithmetic on a string
	// td can be "mm/dd/yyyy" (or any string that will convert to JS date)
	// amt can be positive or negative (5, -3) days
	// if optional parameter #3 is present, use working days only
	{

	var useWorking = false;
	if (arguments.length == 3)
		useWorking = true;

	if (!td)
		dDate = new Date();
	else
		dDate = new Date(td);
	var i = 0;
	if (useWorking)
		if (!aa.calendar.getNextWorkDay)
			{
			logDebug("getNextWorkDay function is only available in Accela Automation 6.3.2 or higher.");
			while (i < Math.abs(amt))
				{
				dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * (amt > 0 ? 1 : -1)));
				if (dDate.getDay() > 0 && dDate.getDay() < 6)
					i++
				}
			}
		else
			{
			while (i < Math.abs(amt))
				{
				dDate = new Date(aa.calendar.getNextWorkDay(aa.date.parseDate(dDate.getMonth()+1 + "/" + dDate.getDate() + "/" + dDate.getFullYear())).getOutput().getTime());
				i++;
				}
			}
	else
		dDate.setTime(dDate.getTime() + (1000 * 60 * 60 * 24 * amt));

	return dDate;
}

function updateAppStatus(stat,cmt) // optional cap id
{
	var itemCap = capId;
	if (arguments.length == 3) 
		itemCap = arguments[2]; // use cap ID specified in args

	var updateStatusResult = aa.cap.updateAppStatus(itemCap, "APPLICATION", stat, sysDate1, cmt, systemUserObj);
	//if (updateStatusResult.getSuccess())
	//	logDebug("Updated application status to " + stat + " successfully.");
	//else
	//	logDebug("**ERROR: application status update to " + stat + " was unsuccessful.  The reason is "  + updateStatusResult.getErrorType() + ":" + updateStatusResult.getErrorMessage());
}

function resultInspection(inspType,inspStatus,resultDate,resultComment)  //optional capId
	{
	var itemCap = capId
	if (arguments.length > 4) itemCap = arguments[4]; // use cap ID specified in args

	var foundID;
	var inspResultObj = aa.inspection.getInspections(itemCap);
	if (inspResultObj.getSuccess())
		{
		var inspList = inspResultObj.getOutput();
		for (xx in inspList)
			if (String(inspType).equals(inspList[xx].getInspectionType()) && inspList[xx].getInspectionStatus().toUpperCase().equals("SCHEDULED"))
				foundID = inspList[xx].getIdNumber();
		}

	if (foundID)
		{
		resultResult = aa.inspection.resultInspection(itemCap, foundID, inspStatus, resultDate, resultComment, systemUserObj)

		if (!resultResult.getSuccess())
			//logDebug("Successfully resulted inspection: " + inspType + " to Status: " + inspStatus)
		//else
			logDebug("**WARNING could not result inspection : " + inspType + ", " + resultResult.getErrorMessage())
		}
	else
			logDebug("Could not result inspection : " + inspType + ", not scheduled")

	}

function scheduleInspectDate(iType,DateToSched) // optional inspector ID. 
// DQ - Added Optional 4th parameter inspTime Valid format is HH12:MIAM or AM (SR5110)
// DQ - Added Optional 5th parameter inspComm 
	{
	var inspectorObj = null;
	var inspTime = null;
	var inspComm = "Scheduled via Script";
	if (arguments.length >= 3) 
		if (arguments[2] != null)
		{
		var inspRes = aa.person.getUser(arguments[2])
		if (inspRes.getSuccess())
			inspectorObj = inspRes.getOutput();
		}
	
        if (arguments.length >= 4)
            if(arguments[3] != null)
		        inspTime = arguments[3];
		        
		if (arguments.length >= 5)
		    if(arguments[4] != null)
		        inspComm = arguments[4];

	var schedRes = aa.inspection.scheduleInspection(capId, inspectorObj, aa.date.parseDate(DateToSched), inspTime, iType, inspComm)
	
	//if (schedRes.getSuccess())
		//logDebug("Successfully scheduled inspection : " + iType + " for " + DateToSched);
	//else
	//	logDebug( "**ERROR: adding scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}

function updateTask(wfstr,wfstat,wfcomment,wfnote) // optional process name, cap id
	{
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
	//else
	//{ logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
            
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
			//logDebug("Updating Workflow Task " + wfstr + " with status " + wfstat);
			}                                   
		}
	}