/*------------------------------------------------------------------------------------------------------/
| Program: WM_MonthlyProcess.js
|  
|
| Version 1.0 - Base Version. 06/22/15 Jane Schneider
| 
/------------------------------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------------------------------/
|
| START: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
var emailText = "";
var showDebug = true;									// Set to true to see debug messages in email confirmation
var maxSeconds = 10 * 60;								// number of seconds allowed for batch processing, usually < 5*60
var showMessage = false;

/*------------------------------------------------------------------------------------------------------/
|
| END: USER CONFIGURABLE PARAMETERS
|
/------------------------------------------------------------------------------------------------------*/
sysDate = aa.date.getCurrentDate();
batchJobResult = aa.batchJob.getJobID()
batchJobName = "" + aa.env.getValue("BatchJobName");
sEnvironment = "DEV"  //DEV, Test, Production

var br = "<BR>";
var disableTokens = false;								// turn off tokenizing of App Specific and Parcel Attributes
var useAppSpecificGroupName = true;						// Riki - Needed to add to be able to use the function getAppSpecInfo

batchJobID = 0;
if (batchJobResult.getSuccess())
  {
	batchJobID = batchJobResult.getOutput();
	logDebug("Batch Job: " + batchJobName + " - " + sEnvironment + "; Job ID: " + batchJobID);
  }
else
	logDebug("Batch job ID not found " + batchJobResult.getErrorMessage());
  
//Variables
var sysDate1 = aa.date.getCurrentDate();
var sysDate = dateAdd(null, 0);
var startTime = sysDate.getTime();

var feeSeqList = new Array();							// invoicing fee sequence codes
var paymentPeriodList = new Array();					// invoicing pay periods
var recCount = 0;
var setRemoveCount = 0;
var invoicedCount = 0;
var checkedCount = 0;

var timeExpired = false;
var debug = "";								// Debug String
var capId;
var altId;
var emailText = "";
var cap;
var capStatus;
var systemUserObj = aa.person.getUser("ADMIN").getOutput();
var AInfo = new Array();
var setName = "WMMONTHLY"
	
var emailAddressTo = "elamsupport@cityofmadison.com"; 
var emailAddressCc = "jschneider@cityofmadison.com"; 
var oAssessedFees = null;

var startDate = new Date();
var timeExpired = false;
var startTime = startDate.getTime();			// Start timer
var systemUserObj = aa.person.getUser("ADMIN").getOutput();

var tableName = "DEVICE INFORMATION";
var currentUserID = "BATCH";
var aTableResult = null;
var aTable = null;			
var aModel = null;

var bNewFeesExist = false;
var bDeviceTypeMatches = false;
var fieldCount = 0;
var rowCount = 0; 
var colCount = 0;
var tblFieldi = null;
var tblField = null;
var tblColi = null;
var fieldVal = null;

				
/*------------------------------------------------------------------------------------------------------/
| <===========Main=Loop================>
|
/-----------------------------------------------------------------------------------------------------*/

logDebug("Start of Job " + batchJobName);

if (!timeExpired) mainProcess();

logDebug("End of Job: Elapsed Time : " + elapsed() + " Seconds");	

if (emailAddressTo.length)
	aa.sendMail("noreply@cityofmadison.com", emailAddressTo, emailAddressCc, batchJobName + " - " + sEnvironment + " Results", emailText);


/*------------------------------------------------------------------------------------------------------/
| <===========END=Main=Loop================>
/-----------------------------------------------------------------------------------------------------*/

