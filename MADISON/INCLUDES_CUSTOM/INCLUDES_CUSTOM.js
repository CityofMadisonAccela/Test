/*------------------------------------------------------------------------------------------------------/
| Program : INCLUDES_CUSTOM.js
| Event   : N/A
|
| Usage   : Custom Script Include.  Insert custom EMSE Function below and they will be 
|	    available to all master scripts
|
| Notes   : Number of lines is 1764 as of 7/16/14
|           The number of lines and as of date need to be updated if changes are made to this script 
|           Riki 01-10-2013 getGISInfo - changed the buffer amount to -1 feet due to issues with overlapping polygons
|           Riki 1-28-14: added a check to pull the attribute information if its a alley
|	    Riki 7-16-14: added function to find number of working days between two dates workingDaysBetweenDates(startDate, endDate)
|           Riki 5-18-15: Added invoiceAssessedFeesMadison this because Street Occ fees when invoicing would create separate invoices per assessed fee
| 
/------------------------------------------------------------------------------------------------------*/
function Right(str, n){
    if (n <= 0)
       return "";
    else if (n > String(str).length)
       return str;
    else {
       var iLen = String(str).length;
       return String(str).substring(iLen, iLen - n);
    }
}

function getGISInfo(svc,layer,attributename)
	{
	// use buffer info to get info on the current object by using distance 0
	// usage: 
	//
	// x = getGISInfo("flagstaff","Parcels","LOT_AREA");
	//
	
	var distanceType = "feet";
	var retString;
   	
	var bufferTargetResult = aa.gis.getGISType(svc,layer); // get the buffer target
	if (bufferTargetResult.getSuccess())
		{
		var buf = bufferTargetResult.getOutput();
		buf.addAttributeName(attributename);
		}
	else
		{ logDebug("**WARNING: Getting GIS Type for Buffer Target.  Reason is: " + bufferTargetResult.getErrorType() + ":" + bufferTargetResult.getErrorMessage()) ; return false }
			
	var gisObjResult = aa.gis.getCapGISObjects(capId); // get gis objects on the cap
	if (gisObjResult.getSuccess()) 	
		var fGisObj = gisObjResult.getOutput();
	else
		{ logDebug("**WARNING: Getting GIS objects for Cap.  Reason is: " + gisObjResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }

	for (a1 in fGisObj) // for each GIS object on the Cap.  We'll only send the last value
		{
		// Riki 01-10-2013 - changed the buffer amount to -1 feet due to issues with overlapping polygons
		var bufchk = aa.gis.getBufferByRadius(fGisObj[a1], "-1", distanceType, buf);

		if (bufchk.getSuccess())
			var proxArr = bufchk.getOutput();
		else
			{ logDebug("**WARNING: Retrieving Buffer Check Results.  Reason is: " + bufchk.getErrorType() + ":" + bufchk.getErrorMessage()) ; return false }	
		
		for (a2 in proxArr)
			{
			var proxObj = proxArr[a2].getGISObjects();  // if there are GIS Objects here, we're done
			for (z1 in proxObj)
				{
				var v = proxObj[z1].getAttributeValues()
				retString = v[0];
				}
			
			}
		}
	return retString
	}

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
				aa.workflow.handleDisposition(capId,stepnumber,processID,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
			else
				aa.workflow.handleDisposition(capId,stepnumber,wfstat,dispositionDate, wfnote,wfcomment,systemUserObj ,"Y");
				logMessage("Closing Workflow Task: " + wfstr + " with status " + wfstat);
				logDebug("Closing Workflow Task: " + wfstr + " with status " + wfstat);
			}			
		}
	}


function workDescGet(pCapId)
	{
//Rsjachrani this resolves a problem where there is a ** in the error results that rollbacks error
	//Gets work description 
	//07SSP-00037/SP5017
	//
	var workDescResult = aa.cap.getCapWorkDesByPK(pCapId);
	
	if (!workDescResult.getSuccess())
		{
		logDebug("ERROR: Failed to get work description: " + workDescResult.getErrorMessage()); 
		return false;
		}
		
	var workDescObj = workDescResult.getOutput();
	var workDesc = workDescObj.getDescription();
	
	return workDesc;
	}


function scheduleInspectDateGroup(inspGroup,iType,DateToSched) // optional inspector ID.  This function requires dateAdd 
	{
	logDebug("begin schedule inspection : " + iType + " for " + DateToSched);
	var inspectorObj = null;
	if (arguments.length == 4) 
		{
		var inspRes = aa.person.getUser(arguments[3])
		if (inspRes.getSuccess())
			inspectorObj = inspRes.getOutput();
		}
	var inspModelRes = aa.inspection.getInspectionScriptModel();
	if (inspModelRes.getSuccess()){
		logDebug("Successfully get inspection model: " + iType + " for " + DateToSched);
		var inspModelObj = inspModelRes.getOutput().getInspection();
		var inspActivityModel = inspModelObj.getActivity();
		inspActivityModel.setCapID(capId);
		inspActivityModel.setSysUser(inspectorObj);
		inspActivityModel.setActivityDate(aa.util.parseDate(DateToSched));
		inspActivityModel.setActivityGroup("Inspection");
		inspActivityModel.setActivityType(iType);
		inspActivityModel.setActivityDescription(iType);
		inspActivityModel.setRecordDescription("");
		inspActivityModel.setRecordType("");
		inspActivityModel.setDocumentID("");
		inspActivityModel.setDocumentDescription('Insp Scheduled');
		inspActivityModel.setActivityJval("");
		inspActivityModel.setStatus("Scheduled");
		inspActivityModel.setTime1(null);
		inspActivityModel.setAuditID(currentUserID);
		inspActivityModel.setAuditStatus("A");
		inspActivityModel.setInspectionGroup(inspGroup);
		inspModelObj.setActivity(inspActivityModel);

		var inspTypeResult = aa.inspection.getInspectionType(inspGroup,iType);
		if (inspTypeResult.getSuccess() && inspTypeResult.getOutput())
		{
			if(inspTypeResult.getOutput().length > 0)
			{
				inspActivityModel.setCarryoverFlag(inspTypeResult.getOutput()[0].getCarryoverFlag()); //set carryoverFlag
				inspActivityModel.setActivityDescription(inspTypeResult.getOutput()[0].getDispType());
				inspActivityModel.setInspectionGroup(inspTypeResult.getOutput()[0].getGroupCode());
				inspActivityModel.setRequiredInspection(inspTypeResult.getOutput()[0].getRequiredInspection());
				inspActivityModel.setUnitNBR(inspTypeResult.getOutput()[0].getUnitNBR());
				inspActivityModel.setAutoAssign(inspTypeResult.getOutput()[0].getAutoAssign());
				inspActivityModel.setDisplayInACA(inspTypeResult.getOutput()[0].getDisplayInACA());
				inspActivityModel.setInspUnits(inspTypeResult.getOutput()[0].getInspUnits());
			}
		}

		var schedRes = aa.inspection.scheduleInspection(inspModelObj,systemUserObj);

		if (schedRes.getSuccess())
			logDebug("Successfully scheduled inspection : " + iType);
		else
			logDebug( "**ERROR: scheduling inspection (" + iType + "): " + schedRes.getErrorMessage());
	}
	else{
		logDebug( "**ERROR: getting  inspection model  " );
	}
	
}

