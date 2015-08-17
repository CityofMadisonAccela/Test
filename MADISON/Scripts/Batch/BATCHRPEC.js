var maxSeconds = 60 * 300;							// number of seconds allowed for batch processing, usually < 5*60
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

//Parameters

//Variables
var sysDate1 = aa.date.getCurrentDate();
var sysDate = dateAdd(null, 0);
var startTime = sysDate.getTime();
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
var strIssuedDate = "2014-09-08";
var courtdt1 = "10/21/2014";
var courtdt2 = "10/22/2014";
var courtdt3 = "10/28/2014";
var strReinspection = "10/13/2014";
var currentrec = courtdt1;
var citationSeries = "B14";
var citationNo = 1176;
var feeSeqList = new Array();
var paymentPeriodList = new Array();
//Let's first check out what type of process are we handling

//debugObject();

//Get the CAPS
BICAP = aa.cap.getByAppType("Enforcement","Building Inspection","Housing","Rental Prop Emergency Contacts");

if (BICAP.getSuccess())
{
	BICAPs = BICAP.getOutput();
	for(var iRecords=0; iRecords < BICAPs.length; iRecords++) 
	{
		capId=BICAPs[iRecords].getCapID();
		cap = aa.cap.getCap(capId).getOutput();				// Cap object
		capStatus = cap.getCapStatus();	
		altId = capId.getCustomID();

		cd = aa.cap.getCapDetail(capId).getOutput().getCapDetailModel(); 
		capAsgnStaff = cd.getAsgnStaff(); 
		capAsgnDept = cd.getAsgnDept();
		
		
		//if (capStatus != "Reinspection") continue;
		
		// [Riki 2/28/13 - NewCyle]
		// [Riki 2/4/14 - Another New Cycle!]
			//if (capStatus != "New") continue; 
			
			//0 Update case type to 'Other'
			//editAppSpecific("Case Description","Other");	
			
			//0.1 Update Work Desc
			// [Riki 2/4/14 - We don't need this because we updated it through the SQL process previous]
			//updateWorkDesc("Failure to register emergency contacts");
			
			//1 create scheduled inspection
			//scheduleInspectDate("Initial Inspection",strIssuedDate,capAsgnStaff,"AM"); 

			//2 result scheduled inspection
			//resultInspection("Initial Inspection","Official Notice",strIssuedDate,"Automated result");
			//updateAppStatus("Official Notice","Updated via Script"); 
			//updateTask("Initial Inspection","Official Notice","Updated by Inspection Result","Note");

			//3 status workflow task to issued
			//closeTask("Initial Inspection","Issued","Automated status","Automated status");

			//4 schedule reinspection
			//scheduleInspectDate("Reinspection",strReinspection,capAsgnStaff,"AM"); 
		// [Riki 2/4/14 - Another New Cycle!]
		// [Riki 2/28/13 - End NewCyle]

		// [Riki 3/26/14 - After Initial, this is the first re-inspection with invoices]
			
		//	if (capStatus != "Issued Official Notice") continue;
			
			//5 extension processing
		//	resultInspection("Reinspection","Extension Processing",strIssuedDate,"Automated result");
		//	updateAppStatus("Extension Processing","Updated via Script"); 
		//	updateTask("Reinspection","Extension Processing","Updated by Inspection Result","Note");
			
			// add fee and move to set
		//	addFee("CEBLDREINSP","CEBLD","FINAL",1,"Y");
		//	aa.set.add("ENFREINSPFEERPE",capId);
			
			// Invoice the Fees
		//	if (feeSeqList.length)
		//	{	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
		//		if (!invoiceResult.getSuccess())
		//			logDebug("**ERROR: Invoicing the fee items assessed to app was not successful.  Reason: " +  invoiceResult.getErrorMessage());
		//	}
			
			//6 issue
		//	updateTask("Reinspection","Extension Mailed","Automated status","Automated status");
			
			//8 Schedule next Reinspection
		//	scheduleInspectDate("Reinspection",strReinspection,capAsgnStaff,"AM"); 
		
		// [Riki 3/26/14 - After Initial, this is the first re-inspection with invoices]
		
		// [Riki 5/30/14 - First round reinspections and extension letters]	
		/*
			if (capStatus != "Extension Mailed") continue;
		
			//5 extension processing
			resultInspection("Reinspection","Extension Processing",strIssuedDate,"Automated result");
			updateAppStatus("Extension Processing","Updated via Script"); 
			updateTask("Reinspection","Extension Processing","Updated by Inspection Result","Note");
			
			// add fee and move to set
			addFee("CEBLDREINSP","CEBLD","FINAL",1,"Y");
			aa.set.add("ENFREINSPFEERPE",capId);

			// Invoice the Fees
			if (feeSeqList.length)
			{	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
				if (!invoiceResult.getSuccess())
					logDebug("**ERROR: Invoicing the fee items assessed to app was not successful.  Reason: " +  invoiceResult.getErrorMessage());
			}
			
			//6 issue
			updateTask("Reinspection","Extension Mailed","Automated status","Automated status");
			
			//8 reinspection 
			scheduleInspectDate("Reinspection",strReinspection,capAsgnStaff,"AM");
			
			//8a Save Failure to Submit Letter to each Record
			//saveReport("RPEC Failure to Submit Letter"); // Riki 4/11/13 : Added this because I want to save the report in the batch. You might need to modiy the SSRS report to not lock the tables
			*/
		// [Riki 5/30/14 - END First round reinspections and extension letters]		
		
		// [Riki 8/22/14 - START Issue citation and save to record]
		//9 result inspection to citation - update with the date of court
		
		if (capStatus != "Extension Mailed") continue;
		
		switch (currentrec)
		{
			case courtdt1:
				currentrec = courtdt2;
				break;
			case courtdt2:
				currentrec = courtdt3;
				break;
			case courtdt3:
				currentrec = courtdt1;
				break;
		}
				
		
		resultInspection("Reinspection","No Fee Citation",strIssuedDate,currentrec);
		updateAppStatus("Citation","Updated via Script"); 
				
		//10 update workflow task to citation issued
		updateTask("Reinspection","Citation Issued","Updated by Inspection Result","Note");
		
		//10a update TSI citation No
		editTaskSpecific("Reinspection","Citation Number",citationSeries + citationNo);
		
		//11 add to set for letter processing
		aa.set.add("ENFREINSPFEERPE",capId);
		
		//logDebug(altId + "," + citationSeries + citationNo + "," + strIssuedDate);
		citationNo = citationNo + 1;
		
		// [Riki 8/22/14 - END Issue citation and save to record]
		//aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "BI Inspection testing", altId + br + elapsed() + "seconds ");
		//if (elapsed() > 90) break;
	}
}
aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "rsjachrani@cityofmadison.com", "BI Inspection testing", emailText + br + elapsed() + "seconds ");
aa.env.setValue("ScriptReturnMessage", debug);

function saveReport(reportName)
{
	var reportInfoModel = aa.reportManager.getReportInfoModelByName(reportName);
	
	if (reportInfoModel.getSuccess())
	{
		report = reportInfoModel.getOutput();
		report.setModule("Enforcement"); // Setting the module
		report.setCapId(capId);

		parameters = aa.util.newHashMap();
		parameters.put("B1_ALT_ID",altId);
		report.setReportParameters(parameters);
		report2 = report.getReportInfoModel(); 
		report2.setNotSaveToEDMS(false);
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
		}
	}
	else
	{
		emailText+="Could not run report for #" + altId + br;
	}
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
		if (finvoice == "Y")
			{
			feeSeqList.push(feeSeq);
			paymentPeriodList.push(fperiod);
			}
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