function mainProcess()
{	
	//Get the CAPS		
	BICAP = aa.set.getCAPSetMembersByPK(setName); //Here we are going to attempt to get the caps from the set
	
	logDebug("setName = " + setName);
	
	if (BICAP.getSuccess())
	{
		BICAPs = BICAP.getOutput().toArray();
		countAll = BICAPs.length;
		
		for(var iRecords=0; iRecords < BICAPs.length; iRecords++) 
		{
			bNewFeesExist = false;					
			sca = String(BICAPs[iRecords]).split("-");
			capId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
			cap = aa.cap.getCap(capId).getOutput();				// Cap object
			capStatus = cap.getCapStatus();	
			altId = capId.getCustomID();
			
			//if(altId == "WM-0000105"){
				logDebug(br + "Record being processed: " + altId);
				
				if (!cap)
				{
					logDebug(altId + " failed, because cap object was null on line 131.");
					continue;
				}
				
				//Load ASIT Device Info.
				aTableResult = aa.appSpecificTableScript.getAppSpecificTableModel(capId, tableName);
				
				if (aTableResult.getSuccess()){
					aTable = aTableResult.getOutput();
				}else{
					logDebug("**WARNING: error retrieving app specific table " + tableName + " " + aTableResult.getErrorMessage());
					return false
				}
								
				//Invoice NEW fees.				
				//logDebug("Check if any NEW fees to invoice for record." + br);
				oAssessedFees = loadFees(capId);
				
				for(var item=0; item < oAssessedFees.length; item++){				
					if(oAssessedFees[item].status == "NEW"){						
						//debugObject(oAssessedFees[item]);
						//logDebug(br);
						
						//The invoiceFee function adds the fee sequence code and payment period code to arrays for NEW fees to be invoiced.
						//The actual invoicing takes place later.
						if(invoiceFee(oAssessedFees[item].code, oAssessedFees[item].period) == true){
							bNewFeesExist = true;
							invoicedCount++;						
												
							if(aTable.getRowIndex() != "[]"){
								aModel = aTable.getAppSpecificTableModel();
								//debugObject(aModel);
							
								if(aModel != null){
									tblFieldi = aModel.getTableField().iterator(); 
									tblField = aModel.getTableField();
									//logDebug("Doing debugObject for tblField.toArray():" + br);
									//debugObject(tblField.toArray());
									//logDebug("Doing debugObject for aModel.getColumns().toArray()[0]:" + br);
									//debugObject(aModel.getColumns().toArray()[0]);
									tblColi = aModel.getColumns().iterator(); 
									fieldCount = 0;
									colCount = 0;
									rowCount = 1;						
								
									//Loop through each ASIT field by row & col.
									//logDebug("Starting While Loop" + br);
									while (tblFieldi.hasNext()){
									
										if (tblColi.hasNext() == false){
											tblColi = aModel.getColumns().iterator(); 
											colCount = 0; 
											rowCount = rowCount + 1;
										}
																				
										col = tblColi.next(); 
										colCount = colCount + 1; 
										colName = col.getColumnName();
										
										fieldVal = tblFieldi.next();
										
										if (colName == "Device Type" || colName == "Invoiced"){
											//logDebug("Col Name = " + colName + br);
											//logDebug("Field Value = " + fieldVal + br);
											
											if(colName == "Device Type" && fieldVal == oAssessedFees[item].description)
												bDeviceTypeMatches = true;
											
											//logDebug("bDeviceTypeMatches = " + bDeviceTypeMatches + br)
											if(bDeviceTypeMatches == true && colName == "Invoiced" && fieldVal == "UNCHECKED"){
												tblField.set(fieldCount, "CHECKED");
												checkedCount++;
												//logDebug("Set Invoiced field to CHECKED." + br);												
												bDeviceTypeMatches = false;
											}
										}
										
										fieldCount = fieldCount + 1;
										
									}//End While Loop
									
									//logDebug("Done with While Loop" + br);
									
									//Update any changes made to ASIT.
									if(aTable.getRowIndex() != "[]") 
										aModel.setTableField(tblField);
																		
								}
							}
						}
					}
							
					//We'll comment this out for production
					//logDebug(altId);
					if (elapsed() > maxSeconds) // only continue if time hasn't expired
					{
						logDebug("A script timeout has caused partial completion of this process.  Please re-run.  " + elapsed() + " seconds elapsed, " + maxSeconds + " allowed.") ;
						timeExpired = true;
						break;
					}

				}//End invoice items for...loop
				
				logDebug("bNewFeesExist = " + bNewFeesExist);
				
				var oMembers = null;
				var oMembersOutput = null;
				var oSetIterator = null;
				var oSetMember = null;
				var setCapId = null;
				var bRecFound = false
				
				if (feeSeqList.length && bNewFeesExist == true)  // invoice added fees
				{
					//This next line actually invoices the NEW fees.
					var invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
					
					if (!invoiceResult.getSuccess())
						logDebug("ERROR","ERROR: Invoicing the fee items was not successful.  Reason: " +  invoiceResult.getErrorMessage());
					else{
						if(aTable.getRowIndex() != "[]")
							addResult = aa.appSpecificTableScript.editAppSpecificTableInfos(aModel, capId, currentUserID);
					}
				}
						
				//Need to check if record is still in set, because IFA event may have triggered and removed rec from set.				
				//See IFA:WeightsMeasures/Licensing/NA/NA.
				//Also need to check if record had no NEW fees, in which case rec is removed from set.
				oMembers = aa.set.getCAPSetMembersByPK(setName);
				
				if(oMembers.getSuccess()){
					oMembersOutput = oMembers.getOutput();											
					oSetIterator = oMembersOutput.iterator();
					
					while(oSetIterator.hasNext()){
						oSetMember = oSetIterator.next();
						setCapId = aa.cap.getCapID(oSetMember.ID1,oSetMember.ID2,oSetMember.ID3).getOutput();
						
						if(capId.getCustomID() == setCapId.getCustomID()) {
							//Record is in set
							bRecFound = true;
							
							//Remove record from set if there were actually no NEW fees processed.
							if(bNewFeesExist == false) {
								logDebug("Removing " + capId.getCustomID() + " from set; no NEW fees found.");
								aa.set.removeSetHeadersListByCap(setName,capId);
							}
							
							break;
						}
					} //End While loop.
					
					//Add record back to set that was removed by IFA event.
					if (bRecFound != true && bNewFeesExist == true){
						aa.set.add(setName, capId);
						logDebug("Record " + capId.getCustomID() + " was added to set WMMONTHLY, because not found after invoicing.")
					}														
				}
			
				recCount++;
				
			//}//End specific record check (only used for testing)
		}//End record for...loop			
	}
	
	logDebug(br);
	logDebug("Total records processed: " + recCount);
	logDebug("Total records ignored due to no NEW fees: " + setRemoveCount);
	logDebug("Number of invoiced fees: " + invoicedCount);
	logDebug("Number of ASI Table Invoiced check boxes set to CHECKED: " + checkedCount + br);
	
}//End function mainProcess