function loadASITablesBefore() { 

	// 
	// Loads App Specific tables into their own array of arrays. Creates 	global array objects 
	// 
	// 

	var gm = aa.env.getValue("AppSpecificTableGroupModel"); 
	if(null != gm && gm.length > 0){ 
		var ta = gm.getTablesMap().values(); 
		var tai = ta.iterator(); 
		while (tai.hasNext()) 
		{ 
			var tsm = tai.next(); 
			if (tsm.rowIndex.isEmpty()) continue; // empty table 
			var tempObject = new Array(); 
			var tempArray = new Array(); 
			var tn = tsm.getTableName(); 
			var numrows = 0; 
			tn = String(tn).replace(/[^a-zA-Z0-9]+/g,''); 
			if (!isNaN(tn.substring(0,1))) tn = "TBL" + tn // prepend with TBL if it starts with a number 
			if (!tsm.rowIndex.isEmpty()) 
			{ 
				var tsmfldi = tsm.getTableField().iterator(); 
				var tsmcoli = tsm.getColumns().iterator(); 
				var numrows = 1; 
				while (tsmfldi.hasNext()) // cycle through fields 
				{ 
					if (!tsmcoli.hasNext()) // cycle through columns 
					{ 
						var tsmcoli = tsm.getColumns().iterator(); 
						tempArray.push(tempObject); // end of record 
						var tempObject = new Array(); // clear the temp obj 
						numrows++; 
					} 
					var tcol = tsmcoli.next(); 
					var tval = tsmfldi.next(); 
					var readOnly = 'N'; 
					var fieldInfo = new 
					asiTableValObj(tcol.getColumnName(), tval, readOnly); 
					tempObject[tcol.getColumnName()] = fieldInfo; 
				} 
				tempArray.push(tempObject); // end of record 
			} 
			var copyStr = "" + tn + " = tempArray"; 
			//aa.print("ASI Table Array : " + tn + " (" + numrows + " Rows)"); 
			eval(copyStr); // move to table name deb
		} 
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

function getOwnerfromParcel()
{
	//We're going to check if there's already an owner, if so we won't try to add owners from parcel
	var existingOwner = aa.owner.getOwnerByCapId(capId);
	if (existingOwner.getSuccess())
		var ownerList = existingOwner.getOutput();
	for (var thisO in ownerList)
		{
		if (ownerList[thisO].getOwnerFullName() != null)
			{return false}
		}
	
	var parcelListResult = aa.parcel.getParcelDailyByCapID(capId,null);
	if (parcelListResult.getSuccess())
		var parcelList = parcelListResult.getOutput();
	else
		{ logDebug("**ERROR: Failed to get Parcel List " + parcelListResult.getErrorMessage()); return false; }

	if(typeof(parcelList) == "object" && parcelList != null)
		{
	for (var thisP in parcelList)
  		{
  		var ownerListResult = aa.owner.getOwnersByParcel(parcelList[thisP]);
		if (ownerListResult.getSuccess())
			var ownerList = ownerListResult.getOutput();
		else
			{ logDebug("**ERROR: Failed to get Owner List " + ownerListResult.getErrorMessage()); return false; 

}

  		for (var thisO in ownerList)
      		{
      			ownerList[thisO].setCapID(capId);
      			createOResult = aa.owner.createCapOwnerWithAPOAttribute(ownerList[thisO]);

			if (createOResult.getSuccess())
				logDebug("Created CAP Owner");
			else
				{ logDebug("**WARNING: Failed to create CAP Owner " + createOResult.getErrorMessage()); }
			}
	    }
	}
}

//Added 4/5/2012 
function editTaskNote(wfstr,wfcomment) // optional process name
	{
	var useProcess = false;
	var processName = "";
	if (arguments.length == 3) 
		{
		processName = arguments[2]; // subprocess
		useProcess = true;
		}

	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess())
  	 	var wfObj = workflowResult.getOutput();
  	else
  	  	{ logMessage("**ERROR: Failed to get workflow object: " + s_capResult.getErrorMessage()); return false; }
	
	for (i in wfObj)
		{
   		fTask = wfObj[i];
  		if (fTask.getTaskDescription().toUpperCase().equals(wfstr.toUpperCase())  && (!useProcess || fTask.getProcessCode().equals(processName)))
			{
			wfObj[i].setDispositionNote(wfcomment);
			var fTaskModel = wfObj[i].getTaskItem();
			var tResult = aa.workflow.adjustTaskWithNoAudit(fTaskModel);
			if (tResult.getSuccess())
				logDebug("Set Workflow: " + wfstr + " comment " + wfcomment);
		  	else
	  	  		{ logMessage("**ERROR: Failed to update comment on workflow task: " + tResult.getErrorMessage()); return false; }
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

function parcelConditionStatusExists(condtype,pStatus)
	{
	var capParcelResult = aa.parcel.getParcelandAttribute(capId,null);
	if (!capParcelResult.getSuccess())
		{ logDebug("**WARNING: error getting cap parcels : " + capParcelResult.getErrorMessage()) ; return false }

	var Parcels = capParcelResult.getOutput().toArray();
	for (zz in Parcels)
		{
		pcResult = aa.parcelCondition.getParcelConditions(Parcels[zz].getParcelNumber());
		if (!pcResult.getSuccess())
			{ logDebug("**WARNING: error getting parcel conditions : " + pcResult.getErrorMessage()) ; return false }
		pcs = pcResult.getOutput();
		for (pc1 in pcs)
			if (pcs[pc1].getConditionType().equals(condtype) && pcs[pc1].getConditionStatus().equals(pStatus)) return true;
		}
}

function addressConditionStatusExists(condtype,pStatus)
	{
	var capAddressResult = aa.address.getAddressByCapId(capId,null);
	if (!capAddressResult.getSuccess())
		{ logDebug("**WARNING: error getting cap address : " + capAddressResult.getErrorMessage()) ; return false }
	
	var Addresses = capAddressResult.getOutput();
	for (zz in Addresses)
		{
		debugObject(Addresses[zz]);
		acResult = aa.addressCondition.getAddressConditions(Addresses[zz].getRefAddressId());
		if (!acResult.getSuccess())
			{ logDebug("**WARNING: error getting address conditions : " + acResult.getErrorMessage()) ; return false }
		acs = acResult.getOutput();
		for (ac1 in acs)
			if (acs[ac1].getConditionType().equals(condtype) && acs[ac1].getConditionStatus().equals(pStatus)) 

return true;
		}
}

function getGISCenterLine()
	{
	//Riki 1-28-14: added a check to pull the attribute information if its a alley
	// This is for ROW permits to get GIS object information ITRMS
	// for testing var capId = aa.cap.getCapID("ENGROW-2010-00001").getOutput()
	var distanceType = "feet";
	var retString;
	var intx = 0;
	var valArray = new Array();

	var bufferTargetResult = aa.gis.getGISType("agis_madison","Street Centerlines"); // get the buffer target
	if (bufferTargetResult.getSuccess())
		{
		var buf = bufferTargetResult.getOutput();
		buf.addAttributeName("surface_year");
		buf.addAttributeName("init_const_yr");
		buf.addAttributeName("funct_class");
		}
	else
		{logDebug("**ERROR: Getting GIS Type for Buffer Target.  Reason is: " + bufferTargetResult.getErrorType() + ":" + bufferTargetResult.getErrorMessage()) ; return false }

	var bufferTargetResultalley = aa.gis.getGISType("agis_madison","Alleys"); // Riki 1-28-14: get the buffer target for Alleys
	if (bufferTargetResultalley.getSuccess())
		{
		var bufAlleys = bufferTargetResultalley.getOutput();
		bufAlleys.addAttributeName("surface_year");
		bufAlleys.addAttributeName("init_const_yr");
		bufAlleys.addAttributeName("funct_class");
		}
	else
		{logDebug("**ERROR: Getting GIS Type for Buffer Target.  Reason is: " + bufferTargetResult.getErrorType() + ":" + bufferTargetResult.getErrorMessage()) ; return false }
			

	var gisObjResult = aa.gis.getCapGISObjects(capId); // get gis objects on the cap
	if (gisObjResult.getSuccess()) 	
		var fGisObj = gisObjResult.getOutput();
	else
		{ logDebug("**ERROR: Getting GIS objects for Cap.  Reason is: " + gisObjResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }

	for (a1 in fGisObj) // for each GIS object on the Cap.  We'll only send the last value
		{
		var okgo = fGisObj[a1].getGISObjects();
		//valArray[intx] = new Array(3);
		if (fGisObj[a1].gisTypeId == "Street Centerlines") //Riki 1-28-14: Here we check whether it's a alley or street centerline
			var bufchk = aa.gis.getBufferByRadius(fGisObj[a1], "0", distanceType, buf)
		else
			var bufchk = aa.gis.getBufferByRadius(fGisObj[a1], "0", distanceType, bufAlleys);

		if (bufchk.getSuccess())
			var proxArr = bufchk.getOutput();
		else
			{ logDebug("**ERROR: Retrieving Buffer Check Results.  Reason is: " + bufchk.getErrorType() + ":" + bufchk.getErrorMessage()) ; return false }	
		
		for (a2 in proxArr)
			{
			var proxObj = proxArr[a2].getGISObjects();  // if there are GIS Objects here, we're done
			for (z1 in proxObj)
				{
				var v = proxObj[z1].getAttributeValues();
				var n = proxObj[z1].getAttributeNames();
				if (String(okgo[0].getGisId()) == String(proxObj[z1].getGisId()))
					{
					valArray[intx] = new Array(1);
					valArray[intx]["mslink"] = proxObj[z1].getGisId();
					valArray[intx][n[0]] = v[0];
					valArray[intx][n[1]] = v[1];
					valArray[intx][n[2]] = v[2];
					//logDebug(valArray[intx]["mslink"]);
					}
				}
			}
		intx = intx + 1;
		}
	return valArray
}

//added 9/13/2012 itjsm
function getInspectionId(insp2Check,insp2Result)
{
	var inspResultObj = aa.inspection.getInspections(capId);
	if (inspResultObj.getSuccess())
		{
		var inspList = inspResultObj.getOutput();
		for (xx in inspList)
			if (String(insp2Check).equals(inspList[xx].getInspectionType()) && String(insp2Result).equals(inspList[xx].getInspectionStatus()))
				return inspList[xx].getIdNumber();
		}
	return false;
}

//added 9/13/2012 itjsm
function loadGuideSheet(inspId) {
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args

	var r = aa.inspection.getInspections(itemCap)

	if (r.getSuccess())
	 	{
		var inspArray = r.getOutput();

		for (i in inspArray)
			{
			if (inspArray[i].getIdNumber() == inspId)
				{
				var inspModel = inspArray[i].getInspection();

				var gs = inspModel.getGuideSheets()

			} // for each inspection
		} // if there are inspections

	return gs;
	}
}

//GKL-B This is needed so that building license attributes including insurance information will copy to the LP. This 
//function was customized by Madison at an earlier point. 
function createReferenceLP(rlpId,rlpType,pContactType) 
	{
	//Creates/updates a reference licensed prof from a Contact and then adds as an LP on the cap.
        //Used for Licenses/Engineering/Prequal Contactors record type.

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

	newLic.setContactFirstName(peop.getFirstName());
	logDebug("FName " + peop.getFirstName());
	//newLic.setContactMiddleName(cont.getMiddleName());  //method not available
	newLic.setContactLastName(peop.getLastName());
	logDebug("LName " + peop.getLastName());
	newLic.setBusinessName(peop.getBusinessName());
	logDebug("Bus " + peop.getBusinessName());
	newLic.setAddress1(addr.getAddressLine1());
	logDebug("Addr1 " + addr.getAddressLine1());
	newLic.setAddress2(addr.getAddressLine2());
	//newLic.setAddress3(addr.getAddressLine3());
	newLic.setCity(addr.getCity());
	logDebug("City " + addr.getCity());
	newLic.setState(addr.getState());
	logDebug("State " + addr.getState());
	newLic.setZip(addr.getZip());
	logDebug("Zip " + addr.getZip());
	newLic.setPhone1(peop.getPhone1());
	logDebug("Phone1 " + peop.getPhone1());
	newLic.setPhone2(peop.getPhone2());
	newLic.setEMailAddress(peop.getEmail());
	logDebug("Email " + peop.getEmail());
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
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License ExpDate"]));

	newLic.setLicenseType(rlpType);
	newLic.setLicState(addr.getState());
	newLic.setStateLicense(rlpId);

	if (updating)
		{
			myResult = aa.licenseScript.editRefLicenseProf(newLic);
			logDebug("Successfully updated License No. " + rlpId + ", Type: " + rlpType + " Sequence Number " + myResult.getOutput());
		}
	else
		{
			myResult = aa.licenseScript.createRefLicenseProf(newLic);
			logDebug("Successfully added License No. " + rlpId + ", Type: " + rlpType + " Sequence Number " + myResult.getOutput());
		}

	if (!myResult.getSuccess())
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return null;
		}

	if (newLic==null)
		{
			logDebug("new Lic object is jacked up");
		}
	if (myResult.getOutput()==null)
		{
			logDebug("ok so well find it using the other method");
			var lpsm = getRefLicenseProf(rlpId);
		}
	else
		{
			lpsmResult = aa.licenseScript.getRefLicenseProfBySeqNbr(servProvCode,myResult.getOutput())
			if (!lpsmResult.getSuccess())
				{ logDebug("**WARNING error retrieving the LP just created " + lpsmResult.getErrorMessage()) ; return null}

			lpsm = lpsmResult.getOutput();
		}

	// Now add the LP to the CAP
	asCapResult= aa.licenseScript.associateLpWithCap(capId,lpsm)
	if (!asCapResult.getSuccess())
		{ logDebug("**WARNING error associating CAP to LP: " + asCapResult.getErrorMessage()) }
	else
		{ logDebug("Associated the CAP to the new LP") }

	/* WILL NOT NEED UNTIL ACA IMPLEMENTED
	// Find the public user by co406ntact email address and attach
	puResult = aa.publicUser.getPublicUserByEmail(peop.getEmail())
	if (!puResult.getSuccess())
		{ logDebug("**WARNING finding public user via email address " + peop.getEmail() + " error: " + 

puResult.getErrorMessage()) }
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

function createRefLicProf(rlpId,rlpType,pContactType)
	{
	//Creates/updates a reference licensed prof from a Contact
	//06SSP-00074, modified for 06SSP-00238
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
	if (AInfo["Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["Business License ExpDate"]));

    if (AInfo["INSURANCE INFORMATION.Insurance Co"]) newLic.setInsuranceCo(AInfo["INSURANCE INFORMATION.Insurance Co"]);
	if (AInfo["INSURANCE INFORMATION.Insurance Amount"]) newLic.setInsuranceAmount(parseFloat(AInfo["INSURANCE INFORMATION.Insurance Amount"]));
	if (AInfo["INSURANCE INFORMATION.Insurance Exp Date"]) 	newLic.setInsuranceExpDate(aa.date.parseDate(AInfo["INSURANCE INFORMATION.Insurance Exp Date"]));
	if (AInfo["INSURANCE INFORMATION.Policy #"]) 			newLic.setPolicy(AInfo["INSURANCE INFORMATION.Policy #"]);
	if (AInfo["LICENSE INFORMATION.Business License #"]) 	newLic.setBusinessLicense(AInfo["LICENSE INFORMATION.Business License #"]);
	if (AInfo["LICENSE INFORMATION.Contractor License #"]) 	newLic.setContrLicNo(parseFloat(AInfo["LICENSE INFORMATION.Contractor License #"]));
	if (AInfo["LICENSE INFORMATION.Business License Exp Date"]) newLic.setBusinessLicExpDate(aa.date.parseDate(AInfo["LICENSE INFORMATION.Business License Exp Date"]));

	newLic.setLicenseType(rlpType);
	newLic.setLicState(addr.getState());
	newLic.setStateLicense(rlpId);

	if (updating)
		myResult = aa.licenseScript.editRefLicenseProf(newLic);
	else
		myResult = aa.licenseScript.createRefLicenseProf(newLic);

	if (myResult.getSuccess())
		{
		logDebug("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		logMessage("Successfully added/updated License No. " + rlpId + ", Type: " + rlpType);
		return true;
		}
	else
		{
		logDebug("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		logMessage("**ERROR: can't create ref lic prof: " + myResult.getErrorMessage());
		return false;
		}
	}
//added 10/1/2012 itjsm
function updateRefContact()
{
	var c = aa.people.getCapContactByCapID(capId).getOutput()
	var cCopy = aa.people.getCapContactByCapID(capId).getOutput()  // must have two working datasets

	for (var i in c)
	{
	   var con = c[i];

	   var p = con.getPeople();
	   
	   var refContactNum = con.getCapContactModel().getRefContactNumber();
	   if (refContactNum)  // This is a reference contact.   Let's refresh or overwrite as requested in parms.
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
	}
}

function countIdenticalInspectionTypes()
	{
	var cntResult = 0;
	var oldDateStr = "01/01/1900";  // inspections older than this date count as 1
	if (arguments.length > 0) oldDateStr = arguments[0]; // Option to override olddate in the parameter
	oldDate = new Date("oldDateStr");
	
	var oldInspectionFound = false;
	var inspResultObj = aa.inspection.getInspections(capId);
	if (inspResultObj.getSuccess())
		{
		inspList = inspResultObj.getOutput();
		for (xx in inspList)
			{
			if (String(inspType).equals(inspList[xx].getInspectionType()))
				{
				if (convertDate(inspList[xx].getInspectionStatusDate()) < oldDate)
					{
					if (!oldInspectionFound) { cntResult++ ; oldInspectionFound = true }
					}
				else
					{
					cntResult++
					}
				}
			}
		}	
	logDebug("countIdenticalInspectionTypes(" + inspType + "," + oldDateStr +  ") Returns " + cntResult);
	return cntResult;
	}	 

function copyASIFields(sourceCapId,targetCapId)  // optional fields to ignore
	{
	var ignoreArray = new Array();
	for (var i=1; i<arguments.length;i++)
		ignoreArray.push(arguments[i])

	var targetCap = aa.cap.getCap(targetCapId).getOutput();
	var targetCapType = targetCap.getCapType();
	var targetCapTypeString = targetCapType.toString();
	var targetCapTypeArray = targetCapTypeString.split("/");

	var sourceASIResult = aa.appSpecificInfo.getByCapID(sourceCapId)

	if (sourceASIResult.getSuccess())
		{ var sourceASI = sourceASIResult.getOutput(); }
	else
		{ aa.print( "**ERROR: getting source ASI: " + sourceASIResult.getErrorMessage()); return false }

	for (ASICount in sourceASI)
		  {
		  thisASI = sourceASI[ASICount];

		  if (!exists(thisASI.getCheckboxType(),ignoreArray))
		       {
		       thisASI.setPermitID1(targetCapId.getID1())
		       thisASI.setPermitID2(targetCapId.getID2())
		       thisASI.setPermitID3(targetCapId.getID3())
		       thisASI.setPerType(targetCapTypeArray[1])
		       thisASI.setPerSubType(targetCapTypeArray[2])
		       var testresults = aa.cap.createCheckbox(thisASI)
			   if (!testresults.getSuccess()) //12-19-12 Riki: Let's try an update instead
			   	{
			        if (thisASI.getChecklistComment() != null) editAppSpecific(thisASI.getCheckboxType() + "." + thisASI.getCheckboxDesc(),thisASI.getChecklistComment(),targetCapId);
				}		       }
  		  }
	}

//This is the standard Accela script, but was not included in the ASB script currently. 11/6/2012 GKL-B
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
                                    if (refstlic && refstlic.toUpperCase().equals(newLicArray [thisLic].getStateLicense().toUpperCase()))
                                        refLicObj = newLicArray[thisLic];
                                }

                return refLicObj;
}

// GKL-B updateFee with slight customization made earlier to be compatible with how our fees are programmed to work
function updateFee(fcode,fsched,fperiod,fqty,finvoice,pDuplicate,pFeeSeq)
	{
    // Updates an assessed fee with a new Qty.  If not found, adds it; else if invoiced fee found, adds another with adjusted qty.
    // optional param pDuplicate -if "N", won't add another if invoiced fee exists (SR5085)
    // Script will return fee sequence number if new fee is added otherwise it will return null (SR5112)
    // Optional param pSeqNumber, Will attempt to update the specified Fee Sequence Number or Add new (SR5112)
    // 12/22/2008 - DQ - Correct Invoice loop to accumulate instead of reset each iteration

    // If optional argument is blank, use default logic (i.e. allow duplicate fee if invoiced fee is found)
    if ( pDuplicate==null || pDuplicate.length==0 )
        pDuplicate = "Y";
    else
        pDuplicate = pDuplicate.toUpperCase();

    var invFeeFound=false;
    var adjustedQty=fqty;
    var feeSeq = null;
	feeUpdated = false;

	if(pFeeSeq == null)
		getFeeResult = aa.finance.getFeeItemByFeeCode(capId,fcode,fperiod);
	else
		getFeeResult = aa.finance.getFeeItemByPK(capId,pFeeSeq);


	if (getFeeResult.getSuccess())
		{
		if(pFeeSeq == null)
			var feeList = getFeeResult.getOutput();
		else
		     {
			var feeList = new Array();
			feeList[0] = getFeeResult.getOutput();
		     }
		for (feeNum in feeList)
			if (feeList[feeNum].getFeeitemStatus().equals("INVOICED"))
				{
                    if (pDuplicate=="Y")
                        {
                        logDebug("Invoiced fee "+fcode+" found, subtracting invoiced amount from update qty.");
        		//GKL-B 10/6/2012 Commented out below, as was customized for Madison in 6.7 version of this script
			//adjustedQty = adjustedQty - feeList[feeNum].getFeeUnit();
                        //invFeeFound=true;
                        }
                    else
                        {
                        invFeeFound=true;
                        logDebug("Invoiced fee "+fcode+" found.  Not updating this fee. Not assessing new fee "+fcode);
                        }
				}

		for (feeNum in feeList)
			if (feeList[feeNum].getFeeitemStatus().equals("NEW") && !feeUpdated)  // update this fee item
				{
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				var editResult = aa.finance.editFeeItemUnit(capId, fqty, feeSeq);
				feeUpdated = true;
				if (editResult.getSuccess())
					{
					logDebug("Updated Qty on Existing Fee Item: " + fcode + " to Qty: " + fqty);
					if (finvoice == "Y")
						{
						feeSeqList.push(feeSeq);
						paymentPeriodList.push(fperiod);
						}
					}
				else
					{ logDebug( "**ERROR: updating qty on fee item (" + fcode + "): " + editResult.getErrorMessage()); break }
				}
		}
	else
		{ logDebug( "**ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage())}

    // Add fee if no fee has been updated OR invoiced fee already exists and duplicates are allowed
	if ( !feeUpdated && adjustedQty != 0 && (!invFeeFound || invFeeFound && pDuplicate=="Y") )
		feeSeq = addFee(fcode,fsched,fperiod,adjustedQty,finvoice);
	else
		feeSeq = null;

	return feeSeq;
	}

// GKL-B feeExists with slight customization made earlier to be compatible with how our fees are programmed to work
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
	else
		{
//GKL-B 10/16/2012 Added below default status, to make this function operate as it did pre-upgrade
		checkStatus = true;
		statusArray.push("NEW");
		}
	var feeResult=aa.fee.getFeeItems(capId);
	if (feeResult.getSuccess())
		{ var feeObjArr = feeResult.getOutput(); }
	else
		{ logDebug( "**ERROR: getting fee items: " + capContResult.getErrorMessage()); return false }
	
	for (ff in feeObjArr)
		if ( feestr.equals(feeObjArr[ff].getFeeCod()) && (!checkStatus || exists(feeObjArr[ff].getFeeitemStatus(),statusArray) ) )
			return true;
			
	return false;
	}

//ITJSM - 5/6/2013 - fixed this function to actually invoice the fee
function invoiceFeeMadison(fcode, fperiod, itemCap) { //invoices all assessed fees having fcode and fperiod
	var feeFound=false;
	getFeeResult = aa.finance.getFeeItemByFeeCode(itemCap,fcode,fperiod);
	if (getFeeResult.getSuccess()) {
		var feeList = getFeeResult.getOutput();
		for (feeNum in feeList) {
			if (feeList[feeNum].getFeeitemStatus().equals("NEW")) {
				var feeSeq = feeList[feeNum].getFeeSeqNbr();
				feeSeqList.push(feeSeq);
				paymentPeriodList.push(fperiod);
				var inv = aa.finance.createInvoice(itemCap, feeSeqList, paymentPeriodList);
				logDebug("Assessed fee " + fcode + " found and invoiced");
				feeFound=true;
			}
		}
	} else { 
		logDebug( "**ERROR: getting fee items (" + fcode + "): " + getFeeResult.getErrorMessage())
	}
	return feeFound;
}

//ITJSM - 5/9/2013 - fixed this to work with ACA
function loadASITables4ACA() {
	// Loads App Specific tables into their own array of arrays.  Creates global array objects
	// Optional parameter, cap ID to load from.  If no CAP Id specified, use the capModel
	var numrows = 0;
	var itemCap = capId;
	if (arguments.length == 1) {
		itemCap = arguments[0]; // use cap ID specified in args
		var gm = aa.appSpecificTableScript.getAppSpecificTableGroupModel(itemCap).getOutput();
	} else {
		var gm = cap.getAppSpecificTableGroupModel();
	}
	var ta = gm.getTablesMap();
	var tai = ta.values().iterator();
	while (tai.hasNext()) {
		var tsm = tai.next();
		if (!tsm.rowIndex.isEmpty()) {
			var tempObject = new Array();
			var tempArray = new Array();
			var tn = tsm.getTableName();
			tn = String(tn).replace(/[^a-zA-Z0-9]+/g,'');
			if (!isNaN(tn.substring(0,1))) { tn = "TBL" + tn; }  // prepend with TBL if it starts with a number
			var tsmfldi = tsm.getTableField().iterator();
			var tsmcoli = tsm.getColumns().iterator();
			numrows = 1;
			while (tsmfldi.hasNext()) {//cycle through fields
				if (!tsmcoli.hasNext()) {//cycle through columns
					var tsmcoli = tsm.getColumns().iterator();
					tempArray.push(tempObject);//end of record
					var tempObject = new Array();//clear the temp obj
					numrows++;
				}
				var tcol = tsmcoli.next();
				var tval = tsmfldi.next().getInputValue();
				tempObject[tcol.getColumnName()] = tval;
			}
			tempArray.push(tempObject);//end of record
			var copyStr = "" + tn + " = tempArray";
			logDebug("ASI Table Array : " + tn + " (" + numrows + " Rows)");
			eval(copyStr);//move to table name
		} else {
			logDebug("ASI Table Array : No table.");
		}
	}
	return numrows;
}

//ITJSM added 5/11/2013
function listRequiredDocumentsACA(reqDocs) {
	var returnCode = "1";
	var doctypes = "";
	for (category in reqDocs) {
		doctypes += "<br>" + reqDocs[category]; 
	}
	var msg = "The following documents are required to proceed with this application.  Please attach a copy of each type:" + doctypes;

	aa.env.setValue("ErrorCode", returnCode);
	aa.env.setValue("ErrorMessage", msg);
}

//ITJSM added 5/11/2013
function checkRequiredDocumentsACA(reqDocs, itemCap) {
	var allAttached = true; 
	var uploaded = true; 
	var msg = "All Attached";
	var doctypes = "";
	for (category in reqDocs) {
		if (uploaded == true) {
			var attached = false;
			docList = aa.document.getDocumentListByEntity(itemCap, "TMP_CAP"); 
			docs = docList.getOutput();
			if (docs.isEmpty()) {
				var msg = "The required documents are not attached to this application";
                                for(reqDoc in reqDocs){
                                   msg+="<BR>"+reqDocs[reqDoc];
                                }
				uploaded = false;
			} else {
				idocs = docs.iterator();
				while (idocs.hasNext()) {
					doc = idocs.next(); 
					docCategory = doc.getDocCategory();
					if (reqDocs[category] == docCategory) {
						attached = true;
						break;
					}
				}
				if (attached == false) {
					doctypes += "<br>" + reqDocs[category]; 
					allAttached = false;
				}
			}
		}
	}
	if (allAttached == false) {
		var msg = "Please attach a copy of the following document type(s):" + doctypes;
	}
	return msg;
}

//ITJSM added 6/15/2013
function addParcelOwner4ACA() {
	var pExists = parcelExistsOnCap(capId);
	
	if (!pExists) {
		ad = cap.getAddressModel(); 
		var RefAddressID = ad.getRefAddressId();
		if (RefAddressID != null) {
			addParcelAndOwnerFromRefAddress(RefAddressID); 
			copyParcelGisObjects();
		}
	}
}

//ITJSM added 7/23/2013
function excludeUserFromEmail() {
	var bdValue = "";
	var excludeUser = false;
	var bizDomScriptResult = aa.bizDomain.getBizDomain("EXCLUDE_USERS_FROM_EMAIL");
	if (bizDomScriptResult.getSuccess()) {
		bizDomScriptArray = bizDomScriptResult.getOutput().toArray()
		for (var i in bizDomScriptArray) {
			bdValue = bizDomScriptArray[i].getBizdomainValue().toString();
			if (appTypeString.equals(bdValue)) {
				if (publicUserID == null) {
					var userObj = aa.person.getUser(currentUserID);
				} else {
					var userObj = aa.publicUser.getPublicUserByPUser(publicUserID);
				}
				if (userObj.getSuccess()) {
					var aUser = userObj.getOutput();
					var userId = aUser.getUserID();
					userId = userId.toUpperCase();
					var userArray = bizDomScriptArray[i].getDescription().split(",");
					for (var u in userArray) {
						uId = userArray[u];
						uId = uId.toUpperCase();
						if (userId.equals(uId)) {
							excludeUser = true;
						}
					}
				}
			}
		}
	}
	if (excludeUser == true) {
		return true;
	} else {
		return false;
	}
}

//ITJSM - 7/30/2013 - created to close only those tasks not already closed
function taskCloseAllNotComplete(pStatus, pComment) {
	var taskArray = new Array();
	var workflowResult = aa.workflow.getTasks(capId);
 	if (workflowResult.getSuccess()) {
  	 	var wfObj = workflowResult.getOutput();
	} else { 
		logMessage("**ERROR: Failed to get workflow object: " + workflowResult.getErrorMessage()); 
		return false; 
	}
	var fTask;
	var stepnumber;
	var processID;
	var dispositionDate = aa.date.getCurrentDate();
	var wfnote = " ";
	var wftask;
	for (i in wfObj) {
		fTask = wfObj[i];
		wftask = fTask.getTaskDescription();
		stepnumber = fTask.getStepNumber();
		processID = fTask.getProcessID();
		if (fTask.getCompleteFlag().equals("N")) {
				aa.workflow.handleDisposition(capId, stepnumber, pStatus, dispositionDate, wfnote, 

pComment, systemUserObj,"Y");
				logMessage("Closing Work flow Task " + wftask + " with status " + pStatus);
				logDebug("Closing Work flow Task " + wftask + " with status " + pStatus);
		}
	}
}

/*ITJSM 8/27/2013 updated to correct issue with function*/
function getRelatedCapsByParcel(ats) { //returns and array of capids that match parcels on the current app.  Includes all parcels.
	var retArr = new Array();
	var capParcelResult = aa.parcel.getParcelandAttribute(capId,null);
	if (capParcelResult.getSuccess()) { 
		var Parcels = capParcelResult.getOutput().toArray(); 
	} else { 
		logDebug("**ERROR: getting parcels by cap ID: " + capParcelResult.getErrorMessage()); 
		return false; 
	}
	for (zz in Parcels) {
		var ParcelValidatedNumber = Parcels[zz].getParcelNumber();
		// get caps with same parcel
		var capAddResult = aa.cap.getCapListByParcelID(ParcelValidatedNumber,null);
		if (capAddResult.getSuccess()) { 
			var capIdArray = capAddResult.getOutput();
		} else { 
			logDebug("**ERROR: getting similar parcels: " + capAddResult.getErrorMessage());  
			return false; 
		}
		// loop through related caps
		for (cappy in capIdArray) {
			// skip if current cap
			if (capId.getCustomID().equals(capIdArray[cappy].getCustomID())) continue;
			// get cap ids
			var relcapResult = aa.cap.getCap(capIdArray[cappy].getCapID());
			if (relcapResult.getSuccess()) {
				relcap = relcapResult.getOutput();
				// get cap type
				var reltypeArray = relcap.getCapType().toString().split("/");
				var isMatch = true;
				var ata = ats.split("/");
				if (ata.length != 4) {
					logDebug("**ERROR: The following Application Type String is incorrectly formatted: " + ats);
				} else {
					for (xx in ata) {
						if (!ata[xx].equals(reltypeArray[xx]) && !ata[xx].equals("*")) {
							isMatch = false;
						}
					}
				}
				if (isMatch) {			
					retArr.push(capIdArray[cappy]);
				}
			}
		} // loop through related caps
	}
	if (retArr.length > 0) {
		return retArr;
	} else {
		return false;
	}
}

//ITJSM 2/6/2014 created to copy only groups and/or individual fields - implemented on Operators
//groupArray is an array of ASI SubGroups that shouldn't be copied to the targetCapId
//fieldArray is an array of ASI SubGroup.FieldName that shouldn't be copied to the targetCapId
function copyASIFieldsExcept(sourceCapId,targetCapId,groupArray,fieldArray) {
	var targetCap = aa.cap.getCap(targetCapId).getOutput();
	var targetCapType = targetCap.getCapType();
	var targetCapTypeString = targetCapType.toString();
	var targetCapTypeArray = targetCapTypeString.split("/");
	var sourceASIResult = aa.appSpecificInfo.getByCapID(sourceCapId);

	if (sourceASIResult.getSuccess()) {
		var sourceASI = sourceASIResult.getOutput();
	} else { 
		logDebug( "**ERROR: getting source ASI: " + sourceASIResult.getErrorMessage()); 
		return false;
	}
	
	for (ASICount in sourceASI) {
		thisASI = sourceASI[ASICount];
		if (!exists(thisASI.getCheckboxType(), groupArray) && !exists(thisASI.getCheckboxType() + "." + thisASI.getCheckboxDesc(), fieldArray)) {
			thisASI.setPermitID1(targetCapId.getID1())
			thisASI.setPermitID2(targetCapId.getID2())
			thisASI.setPermitID3(targetCapId.getID3())
			thisASI.setPerType(targetCapTypeArray[1])
			thisASI.setPerSubType(targetCapTypeArray[2])
			if (thisASI.getChecklistComment() != null) { 
				editAppSpecific(thisASI.getCheckboxType() + "." + thisASI.getCheckboxDesc(), thisASI.getChecklistComment(), targetCapId);
			}		       
		}
  	}
}

//ITJSM 2/17/2014 modified createChild function in INCLUDES_ACCELA_FUNCTIONS for Traffic Engineering 
function createWOChild(grp,typ,stype,cat,apNam) { //optional parent capId
	// creates the new application and returns the capID object
	var itemCap = capId
	if (arguments.length > 5) itemCap = arguments[5]; //use cap ID specified in args
	
	var appCreateResult = aa.cap.createApp(grp, typ, stype, cat, apNam);
	logDebug("creating cap " + grp + "/" + typ + "/" + stype + "/" + cat);
	if (appCreateResult.getSuccess()) {
		var newId = appCreateResult.getOutput();
		logDebug("cap " + grp + "/" + typ + "/" + stype + "/" + cat + " created successfully ");
		// create Detail Record
		capModel = aa.cap.newCapScriptModel().getOutput();
		capDetailModel = capModel.getCapModel().getCapDetailModel();
		capDetailModel.setCapID(newId);
		aa.cap.createCapDetail(capDetailModel);
		var newObj = aa.cap.getCap(newId).getOutput();	//Cap object
		//debugObject(aa.asset);
		var result = aa.cap.createAppHierarchy(itemCap, newId); 
		if (result.getSuccess())
			logDebug("Child application successfully linked");
		else
			logDebug("Could not link applications");
		return newId;
	} else {
		logDebug( "**ERROR: adding child App: " + appCreateResult.getErrorMessage());
	}
}

//ITJSM added 7/1/2013 updated 11/4/2013 to add date range check
function findDuplicateASIValues (callType, checkType, checkDesc, asiValue, dateCheck, beginDate, endDate, checkRelated) {
	//checkType is the ASI Group to check
	//checkDesc is the ASI Field to check
	//asiValue is the value to check for
	//dateCheck is the date field to use - either 'File' for B1_FILE_DD or 'Expire' for the EXPIRATION_DATE
	//begin and end dates in the following format '1/1/1900' to '12/31/1900'
	//checkRelated = true if related records should be included in the check false if not - if this is an ASB or 
	//CRCB standard choice checkRelated must be false
	var selectString = "";
	var parentCapId = "";
	var parentAltId = "";
	var childCapId = "";
	var childAltId = "";
	var relatedId = "";
	var relatedAltId = "";
	
	if (callType == "ASBCRCB") {
		selectString = "DECLARE @UseDate varchar(10); SET @UseDate = '" + dateCheck + "'; SELECT TOP 1 COUNT(*) AS 'cnt' FROM B1PERMIT B " +
		"INNER JOIN BCHCKBOX C ON B.SERV_PROV_CODE = C.SERV_PROV_CODE " +
		"AND B.B1_PER_ID1 = C.B1_PER_ID1 AND B.B1_PER_ID2 = C.B1_PER_ID2 AND B.B1_PER_ID3 = C.B1_PER_ID3 AND C.B1_PER_TYPE = '" + appTypeArray[1] + 
		"' AND C.B1_PER_SUB_TYPE = '" + appTypeArray[2] + "' AND C.B1_CHECKBOX_TYPE = '" + checkType + "' AND C.B1_CHECKBOX_DESC = '" + checkDesc + 
		"' AND C.B1_CHECKLIST_COMMENT = '" + asiValue + "' LEFT OUTER JOIN B1_EXPIRATION E ON B.SERV_PROV_CODE = E.SERV_PROV_CODE " +
		"AND B.B1_PER_ID1 = E.B1_PER_ID1 AND B.B1_PER_ID2 = E.B1_PER_ID2 AND B.B1_PER_ID3 = E.B1_PER_ID3 WHERE B.SERV_PROV_CODE = 'MADISON' " +
		"AND (@UseDate = 'Expire' AND E.EXPIRATION_DATE BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + 
		" 23:59:59.999') OR (@UseDate = 'File' AND B.B1_FILE_DD BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + " 23:59:59.999')";
	} else {
		c = aa.cap.getCap(capId).getOutput().getCapModel();
		altId = c.getAltID();
		//if this is an ASB or CRCB standard choice checkRelated must be false 
		if (checkRelated == true) {
			//check to see if we are on a child cap and if so set the parentCapId else parentId is capId
			var parentCapResult = aa.cap.getProjectByChildCapID(capId, "R", "");
			var	parentSuccess = parentCapResult.getSuccess();
			if (parentSuccess) {
				parent = parentCapResult.getOutput();
				parentCapId = parent[0].getProjectID();
				var estCap = parentCapId.getID1();
				estCap = estCap.substring(2, estCap.length());
				if (estCap == "EST") {
					
				} else {	
					pCap = aa.cap.getCap(parentCapId).getOutput().getCapModel();
					parentAltId = pCap.getAltID();
				}
			} else {
				parentCapResult = aa.cap.getProjectByChildCapID(capId, "Renewal", "");
				parentSuccess = parentCapResult.getSuccess();
				if (parentSuccess) {
					parent = parentCapResult.getOutput();
					parentCapId = parent[0].getProjectID();
					var estCap = parentCapId.getID1();
					estCap = estCap.substring(2, estCap.length());
					if (estCap == "EST") {
					
					} else {	
						pCap = aa.cap.getCap(parentCapId).getOutput().getCapModel();
						parentAltId = pCap.getAltID();
					}
				} else {
					parentCapResult = aa.cap.getProjectByChildCapID(capId, "Amendment", "");
					parentSuccess = parentCapResult.getSuccess();
					if (parentSuccess) {
						parent = parentCapResult.getOutput();
						parentCapId = parent[0].getProjectID();
						var estCap = parentCapId.getID1();
						estCap = estCap.substring(2, estCap.length());
						if (estCap == "EST") {
					
						} else {	
							pCap = aa.cap.getCap(parentCapId).getOutput().getCapModel();
							parentAltId = pCap.getAltID();
						}
					} else {
						parentCapId = capId;
						parentAltId = capIDString;
					}
				}
			}
			//get all the children records associated with the parent cap if any
			//set the relateId variable with all the related caps including the parent cap
			var childCapResult = aa.cap.getProjectByMasterID(parentCapId, "", "");
			var	childSuccess = childCapResult.getSuccess();
			if (childSuccess) {
				var childCapArray = childCapResult.getOutput();
				if (childCapArray != 'undefined' && childCapArray != null){
					relatedId = parentCapId + "', '";
					relatedAltId = parentAltId + "', '";
					for (childCap in childCapArray) {
						child = childCapArray[childCap];
						childCapId = child.getCapID();
						var estCap = childCapId.getID1();
						estCap = estCap.substring(2, estCap.length());
						if (estCap == "EST") {
							
						} else {	
							cCap = aa.cap.getCap(childCapId).getOutput().getCapModel();
							childAltId = cCap.getAltID();
							relatedId += childCapId + "', '";
							relatedAltId += childAltId + "', '";
						}
					}
					relatedId = relatedId.substring(0, relatedId.length - 4);
					relatedAltId = relatedAltId.substring(0, relatedAltId.length - 4);
				}
			} else {
				relatedId = parentCapId;
				relatedAltId = capIDString;
			}
			selectString = "DECLARE @UseDate varchar(10); SET @UseDate = '" + dateCheck + "'; SELECT TOP 1 COUNT(*) AS 'cnt' FROM B1PERMIT B " +
			"INNER JOIN BCHCKBOX C ON B.SERV_PROV_CODE = C.SERV_PROV_CODE " +
			"AND B.B1_PER_ID1 = C.B1_PER_ID1 AND B.B1_PER_ID2 = C.B1_PER_ID2 AND B.B1_PER_ID3 = C.B1_PER_ID3 AND C.B1_PER_TYPE = '" + appTypeArray[1] + 
			"' AND C.B1_PER_SUB_TYPE = '" + appTypeArray[2] + "' AND C.B1_CHECKBOX_TYPE = '" + checkType + "' AND C.B1_CHECKBOX_DESC = '" + checkDesc + 
			"' AND C.B1_CHECKLIST_COMMENT = '" + asiValue + "' LEFT OUTER JOIN B1_EXPIRATION E ON B.SERV_PROV_CODE = E.SERV_PROV_CODE " +
			"AND B.B1_PER_ID1 = E.B1_PER_ID1 AND B.B1_PER_ID2 = E.B1_PER_ID2 AND B.B1_PER_ID3 = E.B1_PER_ID3 WHERE B.SERV_PROV_CODE = 'MADISON' " +
			"AND NOT (B.B1_PER_ID1 LIKE '%EST') AND NOT B.B1_ALT_ID IN ('" + relatedAltId + "') AND (@UseDate = 'Expire' AND E.EXPIRATION_DATE " + 
			"BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + " 00:00:00.000') OR (@UseDate = 'File' AND B.B1_FILE_DD " +
			"BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + " 00:00:00.000')";
		} else {
			selectString = "DECLARE @UseDate varchar(10); SET @UseDate = '" + dateCheck + "'; SELECT TOP 1 COUNT(*) AS 'cnt' FROM B1PERMIT B " +
			"INNER JOIN BCHCKBOX C ON B.SERV_PROV_CODE = C.SERV_PROV_CODE " +
			"AND B.B1_PER_ID1 = C.B1_PER_ID1 AND B.B1_PER_ID2 = C.B1_PER_ID2 AND B.B1_PER_ID3 = C.B1_PER_ID3 AND C.B1_PER_TYPE = '" + appTypeArray[1] + 
			"' AND C.B1_PER_SUB_TYPE = '" + appTypeArray[2] + "' AND C.B1_CHECKBOX_TYPE = '" + checkType + "' AND C.B1_CHECKBOX_DESC = '" + checkDesc + 
			"' AND C.B1_CHECKLIST_COMMENT = '" + asiValue + "' LEFT OUTER JOIN B1_EXPIRATION E ON B.SERV_PROV_CODE = E.SERV_PROV_CODE " +
			"AND B.B1_PER_ID1 = E.B1_PER_ID1 AND B.B1_PER_ID2 = E.B1_PER_ID2 AND B.B1_PER_ID3 = E.B1_PER_ID3 WHERE B.SERV_PROV_CODE = 'MADISON' " +
			"AND NOT B.B1_ALT_ID = '" + altId + "' AND (@UseDate = 'Expire' AND E.EXPIRATION_DATE BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + 
			" 23:59:59.999') OR (@UseDate = 'File' AND B.B1_FILE_DD BETWEEN '" + beginDate + " 00:00:00.000' AND '" + endDate + " 23:59:59.999')";
		}
	}
	var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext", null).getOutput();
	var ds = initialContext.lookup("java:/AA");
	var conn = ds.getConnection();
	var sStmt = conn.prepareStatement(selectString);
	var rSet = sStmt.executeQuery();
	var retVal = 0;
	while (rSet.next()) {
		retVal = rSet.getString("cnt");
	}
	conn.close();
	
	return retVal;
}

// ITKG Added 3/37/2014
function addParcelAndOwnerFromRefAddress(refAddress)  // optional capID 
{
	var itemCap = capId
	if (arguments.length > 1)
		itemCap = arguments[1]; // use cap ID specified in args

	// first add the primary parcel
	//
	var primaryParcelResult = aa.parcel.getPrimaryParcelByRefAddressID(refAddress,"Y");
	if (primaryParcelResult.getSuccess())
		var primaryParcel = primaryParcelResult.getOutput();
	else
		{ logDebug("**ERROR: Failed to get primary parcel for ref Address " + refAddress + " , " + primaryParcelResult.getErrorMessage()); return false; }

	var capParModel = aa.parcel.warpCapIdParcelModel2CapParcelModel(capId,primaryParcel).getOutput()

	var createPMResult = aa.parcel.createCapParcel(capParModel);
	if (createPMResult.getSuccess())
		logDebug("created CAP Parcel");
	else
		{ logDebug("**WARNING: Failed to create the cap Parcel " + createPMResult.getErrorMessage()); }

	// Now the owners
	//

	var parcelListResult = aa.parcel.getParcelDailyByCapID(capId,null);
	var hasParcel = (parcelListResult.getSuccess());
	if (hasParcel)
		var parcelList = parcelListResult.getOutput();
	else
		{ logDebug("**ERROR: Failed to get Parcel List " + parcelListResult.getErrorMessage()); return false; }

	if (hasParcel)
		{
		for (var thisP in parcelList)
			{
			var ownerListResult = aa.owner.getOwnersByParcel(parcelList[thisP]);
			var hasOwner = (ownerListResult.getSuccess());
			if (hasOwner)
				{
					var ownerList = ownerListResult.getOutput();
					for (var thisO in ownerList)
						{
						ownerList[thisO].setCapID(capId);
						createOResult = aa.owner.createCapOwnerWithAPOAttribute(ownerList[thisO]);
						if (createOResult.getSuccess())
							logDebug("Created CAP Owner");
						else
							{ logDebug("**WARNING: Failed to create CAP Owner " + createOResult.getErrorMessage()); }
						}
				}
			}
		}
}

//ITKG - 5/14/2014 - function to send Email async replaces sendEmail()
function sendAsyncEmail(fromEmail, toEmail, ccEmail,  emailSubject, emailText, emailAttachment) {
	var scriptCode = "SENDEMAILASYNC";  // name of script
	var envParameters = aa.util.newHashMap();
	envParameters.put ("EmailFrom", fromEmail);
	envParameters.put ("EmailTo", toEmail);
	envParameters.put ("EmailCC", ccEmail);
	envParameters.put ("EmailSubject", emailSubject);
	envParameters.put ("EmailContent", emailText); 
	envParameters.put ("emailAttachment", emailAttachment);
	aa.runAsyncScript(scriptCode, envParameters);
}

function hasExpiredLicense(pDateType, plicenseNbr) {
	var vDateType;
	if ( pDateType==null || pDateType=="" ) {
		logDebug ("Invalid date type parameter");
		return false;
	} else {
		vDateType = pDateType.toUpperCase();
		if (!matches(vDateType, "EXPIRE","INSURANCE","BUSINESS")) {
			logDebug ("Invalid date type parameter");
			return false;
		}
	}
	var vExpired = false;
	var vToday = new Date();
	var vResult = getLicProfExpDate(vDateType, plicenseNbr);
	if (vResult != "NO DATE FOUND") {
		vResult = jsDateToASIDate(vResult);
		vToday = jsDateToASIDate(vToday);
		expiredDate = vResult;
		var licDate = new Date(vResult);
		var tdate = new Date(vToday);
		if (licDate < tdate) {
			vExpired = true;
			logDebug("Licence # " + plicenseNbr + " expired on " + vResult);
		} else {
			logDebug("No licensed professionals found on CAP");
			return vExpired;
		}
	} else {
		expiredDate = "";
		vExpired = false;
	}
	return vExpired;
}

function getLicProfExpDate(pDateType, pLicNum) {
	if (pDateType==null || pDateType=="") {
		var dateType = "EXPIRE";
	} else {
		var dateType = pDateType.toUpperCase();
		if (!(dateType=="ISSUE" || dateType=="RENEW" || dateType=="BUSINESS" || dateType=="INSURANCE")) {
			dateType = "EXPIRE";
		}
	}
	if (pLicNum==null || pLicNum=="") {
		logDebug("Invalid license number parameter");
		return ("INVALID PARAMETER");
	}
	var newLic = getRefLicenseProf(pLicNum)
	if (newLic) {
		var jsExpDate = new Date();
 		if (dateType=="EXPIRE") {
			if (newLic.getLicenseExpirationDate()) {
				jsExpDate = convertDate(newLic.getLicenseExpirationDate());
				logDebug(pLicNum+" License Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no License Expiration Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="INSURANCE") {
			if (newLic.getInsuranceExpDate()) {
				jsExpDate = convertDate(newLic.getInsuranceExpDate());
				logDebug(pLicNum+" Insurance Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Insurance Expiration Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="BUSINESS") {
			if (newLic.getBusinessLicExpDate()) {
				jsExpDate = convertDate(newLic.getBusinessLicExpDate());
				logDebug(pLicNum+" Business Lic Expiration Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Business Lic Exp Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="ISSUE") {
			if (newLic.getLicenseIssueDate()) {
				jsExpDate = convertDate(newLic.getLicenseIssueDate());
				logDebug(pLicNum+" License Issue Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Issue Date");
				return ("NO DATE FOUND");
			}
		} else if (dateType=="RENEW") {
			if (newLic.getLicenseLastRenewalDate()) {
				jsExpDate = convertDate(newLic.getLicenseLastRenewalDate());
				logDebug(pLicNum+" License Last Renewal Date: "+jsDateToMMDDYYYY(jsExpDate));
				return jsExpDate;
			} else {
				logDebug("Reference record for license "+pLicNum+" has no Last Renewal Date");
				return ("NO DATE FOUND");
			}
		} else {
			return ("NO DATE FOUND");
		}
	}
}

function workingDaysBetweenDates(rsstartDate, rsendDate) {
//Riki 7-16-14 renamed alot of the variables to reduce the chance of collision with other functions
// Validate input
if (rsendDate < rsstartDate)
return 0;

var dtStartDate = new Date(rsstartDate.getYear(),rsstartDate.getMonth()-1,rsstartDate.getDayOfMonth());
var dtEndDate  = new Date(rsendDate.getYear(),rsendDate.getMonth()-1,rsendDate.getDayOfMonth());

// Calculate days between dates
var millisecondsPerDay = 86400 * 1000; // Day in milliseconds
dtStartDate.setHours(0,0,0,1);  // Start just after midnight
dtEndDate.setHours(23,59,59,999);  // End just before midnight
var diff = dtEndDate - dtStartDate;  // Milliseconds between datetime objects    
var days = Math.ceil(diff / millisecondsPerDay);

// Subtract two weekend days for every week in between
var weeks = Math.floor(days / 7);
var days = days - (weeks * 2);

// Handle special cases
var startDay = dtStartDate.getDay();
var endDay = dtEndDate.getDay();

// Remove weekend not previously removed.   
if (startDay - endDay > 1)         
days = days - 2;      

// Remove start day if span starts on Sunday but ends before Saturday
if (startDay == 0 && endDay != 6)
days = days - 1  

// Remove end day if span ends on Saturday but starts after Sunday
if (endDay == 6 && startDay != 0)
days = days - 1  
logDebug("days " + days);
return days;
}

function date_sort_asc(date1, date2) {

  // This is a comparison function that will result in dates being sorted in

  // ASCENDING order.

  if (date1 > date2) return 1;

  if (date1 < date2) return -1;

  return 0;

}

function date_sort_desc(date1, date2) {

  // This is a comparison function that will result in dates being sorted in

  // DESCENDING order.

  if (date1 > date2) return -1;

  if (date1 < date2) return 1;

  return 0;

}

function checkIfFacilityUserForFacility(refContactId, facilityDesc){
      var numMatches = 0;
      selectString = "DECLARE @refConId int, @facilityDesc varchar(250); SET @refConId = " + refContactId + "; set @facilityDesc = '"+facilityDesc+"'; select count(g1_description) as 'numMatches' from gasset_master gam, XrefCONTACT_entity xcon where gam.SERV_PROV_CODE = xcon.SERV_PROV_CODE and gam.G1_ASSET_SEQ_NBR = xcon.ent_id1 and xcon.ent_type =  'ASSET' and g1_asset_group = 'Engineering Facility'    and g1_asset_type = 'Building' and xcon.G1_CONTACT_NBR = @refConId and g1_description = @facilityDesc"; 
      var initialContext = aa.proxyInvoker.newInstance("javax.naming.InitialContext").getOutput();
      var ds = initialContext.lookup("java:/AA"); var conn = ds.getConnection(); 
      sStmt = conn.prepareStatement(selectString);
      rSet = sStmt.executeQuery();
      while(rSet.next()){
           if(rSet.getInt("numMatches") != null)
           numMatches = rSet.getInt("numMatches"); 
      }
      conn.close();
return numMatches;
}

//ITGKL Function to copy documents asynchronously
function copyDocuments(fromCapId, toCapId){
     var scriptCode = "copyDocumentsAsync";  // name of script
     var envParameters = aa.util.newHashMap();
     envParameters.put ("ServProvCode", servProvCode);
     envParameters.put ("FromCapId", fromCapId);
     envParameters.put ("ToCapId", toCapId);
     envParameters.put ("ReportUser", currentUserID);  
logDebug(servProvCode + " " + fromCapId + " " + toCapId + " " + currentUserID);
//aa.sendMail("noreply@cityofmadison.com","glabelle-brown@cityofmadison.com","","TEST",debug); 
    aa.runAsyncScript(scriptCode, envParameters);
    
}

//ITJSM updated on 1/24/2014 combine reportViewAttachEmail and Async scripts
//ITJSM updated on 1/14/2015 correct error with SSRS
function reportViewAttachEmail(viewReport, //true false to show report in a new window - won't send email
								emailReport, // true false to attach and send report asynchronously
								aaReportName, // Name in Report Manager 
								fromAddress, // if emailReport true email From else ""
								toAddress, // if emailReport true email To else ""
								ccAddress, // if emailReport true email cc else ""
								emailSubject, // if emailReport true email subject else ""
								emailContent, // if emailReport true email body else ""
                                                                copyToParent, //if renewal, copy to parent 
								systemEmail // if error email address to receive log
							) 
{
	logDebug("<u>Request Information:</u>");
	logDebug("view = " +  viewReport);
	logDebug("email = " +  emailReport);
	logDebug("reportName = " +  aaReportName);
	logDebug("SystemEmail = " +  systemEmail);
	logDebug("<BR><u>Email Information:</u>");
	logDebug("emailFrom = " +  fromAddress);
	logDebug("emailTo = " +  toAddress);
	logDebug("emailCC = " +  ccAddress);
	logDebug("emailSubject = " +  emailSubject);
	logDebug("emailContent = <br>" +  emailContent);
	/*----------------------------------------------------------------------------
	Function Level Variables
	----------------------------------------------------------------------------*/
	var name = "";
	var tmpCapIDString = "";
	/*----------------------------------------------------------------------------
	CapIDString Retrieval Section
	This section retrieves the capIdString based on the global variable capId.
	Utilizes tmpCapIDString in case global variable capIDString gets set 
	incorrectly.
	----------------------------------------------------------------------------*/
	tmpCapIDString = capIDString;
	var sca = String(capId).split("-");
	var thisCapId = aa.cap.getCapID(sca[0],sca[1],sca[2]).getOutput();
	if(thisCapId != null){
		capIDString = thisCapId.getCustomID();
	}
	logDebug("This process is being run for <b>" + capIDString + "</b>");
	/*----------------------------------------------------------------------------
	End CapId CapString Retrieval Section
	----------------------------------------------------------------------------*/
	/*----------------------------------------------------------------------------
	Report Retrieval Section
	This section retrieves the report based on the report name given in the parameter
	aaReportName found in Report Manager (Name field).
	----------------------------------------------------------------------------*/
	var reportModel = aa.reportManager.getReportModelByName(aaReportName); //get detail of report to drive logic
	//logDebug("Report Manager Model:");
	//debugObject(reportModel); //debug in case of errors
	if (reportModel.getSuccess()) {
		reportDetail = reportModel.getOutput();
		//logDebug("Report Manager Detail (this displays if Report Model was successful):");
		//debugObject(reportDetail); //debug in case of errors
		var name = reportDetail.getReportDescription();
		if (name == null || name == "") { //set name if attaching to record
			name = reportDetail.getReportName();
		}
		logDebug("Report Name for attaching to record(found in Report Manager Description) = " + name);
		var reportInfoModel = aa.reportManager.getReportInfoModelByName(aaReportName);//get report info to change the way report runs
		//logDebug("<br>Report Information Model:");
		//debugObject(reportInfoModel); //debug in case of errors
		if (reportInfoModel.getSuccess()) { 
			report = reportInfoModel.getOutput();
			report.setModule(appTypeArray[0]);
			report.setCapId(capId);
			reportInfo = report.getReportInfoModel();
			//logDebug("Report Information:");
			//debugObject(reportInfo); //debug in case of errors
			//set parameters
			if (reportDetail.getReportType().equals("URL_Report")) {
				//if REPORT_TYPE = URL_Report then val1 is Report Parameter
				parameters = aa.util.newHashMap(); 
				parameters.put("val1", capIDString);
			} else {
				//if REPORT_TYPE is a Reporting Service then AltID is used
				parameters = aa.util.newHashMap();
				parameters.put("AltID", capIDString);
			}
			report.setReportParameters(parameters);
			//logDebug("Report Information Detail (this displays if Report Information Model was successful):");
			//debugObject(report); //debug in case of errors
	/*----------------------------------------------------------------------------
	End Report Retrieval Section
	----------------------------------------------------------------------------*/
			if (viewReport == true) {
				reportRun = aa.reportManager.runReport(parameters, reportDetail);
				aa.env.setValue("ScriptReturnCode", "0"); 
				aa.env.setValue("ScriptReturnMessage", reportRun.getOutput());
			}
			if (emailReport == true) {
				fromAddress = fromAddress.toLowerCase();
				toAddress = toAddress.toLowerCase();
				ccAddress = ccAddress.toLowerCase();
				var scriptCode = "SendReportAsync";  // name of script
				var envParameters = aa.util.newHashMap();
				envParameters.put ("Report", report);
				envParameters.put ("ReportName", name);				
				envParameters.put ("EmailFrom", fromAddress);
				envParameters.put ("EmailTo", toAddress);
				envParameters.put ("EmailCC", ccAddress);
				envParameters.put ("EmailSubject", emailSubject);
				envParameters.put ("EmailContent", emailContent); 
				envParameters.put ("SystemEmail", systemEmail);
				aa.runAsyncScript(scriptCode, envParameters);
                                //The script won't finalize (email created but won't send) without another email outside of the async call to trigger it. Not sure of the root cause. 
                                aa.sendMail("noreply@cityofmadison.com","nobody@cityofmadison.com", "", "Email sent",emailContent);
			}
                        if(copyToParent){
                             moveToParent();
                        }
		} else {
			logDebug("Failed to get Report Information Model.  Check report name entered matches Name in Report Manager.");
			aa.sendMail("noreply@cityofmadison.com","elamsupport@cityofmadison.com","", "Errors occurs in Creating Report", debug);
			return false;			
		}
	} else {
        capIDString = tmpCapIDString;	
		logDebug("Failed to get Report Manager Model.  Check report name entered matches Name in Report Manager.");
		aa.sendMail("noreply@cityofmadison.com","elamsupport@cityofmadison.com","", "Errors occurs in Creating Report", debug);
		return false;
	}
    capIDString = tmpCapIDString;
}
function moveToParent() {
	getCapResult = aa.cap.getProjectByChildCapID(capId,"Renewal","Complete");
	if (getCapResult.getSuccess()) {
		parentArray = getCapResult.getOutput();
		if (parentArray.length) {
			parCapId = parentArray[0].getProjectID();
			result = aa.cap.copyRenewCapDocument(capId, parCapId, currentUserID);
		} else {
			logDebug( "**WARNING: GetParent found no project parent for this application");
			return false;
		}
	} else { 
		logDebug( "**WARNING: getting project parents:  " + getCapResult.getErrorMessage());
		return false;
	}
}

function invoiceAssessedFeesMadison()
{
//Riki 5-18-15: Added invoiceAssessedFeesMadison this because Street Occ fees when invoicing would create separate invoices per assessed fee
  feeA = loadFees(capId);
  for (x in feeA) 
	{
	thisFee = feeA[x];
	if(thisFee.status == "NEW") updateFee(thisFee.code,thisFee.sched,thisFee.period,thisFee.unit,"Y","N",thisFee.sequence);
	}
 
if (feeSeqList.length)
	{
	invoiceResult = aa.finance.createInvoice(capId, feeSeqList, paymentPeriodList);
	if (invoiceResult.getSuccess())
		logMessage("Invoicing assessed fee items is successful.");
	else
		//Erring out on capIDString - not set
                //logMessage("**ERROR: Invoicing the fee items assessed to app # " + capIDString + " was not successful.  Reason: " +  invoiceResult.getErrorMessage());
                logMessage("**ERROR: Invoicing the fee items assessed to app was not successful.  Reason: " +  invoiceResult.getErrorMessage());

	}

} 
function addASITable4ACAPageFlow(destinationTableGroupModel,tableName,tableValueArray) // optional capId
    	{
  	//  tableName is the name of the ASI table
  	//  tableValueArray is an array of associative array values.  All elements MUST be either a string or asiTableVal object
  	// 
  	var ta = destinationTableGroupModel.getTablesMap().values();
  	var tai = ta.iterator();
  	var found = false;
  	while (tai.hasNext())
  		  {
  		  var tsm = tai.next();  // com.accela.aa.aamain.appspectable.AppSpecificTableModel
  		  if (tsm.getTableName().equals(tableName)) { found = true; break; }
  	          }
  	if (!found) { logDebug("cannot update asit for ACA, no matching table name"); return false; }
	var fld = aa.util.newArrayList();  // had to do this since it was coming up null.
        var fld_readonly = aa.util.newArrayList(); // had to do this since it was coming up null.
  	var i = 0; // row index counter
         	for (thisrow in tableValueArray)
  		{
  		var col = tsm.getColumns();
  		var coli = col.iterator();
  		while (coli.hasNext())
  			{
  			var colname = coli.next();
			//if (typeof(tableValueArray[thisrow][colname.getColumnName()]) == "object")  // we are passed an asiTablVal Obj
				//{
                                //debug+= "Object!!!";   
				//var args = new Array(tableValueArray[thisrow][colname.getColumnName()].fieldValue,colname);
				//var fldToAdd = aa.proxyInvoker.newInstance("com.accela.aa.aamain.appspectable.AppSpecificTableField",args).getOutput();
				//fldToAdd.setRowIndex(i);
				//fldToAdd.setFieldLabel(colname.getColumnName());
				//fldToAdd.setFieldGroup(tableName.replace(/ /g,"\+"));
				//fldToAdd.setReadOnly(tableValueArray[thisrow][colname.getColumnName()].readOnly.equals("Y"));
				//fld.add(fldToAdd);
				//fld_readonly.add(tableValueArray[thisrow][colname.getColumnName()].readOnly);			
				//}
			//else // we are passed a string
				//{
                                debug+= "String!!!";   
				var args = new Array(tableValueArray[thisrow][colname.getColumnName()],colname);
				var fldToAdd = aa.proxyInvoker.newInstance("com.accela.aa.aamain.appspectable.AppSpecificTableField",args).getOutput();
				fldToAdd.setRowIndex(i);
				fldToAdd.setFieldLabel(colname.getColumnName());
				fldToAdd.setFieldGroup(tableName.replace(/ /g,"\+"));
                                if(colname.getColumnName().equals("Current No. of Employees")
                                || colname.getColumnName().equals("Job Category")    
                                || colname.getColumnName().equals("Percent 1 year ago")    
                                || colname.getColumnName().equals("Percent Current")
                                || colname.getColumnName().equals("Percent Target"))
                                    fldToAdd.setReadOnly(true);
                                else
				    fldToAdd.setReadOnly(false);
				fld.add(fldToAdd);
				fld_readonly.add("N");
				//}
  			}
  		i++;
  		tsm.setTableFields(fld);
  		tsm.setReadonlyField(fld_readonly); // set readonly field
  		}
                return destinationTableGroupModel;
                
  	}

function aaPlan_sort_array_asc(row1, row2) {
  // This is a comparison function that will result in a 2d ary being sorted by job category
  // ASCENDING order.

  if (row1["Job Category"] > row2["Job Category"]) return 1;

  if (row1["Job Category"] < row2["Job Category"]) return -1;

  return 0;

}

/*------------------------------------------------------------------------------------------------------/
|  Notification Template Functions (Start)
/------------------------------------------------------------------------------------------------------*/

function generateReport(aaReportName,parameters,rModule) {
	var reportName = aaReportName;
      
    report = aa.reportManager.getReportInfoModelByName(reportName);
    report = report.getOutput();
  
    report.setModule(rModule);
    report.setCapId(capId);

    report.setReportParameters(parameters);

    var permit = aa.reportManager.hasPermission(reportName,currentUserID);

    if(permit.getOutput().booleanValue()) {
       var reportResult = aa.reportManager.getReportResult(report);
     
       if(reportResult) {
	       reportResult = reportResult.getOutput();
	       var reportFile = aa.reportManager.storeReportToDisk(reportResult);
			logMessage("Report Result: "+ reportResult);
	       reportFile = reportFile.getOutput();
	       return reportFile
       } else {
       		logMessage("Unable to run report: "+ reportName + " for Admin" + systemUserObj);
       		return false;
       }
    } else {
         logMessage("No permission to report: "+ reportName + " for Admin" + systemUserObj);
         return false;
    }
}

function getRecordParams4Notification(params) {
	// pass in a hashtable and it will add the additional parameters to the table

	addParameter(params, "$$altID$$", capIDString);
	addParameter(params, "$$capName$$", capName);
	addParameter(params, "$$capStatus$$", capStatus);
	addParameter(params, "$$fileDate$$", fileDate);
	addParameter(params, "$$workDesc$$", workDescGet(capId));
	addParameter(params, "$$balanceDue$$", "$" + parseFloat(balanceDue).toFixed(2));
	addParameter(params, "$$capTypeAlias$$", aa.cap.getCap(capId).getOutput().getCapType().getAlias());
	if (wfComment != null) {
		addParameter(params, "$$wfComment$$", wfComment);
	}
	return params;
}

function getACARecordParam4Notification(params,acaUrl) {
	// pass in a hashtable and it will add the additional parameters to the table

	addParameter(params, "$$acaRecordUrl$$", getACARecordURL(acaUrl));
	
	return params;	
}

function getACADeepLinkParam4Notification(params,acaUrl,pAppType,pAppTypeAlias,module) {
	// pass in a hashtable and it will add the additional parameters to the table

	addParameter(params, "$$acaDeepLinkUrl$$", getDeepLinkUrl(acaUrl, pAppType, module));
	addParameter(params, "$$acaDeepLinkAppTypeAlias$$", pAppTypeAlias);
	
	return params;
}

function getACADocDownloadParam4Notification(params,acaUrl,docModel) {
	// pass in a hashtable and it will add the additional parameters to the table

	addParameter(params, "$$acaDocDownloadUrl$$", getACADocumentDownloadUrl(acaUrl,docModel));
	
	return params;	
}

function getContactParams4Notification(params,pContact) {
	// pass in a hashtable and it will add the additional parameters to the table
	// pass in contact to retrieve informaiton from

		thisContact = pContact;
		conType = "contact";
		//logDebug("Contact Array: " + thisContact["contactType"] + " Param: " + conType);

		addParameter(params, "$$" + conType + "LastName$$", thisContact["lastName"]);
		addParameter(params, "$$" + conType + "FirstName$$", thisContact["firstName"]);
		addParameter(params, "$$" + conType + "MiddleName$$", thisContact["middleName"]);
		addParameter(params, "$$" + conType + "BusinesName$$", thisContact["businessName"]);
		addParameter(params, "$$" + conType + "ContactSeqNumber$$", thisContact["contactSeqNumber"]);
		addParameter(params, "$$" + conType + "$$", thisContact["contactType"]);
		addParameter(params, "$$" + conType + "Relation$$", thisContact["relation"]);
		addParameter(params, "$$" + conType + "Phone1$$", thisContact["phone1"]);
		addParameter(params, "$$" + conType + "Phone2$$", thisContact["phone2"]);
		addParameter(params, "$$" + conType + "Email$$", thisContact["email"]);
		addParameter(params, "$$" + conType + "AddressLine1$$", thisContact["addressLine1"]);
		addParameter(params, "$$" + conType + "AddressLine2$$", thisContact["addressLine2"]);
		addParameter(params, "$$" + conType + "City$$", thisContact["city"]);
		addParameter(params, "$$" + conType + "State$$", thisContact["state"]);
		addParameter(params, "$$" + conType + "Zip$$", thisContact["zip"]);
		addParameter(params, "$$" + conType + "Fax$$", thisContact["fax"]);
		addParameter(params, "$$" + conType + "Notes$$", thisContact["notes"]);
		addParameter(params, "$$" + conType + "Country$$", thisContact["country"]);
		addParameter(params, "$$" + conType + "FullName$$", thisContact["fullName"]);

	return params;	
}

function getPrimaryAddressLineParam4Notification(params) {
	// pass in a hashtable and it will add the additional parameters to the table

    var addressLine = "";

	adResult = aa.address.getPrimaryAddressByCapID(capId,"Y");

	if (adResult.getSuccess()) {
		ad = adResult.getOutput().getAddressModel();

		addParameter(params, "$$addressLine$$", ad.getDisplayAddress());
	}

	return params;
}

function getPrimaryOwnerParams4Notification(params) {
	// pass in a hashtable and it will add the additional parameters to the table

	capOwnerResult = aa.owner.getOwnerByCapId(capId);

	if (capOwnerResult.getSuccess()) {
		owner = capOwnerResult.getOutput();

		for (o in owner) {
			thisOwner = owner[o];
			if (thisOwner.getPrimaryOwner() == "Y") {
				addParameter(params, "$$ownerFullName$$", thisOwner.getOwnerFullName());
				addParameter(params, "$$ownerPhone$$", thisOwner.getPhone);
				break;	
			}
		}
	}
	return params;
}


function getACADocumentDownloadUrl(acaUrl,documentModel) {
   	
   	//returns the ACA URL for supplied document model

	var acaUrlResult = aa.document.getACADocumentUrl(acaUrl, documentModel);
	if(acaUrlResult.getSuccess())
	{
		acaDocUrl = acaUrlResult.getOutput();
		return acaDocUrl;
	}
	else
	{
		logDebug("Error retrieving ACA Document URL: " + acaUrlResult.getErrorType());
		return false;
	}
}


function getACARecordURL(acaUrl) {
	
	var acaRecordUrl = "";
	var id1 = capId.ID1;
 	var id2 = capId.ID2;
 	var id3 = capId.ID3;

   	acaRecordUrl = acaUrl + "/urlrouting.ashx?type=1000";   
	acaRecordUrl += "&Module=" + cap.getCapModel().getModuleName();
	acaRecordUrl += "&capID1=" + id1 + "&capID2=" + id2 + "&capID3=" + id3;
	acaRecordUrl += "&agencyCode=" + aa.getServiceProviderCode();

   	return acaRecordUrl;
}

function getDeepLinkUrl(acaUrl, appType, module) {
	var acaDeepLinkUrl = "";
	
	acaDeepLinkUrl = acaUrl + "/Cap/CapApplyDisclaimer.aspx?CAPType=";
	acaDeepLinkUrl += appType;
	acaDeepLinkUrl += "&Module=" + module;
	
	return acaDeepLinkUrl;
}

/*
 * add parameter to a hashtable, for use with notifications.
 */
function addParameter(pamaremeters, key, value)
{
	if(key != null)
	{
		if(value == null)
		{
			value = "";
		}
		pamaremeters.put(key, value);
	}
}

/*
 * Send notification
 */
function sendNotification(emailFrom,emailTo,emailCC,templateName,params,reportFile)
{
	var id1 = capId.ID1;
 	var id2 = capId.ID2;
 	var id3 = capId.ID3;

	var capIDScriptModel = aa.cap.createCapIDScriptModel(id1, id2, id3);


	var result = null;
	result = aa.document.sendEmailAndSaveAsDocument(emailFrom, emailTo, emailCC, templateName, params, capIDScriptModel, reportFile);
	if(result.getSuccess())
	{
		logDebug("Sent email successfully!");
		return true;
	}
	else
	{
		logDebug("Failed to send mail. - " + result.getErrorType());
		return false;
	}
}

/*------------------------------------------------------------------------------------------------------/
|  Notification Template Functions (End)
/------------------------------------------------------------------------------------------------------*/