/*************************************************************************/
function invoiceFee(fcode,fperiod)
{
    //Prepares all assessed fees having fcode and fperiod for invoicing.
    // SR5085 LL
 
	var feeFound = false;
   
	getFeeResult = aa.finance.getFeeItemsByFeeCodeAndPeriod(capId,fcode,fperiod,"NEW");
   
	if (getFeeResult.getSuccess())
	{
		var feeList = getFeeResult.getOutput();
		for (feeNum in feeList)
			if (feeList[feeNum].getFeeitemStatus().equals("NEW"))
			{
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				feeSeqList.push(feeSeq);
				paymentPeriodList.push(fperiod);
				feeFound = true;
				logDebug("Assessed fee " + fcode + " found and tagged for invoicing.");
			}
	}
	else{
		logDebug( "**ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage())
	}
	
	return feeFound;
	
}

function loadFees()  // option CapId
{
	//  load the fees into an array of objects.  Does not
	var itemCap = capId
	
	if (arguments.length > 0){
		ltcapidstr = arguments[0]; // use cap ID specified in args
		
		if (typeof(ltcapidstr) == "string"){
			var ltresult = aa.cap.getCapID(ltcapidstr);

			if (ltresult.getSuccess())
				itemCap = ltresult.getOutput();
			else{
				logMessage("**ERROR: Failed to get cap ID: " + ltcapidstr + " error: " +  ltresult.getErrorMessage()); 
				return false;
			}
		}
		else
			itemCap = ltcapidstr;
	}

  	var feeArr = new Array();

	var feeResult=aa.fee.getFeeItems(itemCap);
	
	if (feeResult.getSuccess()){
		var feeObjArr = feeResult.getOutput(); }
	else
		{ logDebug( "**ERROR: getting fee items: " + feeResult.getErrorMessage()); return false }

	for (ff in feeObjArr){
		
		fFee = feeObjArr[ff];
		var myFee = new Fee();
		var amtPaid = 0;

		var pfResult = aa.finance.getPaymentFeeItems(itemCap, null);
		if (pfResult.getSuccess())
			{
			var pfObj = pfResult.getOutput();
			for (ij in pfObj)
				if (fFee.getFeeSeqNbr() == pfObj[ij].getFeeSeqNbr())
					amtPaid+=pfObj[ij].getFeeAllocation()
			}

		myFee.sequence = fFee.getFeeSeqNbr();
		myFee.code =  fFee.getFeeCod();
		myFee.description = fFee.getFeeDescription();
		myFee.unit = fFee.getFeeUnit();
		myFee.amount = fFee.getFee();
		myFee.amountPaid = amtPaid;
		if (fFee.getApplyDate()) myFee.applyDate = convertDate(fFee.getApplyDate());
		if (fFee.getEffectDate()) myFee.effectDate = convertDate(fFee.getEffectDate());
		if (fFee.getExpireDate()) myFee.expireDate = convertDate(fFee.getExpireDate());
		myFee.status = fFee.getFeeitemStatus();
		myFee.period = fFee.getPaymentPeriod();
		myFee.display = fFee.getDisplay();
		myFee.accCodeL1 = fFee.getAccCodeL1();
		myFee.accCodeL2 = fFee.getAccCodeL2();
		myFee.accCodeL3 = fFee.getAccCodeL3();
		myFee.formula = fFee.getFormula();
		myFee.udes = fFee.getUdes();
		myFee.UDF1 = fFee.getUdf1();
		myFee.UDF2 = fFee.getUdf2();
		myFee.UDF3 = fFee.getUdf3();
		myFee.UDF4 = fFee.getUdf4();
		myFee.subGroup = fFee.getSubGroup();
		myFee.calcFlag = fFee.getCalcFlag();;
		myFee.calcProc = fFee.getFeeCalcProc();

		feeArr.push(myFee)
	}

	return feeArr;
}

function Fee() // Fee Object
{
	this.sequence = null;
	this.code =  null;
	this.description = null;  // getFeeDescription()
	this.unit = null; //  getFeeUnit()
	this.amount = null; //  getFee()
	this.amountPaid = null;
	this.applyDate = null; // getApplyDate()
	this.effectDate = null; // getEffectDate();
	this.expireDate = null; // getExpireDate();
	this.status = null; // getFeeitemStatus()
	this.recDate = null;
	this.period = null; // getPaymentPeriod()
	this.display = null; // getDisplay()
	this.accCodeL1 = null; // getAccCodeL1()
	this.accCodeL2 = null; // getAccCodeL2()
	this.accCodeL3 = null; // getAccCodeL3()
	this.formula = null; // getFormula()
	this.udes = null; // String getUdes()
	this.UDF1 = null; // getUdf1()
	this.UDF2 = null; // getUdf2()
	this.UDF3 = null; // getUdf3()
	this.UDF4 = null; // getUdf4()
	this.subGroup = null; // getSubGroup()
	this.calcFlag = null; // getCalcFlag();
	this.calcProc = null; // getFeeCalcProc()
	this.auditDate = null; // getAuditDate()
	this.auditID = null; // getAuditID()
	this.auditStatus = null; // getAuditStatus()
}

function convertDate(thisDate)
{
	if (typeof(thisDate) == "string")
		{
		var retVal = new Date(String(thisDate));
		if (!retVal.toString().equals("Invalid Date"))
			return retVal;
		}

	if (typeof(thisDate)== "object")
		{

		if (!thisDate.getClass) // object without getClass, assume that this is a javascript date already
			{
			return thisDate;
			}

		if (thisDate.getClass().toString().equals("class com.accela.aa.emse.util.ScriptDateTime"))
			{
			return new Date(thisDate.getMonth() + "/" + thisDate.getDayOfMonth() + "/" + thisDate.getYear());
			}

		if (thisDate.getClass().toString().equals("class java.util.Date"))
			{
			return new Date(thisDate.getTime());
			}

		if (thisDate.getClass().toString().equals("class java.lang.String"))
			{
			return new Date(String(thisDate));
			}
		}

	if (typeof(thisDate) == "number")
		{
		return new Date(thisDate);  // assume milliseconds
		}

	logDebug("**WARNING** convertDate cannot parse date : " + thisDate);
	return null;

}

function loadASITables() {

 	//
 	// Loads App Specific tables into their own array of arrays.  Creates global array objects
	//
	// Optional parameter, cap ID to load from
	//

	var itemCap = capId;
	if (arguments.length == 1) itemCap = arguments[0]; // use cap ID specified in args

	var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
	var ta = gm.getTablesArray()
	var tai = ta.iterator();

	while (tai.hasNext())
	  {
	  var tsm = tai.next();

	  var tempObject = new Array();
	  var tempArray = new Array();
	  var tn = tsm.getTableName();
 	  var numrows = 0;
	  tn = String(tn).replace(/[^a-zA-Z0-9]+/g,'');
	  //logDebug("variable tn = " + tn);
	  
	  if (!isNaN(tn.substring(0,1))) tn = "TBL" + tn  // prepend with TBL if it starts with a number

	  if (!tsm.rowIndex.isEmpty())
	  	{
	  	  var tsmfldi = tsm.getTableField().iterator();
		  var tsmcoli = tsm.getColumns().iterator();
		  var readOnlyi = tsm.getAppSpecificTableModel().getReadonlyField().iterator(); // get Readonly field
		  var numrows = 1;

		  while (tsmfldi.hasNext())  // cycle through fields
			{
			
			if (!tsmcoli.hasNext())  // cycle through columns
				{
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
	if(showDebug)
	{
		aa.print(dstr)
		emailText += dstr + br;
		aa.debug(aa.getServiceProviderCode() + " : " + aa.env.getValue("CurrentUserID"),dstr)
	}
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